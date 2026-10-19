import { Graph } from '@antv/x6'

/**
 * 注册思维导图专属节点：中心主题 (speed-mindmap-root) 与分支节点 (speed-mindmap-node)
 */
export function registerMindmapNodes(): void {
  // 1. 中心主题根节点 (Card 矩形)
  Graph.registerNode(
    'speed-mindmap-root',
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
          tagName: 'text',
          selector: 'label',
        },
      ],
      attrs: {
        bg: {
          refWidth: '100%',
          refHeight: '100%',
          rx: 8,
          ry: 8,
          fill: 'transparent',
          stroke: 'transparent',
          strokeWidth: 0,
          pointerEvents: 'none',
        },
        body: {
          rx: 8,
          ry: 8,
          fill: '#f3f4f6',
          stroke: '#e5e7eb',
          strokeWidth: 1.5,
          cursor: 'move',
        },
        label: {
          text: '思维导图',
          fontSize: 16,
          fontWeight: 'bold',
          fill: '#1f2937',
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          refX: '50%',
          refY: '50%',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          pointerEvents: 'none',
        },
      },
      ports: {
        groups: {
          left: {
            position: 'left',
            attrs: {
              circle: {
                r: 3.5,
                stroke: '#3b82f6',
                strokeWidth: 1.5,
                fill: '#ffffff',
                opacity: 0,
                magnet: true,
              },
            },
          },
          right: {
            position: 'right',
            attrs: {
              circle: {
                r: 3.5,
                stroke: '#3b82f6',
                strokeWidth: 1.5,
                fill: '#ffffff',
                opacity: 0,
                magnet: true,
              },
            },
          },
          top: {
            position: 'top',
            attrs: {
              circle: {
                r: 3.5,
                stroke: '#3b82f6',
                strokeWidth: 1.5,
                fill: '#ffffff',
                opacity: 0,
                magnet: true,
              },
            },
          },
          bottom: {
            position: 'bottom',
            attrs: {
              circle: {
                r: 3.5,
                stroke: '#3b82f6',
                strokeWidth: 1.5,
                fill: '#ffffff',
                opacity: 0,
                magnet: true,
              },
            },
          },
        },
        items: [
          { id: 'left', group: 'left' },
          { id: 'right', group: 'right' },
          { id: 'top', group: 'top' },
          { id: 'bottom', group: 'bottom' },
        ],
      },
    },
    true
  )

  // 2. 分支主题节点 (支持下划线、胶囊、卡片样式)
  Graph.registerNode(
    'speed-mindmap-node',
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
          tagName: 'rect',
          selector: 'underline',
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
          rx: 6,
          ry: 6,
          fill: 'transparent',
          stroke: 'transparent',
          strokeWidth: 0,
          pointerEvents: 'none',
        },
        body: {
          fill: 'transparent',
          stroke: 'transparent',
          strokeWidth: 0,
          cursor: 'pointer',
        },
        underline: {
          display: 'none',
          refWidth: '100%',
          refY: '100%',
          refY2: -3,
          height: 3,
          rx: 1.5,
          ry: 1.5,
          fill: '#8b5cf6',
          stroke: 'none',
        },
        label: {
          text: '分支主题',
          fontSize: 14,
          fill: '#1f2937',
          textAnchor: 'start',
          textVerticalAnchor: 'middle',
          refX: 8,
          refY: '50%',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          pointerEvents: 'none',
        },
      },
      ports: {
        groups: {
          left: {
            position: 'left',
            attrs: {
              circle: {
                r: 3.5,
                stroke: '#3b82f6',
                strokeWidth: 1.5,
                fill: '#ffffff',
                opacity: 0,
                magnet: true,
              },
            },
          },
          right: {
            position: 'right',
            attrs: {
              circle: {
                r: 3.5,
                stroke: '#3b82f6',
                strokeWidth: 1.5,
                fill: '#ffffff',
                opacity: 0,
                magnet: true,
              },
            },
          },
          top: {
            position: 'top',
            attrs: {
              circle: {
                r: 3.5,
                stroke: '#3b82f6',
                strokeWidth: 1.5,
                fill: '#ffffff',
                opacity: 0,
                magnet: true,
              },
            },
          },
          bottom: {
            position: 'bottom',
            attrs: {
              circle: {
                r: 3.5,
                stroke: '#3b82f6',
                strokeWidth: 1.5,
                fill: '#ffffff',
                opacity: 0,
                magnet: true,
              },
            },
          },
        },
        items: [
          { id: 'left', group: 'left' },
          { id: 'right', group: 'right' },
          { id: 'top', group: 'top' },
          { id: 'bottom', group: 'bottom' },
        ],
      },
    },
    true
  )
}
