import type { Board } from '../Board'
import type { Point, PortDirection, PortSnapResult } from '@speed-board/shared'

/**
 * 寻找与鼠标当前画布坐标最近的节点边缘或连接桩（支持旋转角补偿与磁吸计算）
 */
export function findClosestPort(
  board: Board | null | undefined,
  localPt: Point,
  snapRadius = 36
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

    // 1. 优先检测贴合真实几何轮廓的连接桩（Ports）
    const ports = (node.getPorts?.() || []) as Array<{ id: string; args?: { x?: string | number; y?: string | number } }>
    if (ports.length > 0) {
      let closestNodePort: { port: any; dist: number; finalX: number; finalY: number } | null = null
      for (const p of ports) {
        let px = pos.x + size.width / 2
        let py = pos.y + size.height / 2
        if (typeof p.args?.x === 'string' && p.args.x.endsWith('%')) {
          px = pos.x + (parseFloat(p.args.x) / 100) * size.width
        } else if (typeof p.args?.x === 'number') {
          px = pos.x + p.args.x
        }
        if (typeof p.args?.y === 'string' && p.args.y.endsWith('%')) {
          py = pos.y + (parseFloat(p.args.y) / 100) * size.height
        } else if (typeof p.args?.y === 'number') {
          py = pos.y + p.args.y
        }

        const pdx = px - cx
        const pdy = py - cy
        const finalX = cx + (pdx * cos - pdy * sin)
        const finalY = cy + (pdx * sin + pdy * cos)
        const dist = Math.hypot(localPt.x - finalX, localPt.y - finalY)

        // 1. 优先检测强吸附中心落点 (阈值 14px)
        if (dist <= 14) {
          if (!closestNodePort || dist < closestNodePort.dist) {
            closestNodePort = { port: p, dist, finalX, finalY }
          }
        }
      }

      if (closestNodePort) {
        if (!closest || closestNodePort.dist < closest.distance) {
          const clientPt = graph.localToClient(closestNodePort.finalX, closestNodePort.finalY)
          closest = {
            node,
            edge: (closestNodePort.port.id as any) || 'top',
            port: closestNodePort.port.id,
            localPoint: { x: closestNodePort.finalX, y: closestNodePort.finalY },
            point: { x: closestNodePort.finalX, y: closestNodePort.finalY },
            distance: closestNodePort.dist,
            isCenterPort: true,
            delta: 0,
            offset: 0,
            screenPoint: {
              ox: clientPt.x,
              oy: clientPt.y,
              clientX: clientPt.x,
              clientY: clientPt.y,
            },
          }
        }
        continue
      }
      // 若距离中心落点超过 14px，允许光标沿边自由滑动并在边线上任意点连线 (1:1 语雀/腾讯白板)
    }

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

    if (isInside || best.dist <= snapThreshold) {
      if (!closest || best.dist < closest.distance) {
        const udx = best.unrotatedPt.x - cx
        const udy = best.unrotatedPt.y - cy
        const finalX = cx + (udx * cos - udy * sin)
        const finalY = cy + (udx * sin + udy * cos)

        const clientPt = graph.localToClient(finalX, finalY)
        const realPortId = node.hasPort?.(best.edge)
          ? best.edge
          : node.hasPort?.(`port-${best.edge}`)
            ? `port-${best.edge}`
            : best.edge

        closest = {
          node,
          edge: best.edge,
          port: best.isCenterPort ? realPortId : undefined,
          localPoint: { x: finalX, y: finalY },
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
