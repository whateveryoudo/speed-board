<template>
  <div class="mindmap-handles-container">
    <!-- 1. 当前选中节点的控制手柄 -->
    <div
      v-if="handlePos && props.visible"
      ref="handleRef"
      class="mindmap-branch-handle-overlay"
      :style="{
        left: `${handlePos.x}px`,
        top: `${handlePos.y}px`,
      }"
      @pointerdown.stop
    >
      <!-- 边缘吸附圆点 -->
      <div class="branch-anchor-dot" :style="{ backgroundColor: branchColor }" />

      <!-- 分支延伸导引短线 -->
      <div
        class="branch-stub-line"
        :class="[handleSide, { 'is-expanded-with-children': hasChildren && !isRoot }]"
        :style="{ backgroundColor: branchColor }"
      />

      <!-- 情况 A：已折叠 -> 显示数字计数徽标，点击展开；旁边保留添加按钮 (+) -->
      <template v-if="hasChildren && isCollapsed && !isRoot">
        <div
          class="branch-count-badge"
          :class="handleSide"
          :style="{ backgroundColor: branchColor }"
          title="点击展开分支"
          @click.stop="onToggleCollapse"
        >
          {{ childCount }}
        </div>
        <div
          class="branch-add-btn is-secondary"
          :class="handleSide"
          title="添加分支 (Enter)"
          @click.stop="onAddBranch"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
          </svg>
        </div>
      </template>

      <!-- 情况 B：已展开且有子节点 (非根) -> 同时显示收起按钮 (<) 与添加按钮 (+) -->
      <template v-else-if="hasChildren && !isCollapsed && !isRoot">
        <div
          class="branch-collapse-btn"
          :class="handleSide"
          :style="{ backgroundColor: branchColor }"
          title="收起分支"
          @click.stop="onToggleCollapse"
        >
          <!-- 箭头收起图标 -->
          <svg
            width="10"
            height="10"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            :style="{ transform: handleSide === 'left' ? 'rotate(180deg)' : 'none' }"
          >
            <path d="M10 3.5L5.5 8l4.5 4.5" />
          </svg>
        </div>
        <div
          class="branch-add-btn is-secondary"
          :class="handleSide"
          title="添加分支 (Enter)"
          @click.stop="onAddBranch"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
          </svg>
        </div>
      </template>

      <!-- 情况 C：根节点或无子节点的叶子节点 -> 只显示主添加按钮 (+) -->
      <template v-else>
        <div
          class="branch-add-btn"
          :class="handleSide"
          :style="{ backgroundColor: branchColor }"
          title="添加分支 (Enter)"
          @click.stop="onAddBranch"
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
          </svg>
        </div>
      </template>
    </div>

    <!-- 2. 全画板其他未选中折叠节点的数量徽标 (常驻显示，点击展开) -->
    <template v-if="props.visible">
      <div
        v-for="cNode in otherCollapsedNodes"
        :key="cNode.id"
        class="mindmap-branch-handle-overlay"
        :style="{
          left: `${cNode.x}px`,
          top: `${cNode.y}px`,
        }"
        @pointerdown.stop
        @click.stop="onExpandOtherNode(cNode.id)"
      >
        <div class="branch-anchor-dot" :style="{ backgroundColor: cNode.color }" />
        <div
          class="branch-stub-line"
          :class="cNode.side"
          :style="{ backgroundColor: cNode.color }"
        />
        <div
          class="branch-count-badge standalone"
          :class="cNode.side"
          :style="{ backgroundColor: cNode.color }"
          title="点击展开分支"
        >
          {{ cNode.count }}
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { autoUpdate, type VirtualElement } from '@floating-ui/dom'
import type { Board } from '@speed-board/core'
import type { MindmapNodeData } from '@speed-board/shared'

const props = defineProps<{
  board: Board | null
  canvasWrapper: HTMLDivElement | null
  selectedNode: any
  visible?: boolean
}>()

const handleRef = ref<HTMLDivElement | null>(null)
const handlePos = ref<{ x: number; y: number } | null>(null)
const handleSide = ref<'right' | 'left'>('right')

// 响应式版本号：当 X6 内部 node.setData / 折叠状态 / 画布结构变动时触发强制刷新
const dataRevision = ref(0)

const nodeData = computed<MindmapNodeData | null>(() => {
  const _ = dataRevision.value
  if (!props.selectedNode) return null
  return (props.selectedNode.getData() || {}) as MindmapNodeData
})

const isRoot = computed(() => !!nodeData.value?.isRoot)

// 判断节点是否真实处于折叠状态 (Ground Truth：子节点是否真实在画布上被隐藏)
const isNodeCollapsed = (node: any): boolean => {
  if (!node || !props.board) return false
  const d = (node.getData?.() || {}) as MindmapNodeData
  if (d.isRoot) return false

  const g = props.board.graph
  const children = g.getNodes().filter((c) => {
    const cd = c.getData?.() as MindmapNodeData | undefined
    return cd?.type === 'mindmap-node' && cd.parentId === node.id
  })
  if (children.length === 0) return false

  // 严格可见性真理：只要子节点在画布中处于可见状态，就绝对不是折叠态（必然是展开态）
  const firstChild = children[0]
  if (firstChild && typeof firstChild.isVisible === 'function') {
    return !firstChild.isVisible()
  }
  return !!d.collapsed
}

const isCollapsed = computed(() => {
  const _ = dataRevision.value
  if (!props.selectedNode) return false
  return isNodeCollapsed(props.selectedNode)
})

const childrenList = computed(() => {
  const _ = dataRevision.value
  if (!props.selectedNode || !props.board) return []
  const g = props.board.graph
  return g.getNodes().filter((n) => {
    const d = n.getData() as MindmapNodeData | undefined
    return d?.type === 'mindmap-node' && d.parentId === props.selectedNode.id
  })
})

const hasChildren = computed(() => childrenList.value.length > 0)
const childCount = computed(() => childrenList.value.length)

const branchColor = computed(() => {
  if (!nodeData.value) return '#8b5cf6'
  if (nodeData.value.isRoot) {
    return '#8b5cf6'
  }
  return nodeData.value.branch?.color || '#8b5cf6'
})

// 画布上其他未选中的折叠节点列表 (只有当子节点被真实隐藏收起时才渲染计数徽标)
const otherCollapsedNodes = computed(() => {
  const _ = dataRevision.value
  if (!props.board || !props.canvasWrapper || !props.visible) return []
  const g = props.board.graph
  const wrapperRect = props.canvasWrapper.getBoundingClientRect()

  return g
    .getNodes()
    .filter((n) => {
      if (props.selectedNode && n.id === props.selectedNode.id) return false
      if (!n.isVisible()) return false
      const d = n.getData() as MindmapNodeData | undefined
      if (!d || d.type !== 'mindmap-node' || d.isRoot) return false
      // 核心校验：必须真实处于折叠状态（子节点被隐藏），展开中的节点绝不会混入
      return isNodeCollapsed(n)
    })
    .map((n) => {
      const d = n.getData() as MindmapNodeData
      const bbox = n.getBBox()
      const side = d.side === 'left' ? 'left' : 'right'
      const anchorX = side === 'right' ? bbox.x + bbox.width : bbox.x
      const anchorY = bbox.y + bbox.height / 2
      const clientPt = props.board!.graph.localToClient(anchorX, anchorY)

      const cChildren = g.getNodes().filter((c) => {
        const cd = c.getData() as MindmapNodeData | undefined
        return cd?.type === 'mindmap-node' && cd.parentId === n.id
      })

      return {
        id: n.id,
        x: clientPt.x - wrapperRect.left,
        y: clientPt.y - wrapperRect.top,
        side,
        color: d.branch?.color || '#8b5cf6',
        count: Math.max(cChildren.length, 1),
      }
    })
})

let syncTimer: any = null
let cleanupAutoUpdate: (() => void) | null = null

const updatePosition = () => {
  const node = props.selectedNode
  if (!node || !props.board || !props.canvasWrapper || !props.visible) {
    handlePos.value = null
    teardownAutoUpdate()
    return
  }

  const data = (node.getData() || {}) as MindmapNodeData
  const side = data.side === 'left' ? 'left' : 'right'
  handleSide.value = side

  const wrapperRect = props.canvasWrapper.getBoundingClientRect()
  const bbox = node.getBBox()
  const anchorX = side === 'right' ? bbox.x + bbox.width : bbox.x
  const anchorY = bbox.y + bbox.height / 2

  const clientPt = props.board.graph.localToClient(anchorX, anchorY)
  handlePos.value = {
    x: clientPt.x - wrapperRect.left,
    y: clientPt.y - wrapperRect.top,
  }

  nextTick(() => {
    if (!cleanupAutoUpdate && handleRef.value && props.visible && props.selectedNode) {
      setupAutoUpdate()
    }
  })
}

const queueUpdate = () => {
  if (syncTimer) cancelAnimationFrame(syncTimer)
  syncTimer = requestAnimationFrame(updatePosition)
}

const virtualElement: VirtualElement = {
  getBoundingClientRect() {
    const node = props.selectedNode
    const board = props.board
    if (!node || !board) {
      return { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 }
    }
    const data = (node.getData() || {}) as MindmapNodeData
    const side = data.side === 'left' ? 'left' : 'right'
    const bbox = node.getBBox()
    const anchorX = side === 'right' ? bbox.x + bbox.width : bbox.x
    const anchorY = bbox.y + bbox.height / 2
    const clientPt = board.graph.localToClient(anchorX, anchorY)
    return {
      x: clientPt.x,
      y: clientPt.y,
      top: clientPt.y,
      bottom: clientPt.y,
      left: clientPt.x,
      right: clientPt.x,
      width: 0,
      height: 0,
    }
  },
}

const setupAutoUpdate = () => {
  teardownAutoUpdate()
  if (!handleRef.value || !props.selectedNode || !props.visible || !props.board) return
  cleanupAutoUpdate = autoUpdate(
    virtualElement,
    handleRef.value,
    () => {
      updatePosition()
    },
    { animationFrame: true }
  )
}

const teardownAutoUpdate = () => {
  if (cleanupAutoUpdate) {
    cleanupAutoUpdate()
    cleanupAutoUpdate = null
  }
}

const onDataOrStateChange = () => {
  dataRevision.value++
  queueUpdate()
}

const bindBoardEvents = (board: Board) => {
  const g = board.graph
  g.on('scale', onDataOrStateChange)
  g.on('translate', onDataOrStateChange)
  g.on('node:change:position', onDataOrStateChange)
  g.on('node:change:size', onDataOrStateChange)
  g.on('node:change:data', onDataOrStateChange)
  g.on('node:change:visible', onDataOrStateChange)
  g.on('cell:change:visible', onDataOrStateChange)
  g.on('node:moving', queueUpdate)
  g.on('node:moved', onDataOrStateChange)
  g.on('cell:change:*', onDataOrStateChange)
  g.on('selection:changed', onDataOrStateChange)
  g.on('model:updated', onDataOrStateChange)
  g.on('render:done', onDataOrStateChange)
  g.on('mindmap:drag:start', queueUpdate)
  g.on('mindmap:drag:end', onDataOrStateChange)
  g.on('mindmap:collapse:change', onDataOrStateChange)

  const scrollerEl = board.scrollerPlugin?.container
  if (scrollerEl) {
    scrollerEl.addEventListener('scroll', onDataOrStateChange, { passive: true })
  }
}

const unbindBoardEvents = (board: Board) => {
  const g = board.graph
  g.off('scale', onDataOrStateChange)
  g.off('translate', onDataOrStateChange)
  g.off('node:change:position', onDataOrStateChange)
  g.off('node:change:size', onDataOrStateChange)
  g.off('node:change:data', onDataOrStateChange)
  g.off('node:change:visible', onDataOrStateChange)
  g.off('cell:change:visible', onDataOrStateChange)
  g.off('node:moving', queueUpdate)
  g.off('node:moved', onDataOrStateChange)
  g.off('cell:change:*', onDataOrStateChange)
  g.off('selection:changed', onDataOrStateChange)
  g.off('model:updated', onDataOrStateChange)
  g.off('render:done', onDataOrStateChange)
  g.off('mindmap:drag:start', queueUpdate)
  g.off('mindmap:drag:end', onDataOrStateChange)
  g.off('mindmap:collapse:change', onDataOrStateChange)

  const scrollerEl = board.scrollerPlugin?.container
  if (scrollerEl) {
    scrollerEl.removeEventListener('scroll', onDataOrStateChange)
  }
}

watch(
  () => props.board,
  (newBoard, oldBoard) => {
    if (oldBoard) unbindBoardEvents(oldBoard)
    if (newBoard) {
      bindBoardEvents(newBoard)
      onDataOrStateChange()
    }
  },
  { immediate: true }
)

watch(
  () => [props.selectedNode, props.visible],
  () => {
    dataRevision.value++
    teardownAutoUpdate()
    queueUpdate()
  },
  { immediate: true }
)

const onAddBranch = () => {
  if (!props.board || !props.selectedNode) return
  ;(props.board as any).commands?.addMindmapChild?.(props.selectedNode.id)
  dataRevision.value++
  nextTick(() => {
    dataRevision.value++
    queueUpdate()
  })
}

const onToggleCollapse = () => {
  if (!props.board || !props.selectedNode) return
  ;(props.board as any).commands?.toggleMindmapNodeCollapse?.(props.selectedNode.id)
  dataRevision.value++
  nextTick(() => {
    dataRevision.value++
    queueUpdate()
  })
}

const onExpandOtherNode = (nodeId: string) => {
  if (!props.board) return
  const node = props.board.graph.getCellById(nodeId)
  if (node) {
    props.board.graph.cleanSelection()
    props.board.graph.select(node)
  }
  ;(props.board as any).commands?.toggleMindmapNodeCollapse?.(nodeId)
  dataRevision.value++
  nextTick(() => {
    dataRevision.value++
    queueUpdate()
  })
}

onMounted(() => {
  if (props.board) {
    bindBoardEvents(props.board)
  }
  props.canvasWrapper?.addEventListener('scroll', queueUpdate, { passive: true })
  window.addEventListener('scroll', queueUpdate, { passive: true, capture: true })
  window.addEventListener('resize', queueUpdate)
  window.addEventListener('keydown', queueUpdate)
  queueUpdate()
})

onUnmounted(() => {
  if (props.board) {
    unbindBoardEvents(props.board)
  }
  props.canvasWrapper?.removeEventListener('scroll', queueUpdate)
  window.removeEventListener('scroll', queueUpdate)
  window.removeEventListener('resize', queueUpdate)
  window.removeEventListener('keydown', queueUpdate)
  teardownAutoUpdate()
  if (syncTimer) cancelAnimationFrame(syncTimer)
})
</script>

<style scoped lang="less">
.mindmap-handles-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 85;
}

.mindmap-branch-handle-overlay {
  position: absolute;
  width: 0;
  height: 0;
  pointer-events: auto;
  user-select: none;

  .branch-anchor-dot {
    position: absolute;
    left: -4px;
    top: -4px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    pointer-events: none;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
  }

  .branch-stub-line {
    position: absolute;
    height: 3px;
    width: 14px;
    top: -1.5px;
    pointer-events: none;
    border-radius: 1.5px;

    &.right {
      left: 0;
    }

    &.left {
      right: 0;
    }

    &.is-expanded-with-children {
      width: 32px;
    }
  }

  .branch-add-btn {
    position: absolute;
    width: 18px;
    height: 18px;
    top: -9px;
    border-radius: 50%;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
    transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);

    &.right {
      left: 14px;
    }

    &.left {
      right: 14px;
    }

    &.is-secondary {
      background-color: #9ca3af;
      &.right {
        left: 32px;
      }
      &.left {
        right: 32px;
      }

      &:hover {
        background-color: #6b7280;
      }
    }

    &:hover {
      transform: scale(1.22);
      filter: brightness(0.95);
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35);
    }

    &:active {
      transform: scale(0.95);
    }
  }

  .branch-collapse-btn {
    position: absolute;
    width: 18px;
    height: 18px;
    top: -9px;
    border-radius: 50%;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
    transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);

    &.right {
      left: 10px;
    }

    &.left {
      right: 10px;
    }

    &:hover {
      transform: scale(1.22);
      filter: brightness(0.92);
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35);
    }

    &:active {
      transform: scale(0.95);
    }
  }

  .branch-count-badge {
    position: absolute;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    top: -9px;
    border-radius: 9px;
    color: #ffffff;
    font-size: 11px;
    font-weight: 600;
    line-height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
    transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);

    &.right {
      left: 10px;
    }

    &.left {
      right: 10px;
    }

    &.standalone {
      &.right {
        left: 14px;
      }

      &.left {
        right: 14px;
      }
    }

    &:hover {
      transform: scale(1.22);
      filter: brightness(0.92);
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35);
    }

    &:active {
      transform: scale(0.95);
    }
  }
}
</style>
