<template>
  <div class="setting-group opacity-setter-group">
    <div class="group-header" @click="isCollapsed = !isCollapsed">
      <CaretDownOutlined class="group-arrow" :class="{ 'is-collapsed': isCollapsed }" />
      <span>不透明度</span>
    </div>

    <div v-show="!isCollapsed" class="opacity-slider-row">
      <a-slider
        :value="percentValue"
        :min="0"
        :max="100"
        :step="1"
        class="brand-green-slider"
        @change="onSliderChange"
      />
      <span class="opacity-value-label">{{ percentValue }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { CaretDownOutlined } from '@ant-design/icons-vue'
import { Slider as ASlider } from 'ant-design-vue'

const props = withDefaults(
  defineProps<{
    modelValue?: number // 0 ~ 1
  }>(),
  {
    modelValue: 1,
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', val: number): void
  (e: 'change', val: number): void
}>()

const isCollapsed = ref(false)

const percentValue = computed(() => {
  return Math.round((props.modelValue ?? 1) * 100)
})

const onSliderChange = (val: any) => {
  const num = typeof val === 'number' ? val / 100 : 1
  emit('update:modelValue', num)
  emit('change', num)
}
</script>

<style scoped>
.opacity-setter-group {
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

.opacity-slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 4px;
}

.brand-green-slider {
  flex: 1;
  margin: 6px 0;
}

.brand-green-slider :deep(.ant-slider-track) {
  background-color: #10b981 !important;
}

.brand-green-slider :deep(.ant-slider-handle) {
  border-color: #10b981 !important;
}

.opacity-value-label {
  font-size: 12px;
  color: #4b5563;
  min-width: 42px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
