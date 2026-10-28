import type { PlaitBoard } from '@plait/core';
import { RectangleClient } from '@plait/core';
import { GeometryComponent, PlaitDrawElement, ShapeDefaultSpace } from '@plait/draw';

/**
 * 增强 GeometryComponent:
 * 支持图形内部文本垂直对齐 (top / middle / bottom)。
 * Plait 原生默认始终垂直居中，当配置 verticalAlign 时动态计算 foreignObject 的 y 坐标。
 */
export class EnhancedGeometryComponent extends GeometryComponent {
  override getRectangle(text?: any) {
    const defaultRect = super.getRectangle(text);
    const element = this.element as any;
    const vAlign = element.verticalAlign || element.text?.verticalAlign || 'middle';
    if (!vAlign || vAlign === 'middle') {
      return defaultRect;
    }
    const elementRectangle = RectangleClient.getRectangleByPoints(element.points);
    const strokeWidth = element.strokeWidth || 2;
    const padding = ShapeDefaultSpace.rectangleAndText + strokeWidth;
    if (vAlign === 'top') {
      return {
        ...defaultRect,
        y: elementRectangle.y + padding,
      };
    } else if (vAlign === 'bottom') {
      const bottomY = elementRectangle.y + elementRectangle.height - defaultRect.height - padding;
      return {
        ...defaultRect,
        y: Math.max(elementRectangle.y + padding, bottomY),
      };
    }
    return defaultRect;
  }
}

export const withDrawEnhance = (board: PlaitBoard) => {
  const { drawElement } = board;

  board.drawElement = (context) => {
    if (PlaitDrawElement.isGeometry(context.element)) {
      return EnhancedGeometryComponent;
    }
    return drawElement(context);
  };

  return board;
};
