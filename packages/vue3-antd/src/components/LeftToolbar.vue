<template>
  <div class="left-toolbar-wrapper">
    <div class="left-toolbar-capsule">
      <!-- 1. Iconfont 矢量素材库 (Popover) -->
      <a-popover
        trigger="click"
        placement="rightTop"
        :overlay-inner-style="{ padding: '0' }"
      >
        <template #content>
          <IconfontPopover :provider="props.iconProvider" @select="onSelectIcon" />
        </template>
        <button class="tool-btn" title="Iconfont 矢量素材">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          <span class="icon-sub-tag">icon</span>
        </button>
      </a-popover>

      <!-- 2. 基础图形 (矩形/圆形/菱形 下拉) -->
      <a-popover
        trigger="click"
        placement="rightTop"
        :overlay-inner-style="{ padding: '8px' }"
      >
        <template #content>
          <div class="shapes-picker">
            <button class="shape-pick-btn" title="矩形" @click="addShape('rect')">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="5" width="18" height="14" rx="2"/>
              </svg>
              <span>矩形</span>
            </button>
            <button class="shape-pick-btn" title="圆形" @click="addShape('circle')">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="9"/>
              </svg>
              <span>圆形</span>
            </button>
            <button class="shape-pick-btn" title="菱形" @click="addShape('diamond')">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 3 21 12 12 21 3 12"/>
              </svg>
              <span>菱形</span>
            </button>
          </div>
        </template>
        <button class="tool-btn" title="基础图形">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="3"/>
          </svg>
        </button>
      </a-popover>

      <div class="tool-divider" />

      <!-- 3. 选择箭头 (Select) -->
      <button
        class="tool-btn"
        :class="{ active: currentTool === 'select' }"
        title="选择指针 (V)"
        @click="setTool('select')"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m3 3 7 18 3-7 7-3L3 3z"/>
        </svg>
      </button>

      <!-- 4. 抓手平移 (Hand / Pan) -->
      <button
        class="tool-btn"
        :class="{ active: currentTool === 'hand' }"
        title="抓手拖映画布 (H)"
        @click="setTool('hand')"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/>
          <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/>
          <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/>
          <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
        </svg>
      </button>

      <!-- 5. 文本 (Text - 'T') -->
      <button class="tool-btn" title="插入文本 (T)" @click="addShape('text')">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="4 7 4 4 20 4 20 7"/>
          <line x1="9" x2="15" y1="20" y2="20"/>
          <line x1="12" x2="12" y1="4" y2="20"/>
        </svg>
      </button>

      <!-- 6. 便签 (Sticky Note) -->
      <button class="tool-btn" title="便签贴纸" @click="addShape('sticky')">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/>
          <path d="M15 3v6h6"/>
        </svg>
      </button>

      <!-- 7. 连线箭头 (Arrow / Edge) -->
      <button class="tool-btn" title="连线箭头" @click="addShape('rect', { text: '连接节点' })">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="19" x2="19" y2="5"/>
          <polyline points="12 5 19 5 19 12"/>
        </svg>
      </button>

      <!-- 8. 思维导图 (Mindmap 预留入口) -->
      <button class="tool-btn" title="思维导图 (Tree)" @click="addShape('rect', { text: '中心主题', fill: '#ede9fe', stroke: '#8b5cf6' })">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="10" width="6" height="4" rx="1"/>
          <rect x="15" y="4" width="6" height="4" rx="1"/>
          <rect x="15" y="16" width="6" height="4" rx="1"/>
          <path d="M9 12h3a2 2 0 0 0 2-2V6a2 2 0 0 1 2-2h-1"/>
          <path d="M12 12a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h-1"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Popover as APopover } from 'ant-design-vue'
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

<style scoped>
.left-toolbar-wrapper {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
  user-select: none;
}

.left-toolbar-capsule {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 6px;
  gap: 4px;
  border: 1px solid #e2e8f0;
}

.tool-btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}

.tool-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.tool-btn.active {
  background: #eff6ff;
  color: #2563eb;
}

.icon-sub-tag {
  position: absolute;
  bottom: 2px;
  right: 2px;
  font-size: 8px;
  font-weight: 700;
  color: #0284c7;
  transform: scale(0.75);
}

.tool-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 2px 4px;
}

.shapes-picker {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 90px;
}

.shape-pick-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #334155;
  transition: background 0.15s;
}

.shape-pick-btn:hover {
  background: #f1f5f9;
  color: #0284c7;
}
</style>
