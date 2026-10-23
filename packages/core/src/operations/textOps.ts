import type { Node } from '@antv/x6'
import type { Board } from '../Board'
import { calculateMindmapNodeWidth, measureTextWidth, countNodeMarkers } from '@speed-board/shared'

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
    cell.getData()?.type === 'text'
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
  node.setAttrByPath('textWrap/style/textDecoration', decoration)

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
      const calcWidth = calculateMindmapNodeWidth(text, !!data.isRoot, countNodeMarkers(data.markers))
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
  if (textEl.getAttribute('data-editing') === 'true') {
    if (initialChar) {
      textEl.innerText = initialChar
      const range = document.createRange()
      const sel = window.getSelection()
      range.selectNodeContents(textEl)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
    return
  }
  textEl.setAttribute('data-editing', 'true')

  // 就地打字期间隐藏 4 个角缩放圆点与旋转手柄，避免手柄遮挡文字，同时完整保留蓝色选中边框
  const setTransformEditing = (editing: boolean) => {
    const transformWidgets = board.container.querySelectorAll<HTMLElement>('.x6-widget-transform')
    transformWidgets.forEach((w) => {
      w.classList.toggle('is-text-editing', editing)
      const resizes = w.querySelectorAll<HTMLElement>('.x6-widget-transform-resize, .x6-widget-transform-rotate')
      resizes.forEach((r) => {
        r.style.display = editing ? 'none' : ''
      })
    })
    const speedBoard = board.container.closest('.speed-board')
    if (speedBoard) {
      speedBoard.classList.toggle('is-inline-editing', editing)
    }
  }

  setTransformEditing(true)
  graph.trigger('node:edit:start', { node })

  textEl.setAttribute('data-editing', 'true')
  textEl.setAttribute('contenteditable', 'true')
  textEl.setAttribute('tabindex', '-1')
  textEl.style.userSelect = 'text'
  textEl.style.cursor = 'text'
  textEl.style.outline = 'none'

  const initialData = (node.getData() || {}) as any
  const hasManualSize = !!initialData.manualSize || !!initialData.isCustomSize
  if (hasManualSize) {
    textEl.style.whiteSpace = 'pre-wrap'
    textEl.style.wordBreak = 'break-all'
  } else {
    textEl.style.whiteSpace = 'pre'
    textEl.style.wordBreak = 'normal'
  }

  const stopProp = (e: Event) => {
    e.stopPropagation()
    // 用户主动点击光标定位时，立即退出全量替换占位符状态，转为正常就地插入
    isFirstType = false
  }
  textEl.addEventListener('pointerdown', stopProp)
  textEl.addEventListener('mousedown', stopProp)
  textEl.addEventListener('mouseup', stopProp)
  textEl.addEventListener('click', stopProp)
  textEl.addEventListener('dblclick', stopProp)

  const isMindNode = initialData.type === 'mindmap-node'
  const defaultPlaceholder = isMindNode
    ? (initialData.isRoot ? '思维导图' : '分支主题')
    : (board.isShapeNode(node) ? '' : '文本')
  let isFirstType = !initialData.text || initialData.text === defaultPlaceholder

  // 严格校验是否处于【全选占位文字】态，仅在全量选中状态下输入才执行清空替换；若光标已折叠/定位则绝不清空
  const isAllPlaceholderSelected = () => {
    if (!isFirstType || !defaultPlaceholder) return false
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false
    const selectedText = sel.toString().trim()
    return selectedText.length > 0 && selectedText === textEl.innerText.trim()
  }

  let isComposing = false
  const onCompositionStart = () => {
    isComposing = true
    if (isAllPlaceholderSelected()) {
      textEl.innerText = ''
    }
    isFirstType = false
  }

  const onCompositionEnd = () => {
    isComposing = false
    onInput()
  }

  const onBeforeInput = (e: InputEvent) => {
    if (isAllPlaceholderSelected() && e.inputType === 'insertText') {
      textEl.innerText = ''
      isFirstType = false
    }
  }

  textEl.addEventListener('compositionstart', onCompositionStart)
  textEl.addEventListener('compositionend', onCompositionEnd)
  textEl.addEventListener('beforeinput', onBeforeInput as any)

  requestAnimationFrame(() => {
    textEl.focus()

    if (initialChar) {
      textEl.innerText = initialChar
      isFirstType = false
      const range = document.createRange()
      const sel = window.getSelection()
      range.selectNodeContents(textEl)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
      onInput()
    } else {
      const range = document.createRange()
      const sel = window.getSelection()
      range.selectNodeContents(textEl)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  })

  let finished = false
  const commitEdit = () => {
    if (finished) return
    finished = true

    textEl.removeEventListener('keydown', onKeyDown)
    textEl.removeEventListener('input', onInput)
    textEl.removeEventListener('blur', onBlur)
    textEl.removeEventListener('pointerdown', stopProp)
    textEl.removeEventListener('mousedown', stopProp)
    textEl.removeEventListener('mouseup', stopProp)
    textEl.removeEventListener('click', stopProp)
    textEl.removeEventListener('dblclick', stopProp)
    textEl.removeEventListener('compositionstart', onCompositionStart)
    textEl.removeEventListener('compositionend', onCompositionEnd)
    textEl.removeEventListener('beforeinput', onBeforeInput as any)

    textEl.removeAttribute('data-editing')
    textEl.setAttribute('contenteditable', 'false')
    textEl.style.userSelect = 'none'
    textEl.style.cursor = 'default'
    setTransformEditing(false)
    graph.trigger('node:edit:end', { node })

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
    const rawText = textEl.innerText || ''
    const isMind = node.getData()?.type === 'mindmap-node'
    const sel = window.getSelection()
    let savedRange: { startContainer: globalThis.Node; startOffset: number; endContainer: globalThis.Node; endOffset: number } | null = null
    if (sel && sel.rangeCount > 0) {
      const r = sel.getRangeAt(0)
      savedRange = {
        startContainer: r.startContainer,
        startOffset: r.startOffset,
        endContainer: r.endContainer,
        endOffset: r.endOffset,
      }
    }

    if (isMind) {
      const data = node.getData() || {}
      const isRoot = !!data.isRoot
      const manual = !!data.manualSize
      if (manual) {
        textEl.style.whiteSpace = 'pre-wrap'
        textEl.style.wordBreak = 'break-all'
        const manualWidth = typeof data.manualSize === 'object' && data.manualSize.width
          ? data.manualSize.width
          : node.size().width
        const scrollH = textEl.scrollHeight
        const baseHeight = isRoot ? 42 : 32
        const targetHeight = Math.max(baseHeight, scrollH + 8)
        node.setSize(manualWidth, targetHeight)
      } else {
        textEl.style.whiteSpace = 'pre'
        textEl.style.wordBreak = 'normal'
        const calcWidth = calculateMindmapNodeWidth(rawText || (isRoot ? '思维导图' : '分支主题'), isRoot, countNodeMarkers(data.markers))
        const lines = rawText.split('\n')
        const baseHeight = isRoot ? 42 : 32
        const lineH = (isRoot ? 16 : 14) * 1.45
        const targetHeight = lines.length > 1 ? Math.round(lines.length * lineH + 14) : baseHeight
        node.setSize(calcWidth, targetHeight)
      }
      board.syncSelectionBoxesTransform()
    } else if (node.shape === 'speed-text-node' || node.getData()?.type === 'text') {
      const data = node.getData() || {}
      const manual = !!data.manualSize || !!data.isCustomSize
      if (manual) {
        textEl.style.whiteSpace = 'pre-wrap'
        textEl.style.wordBreak = 'break-all'
        const currentW = (typeof data.manualSize === 'object' && data.manualSize.width) || node.size().width
        const scrollH = textEl.scrollHeight
        node.setSize(currentW, Math.max(28, scrollH + 4))
      } else {
        textEl.style.whiteSpace = 'pre'
        textEl.style.wordBreak = 'normal'
        const fs = data.fontSize || ((node.getAttrByPath('textWrap/style/fontSize') as string) ? parseInt(node.getAttrByPath('textWrap/style/fontSize') as string) : 14)
        const font = `${fs}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`
        const lines = rawText.split('\n')
        const maxLine = lines.reduce((max: string, line: string) => (line.length > max.length ? line : max), '')
        const measuredW = measureTextWidth(maxLine, font)
        const calcWidth = Math.max(36, Math.round(measuredW + 16))
        const lineH = fs * 1.45
        const calcHeight = Math.max(28, Math.round(Math.max(1, lines.length) * lineH + (lines.length > 1 ? 8 : 4)))
        node.setSize(calcWidth, calcHeight)
      }
      board.syncSelectionBoxesTransform()
    } else if (board.isShapeNode(node)) {
      board.syncSelectionBoxesTransform()
    }

    if (!isComposing && savedRange && sel) {
      try {
        const newRange = document.createRange()
        newRange.setStart(savedRange.startContainer, savedRange.startOffset)
        newRange.setEnd(savedRange.endContainer, savedRange.endOffset)
        sel.removeAllRanges()
        sel.addRange(newRange)
      } catch {}
    }
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
      isFirstType = false
    }

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
          // 确认保存并退出编辑态，聚焦保持选中当前节点
          graph.cleanSelection()
          graph.select(node)
          graph.trigger('selection:changed', { selected: [node] })
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

