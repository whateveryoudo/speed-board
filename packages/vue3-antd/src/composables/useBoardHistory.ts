import { ref, watchEffect, type Ref } from 'vue'
import type { Board } from '@speed-board/core'
import { resolveBoard, type BoardSource } from './useBoardEvent'

export interface BoardHistoryControls {
  canUndo: Ref<boolean>
  canRedo: Ref<boolean>
  undo: () => void
  redo: () => void
}

/**
 * 响应式画板撤销/重做状态管理 Hook
 * 自动监听画板命令入栈、撤销与重做操作，将 canUndo / canRedo 转为 Vue 响应式 Ref，
 * 解决前端撤销/重做按钮常年置灰不刷新的问题。
 */
export function useBoardHistory(source: BoardSource): BoardHistoryControls {
  const canUndo = ref(false)
  const canRedo = ref(false)

  const sync = (board: Board | null) => {
    if (!board) {
      canUndo.value = false
      canRedo.value = false
      return
    }
    canUndo.value = board.canUndo()
    canRedo.value = board.canRedo()
  }

  watchEffect((onCleanup) => {
    const board = resolveBoard(source)
    if (!board) {
      canUndo.value = false
      canRedo.value = false
      return
    }

    const graph = board.graph

    const listener = () => {
      sync(board)
    }

    // 初始提取一次
    sync(board)

    const events = [
      'history:change',
      'history:undo',
      'history:redo',
      'cell:added',
      'cell:removed',
      'cell:change:data',
      'node:change:data',
      'edge:change:data',
      'node:change:position',
      'node:change:size',
      'cell:change:attrs',
    ]

    for (const ev of events) {
      graph.on(ev, listener)
    }

    onCleanup(() => {
      for (const ev of events) {
        graph.off(ev, listener)
      }
    })
  })

  const undo = () => {
    const board = resolveBoard(source)
    if (board) {
      board.undo()
      sync(board)
    }
  }

  const redo = () => {
    const board = resolveBoard(source)
    if (board) {
      board.redo()
      sync(board)
    }
  }

  return {
    canUndo,
    canRedo,
    undo,
    redo,
  }
}
