<template>
  <transition name="drawer-slide">
    <div v-show="props.visible" class="style-settings-panel">
      <!-- 1. 顶部标头 (标题 + 关闭按钮) -->
      <div class="panel-header">
        <span class="panel-title">设置</span>
        <button class="close-btn" @click="onClose">
          <CloseOutlined />
        </button>
      </div>

      <!-- 2. 一级分类选项卡 (样式 / 文本 / 排列 - 1:1 语雀白板) -->
      <div class="panel-tabs">
        <div
          v-if="!isTextOnlyNodeSelected"
          class="tab-item"
          :class="{ 'is-active': activeTab === 'style' }"
          @click="activeTab = 'style'"
        >
          样式
        </div>
        <div
          v-if="hasTextCapability"
          class="tab-item"
          :class="{ 'is-active': activeTab === 'text' }"
          @click="activeTab = 'text'"
        >
          文本
        </div>
        <div
          class="tab-item"
          :class="{ 'is-active': activeTab === 'arrange' }"
          @click="activeTab = 'arrange'"
        >
          排列
        </div>
      </div>

      <!-- 3.1 文本专用配置面板 (1:1 语雀白板风格) -->
      <div v-if="activeTab === 'text'" class="panel-content">
        <div>
          <!-- B I S U 格式按钮组 -->
          <div class="text-format-btn-group">
            <button
              class="fmt-btn is-bold"
              :class="{ 'is-active': textState.bold }"
              title="加粗 (⌘+B)"
              @click="toggleBold"
            >
              B
            </button>
            <button
              class="fmt-btn is-italic"
              :class="{ 'is-active': textState.italic }"
              title="斜体 (⌘+I)"
              @click="toggleItalic"
            >
              I
            </button>
            <button
              class="fmt-btn is-strike"
              :class="{ 'is-active': textState.strike }"
              title="删除线"
              @click="toggleStrike"
            >
              S
            </button>
            <button
              class="fmt-btn is-underline"
              :class="{ 'is-active': textState.underline }"
              title="下划线 (⌘+U)"
              @click="toggleUnderline"
            >
              U
            </button>
          </div>

          <!-- 字号下拉选择 -->
          <div class="setting-row">
            <span class="row-label">字号</span>
            <a-select
              :value="textState.fontSize"
              :options="fontSizeOptions"
              size="small"
              class="font-size-select"
              @change="onFontSizeChange"
            />
          </div>

          <!-- 文本颜色 -->
          <div class="setting-row">
            <span class="row-label">文本颜色</span>
            <a-popover
              trigger="click"
              placement="bottomRight"
              :overlay-inner-style="{ padding: '8px', borderRadius: '10px' }"
            >
              <template #content>
                <ColorTonePicker
                  :model-value="textState.fill"
                  @change="onTextColorChange"
                />
              </template>
              <div
                class="color-preview-box"
                :style="{ backgroundColor: textState.fill }"
              />
            </a-popover>
          </div>

          <div class="panel-divider" />

          <!-- 对齐方式 (水平对齐 + 垂直对齐) -->
          <div class="setting-group">
            <div class="group-header">
              <CaretDownOutlined class="group-arrow" />
              <span>对齐方式</span>
            </div>

            <!-- 水平对齐 4 键 -->
            <div class="align-btn-group">
              <button
                class="align-btn"
                :class="{ 'is-active': textState.align === 'left' }"
                title="左对齐"
                @click="setTextAlign('left')"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="15" y2="12" />
                  <line x1="3" y1="18" x2="18" y2="18" />
                </svg>
              </button>
              <button
                class="align-btn"
                :class="{ 'is-active': textState.align === 'center' }"
                title="居中对齐"
                @click="setTextAlign('center')"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="6" y1="12" x2="18" y2="12" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                </svg>
              </button>
              <button
                class="align-btn"
                :class="{ 'is-active': textState.align === 'right' }"
                title="右对齐"
                @click="setTextAlign('right')"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="9" y1="12" x2="21" y2="12" />
                  <line x1="6" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            </div>

            <!-- 垂直对齐 3 键 -->
            <div class="align-btn-group is-vertical-row">
              <button
                class="align-btn"
                :class="{ 'is-active': textState.verticalAlign === 'top' }"
                title="顶部对齐"
                @click="setTextVerticalAlign('top')"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="4" y1="4" x2="20" y2="4" stroke-width="2.5" />
                  <path d="M12 7v13M8 11l4-4 4 4" />
                </svg>
              </button>
              <button
                class="align-btn"
                :class="{ 'is-active': textState.verticalAlign === 'middle' }"
                title="垂直居中"
                @click="setTextVerticalAlign('middle')"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="4" y1="12" x2="20" y2="12" stroke-width="2.5" />
                  <path d="M12 5v14M8 8l4-3 4 3M8 16l4 3 4-3" />
                </svg>
              </button>
              <button
                class="align-btn"
                :class="{ 'is-active': textState.verticalAlign === 'bottom' }"
                title="底部对齐"
                @click="setTextVerticalAlign('bottom')"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="4" y1="20" x2="20" y2="20" stroke-width="2.5" />
                  <path d="M12 17V4M8 13l4 4 4-4" />
                </svg>
              </button>
            </div>
          </div>

          <div class="panel-divider" />

          <!-- 链接 -->
          <div class="setting-group">
            <div class="group-header">
              <CaretDownOutlined class="group-arrow" />
              <span>链接</span>
            </div>

            <div v-if="textState.link" class="link-display-row">
              <a
                :href="textState.link"
                target="_blank"
                class="link-anchor"
                :title="textState.link"
              >
                {{ textState.link }}
              </a>
              <a-button size="small" type="link" @click="emit('open-link-overlay')">编辑</a-button>
            </div>
            <a-button v-else class="add-link-btn" block @click="emit('open-link-overlay')">
              添加链接
            </a-button>
          </div>
        </div>
      </div>

      <!-- 3.2 图形/多边形专用配置面板 (样式 Tab - 1:1 语雀白板) -->
      <div v-else-if="activeTab === 'style'" class="panel-content">
        <!-- 节点属性 (形状类型 + 填充颜色) -->
        <div class="setting-group">
          <div class="group-header">
            <CaretDownOutlined class="group-arrow" />
            <span>节点</span>
          </div>

          <!-- 形状类型 (如果是图形节点，显示当前形状预览方块，与语雀截图一模一样) -->
          <div v-if="isShapeNodeSelected" class="setting-row">
            <span class="row-label">形状</span>
            <div class="shape-type-preview-box" :title="currentShapeDef?.name || '形状'">
              <div v-if="currentShapeDef" class="shape-type-svg" v-html="getShapeIconSvg(currentShapeDef)" />
            </div>
          </div>

          <div class="setting-row">
            <span class="row-label">填充颜色</span>
              <a-popover
                trigger="click"
                placement="bottomRight"
                :overlay-inner-style="{ padding: '8px', borderRadius: '10px' }"
              >
                <template #content>
                  <ColorTonePicker
                    :model-value="fillColor"
                    @change="onFillColorChange"
                  />
                </template>
                <div
                  class="color-preview-box"
                  :class="{ 'is-transparent': fillColor === 'transparent' }"
                  :style="fillColor !== 'transparent' ? { backgroundColor: fillColor } : {}"
                >
                  <span v-if="fillColor === 'transparent'" class="transparent-slash" />
                </div>
              </a-popover>
            </div>
          </div>

          <div class="panel-divider" />

          <!-- 边框属性 (颜色 / 粗细 / 样式) -->
          <div class="setting-group">
            <div class="group-header">
              <CaretDownOutlined class="group-arrow" />
              <span>边框</span>
            </div>

            <!-- 边框颜色 -->
            <div class="setting-row">
              <span class="row-label">颜色</span>
              <a-popover
                trigger="click"
                placement="bottomRight"
                :overlay-inner-style="{ padding: '8px', borderRadius: '10px' }"
              >
                <template #content>
                  <ColorTonePicker
                    :model-value="strokeColor"
                    @change="onStrokeColorChange"
                  />
                </template>
                <div
                  class="color-preview-box"
                  :class="{ 'is-transparent': strokeColor === 'transparent' }"
                  :style="strokeColor !== 'transparent' ? { backgroundColor: strokeColor } : {}"
                >
                  <span v-if="strokeColor === 'transparent'" class="transparent-slash" />
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
                  :class="{ 'is-active': strokeWidth === w.value }"
                  @click="onStrokeWidthChange(w.value)"
                >
                  {{ w.label }}
                </div>
              </div>
            </div>

            <!-- 边框虚实样式 -->
            <div class="setting-row">
              <span class="row-label">样式</span>
              <div class="dash-segmented-group">
                <!-- 实线 -->
                <div
                  class="dash-option-pill"
                  :class="{ 'is-active': strokeDasharray === 'none' }"
                  title="实线"
                  @click="onStrokeDashChange('none')"
                >
                  <svg width="28" height="12" viewBox="0 0 28 12">
                    <line x1="0" y1="6" x2="28" y2="6" stroke="currentColor" stroke-width="2" />
                  </svg>
                </div>
                <!-- 虚线 -->
                <div
                  class="dash-option-pill"
                  :class="{ 'is-active': strokeDasharray === '6,4' }"
                  title="虚线"
                  @click="onStrokeDashChange('6,4')"
                >
                  <svg width="28" height="12" viewBox="0 0 28 12">
                    <line
                      x1="0"
                      y1="6"
                      x2="28"
                      y2="6"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-dasharray="6,4"
                    />
                  </svg>
                </div>
                <!-- 点线 -->
                <div
                  class="dash-option-pill"
                  :class="{ 'is-active': strokeDasharray === '2,3' }"
                  title="点线"
                  @click="onStrokeDashChange('2,3')"
                >
                  <svg width="28" height="12" viewBox="0 0 28 12">
                    <line
                      x1="0"
                      y1="6"
                      x2="28"
                      y2="6"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-dasharray="2,3"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div class="panel-divider" />

          <!-- 不透明度属性 (0% ~ 100% 滑块) -->
          <div class="setting-group">
            <div class="group-header">
              <CaretDownOutlined class="group-arrow" />
              <span>不透明度</span>
            </div>

            <div class="opacity-slider-row">
              <a-slider
                v-model:value="opacityPercent"
                :min="0"
                :max="100"
                :step="1"
                class="brand-green-slider"
                @change="onOpacitySliderChange"
              />
              <span class="opacity-value-label">{{ opacityPercent }}%</span>
            </div>
          </div>
        </div>

      <!-- 4. 排列图层控制内容 -->
      <div v-else-if="activeTab === 'arrange'" class="panel-content">
        <div class="setting-group">
          <div class="group-header">
            <CaretDownOutlined class="group-arrow" />
            <span>图层层叠顺序</span>
          </div>

          <div class="arrange-action-list">
            <a-button class="arrange-btn" block @click="bringToFront">
              置于顶层
            </a-button>
            <a-button class="arrange-btn" block @click="sendToBack">
              置于底层
            </a-button>
            <a-button class="arrange-btn" block @click="bringForward">
              上移一层
            </a-button>
            <a-button class="arrange-btn" block @click="sendBackward">
              下移一层
            </a-button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import {
  CloseOutlined,
  CaretDownOutlined,
} from '@ant-design/icons-vue'
import {
  Popover as APopover,
  Slider as ASlider,
  Button as AButton,
  Select as ASelect,
} from 'ant-design-vue'
import type { Board } from '@speed-board/core'
import ColorTonePicker from './ColorTonePicker.vue'
import {
  getShapeById,
  renderShapeCanvasSvg,
  getShapeIconSvg,
} from '../data/shapeLibrary'

const props = withDefaults(
  defineProps<{
    board: Board | null
    visible: boolean
    defaultFill?: string
    defaultStroke?: string
    defaultStrokeWidth?: number
    defaultStrokeDash?: string
    defaultOpacity?: number
  }>(),
  {
    visible: false,
    defaultFill: 'transparent',
    defaultStroke: '#374151',
    defaultStrokeWidth: 2,
    defaultStrokeDash: 'none',
    defaultOpacity: 1,
  }
)

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'open-link-overlay'): void
  (
    e: 'style-change',
    payload: {
      fill?: string
      stroke?: string
      strokeWidth?: number
      strokeDasharray?: string
      opacity?: number
    }
  ): void
}>()

const activeTab = ref<'style' | 'text' | 'arrange'>('style')
const isTextNodeSelected = ref(false)
const isShapeNodeSelected = ref(false)
const currentShapeId = ref('rect')

const currentShapeDef = computed(() => {
  return getShapeById(currentShapeId.value)
})

const isTextOnlyNodeSelected = computed(() => {
  return isTextNodeSelected.value && !isShapeNodeSelected.value
})

const hasTextCapability = computed(() => {
  return isTextNodeSelected.value || isShapeNodeSelected.value
})

// 文本配置状态
const textState = ref({
  text: '文本',
  link: '',
  fontSize: 14,
  fill: '#262626',
  bold: false,
  italic: false,
  strike: false,
  underline: false,
  align: 'left' as 'left' | 'center' | 'right' | 'justify',
  verticalAlign: 'middle' as 'top' | 'middle' | 'bottom',
})

const fontSizeOptions = [
  { label: '12', value: 12 },
  { label: '14', value: 14 },
  { label: '16', value: 16 },
  { label: '18', value: 18 },
  { label: '20', value: 20 },
  { label: '24', value: 24 },
  { label: '28', value: 28 },
  { label: '32', value: 32 },
  { label: '36', value: 36 },
  { label: '48', value: 48 },
  { label: '64', value: 64 },
]

// 图形样式属性
const fillColor = ref(props.defaultFill)
const strokeColor = ref(props.defaultStroke)
const strokeWidth = ref(props.defaultStrokeWidth)
const strokeDasharray = ref(props.defaultStrokeDash)
const opacityPercent = ref(Math.round(props.defaultOpacity * 100))

const widthOptions = [
  { label: '1px', value: 1 },
  { label: '2px', value: 2 },
  { label: '4px', value: 4 },
  { label: '8px', value: 8 },
]

const onClose = () => {
  emit('update:visible', false)
}

// 文本属性变更处理
const toggleBold = () => {
  textState.value.bold = !textState.value.bold
  props.board?.updateSelectedTextStyle({ bold: textState.value.bold })
}

const toggleItalic = () => {
  textState.value.italic = !textState.value.italic
  props.board?.updateSelectedTextStyle({ italic: textState.value.italic })
}

const toggleStrike = () => {
  textState.value.strike = !textState.value.strike
  props.board?.updateSelectedTextStyle({ strike: textState.value.strike })
}

const toggleUnderline = () => {
  textState.value.underline = !textState.value.underline
  props.board?.updateSelectedTextStyle({ underline: textState.value.underline })
}

const onFontSizeChange = (val: any) => {
  textState.value.fontSize = Number(val)
  props.board?.updateSelectedTextStyle({ fontSize: Number(val) })
}

const onTextColorChange = (color: string) => {
  textState.value.fill = color
  props.board?.updateSelectedTextStyle({ fill: color })
}

const setTextAlign = (align: 'left' | 'center' | 'right' | 'justify') => {
  textState.value.align = align
  props.board?.updateSelectedTextStyle({ align })
}

const setTextVerticalAlign = (valign: 'top' | 'middle' | 'bottom') => {
  textState.value.verticalAlign = valign
  props.board?.updateSelectedTextStyle({ verticalAlign: valign })
}

// 图形样式变更处理
const onFillColorChange = (color: string) => {
  fillColor.value = color
  applyStyle({ fill: color })
}

const onStrokeColorChange = (color: string) => {
  strokeColor.value = color
  applyStyle({ stroke: color })
}

const onStrokeWidthChange = (w: number) => {
  strokeWidth.value = w
  applyStyle({ strokeWidth: w })
}

const onStrokeDashChange = (dash: string) => {
  strokeDasharray.value = dash
  applyStyle({ strokeDasharray: dash })
}

const onOpacitySliderChange = (val: any) => {
  const op = typeof val === 'number' ? val / 100 : 1
  applyStyle({ opacity: op })
}

const applyStyle = (styleObj: {
  fill?: string
  stroke?: string
  strokeWidth?: number
  strokeDasharray?: string
  opacity?: number
}) => {
  if (isShapeNodeSelected.value && props.board) {
    const selectedCells = props.board.graph.getSelectedCells()
    for (const cell of selectedCells) {
      if (props.board.isShapeNode(cell)) {
        const data = cell.getData() || {}
        const sId = data.shapeId || currentShapeId.value
        const shapeDef = getShapeById(sId)
        const newFill = styleObj.fill !== undefined ? styleObj.fill : fillColor.value
        const newStroke = styleObj.stroke !== undefined ? styleObj.stroke : strokeColor.value
        const newStrokeWidth = styleObj.strokeWidth !== undefined ? styleObj.strokeWidth : strokeWidth.value
        const newDash = styleObj.strokeDasharray !== undefined ? styleObj.strokeDasharray : strokeDasharray.value
        const newOpacity = styleObj.opacity !== undefined ? styleObj.opacity : opacityPercent.value / 100

        let svgContent: string | undefined = undefined
        if (shapeDef) {
          svgContent = renderShapeCanvasSvg(shapeDef, {
            fill: newFill,
            stroke: newStroke,
            strokeWidth: newStrokeWidth,
            strokeDasharray: newDash,
          })
        }
        props.board.updateShapeNode(cell as any, {
          ...styleObj,
          fill: newFill,
          stroke: newStroke,
          strokeWidth: newStrokeWidth,
          strokeDasharray: newDash,
          opacity: newOpacity,
          svgContent,
        })
      }
    }
  } else {
    props.board?.updateSelectedStyle(styleObj)
  }

  emit('style-change', {
    fill: fillColor.value,
    stroke: strokeColor.value,
    strokeWidth: strokeWidth.value,
    strokeDasharray: strokeDasharray.value,
    opacity: opacityPercent.value / 100,
    ...styleObj,
  })
}

// 图层操作
const bringToFront = () => {
  const selected = props.board?.graph.getSelectedCells()
  selected?.forEach((cell) => cell.toFront())
}

const sendToBack = () => {
  const selected = props.board?.graph.getSelectedCells()
  selected?.forEach((cell) => cell.toBack())
}

const bringForward = () => {
  const selected = props.board?.graph.getSelectedCells()
  selected?.forEach((cell) => {
    const z = cell.getZIndex() || 1
    cell.setZIndex(z + 1)
  })
}

const sendBackward = () => {
  const selected = props.board?.graph.getSelectedCells()
  selected?.forEach((cell) => {
    const z = cell.getZIndex() || 1
    cell.setZIndex(Math.max(1, z - 1))
  })
}

// 选中单元格同步回显
const syncSelectionStyle = () => {
  if (!props.board) return
  isShapeNodeSelected.value = props.board.isShapeNode()
  isTextNodeSelected.value = props.board.isTextNode()

  if (isShapeNodeSelected.value) {
    const shapeData = props.board.getShapeNodeData()
    if (shapeData) {
      currentShapeId.value = shapeData.shapeId || 'rect'
      if (shapeData.fill !== undefined) fillColor.value = shapeData.fill
      if (shapeData.stroke !== undefined) strokeColor.value = shapeData.stroke
      if (shapeData.strokeWidth !== undefined) strokeWidth.value = shapeData.strokeWidth
      if (shapeData.strokeDasharray !== undefined) strokeDasharray.value = shapeData.strokeDasharray
      if (shapeData.opacity !== undefined) opacityPercent.value = Math.round(shapeData.opacity * 100)
    }
    const textData = props.board.getSelectedTextData()
    if (textData) {
      textState.value = { ...textData }
    }
    // 形状节点有样式+文本，保持用户当前停留在的标签；若处于非法的main则切到style
    if (activeTab.value !== 'text' && activeTab.value !== 'arrange') {
      activeTab.value = 'style'
    }
  } else if (isTextOnlyNodeSelected.value) {
    const textData = props.board.getSelectedTextData()
    if (textData) {
      textState.value = { ...textData }
    }
    activeTab.value = 'text'
  } else {
    const style = props.board.getSelectedStyle()
    if (style) {
      if (style.fill) fillColor.value = style.fill
      if (style.stroke) strokeColor.value = style.stroke
      if (style.strokeWidth) strokeWidth.value = style.strokeWidth
      if (style.strokeDasharray) strokeDasharray.value = style.strokeDasharray
      if (style.opacity !== undefined) opacityPercent.value = Math.round(style.opacity * 100)
    }
    activeTab.value = 'style'
  }
  emit('update:visible', true)
}

// 监听 X6 图形选择变化
const bindGraphSelectionEvents = (board: Board | null) => {
  if (!board) return

  const onCellSelected = () => {
    syncSelectionStyle()
  }

  board.graph.on('cell:selected', onCellSelected)

  return () => {
    board.graph.off('cell:selected', onCellSelected)
  }
}

let unbindEvents: (() => void) | undefined

watch(
  () => props.board,
  (b) => {
    unbindEvents?.()
    if (b) {
      unbindEvents = bindGraphSelectionEvents(b)
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  unbindEvents?.()
})
</script>

<style scoped lang="less">
.style-settings-panel {
  position: absolute;
  top: 108px; // 紧随右上角工具条下方垂直排列，不与工具条并行
  right: 16px;
  width: 290px;
  max-height: calc(100vh - 124px);
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.12), 0 2px 8px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.06);
  z-index: 60;
  display: flex;
  flex-direction: column;
  user-select: none;
  overflow-y: auto;
  overflow-x: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;

  .panel-title {
    font-size: 14px;
    font-weight: 600;
    color: #111827;
  }

  .close-btn {
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 13px;
    color: #9ca3af;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;

    &:hover {
      background: #f3f4f6;
      color: #374151;
    }
  }
}

.panel-tabs {
  display: flex;
  border-bottom: 1px solid #f3f4f6;
  padding: 0 16px;

  .tab-item {
    font-size: 13px;
    padding: 8px 12px;
    color: #6b7280;
    cursor: pointer;
    position: relative;
    font-weight: 500;
    transition: color 0.15s ease;

    &:hover {
      color: #111827;
    }

    &.is-active {
      color: #111827;
      font-weight: 600;

      &::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 12px;
        right: 12px;
        height: 2px;
        background: #111827;
        border-radius: 2px;
      }
    }
  }
}

.panel-content {
  padding: 14px 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.text-format-btn-group {
  display: flex;
  gap: 8px;

  .fmt-btn {
    flex: 1;
    height: 32px;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
    background: #ffffff;
    color: #374151;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;

    &.is-bold {
      font-weight: 700;
      font-family: serif;
    }
    &.is-italic {
      font-style: italic;
      font-family: serif;
    }
    &.is-strike {
      text-decoration: line-through;
    }
    &.is-underline {
      text-decoration: underline;
    }

    &:hover {
      background: #f9fafb;
      color: #111827;
    }

    &.is-active {
      background: #f3f4f6;
      border-color: #d1d5db;
      color: #111827;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
    }
  }
}

.font-size-select {
  width: 90px;
}

.align-btn-group {
  display: flex;
  background: #ffffff;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  overflow: hidden;

  .align-btn {
    flex: 1;
    height: 30px;
    background: transparent;
    border: none;
    border-right: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #4b5563;
    cursor: pointer;
    transition: all 0.15s ease;

    &:last-child {
      border-right: none;
    }

    &:hover {
      background-color: #f9fafb;
      color: #111827;
    }

    &.is-active {
      border: 1.5px solid #10b981 !important; // 语雀 1:1 经典绿色高亮边框
      color: #10b981 !important;
      position: relative;
      z-index: 1;
      border-radius: 4px;
    }
  }

  &.is-vertical-row {
    margin-top: 6px;
  }
}

.link-display-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: #f9fafb;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;

  .link-anchor {
    font-size: 12px;
    color: #10b981;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

.add-link-btn {
  font-size: 13px;
  border-radius: 6px;
  color: #374151;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .group-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: #374151;

    .group-arrow {
      font-size: 9px;
      color: #9ca3af;
    }
  }
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 0;

  .row-label {
    font-size: 13px;
    color: #4b5563;
  }
}

.color-preview-box {
  width: 72px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  cursor: pointer;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    transform: scale(1.02);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }

  &.is-transparent {
    background: #ffffff;

    .transparent-slash {
      position: absolute;
      top: 50%;
      left: -20%;
      width: 140%;
      height: 2px;
      background: #ef4444;
      transform: rotate(-30deg);
      transform-origin: center;
    }
  }
}

.width-segmented-group,
.dash-segmented-group {
  display: flex;
  background: #f3f4f6;
  border-radius: 6px;
  padding: 2px;
  gap: 2px;

  .width-option-pill,
  .dash-option-pill {
    padding: 3px 8px;
    font-size: 12px;
    color: #4b5563;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;

    &:hover {
      color: #111827;
    }

    &.is-active {
      background: #ffffff;
      color: #111827;
      font-weight: 600;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
    }
  }
}

.opacity-slider-row {
  display: flex;
  align-items: center;
  gap: 12px;

  .brand-green-slider {
    flex: 1;
    margin: 6px 0;

    :deep(.ant-slider-track) {
      background-color: #34d399 !important; // 语雀白板经典绿色滑轨
    }

    :deep(.ant-slider-handle) {
      border-color: #10b981 !important;
    }
  }

  .opacity-value-label {
    font-size: 12px;
    color: #4b5563;
    font-variant-numeric: tabular-nums;
    min-width: 32px;
    text-align: right;
  }
}

.shape-type-preview-box {
  width: 44px;
  height: 28px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fafafa;
  color: #595959;

  .shape-type-svg {
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;

    :deep(svg) {
      width: 20px;
      height: 20px;
    }
  }
}

.panel-divider {
  height: 1px;
  background: #f3f4f6;
  margin: 2px 0;
}

.arrange-action-list {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .arrange-btn {
    font-size: 13px;
    border-radius: 6px;
    text-align: center;
  }
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
</style>
