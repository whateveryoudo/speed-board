import type { Board } from '@speed-board/core'
import type { InlineEditorStyle } from '../types'
import { calculateMindmapNodeWidth } from '@speed-board/shared'

/**
 * 计算浮动文本编辑框的屏幕绝对定位与排版样式
 */
export function computeInlineEditorLayout(
  board: Board | null | undefined,
  activeNode: any,
  canvasWrapper: HTMLElement | null | undefined,
  currentText = ''
): InlineEditorStyle | null {
  if (!activeNode || !board || !canvasWrapper) return null

  try {
    const graph = board.graph
    const bbox = activeNode.getBBox()
    const scale = graph.zoom()
    const angle = activeNode.getAngle() || 0
    const data = activeNode.getData() || {}

    const isMindmapRoot =
      activeNode.shape === 'speed-mindmap-root' ||
      (data.type === 'mindmap-node' && !!data.isRoot)
    const isMindmapBranch =
      (data.type === 'mindmap-node' && !data.isRoot) ||
      activeNode.shape === 'speed-mindmap-node'
    const isMindmap = isMindmapRoot || isMindmapBranch
    const isPureText =
      data.type === 'text' ||
      activeNode.shape === 'speed-text-node' ||
      activeNode.shape === 'text-block'

    const view = graph.findViewByCell(activeNode)
    const wrapperRect = canvasWrapper.getBoundingClientRect()
    const targetElem = (view && (
      (view as any).selectors?.body ||
      (view as any).selectors?.bg ||
      (view as any).container?.querySelector?.('rect')
    )) as SVGElement | null

    const pos = graph.localToClient(bbox.x, bbox.y)
    let left = Math.round(pos.x - wrapperRect.left)
    let top = Math.round(pos.y - wrapperRect.top)
    let w = Math.round(bbox.width * scale)
    let h = Math.round(bbox.height * scale)

    if (targetElem && typeof targetElem.getBoundingClientRect === 'function') {
      const cellRect = targetElem.getBoundingClientRect()
      if (
        cellRect.width >= 10 &&
        cellRect.width < wrapperRect.width * 0.85 &&
        cellRect.height >= 10 &&
        cellRect.height < wrapperRect.height * 0.85
      ) {
        if (angle === 0) {
          left = Math.round(cellRect.left - wrapperRect.left)
          top = Math.round(cellRect.top - wrapperRect.top)
          w = Math.round(cellRect.width)
          h = Math.round(cellRect.height)
        } else {
          const cx = cellRect.left + cellRect.width / 2 - wrapperRect.left
          const cy = cellRect.top + cellRect.height / 2 - wrapperRect.top
          left = Math.round(cx - w / 2)
          top = Math.round(cy - h / 2)
        }
      }
    }

    const attrs = activeNode.getAttrs()?.label || {}
    const baseFontSize = (data.fontSize as number) || (attrs.fontSize as number) || 14
    const fontSize = Math.max(12, Math.round(baseFontSize * scale))
    const lineH = fontSize * 1.45
    const lineCount = Math.max(1, (currentText || '').split('\n').length)
    const approxTextH = lineCount * lineH

    if (isMindmap) {
      const activeText = currentText !== '' ? currentText : ((attrs.text as string) || (data.text as string) || '')
      const contentW = calculateMindmapNodeWidth(activeText, isMindmapRoot)
      const dynamicW = Math.max(w, Math.round(contentW * scale))

      const side = data.side || 'right'
      if (side === 'left') {
        left = left - (dynamicW - w)
      }
      w = dynamicW

      if (lineCount > 1) {
        h = Math.max(h, Math.round((lineCount * lineH + 14) * scale))
      }
    } else {
      w = Math.max(w, Math.round(isPureText ? 28 * scale : 40 * scale))
      h = Math.max(h, Math.round(24 * scale))
      if (lineCount > 1 && isPureText) {
        h = Math.max(h, Math.round((lineCount * lineH + 8) * scale))
      }
    }

    const color = (attrs.fill as string) || (data.textColor as string) || (data.fill as string) || '#1f2937'

    const fontWeight = data.bold || attrs.fontWeight === 'bold' ? 'bold' : 'normal'
    const fontStyle = data.italic || attrs.fontStyle === 'italic' ? 'italic' : 'normal'

    let textDecoration = 'none'
    const dec = (attrs.textDecoration as string) || ''
    const isUnderline = data.underline || dec.includes('underline')
    const isStrike = data.strike || dec.includes('line-through')
    if (isUnderline && isStrike) textDecoration = 'underline line-through'
    else if (isUnderline) textDecoration = 'underline'
    else if (isStrike) textDecoration = 'line-through'

    let defaultAlign: 'left' | 'center' | 'right' = 'center'
    if (isMindmapBranch) {
      defaultAlign = 'left'
    } else if (isPureText) {
      defaultAlign = 'center'
    }
    const align = isPureText ? 'center' : (data.align || defaultAlign)
    const verticalAlign = data.verticalAlign || 'middle'

    // 考虑边框 1.5px，可用高度为 innerH = h - 3
    const innerH = Math.max(0, h - 3)
    let paddingTop = 0
    if (verticalAlign === 'middle') {
      paddingTop = Math.max(0, Math.round((innerH - approxTextH) / 2))
    } else if (verticalAlign === 'bottom') {
      paddingTop = Math.max(0, Math.round(innerH - approxTextH - 2))
    } else {
      paddingTop = Math.max(0, Math.round(4 * scale))
    }

    let paddingLeft = 0
    let paddingRight = 0
    if (isPureText) {
      paddingLeft = 0
      paddingRight = 0
    } else if (align === 'left') {
      const basePadding = isMindmapBranch ? 8 : 12
      paddingLeft = Math.max(0, Math.round(basePadding * scale - 1.5))
      paddingRight = Math.max(0, Math.round(4 * scale))
    } else if (align === 'right') {
      paddingLeft = Math.max(0, Math.round(4 * scale))
      paddingRight = Math.max(0, Math.round(12 * scale - 1.5))
    } else {
      paddingLeft = 0
      paddingRight = 0
    }

    let borderRadius = '4px'
    if (activeNode.shape === 'circle' || data.shapeId === 'circle') {
      borderRadius = '50%'
    } else if (isMindmapRoot) {
      borderRadius = '8px'
    } else if (activeNode.shape === 'rect' || data.shapeId === 'rect') {
      borderRadius = '4px'
    }

    return {
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      width: `${w}px`,
      height: `${h}px`,
      fontSize: `${fontSize}px`,
      lineHeight: '1.45',
      color,
      fontWeight,
      fontStyle,
      textDecoration,
      textAlign: align === 'justify' ? 'left' : align,
      paddingTop: `${paddingTop}px`,
      paddingBottom: '0px',
      paddingLeft: `${paddingLeft}px`,
      paddingRight: `${paddingRight}px`,
      borderRadius,
      transform: angle ? `rotate(${angle}deg)` : undefined,
      transformOrigin: 'center center',
      zIndex: 90,
    }
  } catch {
    return null
  }
}
