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
  | 'mindmap-root'
  | 'mindmap-node'
  | 'mindmap-summary'
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

    const cells = board.selectedElements || []
    selectedCells.value = cells
    selectedCount.value = cells.length

    if (cells.length === 0) {
      selectedCell.value = null
      selectedType.value = 'none'
      selectedShapeId.value = ''
      return
    }

    const cell = cells[0] as any
    selectedCell.value = cell

    if (cells.length > 1) {
      selectedType.value = 'multiple'
      selectedShapeId.value = ''
      return
    }

    const type = cell.type || cell.shape || ''
    if (cell.shape === 'straight' || cell.shape === 'elbow' || cell.shape === 'curve') {
      selectedType.value = 'line'
      selectedShapeId.value = ''
    } else if (cell.type === 'mind' || cell.isRoot || cell.children) {
      if (cell.isSummary) selectedType.value = 'mindmap-summary'
      else if (cell.isRoot) selectedType.value = 'mindmap-root'
      else selectedType.value = 'mindmap-node'
      selectedShapeId.value = ''
    } else if (type === 'image') {
      selectedType.value = 'image'
      selectedShapeId.value = ''
    } else if (type === 'text') {
      selectedType.value = 'text'
      selectedShapeId.value = ''
    } else {
      selectedType.value = 'shape'
      selectedShapeId.value = cell.shape || 'rectangle'
    }
  }

  watchEffect((onCleanup) => {
    const board = resolveBoard(source)
    if (!board) {
      sync(null)
      return
    }

    const listener = () => sync(board)

    sync(board)

    const events = [
      'selection:change',
      'change',
    ]

    for (const ev of events) {
      board.on(ev, listener)
    }

    onCleanup(() => {
      for (const ev of events) {
        board.off(ev, listener)
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
