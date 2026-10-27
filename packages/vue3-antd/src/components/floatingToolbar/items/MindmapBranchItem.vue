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
      <div class="mindmap-branch-popover">
        <div class="popover-title">分支</div>
        <div class="branch-types-row">
          <div
            class="branch-item-btn"
            :class="{ 'is-active': currentBranchType === 'curve' }"
            title="圆角/曲线"
            @click="selectBranchType('curve')"
          >
            <SIconFont type="icon-kl-fenzhi0" :size="20" />
            <span class="btn-label">曲线</span>
          </div>
          <div
            class="branch-item-btn"
            :class="{ 'is-active': currentBranchType === 'straight' }"
            title="直角/折线"
            @click="selectBranchType('straight')"
          >
            <SIconFont type="icon-kl-fenzhi1" :size="20" />
            <span class="btn-label">直角</span>
          </div>
        </div>
      </div>
    </template>

    <a-tooltip title="分支" placement="bottom" :open="isOpen ? false : undefined">
      <button class="bubble-toolbar-btn" :class="{ 'is-active': isOpen }">
        <SIconFont :type="currentBranchIcon" :size="18" />
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

const { isOpen } = useToolbarPopover('mindmap-branch')

const selectedCell = computed(() => {
  return (props.board?.selectedElements?.[0] || null) as any
})

const currentBranchType = computed<'curve' | 'straight'>(() => {
  if (!selectedCell.value || !props.board) return 'curve'
  const data = (selectedCell.value.getData?.() || selectedCell.value.data || selectedCell.value) as any
  if (data?.branch?.type) return data.branch.type
  // 若当前选中的是子节点，回退读取根节点的分支类型
  const root = (props.board.raw?.children || []).find((n: any) => {
    const d = (n.getData?.() || n.data || n) as any
    return d?.type === 'mindmap-node' && d?.mindmapId === data?.mindmapId && d?.isRoot
  })
  return (root?.getData?.() || root?.data || root)?.branch?.type || 'curve'
})

const currentBranchIcon = computed(() => {
  return currentBranchType.value === 'straight' ? 'icon-kl-fenzhi1' : 'icon-kl-fenzhi0'
})

const selectBranchType = (type: 'curve' | 'straight') => {
  if (!props.board || !selectedCell.value) return
  const node = selectedCell.value
  ;(props.board as any).commands?.setMindmapBranchStyle?.(node.id, { type })
  isOpen.value = false
}
</script>

<style scoped lang="less">
.mindmap-branch-popover {
  width: 140px;

  .popover-title {
    font-size: 12px;
    font-weight: 500;
    color: #6b7280;
    margin-bottom: 8px;
    padding-left: 2px;
  }

  .branch-types-row {
    display: flex;
    gap: 8px;
  }

  .branch-item-btn {
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
