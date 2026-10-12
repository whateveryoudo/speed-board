<template>
  <transition name="slide-fade">
    <div v-show="props.visible !== false" class="left-toolbar-wrapper">
      <!-- 1. 主工具条悬浮胶囊 -->
      <div class="board-floating-capsule left-toolbar-capsule">
        <!-- 1.1 选择指针 (Select - 'V') -->
        <a-tooltip title="选择指针 (V)" placement="right">
          <a-button
            type="text"
            class="shadow-btn-wrapper"
            :class="{ 'is-active': currentTool === 'select' }"
            @click="setTool('select')"
          >
            <SIconFont type="icon-kl-board-select-cursor" :size="20" />
          </a-button>
        </a-tooltip>

        <!-- 1.2 画笔/随手画 (激活时右侧弹出画笔配置胶囊) -->
        <a-tooltip title="画笔/随手画" placement="right">
          <a-button
            type="text"
            class="shadow-btn-wrapper"
            :class="{ 'is-active': currentTool === 'brush' }"
            @click="setTool('brush')"
          >
            <SIconFont type="icon-kl-board-brush" :size="20" />
          </a-button>
        </a-tooltip>

        <!-- 1.3 矢量钢笔绘图 -->
        <a-tooltip title="矢量钢笔" placement="right">
          <a-button
            type="text"
            class="shadow-btn-wrapper"
            :class="{ 'is-active': currentTool === 'vector' }"
            @click="setTool('vector')"
          >
            <SIconFont type="icon-kl-board-vector-drawing" :size="20" />
          </a-button>
        </a-tooltip>

        <!-- 1.4 插入文本 (Text - 'T') -->
        <a-tooltip title="插入文本 (T)" placement="right">
          <a-button
            type="text"
            class="shadow-btn-wrapper"
            @click="addShape('text')"
          >
            <SIconFont type="icon-kl-board-text-edit" :size="20" />
          </a-button>
        </a-tooltip>

        <!-- 1.5 闭合图形/基础图形 (矩形 / 圆形 / 菱形 / 三角形 / 圆角矩形 下拉) -->
        <a-popover
          trigger="click"
          placement="rightTop"
          :overlay-inner-style="{ padding: '6px', borderRadius: '8px' }"
        >
          <template #content>
            <div class="tool-dropdown-picker">
              <a-button
                type="text"
                class="dropdown-pick-btn"
                @click="addShape('rect')"
              >
                <SIconFont type="icon-kl-board-shape-rect" :size="18" />
                <span>矩形</span>
              </a-button>
              <a-button
                type="text"
                class="dropdown-pick-btn"
                @click="addShape('circle')"
              >
                <SIconFont type="icon-kl-board-shape-circle" :size="18" />
                <span>圆形</span>
              </a-button>
              <a-button
                type="text"
                class="dropdown-pick-btn"
                @click="addShape('diamond')"
              >
                <SIconFont type="icon-kl-board-shape-diamond" :size="18" />
                <span>菱形</span>
              </a-button>
              <a-button
                type="text"
                class="dropdown-pick-btn"
                @click="addShape('triangle')"
              >
                <SIconFont type="icon-kl-board-shape-triangle" :size="18" />
                <span>三角形</span>
              </a-button>
              <a-button
                type="text"
                class="dropdown-pick-btn"
                @click="addShape('rect', { rx: 8, ry: 8 })"
              >
                <SIconFont type="icon-kl-board-shape-round-rect" :size="18" />
                <span>圆角矩形</span>
              </a-button>
            </div>
          </template>
          <a-tooltip title="基础图形" placement="right">
            <a-button type="text" class="shadow-btn-wrapper">
              <SIconFont type="icon-kl-board-closed-shape" :size="20" />
            </a-button>
          </a-tooltip>
        </a-popover>

        <!-- 1.6 连线箭头 (直线 / 箭头 / 折线 / 曲线) -->
        <a-popover
          trigger="click"
          placement="rightTop"
          :overlay-inner-style="{ padding: '6px', borderRadius: '8px' }"
        >
          <template #content>
            <div class="tool-dropdown-picker">
              <a-button
                type="text"
                class="dropdown-pick-btn"
                @click="addShape('rect', { text: '连接点', shapeType: 'arrow' })"
              >
                <SIconFont type="icon-kl-board-line-arrow" :size="18" />
                <span>箭头连线</span>
              </a-button>
              <a-button
                type="text"
                class="dropdown-pick-btn"
                @click="addShape('rect', { text: '直连线', shapeType: 'straight' })"
              >
                <SIconFont type="icon-kl-board-line-straight" :size="18" />
                <span>直线</span>
              </a-button>
              <a-button
                type="text"
                class="dropdown-pick-btn"
                @click="addShape('rect', { text: '折线', shapeType: 'elbow' })"
              >
                <SIconFont type="icon-kl-board-line-elbow" :size="18" />
                <span>折线</span>
              </a-button>
              <a-button
                type="text"
                class="dropdown-pick-btn"
                @click="addShape('rect', { text: '曲线', shapeType: 'curve' })"
              >
                <SIconFont type="icon-kl-board-line-curve" :size="18" />
                <span>曲线</span>
              </a-button>
            </div>
          </template>
          <a-tooltip title="连线工具" placement="right">
            <a-button type="text" class="shadow-btn-wrapper">
              <SIconFont type="icon-kl-board-line-arrow" :size="20" />
            </a-button>
          </a-tooltip>
        </a-popover>

        <!-- 1.7 思维导图 (Mindmap) -->
        <a-tooltip title="思维导图" placement="right">
          <a-button
            type="text"
            class="shadow-btn-wrapper"
            @click="addShape('rect', { text: '中心主题', fill: '#ede9fe', stroke: '#8b5cf6' })"
          >
            <SIconFont type="icon-kl-board-mindmap" :size="20" />
          </a-button>
        </a-tooltip>

        <div class="tool-divider" />

        <!-- 1.8 Iconfont 矢量素材库 (Popover) -->
        <a-popover
          trigger="click"
          placement="rightTop"
          :overlay-inner-style="{ padding: '0', borderRadius: '8px' }"
        >
          <template #content>
            <IconfontPopover :provider="props.iconProvider" @select="onSelectIcon" />
          </template>
          <a-tooltip title="素材库" placement="right">
            <a-button type="text" class="shadow-btn-wrapper iconfont-entry-btn">
              <AppstoreOutlined style="font-size: 20px" />
              <span class="icon-sub-tag">素材</span>
            </a-button>
          </a-tooltip>
        </a-popover>
      </div>

      <!-- 2. 画笔专用二级悬浮胶囊 (1:1 语雀白板风格) -->
      <transition name="sub-capsule-fade">
        <div
          v-if="currentTool === 'brush'"
          class="board-floating-capsule brush-sub-capsule"
        >
          <!-- 2.1 普通铅笔 -->
          <a-tooltip title="铅笔" placement="top">
            <a-button
              type="text"
              class="shadow-btn-wrapper sub-capsule-btn"
              :class="{ 'is-active': currentBrush === 'pencil' }"
              @click="selectBrush('pencil')"
            >
              <SIconFont type="icon-kl-board-pencil" :size="19" />
            </a-button>
          </a-tooltip>

          <!-- 2.2 马克笔 / 荧光笔 -->
          <a-tooltip title="马克笔" placement="top">
            <a-button
              type="text"
              class="shadow-btn-wrapper sub-capsule-btn"
              :class="{ 'is-active': currentBrush === 'marker' }"
              @click="selectBrush('marker')"
            >
              <SIconFont type="icon-kl-board-marker-pen" :size="19" />
            </a-button>
          </a-tooltip>

          <!-- 2.3 橡皮擦 -->
          <a-tooltip title="橡皮擦" placement="top">
            <a-button
              type="text"
              class="shadow-btn-wrapper sub-capsule-btn"
              :class="{ 'is-active': currentBrush === 'eraser' }"
              @click="selectBrush('eraser')"
            >
              <SIconFont type="icon-kl-board-eraser" :size="19" />
            </a-button>
          </a-tooltip>

          <!-- 2.4 线条粗细 (波浪线图标 + 粗细弹窗) -->
          <a-popover
            trigger="click"
            placement="right"
            :overlay-inner-style="{ padding: '8px', borderRadius: '8px' }"
          >
            <template #content>
              <div class="width-picker-panel">
                <div
                  v-for="w in strokeWidthOptions"
                  :key="w.value"
                  class="width-picker-item"
                  :class="{ 'is-active': strokeWidth === w.value }"
                  @click="setStrokeWidth(w.value)"
                >
                  <div class="width-line-preview" :style="{ height: `${Math.min(w.value, 8)}px` }" />
                  <span class="width-label">{{ w.label }}</span>
                </div>
              </div>
            </template>
            <a-tooltip title="粗细" placement="top">
              <a-button type="text" class="shadow-btn-wrapper sub-capsule-btn">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M4 16c2-4 5-6 8-3s6 6 8 1" />
                </svg>
              </a-button>
            </a-tooltip>
          </a-popover>

          <!-- 2.5 颜色选择器 (圆点色块 + 调色板弹窗) -->
          <a-popover
            trigger="click"
            placement="right"
            :overlay-inner-style="{ padding: '8px', borderRadius: '8px' }"
          >
            <template #content>
              <div class="color-picker-palette">
                <div
                  v-for="color in presetColors"
                  :key="color"
                  class="color-dot-choice"
                  :class="{ 'is-active': strokeColor === color }"
                  :style="{ backgroundColor: color }"
                  @click="setStrokeColor(color)"
                />
              </div>
            </template>
            <a-tooltip title="颜色" placement="top">
              <a-button type="text" class="shadow-btn-wrapper sub-capsule-btn">
                <span
                  class="active-color-dot"
                  :style="{ backgroundColor: strokeColor }"
                />
              </a-button>
            </a-tooltip>
          </a-popover>
        </div>
      </transition>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import {
  Popover as APopover,
  Tooltip as ATooltip,
  Button as AButton,
} from 'ant-design-vue'
import { AppstoreOutlined } from '@ant-design/icons-vue'
import { IconFont as SIconFont } from 'speed-components-ui/components'
import type { Board, ShapeType } from '@speed-board/core'
import IconfontPopover from './IconfontPopover.vue'
import type { BoardIconItem, IconProvider } from '../data/defaultIcons'

const props = withDefaults(
  defineProps<{
    board: Board | null
    iconProvider?: IconProvider
    visible?: boolean
  }>(),
  {
    visible: true,
  }
)

// 基础模式状态
const currentTool = ref<'select' | 'brush' | 'vector'>('select')
const currentBrush = ref<'pencil' | 'marker' | 'eraser'>('pencil')

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
  if (!props.board) return

  if (currentTool.value === 'select') {
    props.board.setDrawingMode('select')
    return
  }

  if (currentTool.value === 'brush') {
    if (currentBrush.value === 'pencil') {
      props.board.setDrawingMode('pencil', {
        color: strokeColor.value,
        width: strokeWidth.value,
        opacity: 1,
      })
    } else if (currentBrush.value === 'marker') {
      props.board.setDrawingMode('marker', {
        color: strokeColor.value,
        width: Math.max(strokeWidth.value * 3, 12),
        opacity: 0.5,
      })
    } else if (currentBrush.value === 'eraser') {
      props.board.setDrawingMode('eraser')
    }
  }
}

// 切换主工具
const setTool = (tool: 'select' | 'brush' | 'vector') => {
  currentTool.value = tool
  if (tool === 'brush') {
    applyDrawingMode()
  } else if (tool === 'select') {
    props.board?.setDrawingMode('select')
  } else if (tool === 'vector') {
    props.board?.setDrawingMode('select')
    // 矢量绘图可添加直线指引
    addShape('rect', { text: '矢量节点', shapeType: 'straight' })
  }
}

// 切换画笔子工具
const selectBrush = (brush: 'pencil' | 'marker' | 'eraser') => {
  currentBrush.value = brush
  currentTool.value = 'brush'
  applyDrawingMode()
}

// 调整粗细
const setStrokeWidth = (w: number) => {
  strokeWidth.value = w
  applyDrawingMode()
}

// 调整颜色
const setStrokeColor = (c: string) => {
  strokeColor.value = c
  applyDrawingMode()
}

// 监听画板实例就绪
watch(
  () => props.board,
  (b) => {
    if (b) {
      applyDrawingMode()
    }
  },
  { immediate: true }
)

const addShape = (shape: ShapeType | string, extra: Record<string, any> = {}) => {
  if (!props.board) return
  currentTool.value = 'select'
  props.board.setDrawingMode('select')
  props.board.addShape({
    shape: shape as ShapeType,
    ...extra,
  })
}

const onSelectIcon = (icon: BoardIconItem) => {
  if (!props.board) return
  currentTool.value = 'select'
  props.board.setDrawingMode('select')
  const svgContent =
    icon.svg ||
    (icon.url ? `<img src="${icon.url}" width="60" height="60" style="pointer-events:none;"/>` : '')
  props.board.addSvgIcon({
    svg: svgContent,
    name: icon.name,
    width: 60,
    height: 60,
  })
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
}

.left-toolbar-capsule {
  flex-direction: column;
  gap: 6px;
  padding: 6px;
}

/* 语雀风格画笔二级悬浮胶囊 */
.brush-sub-capsule {
  flex-direction: column;
  gap: 6px;
  padding: 6px;
  animation: subCapsuleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.sub-capsule-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--ant-border-radius, 6px);

  &.is-active {
    background-color: var(--ant-color-fill-secondary, rgba(0, 0, 0, 0.08)) !important;
    color: var(--ant-color-text, rgba(0, 0, 0, 0.88));
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

.tool-dropdown-picker {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 110px;
}

.dropdown-pick-btn {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  height: 32px;
  padding: 4px 8px;
  font-size: 13px;
  color: var(--ant-color-text, rgba(0, 0, 0, 0.88));
  border-radius: var(--ant-border-radius, 6px);

  &:hover {
    background-color: var(--ant-color-fill-secondary, rgba(0, 0, 0, 0.06));
    color: var(--ant-color-primary, #1677ff);
  }

  &.is-active {
    background-color: var(--ant-color-primary-bg, #e6f4ff);
    color: var(--ant-color-primary, #1677ff);
  }
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

.sub-capsule-fade-enter-active,
.sub-capsule-fade-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.sub-capsule-fade-enter-from,
.sub-capsule-fade-leave-to {
  transform: translateX(-10px);
  opacity: 0;
}

@keyframes subCapsuleIn {
  from {
    transform: translateX(-10px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
