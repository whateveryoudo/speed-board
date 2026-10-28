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

    <!-- 思维导图专属选区浮动工具栏 (布局/分支颜色/节点形状/标记图标/概要) -->
    <MindmapFloatingToolbarHost
      :board="boardInstance"
      @open-panel="showSettingsPanel = true"
      @toggle-settings="showSettingsPanel = !showSettingsPanel"
    />

    <!-- 思维导图专属属性深度设置抽屉 -->
    <MindmapSettingsPanel
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
import MindmapFloatingToolbarHost from './floatingToolbar/MindmapFloatingToolbarHost.vue';
import MindmapSettingsPanel from './MindmapSettingsPanel.vue';
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

const mergedOptions = computed(() => {
  const initialData =
    props.data ||
    createEmptyMindmap('中心主题', {
      points: [[400, 300]],
      fill: '#2563eb',
      strokeColor: '#2563eb',
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
