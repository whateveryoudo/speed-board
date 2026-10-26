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
      <div class="line-arrow-popover">
        <!-- 起点 / 终点 选项卡切换 -->
        <div class="arrow-position-tabs">
          <div
            class="tab-pill"
            :class="{ 'is-active': activePos === 'target' }"
            @click="activePos = 'target'"
          >
            终点箭头
          </div>
          <div
            class="tab-pill"
            :class="{ 'is-active': activePos === 'source' }"
            @click="activePos = 'source'"
          >
            起点箭头
          </div>
        </div>

        <!-- 箭头预设矩阵网格 (1:1 语雀端点网格) -->
        <div class="arrow-grid">
          <div
            v-for="preset in arrowheadPresets"
            :key="preset.id"
            class="arrow-item-btn"
            :class="{ 'is-active': currentMarkerId === preset.id }"
            :title="preset.name"
            @click="onSelectMarker(preset.id)"
          >
            <svg class="preset-svg" viewBox="0 0 24 24" v-html="preset.iconSvg" />
          </div>
        </div>
      </div>
    </template>

    <a-tooltip title="端点箭头" placement="bottom" :open="isOpen ? false : undefined">
      <button class="bubble-toolbar-btn" :class="{ 'is-active': isOpen }">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </a-tooltip>
  </a-popover>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Popover as APopover, Tooltip as ATooltip } from 'ant-design-vue'
import type { Board } from '@speed-board/core'
import {
  useLineOperations,
  ARROWHEAD_PRESETS,
} from '../../../composables/useLineOperations'
import { useToolbarPopover } from '../useToolbarPopover'

const props = defineProps<{
  board: Board | null
}>()

const { isOpen } = useToolbarPopover('arrow-head')
const activePos = ref<'target' | 'source'>('target')

const { arrowheadPresets, setArrowMarker, getSelectedEdge } = useLineOperations(() => props.board)

const currentMarkerId = computed(() => {
  const edge = getSelectedEdge()
  if (!edge) return 'none'
  const path = activePos.value === 'source' ? 'line/sourceMarker' : 'line/targetMarker'
  const marker = edge.getAttrByPath(path)
  if (!marker) return 'none'
  if (typeof marker === 'object') {
    return (marker as any).name || 'block'
  }
  return 'classic-arrow'
})

const onSelectMarker = (markerId: string) => {
  setArrowMarker(activePos.value, markerId)
}
</script>

<style scoped>
.line-arrow-popover {
  width: 176px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.arrow-position-tabs {
  display: flex;
  background-color: #f3f4f6;
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}

.tab-pill {
  flex: 1;
  text-align: center;
  padding: 3px 0;
  font-size: 11px;
  color: #6b7280;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.tab-pill.is-active {
  background-color: #ffffff;
  color: #111827;
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.arrow-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.arrow-item-btn {
  width: 36px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  color: #4b5563;
  transition: all 0.15s ease;
}

.arrow-item-btn:hover {
  background-color: #f3f4f6;
  color: #111827;
}

.arrow-item-btn.is-active {
  background-color: #e5e7eb;
  color: #111827;
}

.preset-svg {
  width: 22px;
  height: 22px;
}
</style>
