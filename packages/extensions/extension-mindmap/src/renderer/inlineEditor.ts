import { PlaitBoard } from '@plait/core';
import type { NodeLayoutBox } from '../types';

let activeEditorEl: HTMLTextAreaElement | null = null;
let activeEditorNodeId: string | null = null;

export interface InlineEditorOptions {
  board: PlaitBoard;
  box: NodeLayoutBox;
  initialText: string;
  firstChar?: string;
  onCommit: (newText: string) => void;
  onCancel?: () => void;
}

/**
 * 启动节点就地编辑 (精确覆盖在节点卡片之上，自动全选文本)
 */
export function startInlineEditing(options: InlineEditorOptions): void {
  const { board, box, initialText, firstChar, onCommit, onCancel } = options;

  closeInlineEditing();

  const boardContainer = PlaitBoard.getBoardContainer(board) || document.body;
  const isRoot = Boolean(box.element.isRoot || box.depth === 0);

  // 关键：通过 DOM 真实矩形计算屏幕像素位置，使用 position: fixed 精确覆盖卡片位置，完全不受容器嵌套与滚动干扰！
  const nodeEl = boardContainer.querySelector(`[data-node-id="${box.id}"]`);

  let leftPx = 100;
  let topPx = 100;
  let widthPx = Math.max(80, box.width);
  let heightPx = Math.max(32, box.height);

  if (nodeEl) {
    const rect = nodeEl.getBoundingClientRect();
    leftPx = rect.left;
    topPx = rect.top;
    widthPx = Math.max(70, rect.width);
    heightPx = Math.max(30, rect.height);
  }

  const textarea = document.createElement('textarea');
  textarea.className = 'speed-mind-inline-editor';
  textarea.value = typeof firstChar === 'string' ? firstChar : initialText;

  Object.assign(textarea.style, {
    position: 'fixed',
    left: `${leftPx}px`,
    top: `${topPx}px`,
    width: `${widthPx}px`,
    height: `${heightPx}px`,
    minWidth: '60px',
    maxWidth: '500px',
    padding: isRoot ? '4px 10px' : '3px 8px',
    fontSize: isRoot ? '16px' : '14px',
    fontWeight: isRoot ? 'bold' : 'normal',
    color: '#1f2937',
    background: '#ffffff',
    border: '2px solid #3b82f6',
    borderRadius: isRoot ? '8px' : '6px',
    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.25)',
    boxSizing: 'border-box',
    outline: 'none',
    resize: 'none',
    overflow: 'hidden',
    zIndex: '99999',
    textAlign: 'center',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif',
    lineHeight: '1.4',
  });

  const autoResize = () => {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(heightPx, textarea.scrollHeight)}px`;
    textarea.style.width = 'auto';
    textarea.style.width = `${Math.max(widthPx, textarea.scrollWidth + 12)}px`;
  };

  let committed = false;

  const commit = () => {
    if (committed) return;
    committed = true;
    const val = textarea.value.trim();
    // 关键：若输入为空，保留原文字或默认文字，绝不变成无字空框！
    const newText = val || initialText || (isRoot ? '思维导图' : '分支主题');
    closeInlineEditing();
    onCommit(newText);
  };

  const cancel = () => {
    if (committed) return;
    committed = true;
    closeInlineEditing();
    onCancel?.();
  };

  // 阻止冒泡，避免画板拦截输入框内的鼠标拖拽与点击事件
  textarea.addEventListener('pointerdown', (e) => e.stopPropagation());
  textarea.addEventListener('mousedown', (e) => e.stopPropagation());
  textarea.addEventListener('click', (e) => e.stopPropagation());
  textarea.addEventListener('dblclick', (e) => e.stopPropagation());

  let isComposing = false;
  textarea.addEventListener('compositionstart', () => {
    isComposing = true;
  });
  textarea.addEventListener('compositionend', () => {
    isComposing = false;
    autoResize();
  });

  textarea.addEventListener('input', autoResize);

  textarea.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.isComposing || isComposing) {
      return;
    }
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift + Enter 换行
        setTimeout(autoResize, 0);
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      commit();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      cancel();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      commit();
      return;
    }
  });

  textarea.addEventListener('blur', () => {
    commit();
  });

  document.body.appendChild(textarea);
  activeEditorEl = textarea;
  activeEditorNodeId = box.id;

  // 聚焦并全选内容
  setTimeout(() => {
    textarea.focus();
    if (typeof firstChar === 'string') {
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    } else {
      textarea.select();
    }
    autoResize();
  }, 10);
}

/**
 * 关闭当前就地编辑器
 */
export function closeInlineEditing(): void {
  if (activeEditorEl) {
    activeEditorEl.remove();
    activeEditorEl = null;
    activeEditorNodeId = null;
  }
}

export function isInlineEditingActive(): boolean {
  return activeEditorEl !== null;
}

export function getActiveEditingNodeId(): string | null {
  return activeEditorNodeId;
}
