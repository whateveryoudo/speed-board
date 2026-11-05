<template>
  <div
    v-show="visible"
    ref="floatingToolbarRef"
    class="floating-bubble-toolbar plait-board-attached speed-mindmap-floating-toolbar"
    :data-rendered-type="isRootNode ? 'mindmap-root' : 'mindmap-node'"
    :style="toolbarStyle"
    @pointerdown.stop
    @mousedown.stop
    @mouseup.stop
    @click.stop
  >
    <div class="bubble-toolbar-inner">
      <!-- 1. 结构布局切换 (仅中心主题可用) -->
      <MindmapLayoutItem v-if="isRootNode" :board="props.board" />

      <!-- 2. 分支颜色与粗细 (曲线 / 直角) -->
      <MindmapBranchItem :board="props.board" />

      <!-- 3. 卡片形状 (圆角卡片 / 胶囊 / 纯文本) -->
      <MindmapShapeItem :board="props.board" />

      <!-- 4. 图标与标记 (优先级 1-7, 进度 0-6, 旗帜) -->
      <MindmapMarkerItem :board="props.board" />

      <!-- 5. 概要设置 (分支节点专属) -->
      <MindmapSummaryItem v-if="!isRootNode" :board="props.board" />

      <div class="toolbar-divider" />

      <!-- 6. 展开深度样式面板 -->
      <OpenPanelItem
        :board="props.board"
        @open="emit('openPanel'); closePopover()"
        @click="emit('openPanel'); closePopover()"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Board } from '@speed-board/core'
import { useFloatingToolbar } from '@speed-board/vue3'
import MindmapLayoutItem from './items/MindmapLayoutItem.vue'
import MindmapBranchItem from './items/MindmapBranchItem.vue'
import MindmapShapeItem from './items/MindmapShapeItem.vue'
import MindmapMarkerItem from './items/MindmapMarkerItem.vue'
import MindmapSummaryItem from './items/MindmapSummaryItem.vue'
import OpenPanelItem from './items/OpenPanelItem.vue'
import { useToolbarPopoverHost } from './useToolbarPopover'
import '../../style/bubble-toolbar.less'

defineOptions({
  name: 'MindmapFloatingToolbarHost',
})

const props = defineProps<{
  board: Board | null
}>()

const emit = defineEmits<{
  (e: 'openPanel'): void
  (e: 'toggleSettings'): void
}>()

const { closePopover } = useToolbarPopoverHost()
const floatingToolbarRef = ref<HTMLDivElement | null>(null)

const { state, toolbarStyle } = useFloatingToolbar(() => props.board, {
  toolbarRef: floatingToolbarRef,
  offset: 28,
})

const visible = computed(() => {
  return state.value.visible && state.value.isMind
})

const isRootNode = computed(() => {
  if (!props.board) return false
  const info = props.board.getSelectionInfo()
  if (info.selectedType === 'mindmap-root') return true
  const cell = info.selectedCell
  if (!cell) return false
  const selectedNodeId = props.board.getSelectedMindNodeId?.()
  if (cell.id === selectedNodeId && (cell as any).isRoot) return true
  return !selectedNodeId || selectedNodeId === cell.id
})

function onBoardPointerDown(e: any) {
  if (
    floatingToolbarRef.value &&
    e?.target &&
    !floatingToolbarRef.value.contains(e.target as Node)
  ) {
    closePopover()
  }
}

watch(
  () => props.board,
  (b, oldB) => {
    if (oldB) {
      oldB.off('viewport:scroll', closePopover)
      oldB.off('board:pointerdown', onBoardPointerDown)
      oldB.off('drag', closePopover)
    }
    if (b) {
      b.on('viewport:scroll', closePopover)
      b.on('board:pointerdown', onBoardPointerDown)
      b.on('drag', closePopover)
    }
  },
  { immediate: true }
)

watch(visible, (v) => {
  if (!v) {
    closePopover()
  }
})
</script>

<style scoped>
.speed-mindmap-floating-toolbar {
  position: absolute;
  z-index: 999;
  user-select: none;
}
</style>
