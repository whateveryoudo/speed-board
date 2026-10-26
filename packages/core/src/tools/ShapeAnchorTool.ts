import { ToolsView } from '@antv/x6'
import type { NodeView } from '@antv/x6'

/**
 * 语雀白板 1:1 原生 In-SVG 形状 4 向延伸出发点手柄 (ShapeAnchorTool)
 * 100% 运行在 X6 SVG DOM 视口内部（<g class="x6-cell-tools">），零 Vue 外挂浮层、零坐标延迟、零 z-index 冲突
 */
export class ShapeAnchorTool extends ToolsView.ToolItem<NodeView> {
  private anchorButtons: Map<string, SVGGElement> = new Map()

  protected onRender() {
    this.container.setAttribute('class', 'x6-cell-tool speed-shape-anchor-tools')
    this.createAnchors()
    this.update()
  }

  public update(): this {
    this.updatePosition()
    return this
  }

  private createAnchors() {
    this.container.innerHTML = ''
    this.anchorButtons.clear()

    const directions: Array<{
      dir: 'top' | 'right' | 'bottom' | 'left'
      arrowPath: string
    }> = [
      { dir: 'top', arrowPath: 'M 0 4 L 0 -4 M -3 -1 L 0 -4 L 3 -1' },
      { dir: 'right', arrowPath: 'M -4 0 L 4 0 M 1 -3 L 4 0 L 1 3' },
      { dir: 'bottom', arrowPath: 'M 0 -4 L 0 4 M -3 1 L 0 4 L 3 1' },
      { dir: 'left', arrowPath: 'M 4 0 L -4 0 M -1 -3 L -4 0 L -1 3' },
    ]

    for (const { dir, arrowPath } of directions) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      g.setAttribute('class', `speed-shape-anchor-btn speed-anchor-${dir}`)
      g.setAttribute('data-direction', dir)
      g.setAttribute('style', 'cursor: crosshair; pointer-events: auto;')

      // 1. 透明感应触控大圆 (r=14)
      const hitCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      hitCircle.setAttribute('r', '14')
      hitCircle.setAttribute('fill', 'transparent')
      hitCircle.setAttribute('style', 'cursor: crosshair;')
      g.appendChild(hitCircle)

      // 2. 常态纯蓝实心小圆圈 (精致精致小圆点，配合微羽化即使更小也依然保持正圆)
      const dotCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      dotCircle.setAttribute('class', 'anchor-dot')
      dotCircle.setAttribute('r', '3')
      dotCircle.setAttribute('fill', '#2563eb')
      dotCircle.setAttribute('filter', 'drop-shadow(0 1px 1.5px rgba(37,99,235,0.4))')
      dotCircle.setAttribute('shape-rendering', 'geometricPrecision')
      g.appendChild(dotCircle)

      // 3. Hover 展开蓝色箭头按钮 (r=9)
      const arrowGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      arrowGroup.setAttribute('class', 'anchor-arrow')
      arrowGroup.setAttribute('style', 'opacity: 0; transition: opacity 0.15s ease; pointer-events: none;')

      const arrowBg = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      arrowBg.setAttribute('r', '9')
      arrowBg.setAttribute('fill', '#2563eb')
      arrowGroup.appendChild(arrowBg)

      const arrowIcon = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      arrowIcon.setAttribute('d', arrowPath)
      arrowIcon.setAttribute('fill', 'none')
      arrowIcon.setAttribute('stroke', '#ffffff')
      arrowIcon.setAttribute('stroke-width', '1.8')
      arrowIcon.setAttribute('stroke-linecap', 'round')
      arrowIcon.setAttribute('stroke-linejoin', 'round')
      arrowGroup.appendChild(arrowIcon)

      g.appendChild(arrowGroup)

      // Hover 交互监听
      g.addEventListener('mouseenter', () => {
        dotCircle.style.opacity = '0'
        arrowGroup.style.opacity = '1'
      })
      g.addEventListener('mouseleave', () => {
        dotCircle.style.opacity = '1'
        arrowGroup.style.opacity = '0'
      })

      // Mousedown/Pointerdown 拖拽拉线与点击快捷生成
      g.addEventListener('pointerdown', (e: PointerEvent) => {
        this.onAnchorPointerDown(dir, e)
      })

      this.container.appendChild(g)
      this.anchorButtons.set(dir, g)
    }
  }

  private updatePosition() {
    if (!this.cellView || !this.cellView.cell) return
    const cell = this.cellView.cell
    const bbox = (cell as any).getBBox?.()
    if (!bbox) return

    // 锚点保持外浮悬空 14px，与图形几何边框和四角缩放手柄清晰隔离，绝不压在图形边线上
    const offsetDist = 14
    const positions: Record<string, { x: number; y: number }> = {
      top: { x: bbox.x + bbox.width / 2, y: bbox.y - offsetDist },
      right: { x: bbox.x + bbox.width + offsetDist, y: bbox.y + bbox.height / 2 },
      bottom: { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height + offsetDist },
      left: { x: bbox.x - offsetDist, y: bbox.y + bbox.height / 2 },
    }

    for (const [dir, btn] of this.anchorButtons.entries()) {
      const pt = positions[dir]
      if (pt) {
        // 采用 Math.round 整数像素对齐，杜绝因奇数宽高除以 2 产生的 .5 亚像素失真（导致长宽比不对称成椭圆）
        btn.setAttribute('transform', `translate(${Math.round(pt.x)}, ${Math.round(pt.y)})`)
      }
    }
  }

  private onAnchorPointerDown(dir: 'top' | 'right' | 'bottom' | 'left', e: PointerEvent) {
    e.stopPropagation()
    e.preventDefault()

    const cell = this.cellView.cell
    const board = (this.graph as any).__board__
    const startX = e.clientX
    const startY = e.clientY
    let isDrag = false

    const onPointerMove = (moveEvt: PointerEvent) => {
      if (!isDrag && Math.hypot(moveEvt.clientX - startX, moveEvt.clientY - startY) > 3) {
        isDrag = true
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)

        // 触发 core 连线拖拽引擎
        if (board && board.drawingController) {
          board.drawingController.startLineFromPort(cell, dir, {
            clientX: moveEvt.clientX,
            clientY: moveEvt.clientY,
          })
        }
      }
    }

    const onPointerUp = (upEvt: PointerEvent) => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)

      // 若只是轻点（移动距离 < 3px），则触发锚点快捷生成 Popover
      if (!isDrag) {
        this.graph.trigger('anchor:click', {
          node: cell,
          direction: dir,
          clientPos: { x: upEvt.clientX, y: upEvt.clientY },
        })
      }
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }
}

// 静态注册配置
ShapeAnchorTool.config({
  name: 'shape-anchor-tool',
})
