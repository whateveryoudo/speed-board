import type { PlaitBoard } from '@plait/core';
import type { PlaitTextBoard, TextProps, RenderComponentRef, PlaitImageBoard, ImageProps } from '@plait/common';
import { createEditor } from 'slate';
import { renderSlateSpansHtml, escapeHtml } from '@speed-board/core';

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
    
    // 初始化一个轻量 Slate Editor 供 Plait 内部调用 (尺寸测量与选区定位)
    const editor = createEditor();
    editor.children = [props.text as any];
    props.afterInit?.(editor);

    let currentText = props.text;
    let isReadonly = props.readonly !== false;

    const renderDOM = () => {
      // 提取纯文本内容与排版属性
      const firstChild = (currentText as any)?.children?.[0] || {};
      const fontSize = firstChild['font-size'] ? parseFloat(firstChild['font-size']) : 14;
      const lineHeight = fontSize === 14 ? 20 : Math.round(fontSize * 1.5);
      const isMindTopic =
        (currentText as any)?.align === 'center' ||
        (currentText as any)?.id?.startsWith?.('mind') ||
        (props as any)?.isMind;
      const textAlign = (currentText as any)?.align || (isMindTopic ? 'center' : 'left');
      const flexJustify =
        textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start';
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

      const baseStyle = `outline: none; font-size: ${fontSize}px; line-height: ${lineHeight}px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Noto Sans', 'Noto Sans CJK SC', 'Microsoft Yahei', 'Hiragino Sans GB', Arial, sans-serif; text-align: ${textAlign}; color: ${color}; font-weight: ${fontWeight}; font-style: ${fontStyle}; text-decoration: ${textDecoration}; white-space: pre-wrap; word-break: break-all; overflow-wrap: break-word; box-sizing: border-box; width: 100%; height: 100%; display: flex; align-items: center; justify-content: ${flexJustify};`;

      const spansHtml = renderSlateSpansHtml((currentText as any)?.children, {
        defaultFontSize: fontSize,
        defaultColor: color,
        defaultFontWeight: fontWeight,
      });

      if (isReadonly) {
        // 只读模式：直接渲染轻量 HTML，零组件创建开销
        el.innerHTML = `<div class="plait-text-container slate-editable-container" style="${baseStyle} user-select: none;">${spansHtml}</div>`;
      } else {
        // 编辑模式：渲染 contenteditable 容器
        el.innerHTML = `<div class="plait-text-container slate-editable-container" contenteditable="true" style="${baseStyle} min-width: 20px; min-height: ${lineHeight}px; caret-color: auto;">${spansHtml}</div>`;
        const editableEl = el.firstElementChild as HTMLElement;
        if (editableEl) {
          editableEl.focus();
          let typingTimer: any = null;

          // 获得焦点时，浮动工具条不强制隐藏，方便用户直接使用格式面板
          editableEl.addEventListener('focus', () => {
            const wrapper = (newBoard as any).boardWrapper;
            if (wrapper) {
              wrapper.isTyping = false;
              wrapper.emit?.('selection:change');
            }
          });
          editableEl.addEventListener('blur', () => {
            clearTimeout(typingTimer);
            const wrapper = (newBoard as any).boardWrapper;
            if (wrapper) {
              wrapper.isTyping = false;
              wrapper.emit?.('text:editing', false);
              wrapper.emit?.('selection:change');
            }
          });

          // 移动光标到末尾
          const range = document.createRange();
          range.selectNodeContents(editableEl);
          range.collapse(false);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);

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
            const raw = editableEl.innerText || editableEl.textContent || '';
            const val = raw.replace(/\r\n/g, '\n').replace(/\n$/, '');
            const newText = {
              ...(currentText as any),
              children: [
                {
                  ...((currentText as any)?.children?.[0] || {}),
                  text: val,
                },
              ],
            };
            editor.children = [newText];
            currentText = newText as any;

            // 关键：必须提供有效的非 selection Slate 操作，Plait TextManage 才会触发尺寸重算与 DrawTransforms.setText 存储！
            props.onChange?.({
              newText: newText as any,
              operations: [
                {
                  type: 'insert_text',
                  path: [0, 0],
                  offset: 0,
                  text: val,
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

          editableEl.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
              editableEl.blur();
              e.stopPropagation();
            }
            if (e.key === 'Enter' && !e.shiftKey) {
              // 单行模式下 Enter 确认
              // e.preventDefault();
              // editableEl.blur();
            }
          });
        }
      }
    };

    renderDOM();

    const ref: RenderComponentRef<TextProps> = {
      destroy: () => {
        el.innerHTML = '';
      },
      update: (newProps: TextProps) => {
        currentText = newProps.text;
        isReadonly = newProps.readonly !== false;
        renderDOM();
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
      if (currentProps.afterInit) {
        const img = document.createElement('img');
        img.src = src;
        img.onload = () => {
          currentProps.afterInit?.({
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
      update: (newProps: ImageProps) => {
        currentProps = newProps;
        renderDOM();
      },
    };

    return ref;
  };

  return newBoard;
};
