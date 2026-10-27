import { ref } from 'vue';
import type { Board } from '@speed-board/core';
import { HistoryController } from '@speed-board/view';
import { resolveBoard, type BoardSource } from './useBoardEvent';

export function useBoardHistory(source: BoardSource) {
  const canUndo = ref(false);
  const canRedo = ref(false);

  const updateHistoryState = () => {
    const board = resolveBoard(source);
    canUndo.value = HistoryController.canUndo(board);
    canRedo.value = HistoryController.canRedo(board);
  };

  const undo = () => {
    const board = resolveBoard(source);
    if (!board) return;
    HistoryController.undo(board);
    updateHistoryState();
  };

  const redo = () => {
    const board = resolveBoard(source);
    if (!board) return;
    HistoryController.redo(board);
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
