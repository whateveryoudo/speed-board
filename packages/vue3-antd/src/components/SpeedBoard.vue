<template>
  <div class="speed-board">
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

    <!-- 左侧悬浮胶囊工具栏 (画笔、矢量钢笔、基础图形、文本、连线、思维导图、素材库) -->
    <LeftToolbar
      :board="boardInstance"
      :icon-provider="props.iconProvider"
      :visible="showLeftToolbar"
      @mode-change="onToolbarModeChange"
      @shape-added="onShapeAdded"
    />

    <!-- 右侧属性设置面板 (1:1 语雀白板风格：填充颜色+5阶梯度、边框颜色/粗细/样式、不透明度、图层排列) -->
    <StyleSettingsPanel
      v-model:visible="showSettingsPanel"
      :board="boardInstance"
      :default-fill="vectorFillColor"
      :default-stroke="vectorStrokeColor"
      :default-stroke-width="vectorStrokeWidth"
      :default-stroke-dash="vectorStrokeDash"
      :default-opacity="vectorOpacity"
      @style-change="onStyleSettingsChange"
      @open-link-overlay="onOpenLinkOverlay"
    />

    <!-- 主画布承载容器 -->
    <div ref="canvasWrapperRef" class="speed-board-canvas-wrapper">
      <BoardCanvas :options="props.options" @created="onBoardCreated" />

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

      <!-- 手绘与矢量交互覆盖层 (画笔/矢量钢笔激活时在顶层捕获并实时渲染) -->
      <svg
        v-show="isDrawingActive"
        ref="overlaySvgRef"
        class="speed-drawing-overlay"
        :class="{ 'is-vector-mode': drawConfig.mode === 'vector' }"
        @pointerdown="onOverlayPointerDown"
        @pointermove="onOverlayPointerMove"
        @pointerup="onOverlayPointerUp"
        @pointercancel="onOverlayPointerUp"
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
      </svg>

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
import { BoardCanvas, type Board, type BoardOptions } from '@speed-board/vue3'
import { useAntdCssVars } from 'speed-components-ui/hooks'
import LeftToolbar from './LeftToolbar.vue'
import TopToolbar from './TopToolbar.vue'
import StyleSettingsPanel from './StyleSettingsPanel.vue'
import TextOverlayEditor from './TextOverlayEditor.vue'
import type { IconProvider } from '../data/defaultIcons'
import '../style/index.less'

defineOptions({
  name: 'SpeedBoard',
})

const props = withDefaults(
  defineProps<{
    options?: Omit<BoardOptions, 'container'>
    iconProvider?: IconProvider
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

  const align = data.align || 'left'

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
    textAlign: align as any,
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
    boardInstance.value.updateTextNode(activeInlineNode.value, { text })
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

  boardInstance.value.updateTextNode(activeInlineNode.value, { text })
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
  // 双击文本图元：直接在选框内激活就地打字（不弹窗）
  board.graph.on('node:dblclick', ({ node }: any) => {
    if (board.isTextNode(node)) {
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

const onBoardCreated = (board: Board) => {
  boardInstance.value = board
  setupRotationListeners(board)
  setupTextListeners(board)
  emit('created', board)
}

const onSave = () => {
  emit('save')
}

// 手绘模式与笔触参数状态
const drawConfig = ref<{
  mode: 'select' | 'pencil' | 'marker' | 'eraser' | 'vector'
  color: string
  width: number
  opacity: number
}>({
  mode: 'select',
  color: '#333333',
  width: 3,
  opacity: 1,
})

// 矢量多边形配置与样式属性
const vectorFillColor = ref('#ec4899')
const vectorStrokeColor = ref('#333333')
const vectorStrokeWidth = ref(2)
const vectorStrokeDash = ref('none')
const vectorOpacity = ref(1)

const isDrawingActive = computed(() => {
  return (
    drawConfig.value.mode === 'pencil' ||
    drawConfig.value.mode === 'marker' ||
    drawConfig.value.mode === 'vector'
  )
})

const onToolbarModeChange = (payload: {
  mode: 'select' | 'pencil' | 'marker' | 'eraser' | 'vector'
  color?: string
  width?: number
  opacity?: number
}) => {
  drawConfig.value.mode = payload.mode
  if (payload.color) drawConfig.value.color = payload.color
  if (payload.width) drawConfig.value.width = payload.width
  if (payload.opacity !== undefined) drawConfig.value.opacity = payload.opacity

  if (payload.mode === 'vector') {
    // 激活矢量钢笔时，展开右侧样式设置面板以供随时调配颜色梯度与边框
    showSettingsPanel.value = true
    vectorPoints.value = []
    cursorPos.value = null
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

// 统一事件路由：随手画 vs 矢量钢笔描点
const onOverlayPointerDown = (e: PointerEvent) => {
  if (e.button !== 0 || !isDrawingActive.value) return
  const svg = overlaySvgRef.value
  if (!svg) return

  const rect = svg.getBoundingClientRect()
  const ox = e.clientX - rect.left
  const oy = e.clientY - rect.top

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

// 键盘快捷键交互 (Enter 完成闭合, Esc 取消描点)
const onKeyDown = (e: KeyboardEvent) => {
  if (drawConfig.value.mode !== 'vector') return

  if (e.key === 'Enter') {
    if (vectorPoints.value.length >= 3) {
      closeVectorPolygon()
    }
  } else if (e.key === 'Escape') {
    vectorPoints.value = []
    cursorPos.value = null
    isNearStart.value = false
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

  &.is-vector-mode {
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
</style>
