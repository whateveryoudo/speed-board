<template>
  <div
    v-if="handlePos && props.visible"
    ref="handleRef"
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
import { autoUpdate, type VirtualElement } from '@floating-ui/dom'
import type { Board } from '@speed-board/core'
import { type MindmapNodeData } from '@speed-board/shared'

const props = defineProps<{
  board: Board | null
  canvasWrapper: HTMLDivElement | null
  selectedNode: any
  visible?: boolean
}>()

const handleRef = ref<HTMLDivElement | null>(null)
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

let syncTimer: any = null
let cleanupAutoUpdate: (() => void) | null = null

const updatePosition = () => {
  const node = props.selectedNode
  if (!node || !props.board || !props.canvasWrapper || !props.visible) {
    handlePos.value = null
    teardownAutoUpdate()
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

  nextTick(() => {
    if (!cleanupAutoUpdate && handleRef.value && props.visible && props.selectedNode) {
      setupAutoUpdate()
    }
  })
}

const queueUpdate = () => {
  if (syncTimer) cancelAnimationFrame(syncTimer)
  syncTimer = requestAnimationFrame(updatePosition)
}

const virtualElement: VirtualElement = {
  getBoundingClientRect() {
    const node = props.selectedNode
    const board = props.board
    if (!node || !board) {
      return { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 }
    }
    const data = (node.getData() || {}) as MindmapNodeData
    const side = data.side === 'left' ? 'left' : 'right'
    const bbox = node.getBBox()
    const anchorX = side === 'right' ? bbox.x + bbox.width : bbox.x
    const anchorY = bbox.y + bbox.height / 2
    const clientPt = board.graph.localToClient(anchorX, anchorY)
    return {
      x: clientPt.x,
      y: clientPt.y,
      top: clientPt.y,
      bottom: clientPt.y,
      left: clientPt.x,
      right: clientPt.x,
      width: 0,
      height: 0,
    }
  },
}

const setupAutoUpdate = () => {
  teardownAutoUpdate()
  if (!handleRef.value || !props.selectedNode || !props.visible || !props.board) return
  cleanupAutoUpdate = autoUpdate(
    virtualElement,
    handleRef.value,
    () => {
      updatePosition()
    },
    { animationFrame: true }
  )
}

const teardownAutoUpdate = () => {
  if (cleanupAutoUpdate) {
    cleanupAutoUpdate()
    cleanupAutoUpdate = null
  }
}

const bindBoardEvents = (board: Board) => {
  const g = board.graph
  g.on('scale', queueUpdate)
  g.on('translate', queueUpdate)
  g.on('node:change:position', queueUpdate)
  g.on('node:change:size', queueUpdate)
  g.on('node:moving', queueUpdate)
  g.on('node:moved', queueUpdate)
  g.on('cell:change:*', queueUpdate)
  g.on('selection:changed', queueUpdate)
  g.on('model:updated', queueUpdate)
  g.on('render:done', queueUpdate)
  g.on('mindmap:drag:start', queueUpdate)
  g.on('mindmap:drag:end', queueUpdate)

  const scrollerEl = board.scrollerPlugin?.container
  if (scrollerEl) {
    scrollerEl.addEventListener('scroll', queueUpdate, { passive: true })
  }
}

const unbindBoardEvents = (board: Board) => {
  const g = board.graph
  g.off('scale', queueUpdate)
  g.off('translate', queueUpdate)
  g.off('node:change:position', queueUpdate)
  g.off('node:change:size', queueUpdate)
  g.off('node:moving', queueUpdate)
  g.off('node:moved', queueUpdate)
  g.off('cell:change:*', queueUpdate)
  g.off('selection:changed', queueUpdate)
  g.off('model:updated', queueUpdate)
  g.off('render:done', queueUpdate)
  g.off('mindmap:drag:start', queueUpdate)
  g.off('mindmap:drag:end', queueUpdate)

  const scrollerEl = board.scrollerPlugin?.container
  if (scrollerEl) {
    scrollerEl.removeEventListener('scroll', queueUpdate)
  }
}

watch(
  () => props.board,
  (newBoard, oldBoard) => {
    if (oldBoard) unbindBoardEvents(oldBoard)
    if (newBoard) {
      bindBoardEvents(newBoard)
      queueUpdate()
    }
  },
  { immediate: true }
)

watch(
  () => [props.selectedNode, props.visible],
  () => {
    teardownAutoUpdate()
    queueUpdate()
  },
  { immediate: true }
)

const onAddBranch = () => {
  if (!props.board || !props.selectedNode) return
  ;(props.board as any).commands?.addMindmapChild?.(props.selectedNode.id)
}

onMounted(() => {
  if (props.board) {
    bindBoardEvents(props.board)
  }
  props.canvasWrapper?.addEventListener('scroll', queueUpdate, { passive: true })
  window.addEventListener('scroll', queueUpdate, { passive: true, capture: true })
  window.addEventListener('resize', queueUpdate)
  window.addEventListener('keydown', queueUpdate)
  queueUpdate()
})

onUnmounted(() => {
  if (props.board) {
    unbindBoardEvents(props.board)
  }
  props.canvasWrapper?.removeEventListener('scroll', queueUpdate)
  window.removeEventListener('scroll', queueUpdate)
  window.removeEventListener('resize', queueUpdate)
  window.removeEventListener('keydown', queueUpdate)
  teardownAutoUpdate()
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
