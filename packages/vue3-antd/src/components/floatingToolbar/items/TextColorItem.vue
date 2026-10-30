<template>
  <a-popover
    v-model:open="isOpen"
    trigger="click"
    placement="top"
    :arrow="false"
    :get-popup-container="getPopupContainer"
    overlay-class-name="quick-bubble-popover plait-board-attached"
    :overlay-inner-style="{ padding: '12px 14px', borderRadius: '10px' }"
  >
    <template #content>
      <ColorTonePicker
        :model-value="currentColor"
        :allow-transparent="false"
        @update:model-value="onColorSelect"
      />
    </template>

    <a-tooltip title="文字颜色" placement="bottom" :open="isOpen ? false : undefined">
      <button class="bubble-toolbar-btn" :class="{ 'is-active': isOpen }">
        <span class="a-letter">A</span>
        <span class="color-underline" :style="{ backgroundColor: currentColor }" />
      </button>
    </a-tooltip>
  </a-popover>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Popover as APopover, Tooltip as ATooltip } from 'ant-design-vue'
import type { Board } from '@speed-board/core'
import ColorTonePicker from '../../ColorTonePicker.vue'
import { useNodeStyle } from '@speed-board/vue3'
import { useToolbarPopover } from '../useToolbarPopover'

const props = defineProps<{
  board: Board | null
}>()

const { isOpen, getPopupContainer } = useToolbarPopover('text-color')
const { textState, updateTextStyle } = useNodeStyle(() => props.board)

const currentColor = computed(() => textState.value.fill || '#262626')

const onColorSelect = (color: string) => {
  updateTextStyle({ fill: color })
}
</script>

<style scoped>
.bubble-toolbar-btn {
  flex-direction: column;
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
