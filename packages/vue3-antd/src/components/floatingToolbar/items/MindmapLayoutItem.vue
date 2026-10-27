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
import { computed } from 'vue'
import { Popover as APopover, Tooltip as ATooltip } from 'ant-design-vue'
import { IconFont as SIconFont } from 'speed-components-ui/components'
import type { Board } from '@speed-board/core'
import { useToolbarPopover } from '../useToolbarPopover'

const props = defineProps<{
  board: Board | null
}>()

const { isOpen } = useToolbarPopover('mindmap-layout')

const LAYOUT_OPTIONS = [
  { key: 'balanced', icon: 'icon-kl-jiegou1', label: '思维导图 (向两侧)' },
  { key: 'right', icon: 'icon-kl-jiegou2', label: '逻辑图 (向右)' },
  { key: 'org-down', icon: 'icon-kl-jiegou3', label: '组织架构图' },
  { key: 'fishbone', icon: 'icon-kl-jiegou4', label: '鱼骨图' },
  { key: 'timeline-h', icon: 'icon-kl-jiegou5', label: '水平时间轴' },
  { key: 'tree-right', icon: 'icon-kl-jiegou6', label: '树状图' },
  { key: 'bracket-right', icon: 'icon-kl-jiegou7', label: '括号图' },
  { key: 'timeline-up', icon: 'icon-kl-jiegou8', label: '单向时间轴' },
  { key: 'timeline-v', icon: 'icon-kl-jiegou9', label: '垂直时间轴' },
  { key: 'left', icon: 'icon-kl-jiegou10', label: '逻辑图 (向左)' },
  { key: 'tree-left', icon: 'icon-kl-jiegou11', label: '左向树状图' },
]

const selectedCell = computed(() => {
  return (props.board?.selectedElements?.[0] || null) as any
})

const currentStructure = computed<string>(() => {
  if (!selectedCell.value || !props.board) return 'balanced'
  const data = (selectedCell.value.getData?.() || selectedCell.value.data || selectedCell.value) as any
  if (data?.structure) return data.structure
  // 若当前选中的是子节点，回退读取根节点的结构
  const root = (props.board.raw?.children || []).find((n: any) => {
    const d = (n.getData?.() || n.data || n) as any
    return d?.type === 'mindmap-node' && d?.mindmapId === data?.mindmapId && d?.isRoot
  })
  return (root?.getData?.() || root?.data || root)?.structure || 'balanced'
})

const currentLayoutIcon = computed(() => {
  const match = LAYOUT_OPTIONS.find((item) => item.key === currentStructure.value)
  return match?.icon || 'icon-kl-jiegou1'
})

const selectLayout = (layoutKey: string) => {
  if (!props.board || !selectedCell.value) return
  ;(props.board as any).commands?.setMindmapStructure?.(selectedCell.value.id, layoutKey)
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
