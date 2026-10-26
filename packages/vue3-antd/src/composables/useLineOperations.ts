import type { Board, Edge } from '@speed-board/core'

export interface ArrowheadPreset {
  id: string
  name: string
  /** 简要图标预览 SVG path */
  iconSvg: string
  /** X6 Marker 配置对象生成器 */
  getMarkerConfig: (color?: string, strokeWidth?: number) => any
}

/**
 * 常用箭头/端点预设库 (1:1 语雀白板端点矩阵)
 */
export const ARROWHEAD_PRESETS: ArrowheadPreset[] = [
  {
    id: 'none',
    name: '无端点',
    iconSvg: '<line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="2"/>',
    getMarkerConfig: () => null,
  },
  {
    id: 'classic-arrow',
    name: '普通箭头',
    iconSvg: '<line x1="2" y1="12" x2="18" y2="12" stroke="currentColor" stroke-width="2"/><polyline points="12 6 18 12 12 18" fill="none" stroke="currentColor" stroke-width="2"/>',
    getMarkerConfig: (color = '#4b5563') => ({
      name: 'classic',
      size: 7,
      attrs: {
        fill: color,
        stroke: color,
      },
    }),
  },
  {
    id: 'block',
    name: '实心三角',
    iconSvg: '<line x1="2" y1="12" x2="14" y2="12" stroke="currentColor" stroke-width="2"/><polygon points="14 7 22 12 14 17" fill="currentColor"/>',
    getMarkerConfig: (color = '#4b5563') => ({
      name: 'block',
      width: 6,
      height: 4.5,
      offset: -1.5,
      attrs: {
        fill: color,
        stroke: color,
      },
    }),
  },
  {
    id: 'hollow-triangle',
    name: '空心三角',
    iconSvg: '<line x1="2" y1="12" x2="14" y2="12" stroke="currentColor" stroke-width="2"/><polygon points="14 7 22 12 14 17" fill="#ffffff" stroke="currentColor" stroke-width="1.8"/>',
    getMarkerConfig: (color = '#4b5563') => ({
      name: 'block',
      width: 6,
      height: 4.5,
      offset: -1.5,
      attrs: {
        fill: '#ffffff',
        stroke: color,
        strokeWidth: 1.5,
      },
    }),
  },
  {
    id: 'diamond',
    name: '实心菱形',
    iconSvg: '<line x1="2" y1="12" x2="12" y2="12" stroke="currentColor" stroke-width="2"/><polygon points="16 7 21 12 16 17 11 12" fill="currentColor"/>',
    getMarkerConfig: (color = '#4b5563') => ({
      name: 'diamond',
      width: 8,
      height: 5,
      attrs: {
        fill: color,
        stroke: color,
      },
    }),
  },
  {
    id: 'hollow-diamond',
    name: '空心菱形',
    iconSvg: '<line x1="2" y1="12" x2="12" y2="12" stroke="currentColor" stroke-width="2"/><polygon points="16 7 21 12 16 17 11 12" fill="#ffffff" stroke="currentColor" stroke-width="1.8"/>',
    getMarkerConfig: (color = '#4b5563') => ({
      name: 'diamond',
      width: 8,
      height: 5,
      attrs: {
        fill: '#ffffff',
        stroke: color,
        strokeWidth: 1.5,
      },
    }),
  },
  {
    id: 'circle',
    name: '实心圆点',
    iconSvg: '<line x1="2" y1="12" x2="14" y2="12" stroke="currentColor" stroke-width="2"/><circle cx="17" cy="12" r="4" fill="currentColor"/>',
    getMarkerConfig: (color = '#4b5563') => ({
      name: 'circle',
      r: 3,
      attrs: {
        fill: color,
        stroke: color,
      },
    }),
  },
  {
    id: 'hollow-circle',
    name: '空心圆点',
    iconSvg: '<line x1="2" y1="12" x2="14" y2="12" stroke="currentColor" stroke-width="2"/><circle cx="17" cy="12" r="4" fill="#ffffff" stroke="currentColor" stroke-width="1.8"/>',
    getMarkerConfig: (color = '#4b5563') => ({
      name: 'circle',
      r: 3,
      attrs: {
        fill: '#ffffff',
        stroke: color,
        strokeWidth: 1.5,
      },
    }),
  },
  {
    id: 'cross',
    name: '十字端点',
    iconSvg: '<line x1="2" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2"/><line x1="16" y1="7" x2="16" y2="17" stroke="currentColor" stroke-width="2"/>',
    getMarkerConfig: (color = '#374151') => ({
      name: 'cross',
      size: 8,
      attrs: {
        stroke: color,
        strokeWidth: 2,
      },
    }),
  },
]

export function useLineOperations(getBoard: () => Board | null) {
  const getSelectedEdge = (): Edge | null => {
    const board = getBoard()
    if (!board) return null
    const cell = board.graph.getSelectedCells().find((c) => c.isEdge())
    return (cell as Edge) || null
  }

  /** 设置线条连接线型 (折线 / 直线 / 曲线) */
  const setLineType = (type: 'elbow' | 'straight' | 'curve') => {
    const edge = getSelectedEdge()
    if (!edge) return

    if (type === 'elbow') {
      edge.setRouter({ name: 'whiteboard-elbow' })
      edge.setConnector({ name: 'rounded', args: { radius: 8 } })
    } else if (type === 'curve') {
      edge.setRouter({ name: 'normal' })
      edge.setConnector({ name: 'smooth' })
    } else {
      // straight
      edge.setRouter({ name: 'normal' })
      edge.setConnector({ name: 'normal' })
    }
  }

  /** 获取当前线条类型 */
  const getLineType = (): 'elbow' | 'straight' | 'curve' => {
    const edge = getSelectedEdge()
    if (!edge) return 'straight'
    const router = edge.getRouter()
    const connector = edge.getConnector()
    if (router?.name === 'manhattan' || router?.name === 'whiteboard-elbow') return 'elbow'
    if (connector?.name === 'smooth') return 'curve'
    return 'straight'
  }

  /** 反转线条起始与结束方向 (⇄) */
  const reverseLineDirection = () => {
    const edge = getSelectedEdge()
    if (!edge) return

    const source = edge.getSource()
    const target = edge.getTarget()

    // 交换端点并保持属性
    edge.setSource(target)
    edge.setTarget(source)
  }

  /** 设置起点/终点箭头类型 */
  const setArrowMarker = (
    position: 'source' | 'target',
    markerId: string
  ) => {
    const edge = getSelectedEdge()
    if (!edge) return

    const preset = ARROWHEAD_PRESETS.find((p) => p.id === markerId) || ARROWHEAD_PRESETS[0]
    const strokeColor = String(edge.getAttrByPath('line/stroke') || '#374151')
    const strokeWidth = Number(edge.getAttrByPath('line/strokeWidth') || 2)
    const markerConfig = preset.getMarkerConfig(strokeColor, strokeWidth)

    const path = position === 'source' ? 'line/sourceMarker' : 'line/targetMarker'
    edge.setAttrByPath(path, markerConfig)
  }

  /** 获取线条当前文字 */
  const getLineText = (): string => {
    const edge = getSelectedEdge()
    if (!edge) return ''
    const labels = edge.getLabels() || []
    return String(labels[0]?.attrs?.text?.text || '')
  }

  /** 设置或清空线条中间文本 (1:1 语雀线条文字) */
  const setLineText = (text: string) => {
    const edge = getSelectedEdge()
    if (!edge) return

    if (!text || !text.trim()) {
      edge.setLabels([])
      return
    }

    edge.setLabels([
      {
        attrs: {
          text: {
            text: text.trim(),
            fill: '#1f2937',
            fontSize: 13,
            textAnchor: 'middle',
            textVerticalAnchor: 'middle',
          },
          rect: {
            fill: '#ffffff',
            stroke: '#e5e7eb',
            strokeWidth: 1,
            rx: 4,
            ry: 4,
            refWidth: '120%',
            refHeight: '130%',
            refX: '-10%',
            refY: '-15%',
          },
        },
        position: 0.5,
      },
    ])
  }

  return {
    arrowheadPresets: ARROWHEAD_PRESETS,
    getSelectedEdge,
    setLineType,
    getLineType,
    reverseLineDirection,
    setArrowMarker,
    getLineText,
    setLineText,
  }
}
