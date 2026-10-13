import { Graph, Node } from '@antv/x6'
import { Scroller } from '@antv/x6-plugin-scroller'
import { Snapline } from '@antv/x6-plugin-snapline'
import { Selection } from '@antv/x6-plugin-selection'
import { Transform } from '@antv/x6-plugin-transform'
import { Keyboard } from '@antv/x6-plugin-keyboard'
import { Clipboard } from '@antv/x6-plugin-clipboard'
import { History } from '@antv/x6-plugin-history'
import * as Y from 'yjs'
import type { Extension } from './extension/Extension'

export interface BoardOptions {
  container: HTMLElement
  ydoc?: Y.Doc
  extensions?: Extension[]
  grid?: boolean | { size?: number; visible?: boolean; type?: 'dot' | 'mesh' | 'doubleMesh' }
  background?: { color?: string }
  readonly?: boolean
}

export type ShapeType = 'rect' | 'circle' | 'diamond' | 'text' | 'sticky' | 'icon' | 'path' | 'shape'

export type DrawingMode = 'select' | 'hand' | 'pencil' | 'marker' | 'brush' | 'eraser' | 'vector'

export interface DrawingOptions {
  color?: string
  width?: number
  opacity?: number
}

export interface AddShapeOptions {
  shape: ShapeType
  x?: number
  y?: number
  width?: number
  height?: number
  text?: string
  fill?: string
  stroke?: string
  svg?: string
  iconName?: string
  [key: string]: any
}

// 注册自定义闭合矢量多边形节点 (Vector Polygon)
Graph.registerNode(
  'speed-vector-polygon',
  {
    inherit: 'path',
    attrs: {
      bg: {
        fill: 'transparent',
        stroke: 'transparent',
        strokeWidth: 0,
        pointerEvents: 'none',
      },
      body: {
        fill: '#fce7f3',
        stroke: '#333333',
        strokeWidth: 2,
        strokeDasharray: 'none',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        pointerEvents: 'auto',
      },
    },
  },
  true
)

// 注册自定义文本图元节点 (Speed Text Node)
Graph.registerNode(
  'speed-text-node',
  {
    inherit: 'rect',
    markup: [
      {
        tagName: 'rect',
        selector: 'body',
      },
      {
        tagName: 'text',
        selector: 'label',
      },
    ],
    attrs: {
      body: {
        fill: 'transparent',
        stroke: 'transparent',
        strokeWidth: 0,
      },
      label: {
        text: '文本',
        fontSize: 14,
        fill: '#262626',
        textAnchor: 'start',
        textVerticalAnchor: 'middle',
        refX: 8,
        refY: '50%',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      },
    },
  },
  true
)

// 注册自定义自由手绘路径节点 (Freehand Path)
Graph.registerNode(
  'speed-freehand-path',
  {
    inherit: 'path',
    attrs: {
      bg: {
        fill: 'transparent',
        stroke: 'transparent',
        strokeWidth: 0,
        pointerEvents: 'none',
      },
      body: {
        fill: 'none',
        stroke: '#333333',
        strokeWidth: 3,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        pointerEvents: 'stroke',
      },
    },
  },
  true
)

// 注册自定义 SVG 图标节点
Graph.registerNode(
  'speed-icon-node',
  {
    inherit: 'rect',
    markup: [
      {
        tagName: 'rect',
        selector: 'body',
      },
      {
        tagName: 'g',
        selector: 'iconGroup',
      },
      {
        tagName: 'text',
        selector: 'label',
      },
    ],
    attrs: {
      body: {
        fill: 'transparent',
        stroke: 'transparent',
        strokeWidth: 0,
      },
      iconGroup: {
        refX: '50%',
        refY: '40%',
      },
      label: {
        fontSize: 12,
        fill: '#333333',
        textAnchor: 'middle',
        textVerticalAnchor: 'top',
        refX: '50%',
        refY: '80%',
      },
    },
  },
  true
)

// 注册自定义便签贴纸节点 (Sticky Note)
Graph.registerNode(
  'speed-sticky-node',
  {
    inherit: 'rect',
    markup: [
      {
        tagName: 'rect',
        selector: 'body',
      },
      {
        tagName: 'text',
        selector: 'label',
      },
    ],
    attrs: {
      body: {
        fill: '#fef3c7',
        stroke: '#f59e0b',
        strokeWidth: 1,
        rx: 4,
        ry: 4,
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.08))',
      },
      label: {
        fontSize: 14,
        fill: '#78350f',
        textAnchor: 'middle',
        textVerticalAnchor: 'middle',
        refX: '50%',
        refY: '50%',
      },
    },
  },
  true
)

// 注册自定义全量矢量图形节点 (Speed Shape Node - 支持内部文字、4个连接桩点、动态SVG渲染)
Graph.registerNode(
  'speed-shape-node',
  {
    markup: [
      {
        tagName: 'rect',
        selector: 'bg',
      },
      {
        tagName: 'svg',
        selector: 'shapeBody',
      },
      {
        tagName: 'text',
        selector: 'label',
      },
    ],
    attrs: {
      bg: {
        refWidth: '100%',
        refHeight: '100%',
        fill: 'transparent',
        stroke: 'transparent',
        strokeWidth: 0,
        pointerEvents: 'all',
      },
      shapeBody: {
        refWidth: '100%',
        refHeight: '100%',
        viewBox: '0 0 32 32',
        preserveAspectRatio: 'none',
        pointerEvents: 'none',
        overflow: 'visible',
      },
      label: {
        text: '',
        fontSize: 14,
        fill: '#1f2937',
        textAnchor: 'middle',
        textVerticalAnchor: 'middle',
        refX: '50%',
        refY: '50%',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        pointerEvents: 'none',
      },
    },
    ports: {
      groups: {
        top: {
          position: 'top',
          attrs: {
            circle: {
              r: 4.5,
              magnet: true,
              stroke: '#60a5fa',
              strokeWidth: 1.5,
              fill: '#dbeafe',
              style: {
                visibility: 'hidden',
                cursor: 'crosshair',
              },
            },
          },
        },
        right: {
          position: 'right',
          attrs: {
            circle: {
              r: 4.5,
              magnet: true,
              stroke: '#60a5fa',
              strokeWidth: 1.5,
              fill: '#dbeafe',
              style: {
                visibility: 'hidden',
                cursor: 'crosshair',
              },
            },
          },
        },
        bottom: {
          position: 'bottom',
          attrs: {
            circle: {
              r: 4.5,
              magnet: true,
              stroke: '#60a5fa',
              strokeWidth: 1.5,
              fill: '#dbeafe',
              style: {
                visibility: 'hidden',
                cursor: 'crosshair',
              },
            },
          },
        },
        left: {
          position: 'left',
          attrs: {
            circle: {
              r: 4.5,
              magnet: true,
              stroke: '#60a5fa',
              strokeWidth: 1.5,
              fill: '#dbeafe',
              style: {
                visibility: 'hidden',
                cursor: 'crosshair',
              },
            },
          },
        },
      },
      items: [
        { id: 'top', group: 'top' },
        { id: 'right', group: 'right' },
        { id: 'bottom', group: 'bottom' },
        { id: 'left', group: 'left' },
      ],
    },
  },
  true
)

export class Board {
  public container: HTMLElement
  public graph!: Graph
  public ydoc: Y.Doc
  public yCells: Y.Map<any>
  public extensions: Map<string, Extension> = new Map()

  // 内部标记：防止协同循环触发
  private isApplyingRemoteUpdate = false

  // 插件实例引用
  private scrollerPlugin?: Scroller
  private selectionPlugin?: Selection
  private transformPlugin?: Transform

  // 手绘状态
  private drawingMode: DrawingMode = 'select'
  private drawColor: string = '#333333'
  private drawWidth: number = 3
  private drawOpacity: number = 1
  private isDrawing: boolean = false
  private drawPoints: { x: number; y: number }[] = []
  private tempSvgPath: SVGPathElement | null = null

  // 事件解绑回调
  private drawingCleanupFns: Array<() => void> = []

  constructor(options: BoardOptions) {
    this.container = options.container
    this.ydoc = options.ydoc || new Y.Doc()
    this.yCells = this.ydoc.getMap('cells')

    this.initGraph(options)
    this.initPlugins()
    this.initEvents()
    this.initCollabSync()

    if (options.extensions) {
      for (const ext of options.extensions) {
        this.registerExtension(ext)
      }
    }
  }

  private initGraph(options: BoardOptions) {
    const isMesh = typeof options.grid === 'object' && options.grid.type === 'mesh'
    
    this.graph = new Graph({
      container: this.container,
      autoResize: true,
      async: false,
      grid: {
        visible: true,
        size: 15,
        type: isMesh ? 'mesh' : 'dot',
        args: {
          color: '#e5e7eb',
          thickness: 1,
        },
      },
      background: {
        color: options.background?.color || '#ffffff',
      },
      mousewheel: {
        enabled: true,
        modifiers: 'ctrl',
        minScale: 0.1,
        maxScale: 5,
      },
      connecting: {
        snap: true,
        allowBlank: true,
        allowLoop: false,
        allowNode: false,
        highlight: true,
        createEdge() {
          return this.createEdge({
            shape: 'edge',
            attrs: {
              line: {
                stroke: '#93c5fd',
                strokeWidth: 2,
                targetMarker: {
                  name: 'classic',
                  size: 7,
                },
              },
            },
            router: {
              name: 'manhattan',
              args: {
                padding: 10,
              },
            },
            connector: {
              name: 'rounded',
              args: {
                radius: 8,
              },
            },
          })
        },
        router: {
          name: 'manhattan',
          args: {
            padding: 10,
          },
        },
        connector: {
          name: 'rounded',
          args: {
            radius: 8,
          },
        },
        connectionPoint: 'boundary',
      },
      interacting: {
        nodeMovable: !options.readonly,
        edgeMovable: !options.readonly,
      },
    })
  }

  private initPlugins() {
    // 1. 无限滚动与抓手平移画布 (Scroller)
    this.scrollerPlugin = new Scroller({
      enabled: true,
      pannable: true,
      pageVisible: false,
      pageBreak: false,
      autoResize: false, // 禁用添加节点时自动强制重算原点与居中，避免画第一笔时视口被强行跳变居中
    })
    this.graph.use(this.scrollerPlugin)

    // 2. 磁吸对齐参考线 (Snapline)
    this.graph.use(
      new Snapline({
        enabled: true,
        sharp: true,
        clean: 100,
      })
    )

    // 3. 多选框选 (Selection)
    this.selectionPlugin = new Selection({
      enabled: true,
      multiple: true,
      rubberband: true,
      movable: true,
      showNodeSelectionBox: false, // 禁用独立选框，由 Transform 变换插件统一提供单一控制框，避免旋转时出现双重框
    })
    this.graph.use(this.selectionPlugin)

    // 4. 图元大小缩放与旋转控制柄 (Transform)
    this.transformPlugin = new Transform({
      resizing: {
        enabled: true,
        minWidth: 24,
        minHeight: 24,
      },
      rotating: {
        enabled: true,
        grid: 1,
      },
    })
    this.graph.use(this.transformPlugin)

    // 5. 快捷键系统
    this.graph.use(new Keyboard({ enabled: true }))

    // 6. 剪贴板
    this.graph.use(new Clipboard({ enabled: true }))

    // 7. 撤销重做历史记录 (History)
    this.graph.use(new History({ enabled: true }))
  }

  private initEvents() {
    // 选中图元时同步激活 Transform 单一控制框，取消选中时清除，保证仅有单一控制框
    this.graph.on('node:selected', ({ node }) => {
      this.transformPlugin?.createWidget(node)
    })
    this.graph.on('node:unselected', () => {
      this.transformPlugin?.clearWidgets()
    })

    // 选中连线时挂载端点拉伸与折点控制手柄 (1:1 语雀白板 Edge Tools)
    this.graph.on('edge:selected', ({ edge }) => {
      edge.addTools([
        {
          name: 'source-arrowhead',
          args: {
            attrs: {
              fill: '#ffffff',
              stroke: '#374151',
              'stroke-width': 1.5,
              r: 5,
              cursor: 'move',
            },
          },
        },
        {
          name: 'target-arrowhead',
          args: {
            attrs: {
              fill: '#ffffff',
              stroke: '#374151',
              'stroke-width': 1.5,
              r: 5,
              cursor: 'move',
            },
          },
        },
        {
          name: 'vertices',
          args: {
            attrs: {
              fill: '#3b82f6',
              stroke: '#ffffff',
              'stroke-width': 1.5,
              r: 4.5,
            },
          },
        },
        {
          name: 'segments',
        },
      ])
    })
    this.graph.on('edge:unselected', ({ edge }) => {
      edge.removeTools()
    })

    // 绑定删除快捷键 Delete / Backspace
    this.graph.bindKey(['backspace', 'delete'], () => {
      this.deleteSelected()
      return false
    })

    // 全选快捷键 Ctrl+A / Cmd+A
    this.graph.bindKey(['ctrl+a', 'meta+a'], () => {
      const nodes = this.graph.getNodes()
      this.graph.select(nodes)
      return false
    })

    // 初始化自由手绘与橡皮擦事件
    this.initDrawingEvents()
  }

  /**
   * 初始化 Yjs 实体协同双向绑定
   */
  private initCollabSync() {
    // 本地变更 -> 写入 Yjs
    this.graph.on('cell:added', ({ cell }) => {
      if (this.isApplyingRemoteUpdate) return
      const json = cell.toJSON()
      this.ydoc.transact(() => {
        this.yCells.set(cell.id, json)
      }, 'local')
    })

    this.graph.on('cell:change:*', ({ cell }) => {
      if (this.isApplyingRemoteUpdate) return
      const json = cell.toJSON()
      this.ydoc.transact(() => {
        this.yCells.set(cell.id, json)
      }, 'local')
    })

    this.graph.on('cell:removed', ({ cell }) => {
      if (this.isApplyingRemoteUpdate) return
      this.ydoc.transact(() => {
        this.yCells.delete(cell.id)
      }, 'local')
    })

    // 远端 Yjs 变更 -> 同步到 X6 画布
    this.yCells.observe((event) => {
      if (event.transaction.origin === 'local') return
      this.isApplyingRemoteUpdate = true
      try {
        event.changes.keys.forEach((change, key) => {
          if (change.action === 'add' || change.action === 'update') {
            const data = this.yCells.get(key)
            if (!data) return
            const existingCell = this.graph.getCellById(key)
            if (existingCell) {
              if (existingCell.isNode()) {
                if (data.position) {
                  existingCell.setPosition(data.position.x, data.position.y)
                }
                if (data.size) {
                  existingCell.setSize(data.size.width, data.size.height)
                }
              }
              if (data.attrs) {
                existingCell.setAttrs(data.attrs)
              }
            } else {
              this.graph.addCell(data)
            }
          } else if (change.action === 'delete') {
            const cell = this.graph.getCellById(key)
            if (cell) {
              this.graph.removeCell(cell)
            }
          }
        })
      } finally {
        this.isApplyingRemoteUpdate = false
      }
    })
  }

  // ===================== 命令系统 =====================

  /**
   * 获取当前视口中心的世界坐标
   */
  public getViewportCenter(): { x: number; y: number } {
    try {
      const rect = this.container.getBoundingClientRect()
      const clientX = rect.left + rect.width / 2
      const clientY = rect.top + rect.height / 2
      return this.graph.clientToLocal(clientX, clientY)
    } catch {
      return { x: 300, y: 200 }
    }
  }

  /**
   * 添加基础图元或图标
   */
  public addShape(options: AddShapeOptions): Node {
    const center = this.getViewportCenter()
    const x = options.x ?? (center.x - (options.width ?? 100) / 2)
    const y = options.y ?? (center.y - (options.height ?? 60) / 2)

    let node: Node

    switch (options.shape) {
      case 'circle':
        node = this.graph.addNode({
          shape: 'circle',
          x,
          y,
          width: options.width ?? 80,
          height: options.height ?? 80,
          attrs: {
            body: {
              fill: options.fill ?? 'transparent',
              stroke: options.stroke ?? '#374151',
              strokeWidth: 2,
            },
            label: {
              text: options.text ?? '',
              fontSize: 14,
              fill: '#1f2937',
            },
          },
        })
        break

      case 'diamond':
        node = this.graph.addNode({
          shape: 'polygon',
          x,
          y,
          width: options.width ?? 100,
          height: options.height ?? 80,
          points: '0,40 50,0 100,40 50,80',
          attrs: {
            body: {
              fill: options.fill ?? 'transparent',
              stroke: options.stroke ?? '#374151',
              strokeWidth: 2,
            },
            label: {
              text: options.text ?? '',
              fontSize: 14,
              fill: '#1f2937',
            },
          },
        })
        break

      case 'text':
        node = this.graph.addNode({
          shape: 'speed-text-node',
          x,
          y,
          width: options.width ?? 100,
          height: options.height ?? 36,
          attrs: {
            label: {
              text: options.text || '文本',
              fontSize: options.fontSize || 14,
              fill: options.fill || '#262626',
            },
          },
          data: {
            type: 'text',
            text: options.text || '文本',
            link: options.link || '',
            fontSize: options.fontSize || 14,
            fill: options.fill || '#262626',
            bold: false,
            italic: false,
            strike: false,
            underline: false,
            align: 'left',
            verticalAlign: 'middle',
          },
        })
        break

      case 'sticky':
        node = this.graph.addNode({
          shape: 'speed-sticky-node',
          x,
          y,
          width: options.width ?? 120,
          height: options.height ?? 120,
          attrs: {
            body: {
              fill: options.fill ?? '#fef3c7',
              stroke: options.stroke ?? '#f59e0b',
            },
            label: {
              text: options.text || '便签内容',
            },
          },
        })
        break

      case 'icon':
        node = this.graph.addNode({
          shape: 'speed-icon-node',
          x,
          y,
          width: options.width ?? 64,
          height: options.height ?? 64,
          attrs: {
            iconGroup: {
              html: options.svg || '',
            },
            label: {
              text: options.iconName || '',
            },
          },
        })
        break

      case 'shape':
        node = this.graph.addNode({
          shape: 'speed-shape-node',
          x,
          y,
          width: options.width ?? 100,
          height: options.height ?? 80,
          attrs: {
            shapeBody: {
              html: options.svgContent || options.svg || '',
              opacity: options.opacity ?? 1,
              viewBox: options.viewBox || '6 6 20 20',
              preserveAspectRatio: 'none',
            },
            label: {
              text: options.text ?? '',
              fontSize: options.fontSize ?? 14,
              fill: options.textColor ?? '#1f2937',
              textAnchor: 'middle',
              textVerticalAnchor: 'middle',
              refX: '50%',
              refY: '50%',
            },
          },
          data: {
            type: 'shape',
            shapeId: options.shapeId || 'rect',
            shapeName: options.shapeName || options.shapeId || '矩形',
            svgContent: options.svgContent || options.svg || '',
            viewBox: options.viewBox || '6 6 20 20',
            fill: options.fill ?? 'transparent',
            stroke: options.stroke ?? '#374151',
            strokeWidth: options.strokeWidth ?? 2,
            strokeDasharray: options.strokeDasharray ?? 'none',
            opacity: options.opacity ?? 1,
            text: options.text ?? '',
            fontSize: options.fontSize ?? 14,
            textColor: options.textColor ?? '#1f2937',
            bold: false,
            italic: false,
            strike: false,
            underline: false,
            align: 'center',
            verticalAlign: 'middle',
          },
        })
        break

      case 'rect':
      default:
        node = this.graph.addNode({
          shape: 'rect',
          x,
          y,
          width: options.width ?? 120,
          height: options.height ?? 60,
          attrs: {
            body: {
              fill: options.fill ?? 'transparent',
              stroke: options.stroke ?? '#374151',
              strokeWidth: 2,
              rx: 6,
              ry: 6,
            },
            label: {
              text: options.text ?? '',
              fontSize: 14,
              fill: '#1f2937',
            },
          },
        })
        break
    }

    // 选中刚创建的图元
    this.graph.cleanSelection()
    this.graph.select(node)
    return node
  }

  /**
   * 插入 Iconfont / SVG 矢量图标
   */
  public addSvgIcon(options: { svg: string; name?: string; width?: number; height?: number; x?: number; y?: number }): Node {
    const width = options.width ?? 64
    const height = options.height ?? 64
    const center = this.getViewportCenter()
    const x = options.x ?? (center.x - width / 2)
    const y = options.y ?? (center.y - height / 2)

    // 构建内嵌 SVG
    const svgHtml = `<div style="width:${width}px;height:${height}px;display:flex;align-items:center;justify-content:center;pointer-events:none;">${options.svg}</div>`

    const node = this.graph.addNode({
      shape: 'html',
      x,
      y,
      width,
      height,
      html: () => svgHtml,
    })

    this.graph.cleanSelection()
    this.graph.select(node)
    return node
  }

  /**
   * 删除选中图元
   */
  public deleteSelected() {
    const selectedCells = this.graph.getSelectedCells()
    if (selectedCells.length) {
      this.graph.removeCells(selectedCells)
    }
  }

  /**
   * 缩放控制
   */
  public zoom(factor: number) {
    this.graph.zoom(factor)
  }

  public zoomTo(factor: number) {
    this.graph.zoomTo(factor)
  }

  public getZoom(): number {
    return this.graph.zoom()
  }

  public centerContent() {
    this.graph.centerContent()
  }

  public undo() {
    ;(this.graph as any).undo?.()
  }

  public redo() {
    ;(this.graph as any).redo?.()
  }

  public canUndo(): boolean {
    return !!(this.graph as any).canUndo?.()
  }

  public canRedo(): boolean {
    return !!(this.graph as any).canRedo?.()
  }

  public registerExtension(extension: Extension) {
    extension.bind(this)
    this.extensions.set(extension.name, extension)
    extension.onInit?.()
  }

  // ===================== 自由手绘与橡皮擦系统 =====================

  private initDrawingEvents() {
    const onPointerDown = (e: PointerEvent) => {
      // 仅响应鼠标左键 (button === 0)
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

      // 拦截默认事件，防止 X6 触发选框或节点拖拽
      e.preventDefault()
      e.stopPropagation()

      this.isDrawing = true
      const pt = this.graph.clientToLocal(e.clientX, e.clientY)
      this.drawPoints = [pt]

      // 创建实时预览 SVG Path
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
        (this.graph.view as any)?.stage ||
        this.container.querySelector('.x6-graph-svg-stage') ||
        this.container.querySelector('svg')
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

      const pt = this.graph.clientToLocal(e.clientX, e.clientY)
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

    // 橡皮擦在已有图元上的点击监听
    this.graph.on('cell:click', ({ cell }) => {
      if (this.drawingMode === 'eraser') {
        this.graph.removeCell(cell)
      }
    })

    // 捕获阶段监听画布上的 pointerdown，以拦截在已有节点之上的画笔触发
    this.container.addEventListener('pointerdown', onPointerDown, { capture: true })
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    this.drawingCleanupFns.push(() => {
      this.container.removeEventListener('pointerdown', onPointerDown, { capture: true })
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    })
  }

  private eraseAtPoint(clientX: number, clientY: number) {
    const pt = this.graph.clientToLocal(clientX, clientY)
    const nodes = this.graph.getNodesFromPoint(pt.x, pt.y)
    if (nodes && nodes.length > 0) {
      this.graph.removeCell(nodes[nodes.length - 1])
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

    const node = this.graph.addNode(
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

  /**
   * 添加闭合矢量图形 (Vector Polygon)
   */
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

    // 构建闭合 SVG 路径: M x0 y0 L x1 y1 ... Z
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

    const node = this.graph.addNode(
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

    this.graph.cleanSelection()
    this.graph.select(node)
    return node
  }

  /**
   * 更新当前选中图元的样式 (填充色, 边框色, 边框粗细, 虚线样式, 不透明度)
   */
  public updateSelectedStyle(style: {
    fill?: string
    stroke?: string
    strokeWidth?: number
    strokeDasharray?: string
    opacity?: number
  }) {
    const selectedCells = this.graph.getSelectedCells()
    if (!selectedCells || selectedCells.length === 0) return

    for (const cell of selectedCells) {
      if (!cell.isNode()) continue

      if (style.fill !== undefined) {
        cell.setAttrByPath('body/fill', style.fill)
      }
      if (style.stroke !== undefined) {
        cell.setAttrByPath('body/stroke', style.stroke)
      }
      if (style.strokeWidth !== undefined) {
        cell.setAttrByPath('body/strokeWidth', style.strokeWidth)
        cell.setAttrByPath('body/stroke-width', style.strokeWidth)
      }
      if (style.strokeDasharray !== undefined) {
        cell.setAttrByPath('body/strokeDasharray', style.strokeDasharray)
        cell.setAttrByPath('body/stroke-dasharray', style.strokeDasharray)
      }
      if (style.opacity !== undefined) {
        cell.setAttrByPath('body/opacity', style.opacity)
        cell.setAttrByPath('body/fillOpacity', style.opacity)
        cell.setAttrByPath('body/strokeOpacity', style.opacity)
      }

      // 同步更新 data 属性以供持久化与状态读取
      const data = cell.getData() || {}
      cell.setData({
        ...data,
        ...style,
      })
    }
  }

  /**
   * 获取当前首个选中图元的样式
   */
  public getSelectedStyle(): {
    fill?: string
    stroke?: string
    strokeWidth?: number
    strokeDasharray?: string
    opacity?: number
  } | null {
    const selectedCells = this.graph.getSelectedCells()
    if (!selectedCells || selectedCells.length === 0) return null
    const cell = selectedCells[0]
    if (!cell.isNode()) return null

    const attrs = cell.getAttrs()?.body || {}
    const data = cell.getData() || {}

    return {
      fill: (data.fill as string) || (attrs.fill as string) || '#ffffff',
      stroke: (data.stroke as string) || (attrs.stroke as string) || '#333333',
      strokeWidth: Number(data.strokeWidth ?? attrs.strokeWidth ?? attrs['stroke-width'] ?? 2),
      strokeDasharray: (data.strokeDasharray as string) || (attrs.strokeDasharray as string) || (attrs['stroke-dasharray'] as string) || 'none',
      opacity: Number(data.opacity !== undefined ? data.opacity : attrs.opacity !== undefined ? attrs.opacity : 1),
    }
  }

  /**
   * 判断图元是否为文本节点
   */
  public isTextNode(cell?: any): boolean {
    if (!cell) {
      const selected = this.graph.getSelectedCells()
      if (!selected.length) return false
      cell = selected[0]
    }
    if (!cell || !cell.isNode()) return false
    return (
      cell.shape === 'speed-text-node' ||
      cell.shape === 'text-block' ||
      cell.getData()?.type === 'text'
    )
  }

  /**
   * 判断图元是否为矢量图形节点
   */
  public isShapeNode(cell?: any): boolean {
    if (!cell) {
      const selected = this.graph.getSelectedCells()
      if (!selected.length) return false
      cell = selected[0]
    }
    if (!cell || !cell.isNode()) return false
    return (
      cell.shape === 'speed-shape-node' ||
      cell.getData()?.type === 'shape'
    )
  }

  /**
   * 插入全量矢量图形库中的图形节点
   */
  public addVectorShape(options: {
    shapeId: string
    shapeName?: string
    svgContent: string
    viewBox?: string
    x?: number
    y?: number
    width?: number
    height?: number
    fill?: string
    stroke?: string
    strokeWidth?: number
    strokeDasharray?: string
    opacity?: number
    text?: string
  }): Node {
    return this.addShape({
      shape: 'shape' as any,
      shapeId: options.shapeId,
      shapeName: options.shapeName,
      svgContent: options.svgContent,
      viewBox: options.viewBox,
      x: options.x,
      y: options.y,
      width: options.width ?? 100,
      height: options.height ?? 80,
      fill: options.fill ?? 'transparent',
      stroke: options.stroke ?? '#374151',
      strokeWidth: options.strokeWidth ?? 2,
      strokeDasharray: options.strokeDasharray ?? 'none',
      opacity: options.opacity ?? 1,
      text: options.text ?? '',
    })
  }

  /**
   * 更新指定矢量图形节点属性 (SVG 几何、填充、边框、透明度、文本)
   */
  public updateShapeNode(
    nodeOrId: Node | string,
    options: {
      svgContent?: string
      viewBox?: string
      shapeId?: string
      shapeName?: string
      fill?: string
      stroke?: string
      strokeWidth?: number
      strokeDasharray?: string
      opacity?: number
      text?: string
      fontSize?: number
      textColor?: string
      bold?: boolean
      italic?: boolean
      strike?: boolean
      underline?: boolean
      align?: 'left' | 'center' | 'right' | 'justify'
      verticalAlign?: 'top' | 'middle' | 'bottom'
    }
  ) {
    const node = typeof nodeOrId === 'string' ? (this.graph.getCellById(nodeOrId) as Node) : nodeOrId
    if (!node || !node.isNode()) return

    const data = node.getData() || {}
    const newData = { ...data, ...options }
    node.setData(newData)

    if (options.svgContent !== undefined) {
      node.setAttrByPath('shapeBody/html', options.svgContent)
      node.setAttrByPath('shapeBody/preserveAspectRatio', 'none')
    }
    if (options.viewBox !== undefined) {
      node.setAttrByPath('shapeBody/viewBox', options.viewBox)
      node.setAttrByPath('shapeBody/preserveAspectRatio', 'none')
    }
    if (options.opacity !== undefined) {
      node.setAttrByPath('shapeBody/opacity', options.opacity)
    }

    // 文本属性更新
    if (options.text !== undefined) {
      node.setAttrByPath('label/text', options.text)
    }
    if (options.fontSize !== undefined) {
      node.setAttrByPath('label/fontSize', options.fontSize)
    }
    if (options.textColor !== undefined) {
      node.setAttrByPath('label/fill', options.textColor)
    }
    if (options.bold !== undefined) {
      node.setAttrByPath('label/fontWeight', options.bold ? 'bold' : 'normal')
    }
    if (options.italic !== undefined) {
      node.setAttrByPath('label/fontStyle', options.italic ? 'italic' : 'normal')
    }
    if (options.underline !== undefined || options.strike !== undefined) {
      const decs: string[] = []
      const underline = options.underline !== undefined ? options.underline : !!data.underline
      const strike = options.strike !== undefined ? options.strike : !!data.strike
      if (underline) decs.push('underline')
      if (strike) decs.push('line-through')
      node.setAttrByPath('label/textDecoration', decs.length ? decs.join(' ') : 'none')
    }
    if (options.align !== undefined) {
      const anchor = options.align === 'left' ? 'start' : options.align === 'right' ? 'end' : options.align === 'justify' ? 'start' : 'middle'
      node.setAttrByPath('label/textAnchor', anchor)
      if (options.align === 'left' || options.align === 'justify') {
        node.removeAttrByPath('label/refDx')
        node.setAttrByPath('label/refX', 12)
      } else if (options.align === 'right') {
        node.removeAttrByPath('label/refX')
        node.setAttrByPath('label/refDx', -12)
      } else {
        node.removeAttrByPath('label/refDx')
        node.setAttrByPath('label/refX', '50%')
      }
    }
    if (options.verticalAlign !== undefined) {
      const vAnchor = options.verticalAlign === 'top' ? 'top' : options.verticalAlign === 'bottom' ? 'bottom' : 'middle'
      node.setAttrByPath('label/textVerticalAnchor', vAnchor)
      if (options.verticalAlign === 'top') {
        node.removeAttrByPath('label/refDy')
        node.setAttrByPath('label/refY', 12)
      } else if (options.verticalAlign === 'bottom') {
        node.removeAttrByPath('label/refY')
        node.setAttrByPath('label/refDy', -12)
      } else {
        node.removeAttrByPath('label/refDy')
        node.setAttrByPath('label/refY', '50%')
      }
    }
  }

  /**
   * 获取指定图形节点数据
   */
  public getShapeNodeData(cell?: any) {
    if (!cell) {
      const selected = this.graph.getSelectedCells()
      if (!selected.length) return null
      cell = selected[0]
    }
    if (!cell || !cell.isNode()) return null
    return cell.getData() || null
  }

  /**
   * 自动连接两个节点端口 (支持曼哈顿正交折线 + 箭头)
   */
  public connectNodes(options: {
    source: Node | string
    target: Node | string
    sourcePort?: string
    targetPort?: string
    stroke?: string
    strokeWidth?: number
  }) {
    const edge = this.graph.addEdge({
      shape: 'edge',
      source: {
        cell: typeof options.source === 'string' ? options.source : options.source.id,
        port: options.sourcePort || 'right',
      },
      target: {
        cell: typeof options.target === 'string' ? options.target : options.target.id,
        port: options.targetPort || 'left',
      },
      attrs: {
        line: {
          stroke: options.stroke || '#93c5fd',
          strokeWidth: options.strokeWidth || 2,
          targetMarker: {
            name: 'classic',
            size: 7,
          },
        },
      },
      router: {
        name: 'manhattan',
        args: {
          padding: 10,
        },
      },
      connector: {
        name: 'rounded',
        args: {
          radius: 8,
        },
      },
    })
    return edge
  }

  /**
   * 添加独立连线/箭头 (支持箭头线、直线、正交折线、曲线)
   */
  public addLine(options: {
    type?: 'arrow' | 'straight' | 'elbow' | 'curve'
    source?: { x: number; y: number } | { cell: string; port?: string }
    target?: { x: number; y: number } | { cell: string; port?: string }
    stroke?: string
    strokeWidth?: number
    strokeDasharray?: string
  } = {}) {
    const center = this.getViewportCenter()
    const source = options.source || { x: Math.round(center.x - 70), y: Math.round(center.y) }
    const target = options.target || { x: Math.round(center.x + 70), y: Math.round(center.y) }
    const type = options.type || 'arrow'

    const attrs: any = {
      line: {
        stroke: options.stroke || '#374151',
        strokeWidth: options.strokeWidth || 2,
        strokeDasharray: options.strokeDasharray && options.strokeDasharray !== 'none' ? options.strokeDasharray : undefined,
      },
    }

    if (type !== 'straight') {
      attrs.line.targetMarker = {
        name: 'classic',
        size: 8,
      }
    }

    const edgeConfig: any = {
      shape: 'edge',
      source,
      target,
      attrs,
    }

    if (type === 'elbow') {
      edgeConfig.router = {
        name: 'manhattan',
        args: { padding: 10 },
      }
      edgeConfig.connector = {
        name: 'rounded',
        args: { radius: 8 },
      }
    } else if (type === 'curve') {
      edgeConfig.connector = {
        name: 'smooth',
      }
    } else {
      edgeConfig.connector = {
        name: 'normal',
      }
    }

    const edge = this.graph.addEdge(edgeConfig)
    this.graph.cleanSelection()
    this.graph.select(edge)
    return edge
  }

  /**
   * 更新指定文本节点属性 (内容、字号、颜色、样式、对齐、链接)
   */
  public updateTextNode(
    nodeOrId: Node | string,
    options: {
      text?: string
      link?: string
      fontSize?: number
      fill?: string
      bold?: boolean
      italic?: boolean
      strike?: boolean
      underline?: boolean
      align?: 'left' | 'center' | 'right' | 'justify'
      verticalAlign?: 'top' | 'middle' | 'bottom'
    }
  ) {
    const node = typeof nodeOrId === 'string' ? (this.graph.getCellById(nodeOrId) as Node) : nodeOrId
    if (!node || !node.isNode()) return

    const data = node.getData() || {}
    const newData = { ...data, ...options }
    node.setData(newData)

    if (options.text !== undefined) {
      node.setAttrByPath('label/text', options.text)
    }
    if (options.fontSize !== undefined) {
      node.setAttrByPath('label/fontSize', options.fontSize)
    }
    if (options.fill !== undefined) {
      node.setAttrByPath('label/fill', options.fill)
    }
    if (options.bold !== undefined) {
      node.setAttrByPath('label/fontWeight', options.bold ? 'bold' : 'normal')
    }
    if (options.italic !== undefined) {
      node.setAttrByPath('label/fontStyle', options.italic ? 'italic' : 'normal')
    }

    const isUnderline = options.underline !== undefined ? options.underline : data.underline
    const isStrike = options.strike !== undefined ? options.strike : data.strike
    let decoration = 'none'
    if (isUnderline && isStrike) decoration = 'underline line-through'
    else if (isUnderline) decoration = 'underline'
    else if (isStrike) decoration = 'line-through'
    node.setAttrByPath('label/textDecoration', decoration)

    const align = options.align || data.align || 'left'
    if (align === 'left' || align === 'justify') {
      node.setAttrByPath('label/textAnchor', 'start')
      node.removeAttrByPath('label/refDx')
      node.setAttrByPath('label/refX', 8)
    } else if (align === 'center') {
      node.setAttrByPath('label/textAnchor', 'middle')
      node.removeAttrByPath('label/refDx')
      node.setAttrByPath('label/refX', '50%')
    } else if (align === 'right') {
      node.setAttrByPath('label/textAnchor', 'end')
      node.removeAttrByPath('label/refX')
      node.setAttrByPath('label/refDx', -8)
    }

    const verticalAlign = options.verticalAlign || data.verticalAlign || 'middle'
    if (verticalAlign === 'top') {
      node.setAttrByPath('label/textVerticalAnchor', 'top')
      node.removeAttrByPath('label/refDy')
      node.setAttrByPath('label/refY', 8)
    } else if (verticalAlign === 'middle') {
      node.setAttrByPath('label/textVerticalAnchor', 'middle')
      node.removeAttrByPath('label/refDy')
      node.setAttrByPath('label/refY', '50%')
    } else if (verticalAlign === 'bottom') {
      node.setAttrByPath('label/textVerticalAnchor', 'bottom')
      node.removeAttrByPath('label/refY')
      node.setAttrByPath('label/refDy', -8)
    }

    // 动态调整宽度与高度以适应文字
    const text = options.text !== undefined ? options.text : ((node.getAttrByPath('label/text') as string) || '')
    const fs = options.fontSize || ((node.getAttrByPath('label/fontSize') as number) || 14)
    const lines = text.split('\n')
    const maxLineLen = Math.max(...lines.map((l: string) => l.length), 2)
    const minWidth = 80
    const minHeight = 36
    const calcWidth = Math.max(minWidth, maxLineLen * fs * 0.95 + 24)
    const calcHeight = Math.max(minHeight, lines.length * fs * 1.45 + 16)
    node.setSize(Math.round(calcWidth), Math.round(calcHeight))
  }

  /**
   * 更新当前选中文本图元属性
   */
  public updateSelectedTextStyle(options: {
    text?: string
    link?: string
    fontSize?: number
    fill?: string
    bold?: boolean
    italic?: boolean
    strike?: boolean
    underline?: boolean
    align?: 'left' | 'center' | 'right' | 'justify'
    verticalAlign?: 'top' | 'middle' | 'bottom'
  }) {
    const selectedCells = this.graph.getSelectedCells()
    if (!selectedCells || selectedCells.length === 0) return
    for (const cell of selectedCells) {
      if (cell.isNode()) {
        if (this.isShapeNode(cell)) {
          this.updateShapeNode(cell, {
            ...options,
            textColor: options.fill,
          })
        } else {
          this.updateTextNode(cell, options)
        }
      }
    }
  }

  /**
   * 获取当前选中图元的文本属性
   */
  public getSelectedTextData(): {
    text: string
    link: string
    fontSize: number
    fill: string
    bold: boolean
    italic: boolean
    strike: boolean
    underline: boolean
    align: 'left' | 'center' | 'right' | 'justify'
    verticalAlign: 'top' | 'middle' | 'bottom'
  } | null {
    const selectedCells = this.graph.getSelectedCells()
    if (!selectedCells || selectedCells.length === 0) return null
    const cell = selectedCells[0]
    if (!cell.isNode()) return null

    const attrs = cell.getAttrs()?.label || {}
    const data = cell.getData() || {}

    const text = (attrs.text as string) ?? (data.text as string) ?? ''
    const fontSize = Number(attrs.fontSize ?? data.fontSize ?? 14)
    const fill = (attrs.fill as string) ?? (data.fill as string) ?? '#262626'
    const bold = attrs.fontWeight === 'bold' || !!data.bold
    const italic = attrs.fontStyle === 'italic' || !!data.italic
    const dec = (attrs.textDecoration as string) || ''
    const underline = dec.includes('underline') || !!data.underline
    const strike = dec.includes('line-through') || !!data.strike
    const align = data.align || (attrs.textAnchor === 'middle' ? 'center' : attrs.textAnchor === 'end' ? 'right' : 'left')
    const verticalAlign = data.verticalAlign || (attrs.textVerticalAnchor === 'top' ? 'top' : attrs.textVerticalAnchor === 'bottom' ? 'bottom' : 'middle')

    return {
      text,
      link: data.link || '',
      fontSize,
      fill,
      bold,
      italic,
      strike,
      underline,
      align,
      verticalAlign,
    }
  }

  private commitFreehandPath(): Node | undefined {
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

    if (mode === 'pencil') {
      if (options?.width === undefined) this.drawWidth = 3
      if (options?.opacity === undefined) this.drawOpacity = 1
      this.selectionPlugin?.disableRubberband()
      this.scrollerPlugin?.disablePanning()
      this.container.style.cursor = 'crosshair'
    } else if (mode === 'vector') {
      this.selectionPlugin?.disableRubberband()
      this.scrollerPlugin?.disablePanning()
      this.container.style.cursor = 'crosshair'
    } else if (mode === 'marker') {
      if (options?.width === undefined) this.drawWidth = 14
      if (options?.opacity === undefined) this.drawOpacity = 0.5
      this.selectionPlugin?.disableRubberband()
      this.scrollerPlugin?.disablePanning()
      this.container.style.cursor = 'crosshair'
    } else if (mode === 'brush') {
      if (options?.width === undefined) this.drawWidth = 6
      if (options?.opacity === undefined) this.drawOpacity = 0.85
      this.selectionPlugin?.disableRubberband()
      this.scrollerPlugin?.disablePanning()
      this.container.style.cursor = 'crosshair'
    } else if (mode === 'eraser') {
      this.selectionPlugin?.disableRubberband()
      this.scrollerPlugin?.disablePanning()
      this.container.style.cursor = 'pointer'
    } else if (mode === 'hand') {
      this.selectionPlugin?.disableRubberband()
      this.scrollerPlugin?.enablePanning()
      this.container.style.cursor = 'grab'
    } else {
      // 'select'
      this.selectionPlugin?.enableRubberband()
      this.scrollerPlugin?.enablePanning()
      this.container.style.cursor = 'default'
    }
  }

  public getDrawingMode(): DrawingMode {
    return this.drawingMode
  }

  public getDrawingOptions(): { color: string; width: number; opacity: number } {
    return {
      color: this.drawColor,
      width: this.drawWidth,
      opacity: this.drawOpacity,
    }
  }

  public destroy() {
    for (const ext of this.extensions.values()) {
      ext.onDestroy?.()
    }
    this.extensions.clear()
    for (const cleanup of this.drawingCleanupFns) {
      cleanup()
    }
    this.drawingCleanupFns = []
    if (this.tempSvgPath && this.tempSvgPath.parentNode) {
      this.tempSvgPath.parentNode.removeChild(this.tempSvgPath)
    }
    this.graph.dispose()
  }
}
