import {
  BoardTransforms,
  PlaitBoard,
  PlaitPointerType,
  clearSelectedElement,
  getSelectedElements,
} from '@plait/core';
import { BoardCreationMode, setCreationMode } from '@plait/common';

export const withGlobalEsc = (board: PlaitBoard) => {
  const { globalKeyDown } = board;

  board.globalKeyDown = (event: KeyboardEvent) => {
    if (!PlaitBoard.isReadonly(board)) {
      if (event.key === 'Escape') {
        const pointer = PlaitBoard.getPointer(board);
        const wrapper = (board as any).boardWrapper;

        // 若处于文本编辑态，优先交由 Plait 自带机制退出文本编辑
        if (PlaitBoard.hasBeenTextEditing(board)) {
          globalKeyDown(event);
          return;
        }

        // 1. 若处于任意非选择指针模式（如矢量钢笔、手绘画笔、连线、图形放置等），按下 Esc 统一退出当前模式并切回选择
        if (pointer !== PlaitPointerType.selection) {
          event.preventDefault();
          event.stopPropagation();

          if (wrapper) {
            wrapper.setPointer(PlaitPointerType.selection);
          } else {
            BoardTransforms.updatePointerType(board, PlaitPointerType.selection);
            setCreationMode(board, BoardCreationMode.dnd);
          }
          return;
        }

        // 2. 若已经在选择模式且有选中的元素，按下 Esc 取消选区
        const selected = getSelectedElements(board);
        if (selected && selected.length > 0) {
          event.preventDefault();
          event.stopPropagation();
          clearSelectedElement(board);
          if (wrapper) {
            wrapper.emit('selection:change', { selected: [] });
          }
          return;
        }
      }
    }

    globalKeyDown(event);
  };

  return board;
};
