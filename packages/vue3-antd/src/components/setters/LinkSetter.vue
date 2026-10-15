<template>
  <div class="setting-group link-setter-group">
    <div class="group-header">
      <CaretDownOutlined class="group-arrow" />
      <span>链接</span>
    </div>

    <div v-if="props.link" class="link-display-row">
      <a
        :href="props.link"
        target="_blank"
        class="link-anchor"
        :title="props.link"
      >
        {{ props.link }}
      </a>
      <a-button size="small" type="link" @click="emit('open-link-overlay')">编辑</a-button>
    </div>
    <a-button v-else class="add-link-btn" block @click="emit('open-link-overlay')">
      添加链接
    </a-button>
  </div>
</template>

<script setup lang="ts">
import { CaretDownOutlined } from '@ant-design/icons-vue'
import { Button as AButton } from 'ant-design-vue'

const props = defineProps<{
  link?: string
}>()

const emit = defineEmits<{
  (e: 'open-link-overlay'): void
}>()
</script>

<style scoped>
.link-setter-group {
  margin-bottom: 12px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.group-arrow {
  font-size: 10px;
  color: #9ca3af;
}

.link-display-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 4px 8px;
  gap: 8px;
}

.link-anchor {
  font-size: 12px;
  color: #10b981;
  text-decoration: underline;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add-link-btn {
  border-style: dashed;
  color: #4b5563;
  font-size: 12px;
}
</style>
