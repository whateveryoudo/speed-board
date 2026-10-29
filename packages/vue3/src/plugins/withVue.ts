import type { PlaitBoard } from '@plait/core';
import type { PlaitTextBoard, TextProps, RenderComponentRef, PlaitImageBoard, ImageProps } from '@plait/common';
import { createEditor } from 'slate';
import { withMark, PlaitMarkEditor, MarkTypes } from '@plait/text-plugins';
import { renderSlateSpansHtml, escapeHtml } from '@speed-board/core';

/**
 * 获取 DOM 选区在 contenteditable 元素内部的全局字符偏移量
 */
export function getDomCharOffsets(root: HTMLElement): { start: number; end: number; isBackward: boolean } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null;
  }
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(root);
  preCaretRange.setEnd(range.startContainer, range.startOffset);
  const start = preCaretRange.toString().length;
  preCaretRange.setEnd(range.endContainer, range.endOffset);
  const end = preCaretRange.toString().length;

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

  return { start, end, isBackward };
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

  function traverse(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
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
        const td = el.style.textDecoration || '';
        if (td.includes('underline') || el.tagName === 'U') {
          newMark.underlined = true;
        }
        if (td.includes('line-through') || el.tagName === 'S' || el.tagName === 'STRIKE') {
          newMark.strike = true;
        }
        if (el.style.color && el.style.color !== 'inherit') {
          newMark.color = el.style.color;
        }
        if (el.style.fontSize) {
          const sizeVal = parseFloat(el.style.fontSize);
          if (!isNaN(sizeVal) && sizeVal > 0) {
            newMark['font-size'] = sizeVal;
          }
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
      Boolean(prev.underlined) === Boolean(span.underlined) &&
      Boolean(prev.strike) === Boolean(span.strike) &&
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

    let currentText = props.text;
    let isReadonly = props.readonly !== false;

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
      const fontWeight = firstChild.bold ? 'bold' : 'normal';
      const fontStyle = firstChild.italic ? 'italic' : 'normal';
      let textDecoration = 'none';
      if (firstChild.underlined && firstChild.strike) {
        textDecoration = 'underline line-through';
      } else if (firstChild.underlined) {
        textDecoration = 'underline';
      } else if (firstChild.strike) {
        textDecoration = 'line-through';
      }

      // 外层弹性容器：负责整个文本块在图形/文本框内的垂直对齐与边界约束
      const wrapperStyle = `width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: ${flexJustifyY}; box-sizing: border-box; font-size: ${fontSize}px; line-height: ${lineHeight}px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Noto Sans', 'Noto Sans CJK SC', 'Microsoft Yahei', 'Hiragino Sans GB', Arial, sans-serif;`;

      // 内层块级容器：必须是 display: block，让内部所有 span 作为行内自然流动排版，避免成为 flex-item 导致分栏立柱畸变
      const textStyle = `display: block; width: 100%; text-align: ${textAlign}; color: ${color}; font-weight: ${fontWeight}; font-style: ${fontStyle}; text-decoration: ${textDecoration}; font-size: ${fontSize}px; line-height: ${lineHeight}px; font-family: inherit; white-space: pre-wrap; word-break: break-all; overflow-wrap: break-word; outline: none; box-sizing: border-box;`;

      const spansHtml = renderSlateSpansHtml((currentText as any)?.children, {
        defaultFontSize: fontSize,
        defaultColor: color,
        defaultFontWeight: fontWeight,
      });

      if (isReadonly) {
        // 只读模式：外层 wrapper 负责垂直定位，内层 block 容器负责自然文本行流式排版
        el.innerHTML = `<div class="plait-text-wrapper" style="${wrapperStyle} user-select: none;"><div class="plait-text-container slate-editable-container" style="${textStyle}">${spansHtml}</div></div>`;
      } else {
        // 编辑模式：渲染 contenteditable 块级容器
        el.innerHTML = `<div class="plait-text-wrapper" style="${wrapperStyle}"><div class="plait-text-container slate-editable-container" contenteditable="true" style="${textStyle} min-width: 20px; min-height: ${lineHeight}px; caret-color: auto;">${spansHtml}</div></div>`;
        const editableEl = (el.querySelector('.slate-editable-container') || el.firstElementChild) as HTMLElement;
        if (editableEl) {
          editableEl.focus();
          let typingTimer: any = null;

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
              const wrapper = (newBoard as any).boardWrapper;
              wrapper?.emit?.('selection:change');
            }
          };

          editableEl.addEventListener('mouseup', syncSelection);
          editableEl.addEventListener('keyup', (e: KeyboardEvent) => {
            syncSelection();
          });

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
            const related = (e.relatedTarget || document.activeElement) as HTMLElement | null;
            const isToolbar = related?.closest('.plait-board-attached');
            if (isToolbar) {
              // 焦点转移到浮动工具栏或 Popover，不退出编辑状态
              return;
            }
            const wrapper = (newBoard as any).boardWrapper;
            if (wrapper) {
              wrapper.isTyping = false;
              wrapper.emit?.('text:editing', false);
              wrapper.emit?.('selection:change');
            }
          });

          // 初始化选区：如果存在 savedDomOffsets 则恢复选区，否则全选文本 (对标 Plait 原生 Transforms.select(editor, [0]))
          if ((editor as any).savedDomOffsets) {
            const { start, end, isBackward } = (editor as any).savedDomOffsets;
            setDomCharSelection(editableEl, start, end, isBackward);
          } else {
            const range = document.createRange();
            range.selectNodeContents(editableEl);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
          }

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
              bold: firstChild.bold,
              italic: firstChild.italic,
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
        if (updatedProps.text) {
          currentText = updatedProps.text;
          editor.children = [currentText as any];
        }
        if (updatedProps.readonly !== undefined) {
          isReadonly = updatedProps.readonly !== false;
        }

        if (readonlyChanged) {
          const wrapper = (newBoard as any).boardWrapper;
          wrapper?.emit?.('text:editing', !isReadonly);
          wrapper?.emit?.('selection:change');
        }

        const wrapper = (newBoard as any).boardWrapper;
        const isTyping = Boolean(wrapper?.isTyping);

        // 仅在只读状态变化，或者只读模式下文本更新，或者非输入状态下的富文本格式变更时，重绘 DOM
        if (readonlyChanged || isReadonly || (!isTyping && updatedProps.text)) {
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
