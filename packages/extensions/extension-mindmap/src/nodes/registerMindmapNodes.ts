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
      zIndex: 10,
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
          tagName: 'foreignObject',
          selector: 'textFo',
          children: [
            {
              tagName: 'div',
              selector: 'textWrap',
            },
          ],
        },
        {
          tagName: 'g',
          selector: 'handleGroup',
          children: [
            {
              tagName: 'foreignObject',
              selector: 'handleFo',
            },
          ],
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
        underline: {
          display: 'none',
          refWidth: '100%',
          refY: '100%',
          refY2: -3,
          height: 3,
          rx: 1.5,
          ry: 1.5,
          fill: '#3b82f6',
          stroke: 'none',
        },
        textFo: {
          x: 12,
          y: 0,
          refWidth: '100%',
          refWidth2: -24,
          refHeight: '100%',
          style: {
            overflow: 'hidden',
          },
        },
        textWrap: {
          class: 'mindmap-node-text',
          style: {
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#1f2937',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            outline: 'none',
            wordBreak: 'break-word',
            userSelect: 'none',
            cursor: 'default',
            lineHeight: '1.4',
            textAlign: 'center',
          },
          html: '思维导图',
        },
        handleGroup: {
          refX: '100%',
          refY: '50%',
        },
        handleFo: {
          x: 0,
          y: -12,
          width: 80,
          height: 24,
          style: {
            overflow: 'visible',
          },
          html: '',
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
                magnet: 'passive',
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
                magnet: 'passive',
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
                magnet: 'passive',
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
                magnet: 'passive',
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
      zIndex: 10,
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
          tagName: 'foreignObject',
          selector: 'textFo',
          children: [
            {
              tagName: 'div',
              selector: 'textWrap',
            },
          ],
        },
        {
          tagName: 'g',
          selector: 'handleGroup',
          children: [
            {
              tagName: 'foreignObject',
              selector: 'handleFo',
            },
          ],
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
        textFo: {
          x: 8,
          y: 0,
          refWidth: '100%',
          refWidth2: -16,
          refHeight: '100%',
          style: {
            overflow: 'hidden',
          },
        },
        textWrap: {
          class: 'mindmap-node-text',
          style: {
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            fontSize: '14px',
            color: '#1f2937',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            outline: 'none',
            wordBreak: 'break-word',
            userSelect: 'none',
            cursor: 'default',
            lineHeight: '1.4',
            textAlign: 'left',
          },
          html: '分支主题',
        },
        handleGroup: {
          refX: '100%',
          refY: '50%',
        },
        handleFo: {
          x: 0,
          y: -12,
          width: 80,
          height: 24,
          style: {
            overflow: 'visible',
          },
          html: '',
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
                magnet: 'passive',
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
                magnet: 'passive',
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
                magnet: 'passive',
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
                magnet: 'passive',
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
