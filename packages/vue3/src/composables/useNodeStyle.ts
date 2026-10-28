import { ref, watch } from 'vue';
import type {
  Board,
  NodeStyleState,
  NodeTextState,
  SelectedElementType,
} from '@speed-board/core';
import { resolveBoard, type BoardSource } from './useBoardEvent';

export function useNodeStyle(source: BoardSource) {
  const selectedType = ref<SelectedElementType>('none');
  const selectedCells = ref<any[]>([]);

  const styleState = ref<NodeStyleState>({
    fill: '#ffffff',
    stroke: '#374151',
    strokeWidth: 2,
    strokeDasharray: 'none',
    opacity: 1,
  });

  const textState = ref<NodeTextState>({
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
  });

  const syncFromSelection = () => {
    const board = resolveBoard(source);
    if (!board) {
      selectedType.value = 'none';
      selectedCells.value = [];
      return;
    }

    const info = board.getSelectionInfo();
    selectedType.value = info.selectedType;
    selectedCells.value = info.selectedCells;

    styleState.value = board.getNodeStyleState();
    textState.value = board.getNodeTextState();
  };

  const updateStyle = (patch: Partial<NodeStyleState>) => {
    const board = resolveBoard(source);
    if (!board) return;

    Object.assign(styleState.value, patch);

    const plaitPatch: Record<string, any> = {};
    if (patch.fill !== undefined) plaitPatch.fill = patch.fill;
    if (patch.stroke !== undefined) plaitPatch.stroke = patch.stroke;
    if (patch.strokeWidth !== undefined) plaitPatch.strokeWidth = patch.strokeWidth;
    if (patch.strokeDasharray !== undefined) {
      plaitPatch.strokeStyle = patch.strokeDasharray === 'none' ? 'solid' : patch.strokeDasharray;
      plaitPatch.strokeDasharray = patch.strokeDasharray === 'none' ? undefined : patch.strokeDasharray;
    }
    if (patch.opacity !== undefined) plaitPatch.opacity = patch.opacity;

    board.setShapeProperty(plaitPatch);
  };

  const updateFill = (fill: string) => updateStyle({ fill });
  const updateStroke = (stroke: string) => updateStyle({ stroke });
  const updateStrokeWidth = (strokeWidth: number) => updateStyle({ strokeWidth });
  const updateStrokeDasharray = (strokeDasharray: string) => updateStyle({ strokeDasharray });
  const updateOpacity = (opacity: number) => updateStyle({ opacity });

  const updateTextStyle = (patch: Partial<NodeTextState>) => {
    const board = resolveBoard(source);
    if (!board) return;
    textState.value = { ...textState.value, ...patch };
    board.patchNodeText(patch);
  };

  // 监听画板选区变更事件
  watch(
    () => resolveBoard(source),
    (board, oldBoard) => {
      const events = ['selection:change', 'change'];
      if (oldBoard) {
        for (const ev of events) {
          oldBoard.off(ev, syncFromSelection);
        }
      }
      if (board) {
        for (const ev of events) {
          board.on(ev, syncFromSelection);
        }
      }
      syncFromSelection();
    },
    { immediate: true }
  );

  return {
    selectedType,
    selectedCells,
    styleState,
    textState,
    syncFromSelection,
    updateStyle,
    updateFill,
    updateStroke,
    updateStrokeWidth,
    updateStrokeDasharray,
    updateOpacity,
    updateTextStyle,
  };
}
