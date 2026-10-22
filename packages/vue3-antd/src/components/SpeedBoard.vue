<template>
  <div
    class="speed-board"
    :class="{
      'is-single-selected': isSingleSelected,
      'is-multi-selected': isMultiSelected,
      'is-text-selected': isTextSelected,
      'is-mindmap-selected': isMindmapSelected,
      'is-mindmap-capsule': isMindmapCapsule,
      'is-mindmap-rect': isMindmapRect,
      'is-mindmap-root': isMindmapRoot,
      'is-mindmap-none': isMindmapNone,
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

    <!-- 主画布承载容器 (100% In-Canvas 架构，无多余外部浮层) -->
    <div
      ref="canvasWrapperRef"
      class="speed-board-canvas-wrapper"
      @pointerdown="onCanvasWrapperPointerDown"
    >
      <BoardCanvas :options="boardCanvasOptions" @created="onBoardCreated" />

      <!-- 画布图元浮动快捷工具栏 (1:1 语雀白板 Bubble Toolbar) -->
      <FloatingToolbarHost
        v-show="!isTyping && !pendingPlacement && !isLineDragging && !isDragging && drawConfig.mode === 'select'"
        ref="floatingToolbarRef"
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, nextTick, onMounted, watch, onUnmounted } from 'vue'
import {
  BoardCanvas,
  DrawingOverlay,
  InlineTextEditor,
  ShapeAnchorPorts,
  PlacementOverlay,
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
import { useCellAttributes } from '../composables/useCellAttributes'
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

// 就地文本编辑状态 (InlineTextEditor)
const inlineEditorRef = ref<any>(null)
const isInlineEditing = ref(false)
const activeInlineNode = shallowRef<any>(null)
const inlineInitialChar = ref('')
const isTyping = ref(false)
const isLineDragging = ref(false)
const drawingOverlayRef = ref<any>(null)

// 触发就地文字编辑
const startInlineTextEdit = (node: any, initialChar?: string) => {
  if (!boardInstance.value || !node) return
  showTextOverlay.value = false
  activeInlineNode.value = node
  inlineInitialChar.value = initialChar || ''
  isInlineEditing.value = true
}

const onInlineEditorClose = () => {
  isInlineEditing.value = false
  activeInlineNode.value = null
  inlineInitialChar.value = ''
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

  if (isCanvasToolOrWidget(target)) {
    return
  }

  if (
    !target.closest('.x6-cell') &&
    !target.closest('.x6-node') &&
    !target.closest('.x6-edge')
  ) {
    if (isInlineEditing.value) {
      inlineEditorRef.value?.finish()
    }
    boardInstance.value?.drawingController.clearVectorPreview()
    boardInstance.value?.graph.cleanSelection()
    showTextOverlay.value = false
  }
}

// 选区与图形状态
const isSingleSelected = ref(false)
const selectedCount = ref(0)
const isMultiSelected = computed(() => selectedCount.value > 1)
const selectedShapeNode = shallowRef<any>(null)
const selectedMindmapNode = shallowRef<any>(null)
const isMindmapSelected = computed(() => !!selectedMindmapNode.value)
const isTextSelected = computed(() => {
  if (!isSingleSelected.value || !boardInstance.value) return false
  const selected = boardInstance.value.graph.getSelectedCells()
  if (selected.length !== 1) return false
  return boardInstance.value.isTextNode(selected[0])
})

const mindmapShapeStyle = useCellAttributes<string>(
  () => boardInstance.value,
  (cell) => {
    const data = cell.getData() as any
    return data?.shapeStyle || (data?.isRoot ? 'rect' : 'none')
  },
  'rect'
)

const isMindmapRoot = useCellAttributes<boolean>(
  () => boardInstance.value,
  (cell) => {
    const data = cell.getData() as any
    return !!data?.isRoot
  },
  false
)

const isMindmapCapsule = computed(() => {
  return isMindmapSelected.value && mindmapShapeStyle.value === 'capsule'
})

const isMindmapRect = computed(() => {
  return isMindmapSelected.value && mindmapShapeStyle.value === 'rect'
})

const isMindmapNone = computed(() => {
  return isMindmapSelected.value && mindmapShapeStyle.value === 'none'
})

const setupSelectionListeners = (board: Board) => {
  board.graph.on('selection:changed', ({ selected }: any) => {
    selectedCount.value = (selected || []).length
    const selectedNodes = (selected || []).filter((c: any) => c && c.isNode && c.isNode())
    const single = selectedNodes.length === 1
    isSingleSelected.value = single
    selectedShapeNode.value = single && board.isShapeNode(selectedNodes[0]) ? selectedNodes[0] : null
    selectedMindmapNode.value =
      single &&
      (isMindmapNode(selectedNodes[0]) || selectedNodes[0].getData()?.type === 'mindmap-node')
        ? selectedNodes[0]
        : null

    nextTick(() => {
      const transformWidgets = board.container.querySelectorAll('.x6-widget-transform')
      transformWidgets.forEach((w) => {
        if (!single) {
          ;(w as HTMLElement).style.display = 'none'
        } else {
          const node = selectedNodes[0]
          const type = node.getData()?.type
          const noRotate =
            type === 'mindmap-node' ||
            type === 'text' ||
            type === 'group' ||
            node.getData()?.isGroup ||
            node.shape === 'speed-text-node' ||
            node.shape === 'speed-freehand-path'
          w.classList.toggle('no-rotate', noRotate)
          const rotateHandle = w.querySelector('.x6-widget-transform-rotate') as HTMLElement
          if (rotateHandle) {
            rotateHandle.style.display = noRotate ? 'none' : 'block'
          }
        }
      })
    })
  })
}

const onBoardCreated = (board: Board) => {
  boardInstance.value = board
  setupTextListeners(board)
  setupSelectionListeners(board)
  setupDragListeners(board)

  board.drawingController.onModeChange = (mode) => {
    drawConfig.value.mode = mode as any
  }
  board.drawingController.onFinishVector = () => {
    showSettingsPanel.value = true
  }

  board.graph.on('node:start-edit', ({ node, initialChar }: { node: any; initialChar?: string }) => {
    startInlineTextEdit(node, initialChar)
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

const isDragging = ref(false)
const floatingToolbarRef = ref<any>(null)

watch(isDragging, (dragging) => {
  if (!dragging) {
    nextTick(() => {
      floatingToolbarRef.value?.updatePosition?.()
    })
    setTimeout(() => {
      floatingToolbarRef.value?.updatePosition?.()
    }, 60)
  }
})

const setupDragListeners = (board: Board) => {
  const onDragStart = () => {
    isDragging.value = true
  }
  const onDragEnd = () => {
    isDragging.value = false
    nextTick(() => {
      floatingToolbarRef.value?.updatePosition?.()
    })
  }

  board.graph.on('node:move', onDragStart)
  board.graph.on('node:moving', onDragStart)
  board.graph.on('node:moved', onDragEnd)
  board.graph.on('node:drag:start', onDragStart)
  board.graph.on('node:drag:end', onDragEnd)
  board.graph.on('mindmap:drag:start', onDragStart)
  board.graph.on('mindmap:drag:end', onDragEnd)

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

  if (boardInstance.value) {
    boardInstance.value.setDrawingMode(payload.mode, {
      color: payload.color || drawConfig.value.color,
      width: payload.width || drawConfig.value.width,
      opacity: payload.opacity !== undefined ? payload.opacity : drawConfig.value.opacity,
      lineType: payload.lineType || drawConfig.value.lineType,
      vectorFillColor: vectorFillColor.value,
      vectorStrokeColor: vectorStrokeColor.value,
      vectorStrokeWidth: vectorStrokeWidth.value,
      vectorStrokeDash: vectorStrokeDash.value,
      vectorOpacity: vectorOpacity.value,
    })
  }

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

  if (isTyping || showTextOverlay.value || pendingPlacement.value) {
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

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  cleanupAntdCssVars?.()
  window.removeEventListener('keydown', onKeyDown)
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
</style>
