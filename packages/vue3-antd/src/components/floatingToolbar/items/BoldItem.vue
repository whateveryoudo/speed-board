<template>
  <a-tooltip title="加粗" placement="top">
    <button
      class="bubble-toolbar-btn"
      :class="{ 'is-active': textState.bold }"
      @click="toggleBold"
    >
      <span class="bold-b">B</span>
    </button>
  </a-tooltip>
</template>

<script setup lang="ts">
import { Tooltip as ATooltip } from 'ant-design-vue'
import type { Board } from '@speed-board/core'
import { useNodeStyle } from '../../../composables/useNodeStyle'

const props = defineProps<{
  board: Board | null
}>()

const { textState, updateTextStyle } = useNodeStyle(() => props.board)

const toggleBold = () => {
  updateTextStyle({ bold: !textState.value.bold })
}
</script>

<style scoped>
.bubble-toolbar-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #374151;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.bubble-toolbar-btn:hover {
  background-color: #f3f4f6;
  color: #111827;
}

.bubble-toolbar-btn.is-active {
  background-color: #e5e7eb;
  color: #111827;
}

.bold-b {
  font-size: 15px;
  font-weight: bold;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
</style>
