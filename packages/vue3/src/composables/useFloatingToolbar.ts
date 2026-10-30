import { ref, computed, watch, unref, type Ref } from 'vue';
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
import {
  computePosition,
  offset as floatingOffset,
  flip as floatingFlip,
  shift as floatingShift,
  type VirtualElement,
} from '@floating-ui/dom';
import { resolveBoard, type BoardSource } from './useBoardEvent';

export interface UseFloatingToolbarOptions {
  board?: BoardSource;
  offset?: number;
  containerRef?: any;
  toolbarRef?: Ref<HTMLElement | null> | HTMLElement | null;
}

/**
 * 将 Plait 选中图元的视口屏幕矩形构造为 @floating-ui/dom 标准的 VirtualElement
 */
export function createSelectionVirtualElement(board: Board): VirtualElement | null {
  if (!board.raw) return null;
  const selected = board.selectedElements;
  if (!selected || selected.length === 0) return null;

  return {
    getBoundingClientRect() {
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

        if (!rect) {
          return { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 };
        }

        const [start, end] = RectangleClient.getPoints(rect);
        const screenStart = toScreenPointFromHostPoint(
          board.raw,
          toHostPointFromViewBoxPoint(board.raw, start)
        );
        const screenEnd = toScreenPointFromHostPoint(
          board.raw,
          toHostPointFromViewBoxPoint(board.raw, end)
        );
        const width = Math.max(0, screenEnd[0] - screenStart[0]);
        const height = Math.max(0, screenEnd[1] - screenStart[1]);

        return {
          x: screenStart[0],
          y: screenStart[1],
          top: screenStart[1],
          left: screenStart[0],
          bottom: screenEnd[1],
          right: screenEnd[0],
          width,
          height,
        };
      } catch {
        return { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 };
      }
    },
  };
}

/**
 * 快速同步计算浮动位置（带边界平移与高度自适应，对标 floating-ui 规则）
 */
export function computeFloatingToolbarPosition(
  board: Board,
  offset = 28,
  floatingElement?: HTMLElement | null
): FloatingToolbarPosition | null {
  if (!board.raw) return null;
  const virtualElement = createSelectionVirtualElement(board);
  if (!virtualElement) return null;

  const rect = virtualElement.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0 && rect.top === 0 && rect.left === 0) {
    return null;
  }

  const boardContainer = PlaitBoard.getBoardContainer(board.raw);
  const containerEl = (boardContainer?.closest('.speed-board') || boardContainer) as HTMLElement | null;
  const containerRect = containerEl?.getBoundingClientRect();

  const offsetLeft = containerRect ? containerRect.left : 0;
  const offsetTop = containerRect ? containerRect.top : 0;

  const floatingWidth = floatingElement?.offsetWidth || 360;
  const floatingHeight = floatingElement?.offsetHeight || 40;

  // 上方可用空间对比所需空间 (工具栏高度 + 偏移)
  const availableTop = rect.top - offsetTop;
  const requiredTop = floatingHeight + offset;
  const isFlipToBottom = availableTop < requiredTop;

  // 水平居中并吸边防截断 (shift padding: 12)
  const containerWidth = containerRect ? containerRect.width : window.innerWidth;
  const idealLeft = rect.left - offsetLeft + (rect.width - floatingWidth) / 2;
  const clampedLeft = Math.max(12, Math.min(idealLeft, containerWidth - floatingWidth - 12));

  const idealTop = isFlipToBottom
    ? rect.bottom - offsetTop + offset
    : rect.top - offsetTop - floatingHeight - offset;

  return {
    left: Math.round(clampedLeft),
    top: Math.round(idealTop),
    width: rect.width,
    height: rect.height,
    placement: isFlipToBottom ? 'bottom' : 'top',
  };
}

/**
 * 基于 @floating-ui/dom 的精准异步计算 (使用 computePosition 工业级中间件)
 */
export async function computeFloatingToolbarPositionAsync(
  board: Board,
  offset = 28,
  floatingElement?: HTMLElement | null
): Promise<FloatingToolbarPosition | null> {
  if (!board.raw) return null;
  const virtualElement = createSelectionVirtualElement(board);
  if (!virtualElement) return null;

  const rect = virtualElement.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0 && rect.top === 0 && rect.left === 0) {
    return null;
  }

  const boardContainer = PlaitBoard.getBoardContainer(board.raw);
  const containerEl = (boardContainer?.closest('.speed-board') || boardContainer) as HTMLElement | null;
  const containerRect = containerEl?.getBoundingClientRect();

  const offsetLeft = containerRect ? containerRect.left : 0;
  const offsetTop = containerRect ? containerRect.top : 0;
  const boundary = containerEl || undefined;

  const targetFloating = floatingElement || ({
    offsetWidth: 360,
    offsetHeight: 40,
    getBoundingClientRect: () => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 360,
      bottom: 40,
      width: 360,
      height: 40,
    }),
  } as any);

  try {
    const { x, y, placement } = await computePosition(virtualElement, targetFloating, {
      placement: 'top',
      strategy: 'absolute',
      middleware: [
        floatingOffset(offset),
        floatingFlip({
          boundary,
          fallbackPlacements: ['bottom', 'top'],
        }),
        floatingShift({
          boundary,
          padding: 12,
        }),
      ],
    });

    return {
      left: Math.round(x - offsetLeft),
      top: Math.round(y - offsetTop),
      width: rect.width,
      height: rect.height,
      placement: placement.startsWith('bottom') ? 'bottom' : 'top',
    };
  } catch {
    return computeFloatingToolbarPosition(board, offset, floatingElement);
  }
}

export function computeFloatingToolbarProperties(
  board: Board | null,
  offset = 28,
  floatingElement?: HTMLElement | null
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

  const pos = computeFloatingToolbarPosition(board, offset, floatingElement);
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
  options?: { offset?: number; toolbarRef?: Ref<HTMLElement | null> | HTMLElement | null }
) {
  let source: BoardSource;
  let customOffset = 28;
  let toolbarRefOption: any = null;

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
    if (opts.toolbarRef !== undefined) toolbarRefOption = opts.toolbarRef;
  } else {
    source = sourceOrOptions as BoardSource;
    if (options?.offset !== undefined) customOffset = options.offset;
    if (options?.toolbarRef !== undefined) toolbarRefOption = options.toolbarRef;
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

  const sync = async () => {
    const board = resolveBoard(source);
    if (!board) {
      state.value = defaultState;
      return;
    }

    const toolbarEl = unref(toolbarRefOption) || null;
    const initialProps = computeFloatingToolbarProperties(board, customOffset, toolbarEl);
    state.value = initialProps;

    if (toolbarEl && initialProps.visible) {
      const accuratePos = await computeFloatingToolbarPositionAsync(board, customOffset, toolbarEl);
      if (accuratePos && state.value.visible) {
        state.value.position = accuratePos;
      }
    }
  };

  watch(
    () => resolveBoard(source),
    (board, oldBoard) => {
      const events = [
        'selection:change',
        'change',
        'scale',
        'viewport:change',
        'viewport:scroll',
        'pointer:change',
        'text:editing',
      ];
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
