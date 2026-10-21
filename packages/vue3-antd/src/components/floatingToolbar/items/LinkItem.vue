<template>
  <a-tooltip title="链接" placement="top">
    <button class="bubble-toolbar-btn" @click="emit('open-link')">
      <SIconFont type="icon-kl-link1" :size="18"/>
    </button>
  </a-tooltip>
</template>

<script setup lang="ts">
import { Tooltip as ATooltip } from 'ant-design-vue'
import { IconFont as SIconFont } from 'speed-components-ui/components'
const emit = defineEmits<{
  (e: 'open-link'): void
}>()
</script>

<style scoped>
.bubble-toolbar-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #374151;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.bubble-toolbar-btn:hover {
  background-color: #f3f4f6;
  color: #111827;
}
</style>
