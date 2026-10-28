import type { Board } from '@speed-board/core';
import { ARROWHEAD_PRESETS } from '@speed-board/shared';
import { resolveBoard, type BoardSource } from './useBoardEvent';

export function useLineOperations(source: BoardSource) {
  const getSelectedEdge = (): any | null => {
    const board = resolveBoard(source);
    return board ? board.getSelectedEdge() : null;
  };

  const setLineType = (type: 'elbow' | 'straight' | 'curve') => {
    const board = resolveBoard(source);
    if (!board) return;
    board.setLineType(type);
  };

  const getLineType = (): 'elbow' | 'straight' | 'curve' => {
    const board = resolveBoard(source);
    return board ? board.getLineType() : 'straight';
  };

  const reverseLineDirection = () => {
    const board = resolveBoard(source);
    if (!board) return;
    board.reverseLineDirection();
  };

  const setArrowMarker = (
    position: 'source' | 'target',
    markerId: string
  ) => {
    const board = resolveBoard(source);
    if (!board) return;
    board.setArrowMarker(position, markerId);
  };

  const getLineText = (): string => {
    const board = resolveBoard(source);
    return board ? board.getLineText() : '';
  };

  const setLineText = (text: string) => {
    const board = resolveBoard(source);
    if (!board) return;
    board.setLineText(text);
  };

  return {
    arrowheadPresets: ARROWHEAD_PRESETS,
    getSelectedEdge,
    setLineType,
    getLineType,
    reverseLineDirection,
    setArrowMarker,
    getLineText,
    setLineText,
  };
}
