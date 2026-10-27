import type { Board } from '@speed-board/core';
import { MindmapController } from '@speed-board/view';
import { resolveBoard, type BoardSource } from './useBoardEvent';

export function useMindmap(source: BoardSource) {
  const setLayout = (layout: string) => {
    const board = resolveBoard(source);
    if (!board) return;
    MindmapController.setLayout(board, layout);
  };

  const setShape = (shape: string) => {
    const board = resolveBoard(source);
    if (!board) return;
    MindmapController.setShape(board, shape);
  };

  const toggleMarker = (markerType: string, markerId: string) => {
    const board = resolveBoard(source);
    if (!board) return;
    MindmapController.toggleMarker(board, markerType, markerId);
  };

  return {
    setLayout,
    setShape,
    toggleMarker,
  };
}
