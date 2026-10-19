<template>
  <div class="line-style-setter">
    <div class="setting-group">
      <div class="group-header">
        <CaretDownOutlined class="group-arrow" />
        <span>连线类型</span>
      </div>

      <div class="type-segmented-row">
        <div
          class="type-pill"
          :class="{ 'is-active': currentLineType === 'straight' }"
          @click="setLineType('straight')"
        >
          直线
        </div>
        <div
          class="type-pill"
          :class="{ 'is-active': currentLineType === 'elbow' }"
          @click="setLineType('elbow')"
        >
          折线
        </div>
        <div
          class="type-pill"
          :class="{ 'is-active': currentLineType === 'curve' }"
          @click="setLineType('curve')"
        >
          曲线
        </div>
      </div>
    </div>

    <!-- 端点设置 (起点 / 终点) -->
    <div class="setting-group">
      <div class="group-header">
        <CaretDownOutlined class="group-arrow" />
        <span>端点箭头</span>
      </div>

      <div class="arrow-settings-row">
        <div class="arrow-select-col">
          <span class="sub-label">起点</span>
          <a-select
            :value="sourceMarkerId"
            size="small"
            style="width: 100%"
            :options="markerOptions"
            @change="(val) => setArrowMarker('source', val as string)"
          />
        </div>

        <div class="arrow-select-col">
          <span class="sub-label">终点</span>
          <a-select
            :value="targetMarkerId"
            size="small"
            style="width: 100%"
            :options="markerOptions"
            @change="(val) => setArrowMarker('target', val as string)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CaretDownOutlined } from '@ant-design/icons-vue'
import { Select as ASelect } from 'ant-design-vue'
import type { Board } from '@speed-board/core'
import { useLineOperations, ARROWHEAD_PRESETS } from '../../composables/useLineOperations'

const props = defineProps<{
  board: Board | null
}>()

const { getLineType, setLineType, getSelectedEdge, setArrowMarker } = useLineOperations(() => props.board)

const currentLineType = computed(() => getLineType())

const markerOptions = ARROWHEAD_PRESETS.map((p) => ({
  label: p.name,
  value: p.id,
}))

const sourceMarkerId = computed(() => {
  const edge = getSelectedEdge()
  const m = edge?.getAttrByPath('line/sourceMarker')
  if (!m) return 'none'
  return typeof m === 'object' ? (m as any).name || 'block' : 'classic-arrow'
})

const targetMarkerId = computed(() => {
  const edge = getSelectedEdge()
  const m = edge?.getAttrByPath('line/targetMarker')
  if (!m) return 'none'
  return typeof m === 'object' ? (m as any).name || 'block' : 'classic-arrow'
})
</script>

<style scoped>
.line-style-setter {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-group {
  margin-bottom: 8px;
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

.type-segmented-row {
  display: flex;
  background-color: #f3f4f6;
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}

.type-pill {
  flex: 1;
  text-align: center;
  padding: 4px 0;
  font-size: 12px;
  color: #4b5563;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.type-pill.is-active {
  background-color: #e5e7eb;
  color: #111827;
  font-weight: 600;
}

.arrow-settings-row {
  display: flex;
  gap: 10px;
}

.arrow-select-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sub-label {
  font-size: 11px;
  color: #6b7280;
}
</style>
