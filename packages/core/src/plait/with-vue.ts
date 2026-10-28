import type { PlaitBoard } from '@plait/core';
import type { PlaitTextBoard, TextProps, RenderComponentRef, PlaitImageBoard, ImageProps } from '@plait/common';
import { createEditor, type Descendant } from 'slate';

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

    // 动态调整 foreignObject 尺寸与溢出表现，防止排版边界过窄引发中文字符异常折行
    const adjustForeignObject = () => {
      if (el && el.tagName?.toLowerCase() === 'foreignobject') {
        el.style.overflow = 'visible';
        const w = parseFloat(el.getAttribute('width') || '0');
        // 当初始测量宽度较小（如 28/29px）时，设置自适应冗余（至少 60px），确保多字符不被挤压
        if (w > 0 && w < 80) {
          el.setAttribute('width', `${Math.max(w + 24, 60)}`);
        }
      }
    };

    const renderDOM = () => {
      adjustForeignObject();

      const plaitId = el.closest?.('[plait-data-id]')?.getAttribute('plait-data-id');
      const element = plaitId ? (board.children as any[])?.find((c: any) => c.id === plaitId) : null;
      const isAutoSize = element ? (element.autoSize ?? element.shape === 'text') : true;

      // 提取纯文本内容
      const rawText = (currentText as any)?.children?.map((c: any) => c.text || '').join('') || '';
      const whiteSpace = isAutoSize ? 'pre' : 'pre-wrap';
      const wordBreak = isAutoSize ? 'keep-all' : 'break-word';

      const baseStyle = `outline: none; white-space: ${whiteSpace}; word-break: ${wordBreak}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif; line-height: 1.4;`;

      if (isReadonly) {
        // 只读模式：直接渲染轻量 HTML，零组件创建开销
        el.innerHTML = `<div class="plait-text-container slate-editable-container" style="${baseStyle} user-select: none;">${escapeHtml(rawText)}</div>`;
      } else {
        // 编辑模式：渲染 contenteditable 容器
        el.innerHTML = `<div class="plait-text-container slate-editable-container" contenteditable="true" style="${baseStyle} min-width: 20px; caret-color: auto;">${escapeHtml(rawText)}</div>`;
        const editableEl = el.firstElementChild as HTMLElement;
        if (editableEl) {
          editableEl.focus();
          // 移动光标到末尾
          const range = document.createRange();
          range.selectNodeContents(editableEl);
          range.collapse(false);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);

          editableEl.oninput = () => {
            const val = editableEl.innerText;
            const newText = {
              ...(currentText as any),
              children: [{ text: val }],
            };
            editor.children = [newText];

            // 输入时若文本宽度接近或超出，动态拓宽 foreignObject
            if (el && el.tagName?.toLowerCase() === 'foreignobject') {
              const currentW = parseFloat(el.getAttribute('width') || '0');
              const neededW = editableEl.scrollWidth || 0;
              if (neededW > currentW - 10) {
                el.setAttribute('width', `${neededW + 20}`);
              }
            }

            props.onChange?.({
              newText: newText as any,
              operations: [],
            });
          };

          editableEl.addEventListener('compositionstart', (e) => props.onComposition?.(e as CompositionEvent));
          editableEl.addEventListener('compositionend', (e) => props.onComposition?.(e as CompositionEvent));
        }
      }
    };

    renderDOM();

    const ref: RenderComponentRef<TextProps> = {
      destroy: () => {
        el.innerHTML = '';
      },
      update: (updatedProps: Partial<TextProps>) => {
        if (updatedProps.text) {
          currentText = updatedProps.text;
          editor.children = [currentText as any];
        }
        if (updatedProps.readonly !== undefined) {
          isReadonly = updatedProps.readonly !== false;
        }
        renderDOM();
      },
    };

    return ref;
  };

  // 2. 图片渲染适配 (纯原生 DOM，零开销)
  newBoard.renderImage = (container: Element | DocumentFragment, props: ImageProps) => {
    const el = container as HTMLElement;
    const img = document.createElement('img');
    img.src = props.imageItem?.url || '';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    img.draggable = false;
    el.appendChild(img);

    const ref: RenderComponentRef<ImageProps> = {
      destroy: () => {
        el.innerHTML = '';
      },
      update: (updatedProps: Partial<ImageProps>) => {
        if (updatedProps.imageItem?.url && img.src !== updatedProps.imageItem.url) {
          img.src = updatedProps.imageItem.url;
        }
      },
    };
    return ref;
  };

  return newBoard;
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
