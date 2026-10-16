/**
 * 像素级文本宽度与思维导图节点紧凑尺寸测量器
 */
let sharedCanvasCtx: CanvasRenderingContext2D | null = null

export function measureTextWidth(
  text: string,
  font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
): number {
  if (!text) return 0

  if (typeof document !== 'undefined') {
    try {
      if (!sharedCanvasCtx) {
        const canvas = document.createElement('canvas')
        sharedCanvasCtx = canvas.getContext('2d')
      }
      if (sharedCanvasCtx) {
        sharedCanvasCtx.font = font
        return Math.ceil(sharedCanvasCtx.measureText(text).width)
      }
    } catch {
      // fallback to character-based estimation
    }
  }

  // 区分 ASCII 半角字符与中文全角字符的精准备用估算
  let w = 0
  for (const ch of text) {
    w += ch.charCodeAt(0) <= 127 ? 7.5 : 14
  }
  return Math.ceil(w)
}

/**
 * 计算思维导图节点根据内容自适应的紧凑宽度
 * @param text 节点文字
 * @param isRoot 是否为根节点
 */
export function calculateMindmapNodeWidth(text: string, isRoot = false): number {
  const lines = (text || '').split('\n')
  const maxLine = lines.reduce((max, line) => (line.length > max.length ? line : max), '')

  const font = isRoot
    ? 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    : '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

  const textWidth = measureTextWidth(maxLine, font)

  if (isRoot) {
    // 根节点：Card 胶囊卡片，文字居中，左右各留 16px 呼吸间距
    return Math.max(90, textWidth + 32)
  }

  // 分支节点：左边 refX=8 (8px)，文字右侧留 10px 间隙直接衔接子分支/加号，不再多余空置
  return Math.max(48, textWidth + 18)
}
