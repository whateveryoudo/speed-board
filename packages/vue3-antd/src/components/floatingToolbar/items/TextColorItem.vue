<template>
  <a-popover
    v-model:open="isOpen"
    trigger="click"
    placement="bottom"
    :arrow="false"
    overlay-class-name="quick-bubble-popover"
    :overlay-inner-style="{ padding: '12px 14px', borderRadius: '10px' }"
  >
    <template #content>
      <ColorTonePicker
        :model-value="currentColor"
        :allow-transparent="false"
        @update:model-value="onColorSelect"
      />
    </template>

    <a-tooltip title="文字颜色" placement="top" :open="isOpen ? false : undefined">
      <button class="bubble-toolbar-btn" :class="{ 'is-active': isOpen }">
        <span class="a-letter">A</span>
        <span class="color-underline" :style="{ backgroundColor: currentColor }" />
      </button>
    </a-tooltip>
  </a-popover>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Popover as APopover, Tooltip as ATooltip } from 'ant-design-vue'
import type { Board } from '@speed-board/core'
import ColorTonePicker from '../../ColorTonePicker.vue'
import { useNodeStyle } from '../../../composables/useNodeStyle'

const props = defineProps<{
  board: Board | null
}>()

const isOpen = ref(false)
const { textState, updateTextStyle } = useNodeStyle(() => props.board)

const currentColor = computed(() => textState.value.fill || '#262626')

const onColorSelect = (color: string) => {
  updateTextStyle({ fill: color })
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.bubble-toolbar-btn:hover {
  background-color: #f3f4f6;
}

.bubble-toolbar-btn.is-active {
  background-color: #e5e7eb;
}

.a-letter {
  font-size: 14px;
  font-weight: 600;
  line-height: 14px;
  color: #1f2937;
}

.color-underline {
  width: 14px;
  height: 3px;
  border-radius: 1px;
  margin-top: 1px;
}
</style>
