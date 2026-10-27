import { ref } from 'vue'
import type { Board } from '@speed-board/core'
import type { SelectedElementType } from './useBoardSelection'
export type { SelectedElementType }

export interface NodeStyleState {
  fill: string
  stroke: string
  strokeWidth: number
  strokeDasharray: string
  opacity: number
}

export interface NodeTextState {
  text: string
  link: string
  fontSize: number
  fill: string
  bold: boolean
  italic: boolean
  strike: boolean
  underline: boolean
  align: 'left' | 'center' | 'right' | 'justify'
  verticalAlign: 'top' | 'middle' | 'bottom'
}

export function useNodeStyle(getBoard: () => Board | null) {
  const selectedType = ref<SelectedElementType>('none')
  const selectedCells = ref<any[]>([])

  const styleState = ref<NodeStyleState>({
    fill: '#ffffff',
    stroke: '#374151',
    strokeWidth: 2,
    strokeDasharray: 'none',
    opacity: 1,
  })

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
  })

  /** 同步选区状态与数据回显 */
  const syncFromSelection = () => {
    const board = getBoard()
    if (!board) {
      selectedType.value = 'none'
      selectedCells.value = []
      return
    }

    const cells = (board.selectedElements || []) as any[]
    selectedCells.value = cells

    if (cells.length === 0) {
      selectedType.value = 'none'
      return
    }

    if (cells.length > 1) {
      selectedType.value = 'multiple'
      return
    }

    const cell = cells[0]

    if (board.isLineNode(cell)) {
      selectedType.value = 'line'
      const stroke = cell.stroke || '#374151'
      const strokeWidth = cell.strokeWidth ?? 2
      const strokeDasharray = cell.strokeStyle || cell.strokeDasharray || 'none'
      const opacity = cell.opacity ?? 1
      styleState.value = { fill: 'transparent', stroke, strokeWidth, strokeDasharray, opacity }
      return
    }

    if (board.isImageNode(cell)) {
      selectedType.value = 'image'
      styleState.value.opacity = cell.opacity ?? 1
      return
    }

    if (board.isMindmapNode(cell)) {
      const d = (cell.data || {}) as any
      if (cell.isSummary || d.isSummary) selectedType.value = 'mindmap-summary' as any
      else if (cell.isRoot || d.isRoot) selectedType.value = 'mindmap-root' as any
      else selectedType.value = 'mindmap-node' as any

      const textData = board.getSelectedTextData()
      if (textData) {
        textState.value = { ...textState.value, ...textData }
      }
      const fill = cell.fill || d.fill || '#ffffff'
      const stroke = cell.stroke || d.stroke || '#374151'
      const strokeWidth = cell.strokeWidth ?? d.strokeWidth ?? 1.5
      styleState.value = { fill, stroke, strokeWidth, strokeDasharray: 'none', opacity: cell.opacity ?? 1 }
      return
    }

    if (board.isTextNode(cell)) {
      selectedType.value = 'text'
      const textData = board.getSelectedTextData()
      if (textData) {
        textState.value = { ...textState.value, ...textData }
      }
      return
    }

    if (board.isShapeNode(cell)) {
      selectedType.value = 'shape'
      const shapeData = board.getShapeNodeData()
      if (shapeData) {
        styleState.value = {
          fill: shapeData.fill || '#ffffff',
          stroke: shapeData.stroke || '#374151',
          strokeWidth: shapeData.strokeWidth ?? 2,
          strokeDasharray: shapeData.strokeDasharray || 'none',
          opacity: shapeData.opacity ?? 1,
        }
      }
      const textData = board.getSelectedTextData()
      if (textData) {
        textState.value = { ...textState.value, ...textData }
      }
      return
    }

    // 默认兜底为 shape
    selectedType.value = 'shape'
  }

  /** 更新通用样式 (fill, stroke, strokeWidth, strokeDasharray, opacity) */
  const updateStyle = (patch: Partial<NodeStyleState>) => {
    const board = getBoard()
    if (!board) return

    Object.assign(styleState.value, patch)

    const plaitPatch: Record<string, any> = {}
    if (patch.fill !== undefined) plaitPatch.fill = patch.fill
    if (patch.stroke !== undefined) plaitPatch.stroke = patch.stroke
    if (patch.strokeWidth !== undefined) plaitPatch.strokeWidth = patch.strokeWidth
    if (patch.strokeDasharray !== undefined) {
      plaitPatch.strokeStyle = patch.strokeDasharray === 'none' ? 'solid' : patch.strokeDasharray
      plaitPatch.strokeDasharray = patch.strokeDasharray === 'none' ? undefined : patch.strokeDasharray
    }
    if (patch.opacity !== undefined) plaitPatch.opacity = patch.opacity

    board.setShapeProperty(plaitPatch)
  }

  /** 更新文本样式 */
  const updateTextStyle = (patch: Partial<NodeTextState>) => {
    const board = getBoard()
    if (!board) return

    Object.assign(textState.value, patch)
    board.updateSelectedTextStyle(patch)
  }

  return {
    selectedType,
    selectedCells,
    styleState,
    textState,
    syncFromSelection,
    updateStyle,
    updateTextStyle,
  }
}
