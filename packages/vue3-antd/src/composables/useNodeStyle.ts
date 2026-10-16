import { ref, computed } from 'vue'
import type { Board, Cell } from '@speed-board/core'
import {
  getShapeById,
  renderShapeCanvasSvg,
} from '../data/shapeLibrary'

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

    const cells = board.graph.getSelectedCells()
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

    if (cell.isEdge()) {
      selectedType.value = 'line'
      const stroke = (cell.getAttrByPath('line/stroke') as string) || '#374151'
      const strokeWidth = (cell.getAttrByPath('line/strokeWidth') as number) || 2
      const strokeDasharray = (cell.getAttrByPath('line/strokeDasharray') as string) || 'none'
      const opacity = (cell.getAttrByPath('line/opacity') as number) ?? 1
      styleState.value = { fill: 'transparent', stroke, strokeWidth, strokeDasharray, opacity }
      return
    }

    if (cell.isNode()) {
      const shape = cell.shape
      if (shape === 'speed-image-node') {
        selectedType.value = 'image'
        const opacity = (cell.getAttrByPath('image/opacity') as number) ?? (cell.getAttrByPath('body/opacity') as number) ?? 1
        styleState.value.opacity = opacity
        return
      }

      if (shape === 'speed-vector-polygon') {
        selectedType.value = 'vector'
        const fill = (cell.getAttrByPath('body/fill') as string) || '#ffffff'
        const stroke = (cell.getAttrByPath('body/stroke') as string) || '#374151'
        const strokeWidth = (cell.getAttrByPath('body/strokeWidth') as number) || 2
        const strokeDasharray = (cell.getAttrByPath('body/strokeDasharray') as string) || 'none'
        const opacity = (cell.getAttrByPath('body/opacity') as number) ?? 1
        styleState.value = { fill, stroke, strokeWidth, strokeDasharray, opacity }
        return
      }

      if (
        shape === 'speed-mindmap-root' ||
        shape === 'speed-mindmap-node' ||
        cell.getData()?.type === 'mindmap-node'
      ) {
        selectedType.value = 'mindmap'
        const textData = board.getSelectedTextData()
        if (textData) {
          textState.value = { ...textState.value, ...textData }
        }
        const fill = (cell.getAttrByPath('body/fill') as string) || '#ffffff'
        const stroke = (cell.getAttrByPath('body/stroke') as string) || '#374151'
        const strokeWidth = (cell.getAttrByPath('body/strokeWidth') as number) || 2
        styleState.value = { fill, stroke, strokeWidth, strokeDasharray: 'none', opacity: 1 }
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
    }

    // 默认兜底为 shape
    selectedType.value = 'shape'
  }

  /** 更新通用样式 (fill, stroke, strokeWidth, strokeDasharray, opacity) */
  const updateStyle = (patch: Partial<NodeStyleState>) => {
    const board = getBoard()
    if (!board) return

    Object.assign(styleState.value, patch)

    const cells = board.graph.getSelectedCells()
    for (const cell of cells) {
      if (cell.isEdge()) {
        if (patch.stroke !== undefined) cell.setAttrByPath('line/stroke', patch.stroke)
        if (patch.strokeWidth !== undefined) cell.setAttrByPath('line/strokeWidth', patch.strokeWidth)
        if (patch.strokeDasharray !== undefined) {
          cell.setAttrByPath(
            'line/strokeDasharray',
            patch.strokeDasharray === 'none' ? undefined : patch.strokeDasharray
          )
        }
        if (patch.opacity !== undefined) cell.setAttrByPath('line/opacity', patch.opacity)
      } else if (cell.isNode()) {
        if (cell.shape === 'speed-image-node') {
          if (patch.opacity !== undefined) {
            cell.setAttrByPath('image/opacity', patch.opacity)
            cell.setAttrByPath('bg/opacity', patch.opacity)
          }
        } else if (cell.shape === 'speed-vector-polygon') {
          if (patch.fill !== undefined) cell.setAttrByPath('body/fill', patch.fill)
          if (patch.stroke !== undefined) cell.setAttrByPath('body/stroke', patch.stroke)
          if (patch.strokeWidth !== undefined) cell.setAttrByPath('body/strokeWidth', patch.strokeWidth)
          if (patch.strokeDasharray !== undefined) {
            cell.setAttrByPath(
              'body/strokeDasharray',
              patch.strokeDasharray === 'none' ? undefined : patch.strokeDasharray
            )
          }
          if (patch.opacity !== undefined) cell.setAttrByPath('body/opacity', patch.opacity)
        } else if (board.isShapeNode(cell)) {
          const data = cell.getData() || {}
          const shapeDef = getShapeById(data.shapeId || 'rect')
          const newFill = patch.fill !== undefined ? patch.fill : styleState.value.fill
          const newStroke = patch.stroke !== undefined ? patch.stroke : styleState.value.stroke
          const newWidth = patch.strokeWidth !== undefined ? patch.strokeWidth : styleState.value.strokeWidth
          const newDash = patch.strokeDasharray !== undefined ? patch.strokeDasharray : styleState.value.strokeDasharray
          const newOpacity = patch.opacity !== undefined ? patch.opacity : styleState.value.opacity

          let svgContent: string | undefined = undefined
          if (shapeDef) {
            svgContent = renderShapeCanvasSvg(shapeDef, {
              fill: newFill,
              stroke: newStroke,
              strokeWidth: newWidth,
              strokeDasharray: newDash,
            })
          }

          board.updateShapeNode(cell as any, {
            fill: newFill,
            stroke: newStroke,
            strokeWidth: newWidth,
            strokeDasharray: newDash,
            opacity: newOpacity,
            svgContent,
          })
        }
      }
    }
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
