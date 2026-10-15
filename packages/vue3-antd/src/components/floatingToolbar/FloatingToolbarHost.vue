<template>
  <div
    v-show="visible"
    ref="toolbarRef"
    class="floating-bubble-toolbar"
    @mousedown.stop
    @pointerdown.stop
  >
    <div class="bubble-toolbar-inner">
      <template v-for="(item, idx) in activeSchema.quickToolbar" :key="item">
        <!-- 分隔线 (当属于不同功能块或在 open-panel 之前时展示) -->
        <div
          v-if="shouldShowDivider(item, idx)"
          class="toolbar-divider"
        />

        <!-- 1. 图形切换 (19个基础图形) -->
        <ShapeSwitchItem
          v-if="item === 'shape-switch'"
          :board="props.board"
        />

        <!-- 2. 填充颜色 -->
        <FillColorItem
          v-else-if="item === 'fill'"
          :board="props.board"
        />

        <!-- 3. 边框/描边 -->
        <StrokeItem
          v-else-if="item === 'stroke'"
          :board="props.board"
        />

        <!-- 4. 文本排版气泡 -->
        <TextFormatItem
          v-else-if="item === 'text'"
          :board="props.board"
        />

        <!-- 5. 链接 -->
        <LinkItem
          v-else-if="item === 'link'"
          @open-link="emit('open-link-overlay')"
        />

        <!-- 6. 不透明度 (图片等) -->
        <OpacityItem
          v-else-if="item === 'opacity'"
          :board="props.board"
        />

        <!-- 7. 线型 (折线/直线/曲线) -->
        <LineTypeItem
          v-else-if="item === 'line-type'"
          :board="props.board"
        />

        <!-- 8. 线条反向 (⇄) -->
        <LineReverseItem
          v-else-if="item === 'line-reverse'"
          :board="props.board"
        />

        <!-- 9. 端点箭头 -->
        <LineArrowItem
          v-else-if="item === 'arrow-head'"
          :board="props.board"
        />

        <!-- 10. 线条文字 -->
        <LineTextItem
          v-else-if="item === 'line-text'"
          :board="props.board"
        />

        <!-- 11. 独立字号 (纯文本节点) -->
        <FontSizeItem
          v-else-if="item === 'font-size'"
          :board="props.board"
        />

        <!-- 12. 独立文本颜色 (纯文本节点) -->
        <TextColorItem
          v-else-if="item === 'text-color'"
          :board="props.board"
        />

        <!-- 13. 水平对齐 -->
        <AlignItem
          v-else-if="item === 'align-h'"
          :board="props.board"
          mode="horizontal"
        />

        <!-- 14. 垂直对齐 -->
        <AlignItem
          v-else-if="item === 'align-v'"
          :board="props.board"
          mode="vertical"
        />

        <!-- 15. 粗体切换 -->
        <BoldItem
          v-else-if="item === 'bold'"
          :board="props.board"
        />

        <!-- 16. 打开/聚焦右侧深度设置面板 (🎛) -->
        <OpenPanelItem
          v-else-if="item === 'open-panel'"
          @click="emit('open-panel')"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  computePosition,
  autoUpdate,
  offset,
  flip,
  shift,
  type VirtualElement,
} from '@floating-ui/dom'
import {
  ExclamationCircleFilled,
  ReloadOutlined,
  DeleteOutlined,
  LoadingOutlined,
} from '@ant-design/icons-vue'
import type { Board } from '@speed-board/core'
import { getNodeSchema, type NodeSchema } from '../../schema/nodeSchema'
import ShapeSwitchItem from './items/ShapeSwitchItem.vue'
import FillColorItem from './items/FillColorItem.vue'
import StrokeItem from './items/StrokeItem.vue'
import TextFormatItem from './items/TextFormatItem.vue'
import LinkItem from './items/LinkItem.vue'
import OpacityItem from './items/OpacityItem.vue'
import LineTypeItem from './items/LineTypeItem.vue'
import LineReverseItem from './items/LineReverseItem.vue'
import LineArrowItem from './items/LineArrowItem.vue'
import LineTextItem from './items/LineTextItem.vue'
import FontSizeItem from './items/FontSizeItem.vue'
import TextColorItem from './items/TextColorItem.vue'
import AlignItem from './items/AlignItem.vue'
import BoldItem from './items/BoldItem.vue'
import OpenPanelItem from './items/OpenPanelItem.vue'

const props = defineProps<{
  board: Board | null
  containerEl?: HTMLElement | null
}>()

const emit = defineEmits<{
  (e: 'open-panel'): void
  (e: 'open-link-overlay'): void
}>()

const toolbarRef = ref<HTMLElement | null>(null)
const visible = ref(false)
const currentType = ref('shape')
const selectedCellData = ref<any>(null)

const updateSelectedData = () => {
  const cells = props.board?.graph.getSelectedCells() || []
  if (cells.length === 1) {
    selectedCellData.value = cells[0].getData() || {}
  } else {
    selectedCellData.value = null
  }
}

const currentImageStatus = computed<'uploading' | 'error' | 'success' | null>(() => {
  if (currentType.value !== 'image') return null
  return selectedCellData.value?.status || 'success'
})

const handleImageRetry = () => {
  const cells = props.board?.graph.getSelectedCells() || []
  if (cells.length === 1) {
    const data = cells[0].getData()
    if (typeof data?.retry === 'function') {
      data.retry()
    }
  }
}

const handleImageDelete = () => {
  props.board?.deleteSelected()
}

const activeSchema = computed<NodeSchema>(() => {
  return getNodeSchema(currentType.value)
})

const shouldShowDivider = (item: string, idx: number) => {
  if (idx === 0) return false
  if (item === 'open-panel') return true
  if (item === 'link' || item === 'text') return true
  return false
}

// 基于 @floating-ui/dom 构建 VirtualElement
const virtualElement: VirtualElement = {
  getBoundingClientRect() {
    const cells = props.board?.graph.getSelectedCells() || []
    if (cells.length === 0) {
      return { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 }
    }

    if (cells.length === 1) {
      const view = props.board?.graph.findViewByCell(cells[0])
      if (view?.container) {
        return view.container.getBoundingClientRect()
      }
    }

    // 多选组合或兜底计算
    const graph = props.board?.graph
    if (!graph) return { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 }
    const bbox = graph.getCellsBBox(cells)
    if (!bbox) return { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 }

    const p1 = graph.localToClient(bbox.x, bbox.y)
    const p2 = graph.localToClient(bbox.x + bbox.width, bbox.y + bbox.height)
    return {
      x: p1.x,
      y: p1.y,
      top: p1.y,
      left: p1.x,
      width: p2.x - p1.x,
      height: p2.y - p1.y,
      right: p2.x,
      bottom: p2.y,
    }
  },
}

let cleanupAutoUpdate: (() => void) | null = null
const isInteracting = ref(false)

const updatePosition = async () => {
  const el = toolbarRef.value
  if (!el || !props.board) return

  if (isInteracting.value) {
    visible.value = false
    return
  }

  const cells = props.board.graph.getSelectedCells()
  if (cells.length === 0) {
    visible.value = false
    teardownAutoUpdate()
    return
  }

  // 1. 推断图元类型
  if (cells.length > 1) {
    currentType.value = 'multiple'
  } else {
    const cell = cells[0]
    if (cell.isEdge()) {
      currentType.value = 'line'
    } else if (cell.shape === 'speed-image-node') {
      currentType.value = 'image'
      // 🌟 图片上传中或失败时，完全不展示上方悬浮条 (不在上面飞)
      const data = cell.getData()
      if (data?.status && data.status !== 'success') {
        visible.value = false
        teardownAutoUpdate()
        return
      }
    } else if (cell.shape === 'speed-vector-polygon') {
      currentType.value = 'vector'
    } else if (props.board.isTextNode(cell)) {
      currentType.value = 'text'
    } else {
      currentType.value = 'shape'
    }
  }

  visible.value = true

  // 2. 利用 floating-ui 精确计算屏幕坐标 (支持自动翻转 flip 与边界偏移 shift)
  const boundary = props.containerEl || undefined
  const { x, y } = await computePosition(virtualElement, el, {
    placement: 'top',
    strategy: 'fixed',
    middleware: [
      offset(12),
      flip({
        boundary,
        fallbackPlacements: ['bottom', 'top'],
      }),
      shift({
        boundary,
        padding: 12,
      }),
    ],
  })

  el.style.left = `${Math.round(x)}px`
  el.style.top = `${Math.round(y)}px`
}

const teardownAutoUpdate = () => {
  if (cleanupAutoUpdate) {
    cleanupAutoUpdate()
    cleanupAutoUpdate = null
  }
}

const setupAutoUpdate = () => {
  teardownAutoUpdate()
  if (toolbarRef.value) {
    cleanupAutoUpdate = autoUpdate(virtualElement, toolbarRef.value, updatePosition, {
      animationFrame: true, // 🌟 逐帧自适应跟随画布平移、滚轮缩放与节点拖拽
    })
  }
}

let cleanupEvents: (() => void) | null = null

const bindEvents = (board: Board) => {
  if (cleanupEvents) {
    cleanupEvents()
    cleanupEvents = null
  }

  const graph = board.graph

  const onSelectionChange = () => {
    updateSelectedData()
    nextTick(() => {
      const hasSelected = graph.getSelectedCells().length > 0
      if (hasSelected) {
        setupAutoUpdate()
        updatePosition()
      } else {
        visible.value = false
        teardownAutoUpdate()
      }
    })
  }

  const onCellChange = () => {
    updateSelectedData()
    if (visible.value) {
      updatePosition()
    }
  }

  const onDragStart = () => {
    isInteracting.value = true
    visible.value = false
  }

  const onDragEnd = () => {
    if (isInteracting.value) {
      isInteracting.value = false
      nextTick(() => {
        updatePosition()
      })
    }
  }

  graph.on('cell:selected', onSelectionChange)
  graph.on('cell:unselected', onSelectionChange)
  graph.on('selection:changed', onSelectionChange)
  graph.on('node:change:position', onCellChange)
  graph.on('node:change:size', onCellChange)
  graph.on('node:change:data', onCellChange)
  graph.on('cell:change:data', onCellChange)
  graph.on('edge:change:vertices', onCellChange)
  graph.on('edge:change:source', (args) => {
    if (args?.options?.ui) onDragStart()
    else onCellChange()
  })
  graph.on('edge:change:target', (args) => {
    if (args?.options?.ui) onDragStart()
    else onCellChange()
  })
  graph.on('edge:change:terminal', onCellChange)
  graph.on('node:moving', onDragStart)
  graph.on('node:moved', onDragEnd)
  graph.on('node:resizing', onDragStart)
  graph.on('node:resized', onDragEnd)
  graph.on('scale', onCellChange)
  graph.on('translate', onCellChange)

  window.addEventListener('pointerup', onDragEnd)

  cleanupEvents = () => {
    window.removeEventListener('pointerup', onDragEnd)
    graph.off('cell:selected', onSelectionChange)
    graph.off('cell:unselected', onSelectionChange)
    graph.off('selection:changed', onSelectionChange)
    graph.off('node:change:position', onCellChange)
    graph.off('node:change:size', onCellChange)
    graph.off('node:change:data', onCellChange)
    graph.off('cell:change:data', onCellChange)
    graph.off('edge:change:vertices', onCellChange)
    graph.off('edge:change:source')
    graph.off('edge:change:target')
    graph.off('edge:change:terminal', onCellChange)
    graph.off('node:moving', onDragStart)
    graph.off('node:moved', onDragEnd)
    graph.off('node:resizing', onDragStart)
    graph.off('node:resized', onDragEnd)
    graph.off('scale', onCellChange)
    graph.off('translate', onCellChange)
  }
}

const checkInitialSelection = () => {
  updateSelectedData()
  if (props.board && props.board.graph.getSelectedCells().length > 0) {
    setupAutoUpdate()
    updatePosition()
  }
}

onMounted(() => {
  if (props.board) {
    bindEvents(props.board)
  }
  nextTick(() => {
    checkInitialSelection()
  })
})

watch(
  () => props.board,
  (b) => {
    if (b) {
      bindEvents(b)
      nextTick(() => {
        checkInitialSelection()
      })
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  teardownAutoUpdate()
  if (cleanupEvents) {
    cleanupEvents()
    cleanupEvents = null
  }
})
</script>

<style scoped lang="less">
.floating-bubble-toolbar {
  position: fixed;
  z-index: 990;
  pointer-events: auto;
  user-select: none;
  /* 使用 floating-ui 直接计算 left/top，无需 transform 偏移 */
}

.bubble-toolbar-inner {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  border-radius: 8px;
  padding: 4px 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1), 0 0 1px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.06);
  gap: 2px;
}

.image-status-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 2px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 4px;

  &.error {
    color: #ef4444;
    background: #fef2f2;
  }

  &.uploading {
    color: #2563eb;
    background: #eff6ff;
  }

  .icon {
    margin-right: 4px;
    font-size: 12px;
  }
}

.status-action-btn {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  background: transparent;
  line-height: 1.4;
  transition: all 0.15s ease;

  &.retry {
    color: #2563eb;
    background: #eff6ff;
    border-color: #bfdbfe;

    &:hover {
      background: #dbeafe;
      border-color: #93c5fd;
    }
  }

  &.delete {
    color: #ef4444;
    background: #fef2f2;
    border-color: #fecaca;

    &:hover {
      background: #fee2e2;
      border-color: #fca5a5;
    }
  }

  .icon {
    margin-right: 4px;
    font-size: 12px;
  }
}

.toolbar-divider {
  width: 1px;
  height: 18px;
  background-color: #e5e7eb;
  margin: 0 4px;
}
</style>
