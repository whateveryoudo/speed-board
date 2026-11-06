<template>
  <a-tooltip :title="mode === 'vertical' ? '垂直对齐' : '水平对齐'" placement="top">
    <button class="bubble-toolbar-btn" @click="cycleAlign">
      <template v-if="mode === 'vertical'">
        <VerticalAlignTopOutlined v-if="textState.verticalAlign === 'top'" :style="{ fontSize: '16px' }" />
        <VerticalAlignBottomOutlined v-else-if="textState.verticalAlign === 'bottom'" :style="{ fontSize: '16px' }" />
        <VerticalAlignMiddleOutlined v-else :style="{ fontSize: '16px' }" />
      </template>
      <template v-else>
        <AlignLeftOutlined v-if="textState.align === 'left'" :style="{ fontSize: '16px' }" />
        <AlignRightOutlined v-else-if="textState.align === 'right'" :style="{ fontSize: '16px' }" />
        <AlignCenterOutlined v-else :style="{ fontSize: '16px' }" />
      </template>
    </button>
  </a-tooltip>
</template>

<script setup lang="ts">
import { Tooltip as ATooltip } from 'ant-design-vue'
import {
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignMiddleOutlined,
  VerticalAlignBottomOutlined,
} from '@ant-design/icons-vue'
import type { Board } from '@speed-board/core'
import { useNodeStyle } from '@speed-board/vue3'

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
