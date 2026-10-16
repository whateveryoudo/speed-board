import type { Node } from '@antv/x6'
import type { Board } from '../Board'
import { calculateMindmapNodeWidth } from '@speed-board/shared'

/**
 * 判断图元是否为文本节点
 */
export function isTextNode(board: Board, cell?: any): boolean {
  if (!cell) {
    const selected = board.graph.getSelectedCells()
    if (!selected.length) return false
    cell = selected[0]
  }
  if (!cell || !cell.isNode()) return false
  return (
    cell.shape === 'speed-text-node' ||
    cell.shape === 'text-block' ||
    cell.shape === 'speed-mindmap-root' ||
    cell.shape === 'speed-mindmap-node' ||
    cell.getData()?.type === 'text' ||
    cell.getData()?.type === 'mindmap-node'
  )
}

/**
 * 更新指定文本节点属性 (内容、字号、颜色、样式、对齐、链接)
 */
export function updateTextNode(
  board: Board,
  nodeOrId: Node | string,
  options: {
    text?: string
    link?: string
    fontSize?: number
    fill?: string
    bold?: boolean
    italic?: boolean
    strike?: boolean
    underline?: boolean
    align?: 'left' | 'center' | 'right' | 'justify'
    verticalAlign?: 'top' | 'middle' | 'bottom'
    resize?: boolean
  }
) {
  const node = typeof nodeOrId === 'string' ? (board.graph.getCellById(nodeOrId) as Node) : nodeOrId
  if (!node || !node.isNode()) return

  const data = node.getData() || {}
  const newData = { ...data, ...options }
  node.setData(newData)

  if (options.text !== undefined) {
    node.setAttrByPath('label/text', options.text)
  }
  if (options.fontSize !== undefined) {
    node.setAttrByPath('label/fontSize', options.fontSize)
  }
  if (options.fill !== undefined) {
    node.setAttrByPath('label/fill', options.fill)
  }
  if (options.bold !== undefined) {
    node.setAttrByPath('label/fontWeight', options.bold ? 'bold' : 'normal')
  }
  if (options.italic !== undefined) {
    node.setAttrByPath('label/fontStyle', options.italic ? 'italic' : 'normal')
  }

  const isUnderline = options.underline !== undefined ? options.underline : data.underline
  const isStrike = options.strike !== undefined ? options.strike : data.strike
  let decoration = 'none'
  if (isUnderline && isStrike) decoration = 'underline line-through'
  else if (isUnderline) decoration = 'underline'
  else if (isStrike) decoration = 'line-through'
  node.setAttrByPath('label/textDecoration', decoration)

  const isMindmap = data.type === 'mindmap-node'
  if (isMindmap) {
    if (data.isRoot) {
      node.setAttrByPath('label/textAnchor', 'middle')
      node.removeAttrByPath('label/refDx')
      node.setAttrByPath('label/refX', '50%')
      node.setAttrByPath('label/textVerticalAnchor', 'middle')
      node.removeAttrByPath('label/refDy')
      node.setAttrByPath('label/refY', '50%')
    } else {
      node.setAttrByPath('label/textAnchor', 'start')
      node.removeAttrByPath('label/refDx')
      node.setAttrByPath('label/refX', 8)
      node.setAttrByPath('label/textVerticalAnchor', 'middle')
      node.removeAttrByPath('label/refDy')
      node.setAttrByPath('label/refY', '50%')
    }
  } else {
    const align = options.align || data.align || 'left'
    if (align === 'left' || align === 'justify') {
      node.setAttrByPath('label/textAnchor', 'start')
      node.removeAttrByPath('label/refDx')
      node.setAttrByPath('label/refX', 8)
    } else if (align === 'center') {
      node.setAttrByPath('label/textAnchor', 'middle')
      node.removeAttrByPath('label/refDx')
      node.setAttrByPath('label/refX', '50%')
    } else if (align === 'right') {
      node.setAttrByPath('label/textAnchor', 'end')
      node.removeAttrByPath('label/refX')
      node.setAttrByPath('label/refDx', -8)
    }

    const verticalAlign = options.verticalAlign || data.verticalAlign || 'middle'
    if (verticalAlign === 'top') {
      node.setAttrByPath('label/textVerticalAnchor', 'top')
      node.removeAttrByPath('label/refDy')
      node.setAttrByPath('label/refY', 8)
    } else if (verticalAlign === 'middle') {
      node.setAttrByPath('label/textVerticalAnchor', 'middle')
      node.removeAttrByPath('label/refDy')
      node.setAttrByPath('label/refY', '50%')
    } else if (verticalAlign === 'bottom') {
      node.setAttrByPath('label/textVerticalAnchor', 'bottom')
      node.removeAttrByPath('label/refY')
      node.setAttrByPath('label/refDy', -8)
    }
  }

  // 动态调整宽度与高度以适应文字 (在 options.resize !== false 时触发)
  if (options.resize !== false) {
    const text = options.text !== undefined ? options.text : ((node.getAttrByPath('label/text') as string) || '')
    const fs = options.fontSize || ((node.getAttrByPath('label/fontSize') as number) || 14)
    const lines = text.split('\n')
    const maxLineLen = Math.max(...lines.map((l: string) => l.length), 2)

    if (isMindmap) {
      const targetHeight = data.isRoot ? 42 : 32
      const calcWidth = calculateMindmapNodeWidth(text, !!data.isRoot)
      node.setSize(calcWidth, targetHeight)
    } else {
      const minWidth = 80
      const minHeight = 36
      const calcWidth = Math.max(minWidth, maxLineLen * fs * 0.95 + 24)
      const calcHeight = Math.max(minHeight, lines.length * fs * 1.45 + 16)
      node.setSize(Math.round(calcWidth), Math.round(calcHeight))
    }
  }
}

/**
 * 更新当前选中文本图元属性
 */
export function updateSelectedTextStyle(
  board: Board,
  options: {
    text?: string
    link?: string
    fontSize?: number
    fill?: string
    bold?: boolean
    italic?: boolean
    strike?: boolean
    underline?: boolean
    align?: 'left' | 'center' | 'right' | 'justify'
    verticalAlign?: 'top' | 'middle' | 'bottom'
  }
) {
  const selectedCells = board.graph.getSelectedCells()
  if (!selectedCells || selectedCells.length === 0) return
  for (const cell of selectedCells) {
    if (cell.isNode()) {
      if (board.isShapeNode(cell)) {
        board.updateShapeNode(cell, {
          ...options,
          textColor: options.fill,
        })
      } else {
        updateTextNode(board, cell, options)
      }
    }
  }
}

/**
 * 获取当前选中图元的文本属性
 */
export function getSelectedTextData(board: Board): {
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
} | null {
  const selectedCells = board.graph.getSelectedCells()
  if (!selectedCells || selectedCells.length === 0) return null
  const cell = selectedCells[0]
  if (!cell.isNode()) return null

  const attrs = cell.getAttrs()?.label || {}
  const data = cell.getData() || {}

  const text = (attrs.text as string) ?? (data.text as string) ?? ''
  const fontSize = Number(attrs.fontSize ?? data.fontSize ?? 14)
  const fill = (attrs.fill as string) ?? (data.fill as string) ?? '#262626'
  const bold = attrs.fontWeight === 'bold' || !!data.bold
  const italic = attrs.fontStyle === 'italic' || !!data.italic
  const dec = (attrs.textDecoration as string) || ''
  const underline = dec.includes('underline') || !!data.underline
  const strike = dec.includes('line-through') || !!data.strike
  const align = data.align || (attrs.textAnchor === 'middle' ? 'center' : attrs.textAnchor === 'end' ? 'right' : 'left')
  const verticalAlign = data.verticalAlign || (attrs.textVerticalAnchor === 'top' ? 'top' : attrs.textVerticalAnchor === 'bottom' ? 'bottom' : 'middle')

  return {
    text,
    link: data.link || '',
    fontSize,
    fill,
    bold,
    italic,
    strike,
    underline,
    align,
    verticalAlign,
  }
}
