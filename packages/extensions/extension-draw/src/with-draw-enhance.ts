import { PlaitBoard, RectangleClient, getSelectedElements } from '@plait/core';
import { TextGenerator, ShapeDefaultSpace, PlaitDrawElement, editText } from '@plait/draw';
import { isVirtualKey, isDelete } from '@plait/common';

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

    // 跟随属性：图形或文本均以 verticalAlign 为准，默认垂直居中 (middle)
    const vAlign =
      element.verticalAlign ||
      element.text?.verticalAlign ||
      (text as any)?.verticalAlign ||
      'middle';
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

  const { keyDown } = board;
  board.keyDown = (event: KeyboardEvent) => {
    const selectedElements = getSelectedElements(board);
    // 选中输入清空并重新输入：当单个图形被选中且用户直接键入字符时，清空原文本并启动编辑
    if (
      !PlaitBoard.isReadonly(board) &&
      selectedElements.length === 1 &&
      !isVirtualKey(event) &&
      !isDelete(event) &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      event.key.length === 1
    ) {
      const targetElement = selectedElements[0] as any;
      if (PlaitDrawElement.isGeometry(targetElement)) {
        event.preventDefault();
        (board as any)._pendingInputChar = event.key;
        editText(board, targetElement);
        return;
      }
    }
    keyDown(event);
  };

  return board;
};
