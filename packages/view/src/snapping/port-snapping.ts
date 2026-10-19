import type { Board } from '@speed-board/core'
import type { Point, PortDirection, PortSnapResult } from '../types'

/**
 * 寻找与鼠标当前画布坐标最近的节点边缘或连接桩（支持旋转角补偿与磁吸计算）
 */
export function findClosestPort(
  board: Board | null | undefined,
  localPt: Point,
  snapRadius = 22
): PortSnapResult | null {
  if (!board) return null
  const graph = board.graph
  const nodes = graph.getNodes()
  let closest: PortSnapResult | null = null

  for (const node of nodes) {
    const isMind = node.getData()?.type === 'mindmap-node'
    const isShape = board.isShapeNode(node)
    if (!isShape && !isMind) continue
    const pos = node.position()
    const size = node.size()
    if (!size || size.width <= 0 || size.height <= 0) continue

    const cx = pos.x + size.width / 2
    const cy = pos.y + size.height / 2
    const angle = (node.getAngle() || 0) * (Math.PI / 180)
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    const dx = localPt.x - cx
    const dy = localPt.y - cy
    const unrotatedX = cx + (dx * cos + dy * sin)
    const unrotatedY = cy + (-dx * sin + dy * cos)

    const leftX = pos.x
    const rightX = pos.x + size.width
    const topY = pos.y
    const bottomY = pos.y + size.height

    const snapThreshold = snapRadius

    const isInside =
      unrotatedX >= leftX &&
      unrotatedX <= rightX &&
      unrotatedY >= topY &&
      unrotatedY <= bottomY

    const isNear =
      unrotatedX >= leftX - snapThreshold &&
      unrotatedX <= rightX + snapThreshold &&
      unrotatedY >= topY - snapThreshold &&
      unrotatedY <= bottomY + snapThreshold

    if (!isInside && !isNear) continue

    const cornerPad = 2
    const clampedX = Math.max(leftX + cornerPad, Math.min(rightX - cornerPad, unrotatedX))
    const clampedY = Math.max(topY + cornerPad, Math.min(bottomY - cornerPad, unrotatedY))

    const distTop = Math.hypot(unrotatedX - clampedX, unrotatedY - topY)
    const distBottom = Math.hypot(unrotatedX - clampedX, unrotatedY - bottomY)
    const distLeft = Math.hypot(unrotatedX - leftX, unrotatedY - clampedY)
    const distRight = Math.hypot(unrotatedX - rightX, unrotatedY - clampedY)

    const centerSnapX = Math.min(6, size.width * 0.2)
    const centerSnapY = Math.min(6, size.height * 0.2)

    const edgeCandidates: Array<{
      edge: PortDirection
      dist: number
      unrotatedPt: Point
      isCenter: boolean
      offset: number
      delta: number
    }> = [
      {
        edge: 'top',
        dist: distTop,
        unrotatedPt: { x: clampedX, y: topY },
        isCenter: Math.abs(clampedX - cx) <= centerSnapX,
        offset: (clampedX - leftX) / size.width,
        delta: clampedX - cx,
      },
      {
        edge: 'bottom',
        dist: distBottom,
        unrotatedPt: { x: clampedX, y: bottomY },
        isCenter: Math.abs(clampedX - cx) <= centerSnapX,
        offset: (clampedX - leftX) / size.width,
        delta: clampedX - cx,
      },
      {
        edge: 'left',
        dist: distLeft,
        unrotatedPt: { x: leftX, y: clampedY },
        isCenter: Math.abs(clampedY - cy) <= centerSnapY,
        offset: (clampedY - topY) / size.height,
        delta: clampedY - cy,
      },
      {
        edge: 'right',
        dist: distRight,
        unrotatedPt: { x: rightX, y: clampedY },
        isCenter: Math.abs(clampedY - cy) <= centerSnapY,
        offset: (clampedY - topY) / size.height,
        delta: clampedY - cy,
      },
    ]

    edgeCandidates.sort((a, b) => a.dist - b.dist)
    const bestEdge = edgeCandidates[0]

    let targetUnrotatedPt: Point
    let isCenterPort = false
    let portDirection: PortDirection | undefined = undefined

    if (bestEdge.isCenter) {
      isCenterPort = true
      portDirection = bestEdge.edge
      if (bestEdge.edge === 'top') targetUnrotatedPt = { x: cx, y: topY }
      else if (bestEdge.edge === 'bottom') targetUnrotatedPt = { x: cx, y: bottomY }
      else if (bestEdge.edge === 'left') targetUnrotatedPt = { x: leftX, y: cy }
      else targetUnrotatedPt = { x: rightX, y: cy }
    } else {
      targetUnrotatedPt = bestEdge.unrotatedPt
    }

    const tdx = targetUnrotatedPt.x - cx
    const tdy = targetUnrotatedPt.y - cy
    const snappedLocalPt: Point = {
      x: cx + (tdx * cos - tdy * sin),
      y: cy + (tdx * sin + tdy * cos),
    }

    const clientPt = graph.localToClient(snappedLocalPt.x, snappedLocalPt.y)
    const distToCursor = Math.hypot(localPt.x - snappedLocalPt.x, localPt.y - snappedLocalPt.y)

    if (distToCursor <= snapRadius) {
      if (!closest || distToCursor < closest.distance) {
        closest = {
          node,
          isCenterPort,
          port: portDirection,
          edge: bestEdge.edge,
          offset: bestEdge.offset,
          delta: bestEdge.delta,
          localPoint: snappedLocalPt,
          screenPoint: {
            ox: clientPt.x,
            oy: clientPt.y,
            clientX: clientPt.x,
            clientY: clientPt.y,
          },
          distance: distToCursor,
        }
      }
    }
  }

  return closest
}
