<template>
  <svg
    v-show="isDrawingActive"
    ref="overlaySvgRef"
    class="speed-drawing-overlay"
    :class="{ 'is-vector-mode': props.drawConfig.mode === 'vector', 'is-line-mode': props.drawConfig.mode === 'line' }"
    @pointerdown="onOverlayPointerDown"
    @pointermove="onOverlayPointerMove"
    @pointerup="onOverlayPointerUp"
    @pointercancel="onOverlayPointerUp"
    @pointerleave="onOverlayPointerLeave"
    @dblclick="onOverlayDoubleClick"
  >
    <!-- 0. 连线触碰节点外轮廓高亮 (浅蓝填充 + 1.5px 蓝框, 1:1 语雀) -->
    <rect
      v-if="props.drawConfig.mode === 'line' && hoveredNodeHighlight"
      :x="hoveredNodeHighlight.x"
      :y="hoveredNodeHighlight.y"
      :width="hoveredNodeHighlight.width"
      :height="hoveredNodeHighlight.height"
      :rx="hoveredNodeHighlight.rx"
      :ry="hoveredNodeHighlight.rx"
      :transform="hoveredNodeHighlight.angle ? `rotate(${hoveredNodeHighlight.angle} ${hoveredNodeHighlight.cx} ${hoveredNodeHighlight.cy})` : undefined"
      fill="rgba(59, 130, 246, 0.08)"
      stroke="#3b82f6"
      stroke-width="1.5"
      pointer-events="none"
    />

    <!-- 1. 随手画/画笔实时预览线 -->
    <path
      v-if="livePathD && (props.drawConfig.mode === 'pencil' || props.drawConfig.mode === 'marker')"
      :d="livePathD"
      :stroke="props.drawConfig.color"
      :stroke-width="props.drawConfig.width"
      :stroke-opacity="props.drawConfig.opacity"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
    />

    <!-- 2. 矢量钢笔描点连线与闭合预览 (1:1 语雀白板矢量绘图交互) -->
    <g v-if="props.drawConfig.mode === 'vector' && vectorPoints.length > 0">
      <!-- 2.1 闭合多边形半透明预览面与边框 -->
      <path
        v-if="vectorPathD"
        :d="vectorPathD"
        :stroke="props.vectorStrokeColor"
        :stroke-width="props.vectorStrokeWidth"
        :stroke-dasharray="props.vectorStrokeDash === 'none' ? undefined : props.vectorStrokeDash"
        :fill="props.vectorFillColor === 'transparent' ? 'none' : props.vectorFillColor"
        :fill-opacity="props.vectorOpacity * 0.45"
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
    <g v-if="props.drawConfig.mode === 'line' && isLineDragging && lineStartPoint && lineEndPoint">
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
        v-if="props.drawConfig.lineType === 'straight'"
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
        v-else-if="props.drawConfig.lineType === 'elbow'"
        :d="lineElbowPathD"
        stroke="#374151"
        stroke-width="2"
        fill="none"
        stroke-dasharray="4,4"
        marker-end="url(#speed-line-preview-arrow)"
      />

      <!-- 3.3 曲线预览 -->
      <path
        v-else-if="props.drawConfig.lineType === 'curve'"
        :d="lineCurvePathD"
        stroke="#374151"
        stroke-width="2"
        fill="none"
        stroke-dasharray="4,4"
        marker-end="url(#speed-line-preview-arrow)"
      />

      <!-- 起点小抓手点 -->
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

      <!-- 终点抓手点 (拖拽中不显示多余的引导圈，仅在边线滑动时显示填充蓝圆) -->
      <circle
        v-if="activeBorderSlidePoint"
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
      v-if="props.drawConfig.mode === 'line' && !isLineDragging && hoverBorderSlidePoint"
      :cx="hoverBorderSlidePoint.ox"
      :cy="hoverBorderSlidePoint.oy"
      r="5"
      fill="#2563eb"
      stroke="#2563eb"
      stroke-width="1"
    />
  </svg>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted, onUnmounted } from 'vue'
import { Board } from '@speed-board/core'
import {
  findClosestPort as viewFindClosestPort,
  pointsToSmoothSvgPath,
  pointsToPolygonPath,
  type PortSnapResult,
} from '@speed-board/view'

export interface DrawConfig {
  mode: 'select' | 'pencil' | 'marker' | 'eraser' | 'vector' | 'line'
  lineType?: 'elbow' | 'straight' | 'curve'
  color: string
  width: number
  opacity: number
}

const props = withDefaults(
  defineProps<{
    board: Board | null
    drawConfig: DrawConfig
    vectorFillColor?: string
    vectorStrokeColor?: string
    vectorStrokeWidth?: number
    vectorStrokeDash?: string
    vectorOpacity?: number
  }>(),
  {
    vectorFillColor: '#ffffff',
    vectorStrokeColor: '#374151',
    vectorStrokeWidth: 2,
    vectorStrokeDash: 'none',
    vectorOpacity: 1,
  }
)

const emit = defineEmits<{
  (e: 'update:mode', mode: 'select' | 'pencil' | 'marker' | 'eraser' | 'vector' | 'line'): void
  (e: 'isLineDraggingChange', isDragging: boolean): void
  (e: 'finishVector'): void
}>()

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

watch(isLineDragging, (val) => {
  emit('isLineDraggingChange', val)
})

const isDrawingActive = computed(() => {
  return (
    props.drawConfig.mode === 'pencil' ||
    props.drawConfig.mode === 'marker' ||
    props.drawConfig.mode === 'vector' ||
    props.drawConfig.mode === 'line'
  )
})

const isStartBorderAnchor = computed(() => {
  return !!lineStartSnapped.value && 'anchor' in lineStartSnapped.value
})

const hoveredNodeHighlight = computed(() => {
  if (props.drawConfig.mode !== 'line' || !hoveredPortNode.value || !overlaySvgRef.value) return null
  const node = hoveredPortNode.value
  const graph = props.board?.graph
  if (!graph) return null
  const pos = node.position()
  const size = node.size()
  if (!size || size.width <= 0 || size.height <= 0) return null

  const svgRect = overlaySvgRef.value.getBoundingClientRect()
  const p1 = graph.localToClient(pos.x, pos.y)
  const angle = node.getAngle() || 0
  const isMind = node.getData()?.type === 'mindmap-node'
  const rx = isMind ? (node.getData()?.isRoot ? 8 : 6) : 4
  const zoom = graph.zoom() || 1

  const width = size.width * zoom
  const height = size.height * zoom
  const ox = p1.x - svgRect.left
  const oy = p1.y - svgRect.top

  return {
    x: ox,
    y: oy,
    width,
    height,
    rx: rx * zoom,
    angle,
    cx: ox + width / 2,
    cy: oy + height / 2,
  }
})

const findClosestPort = (localPt: { x: number; y: number }, snapRadius = 22): PortSnapResult | null => {
  const result = viewFindClosestPort(props.board, localPt, snapRadius)
  if (!result) return null

  // 校准在 overlaySvg 内部的局部相对像素坐标 ox, oy
  const svgRect = overlaySvgRef.value?.getBoundingClientRect()
  if (svgRect) {
    result.screenPoint.ox = result.screenPoint.clientX - svgRect.left
    result.screenPoint.oy = result.screenPoint.clientY - svgRect.top
  }
  return result
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

const vectorPathD = computed(() => {
  return pointsToPolygonPath(vectorPoints.value)
})

const pointsToSvgPath = (points: { x: number; y: number }[]): string => {
  return pointsToSmoothSvgPath(points)
}

const onOverlayPointerDown = (e: PointerEvent) => {
  if (e.button !== 0 || !isDrawingActive.value) return
  const svg = overlaySvgRef.value
  if (!svg) return

  const rect = svg.getBoundingClientRect()
  const ox = e.clientX - rect.left
  const oy = e.clientY - rect.top

  // 0. 连线工具模式拖拽起点捕获
  if (props.drawConfig.mode === 'line') {
    const graph = props.board?.graph
    if (graph) {
      const localPt = graph.clientToLocal(e.clientX, e.clientY)
      const portResult = findClosestPort(localPt, 22)
      if (portResult) {
        if (portResult.isCenterPort && portResult.port) {
          lineStartSnapped.value = { cell: portResult.node.id, port: portResult.port }
          props.board?.showNodePorts(portResult.node, true, portResult.port)
        } else {
          lineStartSnapped.value = {
            cell: portResult.node.id,
            anchor: {
              name: portResult.edge,
              args: {
                dx: portResult.edge === 'top' || portResult.edge === 'bottom' ? (portResult.delta ?? portResult.offset) : 0,
                dy: portResult.edge === 'left' || portResult.edge === 'right' ? (portResult.delta ?? portResult.offset) : 0,
                rotate: true,
              },
            },
          }
          props.board?.showNodePorts(portResult.node, true, undefined)
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
  if (props.drawConfig.mode === 'vector') {
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

  if (props.drawConfig.mode === 'line') {
    const graph = props.board?.graph
    if (graph) {
      const localPt = graph.clientToLocal(e.clientX, e.clientY)
      const portResult = findClosestPort(localPt, 22)
      const contactNode = portResult ? portResult.node : null
      const activePortId = portResult?.isCenterPort ? portResult.port : undefined

      if (contactNode !== hoveredPortNode.value) {
        const keepStartCellId = isLineDragging.value && lineStartSnapped.value ? (lineStartSnapped.value as any).cell : null
        if (hoveredPortNode.value && hoveredPortNode.value.id !== keepStartCellId) {
          props.board?.showNodePorts(hoveredPortNode.value, false)
        }
        if (contactNode) {
          props.board?.showNodePorts(contactNode, true, activePortId)
        }
        hoveredPortNode.value = contactNode
      } else if (contactNode) {
        props.board?.showNodePorts(contactNode, true, activePortId)
      }

      if (isLineDragging.value && lineStartPoint.value) {
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
                  dx: portResult.edge === 'top' || portResult.edge === 'bottom' ? (portResult.delta ?? portResult.offset) : 0,
                  dy: portResult.edge === 'left' || portResult.edge === 'right' ? (portResult.delta ?? portResult.offset) : 0,
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

          if (props.drawConfig.lineType === 'straight' || e.shiftKey) {
            const threshold = 18
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

  if (props.drawConfig.mode === 'vector') {
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
  if (props.drawConfig.mode === 'line') {
    if (isLineDragging.value && lineStartPoint.value && lineEndPoint.value && props.board) {
      const p1 = lineStartPoint.value
      const p2 = lineEndPoint.value
      const dist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY)
      if (dist > 10) {
        const graph = props.board.graph
        const localStart = graph.clientToLocal(p1.clientX, p1.clientY)
        const localEnd = graph.clientToLocal(p2.clientX, p2.clientY)

        const startPortFallback = !lineStartSnapped.value ? findClosestPort(localStart, 22) : null
        const endPortFallback = !lineEndSnapped.value ? findClosestPort(localEnd, 22) : null

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
                    dx: startPortFallback.edge === 'top' || startPortFallback.edge === 'bottom' ? (startPortFallback.delta ?? startPortFallback.offset) : 0,
                    dy: startPortFallback.edge === 'left' || startPortFallback.edge === 'right' ? (startPortFallback.delta ?? startPortFallback.offset) : 0,
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
                    dx: endPortFallback.edge === 'top' || endPortFallback.edge === 'bottom' ? (endPortFallback.delta ?? endPortFallback.offset) : 0,
                    dy: endPortFallback.edge === 'left' || endPortFallback.edge === 'right' ? (endPortFallback.delta ?? endPortFallback.offset) : 0,
                    rotate: true,
                  },
                },
              }
            }
          } else {
            finalEnd = localEnd
          }
        }

        props.board.addLine({
          type: props.drawConfig.lineType || 'straight',
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
    props.board?.hideAllPorts()
    emit('update:mode', 'select')
    props.board?.setDrawingMode('select')
    return
  }

  if (props.drawConfig.mode === 'vector') {
    return
  }

  if (!isDrawing.value) return
  isDrawing.value = false

  try {
    ;(e.currentTarget as Element).releasePointerCapture(e.pointerId)
  } catch {}

  const pts = [...clientPoints.value]

  if (pts.length > 0 && props.board) {
    const graphPoints = pts.map((p) =>
      props.board!.graph.clientToLocal(p.x, p.y)
    )

    props.board.addFreehandPath({
      points: graphPoints,
      color: props.drawConfig.color,
      width: props.drawConfig.width,
      opacity: props.drawConfig.opacity,
      brushType: props.drawConfig.mode,
    })
  }

  requestAnimationFrame(() => {
    livePathD.value = ''
    livePoints.value = []
    clientPoints.value = []
  })
}

const onOverlayPointerLeave = () => {
  if (props.drawConfig.mode === 'line' && !isLineDragging.value) {
    if (hoveredPortNode.value) {
      props.board?.showNodePorts(hoveredPortNode.value, false)
      hoveredPortNode.value = null
    }
    hoverBorderSlidePoint.value = null
  }
}

const onOverlayDoubleClick = () => {
  if (props.drawConfig.mode === 'vector' && vectorPoints.value.length >= 3) {
    closeVectorPolygon()
  }
}

const closeVectorPolygon = () => {
  if (vectorPoints.value.length < 3 || !props.board) return

  const graphPoints = vectorPoints.value.map((p) =>
    props.board!.graph.clientToLocal(p.clientX, p.clientY)
  )

  props.board.addPolygonShape({
    points: graphPoints,
    fill: props.vectorFillColor,
    stroke: props.vectorStrokeColor,
    strokeWidth: props.vectorStrokeWidth,
    strokeDasharray: props.vectorStrokeDash,
    opacity: props.vectorOpacity,
  })

  vectorPoints.value = []
  cursorPos.value = null
  isNearStart.value = false
  emit('update:mode', 'select')
  props.board.setDrawingMode('select')
  emit('finishVector')
}

const cancelLineDragging = () => {
  isLineDragging.value = false
  lineStartPoint.value = null
  lineEndPoint.value = null
  lineStartSnapped.value = null
  lineEndSnapped.value = null
  activeSnapPort.value = null
  activeBorderSlidePoint.value = null
  hoverBorderSlidePoint.value = null
  hoveredPortNode.value = null
  props.board?.hideAllPorts()
  emit('update:mode', 'select')
  props.board?.setDrawingMode('select')
}

const cancelVectorDrawing = () => {
  vectorPoints.value = []
  cursorPos.value = null
  isNearStart.value = false
  emit('update:mode', 'select')
  props.board?.setDrawingMode('select')
}

const onKeyDown = (e: KeyboardEvent) => {
  if (props.board && Board.activeBoard !== props.board) return

  if (e.key === 'Escape') {
    if (props.drawConfig.mode === 'line') {
      cancelLineDragging()
      return
    }
    if (props.drawConfig.mode === 'vector') {
      cancelVectorDrawing()
      return
    }
  }

  if (props.drawConfig.mode === 'vector' && e.key === 'Enter') {
    if (vectorPoints.value.length >= 3) {
      closeVectorPolygon()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
})

defineExpose({
  getOverlaySvg: () => overlaySvgRef.value,
  cancelLineDragging,
  cancelVectorDrawing,
  closeVectorPolygon,
})
</script>
