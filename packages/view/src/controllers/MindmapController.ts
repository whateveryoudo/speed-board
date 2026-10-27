import type { Board } from '@speed-board/core';

export class MindmapController {
  public static setLayout(board: Board, layout: string) {
    board.setMindmapLayout(layout);
  }

  public static setShape(board: Board, shape: string) {
    board.setMindmapShape(shape);
  }

  public static toggleMarker(board: Board, markerType: string, markerId: string) {
    board.toggleMindmapMarker(markerType, markerId);
  }
}
