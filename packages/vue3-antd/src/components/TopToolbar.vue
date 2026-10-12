<template>
  <div class="top-toolbar">
    <div class="top-left">
      <span class="board-title">无标题画板</span>
      <span class="board-status">
        <span class="status-dot" />
        已就绪
      </span>
    </div>

    <!-- 中间：撤销 / 重做快捷操作 -->
    <div class="top-center">
      <a-tooltip title="撤销 (Ctrl+Z)">
        <a-button
          type="text"
          class="shadow-btn-wrapper"
          :disabled="!canUndo"
          @click="undo"
        >
          <UndoOutlined />
        </a-button>
      </a-tooltip>
      <a-tooltip title="重做 (Ctrl+Y)">
        <a-button
          type="text"
          class="shadow-btn-wrapper"
          :disabled="!canRedo"
          @click="redo"
        >
          <RedoOutlined />
        </a-button>
      </a-tooltip>
    </div>

    <!-- 右侧：缩放控制与视口复位 -->
    <div class="top-right">
      <div class="zoom-controls">
        <a-tooltip title="缩小 (Ctrl -)">
          <a-button type="text" class="shadow-btn-wrapper zoom-btn" @click="zoomOut">
            <MinusOutlined />
          </a-button>
        </a-tooltip>

        <a-tooltip title="重置为 100%">
          <span class="zoom-text" @click="resetZoom">
            {{ Math.round(currentZoom * 100) }}%
          </span>
        </a-tooltip>

        <a-tooltip title="放大 (Ctrl +)">
          <a-button type="text" class="shadow-btn-wrapper zoom-btn" @click="zoomIn">
            <PlusOutlined />
          </a-button>
        </a-tooltip>

        <div class="zoom-divider" />

        <a-tooltip title="居中自适应">
          <a-button type="text" class="shadow-btn-wrapper zoom-btn" @click="centerContent">
            <AimOutlined />
          </a-button>
        </a-tooltip>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import {
  Tooltip as ATooltip,
  Button as AButton,
} from 'ant-design-vue'
import {
  MinusOutlined,
  PlusOutlined,
  AimOutlined,
  UndoOutlined,
  RedoOutlined,
} from '@ant-design/icons-vue'
import type { Board } from '@speed-board/core'

const props = defineProps<{
  board: Board | null
}>()

const currentZoom = ref(1)

const canUndo = computed(() => {
  return props.board?.canUndo() ?? false
})

const canRedo = computed(() => {
  return props.board?.canRedo() ?? false
})

const undo = () => {
  props.board?.undo()
}

const redo = () => {
  props.board?.redo()
}

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

<style scoped lang="less">
.top-toolbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 48px;
  background: var(--speed-board-toolbar-bg, rgba(255, 255, 255, 0.94));
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--ant-color-border-secondary, #f0f0f0);
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
  color: var(--ant-color-text, rgba(0, 0, 0, 0.88));
}

.board-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--ant-color-text-tertiary, rgba(0, 0, 0, 0.45));
  background: var(--ant-color-fill-quaternary, rgba(0, 0, 0, 0.02));
  padding: 2px 8px;
  border-radius: var(--ant-border-radius-sm, 4px);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ant-color-success, #52c41a);
}

.top-center {
  display: flex;
  align-items: center;
  gap: 4px;
}

.top-right {
  display: flex;
  align-items: center;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 2px;
  background: var(--ant-color-fill-quaternary, rgba(0, 0, 0, 0.02));
  border: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  border-radius: var(--ant-border-radius, 6px);
  padding: 2px 4px;
}

.zoom-btn {
  height: 28px;
  min-width: 28px;
  padding: 2px;

  .anticon {
    font-size: 14px;
  }
}

.zoom-text {
  font-size: 12px;
  font-weight: 500;
  color: var(--ant-color-text, rgba(0, 0, 0, 0.88));
  padding: 0 6px;
  cursor: pointer;
  border-radius: var(--ant-border-radius-sm, 4px);
  transition: background-color var(--ant-motion-duration-mid, 0.2s);

  &:hover {
    background-color: var(--ant-color-fill-secondary, rgba(0, 0, 0, 0.06));
    color: var(--ant-color-primary, #1677ff);
  }
}

.zoom-divider {
  width: 1px;
  height: 14px;
  background-color: var(--ant-color-border-secondary, #f0f0f0);
  margin: 0 2px;
}
</style>
