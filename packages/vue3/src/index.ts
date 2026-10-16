export { Board, type BoardReactiveState } from './Board'
export { useBoard } from './composables/useBoard'
export { useBubbleMenu, type UseBubbleMenuOptions } from './composables/useBubbleMenu'
export { default as BoardCanvas } from './components/BoardCanvas.vue'
export { default as DrawingOverlay, type DrawConfig } from './components/DrawingOverlay.vue'
export { default as InlineTextEditor } from './components/InlineTextEditor.vue'
export { default as ShapeAnchorPorts } from './components/ShapeAnchorPorts.vue'
export { default as PlacementOverlay } from './components/PlacementOverlay.vue'

// 重新导出 core, view 与 shared
export * from '@speed-board/core'
export * from '@speed-board/view'
export * from '@speed-board/shared'
