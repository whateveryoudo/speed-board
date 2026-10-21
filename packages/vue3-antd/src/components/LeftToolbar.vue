<template>
  <transition name="slide-fade">
    <div v-show="props.visible !== false" class="left-toolbar-wrapper">
      <!-- 1. 主工具条悬浮胶囊 -->
      <div class="board-floating-capsule left-toolbar-capsule" @pointerdown.stop @click.stop>
        <!-- 图标 -->
        <a-popover :align="{ offset: [10, 0] }" :arrow="false" :open="iconPickerOpen" trigger="click"
          placement="rightTop" :overlay-inner-style="{ padding: '0', borderRadius: '8px' }"
          @update:open="onIconPickerOpenChange">
          <template #content>
            <IconfontPopover :provider="props.iconProvider" @select="onSelectIcon" />
          </template>
          <a-tooltip title="图标" placement="right">
            <a-button type="text" class="shadow-btn-wrapper iconfont-entry-btn"
              :class="{ 'is-active': props.activePlacementType === 'icon' || iconPickerOpen }">
              <SIconFont type="icon-kl-a-iconfonticon" :size="19" />
            </a-button>
          </a-tooltip>
        </a-popover>
        <div class="tool-divider" />
        <!-- 1.1 选择指针 (Select - 'V') -->
        <a-tooltip title="选择指针 (V)" placement="right">
          <a-button type="text" class="shadow-btn-wrapper"
            :class="{ 'is-active': currentTool === 'select' && !props.activePlacementType }" @click="setTool('select')">
            <SIconFont type="icon-kl-board-select-cursor" :size="20" />
          </a-button>
        </a-tooltip>

        <!-- 1.2 画笔/随手画 (Popover 二级面板) -->
        <a-popover :open="brushPopoverOpen" trigger="click" placement="rightTop" :align="{ offset: [10, 0] }"
          overlay-class-name="tool-sub-capsule-popover" :arrow="false"
          :overlay-inner-style="{ padding: '6px', borderRadius: '8px' }" @update:open="onBrushOpenChange">
          <template #content>
            <div class="brush-sub-picker">
              <!-- 2.1 普通铅笔 -->
              <a-tooltip title="铅笔" placement="right">
                <a-button type="text" class="shadow-btn-wrapper sub-capsule-btn"
                  :class="{ 'is-active': currentBrush === 'pencil' }" @click="selectBrush('pencil')">
                  <SIconFont type="icon-kl-board-pencil" :size="30" />
                </a-button>
              </a-tooltip>

              <!-- 2.2 马克笔 / 荧光笔 -->
              <a-tooltip title="马克笔" placement="right">
                <a-button type="text" class="shadow-btn-wrapper sub-capsule-btn"
                  :class="{ 'is-active': currentBrush === 'marker' }" @click="selectBrush('marker')">
                  <SIconFont type="icon-kl-board-marker-pen" :size="30" />
                </a-button>
              </a-tooltip>

              <!-- 2.3 橡皮擦 -->
              <a-tooltip title="橡皮擦" placement="right">
                <a-button type="text" class="shadow-btn-wrapper sub-capsule-btn"
                  :class="{ 'is-active': currentBrush === 'eraser' }" @click="selectBrush('eraser')">
                  <SIconFont type="icon-kl-board-eraser" :size="30" />
                </a-button>
              </a-tooltip>

              <!-- 2.4 线条粗细 (波浪线图标 + 粗细弹窗) -->
              <a-popover :open="widthPopoverOpen" trigger="click" placement="right"
                :destroy-tooltip-on-hide="true" :arrow="false" :align="{ offset: [8, 0] }"
                :overlay-inner-style="{ padding: '8px', borderRadius: '8px' }" @update:open="onWidthOpenChange">
                <template #content>
                  <div class="width-picker-panel">
                    <div v-for="w in strokeWidthOptions" :key="w.value" class="width-picker-item"
                      :class="{ 'is-active': strokeWidth === w.value }" @click="setStrokeWidth(w.value)">
                      <div class="width-line-preview" :style="{ height: `${Math.min(w.value, 8)}px` }" />
                      <span class="width-label">{{ w.label }}</span>
                    </div>
                  </div>
                </template>
                <a-tooltip :title="widthPopoverOpen ? '' : '粗细'" :open="widthPopoverOpen ? false : undefined"
                  placement="right">
                  <a-button type="text" class="shadow-btn-wrapper sub-capsule-btn"
                    :class="{ 'is-active': widthPopoverOpen }">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                      stroke-linecap="round" stroke-linejoin="round">
                      <path d="M4 16c2-4 5-6 8-3s6 6 8 1" />
                    </svg>
                  </a-button>
                </a-tooltip>
              </a-popover>

              <!-- 2.5 颜色选择器 (圆点色块 + 调色板弹窗) -->
              <a-popover :open="colorPopoverOpen" trigger="click" placement="right"
                :destroy-tooltip-on-hide="true" :arrow="false" :align="{ offset: [8, 0] }"
                :overlay-inner-style="{ padding: '8px', borderRadius: '8px' }" @update:open="onColorOpenChange">
                <template #content>
                  <div class="color-picker-palette">
                    <div v-for="color in presetColors" :key="color" class="color-dot-choice"
                      :class="{ 'is-active': strokeColor === color }" :style="{ backgroundColor: color }"
                      @click="setStrokeColor(color)" />
                  </div>
                </template>
                <a-tooltip :title="colorPopoverOpen ? '' : '颜色'" :open="colorPopoverOpen ? false : undefined"
                  placement="right">
                  <a-button type="text" class="shadow-btn-wrapper sub-capsule-btn"
                    :class="{ 'is-active': colorPopoverOpen }">
                    <span class="active-color-dot" :style="{ backgroundColor: strokeColor }" />
                  </a-button>
                </a-tooltip>
              </a-popover>
            </div>
          </template>

          <a-tooltip :title="brushPopoverOpen ? '' : '画笔/随手画'" :open="brushPopoverOpen ? false : undefined"
            placement="right">
            <a-button type="text" class="shadow-btn-wrapper"
              :class="{ 'is-active': currentTool === 'brush' && !props.activePlacementType }">
              <SIconFont type="icon-kl-board-brush" :size="20" />
            </a-button>
          </a-tooltip>
        </a-popover>

        <!-- 1.3 矢量钢笔绘图 -->
        <a-tooltip title="矢量钢笔" placement="right">
          <a-button type="text" class="shadow-btn-wrapper"
            :class="{ 'is-active': currentTool === 'vector' && !props.activePlacementType }" @click="setTool('vector')">
            <SIconFont type="icon-kl-board-vector-drawing" :size="20" />
          </a-button>
        </a-tooltip>

        <!-- 1.4 插入文本 (Text - 'T') -->
        <a-tooltip title="插入文本 (T)" placement="right">
          <a-button type="text" class="shadow-btn-wrapper"
            :class="{ 'is-active': props.activePlacementType === 'text' }"
            @pointerdown="(e: PointerEvent) => handleButtonPointerDown(e, startTextPlacement)"
            @click="onTextButtonClick">
            <SIconFont type="icon-kl-text1" :size="20" />
          </a-button>
        </a-tooltip>

        <!-- 1.5 全量图形库选择器 (1:1 语雀白板风格 Popover) -->
        <a-popover :open="shapePickerOpen" trigger="click" placement="rightTop"
          overlay-class-name="shape-picker-popover-overlay" :arrow="false" :align="{ offset: [10, 0] }"
          :overlay-inner-style="{ padding: '0', borderRadius: '8px' }" @update:open="onShapeOpenChange">
          <template #content>
            <ShapePickerPopover :active-shape-id="currentSelectedShapeId" @select="onShapeLibrarySelect" />
          </template>
          <a-tooltip :title="shapePickerOpen ? '' : '图形库'" :open="shapePickerOpen ? false : undefined"
            placement="right">
            <a-button type="text" class="shadow-btn-wrapper"
              :class="{ 'is-active': props.activePlacementType === 'shape' || shapePickerOpen }">
              <SIconFont type="icon-kl-board-shape-circle" :size="20" />
            </a-button>
          </a-tooltip>
        </a-popover>

        <!-- 1.6 连线工具 (直线 / 曲线 / 折线) -->
        <a-popover :open="linePopoverOpen" trigger="click" placement="rightTop" :align="{ offset: [10, 0] }"
          overlay-class-name="tool-sub-capsule-popover" :arrow="false"
          :overlay-inner-style="{ padding: '6px', borderRadius: '8px' }" @update:open="onLineOpenChange">
          <template #content>
            <div class="line-sub-picker">
              <a-tooltip title="直线" placement="right">
                <a-button type="text" class="shadow-btn-wrapper sub-capsule-btn"
                  :class="{ 'is-active': currentLineType === 'straight' }" @click="selectLineType('straight')">
                  <SIconFont type="icon-kl-line2" :size="18" />
                </a-button>
              </a-tooltip>

              <a-tooltip title="曲线" placement="right">
                <a-button type="text" class="shadow-btn-wrapper sub-capsule-btn"
                  :class="{ 'is-active': currentLineType === 'curve' }" @click="selectLineType('curve')">
                  <SIconFont type="icon-kl-line21" :size="18" />
                </a-button>
              </a-tooltip>

              <a-tooltip title="折线" placement="right">
                <a-button type="text" class="shadow-btn-wrapper sub-capsule-btn"
                  :class="{ 'is-active': currentLineType === 'elbow' }" @click="selectLineType('elbow')">
                  <SIconFont type="icon-kl-line11" :size="18" />
                </a-button>
              </a-tooltip>
            </div>
          </template>

          <a-tooltip :title="linePopoverOpen ? '' : '连线工具'" :open="linePopoverOpen ? false : undefined"
            placement="right">
            <a-button type="text" class="shadow-btn-wrapper"
              :class="{ 'is-active': currentTool === 'line' && !props.activePlacementType }">
              <SIconFont type="icon-kl-line2" :size="20" />
            </a-button>
          </a-tooltip>
        </a-popover>

        <!-- 1.7 思维导图 (Mindmap) -->
        <a-tooltip title="思维导图" placement="right">
          <a-button type="text" class="shadow-btn-wrapper"
            :class="{ 'is-active': props.activePlacementType === 'mindmap' }"
            @pointerdown="(e: PointerEvent) => handleButtonPointerDown(e, startMindmapPlacement)"
            @click="onMindmapButtonClick">
            <SIconFont type="icon-kl-board-mindmap" :size="20" />
          </a-button>
        </a-tooltip>
        <div class="tool-divider" />
        <!-- 1.8 图片插入 (配置了上传接口才开放此入口) -->
        <a-tooltip v-if="hasUploadConfig" title="图片" placement="right">
          <a-button type="text" class="shadow-btn-wrapper" :loading="imageUploading" @click="triggerImageUpload">
            <SIconFont type="icon-kl-image" :size="20" />
          </a-button>
        </a-tooltip>

        <input ref="fileInputRef" type="file" accept="image/*" style="display: none" @change="onFileInputChange" />
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed, inject } from 'vue'
import {
  Popover as APopover,
  Tooltip as ATooltip,
  Button as AButton,
  message,
} from 'ant-design-vue'
import { AppstoreOutlined, PictureOutlined } from '@ant-design/icons-vue'
import { IconFont as SIconFont, SPEED_COMPONENTS_CONFIG_TOKEN } from 'speed-components-ui/components'
import type { Board, ShapeType } from '@speed-board/core'
import { useCellAttributes } from '../composables/useCellAttributes'
import { useBoardEvent } from '../composables/useBoardEvent'
import IconfontPopover from './IconfontPopover.vue'
import ShapePickerPopover from './ShapePickerPopover.vue'
import { renderShapeCanvasSvg, getShapeTightViewBox, type ShapeDefinition } from '../data/shapeLibrary'
import type { BoardIconItem, IconProvider } from '../data/defaultIcons'
import { measureTextWidth, calculateMindmapNodeWidth } from '@speed-board/shared'

export interface BoardUploadConfig {
  /** 单文件上传方法 (FormData)，返回 Promise<any> */
  fileUploadSingle?: (formData: FormData) => Promise<any>
  /** 获取附件预览 URL */
  getPreviewUrl?: (fileId: string) => string
  /** 自定义整套图片上传方法 */
  uploadImage?: (file: File) => Promise<{ id?: string; url: string; width?: number; height?: number; name?: string }>
}

export interface PendingPlacementItem {
  type: 'text' | 'shape' | 'icon' | 'basic' | 'mindmap'
  width: number
  height: number
  textConfig?: Record<string, any>
  shapeConfig?: {
    shapeId: string
    shapeName?: string
    svgContent: string
    viewBox?: string
    fill?: string
    stroke?: string
    strokeWidth?: number
    strokeDasharray?: string
    opacity?: number
    text?: string
  }
  iconConfig?: {
    svg: string
    name?: string
  }
  basicConfig?: {
    shape: string
    text?: string
    fill?: string
    stroke?: string
  }
}

const props = withDefaults(
  defineProps<{
    board: Board | null
    iconProvider?: IconProvider
    uploadConfig?: BoardUploadConfig
    visible?: boolean
    activeMode?: string
    activePlacementType?: 'text' | 'shape' | 'icon' | 'basic' | 'mindmap' | null
  }>(),
  {
    visible: true,
  }
)

watch(
  () => props.activeMode,
  (mode) => {
    if (mode === 'select' || mode === 'brush' || mode === 'vector' || mode === 'line') {
      currentTool.value = mode
      if (mode !== 'brush') brushPopoverOpen.value = false
      if (mode !== 'line') linePopoverOpen.value = false
    }
  }
)

const emit = defineEmits<{
  (
    e: 'mode-change',
    payload: {
      mode: 'select' | 'pencil' | 'marker' | 'eraser' | 'vector' | 'line'
      lineType?: 'elbow' | 'straight' | 'curve'
      color?: string
      width?: number
      opacity?: number
    }
  ): void
  (
    e: 'shape-added',
    payload: {
      shape: string
      node: any
    }
  ): void
  (
    e: 'start-placement',
    payload: PendingPlacementItem
  ): void
  (
    e: 'cancel-placement'
  ): void
}>()

// 基础模式状态
const currentTool = ref<'select' | 'brush' | 'vector' | 'line'>('select')
const currentBrush = ref<'pencil' | 'marker' | 'eraser'>('pencil')
const currentLineType = ref<'elbow' | 'straight' | 'curve'>('straight')

// 弹窗状态受控管理（互斥切换，且点击外部自动收起）
const brushPopoverOpen = ref(false)
const linePopoverOpen = ref(false)
const shapePickerOpen = ref(false)
const iconPickerOpen = ref(false)
const widthPopoverOpen = ref(false)
const colorPopoverOpen = ref(false)

const onBrushOpenChange = (open: boolean) => {
  brushPopoverOpen.value = open
  if (open) {
    linePopoverOpen.value = false
    shapePickerOpen.value = false
    iconPickerOpen.value = false
    setTool('brush')
  }
}

const onLineOpenChange = (open: boolean) => {
  linePopoverOpen.value = open
  if (open) {
    brushPopoverOpen.value = false
    shapePickerOpen.value = false
    iconPickerOpen.value = false
    setTool('line')
  }
}

const onShapeOpenChange = (open: boolean) => {
  shapePickerOpen.value = open
  if (open) {
    brushPopoverOpen.value = false
    linePopoverOpen.value = false
    iconPickerOpen.value = false
  }
}

const onIconPickerOpenChange = (open: boolean) => {
  iconPickerOpen.value = open
  if (open) {
    brushPopoverOpen.value = false
    linePopoverOpen.value = false
    shapePickerOpen.value = false
  }
}

const onWidthOpenChange = (open: boolean) => {
  widthPopoverOpen.value = open
  if (open) {
    colorPopoverOpen.value = false
  }
}

const onColorOpenChange = (open: boolean) => {
  colorPopoverOpen.value = open
  if (open) {
    widthPopoverOpen.value = false
  }
}

// 手绘样式参数
const strokeColor = ref('#333333')
const strokeWidth = ref(3)

const strokeWidthOptions = [
  { label: '细 (2px)', value: 2 },
  { label: '中 (4px)', value: 4 },
  { label: '粗 (8px)', value: 8 },
  { label: '特粗 (14px)', value: 14 },
]

const presetColors = [
  '#333333',
  '#71717a',
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
]

// 应用手绘模式到画板引擎
const applyDrawingMode = () => {
  if (currentTool.value === 'select') {
    props.board?.setDrawingMode('select')
    emit('mode-change', { mode: 'select' })
    return
  }

  if (currentTool.value === 'brush') {
    if (currentBrush.value === 'pencil') {
      const payload = {
        mode: 'pencil' as const,
        color: strokeColor.value,
        width: strokeWidth.value,
        opacity: 1,
      }
      props.board?.setDrawingMode('pencil', payload)
      emit('mode-change', payload)
    } else if (currentBrush.value === 'marker') {
      const payload = {
        mode: 'marker' as const,
        color: strokeColor.value,
        width: Math.max(strokeWidth.value * 3, 12),
        opacity: 0.5,
      }
      props.board?.setDrawingMode('marker', payload)
      emit('mode-change', payload)
    } else if (currentBrush.value === 'eraser') {
      props.board?.setDrawingMode('eraser')
      emit('mode-change', { mode: 'eraser' })
    }
  }
}

// 切换主工具
const setTool = (tool: 'select' | 'brush' | 'vector' | 'line') => {
  currentTool.value = tool
  emit('cancel-placement')
  widthPopoverOpen.value = false
  colorPopoverOpen.value = false
  if (tool !== 'brush') {
    brushPopoverOpen.value = false
  }
  if (tool !== 'line') {
    linePopoverOpen.value = false
  }
  shapePickerOpen.value = false
  iconPickerOpen.value = false
  if (tool === 'brush') {
    applyDrawingMode()
  } else if (tool === 'select') {
    props.board?.setDrawingMode('select')
    emit('mode-change', { mode: 'select' })
  } else if (tool === 'vector') {
    props.board?.setDrawingMode('vector')
    emit('mode-change', { mode: 'vector' })
  } else if (tool === 'line') {
    props.board?.setDrawingMode('select')
    emit('mode-change', {
      mode: 'line',
      lineType: currentLineType.value,
      color: '#374151',
      width: 2,
    })
  }
}

// 切换画笔子工具
const selectBrush = (brush: 'pencil' | 'marker' | 'eraser') => {
  emit('cancel-placement')
  currentBrush.value = brush
  currentTool.value = 'brush'
  widthPopoverOpen.value = false
  colorPopoverOpen.value = false
  applyDrawingMode()
}

// 调整粗细 (选定后立刻关闭弹窗并生效，恢复画笔)
const setStrokeWidth = (w: number) => {
  strokeWidth.value = w
  widthPopoverOpen.value = false
  if (currentBrush.value === 'eraser') {
    currentBrush.value = 'pencil'
  }
  applyDrawingMode()
}

// 调整颜色 (选定后立刻关闭弹窗并生效，恢复画笔)
const setStrokeColor = (c: string) => {
  strokeColor.value = c
  colorPopoverOpen.value = false
  if (currentBrush.value === 'eraser') {
    currentBrush.value = 'pencil'
  }
  applyDrawingMode()
}

// 监听画板实例就绪与绘图模式
watch(
  () => props.board,
  (b) => {
    if (b) {
      applyDrawingMode()
    }
  },
  { immediate: true }
)

// 响应式图元 shapeId 追踪（对齐 editor useAttributes）
const currentSelectedShapeId = useCellAttributes(
  () => props.board,
  'shapeId',
  ''
)

// 当选中有元素时，左侧自动切回 select 指针工具
useBoardEvent(() => props.board, ['cell:selected', 'selection:changed'], () => {
  if (props.board && props.board.graph.getSelectedCells().length > 0) {
    if (currentTool.value !== 'select' && !props.activePlacementType) {
      currentTool.value = 'select'
      props.board.setDrawingMode('select')
    }
  }
})

const addShape = (shape: ShapeType | string, extra: Record<string, any> = {}) => {
  if (!props.board) return
  shapePickerOpen.value = false
  currentTool.value = 'select'
  props.board.setDrawingMode('select')
  emit('mode-change', { mode: 'select' })
  const node = props.board.addShape({
    shape: shape as ShapeType,
    fill: '#ffffff',
    stroke: '#374151',
    ...extra,
  })
  emit('shape-added', { shape: shape as string, node })
}

let justDragged = false

const handleButtonPointerDown = (
  e: PointerEvent,
  startPlacementFn: () => void
) => {
  if (e.button !== 0) return
  const startX = e.clientX
  const startY = e.clientY
  let dragging = false

  const onPointerMove = (ev: PointerEvent) => {
    if (!dragging && Math.hypot(ev.clientX - startX, ev.clientY - startY) > 4) {
      dragging = true
      justDragged = true
      startPlacementFn()
    }
  }

  const onPointerUp = () => {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    if (dragging) {
      setTimeout(() => {
        justDragged = false
      }, 50)
    }
  }

  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

// 文本按钮点击：若已处于文本放置模式则取消，否则触发放置模式 (1:1 语雀白板交互)
const onTextButtonClick = () => {
  if (justDragged) return
  if (props.activePlacementType === 'text') {
    emit('cancel-placement')
    return
  }
  startTextPlacement()
}

const startTextPlacement = () => {
  shapePickerOpen.value = false
  iconPickerOpen.value = false
  brushPopoverOpen.value = false
  linePopoverOpen.value = false
  currentTool.value = 'select'
  const text = '文本'
  const measured = measureTextWidth(text, '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif')
  emit('start-placement', {
    type: 'text',
    width: Math.max(40, measured + 18),
    height: 32,
    textConfig: {
      text,
      fontSize: 14,
      fill: '#262626',
    },
  })
}

// 思维导图按钮点击：触发中心主题放置模式
const onMindmapButtonClick = () => {
  if (justDragged) return
  if (props.activePlacementType === 'mindmap') {
    emit('cancel-placement')
    return
  }
  startMindmapPlacement()
}

const startMindmapPlacement = () => {
  shapePickerOpen.value = false
  iconPickerOpen.value = false
  brushPopoverOpen.value = false
  linePopoverOpen.value = false
  currentTool.value = 'select'
  const initText = '思维导图'
  const initWidth = calculateMindmapNodeWidth(initText, true)
  emit('start-placement', {
    type: 'mindmap',
    width: initWidth,
    height: 42,
    basicConfig: {
      shape: 'rect',
      text: initText,
      fill: '#f3f4f6',
      stroke: '#8b5cf6',
    },
  })
}

// 图形库选择图元：触发跟随鼠标放置虚影 (1:1 语雀白板交互)
const onShapeLibrarySelect = (shape: ShapeDefinition) => {
  shapePickerOpen.value = false
  currentTool.value = 'select'
  props.board?.setDrawingMode('select')
  emit('mode-change', { mode: 'select' })

  // 默认纯白底色填充，经典深灰边框 (1:1 语雀白板规范)
  const fill = '#ffffff'
  const stroke = '#374151'
  const strokeWidth = 2
  const svgContent = renderShapeCanvasSvg(shape, {
    fill,
    stroke,
    strokeWidth,
  })
  const viewBox = getShapeTightViewBox(svgContent, shape.id)

  emit('start-placement', {
    type: 'shape',
    width: 100,
    height: 80,
    shapeConfig: {
      shapeId: shape.id,
      shapeName: shape.name,
      svgContent,
      viewBox,
      fill,
      stroke,
      strokeWidth,
      strokeDasharray: 'none',
      opacity: 1,
      text: '',
    },
  })
}

// 切换连线子类型 (直线 / 曲线 / 折线)
const selectLineType = (type: 'elbow' | 'straight' | 'curve') => {
  emit('cancel-placement')
  currentLineType.value = type
  currentTool.value = 'line'
  widthPopoverOpen.value = false
  colorPopoverOpen.value = false
  shapePickerOpen.value = false
  if (!props.board) return
  props.board.setDrawingMode('select')
  emit('mode-change', {
    mode: 'line',
    lineType: type,
    color: '#374151',
    width: 2,
  })
}
const onSelectLineTool = selectLineType

// 素材库选择图标：触发跟随鼠标放置虚影 (1:1 语雀白板交互)
const onSelectIcon = (icon: BoardIconItem) => {
  iconPickerOpen.value = false
  currentTool.value = 'select'
  props.board?.setDrawingMode('select')
  emit('mode-change', { mode: 'select' })

  const svgContent =
    icon.svg ||
    (icon.url ? `<img src="${icon.url}" width="60" height="60" style="pointer-events:none;"/>` : '')

  emit('start-placement', {
    type: 'icon',
    width: 60,
    height: 60,
    iconConfig: {
      svg: svgContent,
      name: icon.name,
    },
  })
}

// --- 1.8 图片上传与插入 (1:1 语雀交互：视口中心自适应插入) ---
const speedComsConfig = inject<any>(SPEED_COMPONENTS_CONFIG_TOKEN, null)

const hasUploadConfig = computed(() => {
  return Boolean(
    props.uploadConfig?.uploadImage ||
    props.uploadConfig?.fileUploadSingle ||
    speedComsConfig?.value?.apis?.fileUploadSingle
  )
})

const fileInputRef = ref<HTMLInputElement | null>(null)
const imageUploading = ref(false)

const triggerImageUpload = () => {
  if (imageUploading.value) return
  fileInputRef.value?.click()
}

const onFileInputChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = '' // 清除以支持重复选择同名文件

  imageUploading.value = true

  // 1. 本地立即创建临时 Blob 预览并测量自然尺寸 (耗时 < 5ms)
  const tempUrl = URL.createObjectURL(file)
  let naturalWidth = 400
  let naturalHeight = 300

  try {
    const img = new Image()
    img.src = tempUrl
    await new Promise((resolve) => {
      img.onload = resolve
      img.onerror = resolve
    })
    naturalWidth = img.naturalWidth || 400
    naturalHeight = img.naturalHeight || 300
  } catch { }

  const maxWidth = 480
  const maxHeight = 360
  let targetWidth = naturalWidth
  let targetHeight = naturalHeight
  if (targetWidth > maxWidth || targetHeight > maxHeight) {
    const scale = Math.min(maxWidth / targetWidth, maxHeight / targetHeight)
    targetWidth = Math.round(targetWidth * scale)
    targetHeight = Math.round(targetHeight * scale)
  }

  // 2. 核心交互升级：不再用全局 message 弹窗打扰！立即在画板视口中心落盘图片图元，并在图元本身呈现上传遮罩
  let imageNode: any = null
  if (props.board) {
    imageNode = props.board.addImage({
      url: tempUrl,
      name: file.name,
      width: targetWidth,
      height: targetHeight,
      status: 'uploading',
    })
    props.board.setDrawingMode('select')
    emit('mode-change', { mode: 'select' })
  }

  // 后台上传执行与重试闭包
  const executeUpload = async () => {
    try {
      if (imageNode && props.board) {
        props.board.updateImageStatus(imageNode, 'uploading', { progress: 30, url: tempUrl })
      }

      let imageUrl = ''
      let imageId = ''

      if (props.uploadConfig?.uploadImage) {
        const res = await props.uploadConfig.uploadImage(file)
        imageUrl = res.url
        imageId = res.id || ''
      } else {
        const uploader =
          props.uploadConfig?.fileUploadSingle ||
          speedComsConfig?.value?.apis?.fileUploadSingle

        if (!uploader) {
          throw new Error('未配置图片上传接口')
        }

        const formData = new FormData()
        formData.append('file', file)

        const res = await uploader(formData)
        const data = res?.data || res
        imageId = data?.id || ''

        const getPreviewUrl =
          props.uploadConfig?.getPreviewUrl ||
          speedComsConfig?.value?.apis?.getPreviewUrl

        if (getPreviewUrl && imageId) {
          imageUrl = getPreviewUrl(imageId)
        } else if (data?.url) {
          imageUrl = data.url
        } else if (imageId) {
          imageUrl = `/api/v1/attachment/public/preview/${imageId}`
        } else {
          throw new Error('上传返回数据缺少有效图片地址')
        }
      }

      // 上传成功：图元就地无缝切换至远端真实图片地址，并自动撤除上传遮罩与进度条，直接显示最终图片
      if (imageNode && props.board) {
        props.board.updateImageStatus(imageNode, 'success', {
          url: imageUrl,
          id: imageId,
          progress: 100,
        })
      }
      try {
        URL.revokeObjectURL(tempUrl)
      } catch {}
    } catch (err: any) {
      console.error('Failed to upload image:', err)
      // 失败：进度变红，右侧显示失败图标，左侧保留占位 logo
      if (imageNode && props.board) {
        props.board.updateImageStatus(imageNode, 'error', {
          errorMessage: err?.message || '图片上传失败',
          retry: executeUpload,
        })
      }
    } finally {
      imageUploading.value = false
    }
  }

  executeUpload()
}
</script>

<style scoped lang="less">
.left-toolbar-wrapper {
  position: absolute;
  left: 16px;
  top: 110px;
  z-index: 100;
  user-select: none;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 8px;
  pointer-events: none; // 让胶囊外部的整个空白区域点击/绘制100%穿透到画布
}

.left-toolbar-capsule {
  flex-direction: column;
  gap: 6px;
  padding: 6px;
  pointer-events: auto; // 仅胶囊自身响应事件
}

/* 语雀风格二级悬浮选择器 (画笔 & 连线工具) */
.brush-sub-picker,
.line-sub-picker {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sub-capsule-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--ant-border-radius, 6px);
  color: var(--ant-color-text, rgba(0, 0, 0, 0.88));

  &:hover {
    background-color: var(--ant-color-fill-secondary, rgba(0, 0, 0, 0.06));
    color: var(--ant-color-primary, #1677ff);
  }

  &.is-active {
    background-color: var(--ant-color-fill-secondary, rgba(0, 0, 0, 0.08)) !important;
    color: var(--ant-color-primary, #1677ff) !important;
  }
}

.active-color-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15);
  display: inline-block;
}

.color-picker-palette {
  display: grid;
  grid-template-columns: repeat(4, 24px);
  gap: 8px;
  padding: 4px;
}

.color-dot-choice {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: transform 0.15s, border-color 0.15s;

  &:hover {
    transform: scale(1.15);
  }

  &.is-active {
    border-color: var(--ant-color-primary, #1677ff);
    box-shadow: 0 0 0 1px #ffffff;
  }
}

.width-picker-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 110px;
}

.width-picker-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;

  &:hover {
    background-color: var(--ant-color-fill-secondary, rgba(0, 0, 0, 0.06));
  }

  &.is-active {
    background-color: var(--ant-color-primary-bg, #e6f4ff);
    color: var(--ant-color-primary, #1677ff);
  }

  .width-line-preview {
    width: 24px;
    background-color: currentColor;
    border-radius: 2px;
  }
}

.iconfont-entry-btn {
  position: relative;

  .icon-sub-tag {
    position: absolute;
    bottom: 2px;
    right: 2px;
    font-size: 8px;
    font-weight: 700;
    line-height: 1;
    color: var(--ant-color-primary, #1677ff);
    transform: scale(0.65);
  }
}

.tool-divider {
  height: 1px;
  background-color: var(--ant-color-border-secondary, #f0f0f0);
  margin: 2px 4px;
}

/* 折叠/展开平移动画 */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(-40px);
  opacity: 0;
}
</style>
