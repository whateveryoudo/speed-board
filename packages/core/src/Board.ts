import { Graph, Node, Cell, Edge } from '@antv/x6'
export { Graph, Node, Cell, Edge }
import { Scroller } from '@antv/x6-plugin-scroller'
import { Snapline } from '@antv/x6-plugin-snapline'
import { Selection } from '@antv/x6-plugin-selection'
import { Transform } from '@antv/x6-plugin-transform'
import { Keyboard } from '@antv/x6-plugin-keyboard'
import { Clipboard } from '@antv/x6-plugin-clipboard'
import { History } from '@antv/x6-plugin-history'
import * as Y from 'yjs'
import type { Extension } from './extension/Extension'
import { CommandManager } from './commands/CommandManager'
import type { CommandChain } from './extension/types'
import { getDefaultExtensions } from './extension/core'
import {
  registerAllNodes,
  IMAGE_ERROR_PLACEHOLDER,
  renderImageProgressHtml,
} from './nodes'
import {
  addShape,
  addSvgIcon,
  addVectorShape,
  updateShapeNode,
  getShapeNodeData,
  isShapeNode,
  updateSelectedStyle,
  getSelectedStyle,
} from './operations/shapeOps'
import { addImage, updateImageStatus } from './operations/imageOps'
import {
  isTextNode,
  updateTextNode,
  updateSelectedTextStyle,
  getSelectedTextData,
  activateNodeTextEdit,
} from './operations/textOps'
import { initAllCanvasInteractions } from './operations/interactionOps'
import {
  showNodePorts,
  hideAllPorts,
  toggleAllPortsVisibility,
  connectNodes,
  addLine,
} from './operations/connectionOps'
import {
  alignSelectedNodes,
  distributeSelectedNodes,
  bringSelectedToFront,
  sendSelectedToBack,
  bringSelectedForward,
  sendSelectedBackward,
  duplicateSelected,
  groupSelected,
  ungroupSelected,
  toggleLockSelected,
  syncSelectionBoxesTransform,
} from './operations/layoutOps'
import { DrawingController } from './operations/drawingOps'

export { IMAGE_ERROR_PLACEHOLDER, renderImageProgressHtml }

export interface BoardOptions {
  container: HTMLElement
  ydoc?: Y.Doc
  extensions?: Extension[]
  grid?: boolean | { size?: number; visible?: boolean; type?: 'dot' | 'mesh' | 'doubleMesh' }
  background?: { color?: string }
  readonly?: boolean
}

export type ShapeType = 'rect' | 'circle' | 'diamond' | 'text' | 'sticky' | 'icon' | 'path' | 'shape'

export type DrawingMode = 'select' | 'hand' | 'pencil' | 'marker' | 'brush' | 'eraser' | 'vector' | 'line'

export interface DrawingOptions {
  color?: string
  width?: number
  opacity?: number
  lineType?: 'elbow' | 'straight' | 'curve'
  vectorFillColor?: string
  vectorStrokeColor?: string
  vectorStrokeWidth?: number
  vectorStrokeDash?: string
  vectorOpacity?: number
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

export class Board {
  // 全局活跃画板调度器：保证一页多实例或文档内嵌时，快捷键精准分发给当前活跃画板，不抢占外部按键
  public static activeBoard: Board | null = null
  private static globalActiveListenerInitialized = false

  public container: HTMLElement
  public graph!: Graph
  public ydoc: Y.Doc
  public yCells: Y.Map<any>
  public extensions: Map<string, Extension> = new Map()
  public commands!: CommandManager
  public drawingController!: DrawingController
  public onPortQuickConnect?: (payload: {
    node: Node
    port: string
    clientPos: { x: number; y: number }
  }) => void

  // TipTap / speed-sheet 风格的链式命令调度器
  public chain(): CommandChain {
    return this.commands.chain()
  }

  public can(): CommandChain {
    return this.commands.can()
  }

  // 内部标记：防止协同循环触发
  private isApplyingRemoteUpdate = false

  // 插件实例引用
  public scrollerPlugin?: Scroller
  public selectionPlugin?: Selection
  public transformPlugin?: Transform
  public justPlacedTime = 0
  public keyboardPlugin?: Keyboard
  public clipboardPlugin?: Clipboard
  public historyPlugin?: History

  // 事件解绑回调
  private activeCleanupFns: Array<() => void> = []

  constructor(options: BoardOptions) {
    // 统一注册自定义 X6 图元节点
    registerAllNodes()

    this.container = options.container
    this.ydoc = options.ydoc || new Y.Doc()
    this.yCells = this.ydoc.getMap('cells')
    this.commands = new CommandManager(this)

    // 默认激活当前实例
    Board.activeBoard = this

    this.initActiveBoardListener()
    this.initGraph(options)
    this.initPlugins()
    this.initEvents()
    this.initCollabSync()

    // 初始化手绘与笔刷会话控制器
    this.drawingController = new DrawingController(this)
    this.drawingController.init()

    // 注册内置默认扩展 (History, Clipboard, Selection, Shape)
    for (const ext of getDefaultExtensions()) {
      this.registerExtension(ext)
    }

    if (options.extensions) {
      for (const ext of options.extensions) {
        this.registerExtension(ext)
      }
    }
  }

  private initActiveBoardListener() {
    const activate = () => {
      Board.activeBoard = this
    }
    this.container.addEventListener('pointerdown', activate, true)
    this.container.addEventListener('focusin', activate, true)

    this.activeCleanupFns.push(() => {
      this.container.removeEventListener('pointerdown', activate, true)
      this.container.removeEventListener('focusin', activate, true)
    })

    if (!Board.globalActiveListenerInitialized && typeof document !== 'undefined') {
      Board.globalActiveListenerInitialized = true
      document.addEventListener(
        'pointerdown',
        (e: PointerEvent) => {
          const target = e.target as HTMLElement | null
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
    
    // 注册全局静默高亮器，屏蔽 X6 默认生成的 #FEB663 橙色边框并避免 TypeError
    try {
      Graph.registerHighlighter(
        'none',
        {
          highlight() {},
          unhighlight() {},
        },
        true
      )
    } catch {}

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
      highlighting: {
        default: { name: 'none' },
        magnetAdsorbed: { name: 'none' },
        nodeAvailable: { name: 'none' },
        magnetAvailable: { name: 'none' },
      },
      connecting: {
        snap: {
          radius: 20,
        },
        allowBlank: true,
        allowLoop: false,
        allowNode: false,
        allowPort: true,
        allowEdge: false,
        highlight: false,
        anchor: 'orth',
        connectionPoint: 'boundary',
        validateMagnet({ cell }: any) {
          if (!cell) return true
          const data = cell.getData?.()
          const shape = cell.shape
          // 思维导图与纯文本节点不支持作为连接起点主动拉线
          if (
            data?.type === 'mindmap-node' ||
            data?.type === 'text' ||
            shape === 'speed-mindmap-root' ||
            shape === 'speed-mindmap-node' ||
            shape === 'speed-text-node'
          ) {
            return false
          }
          return true
        },
        validateConnection({ edge }: any) {
          // 思维导图内部结构分支连线不可手动交互或重连
          if (edge?.shape === 'speed-mindmap-edge') {
            return false
          }
          return true
        },
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
      interacting: (cellView: any) => {
        if (options.readonly) {
          return { nodeMovable: false, edgeMovable: false, arrowheadMovable: false }
        }
        const cell = cellView?.cell
        if (cell && cell.isNode && cell.isNode()) {
          const data = cell.getData() as any
          // 思维导图分支节点：彻底禁用 X6 原生拖拽，保持原节点纹丝不动，由 Ghost 拖拽控制器接管
          if (data?.type === 'mindmap-node' && !data?.isRoot) {
            return { nodeMovable: false, edgeMovable: true, arrowheadMovable: true }
          }
        }
        return { nodeMovable: true, edgeMovable: true, arrowheadMovable: true }
      },
    })
  }

  private initPlugins() {
    this.scrollerPlugin = new Scroller({
      enabled: true,
      pannable: false,
      pageVisible: false,
      pageBreak: false,
      autoResize: false,
    })
    this.graph.use(this.scrollerPlugin)

    this.graph.use(
      new Snapline({
        enabled: true,
        sharp: true,
      })
    )

    this.selectionPlugin = new Selection({
      enabled: true,
      multiple: true,
      rubberband: true,
      movable: true,
      showNodeSelectionBox: false,
      pointerEvents: 'none',
    })
    this.graph.use(this.selectionPlugin)

    this.transformPlugin = new Transform({
      resizing: {
        enabled(node: Node) {
          if (node.shape === 'speed-freehand-path') return false
          return true
        },
        minWidth: 20,
        minHeight(node: Node) {
          if (node.getData()?.type === 'mindmap-node') {
            return node.getData()?.isRoot ? 42 : 32
          }
          return 20
        },
        maxHeight(node: Node) {
          if (node.getData()?.type === 'mindmap-node') {
            return node.getData()?.isRoot ? 42 : 32
          }
          return Infinity
        },
        orthogonal: false,
        restrict: false,
        autoScroll: true,
        preserveAspectRatio(node: Node) {
          if (node.shape === 'speed-image-node' || node.getData()?.type === 'image') {
            return true
          }
          return false
        },
      },
      rotating: {
        enabled(node: Node) {
          const type = node.getData()?.type
          if (
            type === 'mindmap-node' ||
            type === 'text' ||
            type === 'group' ||
            node.getData()?.isGroup ||
            node.shape === 'speed-text-node' ||
            node.shape === 'speed-freehand-path'
          ) {
            return false
          }
          return true
        },
        grid: 15,
      },
    })
    this.graph.use(this.transformPlugin)

    this.keyboardPlugin = new Keyboard({
      enabled: true,
      global: false,
    })
    this.graph.use(this.keyboardPlugin)

    this.clipboardPlugin = new Clipboard({
      enabled: true,
    })
    this.graph.use(this.clipboardPlugin)

    this.historyPlugin = new History({
      enabled: true,
      beforeAddCommand: (event, args: any) => {
        if (args.key === 'tools' || args.key === 'attrs/progressFo' || args.key === 'attrs/progressContent') {
          return false
        }
        return true
      },
    })
    this.graph.use(this.historyPlugin)
  }

  private initEvents() {
    this.graph.bindKey(['backspace', 'delete'], () => {
      if (Board.activeBoard !== this) return false
      this.deleteSelected()
      return false
    })

    this.graph.bindKey(['ctrl+z', 'meta+z'], () => {
      if (Board.activeBoard !== this) return false
      this.undo()
      return false
    })
    this.graph.bindKey(['ctrl+shift+z', 'meta+shift+z', 'ctrl+y'], () => {
      if (Board.activeBoard !== this) return false
      this.redo()
      return false
    })

    this.graph.bindKey(['ctrl+c', 'meta+c'], () => {
      if (Board.activeBoard !== this) return false
      this.copy()
      return false
    })
    this.graph.bindKey(['ctrl+v', 'meta+v'], () => {
      if (Board.activeBoard !== this) return false
      this.paste()
      return false
    })
    this.graph.bindKey(['ctrl+x', 'meta+x'], () => {
      if (Board.activeBoard !== this) return false
      this.cut()
      return false
    })

    this.graph.bindKey(['ctrl+a', 'meta+a'], () => {
      if (Board.activeBoard !== this) return false
      const cells = this.graph.getCells()
      if (cells.length > 0) {
        this.graph.cleanSelection()
        this.graph.select(cells)
      }
      return false
    })

    this.graph.bindKey(['ctrl+d', 'meta+d'], () => {
      if (Board.activeBoard !== this) return false
      this.duplicateSelected(24)
      return false
    })

    this.graph.bindKey(['ctrl+g', 'meta+g'], () => {
      if (Board.activeBoard !== this) return false
      this.groupSelected()
      return false
    })
    this.graph.bindKey(['ctrl+shift+g', 'meta+shift+g'], () => {
      if (Board.activeBoard !== this) return false
      this.ungroupSelected()
      return false
    })

    this.graph.bindKey(['ctrl+l', 'meta+l'], () => {
      if (Board.activeBoard !== this) return false
      this.toggleLockSelected()
      return false
    })

    this.graph.bindKey(['alt+]', 'meta+]'], () => {
      if (Board.activeBoard !== this) return false
      this.bringSelectedForward()
      return false
    })
    this.graph.bindKey(['alt+[', 'meta+['], () => {
      if (Board.activeBoard !== this) return false
      this.sendSelectedBackward()
      return false
    })

    this.graph.on('node:selected', ({ node }) => {
      const data = node.getData() as any
      // 思维导图节点拥有自身用于分支连线的专用端口 (left/right)，绝对禁止移除或篡改其连接桩
      if (
        data?.type === 'mindmap-node' ||
        node.shape === 'speed-mindmap-root' ||
        node.shape === 'speed-mindmap-node'
      ) {
        return
      }

      // 只有普通矢量图形 (Shape) 节点才需要连接桩；文本、便签、手绘路径绝不添加连接桩
      if (!this.isShapeNode(node) || this.isTextNode(node)) {
        // 如果曾误加过连接桩，立即彻底移除
        const ports = node.getPorts()
        if (ports && ports.length > 0) {
          node.removePorts()
        }
        return
      }

      const ports = node.getPorts()
      if (!ports || ports.length === 0) {
        node.addPorts([
          { group: 'top', id: 'port-top' },
          { group: 'right', id: 'port-right' },
          { group: 'bottom', id: 'port-bottom' },
          { group: 'left', id: 'port-left' },
        ])
      }
    })

    this.graph.on('selection:changed', ({ selected, removed }: any) => {
      this.syncSelectionBoxesTransform()
      const selectedNodes = (selected || []).filter((c: any) => c && c.isNode && c.isNode())
      const singleNode = selectedNodes.length === 1 ? selectedNodes[0] : null

      // 单选图元时确保 Transform 变换框及手柄立即就绪；非单选或多选时清空
      const tp = this.transformPlugin as any
      if (tp) {
        if (singleNode) {
          const isFreehand = singleNode.shape === 'speed-freehand-path'
          if (!isFreehand) {
            if (!tp.widgets?.has(singleNode)) {
              tp.createWidget(singleNode)
            }
          } else {
            tp.clearWidgets()
          }
        } else {
          tp.clearWidgets()
        }
      }

      if (selected) {
        selected.forEach((c: any) => {
          if (c && c.isNode && c.isNode()) {
            const v = this.graph.findViewByCell(c)
            v?.container?.classList.add('x6-node-selected')
          }
        })
      }
      if (removed) {
        removed.forEach((c: any) => {
          if (c && c.isNode && c.isNode()) {
            const v = this.graph.findViewByCell(c)
            v?.container?.classList.remove('x6-node-selected')
          }
        })
      }
    })
    this.graph.on('node:click', () => {
      this.syncSelectionBoxesTransform()
    })
    this.graph.on('cell:click', () => {
      this.syncSelectionBoxesTransform()
    })
    this.graph.on('blank:click', () => {
      this.syncSelectionBoxesTransform()
    })
    this.graph.on('blank:mousedown', () => {
      this.syncSelectionBoxesTransform()
    })
    this.graph.on('cell:change:data', () => {
      this.syncSelectionBoxesTransform()
    })
    this.graph.on('node:rotated', () => {
      this.syncSelectionBoxesTransform()
    })
    this.graph.on('node:change:angle', () => {
      this.syncSelectionBoxesTransform()
    })

    // 监听吸附高亮与反高亮事件（端点拖拽接触节点与端口时高亮边框和填充，移开或结束时隐藏）
    this.graph.on('node:highlight', ({ node, magnet, options }: any) => {
      if (options?.type === 'magnetAdsorbed') {
        const portId =
          magnet?.getAttribute?.('port') ||
          magnet?.getAttribute?.('data-port') ||
          magnet?.parentElement?.getAttribute?.('data-port') ||
          undefined
        this.showNodePorts(node, true, portId, true)
      }
    })

    this.graph.on('node:unhighlight', ({ node, options }: any) => {
      if (options?.type === 'magnetAdsorbed') {
        this.showNodePorts(node, false, undefined, true)
      }
    })

    this.graph.on('edge:connected', () => {
      this.hideAllPorts()
    })

    this.graph.on('batch:stop', ({ name }: any) => {
      if (name === 'move-arrowhead') {
        this.hideAllPorts()
      }
    })

    this.graph.on('blank:pointerdown', () => {
      this.hideAllPorts()
    })

    // 下沉并挂载核心交互控制器 (旋转徽标、箭头抓手、端点拖拽磁吸、双击就地文本编辑)
    const cleanupInteractions = initAllCanvasInteractions(this)
    this.activeCleanupFns.push(cleanupInteractions)
  }

  private initCollabSync() {
    this.graph.on('cell:added', ({ cell }) => {
      if (this.isApplyingRemoteUpdate) return
      const json = cell.toJSON()
      this.yCells.set(cell.id, json)
    })

    this.graph.on('cell:removed', ({ cell }) => {
      if (this.isApplyingRemoteUpdate) return
      this.yCells.delete(cell.id)
    })

    this.graph.on('cell:change:*', ({ cell, key }) => {
      if (this.isApplyingRemoteUpdate) return
      if (key === 'tools' || key === 'attrs/progressFo' || key === 'attrs/progressContent') return
      const json = cell.toJSON()
      this.yCells.set(cell.id, json)
    })

    this.yCells.observe((event) => {
      if (event.transaction.local) return

      this.isApplyingRemoteUpdate = true
      try {
        event.changes.keys.forEach((change, key) => {
          if (change.action === 'add' || change.action === 'update') {
            const data = this.yCells.get(key)
            if (!data) return
            const existingCell = this.graph.getCellById(key)
            if (existingCell) {
              if (data.position && existingCell.isNode()) {
                existingCell.setPosition(data.position.x, data.position.y)
              }
              if (data.size && existingCell.isNode()) {
                const curSize = existingCell.getSize()
                if (curSize.width !== data.size.width || curSize.height !== data.size.height) {
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

  // ===================== 视口与基础命令 =====================

  public selectCell(cell: Cell | string): void {
    this.graph.cleanSelection()
    this.graph.select(cell)
    const c = typeof cell === 'string' ? this.graph.getCellById(cell) : cell
    if (c) {
      this.graph.trigger('selection:changed', { selected: [c] })
    }
  }

  public selectCells(cells: (Cell | string)[]): void {
    this.graph.cleanSelection()
    this.graph.select(cells)
    const resolved = cells
      .map((c) => (typeof c === 'string' ? this.graph.getCellById(c) : c))
      .filter(Boolean)
    this.graph.trigger('selection:changed', { selected: resolved })
  }

  public getSelectedCells(): Cell[] {
    return this.graph.getSelectedCells() || []
  }

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

  public deleteSelected() {
    const selectedCells = this.graph.getSelectedCells()
    if (selectedCells.length) {
      this.graph.removeCells(selectedCells)
    }
  }

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
    return this.commands.undo()
  }

  public redo() {
    return this.commands.redo()
  }

  public canUndo(): boolean {
    return this.historyPlugin?.canUndo() ?? false
  }

  public canRedo(): boolean {
    return this.historyPlugin?.canRedo() ?? false
  }

  public copy() {
    return this.commands.copy()
  }

  public cut() {
    return this.commands.cut()
  }

  public paste() {
    return this.commands.paste()
  }

  public registerExtension(extension: Extension) {
    extension.bind(this)
    this.extensions.set(extension.name, extension)
    this.commands.registerExtension(extension)
    const shortcuts = extension.getKeyboardShortcuts(this)
    for (const [key, handler] of Object.entries(shortcuts)) {
      this.graph.bindKey(key.toLowerCase(), () => {
        if (Board.activeBoard !== this) return false
        return handler()
      })
    }
    extension.onInit?.()
  }

  public unregisterExtension(extension: Extension) {
    this.extensions.delete(extension.name)
    this.commands.unregisterExtension(extension)
    const shortcuts = extension.getKeyboardShortcuts(this)
    for (const key of Object.keys(shortcuts)) {
      this.graph.unbindKey(key.toLowerCase())
    }
    extension.destroy()
  }

  // ===================== 领域操作代理 (Delegations) =====================

  // 1. 图元与样式
  public addShape(options: AddShapeOptions): Node {
    return addShape(this, options)
  }

  public addSvgIcon(options: { svg: string; name?: string; width?: number; height?: number; x?: number; y?: number }): Node {
    return addSvgIcon(this, options)
  }

  public addVectorShape(options: any): Node {
    return addVectorShape(this, options)
  }

  public insertMindmap(options?: any) {
    if (this.commands && this.commands.has('insertMindmap')) {
      return this.commands.execute('insertMindmap', options)
    }
  }

  public updateShapeNode(nodeOrId: Node | string, options: any) {
    return updateShapeNode(this, nodeOrId, options)
  }

  public getShapeNodeData(cell?: any) {
    return getShapeNodeData(this, cell)
  }

  public isShapeNode(cell?: any): boolean {
    return isShapeNode(this, cell)
  }

  public updateSelectedStyle(style: any) {
    return updateSelectedStyle(this, style)
  }

  public getSelectedStyle() {
    return getSelectedStyle(this)
  }

  // 2. 图片操作
  public addImage(options: any): Node {
    return addImage(this, options)
  }

  public updateImageStatus(nodeOrId: Node | string, status: 'uploading' | 'success' | 'error', options?: any) {
    return updateImageStatus(this, nodeOrId, status, options)
  }

  // 3. 文本操作
  public isTextNode(cell?: any): boolean {
    return isTextNode(this, cell)
  }

  public updateTextNode(nodeOrId: Node | string, options: any) {
    return updateTextNode(this, nodeOrId, options)
  }

  public updateSelectedTextStyle(options: any) {
    return updateSelectedTextStyle(this, options)
  }

  public getSelectedTextData() {
    return getSelectedTextData(this)
  }

  public activateTextEdit(node?: any, initialChar?: string) {
    let target = node
    if (!target) {
      const selected = this.graph.getSelectedCells()
      if (selected.length === 1 && selected[0].isNode()) {
        target = selected[0]
      }
    }
    if (!target) return
    activateNodeTextEdit(this, target, initialChar)
  }

  public activateNodeTextEdit(node?: any, initialChar?: string) {
    return this.activateTextEdit(node, initialChar)
  }

  // 4. 连接与连线
  public showNodePorts(node: Node | string | null, visible: boolean, activePortId?: string, highlightBody?: boolean) {
    return showNodePorts(this, node, visible, activePortId, highlightBody)
  }

  public hideAllPorts() {
    return hideAllPorts(this)
  }

  public toggleAllPortsVisibility(visible: boolean) {
    return toggleAllPortsVisibility(this, visible)
  }

  public connectNodes(options: any): Edge {
    return connectNodes(this, options)
  }

  public addLine(options?: any): Edge {
    return addLine(this, options)
  }

  // 5. 排版与布局
  public alignSelectedNodes(type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') {
    return alignSelectedNodes(this, type)
  }

  public distributeSelectedNodes(type: 'horizontal' | 'vertical') {
    return distributeSelectedNodes(this, type)
  }

  public bringSelectedToFront() {
    return bringSelectedToFront(this)
  }

  public sendSelectedToBack() {
    return sendSelectedToBack(this)
  }

  public bringSelectedForward() {
    return bringSelectedForward(this)
  }

  public sendSelectedBackward() {
    return sendSelectedBackward(this)
  }

  public duplicateSelected(offset = 24): Cell[] {
    return duplicateSelected(this, offset)
  }

  public groupSelected(): Node | null {
    return groupSelected(this)
  }

  public ungroupSelected() {
    return ungroupSelected(this)
  }

  public toggleLockSelected(): boolean {
    return toggleLockSelected(this)
  }

  public syncSelectionBoxesTransform() {
    return syncSelectionBoxesTransform(this)
  }

  // 6. 手绘与笔刷
  public setDrawingMode(mode: DrawingMode, options?: DrawingOptions) {
    return this.drawingController.setDrawingMode(mode, options)
  }

  public getDrawingMode(): DrawingMode {
    return this.drawingController.drawingMode
  }

  public getDrawingOptions(): { color: string; width: number; opacity: number } {
    return {
      color: this.drawingController.drawColor,
      width: this.drawingController.drawWidth,
      opacity: this.drawingController.drawOpacity,
    }
  }

  public setHandMode(enabled: boolean) {
    return this.drawingController.setHandMode(enabled)
  }

  public addFreehandPath(options: any): Node | undefined {
    return this.drawingController.addFreehandPath(options)
  }

  public addPolygonShape(options: any): Node | undefined {
    return this.drawingController.addPolygonShape(options)
  }

  public pointsToSvgPath(points: { x: number; y: number }[]): string {
    return this.drawingController.pointsToSvgPath(points)
  }

  public destroy() {
    this.drawingController.destroy()
    for (const ext of this.extensions.values()) {
      ext.destroy()
    }
    this.extensions.clear()
    for (const cleanup of this.activeCleanupFns) {
      cleanup()
    }
    this.activeCleanupFns = []
    if (Board.activeBoard === this) {
      Board.activeBoard = null
    }
    this.graph.dispose()
  }
}
