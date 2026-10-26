<template>
  <a-tooltip title="概要" placement="bottom">
    <button
      class="bubble-toolbar-btn"
      :class="{ 'is-active': isSummaryNode }"
      @click="handleAddSummary"
    >
      <SIconFont type="icon-kl-fenzhi0" style="transform: rotate(180deg);" :size="18" />
    </button>
  </a-tooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Tooltip as ATooltip } from 'ant-design-vue'
import type { Board } from '@speed-board/core'
import type { MindmapNodeData } from '@speed-board/shared'
import { addMindmapSummary } from '@speed-board/extension-mindmap'
import { IconFont as SIconFont } from 'speed-components-ui/components'
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
