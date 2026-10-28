import type { PlaitBoard, PlaitPlugin } from '@plait/core';
import { withDraw } from '@plait/draw';
import { withDrawEnhance } from './with-draw-enhance';
import { withVectorEnhance } from './with-vector-enhance';
import { withHitEnhance } from './with-hit-enhance';
import { withFreehand } from './freehand/with-freehand';

/**
 * 白板全套绘图套件核心插件 (包含几何图形、流程图图元、闭合矢量多边形、手绘画笔)
 */
export const withDrawKit: PlaitPlugin = (board: PlaitBoard) => {
  board = withDraw(board);
  board = withDrawEnhance(board);
  board = withFreehand(board);
  board = withHitEnhance(board);
  board = withVectorEnhance(board);
  return board;
};
