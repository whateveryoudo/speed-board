import { Graph } from '@antv/x6'

/**
 * 注册自定义全量矢量图形节点 (Speed Shape Node - 支持内部文字、4个连接桩点、动态SVG渲染)
 */
export function registerShapeNode(): void {
  Graph.registerNode(
    'speed-shape-node',
    {
      markup: [
        {
          tagName: 'rect',
          selector: 'bg',
        },
        {
          tagName: 'svg',
          selector: 'shapeBody',
        },
        {
          tagName: 'text',
          selector: 'label',
        },
      ],
      attrs: {
        bg: {
          refWidth: '100%',
          refHeight: '100%',
          fill: 'transparent',
          stroke: 'transparent',
          strokeWidth: 0,
          pointerEvents: 'all',
        },
        shapeBody: {
          refWidth: '100%',
          refHeight: '100%',
          viewBox: '0 0 32 32',
          preserveAspectRatio: 'none',
          pointerEvents: 'none',
          overflow: 'visible',
        },
        label: {
          text: '',
          fontSize: 14,
          fill: '#1f2937',
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          refX: '50%',
          refY: '50%',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          pointerEvents: 'none',
        },
      },
      ports: {
        groups: {
          top: {
            position: 'top',
            attrs: {
              circle: {
                r: 4.5,
                magnet: true,
                stroke: '#3b82f6',
                strokeWidth: 1.5,
                fill: '#ffffff',
                opacity: 0,
                style: {
                  cursor: 'crosshair',
                  transition: 'opacity 0.15s ease, transform 0.15s ease',
                },
              },
            },
          },
          right: {
            position: 'right',
            attrs: {
              circle: {
                r: 4.5,
                magnet: true,
                stroke: '#3b82f6',
                strokeWidth: 1.5,
                fill: '#ffffff',
                opacity: 0,
                style: {
                  cursor: 'crosshair',
                  transition: 'opacity 0.15s ease, transform 0.15s ease',
                },
              },
            },
          },
          bottom: {
            position: 'bottom',
            attrs: {
              circle: {
                r: 4.5,
                magnet: true,
                stroke: '#3b82f6',
                strokeWidth: 1.5,
                fill: '#ffffff',
                opacity: 0,
                style: {
                  cursor: 'crosshair',
                  transition: 'opacity 0.15s ease, transform 0.15s ease',
                },
              },
            },
          },
          left: {
            position: 'left',
            attrs: {
              circle: {
                r: 4.5,
                magnet: true,
                stroke: '#3b82f6',
                strokeWidth: 1.5,
                fill: '#ffffff',
                opacity: 0,
                style: {
                  cursor: 'crosshair',
                  transition: 'opacity 0.15s ease, transform 0.15s ease',
                },
              },
            },
          },
        },
        items: [
          { id: 'top', group: 'top' },
          { id: 'right', group: 'right' },
          { id: 'bottom', group: 'bottom' },
          { id: 'left', group: 'left' },
        ],
      },
    },
    true
  )
}
