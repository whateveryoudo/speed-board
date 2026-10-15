// @speed-board/vue3-antd — Ant Design UI + speed-components-ui + SpeedBoard
import './style/index.less'

export { installSpeedBoardUi, default as SpeedBoardPlugin } from './install'
export type { SpeedBoardUiInstallOptions } from './install'

export { default as SpeedBoard } from './components/SpeedBoard.vue'
export { default as LeftToolbar } from './components/LeftToolbar.vue'
export type { BoardUploadConfig } from './components/LeftToolbar.vue'
export { default as TopToolbar } from './components/TopToolbar.vue'
export { default as IconfontPopover } from './components/IconfontPopover.vue'
export { default as ColorTonePicker } from './components/ColorTonePicker.vue'
export { default as StyleSettingsPanel } from './components/StyleSettingsPanel.vue'
export { default as TextOverlayEditor } from './components/TextOverlayEditor.vue'
export { default as ShapePickerPopover } from './components/ShapePickerPopover.vue'
export { default as QuickShapeConnectPopover } from './components/QuickShapeConnectPopover.vue'
export { default as FloatingToolbarHost } from './components/floatingToolbar/FloatingToolbarHost.vue'

export * from './schema/nodeSchema'
export * from './composables'
export * from './data/defaultIcons'
export * from './data/shapeLibrary'
export * from '@speed-board/vue3'
