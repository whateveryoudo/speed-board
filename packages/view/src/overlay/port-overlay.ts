import type { Board } from '@speed-board/core'
import type { AnchorPoints, PortDirection } from '../types'

/**
 * 计算选中国节点 4 方向锚点在视口/画布容器内的绝对坐标
 */
export function computePortPositions(
  board: Board | null | undefined,
  selectedNode: any,
  canvasWrapper: HTMLElement | null | undefined
): AnchorPoints | null {
  if (!selectedNode || !board || !canvasWrapper) return null
  try {
    const graph = board.graph
    const view = graph.findViewByCell(selectedNode)
    if (!view || !view.container) return null

    const cellElem = view.container as SVGElement
    const cellRect = cellElem.getBoundingClientRect()
    const wrapperRect = canvasWrapper.getBoundingClientRect()

    const cx = cellRect.left - wrapperRect.left + cellRect.width / 2
    const cy = cellRect.top - wrapperRect.top + cellRect.height / 2
    const offset = 14

    return {
      top: {
        x: cx,
        y: cellRect.top - wrapperRect.top - offset,
        ox: cellRect.left + cellRect.width / 2,
        oy: cellRect.top,
      },
      right: {
        x: cellRect.right - wrapperRect.left + offset,
        y: cy,
        ox: cellRect.right,
        oy: cellRect.top + cellRect.height / 2,
      },
      bottom: {
        x: cx,
        y: cellRect.bottom - wrapperRect.top + offset,
        ox: cellRect.left + cellRect.width / 2,
        oy: cellRect.bottom,
      },
      left: {
        x: cellRect.left - wrapperRect.left - offset,
        y: cy,
        ox: cellRect.left,
        oy: cellRect.top + cellRect.height / 2,
      },
    }
  } catch {
    return null
  }
}

/**
 * 计算快捷创建图形 Popover 的显示坐标偏移
 */
export function computeQuickConnectOffset(
  anchorPos: { x: number; y: number },
  direction: PortDirection,
  popoverWidth = 220,
  popoverHeight = 160
): { x: number; y: number } {
  let x = anchorPos.x
  let y = anchorPos.y
  const offset = 24

  if (direction === 'top') {
    x -= popoverWidth / 2
    y -= popoverHeight + offset
  } else if (direction === 'bottom') {
    x -= popoverWidth / 2
    y += offset
  } else if (direction === 'left') {
    x -= popoverWidth + offset
    y -= popoverHeight / 2
  } else {
    x += offset
    y -= popoverHeight / 2
  }

  return { x: Math.round(x), y: Math.round(y) }
}
