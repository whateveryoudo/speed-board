import type { SpeedMindElement } from '../types';

export function generateNodeId(prefix = 'mind'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createEmptyMindmap(
  topic = '思维导图',
  options?: Partial<SpeedMindElement>
): SpeedMindElement {
  const rootId = options?.id || generateNodeId('mind-root');
  return {
    id: rootId,
    type: 'mind',
    points: options?.points || [[0, 0]],
    isRoot: true,
    shape: options?.shape || 'roundRectangle',
    fill: options?.fill || '#2563eb',
    strokeColor: options?.strokeColor || '#2563eb',
    strokeWidth: options?.strokeWidth || 2,
    branchColor: options?.branchColor || '#2563eb',
    branchWidth: options?.branchWidth || 2,
    branchShape: options?.branchShape || 'curve',
    layout: options?.layout || 'standard',
    rightNodeCount: options?.rightNodeCount ?? 0,
    data: {
      topic: {
        children: [{ text: topic, color: '#ffffff', fontSize: 16, fontWeight: '500' }],
        align: 'center',
      },
      ...options?.data,
    },
    children: options?.children || [],
    ...options,
  };
}

export function createChildMindNode(
  topic = '分支主题',
  options?: Partial<SpeedMindElement>
): SpeedMindElement {
  const nodeId = options?.id || generateNodeId('mind-node');
  return {
    id: nodeId,
    type: 'mind',
    shape: options?.shape || 'underline',
    fill: options?.fill || 'transparent',
    strokeColor: options?.strokeColor || '#374151',
    strokeWidth: options?.strokeWidth || 2,
    branchColor: options?.branchColor || '#2563eb',
    branchWidth: options?.branchWidth || 2,
    branchShape: options?.branchShape || 'curve',
    data: {
      topic: {
        children: [{ text: topic, color: '#1f2937', fontSize: 14 }],
        align: 'left',
      },
      ...options?.data,
    },
    children: options?.children || [],
    ...options,
  };
}
