export interface RoutePoint {
  x: number
  y: number
}

/**
 * 语雀白板 1:1 智能正交折线路由 (Whiteboard Elbow Router)
 * 1. 20px 阈值内自动锁平/锁直，输出纯直线（0 弯折），彻底解决“拉直线末端箭头打弯 S 弯”的顽疾
 * 2. 智能避让与正交入桩算法：
 *    - 当从水平端口连入垂直端口（如右侧端口 -> 底部端口）：以 L-形 拐入目标，垂直入桩，绝不在目标底边沿横向贴地爬行
 *    - 当从垂直端口连入水平端口（如底部端口 -> 右侧端口）：以 L-形 拐入目标，水平入桩
 *    - 同向端口（水平对水平 / 垂直对垂直）：在中点干净 Z-形 阶梯折弯，杜绝曼哈顿 10px 避障微小拐角
 */
export const whiteboardElbowRouter = function (
  vertices: any[],
  _options: any,
  edgeView: any
): RoutePoint[] {
  // 如果用户手动添加了拐点，优先尊重用户手调拐点
  if (vertices && vertices.length > 0) {
    return vertices
  }

  const sourceAnchor = edgeView.sourceAnchor || edgeView.sourcePoint
  const targetAnchor = edgeView.targetAnchor || edgeView.targetPoint
  if (!sourceAnchor || !targetAnchor) return []

  const dx = targetAnchor.x - sourceAnchor.x
  const dy = targetAnchor.y - sourceAnchor.y

  // 1. 水平或垂直 20px 阈值内：直接返回空拐点，输出绝对笔直的水平/垂直线
  if (Math.abs(dy) <= 20 || Math.abs(dx) <= 20) {
    return []
  }

  const sourcePort = edgeView.cell?.getSourcePortId?.() || ''
  const targetPort = edgeView.cell?.getTargetPortId?.() || ''

  const isSourceHorizontal = sourcePort.includes('left') || sourcePort.includes('right')
  const isSourceVertical = sourcePort.includes('top') || sourcePort.includes('bottom')

  const isTargetHorizontal = targetPort.includes('left') || targetPort.includes('right')
  const isTargetVertical = targetPort.includes('top') || targetPort.includes('bottom')

  // 场景 A: Source 水平，Target 垂直 (例如 三角形右端口 -> 矩形下端口)
  // 必须直接以 L-形 拐入目标垂直端口，绝不能在矩形下边沿横向贴地爬行撞上！
  if (isSourceHorizontal && isTargetVertical) {
    return [{ x: targetAnchor.x, y: sourceAnchor.y }]
  }

  // 场景 B: Source 垂直，Target 水平 (例如 矩形下端口 -> 三角形右/左端口)
  // 必须直接以 L-形 拐入目标水平端口
  if (isSourceVertical && isTargetHorizontal) {
    return [{ x: sourceAnchor.x, y: targetAnchor.y }]
  }

  // 场景 C: 两端同为水平端口 (例如 left <-> right)
  if (isSourceHorizontal || isTargetHorizontal) {
    const midX = Math.round(sourceAnchor.x + dx / 2)
    return [
      { x: midX, y: sourceAnchor.y },
      { x: midX, y: targetAnchor.y },
    ]
  }

  // 场景 D: 两端同为垂直端口 (例如 top <-> bottom)
  if (isSourceVertical || isTargetVertical) {
    const midY = Math.round(sourceAnchor.y + dy / 2)
    return [
      { x: sourceAnchor.x, y: midY },
      { x: targetAnchor.x, y: midY },
    ]
  }

  // 默认平分中点
  const midX = Math.round(sourceAnchor.x + dx / 2)
  return [
    { x: midX, y: sourceAnchor.y },
    { x: midX, y: targetAnchor.y },
  ]
}
