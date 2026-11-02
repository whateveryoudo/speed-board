import type { PlaitBoard, PlaitPlugin } from '@plait/core';
import { withDraw } from '@plait/draw';
import { withDrawEnhance } from './with-draw-enhance';
import { withVectorEnhance } from './with-vector-enhance';
import { withHitEnhance } from './with-hit-enhance';
import { withMindConnectEnhance } from './with-mind-connect-enhance';
import { withFreehand } from './freehand/with-freehand';
import { registerBoardDraw } from './registerBoardDraw';

/**
 * 白板全套绘图套件核心插件 (包含几何图形、流程图图元、闭合矢量多边形、手绘画笔、脑图连线磁吸)
 */
export const withDrawKit: PlaitPlugin = (board: PlaitBoard) => {
  registerBoardDraw();
  board = withDraw(board);
  board = withDrawEnhance(board);
  board = withFreehand(board);
  board = withHitEnhance(board);
  board = withVectorEnhance(board);
  board = withMindConnectEnhance(board);
  return board;
};
