import type { SpeedMindElement, MindNodeShape } from '../types';

export const DEFAULT_BRANCH_COLORS = [
  '#8b5cf6', // 优雅紫 (默认主色)
  '#3b82f6', // 经典蓝
  '#06b6d4', // 科技青
  '#10b981', // 清新绿
  '#f59e0b', // 活力橙
  '#ec4899', // 玫瑰粉
  '#6366f1', // 靛蓝
];

export function getBranchColorByIndex(index: number): string {
  return DEFAULT_BRANCH_COLORS[index % DEFAULT_BRANCH_COLORS.length];
}

export function createEmptyMindmap(
  topic = '中心主题',
  options: {
    points?: [[number, number]];
    fill?: string;
    strokeColor?: string;
    layout?: string;
    branchShape?: 'curve' | 'polyline';
  } = {}
): SpeedMindElement {
  const pts = options.points || [[400, 300]];
  const rootFill = options.fill || '#f3f4f6';
  const rootStroke = options.strokeColor || '#e5e7eb';

  return {
    id: `mind-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    type: 'mind',
    points: pts,
    isRoot: true,
    shape: 'roundRectangle',
    fill: rootFill,
    strokeColor: rootStroke,
    strokeWidth: 1.5,
    branchColor: '#8b5cf6',
    branchShape: options.branchShape || 'curve',
    layout: options.layout || 'right', // 默认向右分布，对标经典体验
    data: {
      topic: {
        children: [
          {
            text: topic,
            color: '#1f2937',
            fontSize: 16,
            fontWeight: 'bold',
          },
        ],
        align: 'center',
      },
    },
    children: [],
  };
}

export function createChildNode(
  topic = '分支主题',
  options: {
    branchColor?: string;
    shape?: MindNodeShape;
    branchShape?: 'curve' | 'polyline' | 'bight';
    isSummary?: boolean;
    summaryFor?: string[];
  } = {}
): SpeedMindElement {
  const color = options.branchColor || '#8b5cf6';
  const shape = options.shape || 'roundRectangle';

  return {
    id: `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    type: 'mind',
    shape,
    fill: '#ffffff',
    strokeColor: color,
    strokeWidth: 1.5,
    branchColor: color,
    branchWidth: 2,
    branchShape: (options.branchShape === 'polyline' ? 'polyline' : 'curve'),
    data: {
      topic: {
        children: [
          {
            text: topic,
            color: '#1f2937',
            fontSize: 14,
          },
        ],
        align: 'center',
      },
      isSummary: options.isSummary,
      summaryFor: options.summaryFor,
    },
    children: [],
  };
}
