<template>
  <a-tooltip title="概要" placement="bottom">
    <button
      class="bubble-toolbar-btn summary-trigger-btn"
      :class="{ 'is-active': isSummaryNode }"
      @click="handleAddSummary"
    >
      <svg
        class="summary-bracket-icon"
        viewBox="0 0 24 24"
        width="17"
        height="17"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <!-- 语雀/标准脑图方括号与概要分支图标 -->
        <path d="M6 5h4a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 10 19H6" />
        <line x1="11.5" y1="12" x2="16" y2="12" />
        <rect x="16" y="9.5" width="5" height="5" rx="1" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1.2" />
      </svg>
    </button>
  </a-tooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Tooltip as ATooltip } from 'ant-design-vue'
import type { Board } from '@speed-board/core'

const props = defineProps<{
  board: Board | null
}>()

const selectedCell = computed(() => {
  return (props.board?.selectedElements?.[0] || null) as any
})

const isSummaryNode = computed(() => {
  if (!props.board) return false
  const rawBoard = (props.board as any).raw || props.board
  const selectedNodeId =
    (props.board as any).getSelectedMindNodeId?.() ||
    (rawBoard as any).selectedMindNodeId ||
    selectedCell.value?.data?.selectedMindNodeId ||
    selectedCell.value?.id

  if (!selectedCell.value || !selectedNodeId) return false
  const findNode = (node: any, id: string): any => {
    if (node.id === id) return node
    if (node.children) {
      for (const c of node.children) {
        const res = findNode(c, id)
        if (res) return res
      }
    }
    return null
  }
  const targetNode = findNode(selectedCell.value, selectedNodeId)
  return Boolean(targetNode?.isSummary || targetNode?.data?.isSummary)
})

const handleAddSummary = () => {
  if (!props.board || !selectedCell.value) return
  if (typeof (props.board as any).addMindmapSummary === 'function') {
    (props.board as any).addMindmapSummary()
  }
}
</script>

<style scoped lang="less">
.summary-trigger-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  .summary-bracket-icon {
    display: block;
  }
}
</style>
