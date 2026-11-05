<template>
  <a-popover
    v-model:open="isOpen"
    trigger="click"
    placement="top"
    :arrow="false"
    :get-popup-container="getPopupContainer"
    overlay-class-name="quick-bubble-popover plait-board-attached"
    :overlay-inner-style="{ padding: '8px 10px', borderRadius: '8px' }"
  >
    <template #content>
      <div class="mindmap-layout-popover">
        <div class="popover-title">结构</div>
        <div class="layouts-grid">
          <div
            v-for="item in LAYOUT_OPTIONS"
            :key="item.key"
            class="layout-item-btn"
            :class="{ 'is-active': currentStructure === item.key }"
            :title="item.label"
            @click="selectLayout(item.key)"
          >
            <SIconFont :type="item.icon" :size="20" />
          </div>
        </div>
      </div>
    </template>

    <a-tooltip title="结构" placement="bottom" :open="isOpen ? false : undefined">
      <button class="bubble-toolbar-btn" :class="{ 'is-active': isOpen }">
        <SIconFont :type="currentLayoutIcon" :size="18" />
      </button>
    </a-tooltip>
  </a-popover>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Popover as APopover, Tooltip as ATooltip } from 'ant-design-vue'
import { IconFont as SIconFont } from 'speed-components-ui/components'
import type { Board } from '@speed-board/core'
import { useCellAttributes } from '@speed-board/vue3'
import { useToolbarPopover } from '../useToolbarPopover'

const props = defineProps<{
  board: Board | null
}>()

const { isOpen, getPopupContainer } = useToolbarPopover('mindmap-layout')

// 1:1 精准对应 icon-kl-jiegou 字体图标的真实图形与布局 Key
const LAYOUT_OPTIONS = [
  { key: 'balanced', icon: 'icon-kl-jiegou1', label: '思维导图 (向两侧)' },
  { key: 'right', icon: 'icon-kl-jiegou2', label: '逻辑图 (向右)' },
  { key: 'left', icon: 'icon-kl-jiegou3', label: '逻辑图 (向左)' },
  { key: 'org-down', icon: 'icon-kl-jiegou4', label: '组织架构图 (向下)' },
  { key: 'timeline-up', icon: 'icon-kl-jiegou5', label: '向上架构图' },
  { key: 'tree-right', icon: 'icon-kl-jiegou6', label: '树状图 (向右)' },
  { key: 'tree-left', icon: 'icon-kl-jiegou9', label: '左向树状图 (向左)' },
  { key: 'bracket-right', icon: 'icon-kl-jiegou10', label: '括号图 / 水平时间轴' },
  { key: 'tree-right-top', icon: 'icon-kl-jiegou7', label: '向上树状图' },
  { key: 'tree-left-top', icon: 'icon-kl-jiegou8', label: '向上左向树状图' },
  { key: 'bracket-left', icon: 'icon-kl-jiegou11', label: '左向括号图' },
]

const selectedLayoutKey = ref<string | null>(null)

const rawLayout = useCellAttributes(
  () => props.board,
  (cell: any) => cell?.layout || cell?.data?.structure || cell?.structure || 'balanced',
  'balanced'
)

watch(rawLayout, () => {
  selectedLayoutKey.value = null
})

const currentStructure = computed<string>(() => {
  const layout = selectedLayoutKey.value || rawLayout.value || 'balanced'
  if (layout === 'standard') return 'balanced'
  if (layout === 'downward') return 'org-down'
  if (layout === 'upward') return 'timeline-up'
  if (layout === 'right-bottom-indented') return 'tree-right'
  if (layout === 'left-bottom-indented') return 'tree-left'
  if (layout === 'right-top-indented') return 'tree-right-top'
  if (layout === 'left-top-indented') return 'tree-left-top'
  return layout
})

const currentLayoutIcon = computed(() => {
  const match = LAYOUT_OPTIONS.find((item) => item.key === currentStructure.value)
  return match?.icon || 'icon-kl-jiegou1'
})

const selectLayout = (layoutKey: string) => {
  if (!props.board) return
  selectedLayoutKey.value = layoutKey
  if (typeof (props.board as any).setMindmapLayout === 'function') {
    (props.board as any).setMindmapLayout(layoutKey)
  }
  isOpen.value = false
}
</script>

<style scoped lang="less">
.mindmap-layout-popover {
  width: 176px;

  .popover-title {
    font-size: 12px;
    font-weight: 500;
    color: #6b7280;
    margin-bottom: 8px;
    padding-left: 2px;
  }

  .layouts-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }

  .layout-item-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
    background-color: #ffffff;
    cursor: pointer;
    color: #4b5563;
    transition: all 0.15s ease;

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
