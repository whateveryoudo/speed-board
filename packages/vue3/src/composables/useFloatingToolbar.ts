import { ref, computed, watch, type Ref } from 'vue';
import type { Board } from '@speed-board/core';
import {
  FloatingToolbarController,
  type FloatingToolbarProperties,
} from '@speed-board/view';
import { resolveBoard, type BoardSource } from './useBoardEvent';

export function useFloatingToolbar(source: BoardSource) {
  const state = ref<FloatingToolbarProperties>(
    FloatingToolbarController.extractProperties(null)
  );

  const sync = () => {
    const board = resolveBoard(source);
    state.value = FloatingToolbarController.extractProperties(board);
  };

  watch(
    () => resolveBoard(source),
    (board, oldBoard) => {
      const events = ['selection:change', 'change', 'scale', 'viewport:change'];
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
    FloatingToolbarController.updateFill(board, fill);
    sync();
  };

  const updateStrokeColor = (stroke: string) => {
    const board = resolveBoard(source);
    if (!board) return;
    FloatingToolbarController.updateStrokeColor(board, stroke);
    sync();
  };

  const updateStrokeWidth = (width: number) => {
    const board = resolveBoard(source);
    if (!board) return;
    FloatingToolbarController.updateStrokeWidth(board, width);
    sync();
  };

  const updateStrokeStyle = (style: 'solid' | 'dashed') => {
    const board = resolveBoard(source);
    if (!board) return;
    FloatingToolbarController.updateStrokeStyle(board, style);
    sync();
  };

  const updateLineShape = (shape: 'elbow' | 'straight' | 'curve') => {
    const board = resolveBoard(source);
    if (!board) return;
    FloatingToolbarController.updateLineShape(board, shape);
    sync();
  };

  const toggleTargetMarker = () => {
    const board = resolveBoard(source);
    if (!board) return;
    FloatingToolbarController.toggleTargetMarker(board);
    sync();
  };

  const toggleSourceMarker = () => {
    const board = resolveBoard(source);
    if (!board) return;
    FloatingToolbarController.toggleSourceMarker(board);
    sync();
  };

  const reverseLine = () => {
    const board = resolveBoard(source);
    if (!board) return;
    FloatingToolbarController.reverseLine(board);
    sync();
  };

  const setMindmapLayout = (layout: string) => {
    const board = resolveBoard(source);
    if (!board) return;
    FloatingToolbarController.setMindmapLayout(board, layout);
    sync();
  };

  const deleteSelected = () => {
    const board = resolveBoard(source);
    if (!board) return;
    FloatingToolbarController.deleteSelected(board);
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
