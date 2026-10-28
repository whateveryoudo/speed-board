export * from './with-vue';
export * from './with-pinch-zoom';
export * from './board-factory';
export * from './freehand/type';
export * from './freehand/with-freehand';
export * from './with-vector-enhance';
export * from './with-global-esc';

export * as PlaitCore from '@plait/core';
export * as PlaitCommon from '@plait/common';
export * as PlaitDraw from '@plait/draw';
export * as PlaitMind from '@plait/mind';
export * as PlaitLayouts from '@plait/layouts';

// 导出高频常用方法与类型
export {
  PlaitBoard,
  Transforms,
  type PlaitBoardOptions,
  type PlaitTheme,
  type PlaitElement,
  type PlaitPlugin,
  type Viewport,
  type Selection as PlaitSelection,
  PlaitPointerType,
  BoardTransforms,
  BOARD_TO_ROUGH_SVG,
  BOARD_TO_HOST,
  BOARD_TO_ELEMENT_HOST,
  BOARD_TO_CONTEXT,
  BOARD_TO_ON_CHANGE,
  BOARD_TO_AFTER_CHANGE,
  IS_BOARD_ALIVE,
  KEY_TO_ELEMENT_MAP,
  PlaitBoardContext,
  ListRender,
  initializeViewBox,
  initializeViewportContainer,
  initializeViewportOffset,
  updateViewBox,
  updateViewportOffset,
  getSelectedElements,
  toHostPoint,
  toViewBoxPoint,
  toHostPointFromViewBoxPoint,
  toScreenPointFromHostPoint,
  getRectangleByElements,
  BOARD_TO_MOVING_POINT,
  BOARD_TO_MOVING_POINT_IN_BOARD,
  hasInputOrTextareaTarget,
  WritableClipboardOperationType,
  setFragment,
  deleteFragment,
  isFromScrolling,
  setIsFromScrolling,
  ZOOM_STEP,
  updateViewportByScrolling,
  isFromViewportChange,
  setIsFromViewportChange,
  RectangleClient,
  CoreTransforms,
  addSelectedElement,
  clearSelectedElement,
  NODE_TO_INDEX,
  NODE_TO_PARENT,
} from '@plait/core';

export {
  BasicShapes,
  FlowchartSymbols,
  ArrowLineShape,
  DrawTransforms,
  createTextElement,
  createDefaultGeometry,
  createArrowLineElement,
  getDefaultGeometryPoints,
  insertElement,
  getGeometryPointers,
  getBasicPointers,
  getArrowLinePointers,
  VectorLinePointerType,
  VectorLineShape,
  type PlaitVectorLine,
  getVectorLinePointers,
  isClosedPoints,
  isClosedDrawElement,
} from '@plait/draw';

export {
  MindTransforms,
  MindElement,
  BranchShape,
  MindElementShape,
  MindThemeColors,
  MindPointerType,
  createEmptyMind,
  editTopic,
  canSetAbstract,
} from '@plait/mind';

export {
  MindLayoutType,
  AbstractNode,
} from '@plait/layouts';

export {
  BoardCreationMode,
  setCreationMode,
  getCreationMode,
  PlaitCommonElementRef,
  AlignTransform,
} from '@plait/common';
