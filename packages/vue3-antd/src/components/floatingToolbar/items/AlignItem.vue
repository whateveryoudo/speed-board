<template>
  <a-tooltip :title="mode === 'vertical' ? '垂直对齐' : '水平对齐'" placement="top">
    <button class="bubble-toolbar-btn" @click="cycleAlign">
      <template v-if="mode === 'vertical'">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="4" y1="12" x2="20" y2="12" stroke-width="2.5" />
          <path v-if="textState.verticalAlign === 'top'" d="M12 7v13M8 11l4-4 4 4" />
          <path v-else-if="textState.verticalAlign === 'bottom'" d="M12 17V4M8 13l4 4 4-4" />
          <path v-else d="M12 5v14M8 8l4-3 4 3M8 16l4 3 4-3" />
        </svg>
      </template>
      <template v-else>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <template v-if="textState.align === 'center'">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="6" y1="12" x2="18" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </template>
          <template v-else-if="textState.align === 'right'">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="9" y1="12" x2="21" y2="12" />
            <line x1="6" y1="18" x2="21" y2="18" />
          </template>
          <template v-else>
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="15" y2="12" />
            <line x1="3" y1="18" x2="18" y2="18" />
          </template>
        </svg>
      </template>
    </button>
  </a-tooltip>
</template>

<script setup lang="ts">
import { Tooltip as ATooltip } from 'ant-design-vue'
import type { Board } from '@speed-board/core'
import { useNodeStyle } from '../../../composables/useNodeStyle'

const props = withDefaults(
  defineProps<{
    board: Board | null
    mode?: 'horizontal' | 'vertical'
  }>(),
  {
    mode: 'horizontal',
  }
)

const { textState, updateTextStyle } = useNodeStyle(() => props.board)

const cycleAlign = () => {
  if (props.mode === 'vertical') {
    const cur = textState.value.verticalAlign || 'middle'
    const next = cur === 'top' ? 'middle' : cur === 'middle' ? 'bottom' : 'top'
    updateTextStyle({ verticalAlign: next })
  } else {
    const cur = textState.value.align || 'left'
    const next = cur === 'left' ? 'center' : cur === 'center' ? 'right' : 'left'
    updateTextStyle({ align: next })
  }
}
</script>
