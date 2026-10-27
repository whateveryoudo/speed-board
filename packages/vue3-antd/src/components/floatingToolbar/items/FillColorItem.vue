<template>
  <a-popover
    v-model:open="isOpen"
    trigger="click"
    placement="top"
    :arrow="false"
    overlay-class-name="quick-bubble-popover"
    :overlay-inner-style="{ padding: '12px 14px', borderRadius: '10px' }"
  >
    <template #content>
      <ColorTonePicker
        :model-value="currentColor"
        :allow-transparent="true"
        @update:model-value="onColorSelect"
      />
    </template>

    <a-tooltip title="填充" placement="bottom" :open="isOpen ? false : undefined">
      <button class="bubble-toolbar-btn" :class="{ 'is-active': isOpen }">
        <div
          class="color-circle-preview"
          :class="{
            'is-transparent': currentColor === 'transparent',
            'is-white': currentColor?.toLowerCase() === '#ffffff',
          }"
          :style="currentColor !== 'transparent' ? { backgroundColor: currentColor } : {}"
        >
          <span v-if="currentColor === 'transparent'" class="transparent-slash" />
        </div>
      </button>
    </a-tooltip>
  </a-popover>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Popover as APopover, Tooltip as ATooltip } from 'ant-design-vue'
import type { Board } from '@speed-board/core'
import ColorTonePicker from '../../ColorTonePicker.vue'
import { useNodeStyle } from '../../../composables/useNodeStyle'
import { useToolbarPopover } from '../useToolbarPopover'

const props = defineProps<{
  board: Board | null
}>()

const { isOpen } = useToolbarPopover('fill')
const { syncFromSelection, updateStyle } = useNodeStyle(() => props.board)

const currentColor = computed(() => {
  const cell = (props.board?.selectedElements?.[0] || null) as any
  if (!cell) return '#ffffff'
  return cell.fill || cell.data?.fill || cell.getData?.()?.fill || '#ffffff'
})

const onColorSelect = (color: string) => {
  updateStyle({ fill: color })
}
</script>

<style scoped>
.color-circle-preview {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid #d1d5db;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

.color-circle-preview.is-transparent {
  background: #ffffff;
}

.transparent-slash {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    to top right,
    transparent calc(50% - 1px),
    #ef4444 calc(50% - 1px),
    #ef4444 calc(50% + 1px),
    transparent calc(50% + 1px)
  );
}
</style>
