import { ref, computed, watch } from 'vue';
import {
  type Board,
  type FloatingToolbarProperties,
  type FloatingToolbarPosition,
  PlaitPointerType,
  PlaitBoard,
  RectangleClient,
  getRectangleByElements,
  toHostPointFromViewBoxPoint,
  toScreenPointFromHostPoint,
} from '@speed-board/core';
import { resolveBoard, type BoardSource } from './useBoardEvent';

export interface UseFloatingToolbarOptions {
  board?: BoardSource;
  offset?: number;
  containerRef?: any;
}

export function computeFloatingToolbarPosition(
  board: Board,
  offset = 28
): FloatingToolbarPosition | null {
  if (!board.raw) return null;
  const selected = board.selectedElements;
  if (!selected || selected.length === 0) return null;

  try {
    let rect: any = null;
    try {
      rect = getRectangleByElements(board.raw, selected, false);
    } catch {
      rect = null;
    }

    if (!rect) {
      const first = selected[0] as any;
      if (first && first.points && first.points.length > 0) {
        rect = RectangleClient.getRectangleByPoints(
          first.points.length === 1 ? [first.points[0], first.points[0]] : first.points
        );
      }
    }

    if (!rect) return null;

    const [start, end] = RectangleClient.getPoints(rect);
    const screenStart = toScreenPointFromHostPoint(
      board.raw,
      toHostPointFromViewBoxPoint(board.raw, start)
    );
    const screenEnd = toScreenPointFromHostPoint(
      board.raw,
      toHostPointFromViewBoxPoint(board.raw, end)
    );
    const width = screenEnd[0] - screenStart[0];
    const height = screenEnd[1] - screenStart[1];

    // 获取定位参考容器（SpeedBoard 或 BoardContainer）的绝对屏幕偏移
    const boardContainer = PlaitBoard.getBoardContainer(board.raw);
    const containerEl = (boardContainer?.closest('.speed-board') || boardContainer) as HTMLElement | null;
    const containerRect = containerEl?.getBoundingClientRect();

    const offsetLeft = containerRect ? containerRect.left : 0;
    const offsetTop = containerRect ? containerRect.top : 0;

    // 当顶部空间不足 (例如元素极度靠顶，顶部距离画板容器小于 48px) 时，自适应翻转到元素下方，避免被顶栏遮挡
    const rawTop = screenStart[1] - offsetTop;
    const isFlipToBottom = rawTop - offset < 48;
    const top = isFlipToBottom
      ? screenEnd[1] - offsetTop + offset
      : rawTop - offset;

    return {
      left: screenStart[0] - offsetLeft + width / 2,
      top,
      width,
      height,
      placement: isFlipToBottom ? 'bottom' : 'top',
    };
  } catch {
    return null;
  }
}

export function computeFloatingToolbarProperties(
  board: Board | null,
  offset = 28
): FloatingToolbarProperties {
  const defaultState: FloatingToolbarProperties = {
    visible: false,
    position: { left: 0, top: 0 },
    selectedType: 'none',
    hasFill: false,
    hasStroke: false,
    isLine: false,
    isMind: false,
    currentFill: '#ffffff',
    currentStrokeColor: '#374151',
    currentStrokeWidth: 2,
    currentStrokeStyle: 'solid',
    currentLineShape: 'elbow',
    sourceMarker: 'none',
    targetMarker: 'none',
  };

  if (!board) return defaultState;

  // 绘制中、任意非选择模式、或正在键盘打字输入中时，气泡工具栏暂隐
  if (board.raw.pointer !== PlaitPointerType.selection || (board as any).isTyping) {
    return defaultState;
  }

  const selectionInfo = board.getSelectionInfo();
  if (selectionInfo.selectedCount === 0 || !selectionInfo.selectedCell) {
    return defaultState;
  }

  const pos = computeFloatingToolbarPosition(board, offset);
  if (!pos) return defaultState;

  const cell = selectionInfo.selectedCell;
  const isArrowLine =
    (selectionInfo.selectedType === 'line' || board.isLineNode(cell)) &&
    cell.type !== 'vector-line' &&
    cell.type !== 'freehand';
  const isMind =
    selectionInfo.selectedType.startsWith('mindmap') ||
    board.isMindmapNode(cell) ||
    Boolean(cell.data?.topic);
  const isImage = selectionInfo.selectedType === 'image';

  const hasFill = !isArrowLine && !isImage;
  const hasStroke = !isImage;
  const isLine = isArrowLine;

  return {
    visible: true,
    position: pos,
    selectedType: selectionInfo.selectedType,
    hasFill,
    hasStroke,
    isLine,
    isMind,
    currentFill: cell.fill || 'transparent',
    currentStrokeColor: cell.strokeColor || cell.stroke || '#374151',
    currentStrokeWidth: cell.strokeWidth ?? 2,
    currentStrokeStyle: cell.strokeStyle || 'solid',
    currentLineShape: cell.shape || 'elbow',
    sourceMarker: cell.sourceMarker || 'none',
    targetMarker: cell.targetMarker || 'none',
  };
}

export function useFloatingToolbar(
  sourceOrOptions: BoardSource | UseFloatingToolbarOptions,
  options?: { offset?: number }
) {
  let source: BoardSource;
  let customOffset = 28;

  if (
    sourceOrOptions &&
    typeof sourceOrOptions === 'object' &&
    'board' in sourceOrOptions &&
    !('raw' in sourceOrOptions) &&
    !('value' in sourceOrOptions)
  ) {
    const opts = sourceOrOptions as UseFloatingToolbarOptions;
    source = opts.board as BoardSource;
    if (opts.offset !== undefined) customOffset = opts.offset;
  } else {
    source = sourceOrOptions as BoardSource;
    if (options?.offset !== undefined) customOffset = options.offset;
  }

  const defaultState: FloatingToolbarProperties = {
    visible: false,
    position: { left: 0, top: 0 },
    selectedType: 'none',
    hasFill: false,
    hasStroke: false,
    isLine: false,
    isMind: false,
    currentFill: '#ffffff',
    currentStrokeColor: '#374151',
    currentStrokeWidth: 2,
    currentStrokeStyle: 'solid',
    currentLineShape: 'elbow',
    sourceMarker: 'none',
    targetMarker: 'none',
  };

  const state = ref<FloatingToolbarProperties>(defaultState);

  const sync = () => {
    const board = resolveBoard(source);
    state.value = computeFloatingToolbarProperties(board, customOffset);
  };

  watch(
    () => resolveBoard(source),
    (board, oldBoard) => {
      const events = ['selection:change', 'change', 'scale', 'viewport:change', 'pointer:change', 'text:editing'];
      if (oldBoard) {
        for (const ev of events) {
          oldBoard.off(ev, sync);
        }
      }
      if (board) {
        for (const ev of events) {
          board.on(ev, sync);
        }
      }
      sync();
    },
    { immediate: true }
  );

  const toolbarStyle = computed(() => {
    const isBottom = state.value.position.placement === 'bottom';
    return {
      position: 'absolute' as const,
      left: `${state.value.position.left}px`,
      top: `${state.value.position.top}px`,
      transform: isBottom ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
      zIndex: 1000,
    };
  });

  // Action methods
  const updateFill = (fill: string) => {
    const board = resolveBoard(source);
    if (!board) return;
    board.setShapeProperty({ fill });
    sync();
  };

  const updateStrokeColor = (stroke: string) => {
    const board = resolveBoard(source);
    if (!board) return;
    board.setShapeProperty({ stroke });
    sync();
  };

  const updateStrokeWidth = (width: number) => {
    const board = resolveBoard(source);
    if (!board) return;
    board.setShapeProperty({ strokeWidth: width });
    sync();
  };

  const updateStrokeStyle = (style: 'solid' | 'dashed') => {
    const board = resolveBoard(source);
    if (!board) return;
    board.setShapeProperty({ strokeStyle: style });
    sync();
  };

  const updateLineShape = (shape: 'elbow' | 'straight' | 'curve') => {
    const board = resolveBoard(source);
    if (!board) return;
    board.setLineType(shape);
    sync();
  };

  const toggleTargetMarker = () => {
    const board = resolveBoard(source);
    if (!board) return;
    board.toggleTargetMarker();
    sync();
  };

  const toggleSourceMarker = () => {
    const board = resolveBoard(source);
    if (!board) return;
    board.toggleSourceMarker();
    sync();
  };

  const reverseLine = () => {
    const board = resolveBoard(source);
    if (!board) return;
    board.reverseLineDirection();
    sync();
  };

  const setMindmapLayout = (layout: string) => {
    const board = resolveBoard(source);
    if (!board) return;
    board.setMindmapLayout(layout);
    sync();
  };

  const deleteSelected = () => {
    const board = resolveBoard(source);
    if (!board) return;
    board.deleteSelected();
    sync();
  };

  return {
    state,
    visible: computed(() => state.value.visible),
    toolbarStyle,
    floatingStyle: toolbarStyle,
    sync,
    updateFill,
    updateStrokeColor,
    updateStrokeWidth,
    updateStrokeStyle,
    updateLineShape,
    toggleTargetMarker,
    toggleSourceMarker,
    reverseLine,
    setMindmapLayout,
    deleteSelected,
  };
}
