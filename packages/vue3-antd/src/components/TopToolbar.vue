<template>
  <div class="top-toolbar">
    <div class="top-left">
      <span class="board-title">无标题画板</span>
      <span class="board-status">
        <span class="status-dot" />
        已就绪
      </span>
    </div>

    <div class="top-right">
      <div class="zoom-controls">
        <button class="zoom-btn" title="缩小 (Ctrl -)" @click="zoomOut">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <span class="zoom-text" title="重置为 100%" @click="resetZoom">
          {{ Math.round(currentZoom * 100) }}%
        </span>
        <button class="zoom-btn" title="放大 (Ctrl +)" @click="zoomIn">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <button class="zoom-btn" title="居中自适应" @click="centerContent">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import type { Board } from '@speed-board/core'

const props = defineProps<{
  board: Board | null
}>()

const currentZoom = ref(1)

const updateZoom = () => {
  if (!props.board) return
  currentZoom.value = props.board.getZoom()
}

const zoomIn = () => {
  if (!props.board) return
  props.board.zoom(0.1)
  updateZoom()
}

const zoomOut = () => {
  if (!props.board) return
  props.board.zoom(-0.1)
  updateZoom()
}

const resetZoom = () => {
  if (!props.board) return
  props.board.zoomTo(1)
  updateZoom()
}

const centerContent = () => {
  if (!props.board) return
  props.board.centerContent()
}

let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(updateZoom, 300)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.top-toolbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 48px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 90;
  user-select: none;
}

.top-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.board-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.board-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #64748b;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
}

.zoom-controls {
  display: flex;
  align-items: center;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 2px 4px;
  gap: 2px;
}

.zoom-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}

.zoom-btn:hover {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.zoom-text {
  font-size: 12px;
  font-weight: 500;
  color: #334155;
  padding: 0 6px;
  min-width: 44px;
  text-align: center;
  cursor: pointer;
}

.zoom-text:hover {
  color: #2563eb;
}
</style>
