<template>
  <div v-if="anchorPoints && props.visible" class="speed-shape-anchor-ports">
    <!-- 上锚点 -->
    <div
      class="shape-anchor-btn port-top"
      :style="{ left: `${anchorPoints.top.x}px`, top: `${anchorPoints.top.y}px` }"
      title="延伸补线"
      @click.stop="onAnchorClick('top', anchorPoints.top)"
    >
      <span class="anchor-dot" />
      <span class="anchor-arrow">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 15V3M4 8l5-5 5 5" />
        </svg>
      </span>
    </div>

    <!-- 右锚点 -->
    <div
      class="shape-anchor-btn port-right"
      :style="{ left: `${anchorPoints.right.x}px`, top: `${anchorPoints.right.y}px` }"
      title="延伸补线"
      @click.stop="onAnchorClick('right', anchorPoints.right)"
    >
      <span class="anchor-dot" />
      <span class="anchor-arrow">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9h12M10 4l5 5-5 5" />
        </svg>
      </span>
    </div>

    <!-- 下锚点 -->
    <div
      class="shape-anchor-btn port-bottom"
      :style="{ left: `${anchorPoints.bottom.x}px`, top: `${anchorPoints.bottom.y}px` }"
      title="延伸补线"
      @click.stop="onAnchorClick('bottom', anchorPoints.bottom)"
    >
      <span class="anchor-dot" />
      <span class="anchor-arrow">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 3v12M4 10l5 5 5-5" />
        </svg>
      </span>
    </div>

    <!-- 左锚点 -->
    <div
      class="shape-anchor-btn port-left"
      :style="{ left: `${anchorPoints.left.x}px`, top: `${anchorPoints.left.y}px` }"
      title="延伸补线"
      @click.stop="onAnchorClick('left', anchorPoints.left)"
    >
      <span class="anchor-dot" />
      <span class="anchor-arrow">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 9H3M8 4L3 9l5 5" />
        </svg>
      </span>
    </div>

    <slot
      name="popover"
      :visible="showQuickConnect"
      :x="quickConnectPos.x"
      :y="quickConnectPos.y"
      :direction="quickConnectDirection"
      :close="() => (showQuickConnect = false)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Board } from '@speed-board/core'
import {
  computePortPositions,
  computeQuickConnectOffset,
  type PortDirection,
  type AnchorPointData,
} from '@speed-board/view'

const props = defineProps<{
  board: Board | null
  selectedNode: any
  canvasWrapper: HTMLDivElement | null
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'anchor-click', payload: { direction: PortDirection; point: AnchorPointData }): void
}>()

const anchorTick = ref(0)
const showQuickConnect = ref(false)
const quickConnectPos = ref({ x: 0, y: 0 })
const quickConnectDirection = ref<PortDirection>('right')

const anchorPoints = computed(() => {
  void anchorTick.value
  if (!props.selectedNode || !props.board || !props.canvasWrapper || !props.visible) return null
  return computePortPositions(props.board, props.selectedNode, props.canvasWrapper)
})

const onAnchorClick = (direction: PortDirection, pt: AnchorPointData) => {
  quickConnectDirection.value = direction
  quickConnectPos.value = computeQuickConnectOffset({ x: pt.x, y: pt.y }, direction)
  showQuickConnect.value = true
  emit('anchor-click', { direction, point: pt })
}

const syncTick = () => {
  anchorTick.value++
}

onMounted(() => {
  if (props.board) {
    props.board.graph.on('scale', syncTick)
    props.board.graph.on('translate', syncTick)
    props.board.graph.on('node:change:position', syncTick)
    props.board.graph.on('node:change:size', syncTick)
  }
})

onUnmounted(() => {
  if (props.board) {
    props.board.graph.off('scale', syncTick)
    props.board.graph.off('translate', syncTick)
    props.board.graph.off('node:change:position', syncTick)
    props.board.graph.off('node:change:size', syncTick)
  }
})
</script>

<style scoped>
.speed-shape-anchor-ports {
  pointer-events: none;
}

.shape-anchor-btn {
  position: absolute;
  width: 24px;
  height: 24px;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  pointer-events: auto;
  z-index: 85;
  transition: transform 0.15s ease;
}

.anchor-dot {
  width: 8px;
  height: 8px;
  background-color: #3b82f6;
  border: 1.5px solid #ffffff;
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.15s ease;
}

.anchor-arrow {
  display: none;
  width: 20px;
  height: 20px;
  background-color: #3b82f6;
  color: #ffffff;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
}

.shape-anchor-btn:hover .anchor-dot {
  display: none;
}

.shape-anchor-btn:hover .anchor-arrow {
  display: flex;
}
</style>
