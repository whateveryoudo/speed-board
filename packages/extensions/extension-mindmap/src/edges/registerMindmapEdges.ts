import { Graph } from '@antv/x6'

/**
 * 注册思维导图平滑贝塞尔曲线连接器与专用边
 */
export function registerMindmapEdges(): void {
  // 1. 注册平滑贝塞尔分支连接器 (曲线)
  Graph.registerConnector(
    'mindmap-curve',
    (sourcePoint, targetPoint) => {
      const dx = Math.max(Math.abs(targetPoint.x - sourcePoint.x) * 0.5, 16)
      const factor = targetPoint.x >= sourcePoint.x ? 1 : -1
      const p1x = sourcePoint.x + dx * factor
      const p1y = sourcePoint.y
      const p2x = targetPoint.x - dx * factor
      const p2y = targetPoint.y
      return `M ${sourcePoint.x} ${sourcePoint.y} C ${p1x} ${p1y} ${p2x} ${p2y} ${targetPoint.x} ${targetPoint.y}`
    },
    true
  )

  // 2. 注册直角折线分支连接器 (直角，带平滑微圆角)
  Graph.registerConnector(
    'mindmap-straight',
    (sourcePoint, targetPoint) => {
      const factor = targetPoint.x >= sourcePoint.x ? 1 : -1
      const dy = targetPoint.y - sourcePoint.y
      if (Math.abs(dy) < 4) {
        return `M ${sourcePoint.x} ${sourcePoint.y} L ${targetPoint.x} ${targetPoint.y}`
      }
      const signY = dy > 0 ? 1 : -1
      const midX = sourcePoint.x + Math.min(24, Math.abs(targetPoint.x - sourcePoint.x) * 0.5) * factor
      const r = Math.min(6, Math.abs(dy) * 0.5, Math.abs(targetPoint.x - sourcePoint.x) * 0.5)
      return `M ${sourcePoint.x} ${sourcePoint.y} L ${midX - r * factor} ${sourcePoint.y} Q ${midX} ${sourcePoint.y} ${midX} ${sourcePoint.y + r * signY} L ${midX} ${targetPoint.y - r * signY} Q ${midX} ${targetPoint.y} ${midX + r * factor} ${targetPoint.y} L ${targetPoint.x} ${targetPoint.y}`
    },
    true
  )

  // 3. 注册思维导图专用 Edge 图元
  Graph.registerEdge(
    'speed-mindmap-edge',
    {
      inherit: 'edge',
      connector: {
        name: 'mindmap-curve',
      },
      sourceAnchor: {
        name: 'center',
      },
      targetAnchor: {
        name: 'center',
      },
      sourceConnectionPoint: {
        name: 'anchor',
      },
      targetConnectionPoint: {
        name: 'anchor',
      },
      attrs: {
        line: {
          stroke: '#8b5cf6',
          strokeWidth: 3,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          targetMarker: null, // 脑图分支无箭头
        },
      },
      zIndex: 1,
    },
    true
  )

  // 4. 注册概要大括号连接器 (平滑 curly bracket } / { 括弧)
  Graph.registerConnector(
    'mindmap-summary-bracket',
    (sourcePoint, targetPoint, _routePoints, args: any) => {
      const isLeft = args?.side === 'left'
      const topY = args && typeof args.topY === 'number' ? args.topY : sourcePoint.y - 20
      const bottomY = args && typeof args.bottomY === 'number' ? args.bottomY : sourcePoint.y + 20
      const bracketX = args && typeof args.bracketX === 'number' ? args.bracketX : targetPoint.x - 20
      const tipX = args && typeof args.tipX === 'number' ? args.tipX : (isLeft ? targetPoint.x + 6 : targetPoint.x - 6)
      const midY = args && typeof args.midY === 'number' ? args.midY : (topY + bottomY) / 2
      const h = Math.abs(bottomY - topY)
      const r = Math.min(8, Math.max(3, h / 4))

      if (isLeft) {
        return [
          `M ${bracketX} ${topY}`,
          `Q ${bracketX - r} ${topY} ${bracketX - r} ${topY + r}`,
          `L ${bracketX - r} ${midY - r}`,
          `Q ${bracketX - r} ${midY} ${tipX} ${midY}`,
          `Q ${bracketX - r} ${midY} ${bracketX - r} ${midY + r}`,
          `L ${bracketX - r} ${bottomY - r}`,
          `Q ${bracketX - r} ${bottomY} ${bracketX} ${bottomY}`,
          `M ${tipX} ${midY}`,
          `L ${targetPoint.x} ${targetPoint.y}`,
        ].join(' ')
      }

      return [
        `M ${bracketX} ${topY}`,
        `Q ${bracketX + r} ${topY} ${bracketX + r} ${topY + r}`,
        `L ${bracketX + r} ${midY - r}`,
        `Q ${bracketX + r} ${midY} ${tipX} ${midY}`,
        `Q ${bracketX + r} ${midY} ${bracketX + r} ${midY + r}`,
        `L ${bracketX + r} ${bottomY - r}`,
        `Q ${bracketX + r} ${bottomY} ${bracketX} ${bottomY}`,
        `M ${tipX} ${midY}`,
        `L ${targetPoint.x} ${targetPoint.y}`,
      ].join(' ')
    },
    true
  )

  // 5. 注册思维导图概要专用 Edge
  Graph.registerEdge(
    'speed-mindmap-summary-edge',
    {
      inherit: 'edge',
      connector: {
        name: 'mindmap-summary-bracket',
      },
      sourceAnchor: {
        name: 'center',
      },
      targetAnchor: {
        name: 'left',
      },
      attrs: {
        line: {
          stroke: '#64748b',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          targetMarker: null,
        },
      },
      zIndex: 2,
    },
    true
  )
}
