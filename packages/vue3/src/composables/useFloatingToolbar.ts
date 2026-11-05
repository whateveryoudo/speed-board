import { ref, computed, watch, unref, nextTick, onScopeDispose, type Ref } from 'vue';
import { isSelectionMoving, isMovingElements, isDragging as isPlaitDragging, getSelectedElements } from '@plait/core';
import { isResizing } from '@plait/common';
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

export const measuredWidthCache: Record<string, number> = {
  shape: 260,
  text: 136,
  'mindmap-root': 380,
  'mindmap-node': 380,
  'mindmap-summary': 260,
  mindmap: 380,
  line: 260,
  image: 82,
  multiple: 136,
};

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

  const type = (board.getSelectionInfo?.()?.selectedType || 'shape') as string;
  const defaultWidth = measuredWidthCache[type] || measuredWidthCache[type.startsWith('mindmap') ? 'mindmap' : type] || 260;

  const renderedType = floatingElement?.getAttribute('data-rendered-type');
  const isTypeMatched = !renderedType || renderedType === type;

  let floatingWidth = defaultWidth;
  if (floatingElement && isTypeMatched && floatingElement.offsetWidth > 40) {
    floatingWidth = floatingElement.offsetWidth;
    measuredWidthCache[type] = floatingWidth;
  }
  const floatingHeight =
    floatingElement && floatingElement.offsetHeight > 20
      ? floatingElement.offsetHeight
      : 38;

  // 上方可用空间对比所需空间 (工具栏高度 + 偏移)
  const availableTop = rect.top - offsetTop;
  const requiredTop = floatingHeight + offset;
  const isFlipToBottom = availableTop < requiredTop;

  // 1:1 对标语雀白板：绝对 left 居中与吸边算法 (padding: 12px)
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

  const type = (board.getSelectionInfo?.()?.selectedType || 'shape') as string;
  const defaultWidth = measuredWidthCache[type] || measuredWidthCache[type.startsWith('mindmap') ? 'mindmap' : type] || 224;

  const renderedType = floatingElement?.getAttribute('data-rendered-type');
  const isTypeMatched = !renderedType || renderedType === type;

  const floatingWidth =
    floatingElement && isTypeMatched && floatingElement.offsetWidth > 40
      ? floatingElement.offsetWidth
      : defaultWidth;
  const floatingHeight =
    floatingElement && floatingElement.offsetHeight > 20
      ? floatingElement.offsetHeight
      : 38;

  const targetFloating = (floatingElement && floatingElement.offsetWidth > 40)
    ? floatingElement
    : ({
        offsetWidth: floatingWidth,
        offsetHeight: floatingHeight,
        getBoundingClientRect: () => ({
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          right: floatingWidth,
          bottom: floatingHeight,
          width: floatingWidth,
          height: floatingHeight,
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

  // 绘制中、任意非选择模式、键盘打字、或正在拖拽/调整端点时，气泡工具栏暂隐（对标打字体验）
  const isDragging =
    Boolean((board as any).isTyping) ||
    Boolean((board as any).isDragging) ||
    Boolean(board.raw && isResizing(board.raw)) ||
    Boolean(board.raw && isSelectionMoving(board.raw)) ||
    Boolean(board.raw && isMovingElements(board.raw)) ||
    Boolean(board.raw && isPlaitDragging(board.raw));

  if (board.raw.pointer !== PlaitPointerType.selection || isDragging) {
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

  if (isMind && !board.getSelectedMindNodeId?.()) {
    return defaultState;
  }
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
  const isMovingOrDraggingRef = { current: false };
  const isMeasuring = ref(false);

  let rafId: any = null;
  const requestSync = () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      rafId = null;
      sync();
    });
  };

  const sync = () => {
    const board = resolveBoard(source);
    if (!board) {
      isMeasuring.value = false;
      state.value = { ...defaultState, position: state.value.position };
      return;
    }

    if (isMovingOrDraggingRef.current) {
      if (state.value.visible) {
        state.value = { ...state.value, visible: false };
      }
      return;
    }

    const toolbarEl = unref(toolbarRefOption) || null;
    const initialProps = computeFloatingToolbarProperties(board, customOffset, toolbarEl);

    if (!initialProps.visible) {
      isMeasuring.value = false;
      state.value = {
        ...initialProps,
        position: state.value.position,
      };
      return;
    }

    const curType = initialProps.selectedType;
    const renderedType = toolbarEl?.getAttribute('data-rendered-type');
    const isDomUnmeasured =
      !state.value.visible ||
      !toolbarEl ||
      toolbarEl.offsetWidth <= 40 ||
      (renderedType && renderedType !== curType);

    // 对标语雀 rc-trigger 隐藏测量生命周期：
    // 初次展示或图元类型切换时，首帧以透明状态挂载，微任务量出真实 DOM 宽度算出最终绝对 left 再显形，彻底消除位移闪烁！
    if (isDomUnmeasured) {
      isMeasuring.value = true;
      state.value = initialProps;

      nextTick(() => {
        const el = unref(toolbarRefOption) || null;
        if (el && el.offsetWidth > 40) {
          measuredWidthCache[curType] = el.offsetWidth;
        }
        const preciseProps = computeFloatingToolbarProperties(board, customOffset, el);
        if (preciseProps.visible && !isMovingOrDraggingRef.current) {
          state.value = preciseProps;
        }
        isMeasuring.value = false;
      });
      return;
    }

    if (!isMovingOrDraggingRef.current) {
      isMeasuring.value = false;
      state.value = initialProps;
    }
  };

  // 监听浮动工具栏 DOM 尺寸变化 (对标 floating-ui autoUpdate 与 ResizeObserver，保障增减按钮时位置精准归中)
  let resizeObserver: ResizeObserver | null = null;
  watch(
    () => unref(toolbarRefOption),
    (el) => {
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      if (el && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const w = entry.borderBoxSize?.[0]?.inlineSize || entry.contentRect.width;
            if (w > 40) {
              const elType = el.getAttribute('data-rendered-type');
              const board = resolveBoard(source);
              const curType = elType || ((board?.getSelectionInfo?.()?.selectedType || 'shape') as string);
              measuredWidthCache[curType] = Math.round(w);
            }
          }
          if (state.value.visible && !isMovingOrDraggingRef.current) {
            requestSync();
          }
        });
        resizeObserver.observe(el);
      }
    },
    { immediate: true }
  );

  onScopeDispose(() => {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
  });

  let cleanHooks: (() => void) | null = null;

  watch(
    () => resolveBoard(source),
    (board, oldBoard) => {
      if (cleanHooks) {
        cleanHooks();
        cleanHooks = null;
      }

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
          oldBoard.off(ev, requestSync);
        }
      }
      if (board) {
        for (const ev of events) {
          board.on(ev, requestSync);
        }

        // 对标 Drawnix：直接接管 pointerMove / pointerUp / globalPointerUp 捕获拖拽/移动开始与释放
        const rawBoard = board.raw;
        if (rawBoard) {
          const {
            pointerMove: origPointerMove,
            pointerUp: origPointerUp,
            globalPointerUp: origGlobalPointerUp,
          } = rawBoard;

          rawBoard.pointerMove = (event: PointerEvent) => {
            const isMovingNow = () =>
              isMovingElements(rawBoard) ||
              isPlaitDragging(rawBoard) ||
              isResizing(rawBoard) ||
              isSelectionMoving(rawBoard);

            if (isMovingNow() && !isMovingOrDraggingRef.current) {
              isMovingOrDraggingRef.current = true;
              if (state.value.visible) {
                state.value = { ...state.value, visible: false };
              }
            }

            origPointerMove(event);

            if (isMovingNow() && !isMovingOrDraggingRef.current) {
              isMovingOrDraggingRef.current = true;
              if (state.value.visible) {
                state.value = { ...state.value, visible: false };
              }
            }
          };

          const handlePointerEnd = () => {
            const wasMoving = isMovingOrDraggingRef.current;
            isMovingOrDraggingRef.current = false;
            if (wasMoving || getSelectedElements(rawBoard).length > 0) {
              requestSync();
            }
          };

          rawBoard.pointerUp = (event: PointerEvent) => {
            origPointerUp(event);
            handlePointerEnd();
          };

          rawBoard.globalPointerUp = (event: PointerEvent) => {
            origGlobalPointerUp(event);
            handlePointerEnd();
          };

          cleanHooks = () => {
            rawBoard.pointerMove = origPointerMove;
            rawBoard.pointerUp = origPointerUp;
            rawBoard.globalPointerUp = origGlobalPointerUp;
          };
        }
      }
      requestSync();
    },
    { immediate: true }
  );

  const toolbarStyle = computed(() => {
    return {
      position: 'absolute' as const,
      left: `${state.value.position.left}px`,
      top: `${state.value.position.top}px`,
      zIndex: 1000,
      opacity: isMeasuring.value ? 0 : 1,
      pointerEvents: isMeasuring.value ? ('none' as const) : ('auto' as const),
      transition: isMeasuring.value ? 'none' : 'opacity 0.12s ease',
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
    isMeasuring,
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
