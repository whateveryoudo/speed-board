<template>
  <div class="speed-board" :class="{ 'is-single-selected': isSingleSelected }">
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
    <div ref="canvasWrapperRef" class="speed-board-canvas-wrapper">
      <BoardCanvas :options="props.options" @created="onBoardCreated" />

      <!-- 画布图元浮动快捷工具栏 (1:1 语雀白板 Bubble Toolbar) -->
      <FloatingToolbarHost
        v-show="!isInlineEditing && !pendingPlacement && !isLineDragging && drawConfig.mode === 'select'"
        :board="boardInstance"
        :container-el="canvasWrapperRef"
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
      <textarea
        v-if="isInlineEditing"
        ref="inlineTextareaRef"
        v-model="inlineTextValue"
        class="speed-board-inline-text-editor"
        :style="inlineEditorStyle"
        @input="onInlineTextInput"
        @blur="finishInlineTextEdit"
        @keydown.esc.stop="finishInlineTextEdit"
        @keydown.enter.ctrl.stop="finishInlineTextEdit"
        @keydown.enter.meta.stop="finishInlineTextEdit"
        @keydown.stop
        @mousedown.stop
        @pointerdown.stop
        @dblclick.stop
      />

      <!-- 4 个连接桩点（Ports）与快捷连接延伸手柄 (1:1 语雀白板交互) -->
      <div v-if="drawConfig.mode === 'select' && selectedShapeNode && anchorPoints && !isInlineEditing && !isLineDragging && !pendingPlacement" class="shape-anchor-ports-container">
        <!-- 上锚点 -->
        <div
          class="shape-anchor-btn port-top"
          :style="{ left: `${anchorPoints.top.x}px`, top: `${anchorPoints.top.y}px` }"
          title="点击延伸补线"
          @click.stop="onAnchorClick('top', anchorPoints.top)"
        >
          <span class="anchor-dot" />
          <span class="anchor-arrow">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 15V3M4 8l5-5 5 5" />
            </svg>
          </span>
        </div>

        <!-- 右锚点 -->
        <div
          class="shape-anchor-btn port-right"
          :style="{ left: `${anchorPoints.right.x}px`, top: `${anchorPoints.right.y}px` }"
          title="点击延伸补线"
          @click.stop="onAnchorClick('right', anchorPoints.right)"
        >
          <span class="anchor-dot" />
          <span class="anchor-arrow">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9h12M10 4l5 5-5 5" />
            </svg>
          </span>
        </div>

        <!-- 下锚点 -->
        <div
          class="shape-anchor-btn port-bottom"
          :style="{ left: `${anchorPoints.bottom.x}px`, top: `${anchorPoints.bottom.y}px` }"
          title="点击延伸补线"
          @click.stop="onAnchorClick('bottom', anchorPoints.bottom)"
        >
          <span class="anchor-dot" />
          <span class="anchor-arrow">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 3v12M4 10l5 5 5-5" />
            </svg>
          </span>
        </div>

        <!-- 左锚点 -->
        <div
          class="shape-anchor-btn port-left"
          :style="{ left: `${anchorPoints.left.x}px`, top: `${anchorPoints.left.y}px` }"
          title="点击延伸补线"
          @click.stop="onAnchorClick('left', anchorPoints.left)"
        >
          <span class="anchor-dot" />
          <span class="anchor-arrow">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 9H3M8 4L3 9l5 5" />
            </svg>
          </span>
        </div>
      </div>

      <!-- 锚点点击快捷生成与自动补线 Popover (1:1 语雀白板快捷面板) -->
      <QuickShapeConnectPopover
        :visible="showQuickConnect"
        :x="quickConnectPos.x"
        :y="quickConnectPos.y"
        @select="onQuickConnectShapeSelect"
        @close="showQuickConnect = false"
      />

      <!-- 手绘与矢量交互覆盖层 (画笔/矢量钢笔激活时在顶层捕获并实时渲染) -->
      <svg
        v-show="isDrawingActive"
        ref="overlaySvgRef"
        class="speed-drawing-overlay"
        :class="{ 'is-vector-mode': drawConfig.mode === 'vector', 'is-line-mode': drawConfig.mode === 'line' }"
        @pointerdown="onOverlayPointerDown"
        @pointermove="onOverlayPointerMove"
        @pointerup="onOverlayPointerUp"
        @pointercancel="onOverlayPointerUp"
        @pointerleave="onOverlayPointerLeave"
        @dblclick="onOverlayDoubleClick"
      >
        <!-- 1. 随手画/画笔实时预览线 -->
        <path
          v-if="livePathD && (drawConfig.mode === 'pencil' || drawConfig.mode === 'marker')"
          :d="livePathD"
          :stroke="drawConfig.color"
          :stroke-width="drawConfig.width"
          :stroke-opacity="drawConfig.opacity"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"
        />

        <!-- 2. 矢量钢笔描点连线与闭合预览 (1:1 语雀白板矢量绘图交互) -->
        <g v-if="drawConfig.mode === 'vector' && vectorPoints.length > 0">
          <!-- 2.1 闭合多边形半透明预览面与边框 -->
          <path
            v-if="vectorPathD"
            :d="vectorPathD"
            :stroke="vectorStrokeColor"
            :stroke-width="vectorStrokeWidth"
            :stroke-dasharray="vectorStrokeDash === 'none' ? undefined : vectorStrokeDash"
            :fill="vectorFillColor === 'transparent' ? 'none' : vectorFillColor"
            :fill-opacity="vectorOpacity * 0.45"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <!-- 2.2 鼠标引线 (橡皮筋参考辅助虚线) -->
          <line
            v-if="cursorPos && vectorPoints.length > 0"
            :x1="vectorPoints[vectorPoints.length - 1].ox"
            :y1="vectorPoints[vectorPoints.length - 1].oy"
            :x2="cursorPos.ox"
            :y2="cursorPos.oy"
            stroke="#9ca3af"
            stroke-width="1.5"
            stroke-dasharray="3,3"
          />

          <!-- 2.3 各锚点顶点小圆点 -->
          <circle
            v-for="(p, i) in vectorPoints"
            :key="i"
            :cx="p.ox"
            :cy="p.oy"
            r="4.5"
            fill="#ffffff"
            stroke="#374151"
            stroke-width="1.5"
          />

          <!-- 2.4 起点闭合磁吸提示圆环 (靠近起点时高亮扩散动效) -->
          <circle
            v-if="vectorPoints.length >= 3 && isNearStart"
            :cx="vectorPoints[0].ox"
            :cy="vectorPoints[0].oy"
            r="8"
            fill="rgba(59, 130, 246, 0.25)"
            stroke="#3b82f6"
            stroke-width="2"
            class="snap-start-pulse"
          />
        </g>

        <!-- 3. 连线工具拖拽实时引线与箭头预览 (折线/直线/曲线) -->
        <g v-if="drawConfig.mode === 'line' && isLineDragging && lineStartPoint && lineEndPoint">
          <defs>
            <marker
              id="speed-line-preview-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="9"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 2 L 9 5 L 0 8 Z" fill="#374151" />
            </marker>
          </defs>

          <!-- 3.1 直线预览 -->
          <line
            v-if="drawConfig.lineType === 'straight'"
            :x1="lineStartPoint.ox"
            :y1="lineStartPoint.oy"
            :x2="lineEndPoint.ox"
            :y2="lineEndPoint.oy"
            stroke="#374151"
            stroke-width="2"
            stroke-dasharray="4,4"
            marker-end="url(#speed-line-preview-arrow)"
          />

          <!-- 3.2 折线预览 -->
          <path
            v-else-if="drawConfig.lineType === 'elbow'"
            :d="lineElbowPathD"
            stroke="#374151"
            stroke-width="2"
            fill="none"
            stroke-dasharray="4,4"
            marker-end="url(#speed-line-preview-arrow)"
          />

          <!-- 3.3 曲线预览 -->
          <path
            v-else-if="drawConfig.lineType === 'curve'"
            :d="lineCurvePathD"
            stroke="#374151"
            stroke-width="2"
            fill="none"
            stroke-dasharray="4,4"
            marker-end="url(#speed-line-preview-arrow)"
          />

          <!-- 起点小抓手点 (普通未吸附展示灰白圈；若吸附在边缘自由位置，展示实心蓝点；若吸附在固定桩，由桩本身高亮) -->
          <circle
            v-if="!lineStartSnapped"
            :cx="lineStartPoint.ox"
            :cy="lineStartPoint.oy"
            r="4"
            fill="#ffffff"
            stroke="#374151"
            stroke-width="1.5"
          />
          <circle
            v-else-if="isStartBorderAnchor"
            :cx="lineStartPoint.ox"
            :cy="lineStartPoint.oy"
            r="5"
            fill="#2563eb"
            stroke="#2563eb"
            stroke-width="1"
          />

          <!-- 终点抓手点 (若吸附在边缘自由位置，展示实心蓝点 1:1 语雀) -->
          <circle
            v-if="!lineEndSnapped"
            :cx="lineEndPoint.ox"
            :cy="lineEndPoint.oy"
            r="4"
            fill="#ffffff"
            stroke="#374151"
            stroke-width="1.5"
          />
          <circle
            v-else-if="activeBorderSlidePoint"
            :cx="activeBorderSlidePoint.ox"
            :cy="activeBorderSlidePoint.oy"
            r="5"
            fill="#2563eb"
            stroke="#2563eb"
            stroke-width="1"
          />
        </g>

        <!-- 4. 连线工具未按住拖拽时，沿形状边缘滑动的预吸附实心蓝点 (1:1 语雀) -->
        <circle
          v-if="drawConfig.mode === 'line' && !isLineDragging && hoverBorderSlidePoint"
          :cx="hoverBorderSlidePoint.ox"
          :cy="hoverBorderSlidePoint.oy"
          r="5"
          fill="#2563eb"
          stroke="#2563eb"
          stroke-width="1"
        />
      </svg>

      <!-- 语雀白板 1:1 鼠标跟随放置预览图层 (Ghost Placement Overlay) -->
      <div
        v-if="pendingPlacement"
        class="speed-placement-overlay"
        @pointerleave="onPlacementPointerLeave"
        @pointermove="onPlacementPointerMove"
        @pointerdown="onPlacementPointerDown"
        @contextmenu.prevent="cancelPlacement"
      >
        <transition name="ghost-fade">
          <div
            v-if="isPlacementHovering && placementMousePos"
            class="speed-placement-ghost"
            :style="placementGhostStyle"
          >
            <!-- 1. 文本图元预览 -->
            <div
              v-if="pendingPlacement.type === 'text'"
              class="placement-ghost-text"
              :style="{
                width: `${pendingPlacement.width * currentZoom}px`,
                height: `${pendingPlacement.height * currentZoom}px`,
                fontSize: `${14 * currentZoom}px`,
              }"
            >
              <span>{{ pendingPlacement.textConfig?.text || '文本' }}</span>
            </div>

            <!-- 2. 全量矢量图形预览 -->
            <div
              v-else-if="pendingPlacement.type === 'shape' && pendingPlacement.shapeConfig"
              class="placement-ghost-shape"
              :style="{
                width: `${pendingPlacement.width * currentZoom}px`,
                height: `${pendingPlacement.height * currentZoom}px`,
              }"
            >
              <svg
                :viewBox="pendingPlacement.shapeConfig.viewBox || '6 6 20 20'"
                preserveAspectRatio="none"
                style="width: 100%; height: 100%; display: block;"
                v-html="pendingPlacement.shapeConfig.svgContent"
              />
            </div>

            <!-- 3. 素材图标预览 -->
            <div
              v-else-if="pendingPlacement.type === 'icon' && pendingPlacement.iconConfig"
              class="placement-ghost-icon"
              :style="{
                width: `${pendingPlacement.width * currentZoom}px`,
                height: `${pendingPlacement.height * currentZoom}px`,
              }"
              v-html="pendingPlacement.iconConfig.svg"
            />

            <!-- 4. 基础主题/思维导图预览 -->
            <div
              v-else-if="pendingPlacement.type === 'basic' && pendingPlacement.basicConfig"
              class="placement-ghost-basic"
              :style="{
                width: `${pendingPlacement.width * currentZoom}px`,
                height: `${pendingPlacement.height * currentZoom}px`,
                backgroundColor: pendingPlacement.basicConfig.fill || '#ede9fe',
                borderColor: pendingPlacement.basicConfig.stroke || '#8b5cf6',
                fontSize: `${14 * currentZoom}px`,
              }"
            >
              <span>{{ pendingPlacement.basicConfig.text }}</span>
            </div>
          </div>
        </transition>
      </div>

      <!-- 3. 图元旋转实时度数指示气泡 (1:1 语雀白板风格) -->
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
import { BoardCanvas, type BoardOptions } from '@speed-board/vue3'
import { Board } from '@speed-board/core'
import { useAntdCssVars } from 'speed-components-ui/hooks'
import LeftToolbar, { type PendingPlacementItem, type BoardUploadConfig } from './LeftToolbar.vue'
import TopToolbar from './TopToolbar.vue'
import StyleSettingsPanel from './StyleSettingsPanel.vue'
import TextOverlayEditor from './TextOverlayEditor.vue'
import QuickShapeConnectPopover from './QuickShapeConnectPopover.vue'
import FloatingToolbarHost from './floatingToolbar/FloatingToolbarHost.vue'
import { renderShapeCanvasSvg, getShapeTightViewBox, type ShapeDefinition } from '../data/shapeLibrary'
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

const emit = defineEmits<{
  (e: 'created', board: Board): void
  (e: 'save'): void
}>()

const showLeftToolbar = ref(true)
const showSettingsPanel = ref(false)

// 注入并管理 Ant Design Vue CSS 变量 (--ant-*)
const { cleanup: cleanupAntdCssVars } = useAntdCssVars()

const boardInstance = shallowRef<Board | null>(null)

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
  if (!node || !boardInstance.value) return

  rotatingDegreeText.value = formatDegree(node.getAngle() || 0)

  const bbox = node.getBBox()
  const bottomCenter = {
    x: bbox.x + bbox.width / 2,
    y: bbox.y + bbox.height + 32,
  }

  const clientPt = boardInstance.value.graph.localToClient(bottomCenter.x, bottomCenter.y)
  const overlayRect = overlaySvgRef.value?.getBoundingClientRect()
  if (overlayRect) {
    rotationBadgePos.value = {
      x: clientPt.x - overlayRect.left,
      y: clientPt.y - overlayRect.top,
    }
  } else {
    rotationBadgePos.value = {
      x: clientPt.x,
      y: clientPt.y,
    }
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

// 文本选框内就地打字状态 (1:1 语雀白板就地输入体验)
const canvasWrapperRef = ref<HTMLDivElement | null>(null)
const inlineTextareaRef = ref<HTMLTextAreaElement | null>(null)
const isInlineEditing = ref(false)
const inlineTextValue = ref('')
const activeInlineNode = shallowRef<any>(null)
const inlineUpdateTick = ref(0)

const inlineEditorStyle = computed(() => {
  // 依赖 inlineUpdateTick 保证缩放/平移/尺寸变化响应
  void inlineUpdateTick.value

  if (!activeInlineNode.value || !boardInstance.value || !canvasWrapperRef.value) {
    return { display: 'none' }
  }

  const node = activeInlineNode.value
  const bbox = node.getBBox()
  const zoom = boardInstance.value.graph.zoom()
  const centerPt = boardInstance.value.graph.localToClient(
    bbox.x + bbox.width / 2,
    bbox.y + bbox.height / 2
  )
  const wrapperRect = canvasWrapperRef.value.getBoundingClientRect()
  const w = bbox.width * zoom
  const h = bbox.height * zoom
  const left = centerPt.x - wrapperRect.left - w / 2
  const top = centerPt.y - wrapperRect.top - h / 2
  const angle = node.getAngle() || 0

  const attrs = node.getAttrs()?.label || {}
  const data = node.getData() || {}
  const fontSize = Number(attrs.fontSize ?? data.fontSize ?? 14) * zoom
  const color = (attrs.fill as string) ?? (data.fill as string) ?? '#262626'
  const fontWeight = attrs.fontWeight === 'bold' || data.bold ? 'bold' : 'normal'
  const fontStyle = attrs.fontStyle === 'italic' || data.italic ? 'italic' : 'normal'
  let textDecoration = 'none'
  if (data.underline && data.strike) textDecoration = 'underline line-through'
  else if (data.underline) textDecoration = 'underline'
  else if (data.strike) textDecoration = 'line-through'

  const align = data.align || 'center'
  const verticalAlign = data.verticalAlign || 'middle'

  // 计算行高与文本高度，实现与 SVG text 垂直居中精确匹配
  const lineH = fontSize * 1.45
  const lineCount = Math.max(1, (inlineTextValue.value || '').split('\n').length)
  const approxTextH = lineCount * lineH
  let paddingTop = 6
  if (verticalAlign === 'middle') {
    paddingTop = Math.max(6, (h - approxTextH) / 2)
  } else if (verticalAlign === 'bottom') {
    paddingTop = Math.max(6, h - approxTextH - 8)
  }

  return {
    position: 'absolute' as const,
    left: `${left}px`,
    top: `${top}px`,
    width: `${w}px`,
    height: `${h}px`,
    fontSize: `${fontSize}px`,
    color,
    fontWeight,
    fontStyle,
    textDecoration,
    textAlign: align === 'justify' ? 'left' : (align as any),
    paddingTop: `${paddingTop}px`,
    transform: angle ? `rotate(${angle}deg)` : undefined,
    transformOrigin: 'center center',
    zIndex: 90,
  }
})

const startInlineTextEdit = (node: any) => {
  if (!boardInstance.value || !node) return
  // 确保链接悬浮框收起
  showTextOverlay.value = false

  if (isInlineEditing.value && activeInlineNode.value) {
    finishInlineTextEdit()
  }

  activeInlineNode.value = node
  const data = node.getData() || {}
  const attrs = node.getAttrs()?.label || {}
  const text = (attrs.text as string) ?? (data.text as string) ?? ''
  inlineTextValue.value = text

  // 临时隐藏 SVG 文本，让用户在选框内透明就地输入，无重影
  node.setAttrByPath('label/visibility', 'hidden')

  isInlineEditing.value = true
  inlineUpdateTick.value++

  nextTick(() => {
    if (inlineTextareaRef.value) {
      inlineTextareaRef.value.focus()
      inlineTextareaRef.value.select()
    }
  })
}

const finishInlineTextEdit = () => {
  if (!isInlineEditing.value) return
  isInlineEditing.value = false

  if (activeInlineNode.value && boardInstance.value) {
    const text = inlineTextValue.value
    if (boardInstance.value.isShapeNode(activeInlineNode.value)) {
      boardInstance.value.updateShapeNode(activeInlineNode.value, { text })
    } else {
      boardInstance.value.updateTextNode(activeInlineNode.value, { text })
    }
    activeInlineNode.value.setAttrByPath('label/visibility', 'visible')
  }
  activeInlineNode.value = null
  inlineUpdateTick.value++
}

const onInlineTextInput = (e: Event) => {
  if (!activeInlineNode.value || !boardInstance.value) return
  const textarea = e.target as HTMLTextAreaElement
  const text = textarea.value
  inlineTextValue.value = text

  if (boardInstance.value.isShapeNode(activeInlineNode.value)) {
    boardInstance.value.updateShapeNode(activeInlineNode.value, { text })
  } else {
    boardInstance.value.updateTextNode(activeInlineNode.value, { text })
  }
  inlineUpdateTick.value++
}

// 链接专用 Overlay 面板状态 (仅在点击右侧“添加链接”/“编辑”时呼出)
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
  finishInlineTextEdit()

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
    // 插入文本时直接在选框内就地进入编辑打字，不弹窗
    startInlineTextEdit(payload.node)
  }
}

const onOpenLinkOverlay = () => {
  // 仅在点击右侧面板“添加链接”或“编辑”时才呼出弹框
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
  // 双击文本或图形图元：直接在选框内激活就地打字（不弹窗）
  board.graph.on('node:dblclick', ({ node }: any) => {
    if (board.isTextNode(node) || board.isShapeNode(node)) {
      startInlineTextEdit(node)
    }
  })

  // 点击画布空白处：完成就地输入，并关闭链接弹框
  board.graph.on('blank:click', () => {
    finishInlineTextEdit()
    showTextOverlay.value = false
  })

  // 选中其他节点时：完成就地输入，并关闭链接弹框
  board.graph.on('node:click', ({ node }: any) => {
    if (isInlineEditing.value && node !== activeInlineNode.value) {
      finishInlineTextEdit()
    }
    if (showTextOverlay.value && node !== activeLinkNode.value) {
      showTextOverlay.value = false
    }
  })

  // 画布缩放、平移以及节点移动时，同步更新选框内输入框与链接弹框位置
  board.graph.on('scale', () => {
    inlineUpdateTick.value++
    if (showTextOverlay.value) updateTextOverlayPos()
  })
  board.graph.on('translate', () => {
    inlineUpdateTick.value++
    if (showTextOverlay.value) updateTextOverlayPos()
  })
  board.graph.on('node:change:position', () => {
    inlineUpdateTick.value++
    if (showTextOverlay.value) updateTextOverlayPos()
  })
}

// 选中图形节点与周围 4 个连接桩点（Ports）交互
const selectedShapeNode = shallowRef<any>(null)
const isSingleSelected = ref(false)
const anchorTick = ref(0)
const showQuickConnect = ref(false)
const quickConnectPos = ref({ x: 0, y: 0 })
const quickConnectDirection = ref<'top' | 'right' | 'bottom' | 'left'>('right')
const activeAnchorEdge = shallowRef<any>(null)

const anchorPoints = computed(() => {
  anchorTick.value
  if (!selectedShapeNode.value || !boardInstance.value || !canvasWrapperRef.value) return null
  try {
    const node = selectedShapeNode.value
    const graph = boardInstance.value.graph
    const view = graph.findViewByCell(node)
    if (!view || !view.container) return null

    const cellElem = view.container as SVGElement
    const cellRect = cellElem.getBoundingClientRect()
    const wrapperRect = canvasWrapperRef.value.getBoundingClientRect()

    const cx = cellRect.left - wrapperRect.left + cellRect.width / 2
    const cy = cellRect.top - wrapperRect.top + cellRect.height / 2
    const zoom = graph.zoom()
    const size = node.size()
    const halfW = (size.width * zoom) / 2
    const halfH = (size.height * zoom) / 2
    const offset = 14
    const angle = (node.getAngle() || 0) * (Math.PI / 180)
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    const rotatePoint = (dx: number, dy: number) => ({
      x: cx + (dx * cos - dy * sin),
      y: cy + (dx * sin + dy * cos),
    })

    return {
      top: rotatePoint(0, -(halfH + offset)),
      right: rotatePoint(halfW + offset, 0),
      bottom: rotatePoint(0, halfH + offset),
      left: rotatePoint(-(halfW + offset), 0),
    }
  } catch {
    return null
  }
})

const onAnchorClick = (direction: 'top' | 'right' | 'bottom' | 'left', point: { x: number; y: number }) => {
  quickConnectDirection.value = direction
  if (!selectedShapeNode.value || !boardInstance.value) return

  const sourceNode = selectedShapeNode.value
  const sourcePos = sourceNode.position()
  const sourceSize = sourceNode.size()

  let targetGraphPt = { x: sourcePos.x, y: sourcePos.y }
  if (direction === 'right') {
    targetGraphPt = { x: sourcePos.x + sourceSize.width + 120, y: sourcePos.y + sourceSize.height / 2 }
  } else if (direction === 'left') {
    targetGraphPt = { x: sourcePos.x - 120, y: sourcePos.y + sourceSize.height / 2 }
  } else if (direction === 'bottom') {
    targetGraphPt = { x: sourcePos.x + sourceSize.width / 2, y: sourcePos.y + sourceSize.height + 100 }
  } else if (direction === 'top') {
    targetGraphPt = { x: sourcePos.x + sourceSize.width / 2, y: sourcePos.y - 100 }
  }

  // 1. 点击锚点立即自动生成深色黑色连线并挂载（默认 Elbow 正交折线 + 箭头，即使后续取消选框也永久保留连线）
  const edge = boardInstance.value.addLine({
    type: 'elbow',
    source: { cell: sourceNode.id, port: direction },
    target: targetGraphPt,
    stroke: '#374151',
    strokeWidth: 2,
  })
  activeAnchorEdge.value = edge

  // 2. 计算快捷连接选择器弹窗坐标（放置在延伸线终点附近）
  let posX = point.x
  let posY = point.y
  if (direction === 'right') posX += 100
  else if (direction === 'left') posX -= 345
  else if (direction === 'bottom') posY += 90
  else if (direction === 'top') posY -= 220

  quickConnectPos.value = {
    x: Math.max(10, posX),
    y: Math.max(10, posY),
  }
  showQuickConnect.value = true
}

const onQuickConnectShapeSelect = (shape: ShapeDefinition) => {
  if (!selectedShapeNode.value || !boardInstance.value) return
  const sourceNode = selectedShapeNode.value
  const sourcePos = sourceNode.position()
  const sourceSize = sourceNode.size()
  const sourceData = sourceNode.getData() || {}
  const dir = quickConnectDirection.value

  const targetWidth = 100
  const targetHeight = 80
  let targetX = sourcePos.x
  let targetY = sourcePos.y
  let sourcePort = 'right'
  let targetPort = 'left'

  if (dir === 'right') {
    targetX = sourcePos.x + sourceSize.width + 120
    targetY = sourcePos.y + (sourceSize.height - targetHeight) / 2
    sourcePort = 'right'
    targetPort = 'left'
  } else if (dir === 'left') {
    targetX = sourcePos.x - 120 - targetWidth
    targetY = sourcePos.y + (sourceSize.height - targetHeight) / 2
    sourcePort = 'left'
    targetPort = 'right'
  } else if (dir === 'bottom') {
    targetX = sourcePos.x + (sourceSize.width - targetWidth) / 2
    targetY = sourcePos.y + sourceSize.height + 100
    sourcePort = 'bottom'
    targetPort = 'top'
  } else if (dir === 'top') {
    targetX = sourcePos.x + (sourceSize.width - targetWidth) / 2
    targetY = sourcePos.y - 100 - targetHeight
    sourcePort = 'top'
    targetPort = 'bottom'
  }

  const fill = sourceData.fill !== undefined ? sourceData.fill : '#ffffff'
  const stroke = sourceData.stroke || '#374151'
  const strokeWidth = sourceData.strokeWidth || 2

  const svgContent = renderShapeCanvasSvg(shape, {
    fill,
    stroke,
    strokeWidth,
  })
  const viewBox = getShapeTightViewBox(svgContent, shape.id)

  // 1. 创建目标图形节点（紧凑无内边距）
  const targetNode = boardInstance.value.addVectorShape({
    shapeId: shape.id,
    shapeName: shape.name,
    svgContent,
    viewBox,
    x: targetX,
    y: targetY,
    width: targetWidth,
    height: targetHeight,
    fill,
    stroke,
    strokeWidth,
    strokeDasharray: 'none',
    opacity: 1,
    text: '',
  })

  // 2. 将之前立即生成的深色黑色连线目标端点无缝对接至新图形端口
  if (activeAnchorEdge.value) {
    activeAnchorEdge.value.setTarget({
      cell: targetNode.id,
      port: targetPort,
    })
  } else {
    boardInstance.value.connectNodes({
      source: sourceNode,
      target: targetNode,
      sourcePort,
      targetPort,
      stroke: '#374151',
      strokeWidth: 2,
    })
  }
  activeAnchorEdge.value = null

  // 3. 选中新创建的节点
  boardInstance.value.graph.cleanSelection()
  boardInstance.value.graph.select(targetNode)

  showQuickConnect.value = false
}

const setupShapeAnchorListeners = (board: Board) => {
  const onTick = () => {
    anchorTick.value++
  }

  // 监听全局滚动 (使用 capture 捕获包括 scroller 容器在内的所有原生滚动事件，确保零漂移)
  window.addEventListener('scroll', onTick, true)
  window.addEventListener('resize', onTick)
  canvasWrapperRef.value?.addEventListener('wheel', onTick, { passive: true })

  board.graph.on('selection:changed', ({ selected }: any) => {
    showQuickConnect.value = false
    activeAnchorEdge.value = null
    const selectedNodes = (selected || []).filter((c: any) => c.isNode())
    isSingleSelected.value = selectedNodes.length === 1
    if (selectedNodes.length === 1 && board.isShapeNode(selectedNodes[0])) {
      selectedShapeNode.value = selectedNodes[0]
    } else {
      selectedShapeNode.value = null
    }
    anchorTick.value++
  })

  board.graph.on('node:change:position', onTick)
  board.graph.on('node:change:size', onTick)
  board.graph.on('node:change:angle', onTick)
  board.graph.on('node:moving', onTick)
  board.graph.on('node:moved', onTick)
  board.graph.on('node:resizing', onTick)
  board.graph.on('node:resized', onTick)
  board.graph.on('node:rotating', onTick)
  board.graph.on('node:rotated', onTick)
  board.graph.on('scale', onTick)
  board.graph.on('translate', onTick)
  board.graph.on('render:done', onTick)

  board.graph.on('blank:click', () => {
    showQuickConnect.value = false
    activeAnchorEdge.value = null
  })
}

const onBoardCreated = (board: Board) => {
  boardInstance.value = board
  setupRotationListeners(board)
  setupTextListeners(board)
  setupShapeAnchorListeners(board)
  emit('created', board)
}

const onSave = () => {
  emit('save')
}

// 手绘模式与笔触参数状态
const drawConfig = ref<{
  mode: 'select' | 'pencil' | 'marker' | 'eraser' | 'vector' | 'line'
  lineType?: 'elbow' | 'straight' | 'curve'
  color: string
  width: number
  opacity: number
}>({
  mode: 'select',
  lineType: 'straight',
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

const isDrawingActive = computed(() => {
  return (
    drawConfig.value.mode === 'pencil' ||
    drawConfig.value.mode === 'marker' ||
    drawConfig.value.mode === 'vector' ||
    drawConfig.value.mode === 'line'
  )
})

// ==================== 语雀白板 1:1 鼠标跟随放置模式 (Ghost Placement Mode) ====================
const pendingPlacement = ref<PendingPlacementItem | null>(null)
const placementMousePos = ref<{ x: number; y: number } | null>(null)
const isPlacementHovering = ref(false)
let lastClientPos: { x: number; y: number } | null = null

const currentZoom = computed(() => {
  anchorTick.value
  return boardInstance.value ? boardInstance.value.graph.zoom() : 1
})

const placementGhostStyle = computed(() => {
  if (!pendingPlacement.value || !placementMousePos.value) return {}
  const zoom = currentZoom.value
  const w = pendingPlacement.value.width * zoom
  const h = pendingPlacement.value.height * zoom
  const left = placementMousePos.value.x - w / 2
  const top = placementMousePos.value.y - h / 2

  return {
    position: 'absolute' as const,
    left: `${left}px`,
    top: `${top}px`,
    width: `${w}px`,
    height: `${h}px`,
    pointerEvents: 'none' as const,
    zIndex: 1,
  }
})

const onStartPlacement = (item: PendingPlacementItem) => {
  // 清除画布可能存在的选中状态与弹框
  boardInstance.value?.graph.cleanSelection()
  selectedShapeNode.value = null
  showQuickConnect.value = false
  showTextOverlay.value = false

  // 退出画笔/连线等手绘模式
  drawConfig.value.mode = 'select'
  boardInstance.value?.setDrawingMode('select')

  pendingPlacement.value = item

  // 1:1 语雀白板交互：点击选择图元后绝不立即展示虚影，必须等鼠标进入画板区域且发生移动后才显现跟随
  placementMousePos.value = null
  isPlacementHovering.value = false
}

const cancelPlacement = () => {
  pendingPlacement.value = null
  placementMousePos.value = null
  isPlacementHovering.value = false
}

const onPlacementPointerMove = (e: PointerEvent) => {
  lastClientPos = { x: e.clientX, y: e.clientY }
  if (!canvasWrapperRef.value || !pendingPlacement.value) return
  const rect = canvasWrapperRef.value.getBoundingClientRect()
  placementMousePos.value = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }
  isPlacementHovering.value = true
}

const onPlacementPointerLeave = () => {
  isPlacementHovering.value = false
}

const onPlacementPointerDown = (e: PointerEvent) => {
  if (!pendingPlacement.value || !boardInstance.value) return

  // 右键点击取消放置
  if (e.button === 2) {
    cancelPlacement()
    return
  }

  // 仅在左键且已在画板移动显现虚影后响应放置 (避免在工具栏点击时误触立即放置)
  if (e.button !== 0 || !isPlacementHovering.value || !placementMousePos.value) return

  e.preventDefault()
  e.stopPropagation()

  const item = pendingPlacement.value
  const graph = boardInstance.value.graph
  const local = graph.clientToLocal(e.clientX, e.clientY)
  const targetX = Math.round(local.x - item.width / 2)
  const targetY = Math.round(local.y - item.height / 2)

  let node: any = null

  if (item.type === 'text') {
    node = boardInstance.value.addShape({
      shape: 'text',
      x: targetX,
      y: targetY,
      width: item.width,
      height: item.height,
      ...item.textConfig,
    })
  } else if (item.type === 'shape' && item.shapeConfig) {
    node = boardInstance.value.addVectorShape({
      x: targetX,
      y: targetY,
      width: item.width,
      height: item.height,
      ...item.shapeConfig,
    })
  } else if (item.type === 'icon' && item.iconConfig) {
    node = boardInstance.value.addSvgIcon({
      x: targetX,
      y: targetY,
      width: item.width,
      height: item.height,
      ...item.iconConfig,
    })
  } else if (item.type === 'basic' && item.basicConfig) {
    node = boardInstance.value.addShape({
      x: targetX,
      y: targetY,
      width: item.width,
      height: item.height,
      ...(item.basicConfig as any),
    })
  }

  cancelPlacement()

  if (node) {
    graph.cleanSelection()
    graph.select(node)
    graph.trigger('selection:changed', { selected: [node] })

    // 文本放置后立即在选框内就地进入编辑打字 (1:1 语雀白板交互)
    if (item.type === 'text') {
      nextTick(() => {
        startInlineTextEdit(node)
      })
    }
  }
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

  // 当切换工具模式时，清理选框并关闭快捷建图手柄
  if (payload.mode !== 'select') {
    boardInstance.value?.graph.cleanSelection()
    selectedShapeNode.value = null
    showQuickConnect.value = false
  }

  // 退出或切换模式时隐藏所有锚点，仅在连线模式下接触形状时动态显示
  boardInstance.value?.hideAllPorts()
  hoveredPortNode.value = null

  if (payload.mode === 'vector') {
    // 激活矢量钢笔时，展开右侧样式设置面板以供随时调配颜色梯度与边框
    showSettingsPanel.value = true
    vectorPoints.value = []
    cursorPos.value = null
  } else if (payload.mode === 'line') {
    isLineDragging.value = false
    lineStartPoint.value = null
    lineEndPoint.value = null
    lineStartSnapped.value = null
    lineEndSnapped.value = null
    activeSnapPort.value = null
  }
}

const onStyleSettingsChange = (payload: {
  fill?: string
  stroke?: string
  strokeWidth?: number
  strokeDasharray?: string
  opacity?: number
}) => {
  if (payload.fill !== undefined) vectorFillColor.value = payload.fill
  if (payload.stroke !== undefined) vectorStrokeColor.value = payload.stroke
  if (payload.strokeWidth !== undefined) vectorStrokeWidth.value = payload.strokeWidth
  if (payload.strokeDasharray !== undefined) vectorStrokeDash.value = payload.strokeDasharray
  if (payload.opacity !== undefined) vectorOpacity.value = payload.opacity
}

// 实时手绘与矢量钢笔交互引擎
const overlaySvgRef = ref<SVGSVGElement | null>(null)
const isDrawing = ref(false)
const livePathD = ref('')
const livePoints = ref<Array<{ x: number; y: number }>>([])
const clientPoints = ref<Array<{ x: number; y: number }>>([])

// 连线工具拖拽状态与真实连接桩（Ports）磁吸关联
const isLineDragging = ref(false)
const lineStartPoint = ref<{ ox: number; oy: number; clientX: number; clientY: number } | null>(null)
const lineEndPoint = ref<{ ox: number; oy: number; clientX: number; clientY: number } | null>(null)
const lineStartSnapped = ref<{ cell: string; port?: string; anchor?: any } | null>(null)
const lineEndSnapped = ref<{ cell: string; port?: string; anchor?: any } | null>(null)
const activeSnapPort = ref<{ ox: number; oy: number; clientX: number; clientY: number } | null>(null)
const activeBorderSlidePoint = ref<{ ox: number; oy: number } | null>(null)
const hoverBorderSlidePoint = ref<{ ox: number; oy: number } | null>(null)
const hoveredPortNode = shallowRef<any>(null)

const isStartBorderAnchor = computed(() => {
  return !!lineStartSnapped.value && 'anchor' in lineStartSnapped.value
})

export interface PortSnapResult {
  node: any
  isCenterPort: boolean
  port?: 'top' | 'right' | 'bottom' | 'left'
  edge: 'top' | 'right' | 'bottom' | 'left'
  offset: number
  localPoint: { x: number; y: number }
  screenPoint: { ox: number; oy: number; clientX: number; clientY: number }
  distance: number
}

/**
 * 寻找最近的图形节点连接桩或边缘吸附点 (支持4角锚点、边缘自由滑动吸附、旋转与局部坐标变换)
 */
const findClosestPort = (localPt: { x: number; y: number }, snapRadius = 45): PortSnapResult | null => {
  if (!boardInstance.value) return null
  const graph = boardInstance.value.graph
  const nodes = graph.getNodes()
  let closest: PortSnapResult | null = null

  for (const node of nodes) {
    if (!boardInstance.value.isShapeNode(node)) continue
    const pos = node.position()
    const size = node.size()
    if (!size || size.width <= 0 || size.height <= 0) continue

    const cx = pos.x + size.width / 2
    const cy = pos.y + size.height / 2
    const angle = (node.getAngle() || 0) * (Math.PI / 180)
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    // 将局部坐标反向旋转到以未旋转节点为基准的坐标系
    const dx = localPt.x - cx
    const dy = localPt.y - cy
    const unrotatedX = cx + (dx * cos + dy * sin)
    const unrotatedY = cy + (-dx * sin + dy * cos)

    const leftX = pos.x
    const rightX = pos.x + size.width
    const topY = pos.y
    const bottomY = pos.y + size.height

    // 拓宽吸附捕获半径 (默认 45px)，让光标接近任何边线时都能稳定吸附并不易意外脱落
    const snapThreshold = snapRadius

    const isInside =
      unrotatedX >= leftX &&
      unrotatedX <= rightX &&
      unrotatedY >= topY &&
      unrotatedY <= bottomY

    const isNear =
      unrotatedX >= leftX - snapThreshold &&
      unrotatedX <= rightX + snapThreshold &&
      unrotatedY >= topY - snapThreshold &&
      unrotatedY <= bottomY + snapThreshold

    if (!isInside && !isNear) continue

    // 角部边距设为极小 2px，彻底释放整条边线，几乎从头到尾都能顺畅滑动
    const cornerPad = 2
    const clampedX = Math.max(leftX + cornerPad, Math.min(rightX - cornerPad, unrotatedX))
    const clampedY = Math.max(topY + cornerPad, Math.min(bottomY - cornerPad, unrotatedY))

    // 计算到4条边的垂直/最短投影距离
    const distTop = Math.hypot(unrotatedX - clampedX, unrotatedY - topY)
    const distBottom = Math.hypot(unrotatedX - clampedX, unrotatedY - bottomY)
    const distLeft = Math.hypot(unrotatedX - leftX, unrotatedY - clampedY)
    const distRight = Math.hypot(unrotatedX - rightX, unrotatedY - clampedY)

    const edgeCandidates: Array<{
      edge: 'top' | 'right' | 'bottom' | 'left'
      dist: number
      projX: number
      projY: number
      midCoord: number
      curCoord: number
    }> = [
      { edge: 'top', dist: distTop, projX: clampedX, projY: topY, midCoord: cx, curCoord: clampedX },
      { edge: 'bottom', dist: distBottom, projX: clampedX, projY: bottomY, midCoord: cx, curCoord: clampedX },
      { edge: 'left', dist: distLeft, projX: leftX, projY: clampedY, midCoord: cy, curCoord: clampedY },
      { edge: 'right', dist: distRight, projX: rightX, projY: clampedY, midCoord: cy, curCoord: clampedY },
    ]

    edgeCandidates.sort((a, b) => a.dist - b.dist)
    const best = edgeCandidates[0]

    // 如果不在内部且距离最近边缘超过吸附阈值，则不触发
    if (!isInside && best.dist > snapThreshold) continue

    // 核心吸附逻辑：
    // 正中磁吸死区缩小为适度的 6px（正负6px内才吸附正中，其余均可丝滑平移放置）
    // 彻底解决侧边线 (如高度较小) 几乎全部被正中点死锁而无法滑动到其他位置的问题
    const centerDist = Math.abs(best.curCoord - best.midCoord)
    const isCenterSnap = centerDist <= 6

    let finalUnrotatedX = best.projX
    let finalUnrotatedY = best.projY
    let offset = best.curCoord - best.midCoord

    if (isCenterSnap) {
      if (best.edge === 'top' || best.edge === 'bottom') {
        finalUnrotatedX = cx
      } else {
        finalUnrotatedY = cy
      }
      offset = 0
    }

    // 将投影/吸附点旋转回画布实际坐标
    const ddx = finalUnrotatedX - cx
    const ddy = finalUnrotatedY - cy
    const rotatedPt = {
      x: cx + (ddx * cos - ddy * sin),
      y: cy + (ddx * sin + ddy * cos),
    }

    const distFromMouse = Math.hypot(localPt.x - rotatedPt.x, localPt.y - rotatedPt.y)

    if (!closest || distFromMouse < closest.distance) {
      const clientPt = graph.localToClient(rotatedPt.x, rotatedPt.y)
      const svgRect = overlaySvgRef.value?.getBoundingClientRect()
      const ox = svgRect ? clientPt.x - svgRect.left : 0
      const oy = svgRect ? clientPt.y - svgRect.top : 0

      closest = {
        node,
        isCenterPort: isCenterSnap,
        port: isCenterSnap ? best.edge : undefined,
        edge: best.edge,
        offset,
        localPoint: rotatedPt,
        screenPoint: { ox, oy, clientX: clientPt.x, clientY: clientPt.y },
        distance: distFromMouse,
      }
    }
  }

  return closest
}

const lineElbowPathD = computed(() => {
  if (!lineStartPoint.value || !lineEndPoint.value) return ''
  const p1 = lineStartPoint.value
  const p2 = lineEndPoint.value
  const midX = (p1.ox + p2.ox) / 2
  return `M ${p1.ox.toFixed(1)} ${p1.oy.toFixed(1)} L ${midX.toFixed(1)} ${p1.oy.toFixed(1)} L ${midX.toFixed(1)} ${p2.oy.toFixed(1)} L ${p2.ox.toFixed(1)} ${p2.oy.toFixed(1)}`
})

const lineCurvePathD = computed(() => {
  if (!lineStartPoint.value || !lineEndPoint.value) return ''
  const p1 = lineStartPoint.value
  const p2 = lineEndPoint.value
  const dx = p2.ox - p1.ox
  return `M ${p1.ox.toFixed(1)} ${p1.oy.toFixed(1)} C ${(p1.ox + dx / 2).toFixed(1)} ${p1.oy.toFixed(1)}, ${(p1.ox + dx / 2).toFixed(1)} ${p2.oy.toFixed(1)}, ${p2.ox.toFixed(1)} ${p2.oy.toFixed(1)}`
})

// 矢量钢笔描点序列
const vectorPoints = ref<
  Array<{ ox: number; oy: number; clientX: number; clientY: number }>
>([])
const cursorPos = ref<{ ox: number; oy: number } | null>(null)
const isNearStart = ref(false)

// 矢量闭合路径 SVG Path d 属性
const vectorPathD = computed(() => {
  const pts = vectorPoints.value
  if (pts.length === 0) return ''
  let d = `M ${pts[0].ox.toFixed(1)} ${pts[0].oy.toFixed(1)}`
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i].ox.toFixed(1)} ${pts[i].oy.toFixed(1)}`
  }
  return d
})

const pointsToSvgPath = (points: { x: number; y: number }[]): string => {
  if (points.length === 0) return ''
  if (points.length === 1) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} l 0.01 0.01`
  }
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`
  }

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
  for (let i = 1; i < points.length - 1; i++) {
    const midX = ((points[i].x + points[i + 1].x) / 2).toFixed(1)
    const midY = ((points[i].y + points[i + 1].y) / 2).toFixed(1)
    d += ` Q ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)} ${midX} ${midY}`
  }
  const last = points[points.length - 1]
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`
  return d
}

// 统一事件路由：随手画 vs 矢量钢笔描点 vs 连线拖拽
const onOverlayPointerDown = (e: PointerEvent) => {
  if (e.button !== 0 || !isDrawingActive.value) return
  const svg = overlaySvgRef.value
  if (!svg) return

  const rect = svg.getBoundingClientRect()
  const ox = e.clientX - rect.left
  const oy = e.clientY - rect.top

  // 0. 连线工具模式拖拽起点捕获 (支持磁吸真实连接桩 Ports 与边缘自由吸附)
  if (drawConfig.value.mode === 'line') {
    const graph = boardInstance.value?.graph
    if (graph) {
      const localPt = graph.clientToLocal(e.clientX, e.clientY)
      const portResult = findClosestPort(localPt, 45)
      if (portResult) {
        if (portResult.isCenterPort && portResult.port) {
          lineStartSnapped.value = { cell: portResult.node.id, port: portResult.port }
          boardInstance.value?.showNodePorts(portResult.node, true, portResult.port)
        } else {
          lineStartSnapped.value = {
            cell: portResult.node.id,
            anchor: {
              name: portResult.edge,
              args: {
                dx: portResult.edge === 'top' || portResult.edge === 'bottom' ? portResult.offset : 0,
                dy: portResult.edge === 'left' || portResult.edge === 'right' ? portResult.offset : 0,
                rotate: true,
              },
            },
          }
          boardInstance.value?.showNodePorts(portResult.node, true, undefined)
        }
        lineStartPoint.value = portResult.screenPoint
        lineEndPoint.value = portResult.screenPoint
        hoveredPortNode.value = portResult.node
      } else {
        lineStartSnapped.value = null
        lineStartPoint.value = { ox, oy, clientX: e.clientX, clientY: e.clientY }
        lineEndPoint.value = { ox, oy, clientX: e.clientX, clientY: e.clientY }
      }
    } else {
      lineStartSnapped.value = null
      lineStartPoint.value = { ox, oy, clientX: e.clientX, clientY: e.clientY }
      lineEndPoint.value = { ox, oy, clientX: e.clientX, clientY: e.clientY }
    }
    isLineDragging.value = true
    activeSnapPort.value = null
    activeBorderSlidePoint.value = null
    hoverBorderSlidePoint.value = null
    return
  }

  // 1. 矢量钢笔模式描点
  if (drawConfig.value.mode === 'vector') {
    // 若靠近起点且点数 >= 3，触发闭合生成图形
    if (vectorPoints.value.length >= 3 && isNearStart.value) {
      closeVectorPolygon()
      return
    }

    vectorPoints.value.push({
      ox,
      oy,
      clientX: e.clientX,
      clientY: e.clientY,
    })
    cursorPos.value = { ox, oy }
    return
  }

  // 2. 自由手绘画笔模式
  ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  isDrawing.value = true

  livePoints.value = [{ x: ox, y: oy }]
  clientPoints.value = [{ x: e.clientX, y: e.clientY }]
  livePathD.value = `M ${ox.toFixed(1)} ${oy.toFixed(1)} l 0.01 0.01`
}

const onOverlayPointerMove = (e: PointerEvent) => {
  if (!overlaySvgRef.value) return
  const rect = overlaySvgRef.value.getBoundingClientRect()
  const ox = e.clientX - rect.left
  const oy = e.clientY - rect.top

  // 连线工具模式：接触到形状时动态显隐对应节点的锚点与浅蓝触碰底色，并支持边缘滑动吸附
  if (drawConfig.value.mode === 'line') {
    const graph = boardInstance.value?.graph
    if (graph) {
      const localPt = graph.clientToLocal(e.clientX, e.clientY)
      const portResult = findClosestPort(localPt, 45)
      const contactNode = portResult ? portResult.node : null
      const activePortId = portResult?.isCenterPort ? portResult.port : undefined

      // 仅当鼠标接触/靠近某个形状时才显示其锚点与轻浅蓝背景，离开后自动隐藏恢复
      if (contactNode !== hoveredPortNode.value) {
        const keepStartCellId = isLineDragging.value && lineStartSnapped.value ? (lineStartSnapped.value as any).cell : null
        if (hoveredPortNode.value && hoveredPortNode.value.id !== keepStartCellId) {
          boardInstance.value?.showNodePorts(hoveredPortNode.value, false)
        }
        if (contactNode) {
          boardInstance.value?.showNodePorts(contactNode, true, activePortId)
        }
        hoveredPortNode.value = contactNode
      } else if (contactNode) {
        // 同一节点下动态切换高亮吸附的具体桩点或保持候选桩
        boardInstance.value?.showNodePorts(contactNode, true, activePortId)
      }

      if (isLineDragging.value && lineStartPoint.value) {
        // 避免终点在同一处反复吸附起点
        const isSameAsStart =
          portResult &&
          lineStartSnapped.value &&
          (lineStartSnapped.value as any).cell === portResult.node.id &&
          ((portResult.isCenterPort && (lineStartSnapped.value as any).port === portResult.port) ||
            (!portResult.isCenterPort && Math.hypot(ox - lineStartPoint.value.ox, oy - lineStartPoint.value.oy) < 16))

        if (portResult && !isSameAsStart) {
          if (portResult.isCenterPort && portResult.port) {
            lineEndSnapped.value = { cell: portResult.node.id, port: portResult.port }
            activeBorderSlidePoint.value = null
          } else {
            lineEndSnapped.value = {
              cell: portResult.node.id,
              anchor: {
                name: portResult.edge,
                args: {
                  dx: portResult.edge === 'top' || portResult.edge === 'bottom' ? portResult.offset : 0,
                  dy: portResult.edge === 'left' || portResult.edge === 'right' ? portResult.offset : 0,
                  rotate: true,
                },
              },
            }
            activeBorderSlidePoint.value = portResult.screenPoint
          }
          lineEndPoint.value = portResult.screenPoint
        } else {
          lineEndSnapped.value = null
          activeBorderSlidePoint.value = null

          let curOx = ox
          let curOy = oy
          let curClientX = e.clientX
          let curClientY = e.clientY

          const dx = ox - lineStartPoint.value.ox
          const dy = oy - lineStartPoint.value.oy
          const absDx = Math.abs(dx)
          const absDy = Math.abs(dy)
          const dist = Math.hypot(dx, dy)

          // 仅在直线工具时提供强力水平/垂直/45度锁定；或在按住 Shift 键时强制约束
          if (drawConfig.value.lineType === 'straight' || e.shiftKey) {
            const threshold = 18 // 角度磁吸阈值（像素）
            if (e.shiftKey) {
              if (absDy < absDx * 0.414) {
                curOy = lineStartPoint.value.oy
                curClientY = lineStartPoint.value.clientY
              } else if (absDx < absDy * 0.414) {
                curOx = lineStartPoint.value.ox
                curClientX = lineStartPoint.value.clientX
              } else {
                const size = Math.max(absDx, absDy)
                curOx = lineStartPoint.value.ox + Math.sign(dx) * size
                curOy = lineStartPoint.value.oy + Math.sign(dy) * size
                curClientX = lineStartPoint.value.clientX + Math.sign(dx) * size
                curClientY = lineStartPoint.value.clientY + Math.sign(dy) * size
              }
            } else if (dist > 12) {
              if (absDy <= threshold) {
                curOy = lineStartPoint.value.oy
                curClientY = lineStartPoint.value.clientY
              } else if (absDx <= threshold) {
                curOx = lineStartPoint.value.ox
                curClientX = lineStartPoint.value.clientX
              }
            }
          }

          lineEndPoint.value = {
            ox: curOx,
            oy: curOy,
            clientX: curClientX,
            clientY: curClientY,
          }
        }
      } else if (!isLineDragging.value) {
        if (portResult && !portResult.isCenterPort) {
          hoverBorderSlidePoint.value = portResult.screenPoint
        } else {
          hoverBorderSlidePoint.value = null
        }
      }
    }
    return
  }

  // 矢量钢笔引线跟踪与起点磁吸判断
  if (drawConfig.value.mode === 'vector') {
    cursorPos.value = { ox, oy }
    if (vectorPoints.value.length >= 3) {
      const startPt = vectorPoints.value[0]
      const dx = ox - startPt.ox
      const dy = oy - startPt.oy
      isNearStart.value = dx * dx + dy * dy <= 16 * 16
    } else {
      isNearStart.value = false
    }
    return
  }

  // 自由手绘模式
  if (!isDrawing.value) return

  const last = livePoints.value[livePoints.value.length - 1]
  if (last) {
    const dx = ox - last.x
    const dy = oy - last.y
    if (dx * dx + dy * dy < 4) return
  }

  livePoints.value.push({ x: ox, y: oy })
  clientPoints.value.push({ x: e.clientX, y: e.clientY })
  livePathD.value = pointsToSvgPath(livePoints.value)
}

const onOverlayPointerUp = (e: PointerEvent) => {
  // 连线工具拖拽完成并建立连接
  if (drawConfig.value.mode === 'line') {
    if (isLineDragging.value && lineStartPoint.value && lineEndPoint.value && boardInstance.value) {
      const p1 = lineStartPoint.value
      const p2 = lineEndPoint.value
      const dist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY)
      if (dist > 10) {
        const graph = boardInstance.value.graph
        const localStart = graph.clientToLocal(p1.clientX, p1.clientY)
        const localEnd = graph.clientToLocal(p2.clientX, p2.clientY)

        // 真实锚点智能接收吸附：优先采用拖拽期间锁定的 Ports，若无则探查终点坐标临近连接桩
        const startPortFallback = !lineStartSnapped.value ? findClosestPort(localStart, 45) : null
        const endPortFallback = !lineEndSnapped.value ? findClosestPort(localEnd, 45) : null

        let finalStart: any = lineStartSnapped.value
        if (!finalStart) {
          if (startPortFallback) {
            if (startPortFallback.isCenterPort && startPortFallback.port) {
              finalStart = { cell: startPortFallback.node.id, port: startPortFallback.port }
            } else {
              finalStart = {
                cell: startPortFallback.node.id,
                anchor: {
                  name: startPortFallback.edge,
                  args: {
                    dx: startPortFallback.edge === 'top' || startPortFallback.edge === 'bottom' ? startPortFallback.offset : 0,
                    dy: startPortFallback.edge === 'left' || startPortFallback.edge === 'right' ? startPortFallback.offset : 0,
                    rotate: true,
                  },
                },
              }
            }
          } else {
            finalStart = localStart
          }
        }

        let finalEnd: any = lineEndSnapped.value
        if (!finalEnd) {
          if (endPortFallback) {
            if (endPortFallback.isCenterPort && endPortFallback.port) {
              finalEnd = { cell: endPortFallback.node.id, port: endPortFallback.port }
            } else {
              finalEnd = {
                cell: endPortFallback.node.id,
                anchor: {
                  name: endPortFallback.edge,
                  args: {
                    dx: endPortFallback.edge === 'top' || endPortFallback.edge === 'bottom' ? endPortFallback.offset : 0,
                    dy: endPortFallback.edge === 'left' || endPortFallback.edge === 'right' ? endPortFallback.offset : 0,
                    rotate: true,
                  },
                },
              }
            }
          } else {
            finalEnd = localEnd
          }
        }

        boardInstance.value.addLine({
          type: drawConfig.value.lineType || 'straight',
          source: finalStart,
          target: finalEnd,
          stroke: '#374151',
          strokeWidth: 2,
        })
      }
    }
    isLineDragging.value = false
    lineStartPoint.value = null
    lineEndPoint.value = null
    lineStartSnapped.value = null
    lineEndSnapped.value = null
    activeSnapPort.value = null
    activeBorderSlidePoint.value = null
    hoverBorderSlidePoint.value = null
    hoveredPortNode.value = null
    boardInstance.value?.hideAllPorts()
    // 绘制完成后立即切回 select 选择模式 (1:1 语雀白板交互：建线后自动选中新线并切回指针，支持立即拖拽端点手柄调整头部/尾部)
    drawConfig.value.mode = 'select'
    boardInstance.value?.setDrawingMode('select')
    return
  }

  if (drawConfig.value.mode === 'vector') {
    // 矢量描点由 pointerdown 逐点采集，不在此结束
    return
  }

  if (!isDrawing.value) return
  isDrawing.value = false

  try {
    ;(e.currentTarget as Element).releasePointerCapture(e.pointerId)
  } catch {}

  const pts = [...clientPoints.value]

  if (pts.length > 0 && boardInstance.value) {
    // 将屏幕坐标转换为 X6 画布世界坐标
    const graphPoints = pts.map((p) =>
      boardInstance.value!.graph.clientToLocal(p.x, p.y)
    )

    boardInstance.value.addFreehandPath({
      points: graphPoints,
      color: drawConfig.value.color,
      width: drawConfig.value.width,
      opacity: drawConfig.value.opacity,
      brushType: drawConfig.value.mode,
    })
  }

  // 零闪烁同步交接：底层节点已由 X6 同步插入渲染，在下一绘制帧立即无缝置空临时画线
  requestAnimationFrame(() => {
    livePathD.value = ''
    livePoints.value = []
    clientPoints.value = []
  })
}

const onOverlayPointerLeave = () => {
  if (drawConfig.value.mode === 'line' && !isLineDragging.value) {
    if (hoveredPortNode.value) {
      boardInstance.value?.showNodePorts(hoveredPortNode.value, false)
      hoveredPortNode.value = null
    }
    hoverBorderSlidePoint.value = null
  }
}

// 双击快速完成并闭合多边形
const onOverlayDoubleClick = () => {
  if (drawConfig.value.mode === 'vector' && vectorPoints.value.length >= 3) {
    closeVectorPolygon()
  }
}

// 完成矢量图形闭合生成
const closeVectorPolygon = () => {
  if (vectorPoints.value.length < 3 || !boardInstance.value) return

  const graphPoints = vectorPoints.value.map((p) =>
    boardInstance.value!.graph.clientToLocal(p.clientX, p.clientY)
  )

  boardInstance.value.addPolygonShape({
    points: graphPoints,
    fill: vectorFillColor.value,
    stroke: vectorStrokeColor.value,
    strokeWidth: vectorStrokeWidth.value,
    strokeDasharray: vectorStrokeDash.value,
    opacity: vectorOpacity.value,
  })

  // 重置矢量描点交互状态，并切回选择模式便于用户立即缩放/旋转/移位
  vectorPoints.value = []
  cursorPos.value = null
  isNearStart.value = false
  drawConfig.value.mode = 'select'
  boardInstance.value.setDrawingMode('select')
  showSettingsPanel.value = true
}

// 键盘快捷键交互 (Enter 完成闭合, Esc 取消描点/退出连线模式/取消放置, T 激活文本放置)
const onKeyDown = (e: KeyboardEvent) => {
  // 确保多画板共存或文档内嵌时，仅当前活跃画板响应快捷键
  if (boardInstance.value && Board.activeBoard !== boardInstance.value) {
    return
  }

  if (e.key === 'Escape') {
    if (pendingPlacement.value) {
      cancelPlacement()
      return
    }
    if (drawConfig.value.mode === 'line') {
      isLineDragging.value = false
      lineStartPoint.value = null
      lineEndPoint.value = null
      lineStartSnapped.value = null
      lineEndSnapped.value = null
      activeSnapPort.value = null
      activeBorderSlidePoint.value = null
      hoverBorderSlidePoint.value = null
      hoveredPortNode.value = null
      boardInstance.value?.hideAllPorts()
      drawConfig.value.mode = 'select'
      return
    }
    if (drawConfig.value.mode === 'vector') {
      vectorPoints.value = []
      cursorPos.value = null
      isNearStart.value = false
      return
    }
  }

  // 快捷键 T / t：触发插入文本放置模式
  if (
    (e.key === 't' || e.key === 'T') &&
    !isInlineEditing.value &&
    !showTextOverlay.value &&
    !pendingPlacement.value &&
    drawConfig.value.mode === 'select'
  ) {
    const activeEl = document.activeElement
    const isTyping =
      activeEl &&
      (activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement).isContentEditable)
    if (!isTyping) {
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

  if (drawConfig.value.mode !== 'vector') return

  if (e.key === 'Enter') {
    if (vectorPoints.value.length >= 3) {
      closeVectorPolygon()
    }
  }
}

const onGlobalPointerMove = (e: PointerEvent) => {
  lastClientPos = { x: e.clientX, y: e.clientY }
}

const onGlobalPointerUp = () => {
  if (rotatingDegreeText.value) {
    rotatingDegreeText.value = ''
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('pointerup', onGlobalPointerUp)
  window.addEventListener('pointermove', onGlobalPointerMove, { passive: true })
})

onUnmounted(() => {
  cleanupAntdCssVars?.()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('pointerup', onGlobalPointerUp)
  window.removeEventListener('pointermove', onGlobalPointerMove)
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
  white-space: pre-wrap;
  word-break: break-word;
  caret-color: #2563eb;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  user-select: text;
  cursor: text;
  box-shadow: none;
}

// 语雀白板 1:1 图元 4 连接桩点（Ports）手柄与延伸补线交互
.shape-anchor-ports-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 80;

  .shape-anchor-btn {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
    cursor: pointer;
    user-select: none;
    z-index: 85;

    .anchor-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: var(--speed-board-primary-bg, var(--ant-color-primary-bg, #badaf9));
      border: 1.5px solid var(--speed-board-primary, var(--ant-color-primary, #93c5fd));
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
    }

    .anchor-arrow {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--speed-board-text, var(--ant-color-text, #374151));
      opacity: 0;
      transform: scale(0.6);
      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
    }

    &:hover {
      .anchor-dot {
        opacity: 0;
        transform: scale(0);
      }

      .anchor-arrow {
        opacity: 1;
        transform: scale(1);
        color: var(--speed-board-primary, var(--ant-color-primary, #1677ff));
        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.15));
      }
    }

    &.port-top:hover .anchor-arrow {
      transform: scale(1) translateY(-2px);
    }
    &.port-right:hover .anchor-arrow {
      transform: scale(1) translateX(2px);
    }
    &.port-bottom:hover .anchor-arrow {
      transform: scale(1) translateY(2px);
    }
    &.port-left:hover .anchor-arrow {
      transform: scale(1) translateX(-2px);
    }
  }
}

// X6 原生连接桩（Ports）高亮与吸附显隐
:deep(.x6-port circle) {
  opacity: 0;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

:deep(.x6-port:hover circle) {
  r: 5.5px;
  stroke: var(--speed-board-primary, var(--ant-color-primary, #1d4ed8));
  fill: var(--speed-board-primary-bg, var(--ant-color-primary-bg, #dbeafe));
}

// 语雀白板 1:1 跟随鼠标放置虚影预览图层样式
.speed-placement-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 55;
  cursor: crosshair;
  user-select: none;
  background: transparent;

  .speed-placement-ghost {
    position: absolute;
    pointer-events: none;
    transition: none;
    will-change: left, top;
    box-sizing: border-box;

    .placement-ghost-text {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding: 0 8px;
      border: 1.5px dashed var(--speed-board-primary, var(--ant-color-primary, #3b82f6));
      border-radius: 4px;
      background: rgba(59, 130, 246, 0.08);
      color: var(--speed-board-text, var(--ant-color-text, #1f2937));
      box-sizing: border-box;
      opacity: 0.75;
      white-space: nowrap;
      user-select: none;
    }

    .placement-ghost-shape {
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      opacity: 0.65;
      filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.12));

      svg {
        width: 100%;
        height: 100%;
        display: block;
      }
    }

    .placement-ghost-icon {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      opacity: 0.7;
      filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.12));

      :deep(img),
      :deep(svg) {
        max-width: 100%;
        max-height: 100%;
        width: 100%;
        height: 100%;
        display: block;
        pointer-events: none;
      }
    }

    .placement-ghost-basic {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #8b5cf6;
      border-radius: 6px;
      background: #ede9fe;
      color: #1f2937;
      font-weight: 500;
      box-sizing: border-box;
      opacity: 0.7;
      filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.12));
      white-space: nowrap;
      user-select: none;
    }
  }
}

// 放置虚影淡入淡出动画
.ghost-fade-enter-active {
  transition: opacity 0.15s ease-out;
}

.ghost-fade-leave-active {
  transition: opacity 0.1s ease-in;
}

.ghost-fade-enter-from,
.ghost-fade-leave-to {
  opacity: 0;
}
</style>
