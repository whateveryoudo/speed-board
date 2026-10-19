<template>
  <div class="mindmap-setter-section">
    <div class="section-title">节点</div>

    <!-- 1. 节点形状 -->
    <div class="setter-row">
      <span class="label">节点形状</span>
      <a-select
        :value="currentShapeStyle"
        size="small"
        style="width: 130px"
        @change="onShapeStyleChange"
      >
        <a-select-option value="none">纯文本(无边框)</a-select-option>
        <a-select-option value="capsule">胶囊</a-select-option>
        <a-select-option value="rect">矩形</a-select-option>
        <a-select-option value="underline">下划线</a-select-option>
      </a-select>
    </div>

    <!-- 2. 填充颜色 -->
    <div v-if="currentShapeStyle === 'capsule' || currentShapeStyle === 'rect'" class="setter-row">
      <span class="label">填充颜色</span>
      <a-popover v-model:open="fillPopoverOpen" trigger="click" placement="left">
        <template #content>
          <div class="color-palette">
            <div
              v-for="color in PRESET_COLORS"
              :key="color"
              class="color-dot"
              :style="{ backgroundColor: color }"
              @click="onFillChange(color)"
            />
          </div>
        </template>
        <div class="color-preview-block" :style="{ backgroundColor: currentFill }" />
      </a-popover>
    </div>

    <!-- 3. 边框颜色与粗细 -->
    <div v-if="currentShapeStyle === 'capsule' || currentShapeStyle === 'rect'" class="setter-row">
      <span class="label">边框颜色</span>
      <a-popover v-model:open="strokePopoverOpen" trigger="click" placement="left">
        <template #content>
          <div class="color-palette">
            <div
              v-for="color in PRESET_COLORS"
              :key="color"
              class="color-dot"
              :style="{ backgroundColor: color }"
              @click="onStrokeChange(color)"
            />
          </div>
        </template>
        <div class="color-preview-block" :style="{ backgroundColor: currentStroke }" />
      </a-popover>
    </div>

    <div v-if="currentShapeStyle === 'capsule' || currentShapeStyle === 'rect'" class="setter-row">
      <span class="label">边框粗细</span>
      <a-input-number
        :value="currentStrokeWidth"
        :min="0"
        :max="10"
        size="small"
        style="width: 80px"
        @change="onStrokeWidthChange"
      />
    </div>

    <!-- 4. 手动设置节点尺寸 -->
    <div class="setter-row">
      <a-checkbox v-model:checked="isManualSize" @change="onManualSizeChange">
        手动设置节点尺寸
      </a-checkbox>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Select as ASelect,
  SelectOption as ASelectOption,
  Popover as APopover,
  InputNumber as AInputNumber,
  Checkbox as ACheckbox,
} from 'ant-design-vue'
import type { Board } from '@speed-board/core'
import { PRESET_COLORS, type MindmapShapeStyle } from '@speed-board/shared'

const props = defineProps<{
  board: Board | null
}>()

const fillPopoverOpen = ref(false)
const strokePopoverOpen = ref(false)

const selectedCell = computed(() => {
  return props.board?.graph.getSelectedCells()[0] || null
})

const cellData = computed(() => {
  return (selectedCell.value?.getData() || {}) as any
})

const currentShapeStyle = computed<MindmapShapeStyle>(() => {
  return cellData.value.shapeStyle || 'none'
})

const currentFill = computed(() => {
  return selectedCell.value?.getAttrByPath('body/fill') || '#ffffff'
})

const currentStroke = computed(() => {
  return selectedCell.value?.getAttrByPath('body/stroke') || '#8b5cf6'
})

const currentStrokeWidth = computed(() => {
  return Number(selectedCell.value?.getAttrByPath('body/strokeWidth')) || 1.5
})

const isManualSize = ref(false)

const onShapeStyleChange = (style: MindmapShapeStyle) => {
  if (!selectedCell.value || !props.board) return
  const node = selectedCell.value
  const data = node.getData() || {}
  node.setData({ ...data, shapeStyle: style })

  if (style === 'none') {
    node.setAttrByPath('body/fill', 'transparent')
    node.setAttrByPath('body/stroke', 'transparent')
    node.setAttrByPath('body/strokeWidth', 0)
    node.setAttrByPath('underline/display', 'none')
  } else if (style === 'underline') {
    node.setAttrByPath('body/fill', 'transparent')
    node.setAttrByPath('body/stroke', 'transparent')
    node.setAttrByPath('body/strokeWidth', 0)
    node.setAttrByPath('underline/display', 'block')
    if (data.branch?.color) {
      node.setAttrByPath('underline/fill', data.branch.color)
      node.setAttrByPath('underline/stroke', 'none')
    }
  } else if (style === 'capsule') {
    node.setAttrByPath('body/rx', 16)
    node.setAttrByPath('body/ry', 16)
    node.setAttrByPath('body/fill', data.fill || '#ffffff')
    node.setAttrByPath('body/stroke', data.branch?.color || '#8b5cf6')
    node.setAttrByPath('body/strokeWidth', 1.5)
    node.setAttrByPath('underline/display', 'none')
  } else if (style === 'rect') {
    node.setAttrByPath('body/rx', 6)
    node.setAttrByPath('body/ry', 6)
    node.setAttrByPath('body/fill', data.fill || '#ffffff')
    node.setAttrByPath('body/stroke', data.branch?.color || '#8b5cf6')
    node.setAttrByPath('body/strokeWidth', 1.5)
    node.setAttrByPath('underline/display', 'none')
  }

  ;(props.board as any).commands?.updateMindmapLayout?.(node.id)
}

const onFillChange = (color: string) => {
  fillPopoverOpen.value = false
  if (!selectedCell.value) return
  selectedCell.value.setAttrByPath('body/fill', color)
}

const onStrokeChange = (color: string) => {
  strokePopoverOpen.value = false
  if (!selectedCell.value) return
  selectedCell.value.setAttrByPath('body/stroke', color)
}

const onStrokeWidthChange = (val: any) => {
  if (!selectedCell.value) return
  selectedCell.value.setAttrByPath('body/strokeWidth', Number(val) || 1)
}

const onManualSizeChange = (e: any) => {
  isManualSize.value = e.target.checked
}
</script>

<style scoped lang="less">
.mindmap-setter-section {
  padding: 8px 0;

  .section-title {
    font-size: 13px;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 10px;
  }

  .setter-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;

    .label {
      font-size: 12px;
      color: #6b7280;
    }

    .color-preview-block {
      width: 48px;
      height: 24px;
      border-radius: 4px;
      border: 1px solid #d1d5db;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }
  }
}

.color-palette {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  width: 130px;

  .color-dot {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid rgba(0, 0, 0, 0.1);
    &:hover {
      transform: scale(1.15);
    }
  }
}
</style>
