<template>
  <a-tooltip title="反转方向" placement="top">
    <button class="bubble-toolbar-btn" @click="onReverse">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M7 16V4M7 4L3 8M7 4L11 8" />
        <path d="M17 8V20M17 20L21 16M17 20L13 16" />
      </svg>
    </button>
  </a-tooltip>
</template>

<script setup lang="ts">
import { Tooltip as ATooltip } from 'ant-design-vue'
import type { Board } from '@speed-board/core'
import { useLineOperations } from '../../../composables/useLineOperations'

const props = defineProps<{
  board: Board | null
}>()

const { reverseLineDirection } = useLineOperations(() => props.board)

const onReverse = () => {
  reverseLineDirection()
}
</script>
