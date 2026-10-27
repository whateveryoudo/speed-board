import type { Board } from '@speed-board/core';
import { LineController, ARROWHEAD_PRESETS } from '@speed-board/view';
import { resolveBoard, type BoardSource } from './useBoardEvent';

export function useLineOperations(source: BoardSource) {
  const getSelectedEdge = (): any | null => {
    const board = resolveBoard(source);
    return LineController.getSelectedEdge(board);
  };

  const setLineType = (type: 'elbow' | 'straight' | 'curve') => {
    const board = resolveBoard(source);
    if (!board) return;
    LineController.setLineType(board, type);
  };

  const getLineType = (): 'elbow' | 'straight' | 'curve' => {
    const board = resolveBoard(source);
    return LineController.getLineType(board);
  };

  const reverseLineDirection = () => {
    const board = resolveBoard(source);
    if (!board) return;
    LineController.reverseLineDirection(board);
  };

  const setArrowMarker = (
    position: 'source' | 'target',
    markerId: string
  ) => {
    const board = resolveBoard(source);
    if (!board) return;
    LineController.setArrowMarker(board, position, markerId);
  };

  const getLineText = (): string => {
    const board = resolveBoard(source);
    return LineController.getLineText(board);
  };

  const setLineText = (text: string) => {
    const board = resolveBoard(source);
    if (!board) return;
    LineController.setLineText(board, text);
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
