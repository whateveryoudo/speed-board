import type { Node } from '@antv/x6'
import type { Board, DrawingMode, DrawingOptions } from '../Board'

export class DrawingController {
  private board: Board
  public drawingMode: DrawingMode = 'select'
  public drawColor: string = '#333333'
  public drawWidth: number = 3
  public drawOpacity: number = 1
  public isDrawing: boolean = false
  public drawPoints: { x: number; y: number }[] = []
  public tempSvgPath: SVGPathElement | null = null

  // 连线绘制相关
  public lineType: 'elbow' | 'straight' | 'curve' = 'straight'
  public lineStartPt: { x: number; y: number } | null = null
  public tempLinePath: SVGPathElement | null = null

  // 矢量钢笔多边形绘制相关
  public vectorPoints: { x: number; y: number }[] = []
  public vectorFillColor: string = '#ffffff'
  public vectorStrokeColor: string = '#374151'
  public vectorStrokeWidth: number = 2
  public vectorStrokeDash: string = 'none'
  public vectorOpacity: number = 1
  public tempVectorGroup: SVGGElement | null = null

  public onFinishVector?: () => void
  public onModeChange?: (mode: DrawingMode) => void

  private isSpaceDown = false
  private cleanupFns: Array<() => void> = []

  constructor(board: Board) {
    this.board = board
  }

  public init() {
    this.initDrawingEvents()
    this.initSpacePanning()
  }

  public getStage(): SVGGElement | SVGElement | null {
    return (
      (this.board.graph.view as any)?.stage ||
      this.board.container.querySelector('.x6-graph-svg-stage') ||
      this.board.container.querySelector('svg')
    )
  }

  private initDrawingEvents() {
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return

      // 1. 橡皮擦模式
      if (this.drawingMode === 'eraser') {
        this.eraseAtPoint(e.clientX, e.clientY)
        this.isDrawing = true
        return
      }

      // 2. 连线工具模式 (在 stage 中原生拖拽预览)
      if (this.drawingMode === 'line') {
        e.preventDefault()
        e.stopPropagation()
        this.isDrawing = true
        this.lineStartPt = this.board.graph.clientToLocal(e.clientX, e.clientY)

        if (!this.tempLinePath) {
          this.tempLinePath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
          this.tempLinePath.setAttribute('style', 'pointer-events: none;')
        }
        this.tempLinePath.setAttribute('stroke', this.drawColor || '#374151')
        this.tempLinePath.setAttribute('stroke-width', String(this.drawWidth || 2))
        this.tempLinePath.setAttribute('stroke-linecap', 'round')
        this.tempLinePath.setAttribute('stroke-linejoin', 'round')
        this.tempLinePath.setAttribute('fill', 'none')
        this.tempLinePath.setAttribute(
          'd',
          `M ${this.lineStartPt.x.toFixed(1)} ${this.lineStartPt.y.toFixed(1)} L ${this.lineStartPt.x.toFixed(1)} ${this.lineStartPt.y.toFixed(1)}`
        )

        const stage = this.getStage()
        stage?.appendChild(this.tempLinePath)
        return
      }

      // 3. 矢量钢笔多边形描点模式 (在 stage 中原生加点)
      if (this.drawingMode === 'vector') {
        e.preventDefault()
        e.stopPropagation()
        const pt = this.board.graph.clientToLocal(e.clientX, e.clientY)

        if (this.vectorPoints.length >= 3) {
          const startPt = this.vectorPoints[0]
          const dist = Math.hypot(pt.x - startPt.x, pt.y - startPt.y)
          if (dist <= 16) {
            this.commitVectorPolygon()
            return
          }
        }
        this.vectorPoints.push(pt)
        this.renderVectorPreview(pt)
        return
      }

      // 4. 自由画笔/记号笔/毛笔
      if (
        this.drawingMode !== 'pencil' &&
        this.drawingMode !== 'marker' &&
        this.drawingMode !== 'brush'
      ) {
        return
      }

      e.preventDefault()
      e.stopPropagation()

      this.isDrawing = true
      const pt = this.board.graph.clientToLocal(e.clientX, e.clientY)
      this.drawPoints = [pt]

      if (!this.tempSvgPath) {
        this.tempSvgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        this.tempSvgPath.setAttribute('style', 'pointer-events: none;')
      }
      this.tempSvgPath.setAttribute('stroke', this.drawColor)
      this.tempSvgPath.setAttribute('stroke-width', String(this.drawWidth))
      this.tempSvgPath.setAttribute('stroke-opacity', String(this.drawOpacity))
      this.tempSvgPath.setAttribute('stroke-linecap', 'round')
      this.tempSvgPath.setAttribute('stroke-linejoin', 'round')
      this.tempSvgPath.setAttribute('fill', 'none')
      this.tempSvgPath.setAttribute('d', `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)} l 0.01 0.01`)

      const stage = this.getStage()
      stage?.appendChild(this.tempSvgPath)
    }

    const onPointerMove = (e: PointerEvent) => {
      // 橡皮擦滑动清除
      if (this.drawingMode === 'eraser') {
        if (this.isDrawing) {
          this.eraseAtPoint(e.clientX, e.clientY)
        }
        return
      }

      // 连线滑动预览
      if (this.drawingMode === 'line') {
        if (!this.isDrawing || !this.lineStartPt || !this.tempLinePath) return
        const curPt = this.board.graph.clientToLocal(e.clientX, e.clientY)
        const p1 = this.lineStartPt
        const p2 = curPt
        let d = ''
        if (this.lineType === 'elbow') {
          const midX = (p1.x + p2.x) / 2
          d = `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} L ${midX.toFixed(1)} ${p1.y.toFixed(1)} L ${midX.toFixed(1)} ${p2.y.toFixed(1)} L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
        } else if (this.lineType === 'curve') {
          const dx = p2.x - p1.x
          d = `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} C ${(p1.x + dx / 2).toFixed(1)} ${p1.y.toFixed(1)}, ${(p1.x + dx / 2).toFixed(1)} ${p2.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
        } else {
          d = `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
        }
        this.tempLinePath.setAttribute('d', d)
        return
      }

      // 矢量钢笔光标跟随预览
      if (this.drawingMode === 'vector') {
        if (this.vectorPoints.length > 0) {
          const curPt = this.board.graph.clientToLocal(e.clientX, e.clientY)
          this.renderVectorPreview(curPt)
        }
        return
      }

      // 自由手绘滑动采集
      if (!this.isDrawing) return
      if (
        this.drawingMode !== 'pencil' &&
        this.drawingMode !== 'marker' &&
        this.drawingMode !== 'brush'
      ) {
        return
      }

      const pt = this.board.graph.clientToLocal(e.clientX, e.clientY)
      const lastPt = this.drawPoints[this.drawPoints.length - 1]
      if (lastPt) {
        const dx = pt.x - lastPt.x
        const dy = pt.y - lastPt.y
        if (dx * dx + dy * dy < 4) return
      }

      this.drawPoints.push(pt)
      if (this.tempSvgPath) {
        this.tempSvgPath.setAttribute('d', this.pointsToSvgPath(this.drawPoints))
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      // 橡皮擦抬起
      if (this.drawingMode === 'eraser') {
        this.isDrawing = false
        return
      }

      // 连线抬起提交
      if (this.drawingMode === 'line') {
        if (!this.isDrawing || !this.lineStartPt) return
        this.isDrawing = false
        if (this.tempLinePath && this.tempLinePath.parentNode) {
          this.tempLinePath.parentNode.removeChild(this.tempLinePath)
          this.tempLinePath = null
        }
        const curPt = this.board.graph.clientToLocal(e.clientX, e.clientY)
        const dist = Math.hypot(curPt.x - this.lineStartPt.x, curPt.y - this.lineStartPt.y)
        if (dist > 10) {
          this.board.addLine({
            type: this.lineType,
            source: this.lineStartPt,
            target: curPt,
            stroke: this.drawColor,
            strokeWidth: this.drawWidth,
          })
        }
        this.lineStartPt = null
        this.setDrawingMode('select')
        this.onModeChange?.('select')
        return
      }

      // 矢量钢笔抬起不处理（依赖双击或起点吸附闭合）
      if (this.drawingMode === 'vector') {
        return
      }

      // 自由画笔抬起提交
      if (!this.isDrawing) return
      this.isDrawing = false

      if (
        this.drawingMode !== 'pencil' &&
        this.drawingMode !== 'marker' &&
        this.drawingMode !== 'brush'
      ) {
        if (this.tempSvgPath && this.tempSvgPath.parentNode) {
          this.tempSvgPath.parentNode.removeChild(this.tempSvgPath)
          this.tempSvgPath = null
        }
        return
      }

      if (this.drawPoints.length > 0) {
        // 先同步创建并挂载永久 X6 节点，再移除临时预览线，实现绝对无缝交接 (0 毫秒空档、0 闪烁)
        this.commitFreehandPath()
        this.drawPoints = []
      }

      if (this.tempSvgPath && this.tempSvgPath.parentNode) {
        this.tempSvgPath.parentNode.removeChild(this.tempSvgPath)
        this.tempSvgPath = null
      }
    }

    const onDblClick = (e: MouseEvent) => {
      if (this.drawingMode === 'vector' && this.vectorPoints.length >= 3) {
        e.preventDefault()
        e.stopPropagation()
        this.commitVectorPolygon()
      }
    }

    this.board.graph.on('cell:click', ({ cell }) => {
      if (this.drawingMode === 'eraser') {
        this.board.graph.removeCell(cell)
      }
    })

    this.board.container.addEventListener('pointerdown', onPointerDown, { capture: true })
    this.board.container.addEventListener('dblclick', onDblClick, { capture: true })
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    this.cleanupFns.push(() => {
      this.board.container.removeEventListener('pointerdown', onPointerDown, { capture: true })
      this.board.container.removeEventListener('dblclick', onDblClick, { capture: true })
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    })
  }

  private eraseAtPoint(clientX: number, clientY: number) {
    const pt = this.board.graph.clientToLocal(clientX, clientY)
    const nodes = this.board.graph.getNodesFromPoint(pt.x, pt.y)
    if (nodes && nodes.length > 0) {
      this.board.graph.removeCell(nodes[nodes.length - 1])
    }
  }

  // 渲染原生 In-Stage 矢量钢笔预览图层
  private renderVectorPreview(curPt: { x: number; y: number }) {
    const stage = this.getStage()
    if (!stage) return

    if (!this.tempVectorGroup) {
      this.tempVectorGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      this.tempVectorGroup.setAttribute('class', 'speed-vector-native-preview')
      this.tempVectorGroup.setAttribute('style', 'pointer-events: none;')
      stage.appendChild(this.tempVectorGroup)
    }

    const pts = this.vectorPoints
    if (pts.length === 0) {
      this.tempVectorGroup.innerHTML = ''
      return
    }

    let polyD = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
    for (let i = 1; i < pts.length; i++) {
      polyD += ` L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`
    }

    const lastPt = pts[pts.length - 1]
    const guideLine = `<line x1="${lastPt.x.toFixed(1)}" y1="${lastPt.y.toFixed(1)}" x2="${curPt.x.toFixed(1)}" y2="${curPt.y.toFixed(1)}" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="3,3" />`

    let dots = ''
    for (const p of pts) {
      dots += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="#ffffff" stroke="#374151" stroke-width="1.5" />`
    }

    let snapCircle = ''
    if (pts.length >= 3) {
      const dist = Math.hypot(curPt.x - pts[0].x, curPt.y - pts[0].y)
      if (dist <= 16) {
        snapCircle = `<circle cx="${pts[0].x.toFixed(1)}" cy="${pts[0].y.toFixed(1)}" r="8" fill="rgba(59, 130, 246, 0.25)" stroke="#3b82f6" stroke-width="2" />`
      }
    }

    const fill = this.vectorFillColor === 'transparent' ? 'none' : this.vectorFillColor
    const strokeDash = this.vectorStrokeDash === 'none' ? '' : `stroke-dasharray="${this.vectorStrokeDash}"`

    this.tempVectorGroup.innerHTML = `
      <path d="${polyD}" stroke="${this.vectorStrokeColor}" stroke-width="${this.vectorStrokeWidth}" ${strokeDash} fill="${fill}" fill-opacity="${this.vectorOpacity * 0.45}" stroke-linecap="round" stroke-linejoin="round" />
      ${guideLine}
      ${dots}
      ${snapCircle}
    `
  }

  public clearVectorPreview() {
    if (this.tempVectorGroup && this.tempVectorGroup.parentNode) {
      this.tempVectorGroup.parentNode.removeChild(this.tempVectorGroup)
      this.tempVectorGroup = null
    }
    this.vectorPoints = []
  }

  public commitVectorPolygon(): Node | undefined {
    if (this.vectorPoints.length < 3) return
    const pts = [...this.vectorPoints]
    this.clearVectorPreview()

    const node = this.addPolygonShape({
      points: pts,
      fill: this.vectorFillColor,
      stroke: this.vectorStrokeColor,
      strokeWidth: this.vectorStrokeWidth,
      strokeDasharray: this.vectorStrokeDash,
      opacity: this.vectorOpacity,
    })

    this.setDrawingMode('select')
    this.onModeChange?.('select')
    this.onFinishVector?.()
    return node
  }

  public cancelVector() {
    this.clearVectorPreview()
    this.setDrawingMode('select')
    this.onModeChange?.('select')
  }

  public commitFreehandPath(): Node | undefined {
    if (this.drawPoints.length === 0) return
    return this.addFreehandPath({
      points: this.drawPoints,
      color: this.drawColor,
      width: this.drawWidth,
      opacity: this.drawOpacity,
      brushType: this.drawingMode,
    })
  }

  public pointsToSvgPath(points: { x: number; y: number }[]): string {
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

  public setDrawingMode(mode: DrawingMode, options?: DrawingOptions) {
    if (this.drawingMode === 'vector' && mode !== 'vector') {
      this.clearVectorPreview()
    }
    if (this.drawingMode === 'line' && mode !== 'line') {
      if (this.tempLinePath && this.tempLinePath.parentNode) {
        this.tempLinePath.parentNode.removeChild(this.tempLinePath)
        this.tempLinePath = null
      }
      this.lineStartPt = null
    }

    this.drawingMode = mode

    if (options?.color !== undefined) {
      this.drawColor = options.color
    }
    if (options?.width !== undefined) {
      this.drawWidth = options.width
    }
    if (options?.opacity !== undefined) {
      this.drawOpacity = options.opacity
    }
    if (options?.lineType !== undefined) {
      this.lineType = options.lineType
    }
    if (options?.vectorFillColor !== undefined) {
      this.vectorFillColor = options.vectorFillColor
    }
    if (options?.vectorStrokeColor !== undefined) {
      this.vectorStrokeColor = options.vectorStrokeColor
    }
    if (options?.vectorStrokeWidth !== undefined) {
      this.vectorStrokeWidth = options.vectorStrokeWidth
    }
    if (options?.vectorStrokeDash !== undefined) {
      this.vectorStrokeDash = options.vectorStrokeDash
    }
    if (options?.vectorOpacity !== undefined) {
      this.vectorOpacity = options.vectorOpacity
    }

    const selectionPlugin = this.board.selectionPlugin
    const scrollerPlugin = this.board.scrollerPlugin

    if (mode === 'pencil') {
      if (options?.width === undefined) this.drawWidth = 3
      if (options?.opacity === undefined) this.drawOpacity = 1
      selectionPlugin?.disableRubberband()
      scrollerPlugin?.disablePanning()
      this.board.container.style.cursor = 'crosshair'
    } else if (mode === 'vector') {
      selectionPlugin?.disableRubberband()
      scrollerPlugin?.disablePanning()
      this.board.container.style.cursor = 'crosshair'
    } else if (mode === 'line') {
      selectionPlugin?.disableRubberband()
      scrollerPlugin?.disablePanning()
      this.board.container.style.cursor = 'crosshair'
    } else if (mode === 'marker') {
      if (options?.width === undefined) this.drawWidth = 14
      if (options?.opacity === undefined) this.drawOpacity = 0.5
      selectionPlugin?.disableRubberband()
      scrollerPlugin?.disablePanning()
      this.board.container.style.cursor = 'crosshair'
    } else if (mode === 'brush') {
      if (options?.width === undefined) this.drawWidth = 6
      if (options?.opacity === undefined) this.drawOpacity = 0.85
      selectionPlugin?.disableRubberband()
      scrollerPlugin?.disablePanning()
      this.board.container.style.cursor = 'crosshair'
    } else if (mode === 'eraser') {
      selectionPlugin?.disableRubberband()
      scrollerPlugin?.disablePanning()
      this.board.container.style.cursor = 'pointer'
    } else if (mode === 'hand') {
      selectionPlugin?.disableRubberband()
      scrollerPlugin?.enablePanning()
      this.board.container.style.cursor = 'grab'
    } else {
      selectionPlugin?.enableRubberband()
      scrollerPlugin?.disablePanning()
      this.board.container.style.cursor = 'default'
    }
  }

  private initSpacePanning() {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !this.isSpaceDown) {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return
        this.isSpaceDown = true
        if (this.drawingMode === 'select') {
          this.board.selectionPlugin?.disableRubberband()
          this.board.scrollerPlugin?.enablePanning()
          this.board.container.style.cursor = 'grab'
        }
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && this.isSpaceDown) {
        this.isSpaceDown = false
        if (this.drawingMode === 'select') {
          this.board.scrollerPlugin?.disablePanning()
          this.board.selectionPlugin?.enableRubberband()
          this.board.container.style.cursor = 'default'
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    this.cleanupFns.push(() => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    })
  }

  public setHandMode(enabled: boolean) {
    if (enabled) {
      this.setDrawingMode('hand')
    } else {
      this.setDrawingMode('select')
    }
  }

  public addFreehandPath(options: {
    points: Array<{ x: number; y: number }>
    color?: string
    width?: number
    opacity?: number
    brushType?: string
  }): Node | undefined {
    if (!options.points || options.points.length === 0) return

    let _minX = Infinity
    let _minY = Infinity
    let _maxX = -Infinity
    let _maxY = -Infinity

    for (const p of options.points) {
      _minX = Math.min(_minX, p.x)
      _minY = Math.min(_minY, p.y)
      _maxX = Math.max(_maxX, p.x)
      _maxY = Math.max(_maxY, p.y)
    }

    const minX = Number(_minX.toFixed(1))
    const minY = Number(_minY.toFixed(1))
    const width = Math.max(Number((_maxX - _minX).toFixed(1)), 10)
    const height = Math.max(Number((_maxY - _minY).toFixed(1)), 10)

    const localPoints = options.points.map((p) => ({
      x: Number((p.x - minX).toFixed(1)),
      y: Number((p.y - minY).toFixed(1)),
    }))
    const localD = this.pointsToSvgPath(localPoints)

    const color = options.color || this.drawColor || '#333333'
    const strokeWidth = options.width || this.drawWidth || 3
    const opacity = options.opacity !== undefined ? options.opacity : this.drawOpacity

    const node = this.board.graph.addNode(
      {
        shape: 'speed-freehand-path',
        x: minX,
        y: minY,
        width,
        height,
        attrs: {
          bg: {
            fill: 'none',
            stroke: 'none',
            pointerEvents: 'none',
          },
          body: {
            d: localD,
            stroke: color,
            strokeWidth,
            'stroke-width': strokeWidth,
            strokeOpacity: opacity,
            'stroke-opacity': opacity,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            fill: 'none',
            pointerEvents: 'stroke',
          },
        },
        data: {
          type: 'freehand',
          brushType: options.brushType || this.drawingMode,
        },
      },
      { async: false }
    )

    return node
  }

  public addPolygonShape(options: {
    points: Array<{ x: number; y: number }>
    fill?: string
    stroke?: string
    strokeWidth?: number
    strokeDasharray?: string
    opacity?: number
  }): Node | undefined {
    if (!options.points || options.points.length < 3) return

    let _minX = Infinity
    let _minY = Infinity
    let _maxX = -Infinity
    let _maxY = -Infinity

    for (const p of options.points) {
      _minX = Math.min(_minX, p.x)
      _minY = Math.min(_minY, p.y)
      _maxX = Math.max(_maxX, p.x)
      _maxY = Math.max(_maxY, p.y)
    }

    const minX = Number(_minX.toFixed(1))
    const minY = Number(_minY.toFixed(1))
    const width = Math.max(Number((_maxX - _minX).toFixed(1)), 20)
    const height = Math.max(Number((_maxY - _minY).toFixed(1)), 20)

    const localPoints = options.points.map((p) => ({
      x: Number((p.x - minX).toFixed(1)),
      y: Number((p.y - minY).toFixed(1)),
    }))

    let localD = `M ${localPoints[0].x} ${localPoints[0].y}`
    for (let i = 1; i < localPoints.length; i++) {
      localD += ` L ${localPoints[i].x} ${localPoints[i].y}`
    }
    localD += ' Z'

    const fill = options.fill !== undefined ? options.fill : '#fce7f3'
    const stroke = options.stroke || '#333333'
    const strokeWidth = options.strokeWidth ?? 2
    const strokeDasharray = options.strokeDasharray || 'none'
    const opacity = options.opacity !== undefined ? options.opacity : 1

    const node = this.board.graph.addNode(
      {
        shape: 'speed-vector-polygon',
        x: minX,
        y: minY,
        width,
        height,
        attrs: {
          body: {
            refD: localD,
            d: localD,
            fill,
            stroke,
            strokeWidth,
            'stroke-width': strokeWidth,
            strokeDasharray,
            'stroke-dasharray': strokeDasharray,
            opacity,
            fillOpacity: opacity,
            strokeOpacity: opacity,
          },
        },
        data: {
          type: 'vector-polygon',
          points: localPoints,
          fill,
          stroke,
          strokeWidth,
          strokeDasharray,
          opacity,
        },
      },
      { async: false }
    )

    this.board.graph.cleanSelection()
    this.board.graph.select(node)
    return node
  }

  public destroy() {
    for (const cleanup of this.cleanupFns) {
      cleanup()
    }
    this.cleanupFns = []
    if (this.tempSvgPath && this.tempSvgPath.parentNode) {
      this.tempSvgPath.parentNode.removeChild(this.tempSvgPath)
      this.tempSvgPath = null
    }
    if (this.tempLinePath && this.tempLinePath.parentNode) {
      this.tempLinePath.parentNode.removeChild(this.tempLinePath)
      this.tempLinePath = null
    }
    this.clearVectorPreview()
  }
}
