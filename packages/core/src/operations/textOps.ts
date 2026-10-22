import type { Node } from '@antv/x6'
import type { Board } from '../Board'
import { calculateMindmapNodeWidth, measureTextWidth } from '@speed-board/shared'

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
    node.setAttrByPath('textWrap/html', options.text)
    node.setAttrByPath('label/text', options.text)
  }
  if (options.fontSize !== undefined) {
    node.setAttrByPath('textWrap/style/fontSize', `${options.fontSize}px`)
    node.setAttrByPath('label/fontSize', options.fontSize)
  }
  if (options.fill !== undefined) {
    node.setAttrByPath('textWrap/style/color', options.fill)
    node.setAttrByPath('label/fill', options.fill)
  }
  if (options.bold !== undefined) {
    node.setAttrByPath('textWrap/style/fontWeight', options.bold ? 'bold' : 'normal')
    node.setAttrByPath('label/fontWeight', options.bold ? 'bold' : 'normal')
  }
  if (options.italic !== undefined) {
    node.setAttrByPath('textWrap/style/fontStyle', options.italic ? 'italic' : 'normal')
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
    const isPureText = node.shape === 'speed-text-node' || data.type === 'text'
    const defaultAlign = isPureText ? 'center' : 'left'
    const align = options.align || data.align || defaultAlign
    if (align === 'left' || align === 'justify') {
      node.setAttrByPath('label/textAnchor', 'start')
      node.removeAttrByPath('label/refDx')
      node.setAttrByPath('label/refX', isPureText ? 4 : 8)
    } else if (align === 'center') {
      node.setAttrByPath('label/textAnchor', 'middle')
      node.removeAttrByPath('label/refDx')
      node.setAttrByPath('label/refX', '50%')
    } else if (align === 'right') {
      node.setAttrByPath('label/textAnchor', 'end')
      node.removeAttrByPath('label/refX')
      node.setAttrByPath('label/refDx', isPureText ? -4 : -8)
    }

    const verticalAlign = options.verticalAlign || data.verticalAlign || 'middle'
    if (verticalAlign === 'top') {
      node.setAttrByPath('label/textVerticalAnchor', 'top')
      node.removeAttrByPath('label/refDy')
      node.setAttrByPath('label/refY', isPureText ? 4 : 8)
    } else if (verticalAlign === 'middle') {
      node.setAttrByPath('label/textVerticalAnchor', 'middle')
      node.removeAttrByPath('label/refDy')
      node.setAttrByPath('label/refY', '50%')
    } else if (verticalAlign === 'bottom') {
      node.setAttrByPath('label/textVerticalAnchor', 'bottom')
      node.removeAttrByPath('label/refY')
      node.setAttrByPath('label/refDy', isPureText ? -4 : -8)
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
      const font = `${fs}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
      const maxLine = lines.reduce((max: string, line: string) => (line.length > max.length ? line : max), '')
      const measuredW = measureTextWidth(maxLine, font)
      const minWidth = 28
      const minHeight = 28
      const isPureText = node.shape === 'speed-text-node' || data.type === 'text'
      const paddingW = isPureText ? 8 : 12
      const calcWidth = Math.max(minWidth, Math.round(measuredW + paddingW))
      const calcHeight = Math.max(minHeight, Math.round(lines.length * fs * 1.45 + (lines.length > 1 ? 8 : 4)))
      node.setSize(calcWidth, calcHeight)
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

/**
 * 激活图元原生就地文本编辑 (1:1 语雀 In-Canvas contenteditable，0 像素抖动，彻底消除外部 Overlay)
 */
export function activateNodeTextEdit(
  board: Board,
  node: Node,
  initialChar?: string
): void {
  const graph = board.graph
  const view = graph.findViewByCell(node)
  if (!view || !view.container) {
    requestAnimationFrame(() => {
      activateNodeTextEdit(board, node, initialChar)
    })
    return
  }

  // 1. 查找内置的 contenteditable div (支持普通文本/图形/便签 .speed-node-text，及思维导图 .mindmap-node-text)
  const textEl = (view.container.querySelector('.speed-node-text') ||
    view.container.querySelector('.mindmap-node-text')) as HTMLDivElement | null

  if (!textEl) return

  // 避免重复编辑
  if (textEl.getAttribute('contenteditable') === 'true') {
    return
  }

  textEl.setAttribute('contenteditable', 'true')
  textEl.style.userSelect = 'text'
  textEl.style.cursor = 'text'
  textEl.focus()

  if (initialChar) {
    textEl.innerText = initialChar
    const range = document.createRange()
    const sel = window.getSelection()
    range.selectNodeContents(textEl)
    range.collapse(false)
    sel?.removeAllRanges()
    sel?.addRange(range)
  } else {
    const range = document.createRange()
    const sel = window.getSelection()
    range.selectNodeContents(textEl)
    sel?.removeAllRanges()
    sel?.addRange(range)
  }

  let finished = false
  const commitEdit = () => {
    if (finished) return
    finished = true

    textEl.removeEventListener('keydown', onKeyDown)
    textEl.removeEventListener('input', onInput)
    textEl.removeEventListener('blur', onBlur)

    textEl.removeAttribute('contenteditable')
    textEl.style.userSelect = 'none'
    textEl.style.cursor = 'default'

    const rawText = textEl.innerText.trim()
    const isMind = node.getData()?.type === 'mindmap-node'

    if (isMind) {
      const data = node.getData() || {}
      const defaultText = data.isRoot ? '思维导图' : '分支主题'
      const newText = rawText === '' ? defaultText : rawText
      textEl.innerText = newText
      node.setData({ ...data, text: newText })
      ;(board as any).commands?.updateMindmapLayout?.(data.mindmapId)
    } else if (board.isShapeNode(node)) {
      board.updateShapeNode(node, { text: rawText })
    } else {
      const newText = rawText === '' ? '文本' : rawText
      textEl.innerText = newText
      board.updateTextNode(node, { text: newText })
    }
  }

  const onInput = () => {
    const rawText = textEl.innerText
    if (node.shape === 'speed-text-node') {
      const fs = node.getData()?.fontSize || 14
      const font = `${fs}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
      const measuredW = measureTextWidth(rawText || '文本', font)
      const newW = Math.max(28, Math.round(measuredW + 8))
      node.resize(newW, 28)
    }
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      commitEdit()
      return
    }

    if (e.key === 'Enter') {
      const isMind = node.getData()?.type === 'mindmap-node'
      if (isMind) {
        if (!e.shiftKey && !e.isComposing && (e as any).keyCode !== 229) {
          e.preventDefault()
          e.stopPropagation()
          commitEdit()
          const data = node.getData() || {}
          if (data.isRoot || !data.parentId) {
            ;(board as any).commands?.addMindmapChild?.(node.id)
          } else {
            ;(board as any).commands?.addMindmapSibling?.(node.id)
          }
          return
        }
      } else {
        // 普通文本：Enter 换行输入；单行文本或者文本图元 Enter 提交
        if (!e.shiftKey && (node.getData()?.singleLine || node.shape === 'speed-text-node')) {
          e.preventDefault()
          e.stopPropagation()
          commitEdit()
          return
        }
      }
    }
  }

  const onBlur = () => {
    commitEdit()
  }

  textEl.addEventListener('keydown', onKeyDown)
  textEl.addEventListener('input', onInput)
  textEl.addEventListener('blur', onBlur)
}

