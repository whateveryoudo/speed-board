<template>
  <a-tooltip :title="isGroup ? '取消成组 (Cmd/Ctrl + Shift + G)' : '成组 (Cmd/Ctrl + G)'" placement="bottom">
    <button class="bubble-toolbar-btn group-toolbar-btn" @click="handleClick">
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
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

const isGroup = computed(() => {
  if (!props.board) return false
  const selected = props.board.graph.getSelectedCells()
  if (selected.length === 1 && selected[0].isNode()) {
    const data = selected[0].getData() as any
    return !!(data?.isGroup || data?.type === 'group')
  }
  return false
})

const handleClick = () => {
  if (!props.board) return
  if (isGroup.value) {
    props.board.ungroupSelected()
  } else {
    props.board.groupSelected()
  }
}
</script>

<style scoped lang="less">
.group-toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
