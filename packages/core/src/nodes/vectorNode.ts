import { Graph } from '@antv/x6'

/**
 * 注册自定义闭合矢量多边形节点 (Vector Polygon)
 */
export function registerVectorNode(): void {
  Graph.registerNode(
    'speed-vector-polygon',
    {
      inherit: 'path',
      attrs: {
        bg: {
          fill: 'transparent',
          stroke: 'transparent',
          strokeWidth: 0,
          pointerEvents: 'none',
        },
        body: {
          fill: '#fce7f3',
          stroke: '#333333',
          strokeWidth: 2,
          strokeDasharray: 'none',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          pointerEvents: 'auto',
        },
      },
    },
    true
  )
}
