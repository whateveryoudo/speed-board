export type SelectedElementType =
  | 'none'
  | 'shape'
  | 'text'
  | 'image'
  | 'vector'
  | 'line'
  | 'mindmap'
  | 'mindmap-root'
  | 'mindmap-node'
  | 'mindmap-summary'
  | 'multiple';

export interface FloatingToolbarPosition {
  left: number;
  top: number;
  width?: number;
  height?: number;
  placement?: 'top' | 'bottom';
}

export interface FloatingToolbarProperties {
  visible: boolean;
  position: FloatingToolbarPosition;
  selectedType: SelectedElementType;
  hasFill: boolean;
  hasStroke: boolean;
  isLine: boolean;
  isMind: boolean;
  currentFill: string;
  currentStrokeColor: string;
  currentStrokeWidth: number;
  currentStrokeStyle: 'solid' | 'dashed';
  currentLineShape: 'elbow' | 'straight' | 'curve';
  sourceMarker: string;
  targetMarker: string;
}

export interface NodeStyleState {
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeDasharray: string;
  opacity: number;
}

export interface NodeTextState {
  text: string;
  link: string;
  fontSize: number;
  fill: string;
  bold: boolean;
  italic: boolean;
  strike: boolean;
  underline: boolean;
  align: 'left' | 'center' | 'right' | 'justify';
  verticalAlign: 'top' | 'middle' | 'bottom';
}

export interface SelectionInfo {
  selectedCells: any[];
  selectedCount: number;
  selectedCell: any | null;
  selectedType: SelectedElementType;
  selectedShapeId: string;
}
