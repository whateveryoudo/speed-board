import { Graph } from '@antv/x6'

/**
 * 注册自定义文本图元节点 (Speed Text Node) 与便签贴纸节点 (Sticky Note)
 */
export function registerTextNode(): void {
  Graph.registerNode(
    'speed-text-node',
    {
      inherit: 'rect',
      markup: [
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
        body: {
          fill: 'transparent',
          stroke: 'transparent',
          strokeWidth: 0,
        },
        label: {
          text: '文本',
          fontSize: 14,
          fill: '#262626',
          textAnchor: 'start',
          textVerticalAnchor: 'middle',
          refX: 8,
          refY: '50%',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        },
      },
    },
    true
  )

  Graph.registerNode(
    'speed-sticky-node',
    {
      inherit: 'rect',
      markup: [
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
        body: {
          fill: '#fef3c7',
          stroke: '#f59e0b',
          strokeWidth: 1,
          rx: 4,
          ry: 4,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.08))',
        },
        label: {
          fontSize: 14,
          fill: '#78350f',
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          refX: '50%',
          refY: '50%',
        },
      },
    },
    true
  )
}
