import { ref, watchEffect, type Ref } from 'vue'
import type { Board, Cell } from '@speed-board/core'
import { resolveBoard, type BoardSource } from './useBoardEvent'

export type SelectedElementType =
  | 'none'
  | 'shape'
  | 'text'
  | 'image'
  | 'vector'
  | 'line'
  | 'mindmap'
  | 'multiple'

export interface BoardSelectionState {
  selectedCells: Ref<any[]>
  selectedCell: Ref<any | null>
  selectedType: Ref<SelectedElementType>
  selectedShapeId: Ref<string>
  selectedCount: Ref<number>
}

/**
 * 响应式画板选区管理 Hook
 * 监听画板选区变更，将当前选中的图元、首图元、图元类型及 shapeId 转为响应式 Ref。
 */
export function useBoardSelection(source: BoardSource): BoardSelectionState {
  const selectedCells = ref<any[]>([])
  const selectedCell = ref<any | null>(null)
  const selectedType = ref<SelectedElementType>('none')
  const selectedShapeId = ref('')
  const selectedCount = ref(0)

  const sync = (board: Board | null) => {
    if (!board) {
      selectedCells.value = []
      selectedCell.value = null
      selectedType.value = 'none'
      selectedShapeId.value = ''
      selectedCount.value = 0
      return
    }

    const cells = board.graph.getSelectedCells()
    selectedCells.value = cells
    selectedCount.value = cells.length

    if (cells.length === 0) {
      selectedCell.value = null
      selectedType.value = 'none'
      selectedShapeId.value = ''
      return
    }

    const cell = cells[0]
    selectedCell.value = cell

    if (cells.length > 1) {
      selectedType.value = 'multiple'
      selectedShapeId.value = ''
      return
    }

    if (cell.isEdge()) {
      selectedType.value = 'line'
      selectedShapeId.value = ''
    } else if (
      cell.shape === 'speed-mindmap-root' ||
      cell.shape === 'speed-mindmap-node' ||
      cell.getData()?.type === 'mindmap-node'
    ) {
      selectedType.value = 'mindmap'
      selectedShapeId.value = ''
    } else if (cell.shape === 'speed-image-node') {
      selectedType.value = 'image'
      selectedShapeId.value = ''
    } else if (cell.shape === 'speed-vector-polygon') {
      selectedType.value = 'vector'
      selectedShapeId.value = ''
    } else if (board.isTextNode(cell)) {
      selectedType.value = 'text'
      selectedShapeId.value = ''
    } else if (board.isShapeNode(cell)) {
      selectedType.value = 'shape'
      selectedShapeId.value = cell.getData()?.shapeId || 'rect'
    } else {
      selectedType.value = 'shape'
      selectedShapeId.value = cell.getData()?.shapeId || 'rect'
    }
  }

  watchEffect((onCleanup) => {
    const board = resolveBoard(source)
    if (!board) {
      sync(null)
      return
    }

    const graph = board.graph
    const listener = () => sync(board)

    sync(board)

    const events = [
      'cell:selected',
      'cell:unselected',
      'selection:changed',
      'cell:change:data',
      'node:change:data',
      'edge:change:data',
    ]

    for (const ev of events) {
      graph.on(ev, listener)
    }

    onCleanup(() => {
      for (const ev of events) {
        graph.off(ev, listener)
      }
    })
  })

  return {
    selectedCells,
    selectedCell,
    selectedType,
    selectedShapeId,
    selectedCount,
  }
}
