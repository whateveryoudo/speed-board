<template>
  <a-popover
    v-model:open="isOpen"
    trigger="click"
    placement="bottom"
    :arrow="false"
    overlay-class-name="quick-bubble-popover arrange-bubble-popover plait-board-attached"
    :overlay-inner-style="{ padding: '8px', borderRadius: '8px' }"
  >
    <template #content>
      <div class="arrange-sub-panel">
        <div class="arrange-row">
          <a-tooltip title="左对齐" placement="top">
            <button class="arrange-item-btn" @click="handleAction('left')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="4" y1="21" x2="4" y2="3" />
                <rect x="8" y="6" width="12" height="4" rx="1" />
                <rect x="8" y="14" width="8" height="4" rx="1" />
              </svg>
            </button>
          </a-tooltip>

          <a-tooltip title="水平居中" placement="top">
            <button class="arrange-item-btn" @click="handleAction('center')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="21" x2="12" y2="3" />
                <rect x="6" y="6" width="12" height="4" rx="1" />
                <rect x="8" y="14" width="8" height="4" rx="1" />
              </svg>
            </button>
          </a-tooltip>

          <a-tooltip title="右对齐" placement="top">
            <button class="arrange-item-btn" @click="handleAction('right')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="20" y1="21" x2="20" y2="3" />
                <rect x="4" y="6" width="12" height="4" rx="1" />
                <rect x="8" y="14" width="8" height="4" rx="1" />
              </svg>
            </button>
          </a-tooltip>

          <a-tooltip title="水平等间距" placement="top">
            <button class="arrange-item-btn" @click="handleAction('distribute-h')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="4" y1="21" x2="4" y2="3" />
                <line x1="20" y1="21" x2="20" y2="3" />
                <rect x="8" y="7" width="8" height="10" rx="1" />
              </svg>
            </button>
          </a-tooltip>
        </div>

        <div class="arrange-row">
          <a-tooltip title="顶对齐" placement="bottom">
            <button class="arrange-item-btn" @click="handleAction('top')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="3" y1="4" x2="21" y2="4" />
                <rect x="6" y="8" width="4" height="12" rx="1" />
                <rect x="14" y="8" width="4" height="8" rx="1" />
              </svg>
            </button>
          </a-tooltip>

          <a-tooltip title="垂直居中" placement="bottom">
            <button class="arrange-item-btn" @click="handleAction('middle')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <rect x="6" y="6" width="4" height="12" rx="1" />
                <rect x="14" y="8" width="4" height="8" rx="1" />
              </svg>
            </button>
          </a-tooltip>

          <a-tooltip title="底对齐" placement="bottom">
            <button class="arrange-item-btn" @click="handleAction('bottom')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="3" y1="20" x2="21" y2="20" />
                <rect x="6" y="4" width="4" height="12" rx="1" />
                <rect x="14" y="8" width="4" height="8" rx="1" />
              </svg>
            </button>
          </a-tooltip>

          <a-tooltip title="垂直等间距" placement="bottom">
            <button class="arrange-item-btn" @click="handleAction('distribute-v')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="3" y1="4" x2="21" y2="4" />
                <line x1="3" y1="20" x2="21" y2="20" />
                <rect x="7" y="8" width="10" height="8" rx="1" />
              </svg>
            </button>
          </a-tooltip>
        </div>
      </div>
    </template>

    <a-tooltip title="排列" placement="bottom" :open="isOpen ? false : undefined">
      <button class="bubble-toolbar-btn" :class="{ 'is-active': isOpen }">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" y1="21" x2="4" y2="3" />
          <rect x="8" y="6" width="12" height="4" rx="1" />
          <rect x="8" y="14" width="8" height="4" rx="1" />
        </svg>
      </button>
    </a-tooltip>
  </a-popover>
</template>

<script setup lang="ts">
import { Popover as APopover, Tooltip as ATooltip } from 'ant-design-vue'
import type { Board } from '@speed-board/core'
import { useToolbarPopover } from '../useToolbarPopover'

const props = defineProps<{
  board: Board | null
}>()

const { isOpen } = useToolbarPopover('arrange')

const handleAction = (action: string) => {
  if (!props.board) return
  switch (action) {
    case 'left':
    case 'center':
    case 'right':
    case 'top':
    case 'middle':
    case 'bottom':
      props.board.alignSelectedNodes(action as any)
      break
    case 'distribute-h':
      props.board.distributeSelectedNodes('horizontal')
      break
    case 'distribute-v':
      props.board.distributeSelectedNodes('vertical')
      break
  }
  isOpen.value = false
}
</script>

<style scoped lang="less">
.arrange-sub-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.arrange-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.arrange-item-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #374151;
  transition: all 0.15s ease;

  &:hover {
    background-color: rgba(0, 0, 0, 0.06);
    color: #111827;
  }

  &:active {
    background-color: rgba(0, 0, 0, 0.1);
  }
}
</style>
