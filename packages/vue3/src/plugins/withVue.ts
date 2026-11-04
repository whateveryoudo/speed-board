import type { PlaitBoard } from '@plait/core';
import type { PlaitTextBoard, TextProps, RenderComponentRef, PlaitImageBoard, ImageProps } from '@plait/common';
import { createEditor } from 'slate';
import { withMark, PlaitMarkEditor, MarkTypes } from '@plait/text-plugins';
import { renderSlateSpansHtml, escapeHtml } from '@speed-board/core';

/**
 * 获取 DOM 选区在 contenteditable 元素内部的全局字符偏移量（基于 DOM 文本节点字符遍历，精准对称）
 */
export function getDomCharOffsets(root: HTMLElement): { start: number; end: number; isBackward: boolean } | null {
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
 * 根据全局字符偏移量还原 contenteditable 内部的 DOM 选区
 */
export function setDomCharSelection(
  root: HTMLElement,
  start: number,
  end: number,
  isBackward = false
): void {
  const sel = window.getSelection();
  if (!sel) return;

  let currentOffset = 0;
  let startNode: Node | null = null;
  let startNodeOffset = 0;
  let endNode: Node | null = null;
  let endNodeOffset = 0;
  let lastTextNode: Node | null = null;

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
 * 遍历 contenteditable DOM 结构，解析出带富文本样式的 Slate Spans
 */
export function parseEditableElToSlateSpans(
  editableEl: HTMLElement,
  baseStyles: Record<string, any> = {}
): any[] {
  const spans: any[] = [];

  function walk(node: Node, currentMark: Record<string, any>) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text.length > 0) {
        spans.push({
          ...currentMark,
          text,
        });
      }
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.tagName === 'BR') {
        spans.push({ ...currentMark, text: '\n' });
        return;
      }

      const newMark = { ...currentMark };
      if (el.style) {
        const fw = el.style.fontWeight;
        if (fw === 'bold' || fw === '600' || parseInt(fw) >= 600 || el.tagName === 'B' || el.tagName === 'STRONG') {
          newMark.bold = true;
        }
        const fs = el.style.fontStyle;
        if (fs === 'italic' || el.tagName === 'I' || el.tagName === 'EM') {
          newMark.italic = true;
        }
        const td = (el.style.textDecoration || (el.style as any).textDecorationLine || '').toLowerCase();
        if (td.includes('underline') || el.tagName === 'U') {
          newMark.underlined = true;
          newMark.underline = true;
        }
        if (td.includes('line-through') || el.tagName === 'S' || el.tagName === 'STRIKE' || el.tagName === 'DEL') {
          newMark.strike = true;
          newMark.strikethrough = true;
        }
        if (el.style.color && el.style.color !== 'inherit') {
          newMark.color = el.style.color;
        }
        if (el.style.fontSize) {
          const sizeVal = parseFloat(el.style.fontSize);
          if (!isNaN(sizeVal) && sizeVal > 0) {
            newMark['font-size'] = sizeVal;
            newMark.fontSize = sizeVal;
          }
        }
      }

      if (el.tagName === 'A') {
        const href = (el as HTMLAnchorElement).getAttribute('href') || (el as any).href;
        if (href) {
          newMark.link = href;
          newMark.url = href;
        }
      }

      for (let i = 0; i < el.childNodes.length; i++) {
        walk(el.childNodes[i], newMark);
      }
    }
  }

  for (let i = 0; i < editableEl.childNodes.length; i++) {
    walk(editableEl.childNodes[i], baseStyles);
  }

  if (spans.length === 0) {
    spans.push({ ...baseStyles, text: '' });
  }
  return spans;
}

/**
 * 合并相邻相同样式的 Span
 */
export function mergeAdjacentSpans(spans: any[]): any[] {
  if (spans.length <= 1) return spans;
  const merged: any[] = [];
  for (const span of spans) {
    if (merged.length === 0) {
      merged.push({ ...span });
      continue;
    }
    const prev = merged[merged.length - 1];
    const isSameMark =
      Boolean(prev.bold) === Boolean(span.bold) &&
      Boolean(prev.italic) === Boolean(span.italic) &&
      Boolean(prev.underlined || prev.underline) === Boolean(span.underlined || span.underline) &&
      Boolean(prev.strike || prev.strikethrough) === Boolean(span.strike || span.strikethrough) &&
      (prev.color || '') === (span.color || '') &&
      (prev['font-size'] || '') === (span['font-size'] || '');
    if (isSameMark) {
      prev.text = (prev.text || '') + (span.text || '');
    } else {
      merged.push({ ...span });
    }
  }
  return merged;
}

/**
 * Vue 3 适配插件：接管 Plait 的富文本和图片渲染
 * 采用享元/单例模式：静态展示时使用轻量 DOM 字符串，零 Framework 开销；
 * 仅在进入编辑状态 (readonly === false) 时才激活完整编辑能力。
 */
export const withVue = <T extends PlaitBoard = PlaitBoard>(board: T): T & PlaitTextBoard & PlaitImageBoard => {
  const newBoard = board as T & PlaitTextBoard & PlaitImageBoard;

  // 1. 文本渲染适配
  newBoard.renderText = (container: Element | DocumentFragment, props: TextProps) => {
    const el = container as HTMLElement;
    
    // 初始化一个轻量 Slate Editor 并集成 withMark 插件
    let editor = withMark(createEditor());
    if (props.textPlugins) {
      props.textPlugins.forEach((p: any) => {
        editor = p(editor);
      });
    }
    editor.children = [props.text as any];
    props.afterInit?.(editor);
    (el as any).__slate_editor = editor;
    (newBoard as any).__activeTextEditor = editor;

    let currentText = props.text;
    let isReadonly = props.readonly !== false;
    let cleanupEditingListeners: (() => void) | null = null;

    // 同步 Slate 的 selection 操作到真实 DOM 选区 (对齐 Plait 原生 Transforms.select(this.editor, [0]))
    const syncSlateSelectionToDom = () => {
      const editableEl = el.querySelector('.slate-editable-container') as HTMLElement | null;
      if (!editableEl || isReadonly || !editor.selection) return;

      const totalLen = (editableEl.textContent || '').length;
      const startOffset = slatePointToOffset(editor, editor.selection.anchor);
      const endOffset = slatePointToOffset(editor, editor.selection.focus);
      const min = Math.min(startOffset, endOffset);
      const max = Math.max(startOffset, endOffset);
      const isBackward = startOffset > endOffset;

      editableEl.focus();
      if (min === 0 && max >= totalLen) {
        const range = document.createRange();
        range.selectNodeContents(editableEl);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      } else {
        setDomCharSelection(editableEl, min, max, isBackward);
      }
    };

    const { apply: originalApply } = editor;
    editor.apply = (op) => {
      if (op.type === 'set_selection' && (editor as any)._skipNextSelectAll) {
        delete (editor as any)._skipNextSelectAll;
        const editableEl = el.querySelector('.slate-editable-container') as HTMLElement | null;
        const textLen = (editableEl?.textContent || '').length;
        const lastIndex = Math.max(0, (editor.children?.[0]?.children?.length || 1) - 1);
        const endPoint = { path: [0, lastIndex], offset: textLen };
        editor.selection = { anchor: endPoint, focus: endPoint };
        (editor as any).savedSelection = editor.selection;
        (editor as any).savedDomOffsets = {
          start: textLen,
          end: textLen,
          isBackward: false,
        };
        if (editableEl) {
          const focusEnd = () => {
            editableEl.focus();
            const range = document.createRange();
            range.selectNodeContents(editableEl);
            range.collapse(false);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
          };
          focusEnd();
          requestAnimationFrame(focusEnd);
        }
        return;
      }

      originalApply(op);
      if (op.type === 'set_selection' && !isReadonly) {
        syncSlateSelectionToDom();
        requestAnimationFrame(syncSlateSelectionToDom);
      }
    };

    const renderDOM = () => {
      // 提取纯文本内容与排版属性
      const firstChild = (currentText as any)?.children?.[0] || {};
      const fontSize = firstChild['font-size']
        ? parseFloat(firstChild['font-size'])
        : firstChild.fontSize
        ? parseFloat(firstChild.fontSize)
        : 14;
      const lineHeight = fontSize === 14 ? 20 : Math.round(fontSize * 1.5);
      const isMindTopic =
        (currentText as any)?.align === 'center' ||
        (currentText as any)?.id?.startsWith?.('mind') ||
        (props as any)?.isMind;
      const textAlign = (currentText as any)?.align || (isMindTopic ? 'center' : 'left');

      // 垂直对齐配置：跟随 verticalAlign 属性，默认垂直居中 (middle)
      const vAlign =
        (currentText as any)?.verticalAlign ||
        (props as any)?.verticalAlign ||
        'middle';
      const flexJustifyY =
        vAlign === 'middle' || vAlign === 'center'
          ? 'center'
          : vAlign === 'bottom'
          ? 'flex-end'
          : 'flex-start';

      const color = firstChild.color || '#333333';
      const isMindRoot = Boolean((props as any)?.isMind && (props as any)?.isRoot);
      const defaultWeight = (currentText as any)?.fontWeight || (isMindRoot ? '600' : 'normal');

      // 外层弹性容器：负责整个文本块在图形/文本框内的垂直对齐与边界约束
      const wrapperStyle = `width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: ${flexJustifyY}; box-sizing: border-box; font-size: ${fontSize}px; line-height: ${lineHeight}px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Noto Sans', 'Noto Sans CJK SC', 'Microsoft Yahei', 'Hiragino Sans GB', Arial, sans-serif;`;

      // 内层块级容器：必须是 display: block，让内部所有 span 作为行内自然流动排版，避免成为 flex-item 导致分栏立柱畸变
      // 注意：容器仅继承颜色与字体布局，绝不能在容器上直接设置 font-style: italic 或 text-decoration: underline，
      // 否则容器内的所有子 Span 都会强制继承，导致局部选区格式化污染整段文本！
      const textStyle = `display: block; width: 100%; text-align: ${textAlign}; color: ${color}; font-size: ${fontSize}px; line-height: ${lineHeight}px; font-family: inherit; white-space: pre-wrap; word-break: break-all; overflow-wrap: break-word; outline: none; box-sizing: border-box;`;

      const spansHtml = renderSlateSpansHtml((currentText as any)?.children, {
        defaultFontSize: fontSize,
        defaultColor: color,
        defaultFontWeight: defaultWeight,
      });

      if (isReadonly) {
        // 只读模式：外层 wrapper 负责垂直定位，内层 block 容器负责自然文本行流式排版
        el.innerHTML = `<div class="plait-text-wrapper" style="${wrapperStyle} user-select: none;"><div class="plait-text-container slate-editable-container" style="${textStyle}">${spansHtml}</div></div>`;
        const linkEls = el.querySelectorAll('a.slate-link');
        linkEls.forEach((a) => {
          (a as HTMLElement).addEventListener('click', (e: MouseEvent) => {
            if (e.metaKey || e.ctrlKey) {
              e.stopPropagation();
              e.preventDefault();
              window.open((a as HTMLAnchorElement).href, '_blank', 'noopener,noreferrer');
            }
          });
        });
      } else {
        // 编辑模式：渲染 contenteditable 块级容器
        el.innerHTML = `<div class="plait-text-wrapper" style="${wrapperStyle}"><div class="plait-text-container slate-editable-container" contenteditable="true" style="${textStyle} min-width: 20px; min-height: ${lineHeight}px; caret-color: auto;">${spansHtml}</div></div>`;
        const editableEl = (el.querySelector('.slate-editable-container') || el.firstElementChild) as HTMLElement;
        if (editableEl) {
          (editableEl as any).__slate_editor = editor;
          (newBoard as any).__activeEditableEl = editableEl;
          (newBoard as any).__activeTextEditor = editor;
          editableEl.focus();
          let typingTimer: any = null;
          let isTrailingDoubleClickMouseUp = false;

          const selectAll = () => {
            editableEl.focus();
            const range = document.createRange();
            range.selectNodeContents(editableEl);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);

            const textLen = (editableEl.textContent || '').length;
            const lastIndex = Math.max(0, (editor.children?.[0]?.children?.length || 1) - 1);
            const lastLen = (editor.children?.[0]?.children?.[lastIndex]?.text || '').length;
            const fullRange = {
              anchor: { path: [0, 0], offset: 0 },
              focus: { path: [0, lastIndex], offset: lastLen },
            };
            editor.selection = fullRange;
            (editor as any).savedSelection = fullRange;
            (editor as any).savedDomOffsets = {
              start: 0,
              end: textLen,
              isBackward: false,
            };
            (editableEl as any).__active_offsets = (editor as any).savedDomOffsets;
            (newBoard as any).__activeTextOffsets = (editor as any).savedDomOffsets;
            const wrapper = (newBoard as any).boardWrapper;
            wrapper?.emit?.('selection:change');
          };

          const syncSelection = () => {
            const offsets = getDomCharOffsets(editableEl);
            if (offsets) {
              const p1 = offsetToSlatePoint(editor, offsets.start);
              const p2 = offsetToSlatePoint(editor, offsets.end);
              const slateRange = {
                anchor: offsets.isBackward ? p2 : p1,
                focus: offsets.isBackward ? p1 : p2,
              };
              editor.selection = slateRange;
              (editor as any).savedSelection = slateRange;
              (editor as any).savedDomOffsets = offsets;
              (editableEl as any).__active_offsets = offsets;
              (editableEl as any).__slate_editor = editor;
              (newBoard as any).__activeTextOffsets = offsets;
              (newBoard as any).__activeTextEditor = editor;
              (newBoard as any).__activeEditableEl = editableEl;
              const wrapper = (newBoard as any).boardWrapper;
              wrapper?.emit?.('selection:change');
            }
          };

          editableEl.addEventListener('mouseup', () => {
            if (isTrailingDoubleClickMouseUp) {
              isTrailingDoubleClickMouseUp = false;
              selectAll();
              return;
            }
            syncSelection();
          });
          editableEl.addEventListener('keyup', (e: KeyboardEvent) => {
            syncSelection();
          });

          // 全局 selectionchange 兜底：拖选释放到 editableEl 外部、双击选词等也能100%精准同步
          const onDocSelectionChange = () => {
            if (isReadonly) return;
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return;
            const range = sel.getRangeAt(0);
            if (editableEl.contains(range.startContainer) && editableEl.contains(range.endContainer)) {
              syncSelection();
            }
          };
          document.addEventListener('selectionchange', onDocSelectionChange);

          cleanupEditingListeners?.();
          cleanupEditingListeners = () => {
            document.removeEventListener('selectionchange', onDocSelectionChange);
          };

          // 获得焦点时，浮动工具条不强制隐藏，方便用户直接使用格式面板
          editableEl.addEventListener('focus', () => {
            const wrapper = (newBoard as any).boardWrapper;
            if (wrapper) {
              wrapper.isTyping = false;
              wrapper.emit?.('selection:change');
            }
          });

          editableEl.addEventListener('blur', (e: FocusEvent) => {
            clearTimeout(typingTimer);
            const isHoveringToolbar = Boolean(
              document.querySelector('.plait-board-attached:hover, .quick-bubble-popover:hover, .ant-popover:hover, .ant-select-dropdown:hover')
            );
            const related = (e.relatedTarget || document.activeElement) as HTMLElement | null;
            const isToolbar = isHoveringToolbar || related?.closest('.plait-board-attached, .quick-bubble-popover, .ant-popover, .ant-select-dropdown');
            if (isToolbar) {
              // 焦点转移到浮动工具栏或 Popover，不退出编辑状态
              return;
            }
            setTimeout(() => {
              const active = document.activeElement;
              const stillInToolbar = Boolean(
                active?.closest('.plait-board-attached, .quick-bubble-popover, .ant-popover, .ant-select-dropdown') ||
                document.querySelector('.plait-board-attached:hover, .quick-bubble-popover:hover, .ant-popover:hover, .ant-select-dropdown:hover')
              );
              if (stillInToolbar) return;

              const wrapper = (newBoard as any).boardWrapper;
              if (wrapper) {
                wrapper.isTyping = false;
                wrapper.emit?.('text:editing', false);
                wrapper.emit?.('selection:change');
              }
            }, 150);
          });

          let hasClearedDefault = false;

          // 1. 如果是“选中输入”（用户在选中图元时直接键入按键），清空原内容并直接灌入该按键
          const pendingChar = (newBoard as any)._pendingInputChar;
          if (pendingChar) {
            delete (newBoard as any)._pendingInputChar;
            hasClearedDefault = true;
            (editor as any)._skipNextSelectAll = true;
            isTrailingDoubleClickMouseUp = false;

            const baseSpan = {
              ...((currentText as any)?.children?.[0] || {}),
              text: pendingChar,
            };
            const newText = {
              ...(currentText as any),
              children: [baseSpan],
            };
            editor.children = [newText as any];
            currentText = newText as any;
            editableEl.textContent = pendingChar;

            const endPoint = { path: [0, 0], offset: pendingChar.length };
            const slateRange = { anchor: endPoint, focus: endPoint };
            editor.selection = slateRange;
            (editor as any).savedSelection = slateRange;
            (editor as any).savedDomOffsets = {
              start: pendingChar.length,
              end: pendingChar.length,
              isBackward: false,
            };

            const focusAfterChar = () => {
              editableEl.focus();
              const range = document.createRange();
              range.selectNodeContents(editableEl);
              range.collapse(false);
              const sel = window.getSelection();
              sel?.removeAllRanges();
              sel?.addRange(range);
            };
            focusAfterChar();
            requestAnimationFrame(focusAfterChar);

            props.onChange?.({
              newText: newText as any,
              operations: [
                {
                  type: 'insert_text',
                  path: [0, 0],
                  offset: 0,
                  text: pendingChar,
                } as any,
              ],
            });
          } else if ((editor as any).savedDomOffsets) {
            // 恢复之前保存的局部选区（如从浮动工具栏格式化后回到编辑态）
            isTrailingDoubleClickMouseUp = false;
            const { start, end, isBackward } = (editor as any).savedDomOffsets;
            setDomCharSelection(editableEl, start, end, isBackward);
            const p1 = offsetToSlatePoint(editor, start);
            const p2 = offsetToSlatePoint(editor, end);
            const slateRange = {
              anchor: isBackward ? p2 : p1,
              focus: isBackward ? p1 : p2,
            };
            editor.selection = slateRange;
            (editor as any).savedSelection = slateRange;
          } else {
            // 初次进入编辑态（双击/回车）：聚焦并全选所有文字
            isTrailingDoubleClickMouseUp = true;
            setTimeout(() => {
              isTrailingDoubleClickMouseUp = false;
            }, 300);
            selectAll();
            requestAnimationFrame(selectAll);
          }

          // 2. 默认占位符 "文本" 的自动清空：仅当文字仍为默认 "文本" 且处于“全选”状态时按键才替换占位符；
          // 若用户已将光标折叠/移到文字末尾或某处，表明有意在该位置输入，绝不能清空已有内容！
          const clearDefaultTextIfMatch = (e?: KeyboardEvent) => {
            if (hasClearedDefault) return;
            const currentStr = editableEl.textContent?.trim();
            if (currentStr === '文本') {
              const sel = window.getSelection();
              // 用户已手动点击或按方向键将光标折叠，直接标记完成并保留原文本
              if (sel && sel.isCollapsed) {
                hasClearedDefault = true;
                return;
              }
              if (
                e &&
                (e.ctrlKey || e.metaKey || e.altKey || e.key.length > 1) &&
                e.key !== 'Backspace' &&
                e.key !== 'Delete'
              ) {
                return;
              }
              hasClearedDefault = true;
              editableEl.textContent = '';
              const range = document.createRange();
              range.selectNodeContents(editableEl);
              range.collapse(true);
              sel?.removeAllRanges();
              sel?.addRange(range);
            } else {
              hasClearedDefault = true;
            }
          };

          editableEl.addEventListener('click', (e: MouseEvent) => {
            const linkEl = (e.target as HTMLElement)?.closest('a.slate-link') as HTMLAnchorElement | null;
            if (linkEl && linkEl.href && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              e.stopPropagation();
              window.open(linkEl.href, '_blank', 'noopener,noreferrer');
              return;
            }
            const sel = window.getSelection();
            if (sel && sel.isCollapsed) {
              hasClearedDefault = true;
            }
          });

          editableEl.addEventListener('keydown', clearDefaultTextIfMatch, true);
          editableEl.addEventListener('compositionstart', () => clearDefaultTextIfMatch(), true);

          const notifyTyping = () => {
            const wrapper = (newBoard as any).boardWrapper;
            if (wrapper) {
              wrapper.isTyping = true;
              wrapper.emit?.('selection:change');
              clearTimeout(typingTimer);
              typingTimer = setTimeout(() => {
                wrapper.isTyping = false;
                wrapper.emit?.('selection:change');
              }, 600);
            }
          };

          const handleInput = () => {
            notifyTyping();
            const spans = parseEditableElToSlateSpans(editableEl, {
              color,
              'font-size': fontSize,
            });
            const merged = mergeAdjacentSpans(spans);
            const newText = {
              ...(currentText as any),
              children: merged,
            };
            editor.children = [newText];
            currentText = newText as any;
            syncSelection();

            // 关键：必须提供有效的非 selection Slate 操作，Plait TextManage 才会触发尺寸重算与 DrawTransforms.setText 存储！
            props.onChange?.({
              newText: newText as any,
              operations: [
                {
                  type: 'insert_text',
                  path: [0, 0],
                  offset: 0,
                  text: merged.map((s: any) => s.text || '').join(''),
                } as any,
              ],
            });
          };

          editableEl.addEventListener('input', handleInput);

          editableEl.addEventListener('compositionstart', () => {
            props.onComposition?.({ type: 'compositionstart' } as any);
            notifyTyping();
          });
          editableEl.addEventListener('compositionend', () => {
            props.onComposition?.({ type: 'compositionend' } as any);
            handleInput();
          });

          // 快捷键支持：Cmd/Ctrl + B, I, U
          editableEl.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
              editableEl.blur();
              e.stopPropagation();
              return;
            }

            const isCtrlOrMeta = e.metaKey || e.ctrlKey;
            if (isCtrlOrMeta) {
              const k = e.key.toLowerCase();
              if (k === 'b') {
                e.preventDefault();
                e.stopPropagation();
                syncSelection();
                const isBold = PlaitMarkEditor.isMarkActive(editor, MarkTypes.bold);
                const wrapper = (newBoard as any).boardWrapper;
                wrapper?.patchNodeText?.({ bold: !isBold });
                return;
              }
              if (k === 'i') {
                e.preventDefault();
                e.stopPropagation();
                syncSelection();
                const isItalic = PlaitMarkEditor.isMarkActive(editor, MarkTypes.italic);
                const wrapper = (newBoard as any).boardWrapper;
                wrapper?.patchNodeText?.({ italic: !isItalic });
                return;
              }
              if (k === 'u') {
                e.preventDefault();
                e.stopPropagation();
                syncSelection();
                const isUnderline = PlaitMarkEditor.isMarkActive(editor, MarkTypes.underline);
                const wrapper = (newBoard as any).boardWrapper;
                wrapper?.patchNodeText?.({ underline: !isUnderline });
                return;
              }
            }
          });
        }
      }
    };

    renderDOM();

    const ref: RenderComponentRef<TextProps> = {
      destroy: () => {
        cleanupEditingListeners?.();
        cleanupEditingListeners = null;
        el.innerHTML = '';
        if (!isReadonly) {
          const wrapper = (newBoard as any).boardWrapper;
          wrapper?.emit?.('text:editing', false);
          wrapper?.emit?.('selection:change');
        }
      },
      update: (updatedProps: Partial<TextProps>) => {
        const readonlyChanged =
          updatedProps.readonly !== undefined && (updatedProps.readonly !== false) !== isReadonly;

        const hasNewText = Boolean(updatedProps.text);
        if (updatedProps.text) {
          currentText = updatedProps.text;
          editor.children = [currentText as any];
        }
        if (updatedProps.readonly !== undefined) {
          isReadonly = updatedProps.readonly !== false;
          (editor as any).isEditing = !isReadonly;
        }

        if (readonlyChanged) {
          delete (editor as any).savedDomOffsets;
          delete (editor as any).savedSelection;
          editor.selection = null;

          const wrapper = (newBoard as any).boardWrapper;
          wrapper?.emit?.('text:editing', !isReadonly);
          wrapper?.emit?.('selection:change');
        }

        const wrapper = (newBoard as any).boardWrapper;
        const isTyping = Boolean(wrapper?.isTyping);

        // 如果已处于编辑态，且传入了更新的文本（包括局部富文本样式变更）：
        // 增量更新 editableEl.innerHTML 并保持当前选区，绝不销毁外层 DOM 和重置事件监听！
        const existingEditable = el.querySelector('.slate-editable-container') as HTMLElement | null;
        if (!readonlyChanged && !isReadonly && existingEditable && hasNewText && !isTyping) {
          const firstChild = (currentText as any)?.children?.[0] || {};
          const fontSize = firstChild['font-size']
            ? parseFloat(firstChild['font-size'])
            : firstChild.fontSize
            ? parseFloat(firstChild.fontSize)
            : 14;
          const color = firstChild.color || '#333333';
          const isMindRoot = Boolean((props as any)?.isMind && (props as any)?.isRoot);
          const defaultWeight = (currentText as any)?.fontWeight || (isMindRoot ? '600' : 'normal');

          const spansHtml = renderSlateSpansHtml((currentText as any)?.children, {
            defaultFontSize: fontSize,
            defaultColor: color,
            defaultFontWeight: defaultWeight,
          });

          existingEditable.innerHTML = spansHtml;
          if ((editor as any).savedDomOffsets) {
            const { start, end, isBackward } = (editor as any).savedDomOffsets;
            setDomCharSelection(existingEditable, start, end, isBackward);
          }
          return;
        }

        // 无论是只读状态变化，还是非编辑态下样式/文本变更（hasNewText），都必须立即重绘 DOM！
        // 彻底解决只读态直接点击 B/I/S/U、字号、颜色无响应的问题！
        if (readonlyChanged || (hasNewText && (isReadonly || !isTyping))) {
          renderDOM();
        }
      },
    };

    return ref;
  };

  // 2. 图片渲染适配
  newBoard.renderImage = (container: Element | DocumentFragment, props: ImageProps) => {
    const el = container as HTMLElement;
    let currentProps = props;

    const renderDOM = () => {
      const src = currentProps.imageItem?.url || '';
      el.innerHTML = `
        <div class="plait-image-container" style="width: 100%; height: 100%; overflow: hidden; display: flex; align-items: center; justify-content: center; pointer-events: none;">
          <img src="${escapeHtml(src)}" style="width: 100%; height: 100%; object-fit: contain; user-select: none; pointer-events: none;" draggable="false" />
        </div>
      `;

      // 自动测量天然宽高并回传
      if ((currentProps as any).afterInit) {
        const img = document.createElement('img');
        img.src = src;
        img.onload = () => {
          (currentProps as any).afterInit?.({
            width: img.naturalWidth,
            height: img.naturalHeight,
          } as any);
        };
      }
    };

    renderDOM();

    const ref: RenderComponentRef<ImageProps> = {
      destroy: () => {
        el.innerHTML = '';
      },
      update: (newProps: Partial<ImageProps>) => {
        currentProps = { ...currentProps, ...newProps } as ImageProps;
        renderDOM();
      },
    };

    return ref;
  };

  return newBoard;
};
