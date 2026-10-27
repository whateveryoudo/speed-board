import type { PlaitBoard, PlaitElement, Point } from '@plait/core';
import { PlaitDrawElement } from '@plait/draw';

/**
 * 修复 Plait 底层点击选择两个严重 Bug:
 * 1. 底层 isEmptyTextElement 在文本编辑器尚未挂载到 WeakMap 时直接访问 editor.children[0]，
 *    抛出 "Cannot read properties of undefined (reading 'children')" 异常，导致 isHit 崩溃失败。
 * 2. 底层在 isStrict=true 时，对未填充颜色且未输入文本的闭合几何形状直接 return false，
 *    导致用户必须极度精准地点在 4~5px 的边框线上才能选中，点在图形内部空白区域无法选中。
 *
 * 本插件安全捕获底层崩溃，并在底层返回 false 时，通过 board.isInsidePoint 补全几何轮廓内部判定，
 * 彻底解决“图形必须点边框才能选中，点内部选不中”的底层缺陷。
 */
export const withHitEnhance = (board: PlaitBoard) => {
  const { isHit } = board;

  board.isHit = (element: PlaitElement, point: Point, isStrict?: boolean) => {
    // 1. 尝试走底层默认判定 (命中边框、文本、已有填充等)
    try {
      if (isHit(element, point, isStrict)) {
        return true;
      }
    } catch {
      // 捕获底层 isEmptyTextElement 在 editor 尚未挂载时的 NPE
    }

    // 2. 若底层未命中，检查点是否落在闭合几何图形轮廓内部
    if (PlaitDrawElement.isGeometry(element)) {
      if (typeof (board as any).isInsidePoint === 'function') {
        try {
          const inside = (board as any).isInsidePoint(element, point);
          if (inside) {
            return true;
          }
        } catch {
          // 容错兜底
        }
      }
    }

    return false;
  };

  return board;
};
