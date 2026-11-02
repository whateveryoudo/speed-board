import { ref, watch } from 'vue';
import type { Board } from '@speed-board/core';
import { resolveBoard, useBoardEvent, type BoardSource } from './useBoardEvent';

export function useBoardHistory(source: BoardSource) {
  const canUndo = ref(false);
  const canRedo = ref(false);

  const updateHistoryState = () => {
    const board = resolveBoard(source);
    if (!board) {
      canUndo.value = false;
      canRedo.value = false;
      return;
    }
    const hasUndo = typeof board.canUndo === 'function'
      ? board.canUndo()
      : ((board as any).raw?.history?.undos?.length || 0) > 0;
    const hasRedo = typeof board.canRedo === 'function'
      ? board.canRedo()
      : ((board as any).raw?.history?.redos?.length || 0) > 0;

    canUndo.value = Boolean(hasUndo);
    canRedo.value = Boolean(hasRedo);
  };

  useBoardEvent(source, ['change', 'history:change', 'history:undo', 'history:redo'], updateHistoryState);

  watch(
    () => resolveBoard(source),
    () => {
      updateHistoryState();
    },
    { immediate: true }
  );

  const undo = () => {
    const board = resolveBoard(source);
    if (!board) return;
    board.undo();
    updateHistoryState();
  };

  const redo = () => {
    const board = resolveBoard(source);
    if (!board) return;
    board.redo();
    updateHistoryState();
  };

  return {
    canUndo,
    canRedo,
    undo,
    redo,
    updateHistoryState,
  };
}
