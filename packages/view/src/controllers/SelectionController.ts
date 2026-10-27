import type { Board } from '@speed-board/core';
import type { SelectedElementType, SelectionInfo } from '../types';

export class SelectionController {
  public static analyzeSelection(board: Board | null): SelectionInfo {
    if (!board) {
      return {
        selectedCells: [],
        selectedCount: 0,
        selectedCell: null,
        selectedType: 'none',
        selectedShapeId: '',
      };
    }

    const cells = (board.selectedElements || []) as any[];
    const count = cells.length;

    if (count === 0) {
      return {
        selectedCells: [],
        selectedCount: 0,
        selectedCell: null,
        selectedType: 'none',
        selectedShapeId: '',
      };
    }

    const first = cells[0];

    if (count > 1) {
      return {
        selectedCells: cells,
        selectedCount: count,
        selectedCell: first,
        selectedType: 'multiple',
        selectedShapeId: '',
      };
    }

    let selectedType: SelectedElementType = 'shape';
    let selectedShapeId = '';

    const type = first.type || first.shape || '';
    if (board.isLineNode(first) || first.shape === 'straight' || first.shape === 'elbow' || first.shape === 'curve') {
      selectedType = 'line';
    } else if (board.isMindmapNode(first) || first.type === 'mind' || first.isRoot || first.children) {
      if (first.isSummary) selectedType = 'mindmap-summary';
      else if (first.isRoot) selectedType = 'mindmap-root';
      else selectedType = 'mindmap-node';
    } else if (board.isImageNode(first) || type === 'image') {
      selectedType = 'image';
    } else if (board.isTextNode(first) || type === 'text') {
      selectedType = 'text';
    } else if (type === 'freehand' || type === 'vector') {
      selectedType = 'vector';
    } else {
      selectedType = 'shape';
      selectedShapeId = first.shape || 'rectangle';
    }

    return {
      selectedCells: cells,
      selectedCount: count,
      selectedCell: first,
      selectedType,
      selectedShapeId,
    };
  }
}
