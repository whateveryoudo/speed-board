export { default as PlaitBoard } from './components/PlaitBoard.vue';
export { default as BoardCanvas } from './components/BoardCanvas.vue';
export { useBubbleMenu, type UseBubbleMenuOptions, type BubbleMenuContext, type Placement } from './composables/useBubbleMenu';

// 导出 core 与 shared
export * from '@speed-board/core';
export * from '@speed-board/shared';
