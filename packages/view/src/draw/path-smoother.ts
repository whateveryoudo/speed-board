import type { Point } from '../types'

/**
 * 将离散点序列拟合为平滑的 SVG 贝塞尔曲线路径
 */
export function pointsToSmoothSvgPath(points: Point[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} l 0.01 0.01`
  }
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`
  }

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
  for (let i = 1; i < points.length - 1; i++) {
    const midX = ((points[i].x + points[i + 1].x) / 2).toFixed(1)
    const midY = ((points[i].y + points[i + 1].y) / 2).toFixed(1)
    d += ` Q ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)} ${midX} ${midY}`
  }
  const last = points[points.length - 1]
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`
  return d
}

/**
 * 将矢量多边形顶点转为 SVG path 描述
 */
export function pointsToPolygonPath(
  points: Array<{ ox: number; oy: number } | Point>,
  closed = false
): string {
  if (points.length === 0) return ''
  const getX = (p: any) => (p.ox !== undefined ? p.ox : p.x)
  const getY = (p: any) => (p.oy !== undefined ? p.oy : p.y)

  let d = `M ${getX(points[0]).toFixed(1)} ${getY(points[0]).toFixed(1)}`
  for (let i = 1; i < points.length; i++) {
    d += ` L ${getX(points[i]).toFixed(1)} ${getY(points[i]).toFixed(1)}`
  }
  if (closed) {
    d += ' Z'
  }
  return d
}
