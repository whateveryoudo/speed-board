<template>
  <div class="typography-setter">
    <!-- B I S U 格式按钮组 -->
    <div class="text-format-btn-group">
      <button
        class="fmt-btn is-bold"
        :class="{ 'is-active': props.bold }"
        title="加粗 (⌘+B)"
        @click="emit('update:bold', !props.bold)"
      >
        B
      </button>
      <button
        class="fmt-btn is-italic"
        :class="{ 'is-active': props.italic }"
        title="斜体 (⌘+I)"
        @click="emit('update:italic', !props.italic)"
      >
        I
      </button>
      <button
        class="fmt-btn is-strike"
        :class="{ 'is-active': props.strike }"
        title="删除线"
        @click="emit('update:strike', !props.strike)"
      >
        S
      </button>
      <button
        class="fmt-btn is-underline"
        :class="{ 'is-active': props.underline }"
        title="下划线 (⌘+U)"
        @click="emit('update:underline', !props.underline)"
      >
        U
      </button>
    </div>

    <!-- 字号选择 -->
    <div class="setting-row">
      <span class="row-label">字号</span>
      <a-select
        :value="props.fontSize"
        :options="fontSizeOptions"
        size="small"
        class="font-size-select"
        @change="(val) => emit('update:fontSize', Number(val))"
      />
    </div>

    <!-- 文本颜色 -->
    <div class="setting-row">
      <span class="row-label">文本颜色</span>
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
            :model-value="props.color"
            :allow-transparent="false"
            @update:model-value="(c) => emit('update:color', c)"
          />
        </template>
        <div
          class="color-preview-trigger"
          :style="{ backgroundColor: props.color }"
        />
      </a-popover>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Select as ASelect, Popover as APopover } from 'ant-design-vue'
import ColorTonePicker from '../ColorTonePicker.vue'

const props = withDefaults(
  defineProps<{
    bold?: boolean
    italic?: boolean
    strike?: boolean
    underline?: boolean
    fontSize?: number
    color?: string
  }>(),
  {
    bold: false,
    italic: false,
    strike: false,
    underline: false,
    fontSize: 14,
    color: '#262626',
  }
)

const emit = defineEmits<{
  (e: 'update:bold', val: boolean): void
  (e: 'update:italic', val: boolean): void
  (e: 'update:strike', val: boolean): void
  (e: 'update:underline', val: boolean): void
  (e: 'update:fontSize', val: number): void
  (e: 'update:color', val: string): void
}>()

const colorOpen = ref(false)

const fontSizeOptions = [
  { label: '12px', value: 12 },
  { label: '14px', value: 14 },
  { label: '16px', value: 16 },
  { label: '18px', value: 18 },
  { label: '20px', value: 20 },
  { label: '24px', value: 24 },
  { label: '28px', value: 28 },
  { label: '32px', value: 32 },
  { label: '36px', value: 36 },
  { label: '48px', value: 48 },
]
</script>

<style scoped>
.typography-setter {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.text-format-btn-group {
  display: flex;
  align-items: center;
  background-color: #f3f4f6;
  border-radius: 6px;
  padding: 3px;
  gap: 4px;
}

.fmt-btn {
  flex: 1;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  font-size: 13px;
  color: #4b5563;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.fmt-btn:hover {
  background-color: #e5e7eb;
  color: #111827;
}

.fmt-btn.is-active {
  background-color: #ffffff;
  color: #10b981;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.fmt-btn.is-bold {
  font-weight: bold;
}
.fmt-btn.is-italic {
  font-style: italic;
}
.fmt-btn.is-strike {
  text-decoration: line-through;
}
.fmt-btn.is-underline {
  text-decoration: underline;
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

.font-size-select {
  width: 90px;
}

.color-preview-trigger {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.color-preview-trigger:hover {
  transform: scale(1.08);
}
</style>
