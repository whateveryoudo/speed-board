import { Board as CoreBoard, type BoardOptions } from '@speed-board/core'
import { reactive, markRaw } from 'vue'

export interface BoardReactiveState {
  selectedCells: any[]
  selectedCount: number
  firstSelectedCell: any | null
  canUndo: boolean
  canRedo: boolean
  zoom: number
  drawingMode: string
}

/**
 * Vue 3 响应式 Board 宿主类（对标 TipTap Editor.ts）
 * - 继承 @speed-board/core 的 Board
 * - 使用 markRaw(this) 避免 X6 实例被 Vue 深层 Proxy 包装导致的引用失效与性能开销
 * - 维护响应式 state 属性，与 X6 事件驱动同步，让 Vue 模板及 computed 自动感知画布变动
 */
export class Board extends CoreBoard {
  private _state: BoardReactiveState

  constructor(options: BoardOptions) {
    super(options)

    this._state = reactive<BoardReactiveState>({
      selectedCells: [],
      selectedCount: 0,
      firstSelectedCell: null,
      canUndo: false,
      canRedo: false,
      zoom: 1,
      drawingMode: 'select',
    })

    this.initVueEventBridge()

    return markRaw(this)
  }

  public get state(): BoardReactiveState {
    return this._state
  }

  private initVueEventBridge() {
    const graph = this.graph

    // 1. 选区同步
    const syncSelection = () => {
      const selected = graph.getSelectedCells() || []
      this._state.selectedCells = selected
      this._state.selectedCount = selected.length
      this._state.firstSelectedCell = selected[0] || null
    }

    graph.on('cell:selected', syncSelection)
    graph.on('cell:unselected', syncSelection)
    graph.on('selection:changed', syncSelection)

    // 2. 撤销/重做可用状态同步
    const syncHistory = () => {
      this._state.canUndo = this.canUndo()
      this._state.canRedo = this.canRedo()
    }

    graph.on('history:change', syncHistory)
    graph.on('history:undo', syncHistory)
    graph.on('history:redo', syncHistory)

    // 3. 缩放比例同步
    graph.on('scale', ({ sx }: { sx: number }) => {
      this._state.zoom = Number(sx.toFixed(2))
    })

    // 初始状态触发一次同步
    syncSelection()
    syncHistory()
    this._state.zoom = Number(graph.zoom().toFixed(2))
  }
}
