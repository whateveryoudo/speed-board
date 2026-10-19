<template>
  <div class="setting-group stroke-setter-group">
    <div class="group-header" @click="isCollapsed = !isCollapsed">
      <CaretDownOutlined class="group-arrow" :class="{ 'is-collapsed': isCollapsed }" />
      <span>边框 / 描边</span>
    </div>

    <div v-show="!isCollapsed" class="setter-content">
      <!-- 边框颜色 -->
      <div class="setting-row">
        <span class="row-label">颜色</span>
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
              :model-value="props.stroke"
              :allow-transparent="true"
              @update:model-value="onColorSelect"
            />
          </template>
          <div
            class="color-preview-trigger"
            :class="{
              'is-transparent': props.stroke === 'transparent',
              'is-white': props.stroke?.toLowerCase() === '#ffffff',
            }"
            :style="props.stroke !== 'transparent' ? { backgroundColor: props.stroke } : {}"
          >
            <span v-if="props.stroke === 'transparent'" class="transparent-slash" />
          </div>
        </a-popover>
      </div>

      <!-- 边框粗细 -->
      <div class="setting-row">
        <span class="row-label">粗细</span>
        <div class="width-segmented-group">
          <div
            v-for="w in widthOptions"
            :key="w.value"
            class="width-option-pill"
            :class="{ 'is-active': props.strokeWidth === w.value }"
            @click="emit('update:strokeWidth', w.value)"
          >
            {{ w.label }}
          </div>
        </div>
      </div>

      <!-- 虚实样式 -->
      <div class="setting-row">
        <span class="row-label">样式</span>
        <div class="dash-segmented-group">
          <div
            class="dash-option-pill"
            :class="{ 'is-active': (props.strokeDasharray || 'none') === 'none' }"
            title="实线"
            @click="emit('update:strokeDasharray', 'none')"
          >
            <svg width="28" height="12" viewBox="0 0 28 12">
              <line x1="0" y1="6" x2="28" y2="6" stroke="currentColor" stroke-width="2" />
            </svg>
          </div>
          <div
            class="dash-option-pill"
            :class="{ 'is-active': props.strokeDasharray === '6,4' }"
            title="虚线"
            @click="emit('update:strokeDasharray', '6,4')"
          >
            <svg width="28" height="12" viewBox="0 0 28 12">
              <line x1="0" y1="6" x2="28" y2="6" stroke="currentColor" stroke-width="2" stroke-dasharray="6,4" />
            </svg>
          </div>
          <div
            class="dash-option-pill"
            :class="{ 'is-active': props.strokeDasharray === '2,3' }"
            title="点线"
            @click="emit('update:strokeDasharray', '2,3')"
          >
            <svg width="28" height="12" viewBox="0 0 28 12">
              <line x1="0" y1="6" x2="28" y2="6" stroke="currentColor" stroke-width="2" stroke-dasharray="2,3" />
            </svg>
          </div>
        </div>
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
    stroke?: string
    strokeWidth?: number
    strokeDasharray?: string
  }>(),
  {
    stroke: '#374151',
    strokeWidth: 2,
    strokeDasharray: 'none',
  }
)

const emit = defineEmits<{
  (e: 'update:stroke', val: string): void
  (e: 'update:strokeWidth', val: number): void
  (e: 'update:strokeDasharray', val: string): void
}>()

const isCollapsed = ref(false)
const colorOpen = ref(false)

const widthOptions = [
  { label: '1px', value: 1 },
  { label: '2px', value: 2 },
  { label: '4px', value: 4 },
  { label: '8px', value: 8 },
]

const onColorSelect = (c: string) => {
  emit('update:stroke', c)
}
</script>

<style scoped>
.stroke-setter-group {
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
  margin-bottom: 10px;
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

.width-segmented-group,
.dash-segmented-group {
  display: flex;
  align-items: center;
  background-color: #f3f4f6;
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}

.width-option-pill,
.dash-option-pill {
  padding: 2px 8px;
  font-size: 11px;
  color: #4b5563;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.width-option-pill:hover,
.dash-option-pill:hover {
  color: #111827;
}

.width-option-pill.is-active,
.dash-option-pill.is-active {
  background-color: #e5e7eb;
  color: #111827;
  font-weight: 600;
}
</style>
