import { Graph } from '@antv/x6'

/**
 * 注册思维导图平滑贝塞尔曲线连接器与专用边
 */
export function registerMindmapEdges(): void {
  // 1. 注册平滑贝塞尔分支连接器
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

  // 2. 注册思维导图专用 Edge 图元
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
}
