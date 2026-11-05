<template>
  <!-- 鼠标跟随放置预览图层 (Ghost Placement Overlay / 鼠标模拟项) -->
  <div
    v-if="ghostConfig && isHovering && mousePos && !isMouseDown && !isDropped"
    class="speed-placement-ghost"
    :style="ghostStyle"
  >
    <!-- 1. 文本图元预览：纯黑文字，完全无边框无背景 (1:1 语雀白板体验) -->
    <div
      v-if="ghostConfig.type === 'text'"
      class="ghost-item ghost-text"
      :style="{
        fontSize: `${16 * zoom}px`,
      }"
    >
      文本
    </div>

    <!-- 2. 思维导图预览：1:1 中心主题卡片原样呈现 -->
    <div
      v-else-if="ghostConfig.type === 'mindmap'"
      class="ghost-item ghost-mindmap"
      :style="{
        width: `${ghostConfig.width * zoom}px`,
        height: `${ghostConfig.height * zoom}px`,
        fontSize: `${14 * zoom}px`,
      }"
    >
      中心主题
    </div>

    <!-- 3. 画板真实引擎绘制图元 (Plait 原生 Engine 动态渲染，100% 还原落地外观) -->
    <div
      v-else-if="ghostConfig.type === 'geometry'"
      class="ghost-item ghost-geometry"
      :style="{
        width: `${ghostConfig.width * zoom}px`,
        height: `${ghostConfig.height * zoom}px`,
      }"
    >
      <svg
        ref="geometrySvgRef"
        :width="ghostConfig.width * zoom"
        :height="ghostConfig.height * zoom"
        :viewBox="`0 0 ${ghostConfig.width} ${ghostConfig.height}`"
        style="width: 100%; height: 100%; display: block; overflow: visible;"
      />
    </div>

    <!-- 4. 扩展矢量图形兜底 (非 Plait 内置图元时通过标准图元渲染) -->
    <div
      v-else-if="ghostConfig.type === 'shape' && ghostConfig.svgContent"
      class="ghost-item ghost-shape"
      :style="{
        width: `${ghostConfig.width * zoom}px`,
        height: `${ghostConfig.height * zoom}px`,
      }"
    >
      <svg
        :viewBox="ghostConfig.viewBox || '0 0 32 32'"
        preserveAspectRatio="none"
        style="width: 100%; height: 100%; display: block; overflow: visible;"
        v-html="ghostConfig.svgContent"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { type Board, PlaitPointerType } from '@speed-board/core'
import { BasicShapes, getDefaultGeometryProperty, drawGeometry } from '@speed-board/extension-draw'
import { MindPointerType } from '@speed-board/extension-mindmap'
import {
  getShapeById,
  getShapeTightViewBox,
  renderShapeCanvasSvg,
  ALL_SHAPES,
} from '@speed-board/shared'

const props = defineProps<{
  board: Board | null
  wrapperEl?: HTMLElement | null
  activeMode?: string
}>()

const mousePos = ref<{ x: number; y: number } | null>(null)
const isHovering = ref(false)
const isMouseDown = ref(false)
const isDropped = ref(false)
const rawPointer = ref<string>(PlaitPointerType.selection)
const geometrySvgRef = ref<SVGSVGElement | null>(null)

// 同步画板 Pointer 状态
const updatePointer = () => {
  if (props.board?.raw?.pointer) {
    rawPointer.value = props.board.raw.pointer as string
  } else {
    rawPointer.value = PlaitPointerType.selection
  }
}

watch(rawPointer, () => {
  isMouseDown.value = false
  isDropped.value = false
})

watch(
  () => props.board,
  (board, oldBoard) => {
    if (oldBoard) {
      oldBoard.off('change', updatePointer)
      oldBoard.off('pointer:change', updatePointer)
    }
    if (board) {
      board.on('change', updatePointer)
      board.on('pointer:change', updatePointer)
      updatePointer()
    }
  },
  { immediate: true }
)

const zoom = computed(() => {
  return props.board ? props.board.getZoom() : 1
})

interface GhostConfig {
  type: 'text' | 'mindmap' | 'geometry' | 'shape'
  pointer?: string
  width: number
  height: number
  svgContent?: string
  viewBox?: string
}

// 根据当前 pointer 确定鼠标模拟项配置
const ghostConfig = computed<GhostConfig | null>(() => {
  const ptr =
    rawPointer.value &&
    rawPointer.value !== PlaitPointerType.selection &&
    rawPointer.value !== PlaitPointerType.hand
      ? rawPointer.value
      : props.activeMode

  if (!ptr || ptr === PlaitPointerType.selection || ptr === PlaitPointerType.hand || ptr === 'select') {
    return null
  }

  // 1. 文本
  if (ptr === BasicShapes.text || ptr === 'text') {
    return {
      type: 'text',
      width: 36,
      height: 20,
    }
  }

  // 2. 思维导图
  if (ptr === MindPointerType.mind || ptr === 'mind' || ptr === 'mindmap') {
    return {
      type: 'mindmap',
      width: 104,
      height: 40,
    }
  }

  // 3. 优先使用 Plait 官方几何图元渲染器（与落笔后完全一致的底层引擎）
  try {
    const prop = getDefaultGeometryProperty(ptr as any)
    if (prop && prop.width && prop.height) {
      return {
        type: 'geometry',
        pointer: ptr,
        width: prop.width,
        height: prop.height,
      }
    }
  } catch {
    // 非直接内置 pointer，尝试通过图形库映射
  }

  // 4. 矢量图形库扩展图元
  const shapeDef =
    getShapeById(ptr) ||
    ALL_SHAPES.find(
      (s) => s.id === ptr || (props.board && props.board.mapShapeToPointer(s.id) === ptr)
    )

  if (shapeDef) {
    // 若能映射到 Plait 引擎注册的几何类型，使用 Plait 原生引擎绘制
    const mappedPtr = props.board ? props.board.mapShapeToPointer(shapeDef.id) : shapeDef.id
    if (mappedPtr && mappedPtr !== shapeDef.id) {
      try {
        const prop = getDefaultGeometryProperty(mappedPtr as any)
        if (prop && prop.width && prop.height) {
          return {
            type: 'geometry',
            pointer: mappedPtr,
            width: prop.width,
            height: prop.height,
          }
        }
      } catch {}
    }

    const viewBox = getShapeTightViewBox(shapeDef.svgBody, shapeDef.id)
    const svgContent = renderShapeCanvasSvg(shapeDef, {
      fill: '#ffffff',
      stroke: '#262626',
      strokeWidth: 2,
    })
    return {
      type: 'shape',
      width: 80,
      height: 60,
      svgContent,
      viewBox: viewBox || '0 0 32 32',
    }
  }

  return null
})

// 使用 Plait 底层 drawGeometry 绘制与实际落地 100% 一致的 SVG
const renderPlaitGeometry = () => {
  if (!geometrySvgRef.value || !ghostConfig.value || !props.board?.raw) return
  if (ghostConfig.value.type !== 'geometry' || !ghostConfig.value.pointer) return

  geometrySvgRef.value.innerHTML = ''
  try {
    const g = drawGeometry(
      props.board.raw,
      {
        x: 0,
        y: 0,
        width: ghostConfig.value.width,
        height: ghostConfig.value.height,
      },
      ghostConfig.value.pointer as any,
      {
        stroke: '#262626',
        strokeWidth: 2,
        fill: '#ffffff',
        fillStyle: 'solid',
      }
    )
    if (g) {
      geometrySvgRef.value.appendChild(g)
    }
  } catch (err) {
    console.warn('drawGeometry failed:', err)
  }
}

watch(
  [() => ghostConfig.value, geometrySvgRef],
  () => {
    nextTick(renderPlaitGeometry)
  },
  { flush: 'post' }
)

// 计算居中跟随鼠标的绝对定位样式
const ghostStyle = computed(() => {
  if (!ghostConfig.value || !mousePos.value) return {}
  const w = ghostConfig.value.width * zoom.value
  const h = ghostConfig.value.height * zoom.value
  const left = mousePos.value.x - w / 2
  const top = mousePos.value.y - h / 2

  return {
    position: 'absolute' as const,
    left: `${left}px`,
    top: `${top}px`,
    width: `${w}px`,
    height: `${h}px`,
    pointerEvents: 'none' as const,
    zIndex: 990,
  }
})

// 监听鼠标在画布容器上的移动
const onPointerMove = (e: PointerEvent) => {
  if (!props.wrapperEl) return
  const rect = props.wrapperEl.getBoundingClientRect()
  mousePos.value = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }
  isHovering.value = true
}

const onPointerEnter = (e: PointerEvent) => {
  onPointerMove(e)
}

const onPointerLeave = () => {
  isHovering.value = false
}

const onPointerDown = () => {
  isMouseDown.value = true
}

const onPointerUp = () => {
  isDropped.value = true
  updatePointer()
  setTimeout(updatePointer, 20)
  setTimeout(updatePointer, 100)
}

// 绑定与解绑容器监听
watch(
  () => props.wrapperEl,
  (wrapper, oldWrapper) => {
    if (oldWrapper) {
      oldWrapper.removeEventListener('pointerenter', onPointerEnter)
      oldWrapper.removeEventListener('pointermove', onPointerMove)
      oldWrapper.removeEventListener('pointerleave', onPointerLeave)
      oldWrapper.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
    }
    if (wrapper) {
      wrapper.addEventListener('pointerenter', onPointerEnter, { passive: true })
      wrapper.addEventListener('pointermove', onPointerMove, { passive: true })
      wrapper.addEventListener('pointerleave', onPointerLeave)
      wrapper.addEventListener('pointerdown', onPointerDown)
      window.addEventListener('pointerup', onPointerUp)
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (props.wrapperEl) {
    props.wrapperEl.removeEventListener('pointerenter', onPointerEnter)
    props.wrapperEl.removeEventListener('pointermove', onPointerMove)
    props.wrapperEl.removeEventListener('pointerleave', onPointerLeave)
    props.wrapperEl.removeEventListener('pointerdown', onPointerDown)
  }
  window.removeEventListener('pointerup', onPointerUp)
})
</script>

<style scoped lang="less">
.speed-placement-ghost {
  position: absolute;
  pointer-events: none !important;
  user-select: none !important;
  will-change: left, top;
  background: transparent !important;
  box-shadow: none !important;
  filter: none !important;
  opacity: 0.85;
}

.ghost-item {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  box-shadow: none !important;
}

// 1. 文本：纯黑文字，完全无背景无边框无阴影 (1:1 对齐用户截图)
.ghost-text {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  color: #1f2329;
  font-size: 16px;
  line-height: 1;
  white-space: nowrap;
  user-select: none;
}

// 2. 思维导图：中心主题卡片外观 (1:1 灰白底加浅灰描边，无阴影)
.ghost-mindmap {
  background: #f2f4f7 !important;
  border: 1.5px solid #dee0e3 !important;
  border-radius: 8px;
  box-shadow: none !important;
  color: #1f2329;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}

// 3. 原生 Plait 几何图元容器：纯透明无背景，SVG 由 Plait 原生 Engine 动态绘制
.ghost-geometry {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

// 4. 扩展矢量图形容器：纯透明无背景，保持与落地方案一致
.ghost-shape {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;

  :deep(svg) {
    overflow: visible;
  }

  :deep(path),
  :deep(rect),
  :deep(polygon),
  :deep(circle),
  :deep(ellipse) {
    fill: #ffffff !important;
    stroke: #262626 !important;
    stroke-width: 2px !important;
    vector-effect: non-scaling-stroke !important;
    stroke-dasharray: none !important;
  }
}
</style>
