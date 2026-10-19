<template>
  <a-popover
    v-model:open="isOpen"
    trigger="click"
    placement="top"
    :arrow="false"
    overlay-class-name="quick-bubble-popover"
    :overlay-inner-style="{ padding: '8px 10px', borderRadius: '8px' }"
  >
    <template #content>
      <div class="quick-stroke-popover">
        <!-- 上排：线型切换 (实线 / 虚线) -->
        <div class="dash-switch-row">
          <button
            class="dash-btn"
            :class="{ 'is-active': currentDash === 'none' }"
            title="实线"
            @click="setDash('none')"
          >
            <svg width="24" height="10" viewBox="0 0 24 10">
              <line x1="0" y1="5" x2="24" y2="5" stroke="currentColor" stroke-width="2.5" />
            </svg>
          </button>
          <button
            class="dash-btn"
            :class="{ 'is-active': currentDash === '6,4' }"
            title="虚线"
            @click="setDash('6,4')"
          >
            <svg width="24" height="10" viewBox="0 0 24 10">
              <line x1="0" y1="5" x2="24" y2="5" stroke="currentColor" stroke-width="2.5" stroke-dasharray="5,4" />
            </svg>
          </button>
        </div>

        <div class="stroke-divider" />

        <!-- 下排：粗细数值输入 + 颜色预览块 -->
        <div class="bottom-ctrl-row">
          <div class="width-input-box">
            <input
              type="number"
              class="number-input"
              :value="currentWidth"
              min="1"
              max="20"
              @change="onWidthChange"
            />
          </div>

          <!-- 描边颜色选择器 -->
          <a-popover
            v-model:open="colorOpen"
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
            <div
              class="stroke-color-swatch"
              :class="{
                'is-transparent': currentColor === 'transparent',
                'is-white': currentColor?.toLowerCase() === '#ffffff',
              }"
              :style="currentColor !== 'transparent' ? { backgroundColor: currentColor } : {}"
            >
              <span v-if="currentColor === 'transparent'" class="transparent-slash" />
            </div>
          </a-popover>
        </div>
      </div>
    </template>

    <a-tooltip title="描边" placement="bottom" :open="isOpen ? false : undefined">
      <button class="bubble-toolbar-btn" :class="{ 'is-active': isOpen }">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" fill="currentColor" />
        </svg>
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
const colorOpen = ref(false)
const { updateStyle } = useNodeStyle(() => props.board)

const getActiveCell = () => props.board?.graph.getSelectedCells()[0]

const currentColor = computed(() => {
  const cell = getActiveCell()
  if (!cell) return '#374151'
  if (cell.isEdge()) {
    return (cell.getAttrByPath('line/stroke') as string) || '#374151'
  }
  if (props.board?.isShapeNode(cell)) {
    return cell.getData()?.stroke || '#374151'
  }
  if (cell.shape === 'speed-vector-polygon') {
    return (cell.getAttrByPath('body/stroke') as string) || '#374151'
  }
  return '#374151'
})

const currentWidth = computed(() => {
  const cell = getActiveCell()
  if (!cell) return 2
  if (cell.isEdge()) {
    return (cell.getAttrByPath('line/strokeWidth') as number) || 2
  }
  if (props.board?.isShapeNode(cell)) {
    return cell.getData()?.strokeWidth ?? 2
  }
  if (cell.shape === 'speed-vector-polygon') {
    return (cell.getAttrByPath('body/strokeWidth') as number) || 2
  }
  return 2
})

const currentDash = computed(() => {
  const cell = getActiveCell()
  if (!cell) return 'none'
  if (cell.isEdge()) {
    return (cell.getAttrByPath('line/strokeDasharray') as string) || 'none'
  }
  if (props.board?.isShapeNode(cell)) {
    return cell.getData()?.strokeDasharray || 'none'
  }
  if (cell.shape === 'speed-vector-polygon') {
    return (cell.getAttrByPath('body/strokeDasharray') as string) || 'none'
  }
  return 'none'
})

const setDash = (dash: string) => {
  updateStyle({ strokeDasharray: dash })
}

const onWidthChange = (e: Event) => {
  const val = Number((e.target as HTMLInputElement).value)
  if (val >= 1 && val <= 30) {
    updateStyle({ strokeWidth: val })
  }
}

const onColorSelect = (c: string) => {
  updateStyle({ stroke: c })
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

.quick-stroke-popover {
  width: 112px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dash-switch-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dash-btn {
  flex: 1;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: #4b5563;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.dash-btn:hover {
  background-color: #f3f4f6;
  color: #111827;
}

.dash-btn.is-active {
  background-color: #e5e7eb;
  color: #111827;
}

.stroke-divider {
  height: 1px;
  background-color: #f3f4f6;
}

.bottom-ctrl-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.width-input-box {
  flex: 1;
  height: 28px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding: 0 6px;
}

.number-input {
  width: 100%;
  border: none;
  background: transparent;
  outline: none;
  font-size: 13px;
  color: #1f2937;
  font-weight: 500;
  text-align: center;
}

.stroke-color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
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
