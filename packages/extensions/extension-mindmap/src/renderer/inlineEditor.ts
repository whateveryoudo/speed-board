import { PlaitBoard, toHostPoint } from '@plait/core';
import { renderSlateSpansHtml } from '@speed-board/core';
import type { NodeLayoutBox, SpeedMindElement } from '../types';
import { getNodeTopicText, setNodeTopicText } from '../model/treeOps';

export function openMindmapInlineEditor(
  board: PlaitBoard,
  box: NodeLayoutBox,
  rootElement: SpeedMindElement,
  onSave?: (newText: string) => void
): void {
  const host = PlaitBoard.getBoardContainer(board) as HTMLElement;
  if (!host) return;

  // 避免重复打开
  const existing = host.querySelector('.speed-mindmap-inline-editor');
  if (existing) {
    (existing as HTMLElement).blur();
  }

  const elem = box.element;
  const isRoot = Boolean(elem.isRoot || box.id === rootElement.id);
  const currentText = getNodeTopicText(elem);

  // 计算屏幕位置
  // box.x, box.y 是画布坐标 (ViewBox)，转为宿主容器 DOM 像素坐标
  const [hostX, hostY] = toHostPoint(board, box.x, box.y);
  const zoom = (board as any).zoom || 1;
  const domWidth = Math.max(box.width * zoom, 80);
  const domHeight = Math.max(box.height * zoom, 32);

  const editor = document.createElement('div');
  editor.className = 'speed-mindmap-inline-editor';
  editor.contentEditable = 'true';
  editor.spellcheck = false;

  const bg = isRoot ? '#2563eb' : '#ffffff';
  const color = isRoot ? '#ffffff' : '#1f2937';
  const fontSize = (isRoot ? 15 : 13) * zoom;
  const fontWeight = isRoot ? '600' : 'normal';
  const align = elem.data?.topic?.align || (isRoot ? 'center' : 'left');

  editor.style.cssText = `
    position: absolute;
    left: ${hostX}px;
    top: ${hostY}px;
    min-width: ${domWidth}px;
    min-height: ${domHeight}px;
    padding: 2px 8px;
    box-sizing: border-box;
    background: ${bg};
    color: ${color};
    font-size: ${fontSize}px;
    font-weight: ${fontWeight};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    border: 2px solid #3b82f6;
    border-radius: ${isRoot ? 6 : 4}px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    outline: none;
    z-index: 1000;
    text-align: ${align};
    line-height: ${domHeight}px;
    display: flex;
    align-items: center;
    justify-content: ${align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start'};
    white-space: pre-wrap;
    word-break: break-word;
  `;

  const children = elem.data?.topic?.children;
  if (Array.isArray(children) && children.length > 1) {
    editor.innerHTML = renderSlateSpansHtml(children, {
      zoom,
      defaultFontSize: isRoot ? 16 : 14,
      defaultColor: color,
    });
  } else {
    editor.innerText = currentText;
  }
  host.appendChild(editor);

  let isComposing = false;
  let isSaved = false;

  const finishEdit = () => {
    if (isSaved) return;
    isSaved = true;
    (board as any).isTyping = false;

    const newText = editor.innerText.trim();
    if (newText !== currentText) {
      setNodeTopicText(elem, newText);
      onSave?.(newText);
    }

    editor.remove();
  };

  editor.addEventListener('compositionstart', () => {
    isComposing = true;
    (board as any).isTyping = true;
  });

  editor.addEventListener('compositionend', () => {
    isComposing = false;
  });

  editor.addEventListener('input', () => {
    (board as any).isTyping = true;
  });

  editor.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      e.stopPropagation();
      finishEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      isSaved = true;
      (board as any).isTyping = false;
      editor.remove();
    }
  });

  editor.addEventListener('blur', () => {
    finishEdit();
  });

  // 选中全部文本，聚焦
  setTimeout(() => {
    editor.focus();
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, 10);
}
