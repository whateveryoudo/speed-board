import {
  computePosition,
  autoUpdate,
  offset,
  flip,
  shift,
  type VirtualElement,
  type Placement,
} from '@floating-ui/dom'
export type { Placement }
import type { Board, Cell } from '@speed-board/core'

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
  const data = (cell.getData() || {}) as any
  if (data.isGroup || data.type === 'group') return 'group'
  const shape = cell.shape
  if (shape === 'speed-image-node') return 'image'
  if (shape === 'speed-vector-polygon') return 'vector'
  if (
    shape === 'speed-mindmap-root' ||
    shape === 'speed-mindmap-node' ||
    cell.getData()?.type === 'mindmap-node'
  ) {
    if (data.isSummary) return 'mindmap-summary'
    if (data.isRoot || shape === 'speed-mindmap-root') return 'mindmap-root'
    return 'mindmap-node'
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

  // 基于 @floating-ui/dom 的 VirtualElement (精确基于 Plait 选区计算)
  public virtualElement: VirtualElement = {
    getBoundingClientRect: () => {
      if (!this.board) return { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 }

      const cells = this.board.selectedElements || []
      if (cells.length === 0) {
        return { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 }
      }

      const activeG = document.querySelector('.active-host-g') as SVGGraphicsElement | null
      if (activeG) {
        const rect = activeG.getBoundingClientRect()
        if (rect && rect.width > 0 && rect.height > 0) {
          return rect
        }
      }

      return { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 }
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

    const cells = (this.board.selectedElements || []) as any[]
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
    // 图形带有外偏 14px 的延伸出发点锚点，需适当上移气泡工具栏留出舒适间距 (1:1 语雀交互)
    const dynamicOffset = this.currentType === 'shape' ? Math.max(this.offsetValue, 28) : this.offsetValue
    const { x, y } = await computePosition(this.virtualElement, this.element, {
      placement: this.placement,
      strategy: 'fixed',
      middleware: [
        offset(dynamicOffset),
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

  private updateTimer: any = null

  public queueUpdate() {
    if (this.updateTimer) cancelAnimationFrame(this.updateTimer)
    this.updateTimer = requestAnimationFrame(() => {
      if (!this.board || this.isTyping) return
      const hasSelected = (this.board.selectedElements || []).length > 0
      if (hasSelected && !this.isInteracting) {
        this.updatePosition()
      } else if (!hasSelected) {
        this.hide()
      }
    })
  }

  public sync() {
    if (this.board && (this.board.selectedElements || []).length > 0 && !this.isTyping) {
      this.setupAutoUpdate()
      this.updatePosition()
    } else {
      this.hide()
    }
  }

  private bindEvents(board: Board) {
    const onSelectionChange = () => {
      this.queueUpdate()
    }

    const onCellChange = () => {
      this.queueUpdate()
    }

    board.on('selection:change', onSelectionChange)
    board.on('change', onCellChange)
    board.on('scale', onCellChange)

    const scrollerEl = (board as any).scrollerPlugin?.container
    if (scrollerEl) {
      scrollerEl.addEventListener('scroll', onCellChange, { passive: true })
    }

    const onPointerUp = () => onDragEnd()
    window.addEventListener('pointerup', onPointerUp)

    this.cleanupEvents = () => {
      window.removeEventListener('pointerup', onPointerUp)
      if (this.updateTimer) {
        cancelAnimationFrame(this.updateTimer)
        this.updateTimer = null
      }
      if (scrollerEl) {
        scrollerEl.removeEventListener('scroll', onCellChange)
      }
      board.off('selection:change', onSelectionChange)
      board.off('change', onCellChange)
      board.off('scale', onCellChange)
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
