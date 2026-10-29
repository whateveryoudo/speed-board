import type { Board } from '@speed-board/core';
import { resolveBoard, type BoardSource } from './useBoardEvent';

export function useMindmap(source: BoardSource) {
  const setLayout = (layout: string) => {
    const board = resolveBoard(source);
    if (!board) return;
    board.setMindmapLayout(layout);
  };

  const setShape = (shape: string) => {
    const board = resolveBoard(source);
    if (!board) return;
    board.setMindmapShape(shape);
  };

  const toggleMarker = (markerType: string, markerId: string) => {
    const board = resolveBoard(source);
    if (!board) return;
    (board as any).toggleMindmapMarker?.(markerType, markerId);
  };

  return {
    setLayout,
    setShape,
    toggleMarker,
  };
}
