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
  private isSpaceDown = false
  private cleanupFns: Array<() => void> = []

  constructor(board: Board) {
    this.board = board
  }

  public init() {
    this.initDrawingEvents()
    this.initSpacePanning()
  }

  private initDrawingEvents() {
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return

      if (this.drawingMode === 'eraser') {
        this.eraseAtPoint(e.clientX, e.clientY)
        this.isDrawing = true
        return
      }

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

      const stage =
        (this.board.graph.view as any)?.stage ||
        this.board.container.querySelector('.x6-graph-svg-stage') ||
        this.board.container.querySelector('svg')
      stage?.appendChild(this.tempSvgPath)
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!this.isDrawing) return

      if (this.drawingMode === 'eraser') {
        this.eraseAtPoint(e.clientX, e.clientY)
        return
      }

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

    const onPointerUp = () => {
      if (!this.isDrawing) return
      this.isDrawing = false

      if (this.tempSvgPath && this.tempSvgPath.parentNode) {
        this.tempSvgPath.parentNode.removeChild(this.tempSvgPath)
      }

      if (
        this.drawingMode !== 'pencil' &&
        this.drawingMode !== 'marker' &&
        this.drawingMode !== 'brush'
      ) {
        return
      }

      if (this.drawPoints.length === 0) return

      this.commitFreehandPath()
      this.drawPoints = []
    }

    this.board.graph.on('cell:click', ({ cell }) => {
      if (this.drawingMode === 'eraser') {
        this.board.graph.removeCell(cell)
      }
    })

    this.board.container.addEventListener('pointerdown', onPointerDown, { capture: true })
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    this.cleanupFns.push(() => {
      this.board.container.removeEventListener('pointerdown', onPointerDown, { capture: true })
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
        shape: 'path',
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
  }
}
