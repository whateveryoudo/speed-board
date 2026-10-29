import type { PlaitBoard } from '@plait/core';
import { RectangleClient } from '@plait/core';
import { TextGenerator, ShapeDefaultSpace, PlaitDrawElement } from '@plait/draw';

let isPatched = false;

/**
 * 增强 TextGenerator:
 * 支持图形内部文本垂直对齐 (top / middle / bottom)。
 * Plait 原生默认始终垂直居中，当配置 verticalAlign 时动态计算 foreignObject 的 y 坐标。
 * 纯文本框 (shape === 'text') 默认顶对齐 (与语雀、飞书一致)。
 */
export const patchTextGeneratorVerticalAlign = () => {
  if (isPatched) return;
  isPatched = true;

  const originalGetRectangle = TextGenerator.prototype.getRectangle;
  TextGenerator.prototype.getRectangle = function (text: any) {
    const defaultRect = originalGetRectangle.call(this, text);
    const element = this.element as any;
    if (!element || !element.points || element.points.length < 2) {
      return defaultRect;
    }
    // 对于自适应宽高的独立纯文本，高度紧贴文字，无需垂直偏置
    if (element.autoSize) {
      return defaultRect;
    }

    const isPureText = PlaitDrawElement.isText(element) || element.shape === 'text';
    const defaultAlign = isPureText ? 'top' : 'middle';
    const vAlign = element.verticalAlign || element.text?.verticalAlign || defaultAlign;
    if (!vAlign || vAlign === 'middle') {
      return defaultRect;
    }

    const elementRectangle = RectangleClient.getRectangleByPoints(element.points);
    // 如果图形高度和文本高度相当，无需偏置
    if (elementRectangle.height <= defaultRect.height + 4) {
      return defaultRect;
    }

    const strokeWidth = element.strokeWidth || 0;
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
  };
};

// 立即在模块加载时执行补丁
patchTextGeneratorVerticalAlign();

export const withDrawEnhance = (board: PlaitBoard) => {
  patchTextGeneratorVerticalAlign();
  return board;
};
