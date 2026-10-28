import {
  SHAPE_GROUPS,
  type ShapeDefinition,
} from '@speed-board/shared';
import { resolveBoard, type BoardSource } from './useBoardEvent';

export const BASIC_SHAPES: ShapeDefinition[] = (
  SHAPE_GROUPS.find((g) => g.key === 'basic')?.shapes || []
).slice(0, 20);

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
