export * from './types';
export * from './model/createMindmap';
export * from './model/treeOps';
export * from './layout/mindLayout';
export * from './renderer/drawLinks';
export * from './renderer/drawNode';
export * from './renderer/drawHandles';
export * from './renderer/inlineEditor';
export * from './plugin/withSpeedMind';
export * from './standalone/createMindmapBoard';

export class MindmapExtension {
  name = 'mindmap';
}
