<template>
  <div class="speed-board">
    <!-- 顶部状态栏与控制组 (撤销/重做/视口缩放/保存) -->
    <TopToolbar
      :board="boardInstance"
      :title="props.title"
      :show-left-toolbar="showLeftToolbar"
      :show-settings="showSettingsPanel"
      @update:show-left-toolbar="showLeftToolbar = $event"
      @toggle-settings="showSettingsPanel = !showSettingsPanel"
      @save="onSave"
    />

    <!-- 左侧悬浮胶囊工具栏 (原生模式切换：选择/抓手/矩形/圆形/正交连线/脑图等) -->
    <LeftToolbar
      :board="boardInstance"
      :icon-provider="props.iconProvider"
      :upload-config="props.uploadConfig"
      :visible="showLeftToolbar"
      :active-mode="activeMode"
      @mode-change="onToolbarModeChange"
    />

    <!-- 右侧属性设置面板 -->
    <StyleSettingsPanel
      v-model:visible="showSettingsPanel"
      :board="boardInstance"
    />

    <!-- 主画布承载容器 (100% 纯正 Plait 原生 SVG 容器) -->
    <div ref="canvasWrapperRef" class="speed-board-canvas-wrapper">
      <BoardCanvas :options="props.options" @created="onBoardCreated" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import { message } from 'ant-design-vue';
import {
  Board,
  type BoardOptions,
  PlaitPointerType,
  BasicShapes,
  ArrowLineShape,
  MindPointerType,
  FreehandShape,
} from '@speed-board/core';
import { BoardCanvas } from '@speed-board/vue3';
import TopToolbar from './TopToolbar.vue';
import LeftToolbar from './LeftToolbar.vue';
import StyleSettingsPanel from './StyleSettingsPanel.vue';
import { useAntdCssVars } from 'speed-components-ui/hooks';
import type { IconProvider } from '../data/defaultIcons';
import '../style/index.less';

defineOptions({
  name: 'SpeedBoard',
});

const props = withDefaults(
  defineProps<{
    options?: Omit<BoardOptions, 'container'>;
    iconProvider?: IconProvider;
    uploadConfig?: any;
    title?: string;
  }>(),
  {
    title: '测试画板1',
  }
);

const emit = defineEmits<{
  (e: 'created', board: Board): void;
  (e: 'save'): void;
}>();

const showLeftToolbar = ref(true);
const showSettingsPanel = ref(false);
const activeMode = ref<string>('select');

useAntdCssVars();

const boardInstance = shallowRef<Board | null>(null);
const canvasWrapperRef = ref<HTMLDivElement | null>(null);

const onBoardCreated = (board: Board) => {
  boardInstance.value = board;
  emit('created', board);
};

const onSave = () => {
  emit('save');
  message.success('画板已保存');
};

const onToolbarModeChange = (payload: {
  mode: string;
  lineType?: 'elbow' | 'straight' | 'curve';
}) => {
  activeMode.value = payload.mode;
  if (!boardInstance.value) return;

  switch (payload.mode) {
    case 'select':
      boardInstance.value.setPointer(PlaitPointerType.selection);
      break;
    case 'hand':
      boardInstance.value.setPointer(PlaitPointerType.hand);
      break;
    case 'rect':
      boardInstance.value.setPointer(BasicShapes.rectangle);
      break;
    case 'circle':
      boardInstance.value.setPointer(BasicShapes.ellipse);
      break;
    case 'diamond':
      boardInstance.value.setPointer(BasicShapes.diamond);
      break;
    case 'text':
      boardInstance.value.setPointer(BasicShapes.text);
      break;
    case 'line': {
      const lineType = payload.lineType || 'elbow';
      if (lineType === 'elbow') {
        boardInstance.value.setPointer(ArrowLineShape.elbow);
      } else if (lineType === 'curve') {
        boardInstance.value.setPointer(ArrowLineShape.curve);
      } else {
        boardInstance.value.setPointer(ArrowLineShape.straight);
      }
      break;
    }
    case 'mindmap':
    case 'mind':
      boardInstance.value.setPointer(MindPointerType.mind);
      break;
    case 'pencil':
    case 'nibPen':
      boardInstance.value.setPointer(FreehandShape.nibPen);
      break;
    case 'marker':
    case 'feltTipPen':
      boardInstance.value.setPointer(FreehandShape.feltTipPen);
      break;
    case 'eraser':
      boardInstance.value.setPointer(FreehandShape.eraser);
      break;
    default:
      boardInstance.value.setPointer(boardInstance.value.mapShapeToPointer(payload.mode));
      break;
  }
};
</script>

<style scoped>
.speed-board {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.speed-board-canvas-wrapper {
  flex: 1;
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}
</style>
