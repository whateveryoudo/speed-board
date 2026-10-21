<template>
  <a-popover
    v-model:open="isOpen"
    trigger="click"
    placement="top"
    :arrow="false"
    overlay-class-name="quick-bubble-popover"
    :overlay-inner-style="{ padding: '10px 12px', borderRadius: '8px' }"
  >
    <template #content>
      <div class="shape-switch-popover">
        <div class="popover-title">基础图形</div>
        <div class="shapes-grid">
          <div
            v-for="shape in basicShapes"
            :key="shape.id"
            class="shape-item-btn"
            :class="{ 'is-active': currentShapeId === shape.id }"
            :title="shape.name"
            @click="onSelect(shape)"
          >
            <div class="shape-svg-icon" v-html="renderIconSvg(shape)" />
          </div>
        </div>
      </div>
    </template>

    <a-tooltip title="图形" placement="bottom" :open="isOpen ? false : undefined">
      <button class="bubble-toolbar-btn" :class="{ 'is-active': isOpen }">
        <div class="trigger-shape-svg" v-html="currentShapeSvg" />
      </button>
    </a-tooltip>
  </a-popover>
</template>

<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue'
import { Popover as APopover, Tooltip as ATooltip } from 'ant-design-vue'
import type { Board } from '@speed-board/core'
import { useCellAttributes } from '../../../composables/useCellAttributes'
import {
  useShapeSwitch,
  BASIC_SHAPES,
} from '../../../composables/useShapeSwitch'
import {
  getShapeById,
  getShapeIconSvg,
  type ShapeDefinition,
} from '../../../data/shapeLibrary'
import { useToolbarPopover } from '../useToolbarPopover'

const props = defineProps<{
  board: Board | null
}>()

const { isOpen } = useToolbarPopover('shape-switch')

const currentShapeId = useCellAttributes(
  () => props.board,
  'shapeId',
  'rect'
)

const { basicShapes, switchShape } = useShapeSwitch(() => props.board)

const currentShapeSvg = computed(() => {
  const shape = getShapeById(currentShapeId.value) || basicShapes[0]
  if (!shape) return ''
  return getShapeIconSvg(shape)
})

const renderIconSvg = (shape: ShapeDefinition) => {
  return getShapeIconSvg(shape)
}

const onSelect = (shape: ShapeDefinition) => {
  switchShape(shape)
  isOpen.value = false
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
  color: #10b981;
}

.trigger-shape-svg {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.trigger-shape-svg :deep(svg) {
  width: 24px;
  height: 24px;
}

.shape-switch-popover {
  width: 196px;
}

.popover-title {
  font-size: 13px;
  font-weight: 500;
  color: #262626;
  margin-bottom: 8px;
}

.shapes-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 2px;
}

.shape-item-btn {
  width: 30px;
  height: 30px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 4px;
  padding: 0;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #595959;
  transition: all 0.15s ease;
}

.shape-item-btn:hover {
  background-color: #f5f5f5;
  color: #262626;
  transform: scale(1.05);
}

.shape-item-btn:active {
  transform: scale(0.96);
}

.shape-item-btn.is-active {
  background-color: #e5e7eb;
  color: #111827;
}

.shape-svg-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.shape-svg-icon :deep(svg) {
  width: 30px;
  height: 30px;
}
</style>
