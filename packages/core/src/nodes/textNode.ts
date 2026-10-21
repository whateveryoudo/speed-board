import { Graph } from '@antv/x6'

/**
 * 注册自定义文本图元节点 (Speed Text Node) 与便签贴纸节点 (Sticky Note)
 * 内置原生 contenteditable 容器，实现 0 像素抖动就地输入 (对标语雀白板)
 * 同时保留兼容性的 label 选择器以确保 X6 基础属性操作稳定不崩
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
        textFo: {
          x: 0,
          y: 0,
          refWidth: '100%',
          refHeight: '100%',
          style: {
            overflow: 'visible',
          },
        },
        textWrap: {
          class: 'speed-node-text',
          html: '文本',
          style: {
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            fontSize: '14px',
            color: '#262626',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            outline: 'none',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            userSelect: 'none',
            cursor: 'default',
          },
        },
        label: {
          display: 'none',
          text: '文本',
          fontSize: 14,
          fill: '#262626',
          textAnchor: 'start',
          textVerticalAnchor: 'middle',
          refX: 8,
          refY: '50%',
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
        textFo: {
          x: 10,
          y: 10,
          refWidth: '100%',
          refWidth2: -20,
          refHeight: '100%',
          refHeight2: -20,
          style: {
            overflow: 'hidden',
          },
        },
        textWrap: {
          class: 'speed-node-text',
          html: '便签',
          style: {
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            color: '#78350f',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            outline: 'none',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            userSelect: 'none',
            cursor: 'default',
          },
        },
        label: {
          display: 'none',
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
