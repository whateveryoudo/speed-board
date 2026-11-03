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
      let td = 'none';
      const isUnderline = Boolean(c.underlined || c.underline);
      const isStrike = Boolean(c.strike || c.strikethrough);
      if (isUnderline && isStrike) td = 'underline line-through';
      else if (isUnderline) td = 'underline';
      else if (isStrike) td = 'line-through';
      const clr = c.color || defaultColor;

      const spanStyles: string[] = [
        `font-size: ${fs}px`,
        `font-weight: ${fw}`,
        `vertical-align: baseline`,
        `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Noto Sans', sans-serif`,
      ];
      if (fst !== 'normal') spanStyles.push(`font-style: ${fst}`);
      if (td !== 'none') spanStyles.push(`text-decoration: ${td}`);
      if (clr !== 'inherit') spanStyles.push(`color: ${clr}`);

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
    const currentElement = (selectedElements[0] as any);
    const textManages = getTextManages(currentElement);
    const editors = textManages.map((tm) => tm.editor);
    const editor = editors?.[0];
    let currentSelection = (editor as any)?.savedSelection || editor?.selection;
    let savedOffsets = (editor as any)?.savedDomOffsets;

    // 实时 DOM 选区检查兜底（只要页面中有处于活跃状态的选区，优先以真实 DOM 选区为准）
    if (typeof window !== 'undefined') {
      const foreignObject = textManages?.[0]?.foreignObject;
      const editableEl = (foreignObject?.querySelector?.('.slate-editable-container') ||
        document.querySelector('.slate-editable-container[contenteditable="true"]') ||
        document.querySelector('.slate-editable-container')) as HTMLElement | null;
      if (editableEl) {
        const liveOffsets = getDomCharOffsets(editableEl);
        if (liveOffsets && liveOffsets.start !== liveOffsets.end) {
          savedOffsets = liveOffsets;
          if (editor) {
            (editor as any).savedDomOffsets = liveOffsets;
          }
        }
      }
    }

    if (editor && savedOffsets && savedOffsets.start !== savedOffsets.end) {
      const p1 = offsetToSlatePoint(editor, savedOffsets.start);
      const p2 = offsetToSlatePoint(editor, savedOffsets.end);
      currentSelection = {
        anchor: savedOffsets.isBackward ? p2 : p1,
        focus: savedOffsets.isBackward ? p1 : p2,
      };
      editor.selection = currentSelection;
    }

    const hasExpandedSelection = currentSelection && !Range.isCollapsed(currentSelection);
    const isEditingNow = Boolean(
      (editor as any)?.isEditing ||
      textManages.some((tm) => tm.isEditing) ||
      (typeof document !== 'undefined' && document.querySelector('.slate-editable-container[contenteditable="true"]'))
    );

    if (editor && hasExpandedSelection) {
      editor.selection = currentSelection;
      const isBold = PlaitMarkEditor.isMarkActive(editor, MarkTypes.bold);
      const isItalic = PlaitMarkEditor.isMarkActive(editor, MarkTypes.italic);
      const isUnderline =
        PlaitMarkEditor.isMarkActive(editor, MarkTypes.underline) ||
        PlaitMarkEditor.isMarkActive(editor, 'underline' as any);
      const isStrike =
        PlaitMarkEditor.isMarkActive(editor, MarkTypes.strike) ||
        PlaitMarkEditor.isMarkActive(editor, 'strikethrough' as any);
      const marks = (PlaitMarkEditor.getMarks(editor) as any) || {};

      let selectedText = '';
      try {
        selectedText = Editor.string(editor, currentSelection);
      } catch (e) {
        // ignore
      }

      partialState = {
        text: selectedText,
        bold: Boolean(isBold),
        italic: Boolean(isItalic),
        underline: Boolean(isUnderline || marks.underlined || marks.underline),
        strike: Boolean(isStrike || marks.strike || marks.strikethrough),
        ...(marks[MarkTypes.color] ? { fill: marks[MarkTypes.color] } : {}),
        ...(marks[MarkTypes.fontSize] ? { fontSize: Number(marks[MarkTypes.fontSize]) } : {}),
      };
    } else if (editor && isEditingNow) {
      const editorMarks = (editor.marks as any) || {};
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
      const marks = editorMarks || (PlaitMarkEditor.getMarks(editor) as any) || {};

      partialState = {
        bold: Boolean(isBold),
        italic: Boolean(isItalic),
        underline: Boolean(isUnderline),
        strike: Boolean(isStrike),
        ...(marks[MarkTypes.color] ? { fill: marks[MarkTypes.color] } : {}),
        ...(marks[MarkTypes.fontSize] ? { fontSize: Number(marks[MarkTypes.fontSize]) } : {}),
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

    let handledByEditor = false;

    try {
      const currentElement = (board.children || []).find((c: any) => c.id === element.id) || element;
      const textManages = getTextManages(currentElement).length > 0 ? getTextManages(currentElement) : getTextManages(element);
      const editors = textManages.map((tm) => tm.editor);
      const editor = editors?.[0];
      let currentSelection = (editor as any)?.savedSelection || editor?.selection;
      let savedOffsets = (editor as any)?.savedDomOffsets;

      // 选区检查：优先检查真实活跃的 DOM 选区
      if (typeof window !== 'undefined') {
        const foreignObject = textManages?.[0]?.foreignObject;
        const editableEl = (foreignObject?.querySelector?.('.slate-editable-container') ||
          document.querySelector('.slate-editable-container[contenteditable="true"]') ||
          document.querySelector('.slate-editable-container')) as HTMLElement | null;
        if (editableEl) {
          const liveOffsets = getDomCharOffsets(editableEl);
          if (liveOffsets && liveOffsets.start !== liveOffsets.end) {
            savedOffsets = liveOffsets;
            if (editor) {
              (editor as any).savedDomOffsets = liveOffsets;
            }
          }
        }
      }

      if (editor && savedOffsets && savedOffsets.start !== savedOffsets.end) {
        const p1 = offsetToSlatePoint(editor, savedOffsets.start);
        const p2 = offsetToSlatePoint(editor, savedOffsets.end);
        currentSelection = {
          anchor: savedOffsets.isBackward ? p2 : p1,
          focus: savedOffsets.isBackward ? p1 : p2,
        };
        editor.selection = currentSelection;
      }

      const hasExpandedSelection = currentSelection && !Range.isCollapsed(currentSelection);
      const isEditingNow = Boolean(
        (editor as any)?.isEditing ||
        textManages.some((tm) => tm.isEditing) ||
        (typeof document !== 'undefined' && document.querySelector('.slate-editable-container[contenteditable="true"]'))
      );

      if (editor) {
        if (hasExpandedSelection) {
          // 局部富文本格式化：仅应用于选中文本片段
          editor.selection = currentSelection;
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
          if (patch.fill !== undefined) {
            PlaitMarkEditor.setColorMark(editor, patch.fill);
          }
          if (patch.fontSize !== undefined) {
            PlaitMarkEditor.setFontSizeMark(editor, patch.fontSize as any);
          }
          if (patch.text !== undefined) {
            Editor.insertText(editor, patch.text);
          }
          (editor as any).savedSelection = editor.selection;
          if (editor.selection) {
            const s = slatePointToOffset(editor, editor.selection.anchor);
            const e = slatePointToOffset(editor, editor.selection.focus);
            (editor as any).savedDomOffsets = {
              start: Math.min(s, e),
              end: Math.max(s, e),
              isBackward: s > e,
            };
          }
        } else if (isEditingNow) {
          // 编辑态下的折叠光标（如光标在字符之间）：切换当前 Slate 选区的 Marks，供后续输入使用，绝不污染整段全量文本！
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
          if (patch.fill !== undefined) {
            PlaitMarkEditor.setColorMark(editor, patch.fill);
          }
          if (patch.fontSize !== undefined) {
            PlaitMarkEditor.setFontSizeMark(editor, patch.fontSize as any);
          }
        } else {
          // 全量格式化：未选中文本（光标折叠或仅选中节点），安全不可变地更新该节点的所有文本 Span
          const rawChildren = (editor.children?.[0] as any)?.children || [{ text: '' }];
          const updatedChildren = rawChildren.map((c: any) => {
            const updated = { ...c };
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
            return updated;
          });
          if (editor.children?.[0]) {
            editor.children = [{ ...editor.children[0], children: updatedChildren }];
          }
          (editor as any).savedSelection = null;
          (editor as any).savedDomOffsets = null;
        }

        const newChildren = (editor.children?.[0] as any)?.children || [{ text: '' }];

        if (isMindmapNode(element)) {
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
        }

        if (editor.children?.[0]) {
          if (patch.align !== undefined) (editor.children[0] as any).align = patch.align;
          if (patch.verticalAlign !== undefined) (editor.children[0] as any).verticalAlign = patch.verticalAlign;
        }

        textManages.forEach((manage) => {
          if (patch.verticalAlign !== undefined) {
            manage.updateRectangle();
          }
          const textToUpdate = isMindmapNode(element) ? (element.data?.topic as any) : newText;
          manage.textComponentRef?.update?.({ text: textToUpdate });
        });

        handledByEditor = true;
      }
    } catch (e) {
      handledByEditor = false;
    }

    if (handledByEditor) return;

    // Fallback: 无 editor（如服务端 Node.js 环境或组件未挂载前）
    if (isMindmapNode(element)) {
      const topic = element.data?.topic || { children: [{ text: '' }] };
      const children = topic.children || [{ text: '' }];
      const updatedChildren = children.map((child: any, idx: number) => {
        const updated = { ...child };
        if (patch.text !== undefined && idx === 0) updated.text = patch.text;
        if (patch.fontSize !== undefined) {
          updated['font-size'] = patch.fontSize;
          updated.fontSize = patch.fontSize;
        }
        if (patch.fill !== undefined) {
          updated.color = patch.fill;
          updated.fill = patch.fill;
        }
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
        return updated;
      });

      const newTopic = {
        ...topic,
        children: updatedChildren,
      };
      if (patch.align !== undefined) newTopic.align = patch.align;
      const newData = {
        ...(element.data || {}),
        topic: newTopic,
      };
      Transforms.setNode(board, { data: newData } as any, path);
      return;
    }

    // 普通白板图形 (Fallback)
    const currentText = element.text || { children: [{ text: '' }] };
    const currentChildren = currentText.children || [{ text: '' }];
    const updatedChildren = currentChildren.map((child: any, idx: number) => {
      const updated = { ...child };
      if (patch.text !== undefined && idx === 0) updated.text = patch.text;
      if (patch.fontSize !== undefined) {
        updated['font-size'] = patch.fontSize;
        updated.fontSize = patch.fontSize;
      }
      if (patch.fill !== undefined) {
        updated.color = patch.fill;
        updated.fill = patch.fill;
      }
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
      return updated;
    });

    const newText = {
      ...currentText,
      children: updatedChildren,
    };
    if (patch.align !== undefined) newText.align = patch.align;
    if (patch.verticalAlign !== undefined) newText.verticalAlign = patch.verticalAlign;

    const newProps: any = { text: newText };
    if (patch.verticalAlign !== undefined) newProps.verticalAlign = patch.verticalAlign;
    if (patch.link !== undefined) newProps.link = patch.link;

    Transforms.setNode(board, newProps as any, path);

    const textManages = getTextManages(element);
    textManages.forEach((manage) => {
      if (patch.verticalAlign !== undefined) {
        manage.updateRectangle();
      }
      manage.textComponentRef?.update?.({ text: newText as any });
    });
  });
}
