<template>
  <a-popover
    v-model:open="isOpen"
    trigger="click"
    placement="top"
    :arrow="false"
    overlay-class-name="quick-bubble-popover"
    :overlay-inner-style="{ padding: '10px 14px', borderRadius: '8px' }"
  >
    <template #content>
      <div class="opacity-bubble-content">
        <span class="label">不透明度</span>
        <a-slider
          :value="currentPercent"
          :min="0"
          :max="100"
          :step="1"
          class="slider"
          @change="onSliderChange"
        />
        <span class="val">{{ currentPercent }}%</span>
      </div>
    </template>

    <a-tooltip title="不透明度" placement="bottom" :open="isOpen ? false : undefined">
      <button class="bubble-toolbar-btn" :class="{ 'is-active': isOpen }">
        <!-- ◐ 半透明圆点图标 -->
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
        </svg>
      </button>
    </a-tooltip>
  </a-popover>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Popover as APopover, Tooltip as ATooltip, Slider as ASlider } from 'ant-design-vue'
import type { Board } from '@speed-board/core'
import { useNodeStyle } from '../../../composables/useNodeStyle'
import { useToolbarPopover } from '../useToolbarPopover'

const props = defineProps<{
  board: Board | null
}>()

const { isOpen } = useToolbarPopover('opacity')
const { styleState, updateStyle } = useNodeStyle(() => props.board)

const currentPercent = computed(() => {
  return Math.round((styleState.value.opacity ?? 1) * 100)
})

const onSliderChange = (val: any) => {
  const num = typeof val === 'number' ? val / 100 : 1
  updateStyle({ opacity: num })
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
}

.opacity-bubble-content {
  width: 190px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.label {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
}

.slider {
  flex: 1;
  margin: 4px 0;
}

.slider :deep(.ant-slider-track) {
  background-color: #10b981 !important;
}

.slider :deep(.ant-slider-handle) {
  border-color: #10b981 !important;
}

.val {
  font-size: 11px;
  color: #374151;
  min-width: 34px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
