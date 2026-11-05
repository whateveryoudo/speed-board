<template>
  <div class="speed-board speed-mindmap-view">
    <!-- 顶部状态栏与控制组 (撤销/重做/视口缩放/保存) -->
    <TopToolbar
      :board="boardInstance"
      :title="props.title"
      :show-left-toolbar="false"
      :show-settings="showSettingsPanel"
      @toggle-settings="showSettingsPanel = !showSettingsPanel"
      @save="onSave"
    />

    <!-- 思维导图专属选区浮动工具栏 (1:1 白板全功能就地配置：布局/外形/分支/标记/填充/边框/文本排版/链接) -->
    <FloatingToolbar
      :board="boardInstance"
      @open-panel="showSettingsPanel = true"
      @toggle-settings="showSettingsPanel = !showSettingsPanel"
    />

    <!-- 脑图标记快捷选择弹层 (点击节点上的优先级/进度/旗帜时就地弹出切换) -->
    <MindmapMarkerQuickPicker
      :board="boardInstance"
      :visible="showMarkerPicker"
      :target-el="markerPickerTargetEl"
      :node-id="markerPickerNodeId"
      :category="markerPickerCategory"
      :value="markerPickerValue"
      @close="showMarkerPicker = false"
    />

    <!-- 属性深度设置抽屉 (1:1 白板属性面板：样式、文本排版、颜色与快捷键指南) -->
    <StyleSettingsPanel
      v-model:visible="showSettingsPanel"
      :board="boardInstance"
    />

    <!-- 主画布承载容器 (只挂载 withSpeedMind 导图引擎) -->
    <div ref="canvasWrapperRef" class="speed-board-canvas-wrapper speed-mindmap-canvas">
      <BoardCanvas :options="mergedOptions" @created="onBoardCreated" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed } from 'vue';
import { message } from 'ant-design-vue';
import type { Board, BoardOptions } from '@speed-board/core';
import {
  createEmptyMindmap,
  withSpeedMind,
  type SpeedMindElement,
} from '@speed-board/extension-mindmap';
import { BoardCanvas } from '@speed-board/vue3';
import TopToolbar from './TopToolbar.vue';
import FloatingToolbar from './FloatingToolbar.vue';
import StyleSettingsPanel from './StyleSettingsPanel.vue';
import MindmapMarkerQuickPicker from './MindmapMarkerQuickPicker.vue';
import { useAntdCssVars } from 'speed-components-ui/hooks';
import '../style/index.less';

defineOptions({
  name: 'SpeedMindmap',
});

const props = withDefaults(
  defineProps<{
    options?: Omit<BoardOptions, 'container'>;
    data?: SpeedMindElement;
    title?: string;
  }>(),
  {
    title: '新建思维导图',
  }
);

const emit = defineEmits<{
  (e: 'created', board: Board): void;
  (e: 'save'): void;
}>();

useAntdCssVars();

const boardInstance = shallowRef<Board | null>(null);
const canvasWrapperRef = ref<HTMLDivElement | null>(null);
const showSettingsPanel = ref(false);

const showMarkerPicker = ref(false);
const markerPickerTargetEl = ref<HTMLElement | SVGElement | null>(null);
const markerPickerNodeId = ref<string | null>(null);
const markerPickerCategory = ref<string>('priority');
const markerPickerValue = ref<any>(null);

const mergedOptions = computed(() => {
  const initialData =
    props.data ||
    createEmptyMindmap('中心主题', {
      points: [[400, 300]],
      fill: '#f3f4f6',
      strokeColor: '#e5e7eb',
      layout: 'right',
    });

  return {
    ...props.options,
    plugins: [withSpeedMind, ...(props.options?.plugins || [])],
    value:
      props.options?.value && props.options.value.length > 0
        ? props.options.value
        : [initialData],
  };
});

const onBoardCreated = (board: Board) => {
  boardInstance.value = board;

  const eventEmitter = (board as any).boardWrapper || board;
  eventEmitter.on('mindmap:marker:click', (payload: any) => {
    markerPickerTargetEl.value = payload.targetEl;
    markerPickerNodeId.value = payload.nodeId;
    markerPickerCategory.value = payload.category;
    markerPickerValue.value = payload.value;
    showMarkerPicker.value = true;
  });

  // 默认选中思维导图根节点
  if (board.raw.children && board.raw.children.length > 0) {
    const firstMind = board.raw.children[0];
    board.select([firstMind]);
  }

  emit('created', board);
};

const onSave = () => {
  emit('save');
  message.success('思维导图保存成功');
};

defineExpose({
  getBoard: () => boardInstance.value,
});
</script>

<style scoped>
.speed-mindmap-view {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background-color: #f8fafc;
}

.speed-mindmap-canvas {
  width: 100%;
  height: calc(100% - 48px);
}
</style>
