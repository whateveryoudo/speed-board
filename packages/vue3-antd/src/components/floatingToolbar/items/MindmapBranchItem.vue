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
import { ref, computed, watch } from 'vue'
import { Popover as APopover, Tooltip as ATooltip } from 'ant-design-vue'
import { IconFont as SIconFont } from 'speed-components-ui/components'
import type { Board } from '@speed-board/core'
import { useToolbarPopover } from '../useToolbarPopover'

const props = defineProps<{
  board: Board | null
}>()

const { isOpen, getPopupContainer } = useToolbarPopover('mindmap-branch')
const localBranchType = ref<'curve' | 'straight' | null>(null)

const selectedCell = computed(() => {
  const root = (props.board?.selectedElements?.[0] || null) as any
  if (!root) return null
  const rawBoard = (props.board as any)?.raw || props.board
  const selectedNodeId =
    (props.board as any)?.getSelectedMindNodeId?.() ||
    (rawBoard as any)?.selectedMindNodeId ||
    root.id

  const findNode = (n: any, id: string): any => {
    if (n.id === id) return n
    if (n.children) {
      for (const c of n.children) {
        const found = findNode(c, id)
        if (found) return found
      }
    }
    return null
  }

  return findNode(root, selectedNodeId) || root
})

watch(
  () => selectedCell.value?.id,
  () => {
    localBranchType.value = null
  }
)

const currentBranchType = computed<'curve' | 'straight'>(() => {
  if (localBranchType.value) return localBranchType.value
  if (!selectedCell.value || !props.board) return 'curve'
  const cell = selectedCell.value
  const shape = cell.branchShape || cell.data?.branch?.type || cell.branchType
  if (shape === 'polyline' || shape === 'straight') {
    return 'straight'
  }
  return 'curve'
})

const currentBranchIcon = computed(() => {
  return currentBranchType.value === 'straight' ? 'icon-kl-fenzhi1' : 'icon-kl-fenzhi0'
})

const selectBranchType = (type: 'curve' | 'straight') => {
  localBranchType.value = type
  if (!props.board) return
  const branchShape = type === 'straight' ? 'polyline' : 'curve'
  if (typeof (props.board as any).setMindmapBranchShape === 'function') {
    (props.board as any).setMindmapBranchShape(branchShape)
  } else {
    props.board.setShapeProperty({ branchShape })
  }
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
