import { watch, onUnmounted, type Ref } from 'vue'
import type { Board } from '@speed-board/core'

export type BoardSource = Board | null | (() => Board | null) | Ref<Board | null>

export function resolveBoard(source: BoardSource): Board | null {
  if (typeof source === 'function') {
    return source()
  }
  if (source && typeof source === 'object' && 'value' in source) {
    return (source as Ref<Board | null>).value
  }
  return source as Board | null
}

/**
 * 监听 Board / X6 Graph 事件并在组件卸载或画板更换时自动注销
 */
export function useBoardEvent(
  source: BoardSource,
  events: string | string[],
  handler: (...args: any[]) => void
) {
  const eventList = Array.isArray(events) ? events : [events]
  let currentBoard: Board | null = null

  const cleanup = () => {
    if (currentBoard) {
      const graph = currentBoard.graph
      for (const ev of eventList) {
        graph.off(ev, handler)
      }
      currentBoard = null
    }
  }

  const bind = (board: Board | null) => {
    cleanup()
    if (!board) return
    currentBoard = board
    const graph = board.graph
    for (const ev of eventList) {
      graph.on(ev, handler)
    }
  }

  watch(
    () => resolveBoard(source),
    (newBoard) => {
      bind(newBoard)
    },
    { immediate: true }
  )

  onUnmounted(() => {
    cleanup()
  })

  return {
    cleanup,
    rebind: () => bind(resolveBoard(source)),
  }
}
