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
  withI18n,
  DefaultThemeColor,
  type PlaitBoard,
  type PlaitBoardOptions,
  type PlaitElement,
  type PlaitPlugin,
  type Viewport,
  type PlaitTheme,
} from '@plait/core';
import { withGroup, withImage, withText } from '@plait/common';
import { withGlobalEsc } from './with-global-esc';
import { withPinchZoom } from './with-pinch-zoom';

export interface CreatePlaitBoardOptions {
  value?: PlaitElement[];
  options?: Partial<PlaitBoardOptions>;
  plugins?: PlaitPlugin[];
  viewport?: Viewport;
  theme?: PlaitTheme;
}

/**
 * 创建纯净的 SpeedBoard 底座实例 (只包含画布视口、历史记录、选区、文本/图片公共基础)
 * 所有业务功能 (流程图、手绘、思维导图) 100% 走 plugins 插件注入！
 */
export function createSpeedPlaitBoard(config: CreatePlaitBoardOptions = {}): PlaitBoard {
  const initialValue = config.value || [];
  const options: PlaitBoardOptions = {
    readonly: false,
    hideScrollbar: true,
    disabledScrollOnNonFocus: false,
    themeColors: DefaultThemeColor as any,
    ...(config.options || {}),
  };

  let board = createBoard(initialValue, options);

  // 挂载纯 TS 中立核心流水线 (文本/图片/选区/历史/视口缩放)
  board = withText(board);
  board = withImage(board);
  board = withOptions(board);
  board = withI18n(board);
  board = withBoard(board);
  board = withMoving(board);
  board = withSelection(board);
  board = withHistory(board);
  board = withHandPointer(board);
  board = withHotkey(board);
  board = withRelatedFragment(board);
  board = withGroup(board);
  board = withGlobalEsc(board);
  board = withPinchZoom(board);

  // 纯插件注入：按需挂载外部业务扩展 (Draw / Mindmap 等)
  if (config.plugins) {
    config.plugins.forEach((plugin) => {
      board = plugin(board);
    });
  }

  if (config.viewport) {
    board.viewport = config.viewport;
  }
  if (config.theme) {
    board.theme = config.theme;
  }

  return board;
}
