import type { MindmapMarkers } from '@speed-board/shared';

export interface MindTopicChild {
  text: string;
  color?: string;
  fontSize?: number;
  fontWeight?: string;
  bold?: boolean;
  italic?: boolean;
  [key: string]: any;
}

export interface MindTopicData {
  children: MindTopicChild[];
  align?: 'left' | 'center' | 'right';
}

export interface MindMarkerItem {
  symbolId: string;
  name?: string;
  id?: string;
}

export interface SpeedMindNodeData {
  topic: MindTopicData;
  markers?: MindmapMarkers;
  emojis?: MindMarkerItem[];
  [key: string]: any;
}

export interface SpeedMindElement {
  id: string;
  type: 'mind' | 'speed-mind';
  points?: [[number, number]];
  data: SpeedMindNodeData;
  children: SpeedMindElement[];
  isRoot?: boolean;
  isCollapsed?: boolean;
  isSummary?: boolean;
  rightNodeCount?: number;
  shape?: 'roundRectangle' | 'underline' | 'rect';
  fill?: string;
  strokeColor?: string;
  strokeWidth?: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted';
  branchColor?: string;
  branchWidth?: number;
  branchShape?: 'curve' | 'polyline' | 'bight';
  layout?: string;
  width?: number;
  height?: number;
  selectedNodeId?: string;
  [key: string]: any;
}

export interface NodeLayoutBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  left: boolean;
  up: boolean;
  element: SpeedMindElement;
  parent?: NodeLayoutBox;
  children: NodeLayoutBox[];
}

export const MindPointerType = {
  mind: 'mind',
} as const;
export type MindPointerType = (typeof MindPointerType)[keyof typeof MindPointerType];
