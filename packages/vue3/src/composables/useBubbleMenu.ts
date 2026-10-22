import {
  ref,
  shallowRef,
  watch,
  nextTick,
  onMounted,
  onUnmounted,
  unref,
  type Ref,
} from 'vue'
import {
  BubbleMenuView,
  type BubbleMenuContext,
  type BubbleMenuViewOptions,
  type Placement,
} from '@speed-board/view'
import type { Board, Cell } from '@speed-board/core'

export type { BubbleMenuContext, Placement }

export interface UseBubbleMenuOptions {
  board: Board | null | Ref<Board | null> | (() => Board | null)
  containerEl?: HTMLElement | null | Ref<HTMLElement | null | undefined> | (() => HTMLElement | null | undefined)
  isTyping?: Ref<boolean> | boolean | (() => boolean)
  placement?: Placement
  offset?: number
  shouldShow?: (context: BubbleMenuContext) => boolean
}

/**
 * Vue 3 适配层 Hook (基于 @speed-board/view 纯 TS 控制器 BubbleMenuView)
 * 纯薄封装：将底层框架无关的 View 控制器桥接至 Vue 3 响应式系统 (ref / watch / onMounted)
 * 未来在 React 包中，用同样的 BubbleMenuView 配合 useRef + useState 即可 100% 复用核心定位与调度
 */
export function useBubbleMenu(options: UseBubbleMenuOptions) {
  const menuRef = ref<HTMLElement | null>(null)
  const visible = ref(false)
  const currentType = ref('shape')
  const selectedCells = shallowRef<Cell[]>([])

  let viewInstance: BubbleMenuView | null = null

  const getBoard = (): Board | null => {
    if (typeof options.board === 'function') return options.board()
    return unref(options.board)
  }

  const getContainerEl = (): HTMLElement | undefined => {
    let el: HTMLElement | null | undefined
    if (typeof options.containerEl === 'function') el = options.containerEl()
    else el = unref(options.containerEl)
    return el || undefined
  }

  const getIsTyping = (): boolean => {
    if (typeof options.isTyping === 'function') return options.isTyping()
    return !!unref(options.isTyping)
  }

  const initView = () => {
    if (!menuRef.value) return
    if (viewInstance) {
      viewInstance.destroy()
      viewInstance = null
    }

    viewInstance = new BubbleMenuView({
      board: getBoard(),
      element: menuRef.value,
      containerEl: getContainerEl(),
      isTyping: getIsTyping(),
      placement: options.placement || 'top',
      offset: options.offset ?? 12,
      shouldShow: options.shouldShow,
      onShow: (ctx) => {
        visible.value = true
        currentType.value = ctx.nodeType
        selectedCells.value = ctx.selectedCells
      },
      onHide: () => {
        visible.value = false
      },
      onUpdate: (ctx) => {
        currentType.value = ctx.nodeType
        selectedCells.value = ctx.selectedCells
      },
    })
  }

  onMounted(() => {
    nextTick(() => {
      initView()
    })
  })

  // 监听 board 实例装载
  watch(
    () => getBoard(),
    (board) => {
      if (viewInstance) {
        viewInstance.setBoard(board)
      } else if (board) {
        initView()
      }
    }
  )

  // 监听容器元素变更
  watch(
    () => getContainerEl(),
    (containerEl) => {
      viewInstance?.setContainerEl(containerEl)
    }
  )

  // 监听打字状态 (敲键避让，停止敲键优雅显现)
  if (options.isTyping !== undefined) {
    watch(
      () => getIsTyping(),
      (typing) => {
        viewInstance?.setIsTyping(typing)
      }
    )
  }

  onUnmounted(() => {
    if (viewInstance) {
      viewInstance.destroy()
      viewInstance = null
    }
  })

  const updatePosition = async () => {
    await viewInstance?.updatePosition()
  }

  return {
    menuRef,
    visible,
    currentType,
    selectedCells,
    updatePosition,
  }
}
