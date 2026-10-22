<template>
  <div
    v-show="visible && props.visible !== false"
    ref="toolbarRef"
    class="floating-bubble-toolbar"
    @mousedown.stop
    @pointerdown.stop
  >
    <div class="bubble-toolbar-inner">
      <template v-for="(item, idx) in activeToolbarItems" :key="item">
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

        <!-- 思维导图: 结构布局 (11种结构) -->
        <MindmapLayoutItem
          v-else-if="item === 'mindmap-layout'"
          :board="props.board"
        />

        <!-- 思维导图: 分支类型 (曲线/直角) -->
        <MindmapBranchItem
          v-else-if="item === 'mindmap-branch'"
          :board="props.board"
        />

        <!-- 思维导图: 节点形状 (下划线/胶囊/卡片) -->
        <MindmapShapeItem
          v-else-if="item === 'mindmap-shape'"
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
          @open-link="emit('open-link-overlay'); closePopover()"
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
          @click="closePopover()"
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
          @click="closePopover()"
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
          @click="closePopover()"
        />

        <!-- 14. 垂直对齐 -->
        <AlignItem
          v-else-if="item === 'align-v'"
          :board="props.board"
          mode="vertical"
          @click="closePopover()"
        />

        <!-- 15. 粗体切换 -->
        <BoldItem
          v-else-if="item === 'bold'"
          :board="props.board"
          @click="closePopover()"
        />

        <!-- 16. 多选对齐与分布二级气泡 (1:1 语雀白板) -->
        <ArrangePopoverItem
          v-else-if="item === 'arrange'"
          :board="props.board"
        />

        <!-- 17. 成组 / 取消成组 (1:1 语雀白板) -->
        <GroupItem
          v-else-if="item === 'group'"
          :board="props.board"
        />

        <!-- 18. 打开/聚焦右侧深度设置面板 (🎛) -->
        <OpenPanelItem
          v-else-if="item === 'open-panel'"
          @click="emit('open-panel'); closePopover()"
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
import MindmapLayoutItem from './items/MindmapLayoutItem.vue'
import MindmapBranchItem from './items/MindmapBranchItem.vue'
import MindmapShapeItem from './items/MindmapShapeItem.vue'
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
import ArrangePopoverItem from './items/ArrangePopoverItem.vue'
import GroupItem from './items/GroupItem.vue'
import OpenPanelItem from './items/OpenPanelItem.vue'
import { useToolbarPopoverHost } from './useToolbarPopover'
import { useCellAttributes } from '../../composables/useCellAttributes'

import { useBubbleMenu, type BubbleMenuContext } from '@speed-board/vue3'

const props = withDefaults(
  defineProps<{
    board: Board | null
    containerEl?: HTMLElement | null
    isTyping?: boolean
    visible?: boolean
    shouldShow?: (context: BubbleMenuContext) => boolean
  }>(),
  {
    visible: true,
  }
)

const emit = defineEmits<{
  (e: 'open-panel'): void
  (e: 'open-link-overlay'): void
}>()

const { activePopoverKey, closePopover } = useToolbarPopoverHost()

const {
  menuRef: toolbarRef,
  visible,
  currentType,
  selectedCells,
  updatePosition,
} = useBubbleMenu({
  board: () => props.board,
  containerEl: () => props.containerEl,
  isTyping: () => props.isTyping ?? false,
  shouldShow: props.shouldShow,
})

// 当工具栏隐藏或选中节点集合真实发生变化时，关闭所有二级气泡
watch(visible, (v) => {
  if (!v) {
    closePopover()
  }
})

watch(
  () => selectedCells.value.map((c) => c.id).sort().join(','),
  (newVal, oldVal) => {
    if (newVal !== oldVal) {
      closePopover()
    }
  }
)

watch(
  () => props.visible,
  (v) => {
    if (v) {
      nextTick(() => {
        updatePosition()
      })
      setTimeout(() => {
        updatePosition()
      }, 50)
    }
  }
)

defineExpose({
  updatePosition,
})

const selectedCellData = computed(() => {
  if (selectedCells.value.length === 1) {
    return selectedCells.value[0].getData() || {}
  }
  return null
})

const currentImageStatus = computed<'uploading' | 'error' | 'success' | null>(() => {
  if (currentType.value !== 'image') return null
  return selectedCellData.value?.status || 'success'
})

const handleImageRetry = () => {
  if (selectedCells.value.length === 1) {
    const data = selectedCells.value[0].getData()
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

const mindmapShapeStyle = useCellAttributes<string>(
  () => props.board,
  (cell) => {
    const data = cell.getData() as any
    return data?.shapeStyle || 'rect'
  },
  'rect'
)

const activeToolbarItems = computed(() => {
  const schema = activeSchema.value
  if (!schema?.quickToolbar) return []

  return schema.quickToolbar.filter((item) => {
    // 思维导图节点：当为纯文本 (none) 时，隐藏填充 (fill) 和描边 (stroke)
    if (currentType.value === 'mindmap' && (item === 'fill' || item === 'stroke')) {
      const style = mindmapShapeStyle.value || 'rect'
      return style === 'rect' || style === 'capsule'
    }
    return true
  })
})

const shouldShowDivider = (item: string, idx: number) => {
  if (idx === 0) return false
  if (item === 'open-panel') return true
  if (item === 'mindmap-shape') return true
  if (item === 'fill' && currentType.value !== 'mindmap') return true
  if (item === 'text') return true
  return false
}
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
