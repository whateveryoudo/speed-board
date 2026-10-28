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
