import {
  computePosition,
  autoUpdate,
  offset,
  flip,
  shift,
  type VirtualElement,
  type Placement,
} from '@floating-ui/dom'
import type { Board } from '@speed-board/core'
import type { Cell } from '@antv/x6'

export interface BubbleMenuContext {
  board: Board
  selectedCells: Cell[]
  isTyping: boolean
  nodeType: string
}

export interface BubbleMenuViewOptions {
  board: Board | null
  element: HTMLElement
  containerEl?: HTMLElement | null
  isTyping?: boolean
  placement?: Placement
  offset?: number
  shouldShow?: (context: BubbleMenuContext) => boolean
  onShow?: (context: BubbleMenuContext) => void
  onHide?: () => void
  onUpdate?: (context: BubbleMenuContext) => void
}

/**
 * 根据选中的 Cell 解析其图元类别 (对标 Tiptap resolveNodeType / isActive)
 */
export function resolveCellType(cell: Cell, board?: Board | null): string {
  if (cell.isEdge()) return 'line'
  const shape = cell.shape
  if (shape === 'speed-image-node') return 'image'
  if (shape === 'speed-vector-polygon') return 'vector'
  if (
    shape === 'speed-mindmap-root' ||
    shape === 'speed-mindmap-node' ||
    cell.getData()?.type === 'mindmap-node'
  ) {
    return 'mindmap'
  }
  if (board && board.isTextNode(cell)) return 'text'
  return 'shape'
}

/**
 * Framework-agnostic BubbleMenuView (1:1 对标 Tiptap FloatingMenuView 纯 TypeScript 核心控制器)
 * 职责：
 * 1. 纯 TS 控制器，无 Vue / React 强绑定，Vue 3、React、Svelte 等所有上层 SDK 均可共用
 * 2. 统一封装 Floating UI 视口绝对定位计算与 VirtualElement 几何映射
 * 3. 声明式运行 shouldShow 纯函数决策，处理打字避让、多端失焦与图元类型推断
 */
export class BubbleMenuView {
  public board: Board | null = null
  public element: HTMLElement
  public containerEl?: HTMLElement | null
  public isTyping = false
  public placement: Placement = 'top'
  public offsetValue = 12
  public shouldShow?: (context: BubbleMenuContext) => boolean
  public onShow?: (context: BubbleMenuContext) => void
  public onHide?: () => void
  public onUpdate?: (context: BubbleMenuContext) => void

  private cleanupAutoUpdate: (() => void) | null = null
  private cleanupEvents: (() => void) | null = null
  private isInteracting = false
  public visible = false
  public currentType = 'shape'
  public selectedCells: Cell[] = []

  // 基于 @floating-ui/dom 的 VirtualElement (精确基于 X6 几何包围盒与就地输入框计算)
  public virtualElement: VirtualElement = {
    getBoundingClientRect: () => {
      const graph = this.board?.graph
      if (!graph) return { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 }

      const cells = graph.getSelectedCells()
      if (cells.length === 0) {
        return { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 }
      }

      // 如果当前图元正在就地打字编辑，优先取输入框屏幕包围盒
      if (cells.length === 1) {
        const editorEl = document.querySelector('.speed-inline-text-editor') as HTMLElement | null
        if (editorEl) {
          return editorEl.getBoundingClientRect()
        }
      }

      // 无论单选多选，统一通过 X6 几何模型转换视口坐标
      const bbox = cells.length === 1 ? cells[0].getBBox() : graph.getCellsBBox(cells)
      if (!bbox) return { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 }

      const p1 = graph.localToClient(bbox.x, bbox.y)
      const p2 = graph.localToClient(bbox.x + bbox.width, bbox.y + bbox.height)
      return {
        x: p1.x,
        y: p1.y,
        top: p1.y,
        left: p1.x,
        width: Math.max(1, p2.x - p1.x),
        height: Math.max(1, p2.y - p1.y),
        right: p2.x,
        bottom: p2.y,
      }
    },
  }

  constructor(options: BubbleMenuViewOptions) {
    this.element = options.element
    this.containerEl = options.containerEl
    this.isTyping = options.isTyping ?? false
    this.placement = options.placement || 'top'
    this.offsetValue = options.offset ?? 12
    this.shouldShow = options.shouldShow
    this.onShow = options.onShow
    this.onHide = options.onHide
    this.onUpdate = options.onUpdate

    if (options.board) {
      this.setBoard(options.board)
    }
  }

  public setBoard(board: Board | null) {
    if (this.board === board) return
    this.teardown()
    this.board = board
    if (board) {
      this.bindEvents(board)
      this.sync()
    }
  }

  public setIsTyping(typing: boolean) {
    if (this.isTyping === typing) return
    this.isTyping = typing
    if (typing) {
      this.hide()
    } else {
      this.sync()
    }
  }

  public setContainerEl(containerEl?: HTMLElement | null) {
    this.containerEl = containerEl
    if (this.visible) {
      this.updatePosition()
    }
  }

  private defaultShouldShow(ctx: BubbleMenuContext): boolean {
    if (ctx.selectedCells.length === 0) return false
    if (ctx.isTyping) return false

    // 特例：图片上传中或失败时，完全不展示上方悬浮条
    if (ctx.selectedCells.length === 1 && ctx.nodeType === 'image') {
      const data = ctx.selectedCells[0].getData()
      if (data?.status && data.status !== 'success') return false
    }

    return true
  }

  public async updatePosition() {
    if (!this.element || !this.board) return

    if (this.isInteracting || this.isTyping) {
      this.hide()
      return
    }

    const cells = this.board.graph.getSelectedCells()
    this.selectedCells = cells

    if (cells.length > 1) {
      this.currentType = 'multiple'
    } else if (cells.length === 1) {
      this.currentType = resolveCellType(cells[0], this.board)
    } else {
      this.currentType = 'none'
    }

    const context: BubbleMenuContext = {
      board: this.board,
      selectedCells: cells,
      isTyping: this.isTyping,
      nodeType: this.currentType,
    }

    const canShow = this.shouldShow ? this.shouldShow(context) : this.defaultShouldShow(context)

    if (!canShow) {
      this.hide()
      return
    }

    this.show(context)

    const boundary = this.containerEl || undefined
    const { x, y } = await computePosition(this.virtualElement, this.element, {
      placement: this.placement,
      strategy: 'fixed',
      middleware: [
        offset(this.offsetValue),
        flip({
          boundary,
          fallbackPlacements: ['bottom', 'top'],
        }),
        shift({
          boundary,
          padding: 12,
        }),
      ],
    })

    this.element.style.left = `${Math.round(x)}px`
    this.element.style.top = `${Math.round(y)}px`
    this.onUpdate?.(context)
  }

  private show(context: BubbleMenuContext) {
    if (!this.visible) {
      this.visible = true
      this.setupAutoUpdate()
      this.onShow?.(context)
    }
  }

  private hide() {
    if (this.visible) {
      this.visible = false
      this.teardownAutoUpdate()
      this.onHide?.()
    }
  }

  private setupAutoUpdate() {
    this.teardownAutoUpdate()
    if (this.element) {
      this.cleanupAutoUpdate = autoUpdate(
        this.virtualElement,
        this.element,
        () => this.updatePosition(),
        { animationFrame: true }
      )
    }
  }

  private teardownAutoUpdate() {
    if (this.cleanupAutoUpdate) {
      this.cleanupAutoUpdate()
      this.cleanupAutoUpdate = null
    }
  }

  public sync() {
    if (this.board && this.board.graph.getSelectedCells().length > 0 && !this.isTyping) {
      this.setupAutoUpdate()
      this.updatePosition()
    } else {
      this.hide()
    }
  }

  private bindEvents(board: Board) {
    const graph = board.graph

    const onSelectionChange = () => {
      setTimeout(() => {
        const hasSelected = graph.getSelectedCells().length > 0
        if (hasSelected && !this.isTyping) {
          this.setupAutoUpdate()
          this.updatePosition()
        } else {
          this.hide()
        }
      }, 0)
    }

    const onCellChange = () => {
      if (this.visible && !this.isTyping) {
        this.updatePosition()
      }
    }

    const onDragStart = () => {
      this.isInteracting = true
      this.hide()
    }

    const onDragEnd = () => {
      if (this.isInteracting) {
        this.isInteracting = false
        setTimeout(() => {
          this.updatePosition()
        }, 0)
      }
    }

    graph.on('cell:selected', onSelectionChange)
    graph.on('cell:unselected', onSelectionChange)
    graph.on('selection:changed', onSelectionChange)
    graph.on('node:change:position', onCellChange)
    graph.on('node:change:size', onCellChange)
    graph.on('node:change:data', onCellChange)
    graph.on('cell:change:data', onCellChange)
    graph.on('edge:change:vertices', onCellChange)
    graph.on('edge:change:source', (args) => {
      if (args?.options?.ui) onDragStart()
      else onCellChange()
    })
    graph.on('edge:change:target', (args) => {
      if (args?.options?.ui) onDragStart()
      else onCellChange()
    })
    graph.on('edge:change:terminal', onCellChange)
    graph.on('node:moving', onDragStart)
    graph.on('node:moved', onDragEnd)
    graph.on('node:drag:start', onDragStart)
    graph.on('node:drag:end', onDragEnd)
    graph.on('mindmap:drag:start', onDragStart)
    graph.on('mindmap:drag:end', onDragEnd)
    graph.on('node:resizing', onDragStart)
    graph.on('node:resized', onDragEnd)
    graph.on('scale', onCellChange)
    graph.on('translate', onCellChange)

    const onPointerUp = () => onDragEnd()
    window.addEventListener('pointerup', onPointerUp)

    this.cleanupEvents = () => {
      window.removeEventListener('pointerup', onPointerUp)
      graph.off('cell:selected', onSelectionChange)
      graph.off('cell:unselected', onSelectionChange)
      graph.off('selection:changed', onSelectionChange)
      graph.off('node:change:position', onCellChange)
      graph.off('node:change:size', onCellChange)
      graph.off('node:change:data', onCellChange)
      graph.off('cell:change:data', onCellChange)
      graph.off('edge:change:vertices', onCellChange)
      graph.off('edge:change:source')
      graph.off('edge:change:target')
      graph.off('edge:change:terminal', onCellChange)
      graph.off('node:moving', onDragStart)
      graph.off('node:moved', onDragEnd)
      graph.off('node:drag:start', onDragStart)
      graph.off('node:drag:end', onDragEnd)
      graph.off('mindmap:drag:start', onDragStart)
      graph.off('mindmap:drag:end', onDragEnd)
      graph.off('node:resizing', onDragStart)
      graph.off('node:resized', onDragEnd)
      graph.off('scale', onCellChange)
      graph.off('translate', onCellChange)
    }
  }

  private teardown() {
    this.teardownAutoUpdate()
    if (this.cleanupEvents) {
      this.cleanupEvents()
      this.cleanupEvents = null
    }
    this.visible = false
  }

  public destroy() {
    this.teardown()
    this.board = null
  }
}
