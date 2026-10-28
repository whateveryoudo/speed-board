import {
  SHAPE_GROUPS,
  type ShapeDefinition,
} from '@speed-board/shared';
import { resolveBoard, type BoardSource } from './useBoardEvent';

const SUPPORTED_BASIC_SHAPE_IDS = new Set([
  'rect',
  'rounded-rect',
  'circle',
  'triangle',
  'diamond',
  'parallelogram',
  'trapezoid',
  'cross',
  'comment',
  'comment-2',
  'polygon',
  'star',
  'arrow-1',
  'arrow-2',
  'arrow-3',
  'pentagon-arrow',
  'process-arrow',
  'hexagon',
  'octagon',
  'cloud',
]);

export const BASIC_SHAPES: ShapeDefinition[] = (
  SHAPE_GROUPS.find((g) => g.key === 'basic')?.shapes || []
).filter((s) => SUPPORTED_BASIC_SHAPE_IDS.has(s.id));

export function useShapeSwitch(source: BoardSource) {
  const switchShape = (targetShape: ShapeDefinition | string) => {
    const board = resolveBoard(source);
    if (!board) return;
    board.switchShape(targetShape);
  };

  return {
    basicShapes: BASIC_SHAPES,
    switchShape,
  };
}
