<template>
  <a-popover
    v-model:open="isOpen"
    trigger="click"
    placement="top"
    :arrow="false"
    overlay-class-name="quick-bubble-popover plait-board-attached"
    :overlay-inner-style="{ padding: '8px 10px', borderRadius: '8px' }"
  >
    <template #content>
      <div class="mindmap-shape-popover">
        <div class="popover-title">形状</div>
        <div class="shapes-row">
          <div
            v-for="item in SHAPE_OPTIONS"
            :key="item.key"
            class="shape-item-btn"
            :class="{ 'is-active': currentShapeStyle === item.key }"
            :title="item.label"
            @click="selectShape(item.key)"
          >
            <SIconFont :type="item.icon" :size="20" />
            <span class="btn-label">{{ item.label }}</span>
          </div>
        </div>
      </div>
    </template>

    <a-tooltip title="形状" placement="bottom" :open="isOpen ? false : undefined">
      <button class="bubble-toolbar-btn" :class="{ 'is-active': isOpen }">
        <SIconFont :type="currentShapeIcon" :size="18" />
      </button>
    </a-tooltip>
  </a-popover>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Popover as APopover, Tooltip as ATooltip } from 'ant-design-vue'
import { IconFont as SIconFont } from 'speed-components-ui/components'
import type { Board } from '@speed-board/core'
import type { MindmapShapeStyle } from '@speed-board/shared'
import { useToolbarPopover } from '../useToolbarPopover'

const props = defineProps<{
  board: Board | null
}>()

const { isOpen } = useToolbarPopover('mindmap-shape')

const SHAPE_OPTIONS: { key: MindmapShapeStyle; icon: string; label: string }[] = [
  { key: 'rect', icon: 'icon-kl-board-shape-triangle', label: '矩形' },
  { key: 'capsule', icon: 'icon-kl-shape11', label: '胶囊' },
  { key: 'none', icon: 'icon-kl-text2', label: '纯文本' },
]

const selectedCell = computed(() => {
  return (props.board?.selectedElements?.[0] || null) as any
})

const currentShapeStyle = computed<MindmapShapeStyle>(() => {
  if (!selectedCell.value) return 'rect'
  const cell = selectedCell.value
  if (cell.shape === 'underline') return 'none'
  return 'rect'
})

const currentShapeIcon = computed(() => {
  const match = SHAPE_OPTIONS.find((item) => item.key === currentShapeStyle.value)
  return match?.icon || 'icon-kl-biankuang'
})

const selectShape = (style: MindmapShapeStyle) => {
  if (!props.board) return
  if (typeof (props.board as any).setMindmapShape === 'function') {
    (props.board as any).setMindmapShape(style)
  }
  isOpen.value = false
}
</script>

<style scoped lang="less">
.mindmap-shape-popover {
  width: 180px;

  .popover-title {
    font-size: 12px;
    font-weight: 500;
    color: #6b7280;
    margin-bottom: 8px;
    padding-left: 2px;
  }

  .shapes-row {
    display: flex;
    gap: 6px;
  }

  .shape-item-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 6px 0;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
    background-color: #ffffff;
    cursor: pointer;
    color: #4b5563;
    transition: all 0.15s ease;

    .btn-label {
      font-size: 11px;
      margin-top: 4px;
    }

    &:hover {
      background-color: #f3f4f6;
      border-color: #d1d5db;
      color: #111827;
    }

    &.is-active {
      background-color: #eff6ff;
      border-color: #3b82f6;
      color: #2563eb;
    }
  }
}
</style>
