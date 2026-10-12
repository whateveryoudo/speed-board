<template>
  <div class="speed-board">
    <!-- 顶部状态栏与悬浮控制组 (左上历史撤销 + 右上视口控制与折叠按钮) -->
    <TopToolbar
      :board="boardInstance"
      :title="props.title"
      :show-left-toolbar="showLeftToolbar"
      @update:show-left-toolbar="showLeftToolbar = $event"
      @save="onSave"
    />

    <!-- 左侧悬浮胶囊工具栏 (画笔、基础图形、文本、连线、思维导图、素材库) -->
    <LeftToolbar
      :board="boardInstance"
      :icon-provider="props.iconProvider"
      :visible="showLeftToolbar"
      @mode-change="onToolbarModeChange"
    />

    <!-- 主画布承载容器 -->
    <div class="speed-board-canvas-wrapper">
      <BoardCanvas :options="props.options" @created="onBoardCreated" />

      <!-- 手绘交互覆盖层 (画笔激活时在顶层捕获笔触并实时渲染) -->
      <svg
        v-show="isDrawingActive"
        ref="overlaySvgRef"
        class="speed-drawing-overlay"
        @pointerdown="onDrawPointerDown"
        @pointermove="onDrawPointerMove"
        @pointerup="onDrawPointerUp"
        @pointercancel="onDrawPointerUp"
      >
        <path
          v-if="livePathD"
          :d="livePathD"
          :stroke="drawConfig.color"
          :stroke-width="drawConfig.width"
          :stroke-opacity="drawConfig.opacity"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"
        />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, onUnmounted } from 'vue'
import { BoardCanvas, type Board, type BoardOptions } from '@speed-board/vue3'
import { useAntdCssVars } from 'speed-components-ui/hooks'
import LeftToolbar from './LeftToolbar.vue'
import TopToolbar from './TopToolbar.vue'
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

// 注入并管理 Ant Design Vue CSS 变量 (--ant-*)
const { cleanup: cleanupAntdCssVars } = useAntdCssVars()

onUnmounted(() => {
  cleanupAntdCssVars?.()
})

const boardInstance = shallowRef<Board | null>(null)

const onBoardCreated = (board: Board) => {
  boardInstance.value = board
  emit('created', board)
}

const onSave = () => {
  emit('save')
}

// 手绘模式与笔触参数状态
const drawConfig = ref<{
  mode: 'select' | 'pencil' | 'marker' | 'eraser'
  color: string
  width: number
  opacity: number
}>({
  mode: 'select',
  color: '#333333',
  width: 3,
  opacity: 1,
})

const isDrawingActive = computed(() => {
  return drawConfig.value.mode === 'pencil' || drawConfig.value.mode === 'marker'
})

const onToolbarModeChange = (payload: {
  mode: 'select' | 'pencil' | 'marker' | 'eraser'
  color?: string
  width?: number
  opacity?: number
}) => {
  drawConfig.value.mode = payload.mode
  if (payload.color) drawConfig.value.color = payload.color
  if (payload.width) drawConfig.value.width = payload.width
  if (payload.opacity !== undefined) drawConfig.value.opacity = payload.opacity
}

// 实时手绘交互引擎
const overlaySvgRef = ref<SVGSVGElement | null>(null)
const isDrawing = ref(false)
const livePathD = ref('')
const livePoints = ref<Array<{ x: number; y: number }>>([])
const clientPoints = ref<Array<{ x: number; y: number }>>([])

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

const onDrawPointerDown = (e: PointerEvent) => {
  if (e.button !== 0 || !isDrawingActive.value) return
  const svg = overlaySvgRef.value
  if (!svg) return

  ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  isDrawing.value = true

  const rect = svg.getBoundingClientRect()
  const ox = e.clientX - rect.left
  const oy = e.clientY - rect.top

  livePoints.value = [{ x: ox, y: oy }]
  clientPoints.value = [{ x: e.clientX, y: e.clientY }]
  livePathD.value = `M ${ox.toFixed(1)} ${oy.toFixed(1)} l 0.01 0.01`
}

const onDrawPointerMove = (e: PointerEvent) => {
  if (!isDrawing.value || !overlaySvgRef.value) return

  const rect = overlaySvgRef.value.getBoundingClientRect()
  const ox = e.clientX - rect.left
  const oy = e.clientY - rect.top

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

const onDrawPointerUp = (e: PointerEvent) => {
  if (!isDrawing.value) return
  isDrawing.value = false

  try {
    ;(e.currentTarget as Element).releasePointerCapture(e.pointerId)
  } catch {}

  const pts = clientPoints.value
  livePathD.value = ''
  livePoints.value = []
  clientPoints.value = []

  if (pts.length === 0 || !boardInstance.value) return

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
}
</style>
