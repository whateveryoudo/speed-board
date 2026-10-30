<template>
  <div
    v-show="visible && props.visible !== false"
    ref="toolbarRef"
    class="floating-bubble-toolbar plait-board-attached"
    :style="toolbarStyle"
    @mousedown="onToolbarMouseDown"
    @pointerdown.stop
    @mouseup.stop
    @pointerup.stop
    @click.stop
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

        <!-- 思维导图: 标记 (优先级/进度/旗帜) -->
        <MindmapMarkerItem
          v-else-if="item === 'mindmap-marker'"
          :board="props.board"
        />

        <!-- 思维导图: 概要 (大括号直接组合直接子集) -->
        <MindmapSummaryItem
          v-else-if="item === 'mindmap-summary'"
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
          :board="props.board"
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
import { ref, computed, watch } from 'vue'
import type { Board } from '@speed-board/core'
import { getNodeSchema, type NodeSchema } from '../../schema/nodeSchema'
import ShapeSwitchItem from './items/ShapeSwitchItem.vue'
import MindmapLayoutItem from './items/MindmapLayoutItem.vue'
import MindmapBranchItem from './items/MindmapBranchItem.vue'
import MindmapShapeItem from './items/MindmapShapeItem.vue'
import MindmapMarkerItem from './items/MindmapMarkerItem.vue'
import MindmapSummaryItem from './items/MindmapSummaryItem.vue'
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
import { useFloatingToolbar, useCellAttributes } from '@speed-board/vue3'

const props = withDefaults(
  defineProps<{
    board: Board | null
    visible?: boolean
  }>(),
  {
    visible: true,
  }
)

const emit = defineEmits<{
  (e: 'open-panel'): void
  (e: 'toggle-settings'): void
  (e: 'open-link-overlay'): void
}>()

const toolbarRef = ref<HTMLDivElement | null>(null)
const { activePopoverKey, closePopover } = useToolbarPopoverHost()

const {
  state,
  toolbarStyle,
} = useFloatingToolbar(() => props.board, { toolbarRef })

const visible = computed(() => state.value.visible)
const currentType = computed(() => state.value.selectedType)
const selectedCells = computed(() => (props.board?.selectedElements || []) as any[])

function onBoardPointerDown(e: any) {
  if (toolbarRef.value && e?.target && !toolbarRef.value.contains(e.target as Node)) {
    closePopover()
  }
}

// 滚动画布、平移、缩放、点击画布空白时，立即自动收起二级气泡（对标语雀）
watch(
  () => props.board,
  (b, oldB) => {
    if (oldB) {
      oldB.off('viewport:scroll', closePopover)
      oldB.off('board:pointerdown', onBoardPointerDown)
    }
    if (b) {
      b.on('viewport:scroll', closePopover)
      b.on('board:pointerdown', onBoardPointerDown)
    }
  },
  { immediate: true }
)

// 当工具栏隐藏或选中节点集合真实发生变化时，关闭所有二级气泡
watch(visible, (v) => {
  if (!v) {
    closePopover()
  }
})

watch(
  () => selectedCells.value.map((c: any) => c.id || c.points || '').join(','),
  (newVal, oldVal) => {
    if (newVal !== oldVal) {
      closePopover()
    }
  }
)

const activeSchema = computed<NodeSchema>(() => {
  return getNodeSchema(currentType.value)
})

const mindmapShapeStyle = useCellAttributes<string>(
  () => props.board,
  (cell) => {
    const data = (cell as any)?.data || ((cell as any)?.getData ? (cell as any).getData() : cell) || {}
    return data?.shapeStyle || 'rect'
  },
  'rect'
)

const selectedMindNodeCanSummary = computed(() => {
  if (!props.board) return false
  const selectedElements = (props.board.selectedElements || []) as any[]
  const mindElement = selectedElements.find((el) => el.type === 'mind')
  if (!mindElement) return false

  const rawBoard = (props.board as any).raw || props.board
  const selectedNodeId =
    (props.board as any).getSelectedMindNodeId?.() ||
    (rawBoard as any).selectedMindNodeId ||
    (rawBoard as any).__selectedMindNodeId ||
    mindElement.data?.selectedMindNodeId ||
    mindElement.id

  const findNode = (node: any, id: string): any => {
    if (node.id === id) return node
    if (node.children) {
      for (const c of node.children) {
        const res = findNode(c, id)
        if (res) return res
      }
    }
    return null
  }

  const targetNode = findNode(mindElement, selectedNodeId)
  if (!targetNode) return false
  if (targetNode.isSummary || targetNode.data?.isSummary) return false

  const isRoot = Boolean(targetNode.isRoot || targetNode.id === mindElement.id)
  const hasChildren = Boolean(
    targetNode.children &&
    targetNode.children.some((c: any) => !c.data?.isSummary && !c.isSummary)
  )

  // 根节点仅在拥有子节点时允许添加子集概要；常规分支节点与叶子节点均可添加概要
  return hasChildren || !isRoot
})

const activeToolbarItems = computed(() => {
  const schema = activeSchema.value
  if (!schema?.quickToolbar) return []

  return schema.quickToolbar.filter((item) => {
    if (currentType.value.startsWith('mindmap')) {
      // 思维导图节点：当为纯文本 (none) 时，隐藏填充 (fill) 和描边 (stroke)
      if (item === 'fill' || item === 'stroke') {
        const style = mindmapShapeStyle.value || 'rect'
        return style === 'rect' || style === 'capsule'
      }
    }
    return true
  })
})

const shouldShowDivider = (item: string, idx: number) => {
  if (idx === 0) return false
  if (item === 'open-panel') return true
  if (item === 'mindmap-marker') return true
  if (item === 'fill') return true
  if (item === 'text') return true
  return false
}

const onToolbarMouseDown = (e: MouseEvent) => {
  e.stopPropagation()
  const target = e.target as HTMLElement
  if (!target.closest('input, textarea, [contenteditable], .ant-select')) {
    e.preventDefault()
  }
}
</script>

<style scoped lang="less">
.floating-bubble-toolbar {
  position: absolute;
  z-index: 1000;
  pointer-events: auto;
  user-select: none;
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

  :deep(.bubble-toolbar-btn) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    color: #374151;
    padding: 0;
    margin: 0;
    outline: none;
    box-sizing: border-box;
    transition: all 0.15s ease;

    &:hover {
      background-color: #f3f4f6;
      color: #111827;
    }

    &.is-active {
      background-color: #e5e7eb;
      color: #111827;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    &:focus-visible {
      outline: none;
    }
  }
}

.toolbar-divider {
  width: 1px;
  height: 18px;
  background-color: #e5e7eb;
  margin: 0 4px;
}
</style>
