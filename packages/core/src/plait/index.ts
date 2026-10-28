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
export * as PlaitLayouts from '@plait/layouts';
export * as PlaitMind from '@speed-board/extension-mindmap';

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
  removeSelectedElement,
  NODE_TO_INDEX,
  NODE_TO_PARENT,
  type Point,
  getBoardRectangle,
  getViewBox,
  getViewBoxCenterPoint,
  drawRoundRectangle,
  drawRectangle,
  drawCircle,
  drawLine,
  createG,
  createRect,
  createText,
  createPath,
  degreesToRadians,
  radiansToDegrees,
  rotatePoints,
} from '@plait/core';

export {
  BasicShapes,
  FlowchartSymbols,
  BasicShapes as GeometryShapes,
  PlaitDrawElement,
  createDefaultGeometry,
  ArrowLineShape,
  createArrowLineElement,
  VectorLinePointerType,
  isClosedPoints,
  createTextElement,
  DrawTransforms,
  getDefaultGeometryPoints,
  insertElement,
} from '@plait/draw';

export {
  withSpeedMind,
  isSpeedMind,
  createEmptyMindmap,
  createChildMindNode,
  addChildNode,
  addSiblingNode,
  deleteNode,
  toggleCollapse,
  getMindLayout,
  clearMindLayoutCache,
  type SpeedMindElement,
} from '@speed-board/extension-mindmap';

export const MindPointerType = {
  mind: 'mind',
} as const;

export const MindElementShape = {
  roundRectangle: 'roundRectangle',
  underline: 'underline',
  rect: 'rect',
} as const;

export const BranchShape = {
  curve: 'curve',
  bight: 'bight',
  polyline: 'polyline',
} as const;

export const MindElement = {
  isMindElement: (_board: any, element: any) => {
    return Boolean(element && (element.type === 'mind' || element.type === 'speed-mind' || element.isRoot));
  },
};

export const MindTransforms = {
  setLayout: (board: any, layout: any) => {
    const { getSelectedElements, Transforms, PlaitBoard } = require('@plait/core');
    const { isSpeedMind, clearMindLayoutCache } = require('@speed-board/extension-mindmap');
    const selected = getSelectedElements(board).find(isSpeedMind);
    if (selected) {
      selected.layout = layout;
      clearMindLayoutCache(selected);
      try {
        const path = PlaitBoard.findPath(board, selected);
        Transforms.setNode(board, { layout }, path);
      } catch {}
    }
  },
  setBranchShape: (board: any, shape: any) => {
    const { getSelectedElements, Transforms, PlaitBoard } = require('@plait/core');
    const { isSpeedMind, clearMindLayoutCache } = require('@speed-board/extension-mindmap');
    const selected = getSelectedElements(board).find(isSpeedMind);
    if (selected) {
      selected.branchShape = shape;
      clearMindLayoutCache(selected);
      try {
        const path = PlaitBoard.findPath(board, selected);
        Transforms.setNode(board, { branchShape: shape }, path);
      } catch {}
    }
  },
  setShape: (board: any, shape: any) => {
    const { getSelectedElements, Transforms, PlaitBoard } = require('@plait/core');
    const { isSpeedMind, clearMindLayoutCache } = require('@speed-board/extension-mindmap');
    const selected = getSelectedElements(board).find(isSpeedMind);
    if (selected) {
      selected.shape = shape;
      clearMindLayoutCache(selected);
      try {
        const path = PlaitBoard.findPath(board, selected);
        Transforms.setNode(board, { shape }, path);
      } catch {}
    }
  },
  insertAbstract: (_board: any, _elements: any[]) => {},
};

export const createEmptyMind = (_board: any, center: [number, number]) => {
  return createEmptyMindmap('思维导图', {
    points: [[center[0] - 55, center[1] - 21]],
  });
};

export const editTopic = (_element: any) => {};

export const canSetAbstract = () => false;

export const AbstractNode = {
  isAbstract: (node: any) => Boolean(node?.isSummary),
};

export {
  MindLayoutType,
} from '@plait/layouts';

export {
  BoardCreationMode,
  setCreationMode,
  getCreationMode,
  PlaitCommonElementRef,
  AlignTransform,
} from '@plait/common';
