import type { Board } from '@speed-board/core';

export class HistoryController {
  public static canUndo(board: Board | null): boolean {
    if (!board) return false;
    return typeof board.canUndo === 'function' ? board.canUndo() : true;
  }

  public static canRedo(board: Board | null): boolean {
    if (!board) return false;
    return typeof board.canRedo === 'function' ? board.canRedo() : false;
  }

  public static undo(board: Board) {
    board.undo();
  }

  public static redo(board: Board) {
    board.redo();
  }
}
