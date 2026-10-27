import type { Board } from '@speed-board/core';
import {
  SHAPE_GROUPS,
  getShapeById,
  renderShapeCanvasSvg,
  getShapeTightViewBox,
  type ShapeDefinition,
} from '@speed-board/shared';

export const BASIC_SHAPES: ShapeDefinition[] = (
  SHAPE_GROUPS.find((g) => g.key === 'basic')?.shapes || []
).slice(0, 20);

export class ShapeController {
  public static readonly basicShapes = BASIC_SHAPES;

  public static switchShape(
    board: Board | null,
    targetShape: ShapeDefinition | string
  ) {
    if (!board) return;

    const shapeDef =
      typeof targetShape === 'string' ? getShapeById(targetShape) : targetShape;
    if (!shapeDef) return;

    const selectedCells = board.selectedElements || [];
    for (const cell of selectedCells) {
      if ((board as any).isShapeNode && !(board as any).isShapeNode(cell)) continue;

      const oldData = (cell as any).getData ? (cell as any).getData() : (cell as any).data || cell;
      const fill = oldData.fill || '#ffffff';
      const stroke = oldData.stroke || '#374151';
      const strokeWidth = oldData.strokeWidth ?? 2;
      const strokeDasharray = oldData.strokeDasharray || 'none';
      const opacity = oldData.opacity ?? 1;

      const svgContent = renderShapeCanvasSvg(shapeDef, {
        fill,
        stroke,
        strokeWidth,
        strokeDasharray,
      });
      const tightViewBox = getShapeTightViewBox(svgContent, shapeDef.id);

      if ((board as any).updateShapeNode) {
        (board as any).updateShapeNode(cell as any, {
          shapeId: shapeDef.id,
          shapeName: shapeDef.name,
          fill,
          stroke,
          strokeWidth,
          strokeDasharray,
          opacity,
          svgContent,
          viewBox: tightViewBox,
          tightViewBox,
        });
      } else {
        board.setShapeProperty({
          shape: shapeDef.id,
          fill,
          stroke,
          strokeWidth,
          strokeDasharray,
          opacity,
        });
      }

      board.emit('selection:change', {
        selected: board.selectedElements,
      });
    }
  }
}
