<template>
  <div class="left-toolbar-wrapper">
    <div class="board-floating-capsule left-toolbar-capsule">
      <!-- 1. Iconfont 矢量素材库 (Popover) -->
      <a-popover
        trigger="click"
        placement="rightTop"
        :overlay-inner-style="{ padding: '0', borderRadius: '8px' }"
      >
        <template #content>
          <IconfontPopover :provider="props.iconProvider" @select="onSelectIcon" />
        </template>
        <a-tooltip title="Iconfont 矢量素材库" placement="right">
          <a-button type="text" class="shadow-btn-wrapper iconfont-entry-btn">
            <AppstoreOutlined />
            <span class="icon-sub-tag">ICON</span>
          </a-button>
        </a-tooltip>
      </a-popover>

      <!-- 2. 基础图形 (矩形 / 圆形 / 菱形 下拉) -->
      <a-popover
        trigger="click"
        placement="rightTop"
        :overlay-inner-style="{ padding: '6px', borderRadius: '8px' }"
      >
        <template #content>
          <div class="shapes-picker">
            <a-button
              type="text"
              class="shape-pick-btn"
              @click="addShape('rect')"
            >
              <BorderOutlined class="shape-icon" />
              <span>矩形</span>
            </a-button>
            <a-button
              type="text"
              class="shape-pick-btn"
              @click="addShape('circle')"
            >
              <span class="shape-icon circle-icon" />
              <span>圆形</span>
            </a-button>
            <a-button
              type="text"
              class="shape-pick-btn"
              @click="addShape('diamond')"
            >
              <span class="shape-icon diamond-icon" />
              <span>菱形</span>
            </a-button>
          </div>
        </template>
        <a-tooltip title="基础图形" placement="right">
          <a-button type="text" class="shadow-btn-wrapper">
            <BorderOutlined />
          </a-button>
        </a-tooltip>
      </a-popover>

      <div class="tool-divider" />

      <!-- 3. 选择指针 (Select - 'V') -->
      <a-tooltip title="选择指针 (V)" placement="right">
        <a-button
          type="text"
          class="shadow-btn-wrapper"
          :class="{ 'is-active': currentTool === 'select' }"
          @click="setTool('select')"
        >
          <SelectOutlined />
        </a-button>
      </a-tooltip>

      <!-- 4. 抓手平移画布 (Hand / Pan - 'H') -->
      <a-tooltip title="抓手拖映画布 (H)" placement="right">
        <a-button
          type="text"
          class="shadow-btn-wrapper"
          :class="{ 'is-active': currentTool === 'hand' }"
          @click="setTool('hand')"
        >
          <DragOutlined />
        </a-button>
      </a-tooltip>

      <!-- 5. 插入文本 (Text - 'T') -->
      <a-tooltip title="插入文本 (T)" placement="right">
        <a-button
          type="text"
          class="shadow-btn-wrapper"
          @click="addShape('text')"
        >
          <FontSizeOutlined />
        </a-button>
      </a-tooltip>

      <!-- 6. 便签贴纸 (Sticky Note) -->
      <a-tooltip title="便签贴纸" placement="right">
        <a-button
          type="text"
          class="shadow-btn-wrapper"
          @click="addShape('sticky')"
        >
          <SnippetsOutlined />
        </a-button>
      </a-tooltip>

      <!-- 7. 连线箭头 (Arrow / Edge) -->
      <a-tooltip title="连线箭头" placement="right">
        <a-button
          type="text"
          class="shadow-btn-wrapper"
          @click="addShape('rect', { text: '连接节点' })"
        >
          <ArrowUpOutlined class="arrow-tool-icon" />
        </a-button>
      </a-tooltip>

      <!-- 8. 思维导图 (Mindmap) -->
      <a-tooltip title="思维导图 (Tree)" placement="right">
        <a-button
          type="text"
          class="shadow-btn-wrapper"
          @click="addShape('rect', { text: '中心主题', fill: '#ede9fe', stroke: '#8b5cf6' })"
        >
          <ApartmentOutlined />
        </a-button>
      </a-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  Popover as APopover,
  Tooltip as ATooltip,
  Button as AButton,
} from 'ant-design-vue'
import {
  SelectOutlined,
  DragOutlined,
  BorderOutlined,
  FontSizeOutlined,
  SnippetsOutlined,
  ArrowUpOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
} from '@ant-design/icons-vue'
import { IconFont as SIconFont } from 'speed-components-ui/components'
import type { Board, ShapeType } from '@speed-board/core'
import IconfontPopover from './IconfontPopover.vue'
import type { BoardIconItem, IconProvider } from '../data/defaultIcons'

const props = defineProps<{
  board: Board | null
  iconProvider?: IconProvider
}>()

const currentTool = ref<'select' | 'hand'>('select')

const setTool = (tool: 'select' | 'hand') => {
  currentTool.value = tool
  if (!props.board) return
  if (tool === 'hand') {
    props.board.graph.enablePanning()
  } else {
    props.board.graph.enablePanning()
  }
}

const addShape = (shape: ShapeType, extra: Record<string, any> = {}) => {
  if (!props.board) return
  props.board.addShape({
    shape,
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
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
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
    transform: scale(0.7);
  }
}

.tool-divider {
  height: 1px;
  background-color: var(--ant-color-border-secondary, #f0f0f0);
  margin: 2px 4px;
}

.arrow-tool-icon {
  transform: rotate(45deg);
}

.shapes-picker {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 100px;
}

.shape-pick-btn {
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

    .shape-icon {
      border-color: var(--ant-color-primary, #1677ff);
      color: var(--ant-color-primary, #1677ff);
    }
  }

  .shape-icon {
    font-size: 15px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    flex-shrink: 0;

    &.circle-icon {
      border: 1.5px solid currentColor;
      border-radius: 50%;
      width: 14px;
      height: 14px;
    }

    &.diamond-icon {
      border: 1.5px solid currentColor;
      width: 11px;
      height: 11px;
      transform: rotate(45deg);
    }
  }
}
</style>
