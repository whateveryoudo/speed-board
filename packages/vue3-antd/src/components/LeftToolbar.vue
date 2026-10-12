<template>
  <transition name="slide-fade">
    <div v-show="props.visible !== false" class="left-toolbar-wrapper">
      <div class="board-floating-capsule left-toolbar-capsule">
        <!-- 1. 选择指针 (Select - 'V') -->
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

        <!-- 2. 自由手绘与画笔组 (铅笔 / 马克笔 / 画笔 / 橡皮擦) -->
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
                :class="{ 'is-active': currentBrush === 'pencil' }"
                @click="selectBrush('pencil')"
              >
                <SIconFont type="icon-kl-board-pencil" :size="18" />
                <span>普通铅笔</span>
              </a-button>
              <a-button
                type="text"
                class="dropdown-pick-btn"
                :class="{ 'is-active': currentBrush === 'marker' }"
                @click="selectBrush('marker')"
              >
                <SIconFont type="icon-kl-board-marker-pen" :size="18" />
                <span>马克笔</span>
              </a-button>
              <a-button
                type="text"
                class="dropdown-pick-btn"
                :class="{ 'is-active': currentBrush === 'brush' }"
                @click="selectBrush('brush')"
              >
                <SIconFont type="icon-kl-board-brush" :size="18" />
                <span>水彩画笔</span>
              </a-button>
              <div class="dropdown-divider" />
              <a-button
                type="text"
                class="dropdown-pick-btn"
                :class="{ 'is-active': currentBrush === 'eraser' }"
                @click="selectBrush('eraser')"
              >
                <SIconFont type="icon-kl-board-eraser" :size="18" />
                <span>橡皮擦</span>
              </a-button>
            </div>
          </template>
          <a-tooltip title="画笔工具" placement="right">
            <a-button
              type="text"
              class="shadow-btn-wrapper"
              :class="{ 'is-active': currentTool === 'brush' }"
            >
              <SIconFont :type="activeBrushIcon" :size="20" />
            </a-button>
          </a-tooltip>
        </a-popover>

        <!-- 3. 基础图形 (矩形 / 圆形 / 菱形 / 三角形 / 圆角矩形 下拉) -->
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
              <SIconFont type="icon-kl-board-shape-rect" :size="20" />
            </a-button>
          </a-tooltip>
        </a-popover>

        <!-- 4. 插入文本 (Text - 'T') -->
        <a-tooltip title="插入文本 (T)" placement="right">
          <a-button
            type="text"
            class="shadow-btn-wrapper"
            @click="addShape('text')"
          >
            <SIconFont type="icon-kl-board-text-edit" :size="20" />
          </a-button>
        </a-tooltip>

        <!-- 5. 连线箭头 (直线 / 箭头 / 折线 / 曲线) -->
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

        <!-- 6. 思维导图 (Mindmap) -->
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

        <!-- 7. Iconfont 矢量素材库 (Popover) -->
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
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
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

const currentTool = ref<'select' | 'hand' | 'brush'>('select')
const currentBrush = ref<'pencil' | 'marker' | 'brush' | 'eraser'>('marker')

const activeBrushIcon = computed(() => {
  switch (currentBrush.value) {
    case 'pencil':
      return 'icon-kl-board-pencil'
    case 'marker':
      return 'icon-kl-board-marker-pen'
    case 'brush':
      return 'icon-kl-board-brush'
    case 'eraser':
      return 'icon-kl-board-eraser'
    default:
      return 'icon-kl-board-marker-pen'
  }
})

const setTool = (tool: 'select' | 'hand' | 'brush') => {
  currentTool.value = tool
  if (!props.board) return
  if (tool === 'hand') {
    props.board.graph.enablePanning()
  } else {
    props.board.graph.enablePanning()
  }
}

const selectBrush = (brush: 'pencil' | 'marker' | 'brush' | 'eraser') => {
  currentBrush.value = brush
  currentTool.value = 'brush'
}

const addShape = (shape: ShapeType | string, extra: Record<string, any> = {}) => {
  if (!props.board) return
  props.board.addShape({
    shape: shape as ShapeType,
    ...extra,
  })
}

const onSelectIcon = (icon: BoardIconItem) => {
  if (!props.board) return
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
}

.left-toolbar-capsule {
  flex-direction: column;
  gap: 6px;
  padding: 6px;
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

.dropdown-divider {
  height: 1px;
  background-color: var(--ant-color-border-secondary, #f0f0f0);
  margin: 4px 0;
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
