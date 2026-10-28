import {
  createBoard,
  withBoard,
  withHandPointer,
  withHistory,
  withHotkey,
  withMoving,
  withOptions,
  withRelatedFragment,
  withSelection,
  type PlaitBoard,
  type PlaitBoardOptions,
  type PlaitElement,
} from '@plait/core';
import type { SpeedMindElement } from '../types';
import { createEmptyMindmap } from '../model/createMindmap';
import { withSpeedMind } from '../plugin/withSpeedMind';

export interface CreateMindmapBoardOptions {
  data?: SpeedMindElement;
  readonly?: boolean;
  options?: Partial<PlaitBoardOptions>;
}

/**
 * 创建纯净的独立思维导图画布实例（0 白板绘图依赖、0 流程图图元、极轻量）
 */
export function createMindmapBoard(config: CreateMindmapBoardOptions = {}): PlaitBoard {
  const initialMind = config.data || createEmptyMindmap('中心主题', {
    points: [[400, 300]],
  });

  const initialValue: PlaitElement[] = [initialMind];

  const boardOptions: PlaitBoardOptions = {
    readonly: config.readonly ?? false,
    hideScrollbar: true,
    disabledScrollOnNonFocus: false,
    ...(config.options || {}),
  };

  let board = createBoard(initialValue, boardOptions);

  board = withOptions(board);
  board = withBoard(board);
  board = withMoving(board);
  board = withSelection(board);
  board = withHistory(board);
  board = withHandPointer(board);
  board = withHotkey(board);
  board = withRelatedFragment(board);

  // 挂载自研思维导图核心插件
  board = withSpeedMind(board);

  return board;
}
