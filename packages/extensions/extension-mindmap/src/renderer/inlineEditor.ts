import { PlaitBoard } from '@plait/core';
import type { NodeLayoutBox } from '../types';

let activeEditorEl: HTMLTextAreaElement | null = null;
let activeEditorNodeId: string | null = null;

export interface InlineEditorOptions {
  board: PlaitBoard;
  box: NodeLayoutBox;
  initialText: string;
  onCommit: (newText: string) => void;
  onCancel?: () => void;
}

/**
 * 启动节点就地编辑 (覆盖在文字之上，自动全选文本)
 */
export function startInlineEditing(options: InlineEditorOptions): void {
  const { board, box, initialText, onCommit, onCancel } = options;

  closeInlineEditing();

  const boardContainer = PlaitBoard.getBoardContainer(board) || document.body;
  const isRoot = Boolean(box.element.isRoot || box.depth === 0);

  // 获取视口缩放与平移偏移
  const zoom = (board as any).viewport?.zoom || 1;
  const origX = (board as any).viewport?.origX || 0;
  const origY = (board as any).viewport?.origY || 0;

  // 将画板坐标转换为容器绝对像素
  const leftPx = (box.x + origX) * zoom;
  const topPx = (box.y + origY) * zoom;
  const widthPx = Math.max(80, box.width * zoom);
  const heightPx = Math.max(32, box.height * zoom);

  const textarea = document.createElement('textarea');
  textarea.className = 'speed-mind-inline-editor';
  textarea.value = initialText;

  Object.assign(textarea.style, {
    position: 'absolute',
    left: `${leftPx}px`,
    top: `${topPx}px`,
    minWidth: `${widthPx}px`,
    minHeight: `${heightPx}px`,
    maxWidth: '400px',
    padding: isRoot ? '4px 12px' : '3px 8px',
    fontSize: `${(isRoot ? 16 : 14) * zoom}px`,
    fontWeight: isRoot ? 'bold' : 'normal',
    color: '#1f2937',
    background: '#ffffff',
    border: '2px solid #2563eb',
    borderRadius: isRoot ? '8px' : '6px',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
    boxSizing: 'border-box',
    outline: 'none',
    resize: 'none',
    overflow: 'hidden',
    zIndex: '9999',
    textAlign: 'center',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif',
    lineHeight: '1.4',
  });

  const autoResize = () => {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(heightPx, textarea.scrollHeight)}px`;
    textarea.style.width = 'auto';
    textarea.style.width = `${Math.max(widthPx, textarea.scrollWidth + 8)}px`;
  };

  let committed = false;

  const commit = () => {
    if (committed) return;
    committed = true;
    const newText = textarea.value.trim();
    closeInlineEditing();
    onCommit(newText);
  };

  const cancel = () => {
    if (committed) return;
    committed = true;
    closeInlineEditing();
    onCancel?.();
  };

  textarea.addEventListener('input', autoResize);

  textarea.addEventListener('keydown', (e: KeyboardEvent) => {
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

  boardContainer.appendChild(textarea);
  activeEditorEl = textarea;
  activeEditorNodeId = box.id;

  // 聚焦并全选
  textarea.focus();
  textarea.select();
  autoResize();
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
