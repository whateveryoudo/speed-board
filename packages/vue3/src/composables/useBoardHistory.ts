import { ref } from 'vue';
import type { Board } from '@speed-board/core';
import { resolveBoard, type BoardSource } from './useBoardEvent';

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
    canUndo.value = typeof board.canUndo === 'function' ? board.canUndo() : true;
    canRedo.value = typeof board.canRedo === 'function' ? board.canRedo() : false;
  };

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
