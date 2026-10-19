<template>
  <div
    class="speed-board"
    :class="{
      'is-single-selected': isSingleSelected,
      'is-mindmap-selected': isMindmapSelected,
      'is-inline-editing': isInlineEditing,
    }"
  >
    <!-- 顶部状态栏与悬浮控制组 (左上历史撤销 + 右上视口控制与折叠按钮) -->
    <TopToolbar
      :board="boardInstance"
      :title="props.title"
      :show-left-toolbar="showLeftToolbar"
      :show-settings="showSettingsPanel"
      @update:show-left-toolbar="showLeftToolbar = $event"
      @toggle-settings="showSettingsPanel = !showSettingsPanel"
      @save="onSave"
    />

    <!-- 左侧悬浮胶囊工具栏 (画笔、矢量钢笔、基础图形、文本、连线、思维导图、图片、素材库) -->
    <LeftToolbar
      :board="boardInstance"
      :icon-provider="props.iconProvider"
      :upload-config="props.uploadConfig"
      :visible="showLeftToolbar"
      :active-mode="drawConfig.mode"
      :active-placement-type="pendingPlacement ? pendingPlacement.type : null"
      @mode-change="onToolbarModeChange"
      @shape-added="onShapeAdded"
      @start-placement="onStartPlacement"
      @cancel-placement="cancelPlacement"
    />

    <!-- 右侧属性设置面板 (Schema 驱动) -->
    <StyleSettingsPanel
      v-model:visible="showSettingsPanel"
      :board="boardInstance"
      @open-link-overlay="onOpenLinkOverlay"
    />

    <!-- 主画布承载容器 -->
    <div
      ref="canvasWrapperRef"
      class="speed-board-canvas-wrapper"
      @pointerdown="onCanvasWrapperPointerDown"
    >
      <BoardCanvas :options="boardCanvasOptions" @created="onBoardCreated" />

      <!-- 画布图元浮动快捷工具栏 (1:1 语雀白板 Bubble Toolbar) -->
      <FloatingToolbarHost
        v-show="!isTyping && !pendingPlacement && !isLineDragging && !isDragging && drawConfig.mode === 'select'"
        :board="boardInstance"
        :container-el="canvasWrapperRef"
        :is-typing="isTyping"
        @open-panel="showSettingsPanel = true"
        @open-link-overlay="onOpenLinkOverlay"
      />

      <!-- 语雀白板 1:1 文本悬浮链接 Overlay 面板 (仅在点击“添加链接”/“编辑”时弹出) -->
      <TextOverlayEditor
        v-model:visible="showTextOverlay"
        :position="textOverlayPos"
        :text="textOverlayText"
        :link="textOverlayLink"
        :focus-link="textOverlayFocusLink"
        @change="onTextOverlayChange"
        @confirm="onTextOverlayConfirm"
      />

      <!-- 语雀白板 1:1 文本选框内就地输入编辑器 (双击文本图元就地打字输入) -->
      <InlineTextEditor
        ref="inlineEditorRef"
        v-model:visible="isInlineEditing"
        v-model:active-node="activeInlineNode"
        :initial-char="inlineInitialChar"
        :board="boardInstance"
        :canvas-wrapper="canvasWrapperRef"
        @close="onInlineEditorClose"
        @typing="isTyping = $event"
      />

      <!-- 4 个连接桩点（Ports）与快捷连接延伸手柄 (1:1 语雀白板交互) -->
      <ShapeAnchorPorts
        :board="boardInstance"
        :selected-node="selectedShapeNode"
        :canvas-wrapper="canvasWrapperRef"
        :visible="drawConfig.mode === 'select' && !isInlineEditing && !isLineDragging && !pendingPlacement && !isDragging"
      />

      <!-- 思维导图分支延伸手柄与加号按钮 (1:1 语雀白板交互) -->
      <MindmapBranchHandle
        :board="boardInstance"
        :selected-node="selectedMindmapNode"
        :canvas-wrapper="canvasWrapperRef"
        :visible="drawConfig.mode === 'select' && !isInlineEditing && !isLineDragging && !pendingPlacement && !isDragging"
      />

      <!-- 手绘与矢量交互覆盖层 (画笔/矢量钢笔/连线激活时在顶层捕获并实时渲染) -->
      <DrawingOverlay
        ref="drawingOverlayRef"
        :board="boardInstance"
        :draw-config="drawConfig"
        :vector-fill-color="vectorFillColor"
        :vector-stroke-color="vectorStrokeColor"
        :vector-stroke-width="vectorStrokeWidth"
        :vector-stroke-dash="vectorStrokeDash"
        :vector-opacity="vectorOpacity"
        @update:mode="drawConfig.mode = $event"
        @is-line-dragging-change="isLineDragging = $event"
        @finish-vector="showSettingsPanel = true"
      />

      <!-- 语雀白板 1:1 鼠标跟随放置预览图层 (Ghost Placement Overlay) -->
      <PlacementOverlay
        :board="boardInstance"
        :canvas-wrapper="canvasWrapperRef"
        :pending-placement="pendingPlacement"
        @cancel="cancelPlacement"
        @start-inline-text-edit="startInlineTextEdit"
      />

      <!-- 图元旋转实时度数指示气泡 (1:1 语雀白板风格) -->
      <transition name="degree-fade">
        <div
          v-if="rotatingDegreeText"
          class="board-rotation-degree-badge"
          :style="{
            left: `${rotationBadgePos.x}px`,
            top: `${rotationBadgePos.y}px`,
          }"
        >
          {{ rotatingDegreeText }}
        </div>
      </transition>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, shallowRef, computed, nextTick, onMounted, onUnmounted } from 'vue'
import {
  BoardCanvas,
  DrawingOverlay,
  InlineTextEditor,
  ShapeAnchorPorts,
  PlacementOverlay,
  findClosestPort,
  type BoardOptions,
  type DrawConfig,
} from '@speed-board/vue3'
import { Board } from '@speed-board/core'
import { useAntdCssVars } from 'speed-components-ui/hooks'
import LeftToolbar, { type PendingPlacementItem, type BoardUploadConfig } from './LeftToolbar.vue'
import TopToolbar from './TopToolbar.vue'
import StyleSettingsPanel from './StyleSettingsPanel.vue'
import TextOverlayEditor from './TextOverlayEditor.vue'
import FloatingToolbarHost from './floatingToolbar/FloatingToolbarHost.vue'
import MindmapBranchHandle from './MindmapBranchHandle.vue'
import { MindmapExtension, isMindmapNode } from '@speed-board/extension-mindmap'
import type { IconProvider } from '../data/defaultIcons'
import '../style/index.less'

defineOptions({
  name: 'SpeedBoard',
})

const props = withDefaults(
  defineProps<{
    options?: Omit<BoardOptions, 'container'>
    iconProvider?: IconProvider
    uploadConfig?: BoardUploadConfig
    title?: string
  }>(),
  {
    title: '测试画板1',
  }
)

const boardCanvasOptions = computed(() => {
  const customExtensions = props.options?.extensions || []
  const hasMindmap = customExtensions.some((ext: any) => ext?.name === 'mindmap')
  return {
    ...props.options,
    extensions: hasMindmap ? customExtensions : [...customExtensions, new MindmapExtension()],
  }
})

const emit = defineEmits<{
  (e: 'created', board: Board): void
  (e: 'save'): void
}>()

const showLeftToolbar = ref(true)
const showSettingsPanel = ref(false)

// 注入并管理 Ant Design Vue CSS 变量 (--ant-*)
const { cleanup: cleanupAntdCssVars } = useAntdCssVars()

const boardInstance = shallowRef<Board | null>(null)
const canvasWrapperRef = ref<HTMLDivElement | null>(null)
const inlineEditorRef = ref<InstanceType<typeof InlineTextEditor> | null>(null)
const drawingOverlayRef = ref<InstanceType<typeof DrawingOverlay> | null>(null)

// 旋转度数实时同步指示器
const rotatingDegreeText = ref('')
const rotationBadgePos = ref({ x: 0, y: 0 })

const formatDegree = (angle: number): string => {
  let raw = Math.round(angle) % 360
  if (raw > 180) raw -= 360
  else if (raw <= -180) raw += 360
  return `${raw}°`
}

const updateRotationBadge = (args: any) => {
  const node = args?.node || args?.cell
  if (!node || !boardInstance.value || !canvasWrapperRef.value) return

  rotatingDegreeText.value = formatDegree(node.getAngle() || 0)

  const bbox = node.getBBox()
  const bottomCenter = {
    x: bbox.x + bbox.width / 2,
    y: bbox.y + bbox.height + 32,
  }

  const clientPt = boardInstance.value.graph.localToClient(bottomCenter.x, bottomCenter.y)
  const wrapperRect = canvasWrapperRef.value.getBoundingClientRect()
  rotationBadgePos.value = {
    x: clientPt.x - wrapperRect.left,
    y: clientPt.y - wrapperRect.top,
  }
}

const setupRotationListeners = (board: Board) => {
  board.graph.on('node:rotate', (args: any) => {
    updateRotationBadge(args)
  })
  board.graph.on('node:rotating', (args: any) => {
    updateRotationBadge(args)
  })
  board.graph.on('node:rotated', () => {
    rotatingDegreeText.value = ''
  })
  board.graph.on('cell:change:angle', (args: any) => {
    if (args?.cell) updateRotationBadge(args)
  })
}

// 文本选框内就地打字状态
const isInlineEditing = ref(false)
const activeInlineNode = shallowRef<any>(null)
const inlineInitialChar = ref<string | null>(null)
const isTyping = ref(false)

const startInlineTextEdit = (node: any, initialChar?: string) => {
  if (!boardInstance.value || !node) return
  showTextOverlay.value = false
  if (isInlineEditing.value) {
    inlineEditorRef.value?.finish()
  }
  inlineInitialChar.value = initialChar ?? null
  activeInlineNode.value = node
  isInlineEditing.value = true
}

const onInlineEditorClose = () => {
  isInlineEditing.value = false
  inlineInitialChar.value = null
  isTyping.value = false
}

// 链接专用 Overlay 面板状态
const showTextOverlay = ref(false)
const textOverlayPos = ref({ x: 0, y: 0 })
const textOverlayText = ref('')
const textOverlayLink = ref('')
const textOverlayFocusLink = ref(false)
const activeLinkNode = shallowRef<any>(null)

const updateTextOverlayPos = (targetNode?: any) => {
  const node = targetNode || activeLinkNode.value
  if (!node || !boardInstance.value || !canvasWrapperRef.value) return
  const bbox = node.getBBox()
  const clientPt = boardInstance.value.graph.localToClient(bbox.x, bbox.y + bbox.height + 8)
  const wrapperRect = canvasWrapperRef.value.getBoundingClientRect()
  const x = clientPt.x - wrapperRect.left
  const y = clientPt.y - wrapperRect.top
  const maxX = Math.max(16, wrapperRect.width - 320)
  const maxY = Math.max(50, wrapperRect.height - 140)
  textOverlayPos.value = {
    x: Math.max(16, Math.min(x, maxX)),
    y: Math.max(50, Math.min(y, maxY)),
  }
}

const openLinkOverlayForNode = (node: any) => {
  if (!boardInstance.value || !node) return
  inlineEditorRef.value?.finish()

  activeLinkNode.value = node
  const data = node.getData() || {}
  const attrs = node.getAttrs()?.label || {}
  textOverlayText.value = (attrs.text as string) ?? (data.text as string) ?? ''
  textOverlayLink.value = data.link || ''
  textOverlayFocusLink.value = true

  updateTextOverlayPos(node)
  showTextOverlay.value = true
}

const onShapeAdded = (payload: { shape: string; node: any }) => {
  if (payload.shape === 'text' && payload.node) {
    startInlineTextEdit(payload.node)
  }
}

const onOpenLinkOverlay = () => {
  const selectedCells = boardInstance.value?.graph.getSelectedCells()
  if (selectedCells && selectedCells.length > 0) {
    const node = selectedCells[0]
    if (boardInstance.value?.isTextNode(node)) {
      openLinkOverlayForNode(node)
    }
  }
}

const onTextOverlayChange = (payload: { text: string; link: string }) => {
  if (!activeLinkNode.value || !boardInstance.value) return
  boardInstance.value.updateTextNode(activeLinkNode.value, {
    text: payload.text,
    link: payload.link,
  })
}

const onTextOverlayConfirm = (payload: { text: string; link: string }) => {
  if (activeLinkNode.value && boardInstance.value) {
    boardInstance.value.updateTextNode(activeLinkNode.value, {
      text: payload.text,
      link: payload.link,
    })
  }
  showTextOverlay.value = false
  activeLinkNode.value = null
}

const setupTextListeners = (board: Board) => {
  board.graph.on('node:dblclick', ({ node }: any) => {
    if (board.isTextNode(node) || board.isShapeNode(node)) {
      startInlineTextEdit(node)
    }
  })

  const onBlank = () => {
    if (isInlineEditing.value) {
      inlineEditorRef.value?.finish()
    }
    board.graph.cleanSelection()
    showTextOverlay.value = false
  }

  board.graph.on('blank:mousedown', onBlank)
  board.graph.on('blank:click', onBlank)

  board.graph.on('node:click', ({ node }: any) => {
    if (isInlineEditing.value && node !== activeInlineNode.value) {
      inlineEditorRef.value?.finish()
    }
    if (showTextOverlay.value && node !== activeLinkNode.value) {
      showTextOverlay.value = false
    }
  })

  board.graph.on('scale', () => {
    if (showTextOverlay.value) updateTextOverlayPos()
  })
  board.graph.on('translate', () => {
    if (showTextOverlay.value) updateTextOverlayPos()
  })
  board.graph.on('node:change:position', () => {
    if (showTextOverlay.value) updateTextOverlayPos()
  })
}

const isCanvasToolOrWidget = (target: HTMLElement | SVGElement | null): boolean => {
  if (!target) return false
  return !!(
    target.closest('.floating-bubble-toolbar') ||
    target.closest('.style-settings-panel') ||
    target.closest('.speed-inline-text-editor') ||
    target.closest('.ant-popover') ||
    target.closest('.ant-dropdown') ||
    target.closest('.ant-modal') ||
    target.closest('.ant-select-dropdown') ||
    target.closest('.x6-cell-tools') ||
    target.closest('.x6-edge-tools') ||
    target.closest('.x6-edge-tool') ||
    target.closest('.x6-node-tools') ||
    target.closest('.x6-tools-layer') ||
    target.closest('.x6-widget-selection-inner') ||
    target.closest('.x6-widget-selection-box') ||
    target.closest('.x6-widget-transform') ||
    target.closest('[data-cell-id]') ||
    target.closest('[data-tool-name]') ||
    target.closest('[data-tools-name]')
  )
}

const onCanvasWrapperPointerDown = (e: PointerEvent) => {
  const target = e.target as HTMLElement
  if (!target) return

  // 1. 忽略浮动气泡工具栏、右侧属性面板、就地输入编辑器、弹出层及所有 X6 工具/手柄/选区部件
  if (isCanvasToolOrWidget(target)) {
    return
  }

  // 2. 如果点击的是画布空白区域（未点中任何 X6 图元节点或边）
  if (
    !target.closest('.x6-cell') &&
    !target.closest('.x6-node') &&
    !target.closest('.x6-edge')
  ) {
    if (isInlineEditing.value) {
      inlineEditorRef.value?.finish()
    }
    boardInstance.value?.graph.cleanSelection()
    showTextOverlay.value = false
  }
}

// 选区与图形状态
const isSingleSelected = ref(false)
const selectedShapeNode = shallowRef<any>(null)
const selectedMindmapNode = shallowRef<any>(null)
const isMindmapSelected = computed(() => !!selectedMindmapNode.value)

const setupSelectionListeners = (board: Board) => {
  let prevSelectedEdges: any[] = []

  const updateSelection = (selected: any[]) => {
    const selectedNodes = (selected || []).filter((c: any) => c && c.isNode && c.isNode())
    const single = selectedNodes.length === 1
    if (isSingleSelected.value !== single) {
      isSingleSelected.value = single
    }

    const newShapeNode =
      single && board.isShapeNode(selectedNodes[0]) ? selectedNodes[0] : null
    if (selectedShapeNode.value !== newShapeNode) {
      selectedShapeNode.value = newShapeNode
    }

    const newMindmapNode =
      single &&
      (isMindmapNode(selectedNodes[0]) || selectedNodes[0].getData()?.type === 'mindmap-node')
        ? selectedNodes[0]
        : null
    if (selectedMindmapNode.value !== newMindmapNode) {
      selectedMindmapNode.value = newMindmapNode
    }

    // 处理选中边（排除思维导图内部树形分支连线，仅对普通/自由连线呈现两端抓手手柄）
    const currentSelectedEdges = (selected || []).filter(
      (c: any) => c && c.isEdge && c.isEdge() && c.getData()?.type !== 'mindmap-edge'
    )

    // 清除已取消选中的边上的 tools
    for (const edge of prevSelectedEdges) {
      if (!currentSelectedEdges.includes(edge)) {
        try {
          edge.removeTools()
        } catch {}
      }
    }

    // 为当前选中的边挂载两端端点箭头手柄 (source-arrowhead & target-arrowhead)
    for (const edge of currentSelectedEdges) {
      if (!prevSelectedEdges.includes(edge)) {
        try {
          const lineColor =
            edge.getAttrByPath('line/stroke') ||
            edge.getData()?.stroke ||
            '#374151'

          const hasTargetMarker = !!edge.getAttrByPath('line/targetMarker')
          const hasSourceMarker = !!edge.getAttrByPath('line/sourceMarker')

          edge.addTools([
            {
              name: 'source-arrowhead',
              args: {
                attrs: {
                  d: hasSourceMarker
                    ? 'M -8 0 A 4 4 0 1 0 0 0 A 4 4 0 1 0 -8 0 Z'
                    : 'M -4 0 A 4 4 0 1 0 4 0 A 4 4 0 1 0 -4 0 Z',
                  fill: '#ffffff',
                  stroke: lineColor,
                  'stroke-width': 1.5,
                  cursor: 'move',
                },
              },
            },
            {
              name: 'target-arrowhead',
              args: {
                attrs: {
                  d: hasTargetMarker
                    ? 'M 0 0 A 4 4 0 1 0 8 0 A 4 4 0 1 0 0 0 Z'
                    : 'M -4 0 A 4 4 0 1 0 4 0 A 4 4 0 1 0 -4 0 Z',
                  fill: '#ffffff',
                  stroke: lineColor,
                  'stroke-width': 1.5,
                  cursor: 'move',
                },
              },
            },
          ])
        } catch {}
      }
    }
    prevSelectedEdges = currentSelectedEdges
  }

  board.graph.on('selection:changed', ({ selected }: any) => {
    updateSelection(selected)
  })

  // 连线属性（颜色、端点箭头）改变时，同步更新其两端手柄样式与位置
  board.graph.on('edge:change:attrs', ({ edge }: any) => {
    try {
      if (board.graph.isCellSelected(edge)) {
        const lineColor =
          edge.getAttrByPath('line/stroke') ||
          edge.getData()?.stroke ||
          '#374151'
        const hasTargetMarker = !!edge.getAttrByPath('line/targetMarker')
        const hasSourceMarker = !!edge.getAttrByPath('line/sourceMarker')

        const toolItems = edge.getTools()?.items || []
        toolItems.forEach((tool: any) => {
          if (tool.name === 'source-arrowhead') {
            tool.setAttrs({
              stroke: lineColor,
              d: hasSourceMarker
                ? 'M -8 0 A 4 4 0 1 0 0 0 A 4 4 0 1 0 -8 0 Z'
                : 'M -4 0 A 4 4 0 1 0 4 0 A 4 4 0 1 0 -4 0 Z',
            }, tool.container)
          } else if (tool.name === 'target-arrowhead') {
            tool.setAttrs({
              stroke: lineColor,
              d: hasTargetMarker
                ? 'M 0 0 A 4 4 0 1 0 8 0 A 4 4 0 1 0 0 0 Z'
                : 'M -4 0 A 4 4 0 1 0 4 0 A 4 4 0 1 0 -4 0 Z',
            }, tool.container)
          }
        })
      }
    } catch {}
  })
}

let cleanupArrowheadListeners: (() => void) | null = null

const setupArrowheadDragListeners = (board: Board) => {
  let isDraggingArrowhead = false
  let currentDraggingEdge: any = null
  let currentDraggingType: 'source' | 'target' | null = null
  let lastArrowheadType: 'source' | 'target' | null = null
  let currentActiveSnapResult: any = null

  // 1. 捕获阶段识别点击的是哪一端的端点箭头手柄
  const onPointerDownCapture = (e: PointerEvent) => {
    const target = e.target as HTMLElement | SVGElement | null
    if (target?.closest?.('.x6-edge-tool-source-arrowhead')) {
      lastArrowheadType = 'source'
    } else if (target?.closest?.('.x6-edge-tool-target-arrowhead')) {
      lastArrowheadType = 'target'
    } else {
      lastArrowheadType = null
    }
  }

  canvasWrapperRef.value?.addEventListener('pointerdown', onPointerDownCapture, true)

  // 2. 监听 X6 内部启动端点拖拽
  board.graph.on('batch:start', ({ name }: any) => {
    if (name === 'move-arrowhead') {
      isDraggingArrowhead = true
      currentDraggingEdge = board.graph.getSelectedCells().find((c: any) => c && c.isEdge && c.isEdge())
      currentDraggingType = lastArrowheadType || 'target'
      currentActiveSnapResult = null
      canvasWrapperRef.value?.classList.add('is-dragging-arrowhead')
    }
  })

  // 3. 拖拽端点移动时，计算吸附与滑动，实时高亮目标节点与端口 (1:1 语雀)
  const onArrowheadPointerMove = (e: PointerEvent) => {
    if (!isDraggingArrowhead || !currentDraggingEdge || !boardInstance.value) return

    const graph = boardInstance.value.graph
    const localPt = graph.clientToLocal(e.clientX, e.clientY)

    // 触发区判定范围 35px
    const portResult = findClosestPort(boardInstance.value, localPt, 35)

    const otherEndCellId = currentDraggingType === 'target'
      ? currentDraggingEdge.getSourceCellId?.()
      : currentDraggingEdge.getTargetCellId?.()
    const isSelfLoop = !!(otherEndCellId && portResult && otherEndCellId === portResult.node.id)

    if (portResult && !isSelfLoop && portResult.node.id !== currentDraggingEdge.id) {
      const activePortId = portResult.isCenterPort ? portResult.port : undefined
      boardInstance.value.showNodePorts(portResult.node, true, activePortId)
      currentActiveSnapResult = portResult

      if (currentDraggingType) {
        if (portResult.isCenterPort && portResult.port) {
          currentDraggingEdge.setTerminal(currentDraggingType, {
            cell: portResult.node.id,
            port: portResult.port,
          }, {}, { ui: true })
        } else {
          currentDraggingEdge.setTerminal(currentDraggingType, {
            cell: portResult.node.id,
            anchor: {
              name: portResult.edge,
              args: {
                dx: portResult.edge === 'top' || portResult.edge === 'bottom' ? portResult.delta : 0,
                dy: portResult.edge === 'left' || portResult.edge === 'right' ? portResult.delta : 0,
                rotate: true,
              },
            },
          }, {}, { ui: true })
        }
      }
    } else {
      if (currentActiveSnapResult) {
        boardInstance.value.showNodePorts(currentActiveSnapResult.node, false)
        currentActiveSnapResult = null
      }
    }
  }

  window.addEventListener('pointermove', onArrowheadPointerMove)

  // 4. 拖拽结束时锁定端点并清理高亮
  const onArrowheadDragStop = () => {
    if (!isDraggingArrowhead) return

    const snapResult = currentActiveSnapResult
    const edge = currentDraggingEdge
    const type = currentDraggingType

    if (snapResult && edge && type) {
      if (snapResult.isCenterPort && snapResult.port) {
        edge.setTerminal(type, {
          cell: snapResult.node.id,
          port: snapResult.port,
        })
      } else {
        edge.setTerminal(type, {
          cell: snapResult.node.id,
          anchor: {
            name: snapResult.edge,
            args: {
              dx: snapResult.edge === 'top' || snapResult.edge === 'bottom' ? snapResult.delta : 0,
              dy: snapResult.edge === 'left' || snapResult.edge === 'right' ? snapResult.delta : 0,
              rotate: true,
            },
          },
        })
      }
    }

    isDraggingArrowhead = false
    currentDraggingEdge = null
    currentDraggingType = null
    currentActiveSnapResult = null
    lastArrowheadType = null
    canvasWrapperRef.value?.classList.remove('is-dragging-arrowhead')
    boardInstance.value?.hideAllPorts()
  }

  board.graph.on('batch:stop', ({ name }: any) => {
    if (name === 'move-arrowhead') {
      onArrowheadDragStop()
    }
  })

  window.addEventListener('pointerup', onArrowheadDragStop)

  cleanupArrowheadListeners = () => {
    canvasWrapperRef.value?.removeEventListener('pointerdown', onPointerDownCapture, true)
    window.removeEventListener('pointermove', onArrowheadPointerMove)
    window.removeEventListener('pointerup', onArrowheadDragStop)
  }
}

const onBoardCreated = (board: Board) => {
  boardInstance.value = board
  setupRotationListeners(board)
  setupTextListeners(board)
  setupSelectionListeners(board)
  setupArrowheadDragListeners(board)
  setupDragListeners(board)

  board.graph.on('node:start-edit', ({ node }: { node: any }) => {
    startInlineTextEdit(node)
  })

  emit('created', board)
}

const onSave = () => {
  emit('save')
}

// 手绘模式与笔触参数状态
const drawConfig = ref<DrawConfig>({
  mode: 'select',
  lineType: 'elbow',
  color: '#333333',
  width: 3,
  opacity: 1,
})

// 矢量多边形配置与样式属性
const vectorFillColor = ref('#ffffff')
const vectorStrokeColor = ref('#374151')
const vectorStrokeWidth = ref(2)
const vectorStrokeDash = ref('none')
const vectorOpacity = ref(1)

const isLineDragging = ref(false)
const isDragging = ref(false)

const setupDragListeners = (board: Board) => {
  const onDragStart = () => {
    isDragging.value = true
  }
  const onDragEnd = () => {
    isDragging.value = false
  }

  board.graph.on('node:move', onDragStart)
  board.graph.on('node:moving', onDragStart)
  board.graph.on('node:moved', onDragEnd)
  board.graph.on('node:drag:start', onDragStart)
  board.graph.on('node:drag:end', onDragEnd)
  board.graph.on('mindmap:drag:start', onDragStart)
  board.graph.on('mindmap:drag:end', onDragEnd)
  board.graph.on('translate', onDragStart)

  window.addEventListener('pointerup', onDragEnd)
}

// 鼠标跟随放置模式 (Ghost Placement Mode)
const pendingPlacement = ref<PendingPlacementItem | null>(null)

const onStartPlacement = (item: PendingPlacementItem) => {
  boardInstance.value?.graph.cleanSelection()
  selectedShapeNode.value = null
  showTextOverlay.value = false

  drawConfig.value.mode = 'select'
  boardInstance.value?.setDrawingMode('select')

  pendingPlacement.value = item
}

const cancelPlacement = () => {
  pendingPlacement.value = null
}

const onToolbarModeChange = (payload: {
  mode: 'select' | 'pencil' | 'marker' | 'eraser' | 'vector' | 'line'
  lineType?: 'elbow' | 'straight' | 'curve'
  color?: string
  width?: number
  opacity?: number
}) => {
  cancelPlacement()
  drawConfig.value.mode = payload.mode
  if (payload.lineType) drawConfig.value.lineType = payload.lineType
  if (payload.color) drawConfig.value.color = payload.color
  if (payload.width) drawConfig.value.width = payload.width
  if (payload.opacity !== undefined) drawConfig.value.opacity = payload.opacity

  if (payload.mode !== 'select') {
    boardInstance.value?.graph.cleanSelection()
    selectedShapeNode.value = null
  }

  boardInstance.value?.hideAllPorts()

  if (payload.mode === 'vector') {
    showSettingsPanel.value = true
  }
}

// 键盘快捷键交互 (Type-to-edit 选中即输入, Enter/Tab 脑图增分支, Esc 取消放置, T 激活文本放置)
const onKeyDown = (e: KeyboardEvent) => {
  if (boardInstance.value && Board.activeBoard !== boardInstance.value) {
    return
  }

  if (e.key === 'Escape') {
    if (pendingPlacement.value) {
      cancelPlacement()
      return
    }
  }

  const activeEl = document.activeElement
  const isTyping =
    activeEl &&
    (activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      (activeEl as HTMLElement).isContentEditable)

  if (isTyping || isInlineEditing.value || showTextOverlay.value || pendingPlacement.value) {
    return
  }

  const selectedCells = boardInstance.value ? boardInstance.value.graph.getSelectedCells() : []
  const singleSelected = selectedCells.length === 1 ? selectedCells[0] : null

  // 1. 结构快捷键：思维导图节点单选态按 Enter / Tab 专职新增分支 (零歧义，绝不用于触发打字)
  if (singleSelected && (e.key === 'Enter' || e.key === 'Tab')) {
    const isMindmap =
      (selectedMindmapNode.value && selectedMindmapNode.value.id === singleSelected.id) ||
      singleSelected.getData()?.type === 'mindmap-node'
    if (isMindmap) {
      e.preventDefault()
      e.stopPropagation()
      const data = singleSelected.getData() || {}
      if (e.key === 'Tab' || data.isRoot || !data.parentId) {
        ;(boardInstance.value as any)?.commands?.addMindmapChild?.(singleSelected.id)
      } else {
        ;(boardInstance.value as any)?.commands?.addMindmapSibling?.(singleSelected.id)
      }
      return
    }
  }

  // 2. 选中直接输入 (Type-to-edit)：单选任意图元（图形、文本、便签、思维导图）直接敲键盘任意字符启动打字
  if (
    singleSelected &&
    !e.ctrlKey &&
    !e.metaKey &&
    !e.altKey &&
    e.key !== 'Escape' &&
    e.key !== 'Delete' &&
    e.key !== 'Backspace' &&
    e.key !== 'Enter' &&
    e.key !== 'Tab' &&
    (e.key.length === 1 || e.isComposing)
  ) {
    const board = boardInstance.value!
    const isEditable =
      board.isTextNode(singleSelected) ||
      board.isShapeNode(singleSelected) ||
      singleSelected.getData()?.type === 'mindmap-node'
    if (isEditable) {
      e.preventDefault()
      e.stopPropagation()
      startInlineTextEdit(singleSelected, e.key)
      return
    }
  }

  // 3. 全局工具快捷键 (仅在未选中任何图元时触发，防止与图元内文字输入冲突)
  if (selectedCells.length === 0 && drawConfig.value.mode === 'select') {
    if (e.key === 't' || e.key === 'T') {
      onStartPlacement({
        type: 'text',
        width: 100,
        height: 36,
        textConfig: {
          text: '文本',
          fontSize: 14,
          fill: '#262626',
        },
      })
      return
    }
  }
}

const onGlobalPointerUp = () => {
  if (rotatingDegreeText.value) {
    rotatingDegreeText.value = ''
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('pointerup', onGlobalPointerUp)
})

onUnmounted(() => {
  cleanupAntdCssVars?.()
  cleanupArrowheadListeners?.()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('pointerup', onGlobalPointerUp)
})
</script>

<style scoped lang="less">
.speed-board {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: var(--speed-board-bg, #ffffff);
  color: var(--speed-board-text, rgba(0, 0, 0, 0.88));
}

.speed-board-canvas-wrapper {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.speed-drawing-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 50;
  pointer-events: all;
  touch-action: none;
  cursor: crosshair;

  &.is-vector-mode,
  &.is-line-mode {
    cursor: crosshair;
  }
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.9);
    opacity: 0.9;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.4;
  }
  100% {
    transform: scale(0.9);
    opacity: 0.9;
  }
}

.snap-start-pulse {
  transform-origin: center;
  animation: pulse-ring 1.2s infinite ease-in-out;
}

:deep(.is-dragging-arrowhead) {
  .x6-edge-tool-source-arrowhead,
  .x6-edge-tool-target-arrowhead {
    opacity: 0 !important;
    pointer-events: none !important;
  }
}

// 旋转实时度数指示气泡 (1:1 语雀白板风格)
.board-rotation-degree-badge {
  position: absolute;
  transform: translate(-50%, -50%);
  background: rgba(30, 30, 30, 0.9);
  color: #ffffff;
  font-size: 12px;
  font-weight: 500;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding: 2px 7px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  pointer-events: none;
  z-index: 100;
  user-select: none;
  white-space: nowrap;
}

.degree-fade-enter-active,
.degree-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.degree-fade-enter-from,
.degree-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -40%) scale(0.9);
}

// 语雀白板 1:1 选框内直接就地打字输入框样式
.speed-board-inline-text-editor {
  position: absolute;
  border: none;
  outline: none;
  background: transparent;
  resize: none;
  overflow: hidden;
  box-sizing: border-box;
  padding: 6px 8px;
  margin: 0;
  line-height: 1.45;
  caret-color: #2563eb;
  white-space: pre-wrap;
  word-break: break-word;
  pointer-events: auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;

  &::selection {
    background: rgba(37, 99, 235, 0.2);
  }
}

// 4个连接桩点与箭头样式 (1:1 语雀白板)
.shape-anchor-ports-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 60;
}

.shape-anchor-btn {
  position: absolute;
  width: 22px;
  height: 22px;
  margin-left: -11px;
  margin-top: -11px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  pointer-events: auto;
  border-radius: 50%;
  background: transparent;
  user-select: none;
  transition: transform 0.15s ease;

  .anchor-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #ffffff;
    border: 2px solid #2563eb;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    transition: all 0.15s ease;
    display: block;
  }

  .anchor-arrow {
    display: none;
    position: absolute;
    color: #2563eb;
  }

  &:hover {
    transform: scale(1.15);

    .anchor-dot {
      display: none;
    }

    .anchor-arrow {
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}

// 鼠标跟随虚影放置图层样式
.speed-placement-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 70;
  pointer-events: all;
  cursor: crosshair;
}

.speed-placement-ghost {
  opacity: 0.65;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transition: opacity 0.12s ease;

  .placement-ghost-text {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 0 8px;
    border: 1.5px dashed #3b82f6;
    background: rgba(239, 246, 255, 0.7);
    color: #262626;
    border-radius: 4px;
    box-sizing: border-box;
  }

  .placement-ghost-shape {
    border: 1.5px dashed #3b82f6;
    border-radius: 4px;
    background: rgba(239, 246, 255, 0.5);
    box-sizing: border-box;
  }

  .placement-ghost-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1.5px dashed #3b82f6;
    border-radius: 6px;
    background: rgba(239, 246, 255, 0.6);
    box-sizing: border-box;

    svg {
      width: 70%;
      height: 70%;
    }
  }

  .placement-ghost-basic {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px dashed;
    border-radius: 8px;
    font-weight: 500;
    box-sizing: border-box;
  }
}

.ghost-fade-enter-active,
.ghost-fade-leave-active {
  transition: opacity 0.15s ease;
}

.ghost-fade-enter-from,
.ghost-fade-leave-to {
  opacity: 0;
}
</style>
