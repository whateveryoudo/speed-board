import {
  type Board,
  getRectangleByElements,
  toHostPointFromViewBoxPoint,
  RectangleClient,
} from '@speed-board/core';
import type { FloatingToolbarPosition, FloatingToolbarProperties } from '../types';
import { SelectionController } from './SelectionController';

export class FloatingToolbarController {
  /**
   * 计算选中图元在画布 Host 容器中的悬浮工具栏位置 (居中显示在选中元素顶部上方)
   */
  public static calculatePosition(board: Board | null): FloatingToolbarPosition | null {
    if (!board || !board.raw) return null;
    const selected = board.selectedElements;
    if (!selected || selected.length === 0) return null;

    try {
      let rect: any = null;
      try {
        rect = getRectangleByElements(board.raw, selected, false);
      } catch {
        // 部分图元尚未挂载或节点映射未完成时的安全回退
        rect = null;
      }

      if (!rect) {
        const first = selected[0] as any;
        if (first && first.points && first.points.length > 0) {
          rect = RectangleClient.getRectangleByPoints(
            first.points.length === 1
              ? [first.points[0], [first.points[0][0] + 100, first.points[0][1] + 40]]
              : first.points
          );
        }
      }

      if (!rect) return null;

      const hostTopLeft = toHostPointFromViewBoxPoint(board.raw, [rect.x, rect.y]);
      const hostBottomRight = toHostPointFromViewBoxPoint(board.raw, [
        rect.x + rect.width,
        rect.y + rect.height,
      ]);
      const width = hostBottomRight[0] - hostTopLeft[0];

      return {
        left: hostTopLeft[0] + width / 2,
        top: hostTopLeft[1] - 12,
        width,
        height: hostBottomRight[1] - hostTopLeft[1],
      };
    } catch {
      return null;
    }
  }

  /**
   * 提取当前悬浮栏所需的状态与属性
   */
  public static extractProperties(board: Board | null): FloatingToolbarProperties {
    const defaultState: FloatingToolbarProperties = {
      visible: false,
      position: { left: 0, top: 0 },
      selectedType: 'none',
      hasFill: false,
      hasStroke: false,
      isLine: false,
      isMind: false,
      currentFill: '#ffffff',
      currentStrokeColor: '#374151',
      currentStrokeWidth: 2,
      currentStrokeStyle: 'solid',
      currentLineShape: 'elbow',
      sourceMarker: 'none',
      targetMarker: 'none',
    };

    if (!board) return defaultState;

    const selectionInfo = SelectionController.analyzeSelection(board);
    if (selectionInfo.selectedCount === 0 || !selectionInfo.selectedCell) {
      return defaultState;
    }

    const pos = this.calculatePosition(board);
    if (!pos) return defaultState;

    const cell = selectionInfo.selectedCell;
    const isLine =
      selectionInfo.selectedType === 'line' ||
      board.isLineNode(cell) ||
      cell.shape === 'straight' ||
      cell.shape === 'elbow' ||
      cell.shape === 'curve';
    const isMind =
      selectionInfo.selectedType.startsWith('mindmap') ||
      board.isMindmapNode(cell) ||
      Boolean(cell.data?.topic);
    const isImage = selectionInfo.selectedType === 'image';

    const hasFill = !isLine && !isImage;
    const hasStroke = !isImage;

    return {
      visible: true,
      position: pos,
      selectedType: selectionInfo.selectedType,
      hasFill,
      hasStroke,
      isLine,
      isMind,
      currentFill: cell.fill || '#ffffff',
      currentStrokeColor: cell.stroke || '#374151',
      currentStrokeWidth: cell.strokeWidth ?? 2,
      currentStrokeStyle: cell.strokeStyle || 'solid',
      currentLineShape: cell.shape || 'elbow',
      sourceMarker: cell.sourceMarker || 'none',
      targetMarker: cell.targetMarker || 'none',
    };
  }

  // 交互动作分发 (纯逻辑，无 UI 依赖)
  public static updateFill(board: Board, fill: string) {
    board.setShapeProperty({ fill });
  }

  public static updateStrokeColor(board: Board, stroke: string) {
    board.setShapeProperty({ stroke });
  }

  public static updateStrokeWidth(board: Board, strokeWidth: number) {
    board.setShapeProperty({ strokeWidth });
  }

  public static updateStrokeStyle(board: Board, strokeStyle: 'solid' | 'dashed') {
    board.setShapeProperty({ strokeStyle });
  }

  public static updateLineShape(board: Board, shape: 'elbow' | 'straight' | 'curve') {
    board.setShapeProperty({ shape });
  }

  public static toggleTargetMarker(board: Board) {
    const selected = board.selectedElements?.[0] as any;
    const current = selected?.targetMarker || 'none';
    const next = current === 'arrow' ? 'none' : 'arrow';
    board.setShapeProperty({ targetMarker: next });
  }

  public static toggleSourceMarker(board: Board) {
    const selected = board.selectedElements?.[0] as any;
    const current = selected?.sourceMarker || 'none';
    const next = current === 'arrow' ? 'none' : 'arrow';
    board.setShapeProperty({ sourceMarker: next });
  }

  public static reverseLine(board: Board) {
    const edge = board.selectedElements?.[0] as any;
    if (!edge || !edge.points) return;
    const points = [...edge.points].reverse();
    const sourceMarker = edge.targetMarker || 'none';
    const targetMarker = edge.sourceMarker || 'none';
    board.setShapeProperty({ points, sourceMarker, targetMarker });
  }

  public static setMindmapLayout(board: Board, layout: string) {
    board.setMindmapLayout(layout);
  }

  public static deleteSelected(board: Board) {
    board.deleteSelected();
  }
}
