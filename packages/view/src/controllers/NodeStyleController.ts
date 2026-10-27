import type { Board } from '@speed-board/core';
import type { NodeStyleState, NodeTextState } from '../types';

export class NodeStyleController {
  public static getNodeStyleState(board: Board | null): NodeStyleState {
    const defaultState: NodeStyleState = {
      fill: '#ffffff',
      stroke: '#374151',
      strokeWidth: 2,
      strokeDasharray: 'none',
      opacity: 1,
    };

    if (!board) return defaultState;
    const cells = (board.selectedElements || []) as any[];
    if (cells.length === 0) return defaultState;

    const cell = cells[0];
    if (board.isLineNode(cell)) {
      return {
        fill: 'transparent',
        stroke: cell.stroke || '#374151',
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

  public static getNodeTextState(board: Board | null): NodeTextState {
    const defaultState: NodeTextState = {
      text: '',
      link: '',
      fontSize: 14,
      fill: '#262626',
      bold: false,
      italic: false,
      strike: false,
      underline: false,
      align: 'left',
      verticalAlign: 'middle',
    };

    if (!board) return defaultState;
    const textData = board.getSelectedTextData();
    if (textData) {
      return { ...defaultState, ...textData };
    }
    return defaultState;
  }

  public static patchNodeStyle(board: Board, patch: Partial<NodeStyleState>) {
    board.setShapeProperty(patch);
  }

  public static patchNodeText(board: Board, patch: Partial<NodeTextState>) {
    board.setSelectedTextData(patch);
  }
}
