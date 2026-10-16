<template>
  <div
    v-if="handlePos && props.visible"
    class="mindmap-branch-handle-overlay"
    :style="{
      left: `${handlePos.x}px`,
      top: `${handlePos.y}px`,
    }"
    @pointerdown.stop
    @click.stop="onAddBranch"
  >
    <!-- 1. 边缘吸附圆点 -->
    <div class="branch-anchor-dot" :style="{ backgroundColor: branchColor }" />

    <!-- 2. 向外延伸的微型分支引导线 (1:1 语雀白板外观) -->
    <div
      class="branch-stub-line"
      :class="handleSide"
      :style="{ backgroundColor: branchColor }"
    />

    <!-- 3. 圆形加号按钮 (点击新增子分支) -->
    <div
      class="branch-add-btn"
      :class="handleSide"
      :style="{ backgroundColor: branchColor }"
      title="添加分支 (Enter)"
    >
      <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import type { Board } from '@speed-board/core'
import { type MindmapNodeData } from '@speed-board/shared'

const props = defineProps<{
  board: Board | null
  canvasWrapper: HTMLDivElement | null
  selectedNode: any
  visible?: boolean
}>()

const handlePos = ref<{ x: number; y: number } | null>(null)
const handleSide = ref<'right' | 'left'>('right')

const nodeData = computed<MindmapNodeData | null>(() => {
  if (!props.selectedNode) return null
  return (props.selectedNode.getData() || {}) as MindmapNodeData
})

const branchColor = computed(() => {
  if (!nodeData.value) return '#8b5cf6'
  if (nodeData.value.isRoot) {
    return '#8b5cf6'
  }
  return nodeData.value.branch?.color || '#8b5cf6'
})

const updatePosition = () => {
  const node = props.selectedNode
  if (!node || !props.board || !props.canvasWrapper) {
    handlePos.value = null
    return
  }

  const data = (node.getData() || {}) as MindmapNodeData
  const side = data.side === 'left' ? 'left' : 'right'
  handleSide.value = side

  const wrapperRect = props.canvasWrapper.getBoundingClientRect()
  const bbox = node.getBBox()
  const anchorX = side === 'right' ? bbox.x + bbox.width : bbox.x
  const anchorY = bbox.y + bbox.height / 2

  const clientPt = props.board.graph.localToClient(anchorX, anchorY)
  handlePos.value = {
    x: clientPt.x - wrapperRect.left,
    y: clientPt.y - wrapperRect.top,
  }
}

let syncTimer: any = null
const queueUpdate = () => {
  if (syncTimer) cancelAnimationFrame(syncTimer)
  syncTimer = requestAnimationFrame(updatePosition)
}

watch(
  () => [props.selectedNode, props.visible],
  () => {
    queueUpdate()
  },
  { immediate: true }
)

const onAddBranch = () => {
  if (!props.board || !props.selectedNode) return
  ;(props.board as any).commands?.addMindmapChild?.(props.selectedNode.id)
}

onMounted(() => {
  updatePosition()
  if (props.board) {
    props.board.graph.on('scale', queueUpdate)
    props.board.graph.on('translate', queueUpdate)
    props.board.graph.on('node:change:position', queueUpdate)
    props.board.graph.on('node:change:size', queueUpdate)
    props.board.graph.on('cell:change:*', queueUpdate)
    props.board.scrollerPlugin?.container?.addEventListener('scroll', queueUpdate, { passive: true })
    window.addEventListener('resize', queueUpdate)
  }
})

onUnmounted(() => {
  if (props.board) {
    props.board.graph.off('scale', queueUpdate)
    props.board.graph.off('translate', queueUpdate)
    props.board.graph.off('node:change:position', queueUpdate)
    props.board.graph.off('node:change:size', queueUpdate)
    props.board.graph.off('cell:change:*', queueUpdate)
    props.board.scrollerPlugin?.container?.removeEventListener('scroll', queueUpdate)
    window.removeEventListener('resize', queueUpdate)
  }
  if (syncTimer) cancelAnimationFrame(syncTimer)
})
</script>

<style scoped lang="less">
.mindmap-branch-handle-overlay {
  position: absolute;
  width: 0;
  height: 0;
  pointer-events: auto;
  z-index: 85;
  user-select: none;

  .branch-anchor-dot {
    position: absolute;
    left: -4px;
    top: -4px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    pointer-events: none;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
  }

  .branch-stub-line {
    position: absolute;
    height: 3px;
    width: 14px;
    top: -1.5px;
    pointer-events: none;
    border-radius: 1.5px;

    &.right {
      left: 0;
    }

    &.left {
      right: 0;
    }
  }

  .branch-add-btn {
    position: absolute;
    width: 18px;
    height: 18px;
    top: -9px;
    border-radius: 50%;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
    transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);

    &.right {
      left: 14px;
    }

    &.left {
      right: 14px;
    }

    &:hover {
      transform: scale(1.25);
      filter: brightness(0.9);
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35);
    }

    &:active {
      transform: scale(0.95);
    }
  }
}
</style>
