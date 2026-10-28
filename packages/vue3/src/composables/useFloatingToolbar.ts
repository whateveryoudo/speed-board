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

export function computeFloatingToolbarPosition(board: Board): FloatingToolbarPosition | null {
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

    return {
      left: screenStart[0] - offsetLeft + width / 2,
      top: screenStart[1] - offsetTop - 12,
      width,
      height,
    };
  } catch {
    return null;
  }
}

export function computeFloatingToolbarProperties(board: Board | null): FloatingToolbarProperties {
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

  // 绘制中、任意非选择模式、或正在编辑/输入文本时，气泡工具栏不显示
  if (board.raw.pointer !== PlaitPointerType.selection || PlaitBoard.hasBeenTextEditing(board.raw)) {
    return defaultState;
  }

  const selectionInfo = board.getSelectionInfo();
  if (selectionInfo.selectedCount === 0 || !selectionInfo.selectedCell) {
    return defaultState;
  }

  const pos = computeFloatingToolbarPosition(board);
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

export function useFloatingToolbar(source: BoardSource) {
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
    state.value = computeFloatingToolbarProperties(board);
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
    return {
      position: 'absolute' as const,
      left: `${state.value.position.left}px`,
      top: `${state.value.position.top}px`,
      transform: 'translate(-50%, -100%)',
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
    toolbarStyle,
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
