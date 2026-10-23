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
          tagName: 'rect',
          selector: 'underline',
        },
        {
          tagName: 'foreignObject',
          selector: 'textFo',
          children: [
            {
              tagName: 'div',
              ns: 'http://www.w3.org/1999/xhtml',
              selector: 'contentWrap',
              children: [
                {
                  tagName: 'div',
                  ns: 'http://www.w3.org/1999/xhtml',
                  selector: 'markersWrap',
                },
                {
                  tagName: 'div',
                  ns: 'http://www.w3.org/1999/xhtml',
                  selector: 'textWrap',
                },
              ],
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
          x: 0,
          y: 0,
          refWidth: '100%',
          refHeight: '100%',
          style: {
            overflow: 'visible',
          },
        },
        contentWrap: {
          class: 'mindmap-node-content',
          style: {
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0px 14px',
            boxSizing: 'border-box',
            overflow: 'visible',
          },
        },
        markersWrap: {
          class: 'mindmap-node-markers',
          style: {
            display: 'none',
            alignItems: 'center',
            gap: '3px',
            marginRight: '4px',
            flexShrink: '0',
            userSelect: 'none',
            pointerEvents: 'none',
          },
          html: '',
        },
        textWrap: {
          class: 'mindmap-node-text',
          contenteditable: 'false',
          spellcheck: 'false',
          style: {
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#1f2937',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif',
            outline: 'none',
            whiteSpace: 'pre',
            userSelect: 'none',
            cursor: 'default',
            lineHeight: '1.4',
            textAlign: 'center',
            margin: '0px',
            padding: '0px',
            boxSizing: 'border-box',
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
        label: {
          display: 'none',
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
                r: 0,
                opacity: 0,
                magnet: false,
              },
            },
          },
          right: {
            position: 'right',
            attrs: {
              circle: {
                r: 0,
                opacity: 0,
                magnet: false,
              },
            },
          },
        },
        items: [
          { id: 'left', group: 'left' },
          { id: 'right', group: 'right' },
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
          tagName: 'foreignObject',
          selector: 'textFo',
          children: [
            {
              tagName: 'div',
              ns: 'http://www.w3.org/1999/xhtml',
              selector: 'contentWrap',
              children: [
                {
                  tagName: 'div',
                  ns: 'http://www.w3.org/1999/xhtml',
                  selector: 'markersWrap',
                },
                {
                  tagName: 'div',
                  ns: 'http://www.w3.org/1999/xhtml',
                  selector: 'textWrap',
                },
              ],
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
          refWidth: '100%',
          refHeight: '100%',
          rx: 6,
          ry: 6,
          fill: '#ffffff',
          stroke: '#8b5cf6',
          strokeWidth: 1.5,
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
          x: 0,
          y: 0,
          refWidth: '100%',
          refHeight: '100%',
          style: {
            overflow: 'visible',
          },
        },
        contentWrap: {
          class: 'mindmap-node-content',
          style: {
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0px 10px',
            boxSizing: 'border-box',
            overflow: 'visible',
          },
        },
        markersWrap: {
          class: 'mindmap-node-markers',
          style: {
            display: 'none',
            alignItems: 'center',
            gap: '3px',
            marginRight: '4px',
            flexShrink: '0',
            userSelect: 'none',
            pointerEvents: 'none',
          },
          html: '',
        },
        textWrap: {
          class: 'mindmap-node-text',
          contenteditable: 'false',
          spellcheck: 'false',
          style: {
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            color: '#1f2937',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif',
            outline: 'none',
            whiteSpace: 'pre',
            userSelect: 'none',
            cursor: 'default',
            lineHeight: '1.4',
            textAlign: 'center',
            margin: '0px',
            padding: '0px',
            boxSizing: 'border-box',
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
        label: {
          display: 'none',
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
            position: {
              name: 'left',
              args: { dy: 0 },
            },
            attrs: {
              circle: {
                r: 0,
                opacity: 0,
                magnet: false,
              },
            },
          },
          right: {
            position: {
              name: 'right',
              args: { dy: 0 },
            },
            attrs: {
              circle: {
                r: 0,
                opacity: 0,
                magnet: false,
              },
            },
          },
        },
        items: [
          { id: 'left', group: 'left' },
          { id: 'right', group: 'right' },
        ],
      },
    },
    true
  )
}
