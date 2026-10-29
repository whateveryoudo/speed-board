import { type PlaitBoard, type PlaitPlugin } from '@plait/core';
import { withMind } from '@plait/mind';
import { withMindEnhance } from './with-mind-enhance';
import './registerBoardMindmap';

export const withSpeedMind = <T extends PlaitBoard = PlaitBoard>(board: T): T => {
  let newBoard = withMind(board);
  newBoard = withMindEnhance(newBoard);
  return newBoard as unknown as T;
};

export const withMindKit = withSpeedMind;
