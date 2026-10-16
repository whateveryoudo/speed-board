import { Graph } from '@antv/x6'

export const IMAGE_ERROR_PLACEHOLDER = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240" fill="none"><rect width="320" height="240" fill="%23f9fafb" stroke="%23fca5a5" stroke-width="2" stroke-dasharray="6,6" rx="8"/><path d="M160 85v40M160 145h.01" stroke="%23ef4444" stroke-width="3" stroke-linecap="round"/><circle cx="160" cy="115" r="45" stroke="%23fee2e2" stroke-width="4"/><text x="160" y="172" fill="%23ef4444" font-size="14" font-weight="600" text-anchor="middle" font-family="sans-serif">图片上传失败</text><text x="160" y="195" fill="%239ca3af" font-size="12" text-anchor="middle" font-family="sans-serif">请点击重试或删除图元</text></svg>`

export function renderImageProgressHtml(progress: number, isError: boolean): string {
  const percent = Math.min(100, Math.max(0, Math.round(progress)))
  return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;position:relative;user-select:none;box-sizing:border-box;">` +
    `<div style="position:absolute;left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,0.38);border-radius:4px;"></div>` +
    `<div style="position:relative;z-index:10;display:inline-flex;align-items:center;background:#ffffff;padding:4px 12px;border-radius:16px;box-shadow:0 4px 14px rgba(0,0,0,0.22);gap:8px;border:1px solid rgba(0,0,0,0.06);height:32px;box-sizing:border-box;">` +
      `<svg width="16" height="16" viewBox="0 0 20 20" fill="#6b7280" style="flex-shrink:0;display:block;"><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/></svg>` +
      `<div style="width:96px;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;flex-shrink:0;position:relative;">` +
        `<div style="width:${isError ? 100 : percent}%;height:100%;background:${isError ? '#ef4444' : '#2563eb'};border-radius:3px;transition:width 0.25s cubic-bezier(0.4,0,0.2,1),background 0.2s ease;"></div>` +
      `</div>` +
      (isError
        ? `<svg width="14" height="14" viewBox="0 0 16 16" fill="#ef4444" style="flex-shrink:0;display:block;"><path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.5 10.086l-1.414 1.414L8 9.414l-2.086 2.086-1.414-1.414L6.586 8 4.5 5.914l1.414-1.414L8 6.586l2.086-2.086 1.414 1.414L9.414 8l2.086 2.086z"/></svg>`
        : `<span style="font-size:11px;font-weight:500;color:#4b5563;min-width:26px;text-align:left;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1;">${percent}%</span>`
      ) +
    `</div>` +
  `</div>`
}

/**
 * 注册自定义图片图元节点 (Speed Image Node - 支持缩放、4个连接桩点、自然比例)
 */
export function registerImageNode(): void {
  Graph.registerNode(
    'speed-image-node',
    {
      markup: [
        {
          tagName: 'rect',
          selector: 'bg',
        },
        {
          tagName: 'image',
          selector: 'image',
        },
        {
          tagName: 'foreignObject',
          selector: 'progressFo',
          children: [
            {
              ns: 'http://www.w3.org/1999/xhtml',
              tagName: 'body',
              selector: 'progressBody',
              attrs: {
                xmlns: 'http://www.w3.org/1999/xhtml',
              },
              style: {
                width: '100%',
                height: '100%',
                background: 'transparent',
                margin: '0',
                padding: '0',
                overflow: 'hidden',
              },
              children: [
                {
                  tagName: 'div',
                  selector: 'progressContent',
                  style: {
                    width: '100%',
                    height: '100%',
                    margin: '0',
                    padding: '0',
                  },
                },
              ],
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
        image: {
          refWidth: '100%',
          refHeight: '100%',
          preserveAspectRatio: 'none',
          pointerEvents: 'none',
        },
        progressFo: {
          refWidth: '100%',
          refHeight: '100%',
          x: 0,
          y: 0,
          style: {
            display: 'none',
            pointerEvents: 'none',
          },
        },
        label: {
          text: '',
          fontSize: 12,
          fill: '#1f2937',
          textAnchor: 'middle',
          textVerticalAnchor: 'top',
          refX: '50%',
          refY: '100%',
          refY2: 6,
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
