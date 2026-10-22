import { Graph } from '@antv/x6'

/**
 * 注册自定义文本图元节点 (Speed Text Node) 与便签贴纸节点 (Sticky Note)
 * 采用 1:1 对标语雀白板的 In-Canvas 原生 foreignObject + contenteditable 架构
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
          class: 'speed-node-text selection-transparent',
          contenteditable: 'false',
          spellcheck: 'false',
          html: '文本',
          style: {
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            color: '#262626',
            lineHeight: '1.4',
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
          text: '文本',
          fontSize: 14,
          fill: '#262626',
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          refX: '50%',
          refY: '50%',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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
        body: {
          fill: '#fef3c7',
          stroke: '#f59e0b',
          strokeWidth: 1,
          rx: 4,
          ry: 4,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.08))',
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
          html: '便签',
          style: {
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            color: '#78350f',
            lineHeight: '1.4',
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
