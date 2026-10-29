export * from './types';
export * from './model/createMindmap';
export * from './model/treeOps';
export * from './layout/mindLayout';
export * from './renderer/drawLinks';
export * from './renderer/drawNode';
export * from './renderer/drawHandles';
export * from './renderer/inlineEditor';
export * from './component/SpeedMindComponent';
export * from './withSpeedMind';
export * from './registerBoardMindmap';

export { MindLayoutType, AbstractNode } from '@plait/layouts';

// 兼容性导出对象与枚举
export const MindElement = {
  isMindElement(_board: any, element: any): boolean {
    return Boolean(
      element && (element.type === 'mind' || element.type === 'mindmap' || element.isRoot)
    );
  },
};

export const PlaitMind = {
  isMind(element: any): boolean {
    return Boolean(
      element && (element.type === 'mind' || element.type === 'mindmap' || element.isRoot)
    );
  },
};

export const MindElementShape = {
  roundRectangle: 'roundRectangle',
  underline: 'underline',
} as const;

export const BranchShape = {
  curve: 'curve',
  polyline: 'polyline',
  bight: 'curve',
} as const;

export const isSpeedMind = (element: any): boolean => {
  return Boolean(element && (element.type === 'mind' || element.type === 'mindmap'));
};
