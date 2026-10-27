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
  const getSelectedEdge = (): any | null => {
    const board = getBoard()
    if (!board) return null
    const cell = board.selectedElements?.find((c: any) => c.shape === 'elbow' || c.shape === 'straight' || c.shape === 'curve' || c.type === 'arrow-line')
    return cell || null
  }

  /** 设置线条连接线型 (折线 / 直线 / 曲线) */
  const setLineType = (type: 'elbow' | 'straight' | 'curve') => {
    const board = getBoard()
    if (!board) return
    board.setShapeProperty({ shape: type })
  }

  /** 获取当前线条类型 */
  const getLineType = (): 'elbow' | 'straight' | 'curve' => {
    const edge = getSelectedEdge()
    if (!edge) return 'straight'
    return edge.shape || 'straight'
  }

  /** 反转线条起始与结束方向 (⇄) */
  const reverseLineDirection = () => {
    const board = getBoard()
    const edge = getSelectedEdge()
    if (!board || !edge || !edge.points) return

    const points = [...edge.points].reverse()
    const sourceMarker = edge.targetMarker || 'none'
    const targetMarker = edge.sourceMarker || 'none'

    board.setShapeProperty({ points, sourceMarker, targetMarker })
  }

  /** 设置起点/终点箭头类型 */
  const setArrowMarker = (
    position: 'source' | 'target',
    markerId: string
  ) => {
    const board = getBoard()
    if (!board) return

    let mark = 'none'
    if (markerId === 'classic-arrow') mark = 'arrow'
    else if (markerId === 'block') mark = 'solid-triangle'
    else if (markerId === 'hollow-triangle') mark = 'hollow-triangle'
    else if (markerId !== 'none') mark = 'arrow'

    const key = position === 'source' ? 'sourceMarker' : 'targetMarker'
    board.setShapeProperty({ [key]: mark })
  }

  /** 获取线条当前文字 */
  const getLineText = (): string => {
    const edge = getSelectedEdge()
    if (!edge) return ''
    return edge.texts?.[0]?.text || ''
  }

  /** 设置或清空线条中间文本 */
  const setLineText = (text: string) => {
    const board = getBoard()
    if (!board) return
    board.setShapeProperty({ texts: text ? [{ text }] : [] })
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
