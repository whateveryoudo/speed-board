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
import { IconFont as SIconFont } from 'speed-components-ui/components'

const props = defineProps<{
  board: Board | null
}>()

const selectedCell = computed(() => {
  return (props.board?.selectedElements?.[0] || null) as any
})

const isSummaryNode = computed(() => {
  if (!selectedCell.value) return false
  const cell = selectedCell.value
  return Boolean(cell.isSummary || cell.type === 'mindmap-summary')
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
