import { Graph } from '@antv/x6'

/**
 * 注册自定义自由手绘路径节点 (Freehand Path)
 */
export function registerFreehandNode(): void {
  Graph.registerNode(
    'speed-freehand-path',
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
          fill: 'none',
          stroke: '#333333',
          strokeWidth: 3,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          pointerEvents: 'stroke',
        },
      },
    },
    true
  )
}
