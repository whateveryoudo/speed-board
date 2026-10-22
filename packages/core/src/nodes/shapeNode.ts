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
          tagName: 'foreignObject',
          selector: 'textFo',
          children: [
            {
              tagName: 'div',
              ns: 'http://www.w3.org/1999/xhtml',
              selector: 'textWrap',
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
        textFo: {
          x: 8,
          y: 8,
          refWidth: '100%',
          refWidth2: -16,
          refHeight: '100%',
          refHeight2: -16,
          style: {
            overflow: 'hidden',
          },
        },
        textWrap: {
          class: 'speed-node-text selection-transparent',
          contenteditable: 'false',
          spellcheck: 'false',
          html: '',
          style: {
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            color: '#1f2937',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif',
            outline: 'none',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            userSelect: 'none',
            cursor: 'default',
            margin: '0px',
            padding: '0px',
            boxSizing: 'border-box',
          },
        },
        label: {
          display: 'none',
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
                r: 5,
                magnet: true,
                stroke: '#3b82f6',
                strokeWidth: 1.5,
                fill: '#ffffff',
                style: {
                  cursor: 'crosshair',
                  transition: 'opacity 0.15s ease, transform 0.15s ease, r 0.15s ease',
                },
              },
            },
          },
          right: {
            position: 'right',
            attrs: {
              circle: {
                r: 5,
                magnet: true,
                stroke: '#3b82f6',
                strokeWidth: 1.5,
                fill: '#ffffff',
                style: {
                  cursor: 'crosshair',
                  transition: 'opacity 0.15s ease, transform 0.15s ease, r 0.15s ease',
                },
              },
            },
          },
          bottom: {
            position: 'bottom',
            attrs: {
              circle: {
                r: 5,
                magnet: true,
                stroke: '#3b82f6',
                strokeWidth: 1.5,
                fill: '#ffffff',
                style: {
                  cursor: 'crosshair',
                  transition: 'opacity 0.15s ease, transform 0.15s ease, r 0.15s ease',
                },
              },
            },
          },
          left: {
            position: 'left',
            attrs: {
              circle: {
                r: 5,
                magnet: true,
                stroke: '#3b82f6',
                strokeWidth: 1.5,
                fill: '#ffffff',
                style: {
                  cursor: 'crosshair',
                  transition: 'opacity 0.15s ease, transform 0.15s ease, r 0.15s ease',
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
