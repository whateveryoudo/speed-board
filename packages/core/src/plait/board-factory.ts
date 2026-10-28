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
  type PlaitBoard,
  type PlaitBoardOptions,
  type PlaitElement,
  type PlaitPlugin,
  type Viewport,
  type PlaitTheme,
} from '@plait/core';
import { withGroup, withImage, withText } from '@plait/common';
import { withDraw } from '@plait/draw';
import { withMind, MindThemeColors } from '@plait/mind';
import { withFreehand } from './freehand/with-freehand';
import { withHitEnhance } from './with-hit-enhance';
import { withVectorEnhance } from './with-vector-enhance';
import { withGlobalEsc } from './with-global-esc';
import { withVue } from './with-vue';
import { withPinchZoom } from './with-pinch-zoom';

export interface CreatePlaitBoardOptions {
  value?: PlaitElement[];
  options?: Partial<PlaitBoardOptions>;
  plugins?: PlaitPlugin[];
  viewport?: Viewport;
  theme?: PlaitTheme;
}

export function createSpeedPlaitBoard(config: CreatePlaitBoardOptions = {}): PlaitBoard {
  const initialValue = config.value || [];
  const options: PlaitBoardOptions = {
    readonly: false,
    hideScrollbar: true,
    disabledScrollOnNonFocus: false,
    themeColors: MindThemeColors,
    ...(config.options || {}),
  };

  let board = createBoard(initialValue, options);

  // 挂载纯 TS 核心流水线
  board = withText(board);
  board = withImage(board);
  board = withVue(board);
  board = withOptions(board);
  board = withI18n(board);
  board = withBoard(board);
  board = withMoving(board);
  board = withSelection(board);
  board = withHistory(board);
  board = withHandPointer(board);
  board = withHotkey(board);
  board = withRelatedFragment(board);

  // 挂载图形与脑图核心插件
  board = withGroup(board);
  board = withDraw(board);
  board = withMind(board);
  board = withFreehand(board);
  board = withHitEnhance(board);
  board = withVectorEnhance(board);
  board = withGlobalEsc(board);

  // 自定义插件 (手势缩放等)
  board = withPinchZoom(board);

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
