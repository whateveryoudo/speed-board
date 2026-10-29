import { Transforms, type PlaitBoard } from '../plait';
import type { NodeStyleState } from '../types';
import { isLineNode, isMindmapNode } from './selection-info';

export function getNodeStyleState(selectedElements: any[] = []): NodeStyleState {
  const defaultState: NodeStyleState = {
    fill: '#ffffff',
    stroke: '#374151',
    strokeWidth: 2,
    strokeDasharray: 'none',
    opacity: 1,
  };

  if (selectedElements.length === 0) return defaultState;

  const cell = selectedElements[0];
  if (isLineNode(cell)) {
    return {
      fill: 'transparent',
      stroke: cell.stroke || '#374151',
      strokeWidth: cell.strokeWidth ?? 2,
      strokeDasharray: cell.strokeStyle || cell.strokeDasharray || 'none',
      opacity: cell.opacity ?? 1,
    };
  }

  if (isMindmapNode(cell)) {
    return {
      fill: cell.fill || (cell.isRoot ? '#f3f4f6' : '#ffffff'),
      stroke: cell.strokeColor || cell.branchColor || cell.stroke || '#374151',
      strokeWidth: cell.strokeWidth ?? 2,
      strokeDasharray: cell.strokeStyle || cell.strokeDasharray || 'none',
      opacity: cell.opacity ?? 1,
    };
  }

  return {
    fill: cell.fill || '#ffffff',
    stroke: cell.stroke || '#374151',
    strokeWidth: cell.strokeWidth ?? 2,
    strokeDasharray: cell.strokeStyle || cell.strokeDasharray || 'none',
    opacity: cell.opacity ?? 1,
  };
}

export function patchShapeProperty(
  board: PlaitBoard,
  selectedElements: any[],
  properties: Record<string, any>,
  getElementPath: (el: any) => any[] | null
): void {
  const props = { ...properties };
  if (props.stroke && !props.strokeColor) {
    props.strokeColor = props.stroke;
  }
  if (props.strokeColor && !props.stroke) {
    props.stroke = props.strokeColor;
  }

  selectedElements.forEach((element) => {
    const path = getElementPath(element);
    if (!path) return;

    if (isMindmapNode(element)) {
      const mindProps = { ...props };
      if (props.stroke || props.strokeColor) {
        mindProps.strokeColor = props.stroke || props.strokeColor;
        mindProps.branchColor = props.stroke || props.strokeColor;
      }
      Transforms.setNode(board, mindProps as any, path);
    } else {
      Transforms.setNode(board, props as any, path);
    }
  });
}
