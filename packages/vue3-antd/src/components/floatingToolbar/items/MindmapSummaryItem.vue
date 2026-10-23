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
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M7 4h3a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2H7" />
        <line x1="16" y1="12" x2="20" y2="12" />
      </svg>
    </button>
  </a-tooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Tooltip as ATooltip } from 'ant-design-vue'
import type { Board } from '@speed-board/core'
import type { MindmapNodeData } from '@speed-board/shared'
import { addMindmapSummary } from '@speed-board/extension-mindmap'

const props = defineProps<{
  board: Board | null
}>()

const selectedCell = computed(() => {
  return props.board?.graph.getSelectedCells()[0] || null
})

const isSummaryNode = computed(() => {
  if (!selectedCell.value || !selectedCell.value.isNode()) return false
  const data = selectedCell.value.getData() as MindmapNodeData | undefined
  return !!data?.isSummary
})

const handleAddSummary = () => {
  if (!props.board || !selectedCell.value || !selectedCell.value.isNode()) return
  const data = selectedCell.value.getData() as MindmapNodeData | undefined
  if (data?.isRoot || data?.isSummary) return
  addMindmapSummary(props.board, selectedCell.value.id)
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
