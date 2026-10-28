import { ref, watchEffect, type Ref } from 'vue';
import type { Board, SelectedElementType } from '@speed-board/core';
import { resolveBoard, type BoardSource } from './useBoardEvent';

export interface BoardSelectionState {
  selectedCells: Ref<any[]>;
  selectedCell: Ref<any | null>;
  selectedType: Ref<SelectedElementType>;
  selectedShapeId: Ref<string>;
  selectedCount: Ref<number>;
}

/**
 * 响应式画板选区管理 Hook (直连 Board 实例)
 */
export function useBoardSelection(source: BoardSource): BoardSelectionState {
  const selectedCells = ref<any[]>([]);
  const selectedCell = ref<any | null>(null);
  const selectedType = ref<SelectedElementType>('none');
  const selectedShapeId = ref('');
  const selectedCount = ref(0);

  const sync = (board: Board | null) => {
    if (!board) {
      selectedCells.value = [];
      selectedCell.value = null;
      selectedType.value = 'none';
      selectedShapeId.value = '';
      selectedCount.value = 0;
      return;
    }
    const info = board.getSelectionInfo();
    selectedCells.value = info.selectedCells;
    selectedCell.value = info.selectedCell;
    selectedType.value = info.selectedType;
    selectedShapeId.value = info.selectedShapeId;
    selectedCount.value = info.selectedCount;
  };

  watchEffect((onCleanup) => {
    const board = resolveBoard(source);
    if (!board) {
      sync(null);
      return;
    }

    const listener = () => sync(board);
    sync(board);

    const events = ['selection:change', 'change'];
    for (const ev of events) {
      board.on(ev, listener);
    }

    onCleanup(() => {
      for (const ev of events) {
        board.off(ev, listener);
      }
    });
  });

  return {
    selectedCells,
    selectedCell,
    selectedType,
    selectedShapeId,
    selectedCount,
  };
}
