// Components
export { default as PlaitBoard } from './components/PlaitBoard.vue';
export { default as BoardCanvas } from './components/BoardCanvas.vue';

// Composables (Headless Vue 3 reactive hooks)
export * from './composables/useBoard';
export * from './composables/useBoardEvent';
export * from './composables/useBoardSelection';
export * from './composables/useFloatingToolbar';
export * from './composables/useLineOperations';
export * from './composables/useNodeStyle';
export * from './composables/useBoardHistory';
export * from './composables/useCellAttributes';
export * from './composables/useShapeSwitch';
export * from './composables/useMindmap';

// Re-export underlying engine & headless layers
export * from '@speed-board/view';
export * from '@speed-board/core';
export * from '@speed-board/shared';
