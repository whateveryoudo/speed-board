import type { Graph } from '@antv/x6'

export type PlaceholderType = 'before' | 'after' | 'child'

/**
 * 贝塞尔分支曲线生成器 (1:1 匹配 X6 mindmap-curve)
 */
function getMindmapCurvePath(
  source: { x: number; y: number },
  target: { x: number; y: number }
): string {
  const dx = Math.max(Math.abs(target.x - source.x) * 0.5, 16)
  const factor = target.x >= source.x ? 1 : -1
  const p1x = source.x + dx * factor
  const p1y = source.y
  const p2x = target.x - dx * factor
  const p2y = target.y
  return `M ${source.x} ${source.y} C ${p1x} ${p1y}, ${p2x} ${p2y}, ${target.x} ${target.y}`
}

/**
 * 直角折线分支生成器 (1:1 匹配 X6 mindmap-straight，带平滑微圆角)
 */
function getMindmapStraightPath(
  source: { x: number; y: number },
  target: { x: number; y: number }
): string {
  const factor = target.x >= source.x ? 1 : -1
  const dy = target.y - source.y
  if (Math.abs(dy) < 4) {
    return `M ${source.x} ${source.y} L ${target.x} ${target.y}`
  }
  const signY = dy > 0 ? 1 : -1
  const midX = source.x + Math.min(24, Math.abs(target.x - source.x) * 0.5) * factor
  const r = Math.min(6, Math.abs(dy) * 0.5, Math.abs(target.x - source.x) * 0.5)
  return `M ${source.x} ${source.y} L ${midX - r * factor} ${source.y} Q ${midX} ${source.y} ${midX} ${source.y + r * signY} L ${midX} ${target.y - r * signY} Q ${midX} ${target.y} ${midX + r * factor} ${target.y} L ${target.x} ${target.y}`
}

/**
 * 脑图拖拽视觉指示器 (SVG 级高性能渲染)
 * 管理两部分视觉元素：
 * 1. 跟随光标移动的 Ghost 克隆体 (半透明虚化卡片)
 * 2. 纯几何的 Placeholder 占位投影（无文字干扰）：
 *    - 【上方插队】父节点延伸出的虚线贝塞尔连线 + 目标上方圆角虚线占位卡片
 *    - 【下方插队】父节点延伸出的虚线贝塞尔连线 + 目标下方圆角虚线占位卡片
 *    - 【后面嵌套】当前节点延伸出的虚线贝塞尔连线 + 目标右侧圆角虚线占位卡片 + 目标高亮
 */
export class MindmapDragIndicator {
  private graph: Graph
  private overlayGroup: SVGGElement | null = null

  // 1. Ghost 克隆跟随体
  private ghostGroup: SVGGElement | null = null
  private ghostRect: SVGRectElement | null = null
  private ghostText: SVGTextElement | null = null

  // 2. Placeholder 占位投影组
  private placeholderGroup: SVGGElement | null = null
  private placeholderRect: SVGRectElement | null = null
  private placeholderTargetRect: SVGRectElement | null = null
  private placeholderBranchLine: SVGPathElement | null = null
  private placeholderInsertionBar: SVGGElement | null = null
  private placeholderBarLine: SVGRectElement | null = null
  private placeholderBarCircle: SVGCircleElement | null = null

  constructor(graph: Graph) {
    this.graph = graph
  }

  private ensureElements(): boolean {
    if (this.overlayGroup && this.overlayGroup.isConnected) return true

    const container = this.graph.container
    if (!container) return false

    const svgTarget =
      container.querySelector('.x6-graph-svg-overlay') ||
      container.querySelector('.x6-graph-svg-viewport')

    if (!svgTarget) return false

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    g.setAttribute('class', 'speed-mindmap-drag-indicator-layer')
    g.style.pointerEvents = 'none'

    // ==========================================
    // A. 占位投影层 (Placeholders)
    // ==========================================
    const pGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    pGroup.style.display = 'none'

    // 目标节点自身高亮框 (嵌套时使用)
    const pTargetRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    pTargetRect.setAttribute('fill', 'rgba(59, 130, 246, 0.08)')
    pTargetRect.setAttribute('stroke', '#3b82f6')
    pTargetRect.setAttribute('stroke-width', '2')
    pTargetRect.setAttribute('stroke-dasharray', '4 3')
    pTargetRect.setAttribute('rx', '6')
    pTargetRect.setAttribute('ry', '6')
    pTargetRect.style.display = 'none'
    pGroup.appendChild(pTargetRect)

    // 分支连线 (虚线贝塞尔曲线)
    const pBranchLine = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    pBranchLine.setAttribute('stroke', '#3b82f6')
    pBranchLine.setAttribute('stroke-width', '2.5')
    pBranchLine.setAttribute('stroke-dasharray', '5 3')
    pBranchLine.setAttribute('stroke-linecap', 'round')
    pBranchLine.setAttribute('fill', 'none')
    pBranchLine.style.display = 'none'
    pGroup.appendChild(pBranchLine)

    // 纯几何占位虚线框 (不渲染任何文字，干净拟物)
    const pRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    pRect.setAttribute('fill', 'rgba(59, 130, 246, 0.12)')
    pRect.setAttribute('stroke', '#3b82f6')
    pRect.setAttribute('stroke-width', '2')
    pRect.setAttribute('stroke-dasharray', '5 3')
    pRect.setAttribute('rx', '6')
    pRect.setAttribute('ry', '6')
    pGroup.appendChild(pRect)

    // 同级插队专用水平指示条 (居中于节点间距缝隙，彻底杜绝与相邻节点内容重叠遮挡)
    const pBarGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    pBarGroup.style.display = 'none'

    const pBarLine = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    pBarLine.setAttribute('height', '3.5')
    pBarLine.setAttribute('rx', '1.75')
    pBarLine.setAttribute('ry', '1.75')
    pBarLine.setAttribute('fill', '#3b82f6')
    pBarGroup.appendChild(pBarLine)

    const pBarCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    pBarCircle.setAttribute('r', '4')
    pBarCircle.setAttribute('fill', '#3b82f6')
    pBarGroup.appendChild(pBarCircle)

    pGroup.appendChild(pBarGroup)

    g.appendChild(pGroup)

    // ==========================================
    // B. Ghost 影子跟随层
    // ==========================================
    const ghGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    ghGroup.style.display = 'none'
    ghGroup.style.opacity = '0.78'
    ghGroup.style.filter = 'drop-shadow(0 6px 14px rgba(37, 99, 235, 0.28))'

    const ghRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    ghRect.setAttribute('fill', '#ffffff')
    ghRect.setAttribute('stroke', '#3b82f6')
    ghRect.setAttribute('stroke-width', '1.5')
    ghRect.setAttribute('rx', '6')
    ghRect.setAttribute('ry', '6')
    ghGroup.appendChild(ghRect)

    const ghText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    ghText.setAttribute('fill', '#1f2937')
    ghText.setAttribute('font-size', '13')
    ghText.setAttribute('dominant-baseline', 'central')
    ghText.setAttribute(
      'font-family',
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    )
    ghGroup.appendChild(ghText)

    g.appendChild(ghGroup)

    svgTarget.appendChild(g)

    this.overlayGroup = g
    this.placeholderGroup = pGroup
    this.placeholderTargetRect = pTargetRect
    this.placeholderBranchLine = pBranchLine
    this.placeholderRect = pRect
    this.placeholderInsertionBar = pBarGroup
    this.placeholderBarLine = pBarLine
    this.placeholderBarCircle = pBarCircle

    this.ghostGroup = ghGroup
    this.ghostRect = ghRect
    this.ghostText = ghText

    return true
  }

  /**
   * 初始化并显示 Ghost 虚化卡片 (干净纯粹的悬浮卡片，无底部杂线)
   */
  public initGhost(text: string, width: number, height: number): void {
    if (!this.ensureElements()) return
    if (!this.ghostGroup || !this.ghostRect || !this.ghostText) return

    this.ghostGroup.style.display = 'block'
    this.ghostRect.setAttribute('width', String(width))
    this.ghostRect.setAttribute('height', String(height))

    this.ghostText.textContent = text || '分支主题'
    this.ghostText.setAttribute('x', '10')
    this.ghostText.setAttribute('y', String(height / 2))
  }

  /**
   * 更新 Ghost 影子跟随光标的位置 (居中对齐光标)
   */
  public updateGhostPosition(centerX: number, centerY: number, width: number, height: number): void {
    if (!this.ghostGroup) return
    const x = Math.round(centerX - width / 2)
    const y = Math.round(centerY - height / 2)
    this.ghostGroup.setAttribute('transform', `translate(${x}, ${y})`)
  }

  /**
   * 显示纯几何 Placeholder 占位投影：
   * 1. 'before': 目标上方水平插槽指示条 + 父节点延伸出的连线 (避免遮挡已有节点)
   * 2. 'after':  目标下方水平插槽指示条 + 父节点延伸出的连线 (避免遮挡已有节点)
   * 3. 'child':  目标右侧子分支虚线卡片 + 目标延伸出的连线 + 目标高亮框
   */
  public showPlaceholder(
    type: PlaceholderType,
    targetBBox: { x: number; y: number; width: number; height: number },
    parentBBox: { x: number; y: number; width: number; height: number } | null,
    draggedWidth = 90,
    draggedHeight = 32,
    branchColor = '#3b82f6',
    branchType: 'curve' | 'straight' = 'curve',
    slotY?: number
  ): void {
    if (!this.ensureElements()) return
    if (
      !this.placeholderGroup ||
      !this.placeholderRect ||
      !this.placeholderTargetRect ||
      !this.placeholderBranchLine ||
      !this.placeholderInsertionBar ||
      !this.placeholderBarLine ||
      !this.placeholderBarCircle
    ) {
      return
    }

    this.placeholderGroup.style.display = 'block'
    const boxW = Math.max(draggedWidth, 80)
    const boxH = Math.max(draggedHeight, 32)

    let placeholderX = 0
    let placeholderY = 0
    let sourcePoint = { x: 0, y: 0 }
    let targetPoint = { x: 0, y: 0 }

    if (type === 'before' || type === 'after') {
      // 同级插队：纯粹干净的单条水平指示线 (Insertion Bar)，居中于节点间距缝隙，彻底杜绝与相邻节点重叠遮挡与多点跳跃
      this.placeholderTargetRect.style.display = 'none'
      this.placeholderRect.style.display = 'none'
      this.placeholderInsertionBar.style.display = 'block'

      const barW = Math.max(draggedWidth, targetBBox.width, 70)
      const barX = targetBBox.x
      const barY =
        slotY !== undefined
          ? Math.round(slotY)
          : type === 'before'
          ? Math.round(targetBBox.y - 8)
          : Math.round(targetBBox.y + targetBBox.height + 8)

      this.placeholderBarLine.setAttribute('x', String(barX))
      this.placeholderBarLine.setAttribute('y', String(barY - 1.75))
      this.placeholderBarLine.setAttribute('width', String(barW))
      this.placeholderBarLine.setAttribute('fill', branchColor || '#3b82f6')

      this.placeholderBarCircle.setAttribute('cx', String(barX))
      this.placeholderBarCircle.setAttribute('cy', String(barY))
      this.placeholderBarCircle.setAttribute('fill', branchColor || '#3b82f6')

      if (parentBBox) {
        sourcePoint = {
          x: parentBBox.x + parentBBox.width,
          y: parentBBox.y + parentBBox.height / 2,
        }
      } else {
        sourcePoint = {
          x: targetBBox.x - 45,
          y: barY,
        }
      }

      targetPoint = {
        x: barX,
        y: barY,
      }
    } else if (type === 'child') {
      // 后面嵌套为子分支：右侧展示完整尺寸虚线占位卡片 + 目标高亮轮廓
      if (this.placeholderInsertionBar) {
        this.placeholderInsertionBar.style.display = 'none'
      }
      this.placeholderTargetRect.style.display = 'block'
      this.placeholderRect.style.display = 'block'

      const pad = 4
      this.placeholderTargetRect.setAttribute('x', String(targetBBox.x - pad))
      this.placeholderTargetRect.setAttribute('y', String(targetBBox.y - pad))
      this.placeholderTargetRect.setAttribute('width', String(targetBBox.width + pad * 2))
      this.placeholderTargetRect.setAttribute('height', String(targetBBox.height + pad * 2))
      this.placeholderTargetRect.setAttribute('stroke', branchColor || '#3b82f6')

      placeholderX = targetBBox.x + targetBBox.width + 36
      placeholderY = targetBBox.y + (targetBBox.height - boxH) / 2

      this.placeholderRect.setAttribute('x', String(placeholderX))
      this.placeholderRect.setAttribute('y', String(placeholderY))
      this.placeholderRect.setAttribute('width', String(boxW))
      this.placeholderRect.setAttribute('height', String(boxH))
      this.placeholderRect.setAttribute('rx', '6')
      this.placeholderRect.setAttribute('ry', '6')
      this.placeholderRect.setAttribute('stroke', branchColor || '#3b82f6')
      this.placeholderRect.setAttribute('fill', 'rgba(59, 130, 246, 0.12)')

      sourcePoint = {
        x: targetBBox.x + targetBBox.width,
        y: targetBBox.y + targetBBox.height / 2,
      }

      targetPoint = {
        x: placeholderX,
        y: placeholderY + boxH / 2,
      }
    }

    // 根据分支风格 (曲线 vs 直角) 动态生成完全吻合的模拟连线
    const linePath =
      branchType === 'straight'
        ? getMindmapStraightPath(sourcePoint, targetPoint)
        : getMindmapCurvePath(sourcePoint, targetPoint)

    this.placeholderBranchLine.style.display = 'block'
    this.placeholderBranchLine.setAttribute('d', linePath)
    this.placeholderBranchLine.setAttribute('stroke', branchColor || '#3b82f6')
  }

  /**
   * 隐藏占位投影框
   */
  public hidePlaceholder(): void {
    if (this.placeholderGroup) this.placeholderGroup.style.display = 'none'
  }

  /**
   * 隐藏 Ghost 影子
   */
  public hideGhost(): void {
    if (this.ghostGroup) this.ghostGroup.style.display = 'none'
  }

  /**
   * 隐藏所有视觉指示器
   */
  public hideAll(): void {
    this.hidePlaceholder()
    this.hideGhost()
  }

  /**
   * 销毁清理 DOM 节点
   */
  public destroy(): void {
    if (this.overlayGroup && this.overlayGroup.parentNode) {
      this.overlayGroup.parentNode.removeChild(this.overlayGroup)
    }
    this.overlayGroup = null
    this.placeholderGroup = null
    this.placeholderTargetRect = null
    this.placeholderBranchLine = null
    this.placeholderRect = null
    this.ghostGroup = null
    this.ghostRect = null
    this.ghostText = null
  }
}
