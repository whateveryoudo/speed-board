import { shallowRef, onBeforeUnmount } from 'vue'
import { Board, type CreatePlaitBoardOptions } from '@speed-board/core'

export function useBoard(options: (container: HTMLElement) => CreatePlaitBoardOptions) {
  const board = shallowRef<Board | null>(null)

  const init = (container: HTMLElement) => {
    board.value = new Board(options(container))
    return board.value
  }

  onBeforeUnmount(() => {
    board.value?.destroy()
    board.value = null
  })

  return {
    board,
    init,
  }
}
