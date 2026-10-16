import type { Cell, Node } from '@antv/x6'
import type { Board } from '../Board'

/**
 * 对齐选中的多个图形节点
 */
export function alignSelectedNodes(
  board: Board,
  type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
) {
  const selectedNodes = board.graph.getSelectedCells().filter((c) => c.isNode())
  if (selectedNodes.length < 2) return

  const bboxes = selectedNodes.map((node) => ({
    node,
    bbox: node.getBBox(),
  }))

  if (type === 'left') {
    const minX = Math.min(...bboxes.map((b) => b.bbox.x))
    bboxes.forEach(({ node, bbox }) => {
      node.setPosition(minX, bbox.y)
    })
  } else if (type === 'center') {
    const minX = Math.min(...bboxes.map((b) => b.bbox.x))
    const maxRight = Math.max(...bboxes.map((b) => b.bbox.right))
    const targetCenter = (minX + maxRight) / 2
    bboxes.forEach(({ node, bbox }) => {
      node.setPosition(targetCenter - bbox.width / 2, bbox.y)
    })
  } else if (type === 'right') {
    const maxRight = Math.max(...bboxes.map((b) => b.bbox.right))
    bboxes.forEach(({ node, bbox }) => {
      node.setPosition(maxRight - bbox.width, bbox.y)
    })
  } else if (type === 'top') {
    const minY = Math.min(...bboxes.map((b) => b.bbox.y))
    bboxes.forEach(({ node, bbox }) => {
      node.setPosition(bbox.x, minY)
    })
  } else if (type === 'middle') {
    const minY = Math.min(...bboxes.map((b) => b.bbox.y))
    const maxBottom = Math.max(...bboxes.map((b) => b.bbox.bottom))
    const targetMiddle = (minY + maxBottom) / 2
    bboxes.forEach(({ node, bbox }) => {
      node.setPosition(bbox.x, targetMiddle - bbox.height / 2)
    })
  } else if (type === 'bottom') {
    const maxBottom = Math.max(...bboxes.map((b) => b.bbox.bottom))
    bboxes.forEach(({ node, bbox }) => {
      node.setPosition(bbox.x, maxBottom - bbox.height)
    })
  }
}

/**
 * 水平/垂直均分分布选中的图形节点
 */
export function distributeSelectedNodes(board: Board, type: 'horizontal' | 'vertical') {
  const selectedNodes = board.graph.getSelectedCells().filter((c) => c.isNode())
  if (selectedNodes.length < 3) return

  if (type === 'horizontal') {
    const sorted = selectedNodes
      .map((node) => ({ node, bbox: node.getBBox() }))
      .sort((a, b) => a.bbox.x - b.bbox.x)

    const first = sorted[0].bbox
    const last = sorted[sorted.length - 1].bbox
    const totalElementsWidth = sorted.slice(1, -1).reduce((acc, curr) => acc + curr.bbox.width, 0)
    const totalSpan = last.x - first.right
    const gap = (totalSpan - totalElementsWidth) / (sorted.length - 1)

    let currentX = first.right + gap
    for (let i = 1; i < sorted.length - 1; i++) {
      sorted[i].node.setPosition(currentX, sorted[i].bbox.y)
      currentX += sorted[i].bbox.width + gap
    }
  } else if (type === 'vertical') {
    const sorted = selectedNodes
      .map((node) => ({ node, bbox: node.getBBox() }))
      .sort((a, b) => a.bbox.y - b.bbox.y)

    const first = sorted[0].bbox
    const last = sorted[sorted.length - 1].bbox
    const totalElementsHeight = sorted.slice(1, -1).reduce((acc, curr) => acc + curr.bbox.height, 0)
    const totalSpan = last.y - first.bottom
    const gap = (totalSpan - totalElementsHeight) / (sorted.length - 1)

    let currentY = first.bottom + gap
    for (let i = 1; i < sorted.length - 1; i++) {
      sorted[i].node.setPosition(sorted[i].bbox.x, currentY)
      currentY += sorted[i].bbox.height + gap
    }
  }
}

/**
 * 置于顶层
 */
export function bringSelectedToFront(board: Board) {
  board.graph.getSelectedCells().forEach((cell) => cell.toFront())
}

/**
 * 置于底层
 */
export function sendSelectedToBack(board: Board) {
  board.graph.getSelectedCells().forEach((cell) => cell.toBack())
}

/**
 * 上移一层
 */
export function bringSelectedForward(board: Board) {
  board.graph.getSelectedCells().forEach((cell) => {
    const z = cell.getZIndex() || 1
    cell.setZIndex(z + 1)
  })
}

/**
 * 下移一层
 */
export function sendSelectedBackward(board: Board) {
  board.graph.getSelectedCells().forEach((cell) => {
    const z = cell.getZIndex() || 1
    cell.setZIndex(Math.max(1, z - 1))
  })
}

/**
 * 快速克隆/复制选中的图元 (Ctrl+D / Cmd+D)
 */
export function duplicateSelected(board: Board, offset = 24): Cell[] {
  const selected = board.graph.getSelectedCells()
  if (!selected.length) return []
  const clonedMap = board.graph.cloneCells(selected)
  const cloned = Object.values(clonedMap)
  cloned.forEach((cell) => {
    if (cell.isNode()) {
      const pos = cell.getPosition()
      cell.setPosition(pos.x + offset, pos.y + offset)
    }
  })
  board.graph.addCell(cloned)
  board.graph.cleanSelection()
  board.graph.select(cloned)
  return cloned
}

/**
 * 将选中的多个图形打包成组 (Ctrl+G / Cmd+G)
 */
export function groupSelected(board: Board): Node | null {
  const selectedNodes = board.graph.getSelectedCells().filter((c) => c.isNode())
  if (selectedNodes.length < 2) return null

  const bboxes = selectedNodes.map((n) => n.getBBox())
  const minX = Math.min(...bboxes.map((b) => b.x))
  const minY = Math.min(...bboxes.map((b) => b.y))
  const maxRight = Math.max(...bboxes.map((b) => b.right))
  const maxBottom = Math.max(...bboxes.map((b) => b.bottom))
  const pad = 6

  const groupNode = board.graph.addNode({
    shape: 'rect',
    x: minX - pad,
    y: minY - pad,
    width: maxRight - minX + pad * 2,
    height: maxBottom - minY + pad * 2,
    zIndex: Math.max(1, Math.min(...selectedNodes.map((n) => n.getZIndex() || 1)) - 1),
    attrs: {
      body: {
        fill: 'transparent',
        stroke: 'transparent',
        strokeWidth: 0,
        pointerEvents: 'visiblePainted',
      },
    },
    data: {
      type: 'group',
      isGroup: true,
    },
  })

  selectedNodes.forEach((node) => {
    groupNode.addChild(node)
  })

  board.graph.cleanSelection()
  board.graph.select(groupNode)
  return groupNode
}

/**
 * 解散选中节点的分组 (Ctrl+Shift+G / Cmd+Shift+G)
 */
export function ungroupSelected(board: Board) {
  const selected = board.graph.getSelectedCells().filter((c) => c.isNode())
  if (!selected.length) return

  const childrenToSelect: any[] = []
  selected.forEach((node) => {
    const children = node.getChildren()
    if (children && children.length > 0) {
      children.forEach((child) => {
        node.removeChild(child)
        childrenToSelect.push(child)
      })
      board.graph.removeNode(node)
    }
  })

  if (childrenToSelect.length > 0) {
    board.graph.cleanSelection()
    board.graph.select(childrenToSelect)
  }
}

/**
 * 锁定/解锁选中的图元 (Ctrl+L / Cmd+L)
 */
export function toggleLockSelected(board: Board): boolean {
  const selected = board.graph.getSelectedCells()
  if (!selected.length) return false
  const anyUnlocked = selected.some((c) => !c.getData()?.locked)
  const newLocked = anyUnlocked

  selected.forEach((cell) => {
    const data = cell.getData() || {}
    cell.setData({ ...data, locked: newLocked })
    if (cell.isNode()) {
      cell.prop('movable', !newLocked)
    }
  })
  return newLocked
}

/**
 * 同步选框的旋转变换角度
 */
export function syncSelectionBoxesTransform(board: Board) {
  requestAnimationFrame(() => {
    const container = board.container.querySelector('.x6-widget-selection')
    if (!container) return
    const boxes = container.querySelectorAll('.x6-widget-selection-box')
    boxes.forEach((box) => {
      const id = box.getAttribute('data-cell-id')
      if (id) {
        const cell = board.graph.getCellById(id)
        if (cell && cell.isNode()) {
          const angle = cell.getAngle() || 0
          if (angle) {
            ;(box as HTMLElement).style.transform = `rotate(${angle}deg)`
            ;(box as HTMLElement).style.transformOrigin = 'center center'
          } else {
            ;(box as HTMLElement).style.transform = ''
          }
        }
      }
    })
  })
}
