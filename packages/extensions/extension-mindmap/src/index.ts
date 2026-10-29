export * from './withSpeedMind';
export * from './with-mind-enhance';
export * from './registerBoardMindmap';

// 导出常用的 @plait/mind 图元、类型与变换能力
export {
  MindElement,
  PlaitMind,
  MindNode,
  MindTransforms,
  createEmptyMind,
  createMindElement,
  BranchShape,
  MindElementShape,
  MindPointerType,
  MindQueries,
  editTopic,
  canSetAbstract,
  withMind,
} from '@plait/mind';

export { MindLayoutType, AbstractNode } from '@plait/layouts';

// 兼容别名导出
export type SpeedMindElement = import('@plait/mind').PlaitMind;
export const isSpeedMind = (element: any): boolean => {
  return element?.type === 'mind' || element?.type === 'mindmap';
};

export function createEmptyMindmap(
  topic = '中心主题',
  options: { points?: [number, number][]; fill?: string; strokeColor?: string } = {}
) {
  const pts = options.points || [[400, 300]];
  return {
    id: `mind-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    type: 'mind',
    points: pts,
    isRoot: true,
    shape: 'roundRectangle' as any,
    fill: options.fill || '#2563eb',
    strokeColor: options.strokeColor || '#2563eb',
    strokeWidth: 2,
    data: {
      topic: {
        children: [{ text: topic, color: '#ffffff', fontSize: 16, fontWeight: '500' }],
        align: 'center',
      },
    },
    children: [],
  };
}
