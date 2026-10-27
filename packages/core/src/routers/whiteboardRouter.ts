export interface RoutePoint {
  x: number
  y: number
}

export interface BBox {
  x: number
  y: number
  width: number
  height: number
}

function getNormal(port?: string): { x: number; y: number } | null {
  if (!port) return null
  const p = port.toLowerCase()
  if (p.includes('top')) return { x: 0, y: -1 }
  if (p.includes('bottom')) return { x: 0, y: 1 }
  if (p.includes('left')) return { x: -1, y: 0 }
  if (p.includes('right')) return { x: 1, y: 0 }
  return null
}

/**
 * 语雀/腾讯白板 1:1 标准几何正交折线计算算法 (Whiteboard Orthogonal Router)
 * 拖拽预览与松手落线 100% 共享此函数，绝无假想绕圈、自交或怪异反折
 */
export function calculateWhiteboardRoute(
  p1: RoutePoint,
  p2: RoutePoint,
  sourcePort?: string,
  targetPort?: string,
  sourceBBox?: BBox,
  targetBBox?: BBox
): RoutePoint[] {
  const n1 = getNormal(sourcePort)
  const n2 = getNormal(targetPort)
  const margin = 20

  const s1 = n1 ? { x: Math.round(p1.x + n1.x * margin), y: Math.round(p1.y + n1.y * margin) } : { ...p1 }
  const s2 = n2 ? { x: Math.round(p2.x + n2.x * margin), y: Math.round(p2.y + n2.y * margin) } : { ...p2 }

  const raw: RoutePoint[] = []
  if (n1) raw.push(s1)

  if (n1 && n1.y !== 0) {
    // 1. 出发端为垂直法线 (top / bottom)
    if (n2 && n2.x !== 0) {
      // 目标为水平法线 (left / right) -> 拐点为 (s2.x, s1.y)
      let clearY = s1.y
      if (targetBBox && clearY >= targetBBox.y && clearY <= targetBBox.y + targetBBox.height) {
        clearY = n1.y < 0 ? targetBBox.y - margin : targetBBox.y + targetBBox.height + margin
        raw.push({ x: s1.x, y: clearY })
      }
      raw.push({ x: s2.x, y: clearY })
    } else if (n2 && n2.y !== 0) {
      // 目标也是垂直法线 (top / bottom)
      if (n1.y * (s2.y - s1.y) >= 0 && n2.y * (s1.y - s2.y) >= 0) {
        const midY = Math.round((s1.y + s2.y) / 2)
        raw.push({ x: s1.x, y: midY })
        raw.push({ x: s2.x, y: midY })
      } else if (n1.y === n2.y) {
        const clearY = n1.y < 0 ? Math.min(s1.y, s2.y) : Math.max(s1.y, s2.y)
        raw.push({ x: s1.x, y: clearY })
        raw.push({ x: s2.x, y: clearY })
      } else {
        const detourX = s2.x >= s1.x
          ? Math.max(sourceBBox ? sourceBBox.x + sourceBBox.width : s1.x, targetBBox ? targetBBox.x + targetBBox.width : s2.x) + margin
          : Math.min(sourceBBox ? sourceBBox.x : s1.x, targetBBox ? targetBBox.x : s2.x) - margin
        raw.push({ x: detourX, y: s1.y })
        raw.push({ x: detourX, y: s2.y })
      }
    } else {
      // 目标为空白动态点
      raw.push({ x: s1.x, y: s2.y })
    }
  } else if (n1 && n1.x !== 0) {
    // 2. 出发端为水平法线 (left / right)
    if (n2 && n2.y !== 0) {
      // 目标为垂直法线 (top / bottom) -> 拐点为 (s1.x, s2.y)
      let clearX = s1.x
      if (targetBBox && clearX >= targetBBox.x && clearX <= targetBBox.x + targetBBox.width) {
        clearX = n1.x < 0 ? targetBBox.x - margin : targetBBox.x + targetBBox.width + margin
        raw.push({ x: clearX, y: s1.y })
      }
      raw.push({ x: clearX, y: s2.y })
    } else if (n2 && n2.x !== 0) {
      // 目标也是水平法线 (left / right)
      if (n1.x * (s2.x - s1.x) >= 0 && n2.x * (s1.x - s2.x) >= 0) {
        const midX = Math.round((s1.x + s2.x) / 2)
        raw.push({ x: midX, y: s1.y })
        raw.push({ x: midX, y: s2.y })
      } else if (n1.x === n2.x) {
        const clearX = n1.x < 0 ? Math.min(s1.x, s2.x) : Math.max(s1.x, s2.x)
        raw.push({ x: clearX, y: s1.y })
        raw.push({ x: clearX, y: s2.y })
      } else {
        const detourY = s2.y >= s1.y
          ? Math.max(sourceBBox ? sourceBBox.y + sourceBBox.height : s1.y, targetBBox ? targetBBox.y + targetBBox.height : s2.y) + margin
          : Math.min(sourceBBox ? sourceBBox.y : s1.y, targetBBox ? targetBBox.y : s2.y) - margin
        raw.push({ x: s1.x, y: detourY })
        raw.push({ x: s2.x, y: detourY })
      }
    } else {
      // 目标为空白动态点
      raw.push({ x: s2.x, y: s1.y })
    }
  } else {
    // 无出发法线约束
    raw.push({ x: s2.x, y: s1.y })
  }

  if (n2) raw.push(s2)

  // 清洗合并共线与重合点
  const allPoints = [p1, ...raw, p2]
  const cleaned: RoutePoint[] = []
  for (const pt of allPoints) {
    if (cleaned.length === 0) {
      cleaned.push(pt)
    } else {
      const prev = cleaned[cleaned.length - 1]
      if (Math.hypot(pt.x - prev.x, pt.y - prev.y) > 0.5) {
        if (cleaned.length >= 2) {
          const prev2 = cleaned[cleaned.length - 2]
          if (
            (Math.abs(prev2.x - prev.x) < 0.5 && Math.abs(prev.x - pt.x) < 0.5) ||
            (Math.abs(prev2.y - prev.y) < 0.5 && Math.abs(prev.y - pt.y) < 0.5)
          ) {
            cleaned[cleaned.length - 1] = pt
            continue
          }
        }
        cleaned.push(pt)
      }
    }
  }

  if (cleaned.length > 0 && Math.hypot(cleaned[0].x - p1.x, cleaned[0].y - p1.y) <= 0.5) {
    cleaned.shift()
  }
  if (cleaned.length > 0 && Math.hypot(cleaned[cleaned.length - 1].x - p2.x, cleaned[cleaned.length - 1].y - p2.y) <= 0.5) {
    cleaned.pop()
  }
  return cleaned
}

/**
 * 将拐点数组格式化为 SVG Path 字符串 `d`
 */
export function verticesToSvgPath(p1: RoutePoint, p2: RoutePoint, vertices: RoutePoint[]): string {
  let d = `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`
  for (const v of vertices) {
    d += ` L ${v.x.toFixed(1)} ${v.y.toFixed(1)}`
  }
  d += ` L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  return d
}

/**
 * X6 注册白板正交路由器适配器
 * 100% 复用 calculateWhiteboardRoute，保证拖拽预览与松手连线完全一致
 */
export const whiteboardElbowRouter = function (
  vertices: any[],
  _options: any,
  edgeView: any
): RoutePoint[] {
  // 如果用户手动调整了拐点，优先保留用户手调拐点
  if (vertices && vertices.length > 0) {
    return vertices
  }

  const sourceAnchor = edgeView.sourceAnchor || edgeView.sourcePoint
  const targetAnchor = edgeView.targetAnchor || edgeView.targetPoint
  if (!sourceAnchor || !targetAnchor) return []

  const sourcePort = edgeView.cell?.getSourcePortId?.() || ''
  const targetPort = edgeView.cell?.getTargetPortId?.() || ''

  const sourceCell =
    edgeView.sourceView?.cell ||
    edgeView.cell?.getSourceCell?.() ||
    edgeView.sourceCell
  const targetCell =
    edgeView.targetView?.cell ||
    edgeView.cell?.getTargetCell?.() ||
    edgeView.targetCell

  const sourceBBox = sourceCell?.getBBox?.() || edgeView.sourceBBox
  const targetBBox = targetCell?.getBBox?.() || edgeView.targetBBox

  return calculateWhiteboardRoute(sourceAnchor, targetAnchor, sourcePort, targetPort, sourceBBox, targetBBox)
}
