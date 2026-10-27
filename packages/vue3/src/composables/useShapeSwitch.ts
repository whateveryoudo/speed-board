import type { ShapeDefinition } from '@speed-board/shared';
import { ShapeController } from '@speed-board/view';
import { resolveBoard, type BoardSource } from './useBoardEvent';

export function useShapeSwitch(source: BoardSource) {
  const switchShape = (targetShape: ShapeDefinition | string) => {
    const board = resolveBoard(source);
    ShapeController.switchShape(board, targetShape);
  };

  return {
    basicShapes: ShapeController.basicShapes,
    switchShape,
  };
}
