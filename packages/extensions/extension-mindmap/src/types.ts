import type { MindmapMarkers } from '@speed-board/shared';

export interface MindTopicChild {
  text: string;
  color?: string;
  fontSize?: number;
  fontWeight?: string;
  bold?: boolean;
  italic?: boolean;
  underlined?: boolean;
  strikethrough?: boolean;
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
  isSummary?: boolean;
  summaryFor?: string[];
  [key: string]: any;
}

export type MindNodeShape = 'roundRectangle' | 'capsule' | 'rectangle' | 'underline';

export interface SpeedMindElement {
  id: string;
  type: 'mind';
  points?: [[number, number]];
  data: SpeedMindNodeData;
  children: SpeedMindElement[];
  isRoot?: boolean;
  isCollapsed?: boolean;
  rightNodeCount?: number;
  shape?: MindNodeShape;
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

export interface BranchLinkInfo {
  from: [number, number];
  to: [number, number];
  color: string;
  width: number;
  shape: 'curve' | 'polyline';
  sourceBox: NodeLayoutBox;
  targetBox: NodeLayoutBox;
}

export interface SummaryLayoutInfo {
  id: string;
  bracketPath: string;
  summaryBox: NodeLayoutBox;
  coveredBoxes: NodeLayoutBox[];
  element: SpeedMindElement;
}

export interface ComputedMindLayout {
  rootBox: NodeLayoutBox;
  nodeMap: Map<string, NodeLayoutBox>;
  links: BranchLinkInfo[];
  summaries: SummaryLayoutInfo[];
  boundingRect: { x: number; y: number; width: number; height: number };
}

export const MindPointerType = {
  mind: 'mind',
} as const;

export type MindPointerType = (typeof MindPointerType)[keyof typeof MindPointerType];
