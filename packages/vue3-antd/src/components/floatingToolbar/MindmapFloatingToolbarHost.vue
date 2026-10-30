<template>
  <div
    v-show="visible"
    ref="floatingToolbarRef"
    class="speed-floating-toolbar speed-mindmap-floating-toolbar"
    :style="floatingStyle"
    @pointerdown.stop
    @mousedown.stop
  >
    <div class="floating-toolbar-group">
      <!-- 1. 结构布局切换 (向右/双向/向下/组织架构等) -->
      <MindmapLayoutItem :board="props.board" />

      <!-- 2. 分支颜色与粗细 -->
      <MindmapBranchItem :board="props.board" />

      <!-- 3. 卡片形状 (圆角矩形/下划线/无边框) -->
      <MindmapShapeItem :board="props.board" />

      <!-- 4. 图标与标记 (优先级 1-7, 进度 0-6, 旗帜) -->
      <MindmapMarkerItem :board="props.board" />

      <!-- 5. 概要设置 -->
      <MindmapSummaryItem :board="props.board" />

      <div class="toolbar-divider" />

      <!-- 6. 展开深度样式面板 -->
      <OpenPanelItem :board="props.board" @open="emit('openPanel')" @click="emit('openPanel')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Board } from '@speed-board/core';
import { useFloatingToolbar } from '@speed-board/vue3';
import MindmapLayoutItem from './items/MindmapLayoutItem.vue';
import MindmapBranchItem from './items/MindmapBranchItem.vue';
import MindmapShapeItem from './items/MindmapShapeItem.vue';
import MindmapMarkerItem from './items/MindmapMarkerItem.vue';
import MindmapSummaryItem from './items/MindmapSummaryItem.vue';
import OpenPanelItem from './items/OpenPanelItem.vue';
import { useToolbarPopoverHost } from './useToolbarPopover';
import '../../style/bubble-toolbar.less';

defineOptions({
  name: 'MindmapFloatingToolbarHost',
});

const props = defineProps<{
  board: Board | null;
}>();

const emit = defineEmits<{
  (e: 'openPanel'): void;
  (e: 'toggleSettings'): void;
}>();

const { closePopover } = useToolbarPopoverHost();

const floatingToolbarRef = ref<HTMLDivElement | null>(null);

const { visible, floatingStyle } = useFloatingToolbar({
  board: () => props.board,
  containerRef: floatingToolbarRef,
  toolbarRef: floatingToolbarRef,
  offset: 28,
});

function onBoardPointerDown(e: any) {
  if (floatingToolbarRef.value && e?.target && !floatingToolbarRef.value.contains(e.target as Node)) {
    closePopover();
  }
}

watch(
  () => props.board,
  (b, oldB) => {
    if (oldB) {
      oldB.off('viewport:scroll', closePopover);
      oldB.off('board:pointerdown', onBoardPointerDown);
    }
    if (b) {
      b.on('viewport:scroll', closePopover);
      b.on('board:pointerdown', onBoardPointerDown);
    }
  },
  { immediate: true }
);

watch(visible, (v) => {
  if (!v) {
    closePopover();
  }
});
</script>

<style scoped>
.speed-mindmap-floating-toolbar {
  position: absolute;
  z-index: 999;
  user-select: none;
}

.toolbar-divider {
  width: 1px;
  height: 18px;
  background-color: #e2e8f0;
  margin: 0 4px;
}
</style>
