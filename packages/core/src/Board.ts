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

export type ShapeType = 'rect' | 'circle' | 'diamond' | 'text' | 'sticky' | 'icon'

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

export class Board {
  public container: HTMLElement
  public graph!: Graph
  public ydoc: Y.Doc
  public yCells: Y.Map<any>
  public extensions: Map<string, Extension> = new Map()

  // 内部标记：防止协同循环触发
  private isApplyingRemoteUpdate = false

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
        allowBlank: false,
        allowLoop: false,
        highlight: true,
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
    this.graph.use(
      new Scroller({
        enabled: true,
        pannable: true,
        pageVisible: false,
        pageBreak: false,
        autoResize: true,
        autoResizeOptions: {
          minWidth: 3000,
          minHeight: 2000,
        },
      })
    )

    // 2. 磁吸对齐参考线 (Snapline)
    this.graph.use(
      new Snapline({
        enabled: true,
        sharp: true,
        clean: 100,
      })
    )

    // 3. 多选框选 (Selection)
    this.graph.use(
      new Selection({
        enabled: true,
        multiple: true,
        rubberband: true,
        movable: true,
        showNodeSelectionBox: true,
      })
    )

    // 4. 图元大小缩放与旋转控制柄 (Transform)
    this.graph.use(
      new Transform({
        resizing: {
          enabled: true,
          minWidth: 24,
          minHeight: 24,
        },
        rotating: {
          enabled: true,
          grid: 15,
        },
      })
    )

    // 5. 快捷键系统
    this.graph.use(new Keyboard({ enabled: true }))

    // 6. 剪贴板
    this.graph.use(new Clipboard({ enabled: true }))

    // 7. 撤销重做历史记录 (History)
    this.graph.use(new History({ enabled: true }))
  }

  private initEvents() {
    // 居中视口到内容
    this.graph.centerContent()

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
              fill: options.fill ?? '#eff6ff',
              stroke: options.stroke ?? '#3b82f6',
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
              fill: options.fill ?? '#fef3c7',
              stroke: options.stroke ?? '#f59e0b',
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
          shape: 'text-block',
          x,
          y,
          width: options.width ?? 120,
          height: options.height ?? 40,
          text: options.text || '双击编辑文本',
          attrs: {
            body: {
              fill: 'transparent',
              stroke: 'transparent',
            },
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
              fill: options.fill ?? '#ffffff',
              stroke: options.stroke ?? '#3b82f6',
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

  public destroy() {
    for (const ext of this.extensions.values()) {
      ext.onDestroy?.()
    }
    this.extensions.clear()
    this.graph.dispose()
  }
}
