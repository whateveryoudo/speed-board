import { Transforms, type PlaitBoard } from '../plait';
import type { NodeTextState } from '../types';
import { isMindmapNode } from './selection-info';
import {
  TextTransforms,
  MarkTypes,
  FontSizes,
  getTextMarksByElement,
  PlaitMarkEditor,
  LinkEditor,
  withMark,
} from '@plait/text-plugins';
import { getTextEditorsByElement, getTextManages } from '@plait/common';
import { Editor, Range, Transforms as SlateTransforms } from 'slate';

export {
  withMark,
  TextTransforms,
  MarkTypes,
  FontSizes,
  getTextMarksByElement,
  PlaitMarkEditor,
  LinkEditor,
};

export interface SlateSpanRenderOptions {
  defaultFontSize?: number;
  defaultColor?: string;
  defaultFontWeight?: string;
  zoom?: number;
  className?: string;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 统一渲染 Slate 富文本 Spans 为 HTML 字符串 (支持字号、加粗、颜色、斜体、删除线等多 Span 混排)
 */
export function renderSlateSpansHtml(
  childrenOrNode: any[] | any,
  options: SlateSpanRenderOptions = {}
): string {
  const children = Array.isArray(childrenOrNode) ? childrenOrNode : childrenOrNode?.children;
  if (!children || !Array.isArray(children) || children.length === 0) return '&ZeroWidthSpace;';
  const zoom = options.zoom || 1;
  const defaultSize = options.defaultFontSize || 14;
  const defaultColor = options.defaultColor || 'inherit';
  const defaultWeight = options.defaultFontWeight || 'normal';
  const className = options.className || 'slate-span';

  const rendered = children
    .map((c: any) => {
      const spanText = c.text ?? '';
      if (!spanText) return '';
      const rawFs = c['font-size'] ? parseFloat(c['font-size']) : (c.fontSize || defaultSize);
      const fs = Math.round(rawFs * zoom);
      const fw = c.bold ? '600' : (c.bold === false ? 'normal' : (c.fontWeight || defaultWeight));
      const fst = c.italic ? 'italic' : 'normal';
      const isLink = Boolean(c.link || c.url);
      const isUnderline = Boolean(c.underlined || c.underline || isLink);
      const isStrike = Boolean(c.strike || c.strikethrough);
      let td = 'none';
      if (isUnderline && isStrike) td = 'underline line-through';
      else if (isUnderline) td = 'underline';
      else if (isStrike) td = 'line-through';
      const clr = c.color || (isLink ? '#1677ff' : defaultColor);

      const spanStyles: string[] = [
        `font-size: ${fs}px`,
        `font-weight: ${fw}`,
        `vertical-align: baseline`,
        `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Noto Sans', sans-serif`,
      ];
      if (fst !== 'normal') spanStyles.push(`font-style: ${fst}`);
      if (td !== 'none') spanStyles.push(`text-decoration: ${td}`);
      if (clr !== 'inherit') spanStyles.push(`color: ${clr}`);
      if (isLink) spanStyles.push(`cursor: pointer`);

      if (isLink) {
        let href = c.link || c.url || '';
        if (href && !/^[a-zA-Z]+:\/\//.test(href)) {
          href = `https://${href}`;
        }
        return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="${className} slate-link" style="${spanStyles.join('; ')}">${escapeHtml(spanText)}</a>`;
      }

      return `<span class="${className}" style="${spanStyles.join('; ')}">${escapeHtml(spanText)}</span>`;
    })
    .join('');

  return rendered || '&ZeroWidthSpace;';
}

/**
 * 获取 DOM 选区在 contenteditable 元素内部的全局字符偏移量（基于 DOM 文本节点字符遍历，精准对称）
 */
export function getDomCharOffsets(root: HTMLElement): { start: number; end: number; isBackward: boolean } | null {
  if (typeof window === 'undefined') return null;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null;
  }

  function getCharOffset(targetNode: Node, targetOffset: number): number {
    let total = 0;
    function walk(node: Node): boolean {
      if (node === targetNode) {
        if (node.nodeType === Node.TEXT_NODE) {
          total += Math.min(targetOffset, (node.textContent || '').length);
          return true;
        }
        for (let i = 0; i < targetOffset && i < node.childNodes.length; i++) {
          total += (node.childNodes[i].textContent || '').length;
        }
        return true;
      }
      if (node.nodeType === Node.TEXT_NODE) {
        total += (node.textContent || '').length;
        return false;
      }
      for (let i = 0; i < node.childNodes.length; i++) {
        if (walk(node.childNodes[i])) return true;
      }
      return false;
    }
    walk(root);
    return total;
  }

  const s = getCharOffset(range.startContainer, range.startOffset);
  const e = getCharOffset(range.endContainer, range.endOffset);

  let isBackward = false;
  if (sel.anchorNode && sel.focusNode) {
    if (sel.anchorNode === sel.focusNode) {
      isBackward = sel.anchorOffset > sel.focusOffset;
    } else {
      isBackward = Boolean(
        sel.anchorNode.compareDocumentPosition(sel.focusNode) & Node.DOCUMENT_POSITION_PRECEDING
      );
    }
  }

  return {
    start: Math.min(s, e),
    end: Math.max(s, e),
    isBackward,
  };
}

/**
 * 根据全局字符偏移量还原 contenteditable 内部的 DOM 选区
 */
export function setDomCharSelection(
  root: HTMLElement,
  start: number,
  end: number,
  isBackward = false
): void {
  if (typeof window === 'undefined') return;
  const sel = window.getSelection();
  if (!sel) return;

  let currentOffset = 0;
  let startNode: any = null;
  let startNodeOffset = 0;
  let endNode: any = null;
  let endNodeOffset = 0;
  let lastTextNode: any = null;

  function traverse(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      lastTextNode = node;
      const len = (node.textContent || '').length;
      if (!startNode && start <= currentOffset + len) {
        startNode = node;
        startNodeOffset = Math.max(0, start - currentOffset);
      }
      if (!endNode && end <= currentOffset + len) {
        endNode = node;
        endNodeOffset = Math.max(0, end - currentOffset);
      }
      currentOffset += len;
      return;
    }
    for (let i = 0; i < node.childNodes.length; i++) {
      traverse(node.childNodes[i]);
      if (startNode && endNode) return;
    }
  }

  traverse(root);

  if (startNode && !endNode && lastTextNode) {
    endNode = lastTextNode;
    endNodeOffset = (lastTextNode.textContent || '').length;
  }
  if (!startNode && lastTextNode) {
    startNode = lastTextNode;
    startNodeOffset = (lastTextNode.textContent || '').length;
  }

  if (startNode && endNode) {
    try {
      if (isBackward && typeof sel.setBaseAndExtent === 'function') {
        sel.setBaseAndExtent(endNode, endNodeOffset, startNode, startNodeOffset);
      } else {
        const range = document.createRange();
        range.setStart(startNode, startNodeOffset);
        range.setEnd(endNode, endNodeOffset);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } catch (e) {
      // 容错处理
    }
  }
}

/**
 * 统一测量 Slate 富文本 Spans 的预估宽度与最大字号
 */
export function measureSlateSpansSize(
  childrenOrNode: any[] | any,
  defaultFontSize = 14
): { width: number; maxFontSize: number } {
  const children = Array.isArray(childrenOrNode) ? childrenOrNode : childrenOrNode?.children;
  if (!Array.isArray(children) || children.length === 0) {
    return { width: 0, maxFontSize: defaultFontSize };
  }
  let estimatedWidth = 0;
  let maxFontSize = defaultFontSize;

  for (const span of children) {
    const text = span.text || '';
    const fs = span['font-size'] ? parseFloat(span['font-size']) : (span.fontSize || defaultFontSize);
    maxFontSize = Math.max(maxFontSize, fs);
    let charUnits = 0;
    for (let i = 0; i < text.length; i++) {
      charUnits += text.charCodeAt(i) > 255 ? 1.8 : 1.0;
    }
    estimatedWidth += Math.ceil(charUnits * (fs * 0.55));
  }

  return { width: estimatedWidth, maxFontSize };
}

export function getElementTextObject(element: any): any {
  if (!element) return { children: [{ text: '' }] };
  if (element.data?.topic) return element.data.topic;
  if (element.topic) return element.topic;
  return element.text || { children: [{ text: '' }] };
}

/**
 * 将全局字符偏移量映射为 Slate 的点 { path: [0, spanIndex], offset: offsetInSpan }
 */
export function offsetToSlatePoint(
  editor: any,
  charOffset: number
): { path: number[]; offset: number } {
  const spans = editor.children?.[0]?.children || [];
  let accumulated = 0;
  for (let i = 0; i < spans.length; i++) {
    const len = (spans[i].text || '').length;
    if (charOffset <= accumulated + len) {
      return { path: [0, i], offset: Math.max(0, charOffset - accumulated) };
    }
    accumulated += len;
  }
  const lastIndex = Math.max(0, spans.length - 1);
  const lastLen = (spans[lastIndex]?.text || '').length;
  return { path: [0, lastIndex], offset: lastLen };
}

/**
 * 将 Slate 的点 { path: [0, spanIndex], offset: offsetInSpan } 转换为全局字符偏移量
 */
export function slatePointToOffset(
  editor: any,
  point: { path: number[]; offset: number }
): number {
  if (!point || !point.path) return 0;
  const spans = editor.children?.[0]?.children || [];
  const spanIndex = point.path[1] ?? 0;
  let accumulated = 0;
  for (let i = 0; i < spanIndex && i < spans.length; i++) {
    accumulated += (spans[i].text || '').length;
  }
  return accumulated + (point.offset || 0);
}

/**
 * 依据全局字符起止偏移量 [start, end]，将 children spans 精准切分并局部应用富文本样式 patch。
 * 彻底杜绝全局格式化污染，纯数学与数据驱动，100% 确定性与健壮性。
 */
export function sliceSpansByCharOffsets(
  children: any[],
  start: number,
  end: number,
  patch: Partial<NodeTextState>
): any[] {
  if (!children || children.length === 0) return children || [{ text: '' }];
  const min = Math.min(start, end);
  const max = Math.max(start, end);
  if (min === max) return children;

  const result: any[] = [];
  let currentOffset = 0;

  for (const span of children) {
    const text = span.text || '';
    const len = text.length;
    const spanStart = currentOffset;
    const spanEnd = currentOffset + len;
    currentOffset += len;

    // 完全在选区外部（在选区左侧或右侧）
    if (spanEnd <= min || spanStart >= max) {
      result.push({ ...span });
      continue;
    }

    // 与选区 [min, max] 相交
    const sliceA = Math.max(spanStart, min) - spanStart;
    const sliceB = Math.min(spanEnd, max) - spanStart;

    // 前缀部分（未选中）
    if (sliceA > 0) {
      result.push({ ...span, text: text.slice(0, sliceA) });
    }

    // 选中部分（应用 patch）
    const selectedSpan = { ...span, text: text.slice(sliceA, sliceB) };
    if (patch.bold !== undefined) selectedSpan.bold = patch.bold;
    if (patch.italic !== undefined) selectedSpan.italic = patch.italic;
    if (patch.underline !== undefined) {
      selectedSpan.underlined = patch.underline;
      selectedSpan.underline = patch.underline;
    }
    if (patch.strike !== undefined) {
      selectedSpan.strike = patch.strike;
      selectedSpan.strikethrough = patch.strike;
    }
    if (patch.fill !== undefined) {
      selectedSpan.color = patch.fill;
      selectedSpan.fill = patch.fill;
    }
    if (patch.fontSize !== undefined) {
      selectedSpan['font-size'] = patch.fontSize;
      selectedSpan.fontSize = patch.fontSize;
    }
    if (patch.link !== undefined) {
      if (patch.link) {
        selectedSpan.link = patch.link;
        selectedSpan.url = patch.link;
      } else {
        delete selectedSpan.link;
        delete selectedSpan.url;
      }
    }
    result.push(selectedSpan);

    // 后缀部分（未选中）
    if (sliceB < len) {
      result.push({ ...span, text: text.slice(sliceB) });
    }
  }

  // 合并具有完全相同样式的相邻 spans，避免数据碎片化
  const merged: any[] = [];
  for (const item of result) {
    if (!item.text) continue;
    if (merged.length === 0) {
      merged.push(item);
      continue;
    }
    const prev = merged[merged.length - 1];
    const isSameFormat =
      Boolean(prev.bold) === Boolean(item.bold) &&
      Boolean(prev.italic) === Boolean(item.italic) &&
      Boolean(prev.strike || prev.strikethrough) === Boolean(item.strike || item.strikethrough) &&
      Boolean(prev.underlined || prev.underline) === Boolean(item.underlined || item.underline) &&
      (prev.color || prev.fill) === (item.color || item.fill) &&
      (prev['font-size'] || prev.fontSize) === (item['font-size'] || item.fontSize) &&
      (prev.link || prev.url || '') === (item.link || item.url || '');

    if (isSameFormat) {
      prev.text += item.text;
    } else {
      merged.push(item);
    }
  }

  return merged.length > 0 ? merged : [{ text: '' }];
}

export function getNodeTextState(selectedElements: any[] = []): NodeTextState {
  const defaultState: NodeTextState = {
    text: '',
    link: '',
    fontSize: 14,
    fill: '#262626',
    bold: false,
    italic: false,
    strike: false,
    underline: false,
    align: 'left',
    verticalAlign: 'middle',
  };

  if (selectedElements.length === 0) return defaultState;

  const selected = selectedElements[0];
  const isMind = isMindmapNode(selected);
  const textObj = getElementTextObject(selected);
  const child = textObj.children?.[0] || textObj;

  let partialState: Partial<NodeTextState> = {};
  try {
    const currentElement = (selected as any);
    const textManages = getTextManages(currentElement);
    const editors = textManages.map((tm) => tm.editor).filter(Boolean);

    let editableEl: HTMLElement | null = null;
    if (typeof window !== 'undefined') {
      const foreignObject = textManages?.[0]?.foreignObject;
      editableEl = (foreignObject?.querySelector?.('.slate-editable-container') ||
        (selected as any)?.__activeEditableEl ||
        document.querySelector('.slate-editable-container[contenteditable="true"]') ||
        document.querySelector('.slate-editable-container')) as HTMLElement | null;
    }

    let editor: any = editors?.[0] || (editableEl as any)?.__slate_editor;
    let savedOffsets: { start: number; end: number; isBackward?: boolean } | null =
      (editor as any)?.savedDomOffsets ||
      (editableEl as any)?.__active_offsets ||
      null;

    if (editableEl && typeof window !== 'undefined') {
      const liveOffsets = getDomCharOffsets(editableEl);
      if (liveOffsets && liveOffsets.start !== liveOffsets.end) {
        savedOffsets = liveOffsets;
        if (editor) (editor as any).savedDomOffsets = liveOffsets;
      }
    }

    const currentChildren = (editor?.children?.[0] as any)?.children || textObj.children || [{ text: '' }];

    if (savedOffsets && savedOffsets.start !== savedOffsets.end) {
      // 从选区覆盖的 spans 中提取样式状态，供工具栏按钮点亮显示
      const min = Math.min(savedOffsets.start, savedOffsets.end);
      const max = Math.max(savedOffsets.start, savedOffsets.end);
      const intersectingSpans: any[] = [];
      let offset = 0;
      for (const span of currentChildren) {
        const len = (span.text || '').length;
        const sStart = offset;
        const sEnd = offset + len;
        offset += len;
        if (sEnd > min && sStart < max) {
          intersectingSpans.push(span);
        }
      }

      if (intersectingSpans.length > 0) {
        const isBold = intersectingSpans.every((s) => Boolean(s.bold));
        const isItalic = intersectingSpans.every((s) => Boolean(s.italic));
        const isUnderline = intersectingSpans.every((s) => Boolean(s.underlined || s.underline));
        const isStrike = intersectingSpans.every((s) => Boolean(s.strike || s.strikethrough));
        const first = intersectingSpans[0];
        const linkSpan = intersectingSpans.find((s) => Boolean(s.link || s.url));
        partialState = {
          bold: isBold,
          italic: isItalic,
          underline: isUnderline,
          strike: isStrike,
          fill: first.color || first.fill,
          fontSize: first['font-size'] ? parseFloat(first['font-size']) : first.fontSize,
          link: linkSpan?.link || linkSpan?.url || '',
        };
      }
    } else if (editor) {
      // 检查当前 editor 的 marks
      const editorMarks = (editor.marks as any) || (PlaitMarkEditor.getMarks(editor) as any) || {};
      const isBold = PlaitMarkEditor.isMarkActive(editor, MarkTypes.bold) || Boolean(editorMarks[MarkTypes.bold]);
      const isItalic = PlaitMarkEditor.isMarkActive(editor, MarkTypes.italic) || Boolean(editorMarks[MarkTypes.italic]);
      const isUnderline =
        PlaitMarkEditor.isMarkActive(editor, MarkTypes.underline) ||
        PlaitMarkEditor.isMarkActive(editor, 'underline' as any) ||
        Boolean(editorMarks[MarkTypes.underline] || editorMarks.underline || editorMarks.underlined);
      const isStrike =
        PlaitMarkEditor.isMarkActive(editor, MarkTypes.strike) ||
        PlaitMarkEditor.isMarkActive(editor, 'strikethrough' as any) ||
        Boolean(editorMarks[MarkTypes.strike] || editorMarks.strikethrough);

      partialState = {
        bold: Boolean(isBold),
        italic: Boolean(isItalic),
        underline: Boolean(isUnderline),
        strike: Boolean(isStrike),
        ...(editorMarks[MarkTypes.color] ? { fill: editorMarks[MarkTypes.color] } : {}),
        ...(editorMarks[MarkTypes.fontSize] ? { fontSize: Number(editorMarks[MarkTypes.fontSize]) } : {}),
      };
    }
  } catch (e) {
    // ignore
  }

  const baseState: NodeTextState = {
    text: typeof child.text === 'string' ? child.text : (typeof textObj.text === 'string' ? textObj.text : ''),
    link: selected.data?.link || selected.link || child.url || child.link || '',
    fontSize: child['font-size'] || child.fontSize || (isMind ? (selected.isRoot ? 16 : 14) : 14),
    fill: child.color || child.fill || textObj.color || textObj.fill || (isMind && selected.isRoot ? '#ffffff' : '#262626'),
    bold: Boolean(child.bold || textObj.bold || (isMind && selected.isRoot)),
    italic: Boolean(child.italic || textObj.italic),
    strike: Boolean(child.strikethrough || child.strike || textObj.strike || textObj.strikethrough),
    underline: Boolean(child.underlined || child.underline || textObj.underline || textObj.underlined),
    align: textObj.align || child.align || (isMind ? 'center' : 'left'),
    verticalAlign: textObj.verticalAlign || child.verticalAlign || 'middle',
  };

  return {
    ...baseState,
    ...partialState,
  };
}

export function patchNodeText(
  board: PlaitBoard,
  selectedElements: any[],
  patch: Partial<NodeTextState>,
  getElementPath: (el: any) => any[] | null
): void {
  selectedElements.forEach((element) => {
    const path = getElementPath(element);
    if (!path) return;

    try {
      const currentElement = (board.children || []).find((c: any) => c.id && element.id && c.id === element.id) || element;
      const textManages = getTextManages(currentElement).length > 0 ? getTextManages(currentElement) : getTextManages(element);
      const editors = textManages.map((tm) => tm.editor).filter(Boolean);

      let editableEl: HTMLElement | null = null;
      if (typeof window !== 'undefined') {
        const foreignObject = textManages?.[0]?.foreignObject;
        editableEl = (foreignObject?.querySelector?.('.slate-editable-container') ||
          (board as any)?.__activeEditableEl ||
          document.querySelector('.slate-editable-container[contenteditable="true"]') ||
          document.querySelector('.slate-editable-container')) as HTMLElement | null;
      }

      let editor: any = editors?.[0] || (board as any)?.__activeTextEditor || (editableEl as any)?.__slate_editor;
      let savedOffsets: { start: number; end: number; isBackward?: boolean } | null =
        (editor as any)?.savedDomOffsets ||
        (board as any)?.__activeTextOffsets ||
        (editableEl as any)?.__active_offsets ||
        null;

      if (editableEl && typeof window !== 'undefined') {
        const liveOffsets = getDomCharOffsets(editableEl);
        if (liveOffsets && liveOffsets.start !== liveOffsets.end) {
          savedOffsets = liveOffsets;
          if (editor) (editor as any).savedDomOffsets = liveOffsets;
          (board as any).__activeTextOffsets = liveOffsets;
        }
      }

      const isMind = isMindmapNode(element);
      const textObj = isMind ? (element.data?.topic || { children: [{ text: '' }] }) : (element.text || { children: [{ text: '' }] });
      const currentChildren = (editor?.children?.[0] as any)?.children || textObj.children || [{ text: '' }];
      const totalLen = currentChildren.map((c: any) => c.text || '').join('').length;

      const hasExpandedSelection = Boolean(savedOffsets && savedOffsets.start !== savedOffsets.end);
      const isSelectAll = Boolean(hasExpandedSelection && savedOffsets!.start === 0 && savedOffsets!.end >= totalLen);
      const isEditingNow = Boolean(
        (editor as any)?.isEditing ||
        textManages.some((tm) => tm.isEditing) ||
        (editableEl && editableEl.getAttribute('contenteditable') === 'true')
      );

      let newChildren: any[] = [];

      if (hasExpandedSelection && !isSelectAll) {
        // 核心分支 1：精准局部富文本格式化（仅选中 31 等局部文字）
        newChildren = sliceSpansByCharOffsets(currentChildren, savedOffsets!.start, savedOffsets!.end, patch);
        if (editor) {
          if (editor.children?.[0]) {
            editor.children = [{ ...editor.children[0], children: newChildren }];
          }
          const p1 = offsetToSlatePoint(editor, savedOffsets!.start);
          const p2 = offsetToSlatePoint(editor, savedOffsets!.end);
          editor.selection = {
            anchor: savedOffsets!.isBackward ? p2 : p1,
            focus: savedOffsets!.isBackward ? p1 : p2,
          };
          (editor as any).savedSelection = editor.selection;
          (editor as any).savedDomOffsets = savedOffsets;
        }
      } else if (isEditingNow && !hasExpandedSelection) {
        // 核心分支 2：编辑态下的折叠光标（仅设置 editor.marks 供后续键入字符使用，绝不污染已存在的所有文字）
        if (editor) {
          if (patch.bold !== undefined) {
            if (patch.bold) Editor.addMark(editor, MarkTypes.bold, true);
            else Editor.removeMark(editor, MarkTypes.bold);
          }
          if (patch.italic !== undefined) {
            if (patch.italic) Editor.addMark(editor, MarkTypes.italic, true);
            else Editor.removeMark(editor, MarkTypes.italic);
          }
          if (patch.underline !== undefined) {
            if (patch.underline) {
              Editor.addMark(editor, MarkTypes.underline, true);
              Editor.addMark(editor, 'underline', true);
            } else {
              Editor.removeMark(editor, MarkTypes.underline);
              Editor.removeMark(editor, 'underline');
            }
          }
          if (patch.strike !== undefined) {
            if (patch.strike) {
              Editor.addMark(editor, MarkTypes.strike, true);
              Editor.addMark(editor, 'strikethrough', true);
            } else {
              Editor.removeMark(editor, MarkTypes.strike);
              Editor.removeMark(editor, 'strikethrough');
            }
          }
          if (patch.fill !== undefined) PlaitMarkEditor.setColorMark(editor, patch.fill);
          if (patch.fontSize !== undefined) PlaitMarkEditor.setFontSizeMark(editor, patch.fontSize as any);
        }
        newChildren = currentChildren;
      } else {
        // 核心分支 3：全选状态或非编辑态整节点格式化
        newChildren = currentChildren.map((c: any, idx: number) => {
          const updated = { ...c };
          if (patch.text !== undefined && idx === 0) updated.text = patch.text;
          if (patch.bold !== undefined) updated.bold = patch.bold;
          if (patch.italic !== undefined) updated.italic = patch.italic;
          if (patch.underline !== undefined) {
            updated.underlined = patch.underline;
            updated.underline = patch.underline;
          }
          if (patch.strike !== undefined) {
            updated.strike = patch.strike;
            updated.strikethrough = patch.strike;
          }
          if (patch.fill !== undefined) {
            updated.color = patch.fill;
            updated.fill = patch.fill;
          }
          if (patch.fontSize !== undefined) {
            updated['font-size'] = patch.fontSize;
            updated.fontSize = patch.fontSize;
          }
          if (patch.link !== undefined) {
            if (patch.link) {
              updated.link = patch.link;
              updated.url = patch.link;
            } else {
              delete updated.link;
              delete updated.url;
            }
          }
          return updated;
        });

        if (editor && editor.children?.[0]) {
          editor.children = [{ ...editor.children[0], children: newChildren }];
          (editor as any).savedSelection = null;
          (editor as any).savedDomOffsets = null;
        }
      }

      // 同步到 Plait Board 数据模型
      let textToUpdate: any = null;
      if (isMind) {
        const topic = element.data?.topic || { children: [{ text: '' }] };
        const newTopic = {
          ...topic,
          children: newChildren,
        };
        if (patch.align !== undefined) newTopic.align = patch.align;
        const newData = {
          ...(element.data || {}),
          topic: newTopic,
        };
        Transforms.setNode(board, { data: newData } as any, path);
        textToUpdate = newTopic;
      } else {
        const currentText = element.text || { children: [{ text: '' }] };
        const newText = {
          ...currentText,
          children: newChildren,
        };
        if (patch.align !== undefined) newText.align = patch.align;
        if (patch.verticalAlign !== undefined) newText.verticalAlign = patch.verticalAlign;

        const newProps: any = { text: newText };
        if (patch.verticalAlign !== undefined) newProps.verticalAlign = patch.verticalAlign;
        if (patch.link !== undefined) newProps.link = patch.link;
        Transforms.setNode(board, newProps as any, path);
        textToUpdate = newText;
      }

      if (editor?.children?.[0]) {
        editor.children = [{ ...editor.children[0], children: newChildren }];
        if (patch.align !== undefined) (editor.children[0] as any).align = patch.align;
        if (patch.verticalAlign !== undefined) (editor.children[0] as any).verticalAlign = patch.verticalAlign;
      }

      // 触发视图刷新
      textManages.forEach((manage) => {
        manage.updateRectangle();
        manage.textComponentRef?.update?.({ text: textToUpdate });
      });

      // 如果当前仍在 DOM 编辑态，立即把切分好的 spansHtml 渲染到 editableEl，并恢复 DOM 字符选区！
      if (editableEl && editableEl.getAttribute('contenteditable') === 'true' && hasExpandedSelection && savedOffsets) {
        const first = newChildren[0] || {};
        const spansHtml = renderSlateSpansHtml(newChildren, {
          defaultFontSize: first['font-size'] ? parseFloat(first['font-size']) : (first.fontSize || 14),
          defaultColor: first.color || '#333333',
        });
        editableEl.innerHTML = spansHtml;
        setDomCharSelection(editableEl, savedOffsets.start, savedOffsets.end, savedOffsets.isBackward);
      }
    } catch (e) {
      console.error('patchNodeText error:', e);
    }
  });
}
