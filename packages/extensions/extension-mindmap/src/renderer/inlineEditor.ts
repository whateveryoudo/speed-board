import {
  PlaitBoard,
  toHostPointFromViewBoxPoint,
  toScreenPointFromHostPoint,
} from '@plait/core';
import type { NodeLayoutBox } from '../types';
import { calculateMindmapNodeWidth } from '@speed-board/shared';

let activeEditorEl: HTMLInputElement | null = null;
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
 * 启动节点就地编辑 (精确贴合卡片尺寸，纯粹单层边框，绝无双层框或畸变)
 */
export function startInlineEditing(options: InlineEditorOptions): void {
  const { board, box, initialText, onCommit, onCancel } = options;

  closeInlineEditing();

  const boardContainer = PlaitBoard.getBoardContainer(board) || document.body;
  const isRoot = Boolean(box.element.isRoot || box.depth === 0);

  const nodeEl = boardContainer.querySelector(`.speed-mind-node-g[data-node-id="${box.id}"]`);

  // 1. 使用 Plait 官方数学函数计算精准的屏幕像素位置，杜绝 drop-shadow、手柄或外层容器的干扰
  let screenX = 0;
  let screenY = 0;
  let initialWidthPx = Math.max(40, box.width);
  let initialHeightPx = Math.max(24, box.height);

  try {
    const pt1 = toScreenPointFromHostPoint(
      board,
      toHostPointFromViewBoxPoint(board, [box.x, box.y])
    );
    const pt2 = toScreenPointFromHostPoint(
      board,
      toHostPointFromViewBoxPoint(board, [box.x + box.width, box.y + box.height])
    );
    screenX = pt1[0];
    screenY = pt1[1];
    initialWidthPx = Math.max(30, pt2[0] - pt1[0]);
    initialHeightPx = Math.max(20, pt2[1] - pt1[1]);
  } catch {
    const bodyRectEl = nodeEl?.querySelector('.speed-mind-node-body') as SVGGraphicsElement | null;
    const rect = bodyRectEl ? bodyRectEl.getBoundingClientRect() : nodeEl?.getBoundingClientRect();
    if (rect) {
      screenX = rect.left;
      screenY = rect.top;
      initialWidthPx = rect.width;
      initialHeightPx = rect.height;
    }
  }

  const zoom = initialWidthPx / (box.width || 1);

  const markersCount =
    box.element.data?.markers && typeof box.element.data.markers === 'object'
      ? Object.keys(box.element.data.markers).length
      : 0;

  // 2. 隐藏底层 SVG 静态文本，防止重影与穿透
  const textWrap = nodeEl?.querySelector('.mindmap-node-text-wrap') as HTMLElement | null;
  if (textWrap) {
    textWrap.style.visibility = 'hidden';
  } else {
    const fo = nodeEl?.querySelector('foreignObject');
    if (fo) {
      (fo as SVGElement).style.visibility = 'hidden';
    }
  }

  // 3. 创建单行 Input 编辑器 (完全透明无多余边框阴影，依托卡片本体展示边框)
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'speed-mind-inline-editor';
  input.value = initialText;

  const paddingX = Math.round((isRoot ? 14 : 10) * zoom);

  Object.assign(input.style, {
    position: 'fixed',
    left: `${screenX}px`,
    top: `${screenY}px`,
    width: `${initialWidthPx}px`,
    height: `${initialHeightPx}px`,
    lineHeight: `${initialHeightPx}px`,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    boxShadow: 'none',
    margin: '0',
    padding: `0 ${paddingX}px`,
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    fontSize: `${Math.round((isRoot ? 16 : 14) * zoom)}px`,
    fontWeight: isRoot ? 'bold' : 'normal',
    color: '#1f2937',
    caretColor: '#2563eb',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif',
    zIndex: '99999',
    userSelect: 'text',
  });

  const updateWidth = () => {
    const val = input.value || '';
    const calcW = calculateMindmapNodeWidth(
      val || (isRoot ? '思维导图' : '分支主题'),
      isRoot,
      markersCount
    );
    const targetW = Math.max(box.width, calcW);
    const targetWPx = targetW * zoom;
    const centerX = screenX + initialWidthPx / 2;
    const newLeft = centerX - targetWPx / 2;

    input.style.left = `${newLeft}px`;
    input.style.width = `${targetWPx}px`;

    // 动态同步更新底层 SVG bodyRect 宽度，输入时所见即所得
    if (nodeEl) {
      const bodyRect = nodeEl.querySelector('.speed-mind-node-body');
      if (bodyRect) {
        bodyRect.setAttribute('x', String(box.x - (targetW - box.width) / 2));
        bodyRect.setAttribute('width', String(targetW));
      }
    }
  };

  let committed = false;

  const commit = () => {
    if (committed) return;
    committed = true;
    const val = input.value.trim();
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

  // 阻止冒泡，避免画板拦截输入事件
  input.addEventListener('pointerdown', (e) => e.stopPropagation());
  input.addEventListener('mousedown', (e) => e.stopPropagation());
  input.addEventListener('click', (e) => e.stopPropagation());
  input.addEventListener('dblclick', (e) => e.stopPropagation());

  let isComposing = false;
  input.addEventListener('compositionstart', () => {
    isComposing = true;
  });
  input.addEventListener('compositionend', () => {
    isComposing = false;
    updateWidth();
  });

  input.addEventListener('input', () => {
    if (!isComposing) {
      updateWidth();
    }
  });

  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.isComposing || isComposing) {
      return;
    }
    if (e.key === 'Enter') {
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

  input.addEventListener('blur', () => {
    commit();
  });

  document.body.appendChild(input);
  activeEditorEl = input;
  activeEditorNodeId = box.id;

  // 立即聚焦并全选内容 (免去延时，保证输入法与输入响应零延迟)
  input.focus();
  input.select();
}

/**
 * 关闭当前就地编辑器
 */
export function closeInlineEditing(): void {
  if (activeEditorEl) {
    activeEditorEl.remove();
    activeEditorEl = null;
  }
  if (activeEditorNodeId) {
    // 恢复被隐藏的 SVG 静态文本
    const prevNodeEl = document.querySelector(
      `.speed-mind-node-g[data-node-id="${activeEditorNodeId}"]`
    );
    const textWrap = prevNodeEl?.querySelector('.mindmap-node-text-wrap') as HTMLElement | null;
    if (textWrap) {
      textWrap.style.visibility = 'visible';
    } else {
      const fo = prevNodeEl?.querySelector('foreignObject');
      if (fo) {
        (fo as SVGElement).style.visibility = 'visible';
      }
    }
    activeEditorNodeId = null;
  }
}

export function isInlineEditingActive(): boolean {
  return activeEditorEl !== null;
}

export function getActiveEditingNodeId(): string | null {
  return activeEditorNodeId;
}
