<template>
  <a-popover
    v-model:open="isOpen"
    trigger="click"
    placement="top"
    :arrow="false"
    overlay-class-name="quick-bubble-popover plait-board-attached"
    :overlay-inner-style="{ padding: '4px', borderRadius: '8px' }"
  >
    <template #content>
      <div class="line-types-row">
        <button
          class="line-type-btn"
          :class="{ 'is-active': currentType === 'straight' }"
          title="直线"
          @click="selectType('straight')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="4" y1="20" x2="20" y2="4" />
          </svg>
        </button>
        <button
          class="line-type-btn"
          :class="{ 'is-active': currentType === 'elbow' }"
          title="折线"
          @click="selectType('elbow')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="4 20 12 20 12 4 20 4" />
          </svg>
        </button>
        <button
          class="line-type-btn"
          :class="{ 'is-active': currentType === 'curve' }"
          title="曲线"
          @click="selectType('curve')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 20 C10 20, 14 4, 20 4" />
          </svg>
        </button>
      </div>
    </template>

    <a-tooltip title="线型" placement="bottom" :open="isOpen ? false : undefined">
      <button class="bubble-toolbar-btn" :class="{ 'is-active': isOpen }">
        <svg v-if="currentType === 'elbow'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="4 20 12 20 12 4 20 4" />
        </svg>
        <svg v-else-if="currentType === 'curve'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 20 C10 20, 14 4, 20 4" />
        </svg>
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="4" y1="20" x2="20" y2="4" />
        </svg>
      </button>
    </a-tooltip>
  </a-popover>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Popover as APopover, Tooltip as ATooltip } from 'ant-design-vue'
import type { Board } from '@speed-board/core'
import { useLineOperations } from '@speed-board/vue3'
import { useToolbarPopover } from '../useToolbarPopover'

const props = defineProps<{
  board: Board | null
}>()

const { isOpen } = useToolbarPopover('line-type')
const { getLineType, setLineType } = useLineOperations(() => props.board)

const currentType = computed(() => getLineType())

const selectType = (t: 'straight' | 'elbow' | 'curve') => {
  setLineType(t)
  isOpen.value = false
}
</script>

<style scoped>
.line-types-row {
  display: flex;
  align-items: center;
  gap: 2px;
}

.line-type-btn {
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: #4b5563;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.line-type-btn:hover {
  background-color: #f3f4f6;
  color: #111827;
}

.line-type-btn.is-active {
  background-color: #e5e7eb;
  color: #111827;
}
</style>
