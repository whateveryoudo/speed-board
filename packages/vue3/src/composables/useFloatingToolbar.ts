import { ref, computed, watch } from 'vue';
import type { Board, FloatingToolbarProperties } from '@speed-board/core';
import { resolveBoard, type BoardSource } from './useBoardEvent';

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
    state.value = board ? board.getFloatingToolbarProperties() : defaultState;
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
