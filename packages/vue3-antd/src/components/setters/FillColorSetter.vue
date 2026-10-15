<template>
  <div class="setting-group fill-setter-group">
    <div class="group-header" @click="isCollapsed = !isCollapsed">
      <CaretDownOutlined class="group-arrow" :class="{ 'is-collapsed': isCollapsed }" />
      <span>填充颜色</span>
    </div>

    <div v-show="!isCollapsed" class="setter-content">
      <div class="setting-row">
        <span class="row-label">背景色</span>
        <a-popover
          v-model:open="colorOpen"
          trigger="click"
          placement="leftTop"
          :arrow="false"
          overlay-class-name="color-picker-popover-overlay"
          :overlay-inner-style="{ padding: '12px 14px', borderRadius: '10px' }"
        >
          <template #content>
            <ColorTonePicker
              :model-value="props.fill"
              :allow-transparent="true"
              @update:model-value="onColorSelect"
            />
          </template>
          <div
            class="color-preview-trigger"
            :class="{
              'is-transparent': props.fill === 'transparent',
              'is-white': props.fill?.toLowerCase() === '#ffffff',
            }"
            :style="props.fill !== 'transparent' ? { backgroundColor: props.fill } : {}"
          >
            <span v-if="props.fill === 'transparent'" class="transparent-slash" />
          </div>
        </a-popover>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { CaretDownOutlined } from '@ant-design/icons-vue'
import { Popover as APopover } from 'ant-design-vue'
import ColorTonePicker from '../ColorTonePicker.vue'

const props = withDefaults(
  defineProps<{
    fill?: string
  }>(),
  {
    fill: '#ffffff',
  }
)

const emit = defineEmits<{
  (e: 'update:fill', val: string): void
}>()

const isCollapsed = ref(false)
const colorOpen = ref(false)

const onColorSelect = (c: string) => {
  emit('update:fill', c)
}
</script>

<style scoped>
.fill-setter-group {
  margin-bottom: 12px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  user-select: none;
  margin-bottom: 8px;
}

.group-arrow {
  font-size: 10px;
  color: #9ca3af;
  transition: transform 0.2s ease;
}

.group-arrow.is-collapsed {
  transform: rotate(-90deg);
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.row-label {
  font-size: 12px;
  color: #6b7280;
}

.color-preview-trigger {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.color-preview-trigger:hover {
  transform: scale(1.08);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.color-preview-trigger.is-transparent {
  background: #ffffff;
}

.color-preview-trigger.is-white {
  border-color: #d1d5db;
}

.transparent-slash {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    to top right,
    transparent calc(50% - 1px),
    #ef4444 calc(50% - 1px),
    #ef4444 calc(50% + 1px),
    transparent calc(50% + 1px)
  );
}
</style>
