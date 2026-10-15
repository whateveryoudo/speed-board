<template>
  <div class="setting-row shape-preview-row">
    <span class="row-label">形状</span>
    <div class="shape-type-preview-box" :title="shapeDef?.name || '形状'">
      <div v-if="shapeDef" class="shape-type-svg" v-html="shapeIconSvg" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  getShapeById,
  getShapeIconSvg,
} from '../../data/shapeLibrary'

const props = withDefaults(
  defineProps<{
    shapeId?: string
  }>(),
  {
    shapeId: 'rect',
  }
)

const shapeDef = computed(() => getShapeById(props.shapeId))

const shapeIconSvg = computed(() => {
  if (!shapeDef.value) return ''
  return getShapeIconSvg(shapeDef.value)
})
</script>

<style scoped>
.shape-preview-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.row-label {
  font-size: 12px;
  color: #6b7280;
}

.shape-type-preview-box {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background-color: #f9fafb;
  display: flex;
  align-items: center;
  justify-content: center;
}

.shape-type-svg {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.shape-type-svg :deep(svg) {
  width: 18px;
  height: 18px;
}
</style>
