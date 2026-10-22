<template>
  <div class="mindmap-setter-section">
    <div class="section-title">节点</div>

    <!-- 1. 节点形状 -->
    <div class="setter-row">
      <span class="label">节点形状</span>
      <a-select
        :value="currentShapeStyle"
        style="width: 130px"
        @change="(val: any) => onShapeStyleChange(val)"
      >
        <a-select-option value="rect">矩形</a-select-option>
        <a-select-option value="capsule">胶囊</a-select-option>
        <a-select-option value="none">纯文本</a-select-option>
      </a-select>
    </div>

    <!-- 2. 填充颜色 -->
    <div class="setter-row">
      <span class="label">填充颜色</span>
      <a-popover v-model:open="fillPopoverOpen" trigger="click" placement="left">
        <template #content>
          <div class="color-palette">
            <div
              class="color-dot is-transparent-dot"
              title="透明/无填充"
              @click="onFillChange('transparent')"
            >
              <span class="transparent-slash" />
            </div>
            <div
              v-for="color in PRESET_COLORS"
              :key="color"
              class="color-dot"
              :style="{ backgroundColor: color }"
              @click="onFillChange(color)"
            />
          </div>
        </template>
        <div
          class="color-preview-block"
          :style="fillPreviewStyle"
        >
          <span v-if="currentFill === 'transparent'" class="transparent-slash" />
        </div>
      </a-popover>
    </div>

    <!-- 3. 边框颜色与粗细 -->
    <div class="setter-row">
      <span class="label">边框颜色</span>
      <a-popover v-model:open="strokePopoverOpen" trigger="click" placement="left">
        <template #content>
          <div class="color-palette">
            <div
              class="color-dot is-transparent-dot"
              title="无边框"
              @click="onStrokeChange('transparent')"
            >
              <span class="transparent-slash" />
            </div>
            <div
              v-for="color in PRESET_COLORS"
              :key="color"
              class="color-dot"
              :style="{ backgroundColor: color }"
              @click="onStrokeChange(color)"
            />
          </div>
        </template>
        <div
          class="color-preview-block"
          :style="strokePreviewStyle"
        >
          <span v-if="currentStroke === 'transparent' || currentStrokeWidth === 0" class="transparent-slash" />
        </div>
      </a-popover>
    </div>

    <div class="setter-row">
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
      <a-checkbox :checked="isManualSize" @change="onManualSizeChange">
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
import { PRESET_COLORS, calculateMindmapNodeWidth, type MindmapShapeStyle } from '@speed-board/shared'

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
  return cellData.value.shapeStyle || 'rect'
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

const fillPreviewStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {}
  if (currentFill.value !== 'transparent') {
    style.backgroundColor = String(currentFill.value)
  }
  return style
})

const strokePreviewStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {}
  if (currentStroke.value !== 'transparent' && currentStrokeWidth.value > 0) {
    style.backgroundColor = String(currentStroke.value)
  }
  return style
})

const isManualSize = computed(() => {
  return !!cellData.value?.manualSize
})

const onShapeStyleChange = (style: MindmapShapeStyle) => {
  if (!selectedCell.value || !props.board) return
  const node = selectedCell.value
  const data = node.getData() || {}
  node.setData({ ...data, shapeStyle: style })

  const primaryColor = data.branch?.color || '#3b82f6'

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
    node.setAttrByPath('underline/fill', primaryColor)
    node.setAttrByPath('underline/stroke', 'none')
  } else if (style === 'capsule') {
    const rx = data.isRoot ? 21 : 16
    node.setAttrByPath('body/rx', rx)
    node.setAttrByPath('body/ry', rx)
    node.setAttrByPath('body/fill', data.fill || (data.isRoot ? '#f3f4f6' : '#ffffff'))
    node.setAttrByPath('body/stroke', data.stroke || primaryColor)
    node.setAttrByPath('body/strokeWidth', data.strokeWidth || 1.5)
    node.setAttrByPath('underline/display', 'none')
  } else if (style === 'rect') {
    node.setAttrByPath('body/rx', data.isRoot ? 8 : 6)
    node.setAttrByPath('body/ry', data.isRoot ? 8 : 6)
    node.setAttrByPath('body/fill', data.fill || (data.isRoot ? '#f3f4f6' : '#ffffff'))
    node.setAttrByPath('body/stroke', data.stroke || (data.isRoot ? '#e5e7eb' : primaryColor))
    node.setAttrByPath('body/strokeWidth', data.strokeWidth || 1.5)
    node.setAttrByPath('underline/display', 'none')
  }

  ;(props.board as any).commands?.updateMindmapLayout?.(data.mindmapId || node.id)
}

const onFillChange = (color: string) => {
  fillPopoverOpen.value = false
  if (!selectedCell.value) return
  const node = selectedCell.value
  const data = (node.getData() || {}) as any
  node.setData({ ...data, fill: color })
  node.setAttrByPath('body/fill', color)
}

const onStrokeChange = (color: string) => {
  strokePopoverOpen.value = false
  if (!selectedCell.value) return
  const node = selectedCell.value
  const data = (node.getData() || {}) as any
  node.setData({ ...data, stroke: color })
  node.setAttrByPath('body/stroke', color)
  if (color === 'transparent') {
    node.setAttrByPath('body/strokeWidth', 0)
  } else if (currentStrokeWidth.value === 0) {
    node.setData({ ...data, stroke: color, strokeWidth: 1.5 })
    node.setAttrByPath('body/strokeWidth', 1.5)
  }
}

const onStrokeWidthChange = (val: any) => {
  if (!selectedCell.value) return
  const node = selectedCell.value
  const data = (node.getData() || {}) as any
  const width = Number(val) || 0
  node.setData({ ...data, strokeWidth: width })
  node.setAttrByPath('body/strokeWidth', width)
}

const onManualSizeChange = (e: any) => {
  if (!selectedCell.value || !props.board) return
  const checked = e.target.checked
  const node = selectedCell.value as any
  const data = (node.getData() || {}) as any
  const currentSize = node.size?.() || { width: 120, height: 32 }

  if (checked) {
    node.setData({
      ...data,
      manualSize: { width: currentSize.width, height: currentSize.height },
    })
    node.setAttrByPath?.('textWrap/style/whiteSpace', 'pre-wrap')
    node.setAttrByPath?.('textWrap/style/wordBreak', 'break-all')
  } else {
    node.setData({
      ...data,
      manualSize: false,
    })
    node.setAttrByPath?.('textWrap/style/whiteSpace', 'pre')
    node.setAttrByPath?.('textWrap/style/wordBreak', 'normal')

    const isRoot = !!data.isRoot
    const rawText = data.text || (isRoot ? '思维导图' : '分支主题')
    const calcW = calculateMindmapNodeWidth(rawText, isRoot)
    const lines = rawText.split('\n')
    const baseHeight = isRoot ? 42 : 32
    const lineH = (isRoot ? 16 : 14) * 1.45
    const targetHeight = lines.length > 1 ? Math.round(lines.length * lineH + 14) : baseHeight
    node.setSize?.(calcW, targetHeight)
  }

  ;(props.board as any).commands?.updateMindmapLayout?.(data.mindmapId || node.id)
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
      position: relative;
      width: 48px;
      height: 24px;
      border-radius: 4px;
      border: 1px solid #d1d5db;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      background-color: #ffffff;
      overflow: hidden;

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
    }
  }
}

.color-palette {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  width: 130px;

  .color-dot {
    position: relative;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid rgba(0, 0, 0, 0.1);
    overflow: hidden;
    background-color: #ffffff;

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

    &:hover {
      transform: scale(1.15);
    }
  }
}
</style>
