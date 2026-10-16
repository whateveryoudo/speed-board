import { Graph } from '@antv/x6'

/**
 * 注册自定义 SVG 图标节点 (Speed Icon Node)
 */
export function registerIconNode(): void {
  Graph.registerNode(
    'speed-icon-node',
    {
      inherit: 'rect',
      markup: [
        {
          tagName: 'rect',
          selector: 'bg',
        },
        {
          tagName: 'rect',
          selector: 'body',
        },
        {
          tagName: 'g',
          selector: 'iconGroup',
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
        body: {
          fill: 'transparent',
          stroke: 'transparent',
          strokeWidth: 0,
        },
        iconGroup: {
          refX: '50%',
          refY: '40%',
        },
        label: {
          fontSize: 12,
          fill: '#333333',
          textAnchor: 'middle',
          textVerticalAnchor: 'top',
          refX: '50%',
          refY: '80%',
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
          { group: 'top', id: 'port-top' },
          { group: 'right', id: 'port-right' },
          { group: 'bottom', id: 'port-bottom' },
          { group: 'left', id: 'port-left' },
        ],
      },
    },
    true
  )
}
