export { default as SpeedBoard } from './components/SpeedBoard.vue';
export { default as SpeedMindmap } from './components/SpeedMindmap.vue';
export { default as TopToolbar } from './components/TopToolbar.vue';
export { default as LeftToolbar } from './components/LeftToolbar.vue';
export { default as FloatingToolbar } from './components/FloatingToolbar.vue';
export { default as FloatingToolbarHost } from './components/floatingToolbar/FloatingToolbarHost.vue';
export { default as StyleSettingsPanel } from './components/StyleSettingsPanel.vue';
export { default as ShapePickerPopover } from './components/ShapePickerPopover.vue';
export { default as IconfontPopover } from './components/IconfontPopover.vue';
export { default as ColorTonePicker } from './components/ColorTonePicker.vue';

export * from './data/shapeLibrary';
export * from './data/defaultIcons';
export * from './data/mindmapMarkers';
export * from './schema/nodeSchema';

export * from './install';
export { default as SpeedBoardPlugin } from './install';
import plugin from './install';
export default plugin;
