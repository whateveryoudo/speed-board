import type { Board } from '../Board'
import type { Point, PortDirection, PortSnapResult } from '@speed-board/shared'

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
      isCenterPort: boolean
      delta: number
    }> = [
      {
        edge: 'top',
        dist: distTop,
        unrotatedPt: {
          x: Math.abs(clampedX - cx) <= centerSnapX ? cx : clampedX,
          y: topY,
        },
        isCenterPort: Math.abs(clampedX - cx) <= centerSnapX,
        delta: Math.abs(clampedX - cx) <= centerSnapX ? 0 : clampedX - cx,
      },
      {
        edge: 'bottom',
        dist: distBottom,
        unrotatedPt: {
          x: Math.abs(clampedX - cx) <= centerSnapX ? cx : clampedX,
          y: bottomY,
        },
        isCenterPort: Math.abs(clampedX - cx) <= centerSnapX,
        delta: Math.abs(clampedX - cx) <= centerSnapX ? 0 : clampedX - cx,
      },
      {
        edge: 'left',
        dist: distLeft,
        unrotatedPt: {
          x: leftX,
          y: Math.abs(clampedY - cy) <= centerSnapY ? cy : clampedY,
        },
        isCenterPort: Math.abs(clampedY - cy) <= centerSnapY,
        delta: Math.abs(clampedY - cy) <= centerSnapY ? 0 : clampedY - cy,
      },
      {
        edge: 'right',
        dist: distRight,
        unrotatedPt: {
          x: rightX,
          y: Math.abs(clampedY - cy) <= centerSnapY ? cy : clampedY,
        },
        isCenterPort: Math.abs(clampedY - cy) <= centerSnapY,
        delta: Math.abs(clampedY - cy) <= centerSnapY ? 0 : clampedY - cy,
      },
    ]

    edgeCandidates.sort((a, b) => a.dist - b.dist)
    const best = edgeCandidates[0]

    if (best.dist <= snapThreshold) {
      if (!closest || best.dist < closest.distance) {
        const udx = best.unrotatedPt.x - cx
        const udy = best.unrotatedPt.y - cy
        const finalX = cx + (udx * cos - udy * sin)
        const finalY = cy + (udx * sin + udy * cos)

        const clientPt = graph.localToClient(finalX, finalY)

        closest = {
          node,
          edge: best.edge,
          port: best.isCenterPort ? `port-${best.edge}` : undefined,
          point: { x: finalX, y: finalY },
          distance: best.dist,
          isCenterPort: best.isCenterPort,
          delta: best.delta,
          offset: best.delta,
          screenPoint: {
            ox: clientPt.x,
            oy: clientPt.y,
            clientX: clientPt.x,
            clientY: clientPt.y,
          },
        }
      }
    }
  }

  return closest
}
