<template>
  <a-select
    :value="currentSize"
    size="small"
    class="quick-font-size-select"
    :bordered="false"
    :options="fontSizeOptions"
    @change="onChange"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Select as ASelect } from 'ant-design-vue'
import type { Board } from '@speed-board/core'
import { useNodeStyle } from '../../../composables/useNodeStyle'

const props = defineProps<{
  board: Board | null
}>()

const { textState, updateTextStyle } = useNodeStyle(() => props.board)

const currentSize = computed(() => textState.value.fontSize || 14)

const fontSizeOptions = [
  { label: '12px', value: 12 },
  { label: '14px', value: 14 },
  { label: '16px', value: 16 },
  { label: '18px', value: 18 },
  { label: '24px', value: 24 },
  { label: '32px', value: 32 },
]

const onChange = (val: any) => {
  updateTextStyle({ fontSize: Number(val) })
}
</script>

<style scoped>
.quick-font-size-select {
  width: 68px;
}

.quick-font-size-select :deep(.ant-select-selector) {
  padding: 0 4px !important;
  font-size: 13px !important;
  font-weight: 500;
  color: #374151;
}
</style>
