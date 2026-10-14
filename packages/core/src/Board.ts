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
              stroke: '#3b82f6',
              strokeWidth: 1.5,
              fill: '#ffffff',
              opacity: 0,
              style: {
                cursor: 'crosshair',
                transition: 'opacity 0.15s ease, transform 0.15s ease',
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
              stroke: '#3b82f6',
              strokeWidth: 1.5,
              fill: '#ffffff',
              opacity: 0,
              style: {
                cursor: 'crosshair',
                transition: 'opacity 0.15s ease, transform 0.15s ease',
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
              stroke: '#3b82f6',
              strokeWidth: 1.5,
              fill: '#ffffff',
              opacity: 0,
              style: {
                cursor: 'crosshair',
                transition: 'opacity 0.15s ease, transform 0.15s ease',
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
              stroke: '#3b82f6',
              strokeWidth: 1.5,
              fill: '#ffffff',
              opacity: 0,
              style: {
                cursor: 'crosshair',
                transition: 'opacity 0.15s ease, transform 0.15s ease',
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
  // 全局活跃画板调度器：保证一页多实例或文档内嵌时，快捷键精准分发给当前活跃画板，不抢占外部按键
  public static activeBoard: Board | null = null
  private static globalActiveListenerInitialized = false

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
  private keyboardPlugin?: Keyboard
  private clipboardPlugin?: Clipboard
  private historyPlugin?: History

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

    // 默认激活当前实例
    Board.activeBoard = this

    this.initActiveBoardListener()
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

  private initActiveBoardListener() {
    // 鼠标在当前画板内点击或交互时，立即设为当前活跃画板
    const activate = () => {
      Board.activeBoard = this
    }
    this.container.addEventListener('pointerdown', activate, true)
    this.container.addEventListener('focusin', activate, true)

    this.drawingCleanupFns.push(() => {
      this.container.removeEventListener('pointerdown', activate, true)
      this.container.removeEventListener('focusin', activate, true)
    })

    // 全局点击监听器（全局仅初始化一次）：当点击落在画板外部（如外部富文本段落/外部表单）时，清空活跃画板释放全局按键
    if (!Board.globalActiveListenerInitialized && typeof document !== 'undefined') {
      Board.globalActiveListenerInitialized = true
      document.addEventListener(
        'pointerdown',
        (e: PointerEvent) => {
          const target = e.target as HTMLElement | null
          // 如果点击落在任何 speed-board 画板或其弹层/菜单/气泡内部，保持活跃状态
          if (
            target?.closest('.speed-board') ||
            target?.closest('.speed-board-canvas-wrapper') ||
            target?.closest('.ant-popover') ||
            target?.closest('.ant-dropdown') ||
            target?.closest('.ant-modal') ||
            target?.closest('.ant-tooltip')
          ) {
            return
          }
          Board.activeBoard = null
        },
        true
      )
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
        snap: {
          radius: 35,
          anchor: 'bbox',
        },
        allowBlank: true,
        allowLoop: false,
        allowNode: true,
        allowPort: true,
        allowEdge: false,
        highlight: false,
        anchor: 'midSide',
        connectionPoint: 'anchor',
        createEdge() {
          return this.createEdge({
            shape: 'edge',
            attrs: {
              line: {
                stroke: '#374151',
                strokeWidth: 2,
                targetMarker: {
                  name: 'block',
                  width: 9,
                  height: 6,
                  offset: 0,
                },
              },
            },
            router: {
              name: 'normal',
            },
            connector: {
              name: 'normal',
            },
          })
        },
        router: {
          name: 'normal',
        },
        connector: {
          name: 'normal',
        },
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
      pannable: false, // 默认在 select 模式下禁用普通左键拖拽平移，交由 Selection 框选；按住 Space 或切换抓手模式时触发平移
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
      showNodeSelectionBox: true, // 启用选框，在多选时展示各图元蓝色外框
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

    // 5. 快捷键系统 (启用 global: true 全局捕获白板快捷键，并结合 activeBoard guard 守卫精准分发，多实例互不干扰)
    this.keyboardPlugin = new Keyboard({
      enabled: true,
      global: true,
      guard: () => {
        return Board.activeBoard === this
      },
    })
    this.graph.use(this.keyboardPlugin)

    // 6. 剪贴板
    this.clipboardPlugin = new Clipboard({ enabled: true })
    this.graph.use(this.clipboardPlugin)

    // 7. 撤销重做历史记录 (History)
    this.historyPlugin = new History({ enabled: true })
    this.graph.use(this.historyPlugin)
    this.historyPlugin.on('change', () => {
      this.graph.trigger('history:change')
    })
  }

  private initEvents() {
    this.graph.on('cell:click', () => {
      Board.activeBoard = this
    })
    this.graph.on('blank:click', () => {
      Board.activeBoard = this
    })

    // 选中图元时同步激活 Transform 单一控制框与多选边框：单选展示带手柄控制框；多选展示纯线选框并隐藏手柄
    this.graph.on('selection:changed', ({ selected }: any) => {
      Board.activeBoard = this
      const selectedNodes = (selected || []).filter((cell: any) => cell.isNode())
      const root = this.container.closest('.speed-board') || this.container
      if (selectedNodes.length === 1) {
        this.container.classList.add('is-single-selected')
        root.classList.add('is-single-selected')
        this.transformPlugin?.clearWidgets()
        this.transformPlugin?.createWidget(selectedNodes[0])
      } else {
        this.container.classList.remove('is-single-selected')
        root.classList.remove('is-single-selected')
        this.transformPlugin?.clearWidgets()
        this.syncSelectionBoxesTransform()
      }
    })

    this.graph.on('node:change:angle', () => {
      this.syncSelectionBoxesTransform()
    })

    // 监听 Space 空格键全局平移画布 (松开后恢复框选)
    this.initSpacePanning()

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

    // 撤销快捷键 Ctrl+Z / Cmd+Z
    this.graph.bindKey(['ctrl+z', 'meta+z'], () => {
      this.undo()
      return false
    })

    // 重做快捷键 Ctrl+Y / Cmd+Y / Ctrl+Shift+Z / Cmd+Shift+Z
    this.graph.bindKey(['ctrl+y', 'meta+y', 'ctrl+shift+z', 'meta+shift+z'], () => {
      this.redo()
      return false
    })

    // 复制快捷键 Ctrl+C / Cmd+C
    this.graph.bindKey(['ctrl+c', 'meta+c'], () => {
      this.copy()
      return false
    })

    // 剪切快捷键 Ctrl+X / Cmd+X
    this.graph.bindKey(['ctrl+x', 'meta+x'], () => {
      this.cut()
      return false
    })

    // 粘贴快捷键 Ctrl+V / Cmd+V
    this.graph.bindKey(['ctrl+v', 'meta+v'], () => {
      this.paste()
      return false
    })

    // 画布缩放快捷键
    this.graph.bindKey(['ctrl+=', 'meta+=', 'ctrl++', 'meta++'], () => {
      this.zoom(0.1)
      return false
    })

    this.graph.bindKey(['ctrl+-', 'meta+-'], () => {
      this.zoom(-0.1)
      return false
    })

    this.graph.bindKey(['ctrl+0', 'meta+0'], () => {
      this.zoomTo(1)
      return false
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

    // 复制副本快捷键 Ctrl+D / Cmd+D
    this.graph.bindKey(['ctrl+d', 'meta+d'], () => {
      this.duplicateSelected()
      return false
    })

    // 置于顶层快捷键 Ctrl+] / Cmd+]
    this.graph.bindKey(['ctrl+]', 'meta+]'], () => {
      this.bringSelectedToFront()
      return false
    })

    // 置于底层快捷键 Ctrl+[ / Cmd+[
    this.graph.bindKey(['ctrl+[', 'meta+['], () => {
      this.sendSelectedToBack()
      return false
    })

    // 上移一层快捷键 Alt+] / Option+]
    this.graph.bindKey(['alt+]', 'option+]'], () => {
      this.bringSelectedForward()
      return false
    })

    // 下移一层快捷键 Alt+[ / Option+[
    this.graph.bindKey(['alt+[', 'option+['], () => {
      this.sendSelectedBackward()
      return false
    })

    // 成组快捷键 Ctrl+G / Cmd+G
    this.graph.bindKey(['ctrl+g', 'meta+g'], () => {
      this.groupSelected()
      return false
    })

    // 解散成组快捷键 Ctrl+Shift+G / Cmd+Shift+G
    this.graph.bindKey(['ctrl+shift+g', 'meta+shift+g'], () => {
      this.ungroupSelected()
      return false
    })

    // 锁定/解锁快捷键 Ctrl+L / Cmd+L
    this.graph.bindKey(['ctrl+l', 'meta+l'], () => {
      this.toggleLockSelected()
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
    this.historyPlugin?.undo()
    this.graph.trigger('history:change')
  }

  public redo() {
    this.historyPlugin?.redo()
    this.graph.trigger('history:change')
  }

  public canUndo(): boolean {
    return this.historyPlugin?.canUndo() ?? false
  }

  public canRedo(): boolean {
    return this.historyPlugin?.canRedo() ?? false
  }

  public copy() {
    const cells = this.graph.getSelectedCells()
    if (cells.length > 0) {
      this.clipboardPlugin?.copy(cells, { offset: 30 })
    }
  }

  public cut() {
    const cells = this.graph.getSelectedCells()
    if (cells.length > 0) {
      this.clipboardPlugin?.cut(cells, { offset: 30 })
    }
  }

  public paste() {
    if (this.clipboardPlugin && !this.clipboardPlugin.isEmpty()) {
      const cells = this.clipboardPlugin.paste({ offset: 30 }, this.graph)
      if (cells && cells.length > 0) {
        this.graph.cleanSelection()
        this.graph.select(cells)
      }
    }
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
      cell.getData()?.type === 'shape' ||
      cell.shape === 'rect' ||
      cell.shape === 'circle' ||
      cell.shape === 'polygon' ||
      cell.shape === 'speed-sticky-node'
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
   * 显示或隐藏指定图形节点的连接桩（Ports），并呈现柔和浅蓝触碰高亮与桩点高亮 (1:1 语雀交互)
   */
  public showNodePorts(node: Node | string | null, visible: boolean, activePortId?: string) {
    if (!node) return
    const cell = typeof node === 'string' ? this.graph.getCellById(node) : node
    if (!cell || !cell.isNode() || !this.isShapeNode(cell)) return
    const view = this.graph.findViewByCell(cell)
    if (view && view.container) {
      // 1. 柔和浅蓝色高亮底色与浅蓝描边 (1:1 语雀触碰状态，非粗重外边框)
      const bgEl = (view.container.querySelector('[data-selector="bg"]') || view.container.querySelector('.x6-node-bg')) as SVGRectElement | null
      if (bgEl) {
        if (visible) {
          bgEl.setAttribute('fill', 'rgba(59, 130, 246, 0.08)')
          bgEl.setAttribute('stroke', '#3b82f6')
          bgEl.setAttribute('stroke-width', '1.5')
          bgEl.setAttribute('rx', '4')
          bgEl.setAttribute('ry', '4')
        } else {
          bgEl.setAttribute('fill', 'transparent')
          bgEl.setAttribute('stroke', 'transparent')
          bgEl.setAttribute('stroke-width', '0')
        }
      }

      // 2. 候选桩点显隐与高亮控制
      const ports = view.container.querySelectorAll<SVGGElement>('.x6-port')
      ports.forEach((p) => {
        const circle = p.querySelector<SVGCircleElement>('circle')
        if (!circle) return
        if (!visible) {
          circle.style.opacity = '0'
        } else {
          circle.style.opacity = '1'
          const portId = p.getAttribute('data-port')
          if (activePortId && portId === activePortId) {
            // 吸附目标桩点：实心深蓝点 (1:1 语雀)
            circle.setAttribute('r', '5')
            circle.setAttribute('fill', '#2563eb')
            circle.setAttribute('stroke', '#2563eb')
            circle.setAttribute('stroke-width', '1')
          } else {
            // 普通候选桩点：白色圆点 + 浅蓝细边 (1:1 语雀)
            circle.setAttribute('r', '3.5')
            circle.setAttribute('fill', '#ffffff')
            circle.setAttribute('stroke', '#3b82f6')
            circle.setAttribute('stroke-width', '1.5')
          }
        }
      })
    }
  }

  /**
   * 隐藏画布上所有图形节点的连接桩
   */
  public hideAllPorts() {
    const nodes = this.graph.getNodes()
    nodes.forEach((node) => {
      if (this.isShapeNode(node)) {
        this.showNodePorts(node, false)
      }
    })
  }

  /**
   * 批量切换所有图形节点的真实连接桩（Ports）显示状态
   */
  public toggleAllPortsVisibility(visible: boolean) {
    if (!visible) {
      this.hideAllPorts()
    } else {
      const nodes = this.graph.getNodes()
      nodes.forEach((node) => {
        if (this.isShapeNode(node)) {
          this.showNodePorts(node, true)
        }
      })
    }
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
            name: 'block',
            width: 9,
            height: 6,
            offset: 0,
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
    source?: { x: number; y: number } | { cell: string; port?: string; anchor?: any; connectionPoint?: any }
    target?: { x: number; y: number } | { cell: string; port?: string; anchor?: any; connectionPoint?: any }
    stroke?: string
    strokeWidth?: number
    strokeDasharray?: string
  } = {}) {
    const center = this.getViewportCenter()
    const source = options.source || { x: Math.round(center.x - 70), y: Math.round(center.y) }
    const target = options.target || { x: Math.round(center.x + 70), y: Math.round(center.y) }
    const type = options.type || 'straight'

    const attrs: any = {
      line: {
        stroke: options.stroke || '#374151',
        strokeWidth: options.strokeWidth || 2,
        strokeDasharray: options.strokeDasharray && options.strokeDasharray !== 'none' ? options.strokeDasharray : undefined,
        targetMarker: {
          name: 'block',
          width: 9,
          height: 6,
          offset: 0,
        },
      },
    }

    const edgeConfig: any = {
      shape: 'edge',
      source,
      target,
      attrs,
      connectionPoint: 'anchor',
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
      edgeConfig.router = {
        name: 'normal',
      }
      edgeConfig.connector = {
        name: 'smooth',
      }
    } else {
      // 直线 (straight): 严格保持两点之间的直线连接，绝不添加正交折点
      edgeConfig.router = {
        name: 'normal',
      }
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
      this.scrollerPlugin?.disablePanning()
      this.container.style.cursor = 'default'
    }
  }

  private isSpaceDown = false

  private initSpacePanning() {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !this.isSpaceDown) {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return
        this.isSpaceDown = true
        if (this.drawingMode === 'select') {
          this.selectionPlugin?.disableRubberband()
          this.scrollerPlugin?.enablePanning()
          this.container.style.cursor = 'grab'
        }
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && this.isSpaceDown) {
        this.isSpaceDown = false
        if (this.drawingMode === 'select') {
          this.scrollerPlugin?.disablePanning()
          this.selectionPlugin?.enableRubberband()
          this.container.style.cursor = 'default'
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    this.drawingCleanupFns.push(() => {
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

  /**
   * 对齐选中的图形节点 (1:1 语雀白板多选对齐)
   */
  public alignSelectedNodes(type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') {
    const selectedNodes = this.graph.getSelectedCells().filter((c) => c.isNode())
    if (selectedNodes.length < 2) return

    const bboxes = selectedNodes.map((node) => ({
      node,
      bbox: node.getBBox(),
    }))

    if (type === 'left') {
      const minX = Math.min(...bboxes.map((b) => b.bbox.x))
      bboxes.forEach(({ node, bbox }) => {
        node.setPosition(minX, bbox.y)
      })
    } else if (type === 'center') {
      const minX = Math.min(...bboxes.map((b) => b.bbox.x))
      const maxRight = Math.max(...bboxes.map((b) => b.bbox.right))
      const targetCenter = (minX + maxRight) / 2
      bboxes.forEach(({ node, bbox }) => {
        node.setPosition(targetCenter - bbox.width / 2, bbox.y)
      })
    } else if (type === 'right') {
      const maxRight = Math.max(...bboxes.map((b) => b.bbox.right))
      bboxes.forEach(({ node, bbox }) => {
        node.setPosition(maxRight - bbox.width, bbox.y)
      })
    } else if (type === 'top') {
      const minY = Math.min(...bboxes.map((b) => b.bbox.y))
      bboxes.forEach(({ node, bbox }) => {
        node.setPosition(bbox.x, minY)
      })
    } else if (type === 'middle') {
      const minY = Math.min(...bboxes.map((b) => b.bbox.y))
      const maxBottom = Math.max(...bboxes.map((b) => b.bbox.bottom))
      const targetMiddle = (minY + maxBottom) / 2
      bboxes.forEach(({ node, bbox }) => {
        node.setPosition(bbox.x, targetMiddle - bbox.height / 2)
      })
    } else if (type === 'bottom') {
      const maxBottom = Math.max(...bboxes.map((b) => b.bbox.bottom))
      bboxes.forEach(({ node, bbox }) => {
        node.setPosition(bbox.x, maxBottom - bbox.height)
      })
    }
  }

  /**
   * 水平/垂直均分分布选中的图形节点
   */
  public distributeSelectedNodes(type: 'horizontal' | 'vertical') {
    const selectedNodes = this.graph.getSelectedCells().filter((c) => c.isNode())
    if (selectedNodes.length < 3) return

    if (type === 'horizontal') {
      const sorted = selectedNodes
        .map((node) => ({ node, bbox: node.getBBox() }))
        .sort((a, b) => a.bbox.x - b.bbox.x)

      const first = sorted[0].bbox
      const last = sorted[sorted.length - 1].bbox
      const totalElementsWidth = sorted.slice(1, -1).reduce((acc, curr) => acc + curr.bbox.width, 0)
      const totalSpan = last.x - first.right
      const gap = (totalSpan - totalElementsWidth) / (sorted.length - 1)

      let currentX = first.right + gap
      for (let i = 1; i < sorted.length - 1; i++) {
        sorted[i].node.setPosition(currentX, sorted[i].bbox.y)
        currentX += sorted[i].bbox.width + gap
      }
    } else if (type === 'vertical') {
      const sorted = selectedNodes
        .map((node) => ({ node, bbox: node.getBBox() }))
        .sort((a, b) => a.bbox.y - b.bbox.y)

      const first = sorted[0].bbox
      const last = sorted[sorted.length - 1].bbox
      const totalElementsHeight = sorted.slice(1, -1).reduce((acc, curr) => acc + curr.bbox.height, 0)
      const totalSpan = last.y - first.bottom
      const gap = (totalSpan - totalElementsHeight) / (sorted.length - 1)

      let currentY = first.bottom + gap
      for (let i = 1; i < sorted.length - 1; i++) {
        sorted[i].node.setPosition(sorted[i].bbox.x, currentY)
        currentY += sorted[i].bbox.height + gap
      }
    }
  }

  /**
   * 置于顶层
   */
  public bringSelectedToFront() {
    this.graph.getSelectedCells().forEach((cell) => cell.toFront())
  }

  /**
   * 置于底层
   */
  public sendSelectedToBack() {
    this.graph.getSelectedCells().forEach((cell) => cell.toBack())
  }

  /**
   * 上移一层
   */
  public bringSelectedForward() {
    this.graph.getSelectedCells().forEach((cell) => {
      const z = cell.getZIndex() || 1
      cell.setZIndex(z + 1)
    })
  }

  /**
   * 下移一层
   */
  public sendSelectedBackward() {
    this.graph.getSelectedCells().forEach((cell) => {
      const z = cell.getZIndex() || 1
      cell.setZIndex(Math.max(1, z - 1))
    })
  }

  /**
   * 快速克隆/复制选中的图元 (Ctrl+D / Cmd+D)
   */
  public duplicateSelected(offset = 24) {
    const selected = this.graph.getSelectedCells()
    if (!selected.length) return []
    const cloned = this.graph.cloneCells(selected)
    cloned.forEach((cell) => {
      if (cell.isNode()) {
        const pos = cell.getPosition()
        cell.setPosition(pos.x + offset, pos.y + offset)
      }
    })
    this.graph.addCells(cloned)
    this.graph.cleanSelection()
    this.graph.select(cloned)
    return cloned
  }

  /**
   * 将选中的多个图形打包成组 (Ctrl+G / Cmd+G)
   */
  public groupSelected() {
    const selectedNodes = this.graph.getSelectedCells().filter((c) => c.isNode())
    if (selectedNodes.length < 2) return null

    const bboxes = selectedNodes.map((n) => n.getBBox())
    const minX = Math.min(...bboxes.map((b) => b.x))
    const minY = Math.min(...bboxes.map((b) => b.y))
    const maxRight = Math.max(...bboxes.map((b) => b.right))
    const maxBottom = Math.max(...bboxes.map((b) => b.bottom))
    const pad = 6

    const groupNode = this.graph.addNode({
      shape: 'rect',
      x: minX - pad,
      y: minY - pad,
      width: maxRight - minX + pad * 2,
      height: maxBottom - minY + pad * 2,
      zIndex: Math.max(1, Math.min(...selectedNodes.map((n) => n.getZIndex() || 1)) - 1),
      attrs: {
        body: {
          fill: 'transparent',
          stroke: 'transparent',
          strokeWidth: 0,
          pointerEvents: 'visiblePainted',
        },
      },
      data: {
        type: 'group',
        isGroup: true,
      },
    })

    selectedNodes.forEach((node) => {
      groupNode.addChild(node)
    })

    this.graph.cleanSelection()
    this.graph.select(groupNode)
    return groupNode
  }

  /**
   * 解散选中节点的分组 (Ctrl+Shift+G / Cmd+Shift+G)
   */
  public ungroupSelected() {
    const selected = this.graph.getSelectedCells().filter((c) => c.isNode())
    if (!selected.length) return

    const childrenToSelect: any[] = []
    selected.forEach((node) => {
      const children = node.getChildren()
      if (children && children.length > 0) {
        children.forEach((child) => {
          node.removeChild(child)
          childrenToSelect.push(child)
        })
        this.graph.removeNode(node)
      }
    })

    if (childrenToSelect.length > 0) {
      this.graph.cleanSelection()
      this.graph.select(childrenToSelect)
    }
  }

  /**
   * 锁定/解锁选中的图元 (Ctrl+L / Cmd+L)
   */
  public toggleLockSelected(): boolean {
    const selected = this.graph.getSelectedCells()
    if (!selected.length) return false
    const anyUnlocked = selected.some((c) => !c.getData()?.locked)
    const newLocked = anyUnlocked

    selected.forEach((cell) => {
      const data = cell.getData() || {}
      cell.setData({ ...data, locked: newLocked })
      if (cell.isNode()) {
        cell.prop('movable', !newLocked)
      }
    })
    return newLocked
  }

  public syncSelectionBoxesTransform() {
    requestAnimationFrame(() => {
      const container = this.container.querySelector('.x6-widget-selection')
      if (!container) return
      const boxes = container.querySelectorAll('.x6-widget-selection-box')
      boxes.forEach((box) => {
        const id = box.getAttribute('data-cell-id')
        if (id) {
          const cell = this.graph.getCellById(id)
          if (cell && cell.isNode()) {
            const angle = cell.getAngle() || 0
            if (angle) {
              ;(box as HTMLElement).style.transform = `rotate(${angle}deg)`
              ;(box as HTMLElement).style.transformOrigin = 'center center'
            } else {
              ;(box as HTMLElement).style.transform = ''
            }
          }
        }
      })
    })
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
    if (Board.activeBoard === this) {
      Board.activeBoard = null
    }
    this.graph.dispose()
  }
}
