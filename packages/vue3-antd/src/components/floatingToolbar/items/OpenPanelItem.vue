<template>
  <a-tooltip title="打开设置面板" placement="top">
    <button class="bubble-toolbar-btn" @click="onClick">
      <!-- 🎛 滑块调节器图标 (1:1 语雀白板快捷栏最右侧图标) -->
      <SIconFont type="icon-kl-bianzu" :size="18"/>
    </button>
  </a-tooltip>
</template>

<script setup lang="ts">
import { Tooltip as ATooltip } from 'ant-design-vue'
import { IconFont as SIconFont } from 'speed-components-ui/components'
const emit = defineEmits<{
  (e: 'click'): void
}>()

const onClick = () => {
  emit('click')
}
</script>

<style scoped>
.bubble-toolbar-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #4b5563;
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
