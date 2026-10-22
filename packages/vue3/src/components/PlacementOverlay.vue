<template>
  <!-- 语雀白板 1:1 鼠标跟随放置预览图层 (Ghost Placement Overlay) -->
  <div
    v-if="props.pendingPlacement"
    class="speed-placement-overlay"
    @pointerleave="onPointerLeave"
    @pointermove="onPointerMove"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @contextmenu.prevent="cancel"
  >
    <transition name="ghost-fade">
      <div
        v-if="isHovering && mousePos"
        class="speed-placement-ghost"
        :style="ghostStyle"
      >
        <!-- 1. 文本图元预览 -->
        <div
          v-if="props.pendingPlacement.type === 'text'"
          class="placement-ghost-text"
          :style="{
            width: `${props.pendingPlacement.width * currentZoom}px`,
            height: `${props.pendingPlacement.height * currentZoom}px`,
            fontSize: `${14 * currentZoom}px`,
          }"
        >
          <span>{{ props.pendingPlacement.textConfig?.text || '文本' }}</span>
        </div>

        <!-- 2. 全量矢量图形预览 -->
        <div
          v-else-if="props.pendingPlacement.type === 'shape' && props.pendingPlacement.shapeConfig"
          class="placement-ghost-shape"
          :style="{
            width: `${props.pendingPlacement.width * currentZoom}px`,
            height: `${props.pendingPlacement.height * currentZoom}px`,
          }"
        >
          <svg
            :viewBox="props.pendingPlacement.shapeConfig.viewBox || '6 6 20 20'"
            preserveAspectRatio="none"
            style="width: 100%; height: 100%; display: block;"
            v-html="props.pendingPlacement.shapeConfig.svgContent"
          />
        </div>

        <!-- 3. 素材图标预览 -->
        <div
          v-else-if="props.pendingPlacement.type === 'icon' && props.pendingPlacement.iconConfig"
          class="placement-ghost-icon"
          :style="{
            width: `${props.pendingPlacement.width * currentZoom}px`,
            height: `${props.pendingPlacement.height * currentZoom}px`,
          }"
          v-html="props.pendingPlacement.iconConfig.svg"
        />

        <!-- 4. 基础主题/思维导图预览 -->
        <div
          v-else-if="(props.pendingPlacement.type === 'basic' || props.pendingPlacement.type === 'mindmap') && props.pendingPlacement.basicConfig"
          class="placement-ghost-basic"
          :style="{
            width: `${props.pendingPlacement.width * currentZoom}px`,
            height: `${props.pendingPlacement.height * currentZoom}px`,
            backgroundColor: props.pendingPlacement.basicConfig.fill || '#f3f4f6',
            borderColor: props.pendingPlacement.basicConfig.stroke || '#8b5cf6',
            fontSize: `${14 * currentZoom}px`,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            border: '1.5px dashed #8b5cf6',
            boxSizing: 'border-box',
            fontWeight: '600',
            color: '#1f2937',
            userSelect: 'none',
            position: 'relative',
          }"
        >
          <span>{{ props.pendingPlacement.basicConfig.text }}</span>

          <!-- 思维导图拖拽放置虚影：右侧同步展示连接线与加号手柄，与放下后 1:1 视觉对齐 -->
          <div
            v-if="props.pendingPlacement.type === 'mindmap'"
            class="ghost-mindmap-handle"
            :style="{
              position: 'absolute',
              left: '100%',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
            }"
          >
            <!-- 边缘吸附小圆点 -->
            <div :style="{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#8b5cf6', marginLeft: '-4px' }" />
            <!-- 向外微型分支引导线 -->
            <div :style="{ width: '14px', height: '3px', backgroundColor: '#8b5cf6', borderRadius: '1.5px' }" />
            <!-- 圆形加号按钮 -->
            <div
              :style="{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#8b5cf6',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              }"
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import type { Board } from '@speed-board/core'
import type { PendingPlacementItem } from '@speed-board/view'

const props = defineProps<{
  board: Board | null
  canvasWrapper: HTMLDivElement | null
  pendingPlacement: PendingPlacementItem | null
}>()

const emit = defineEmits<{
  (e: 'place', payload: { item: PendingPlacementItem; node: any }): void
  (e: 'cancel'): void
  (e: 'startInlineTextEdit', node: any): void
}>()

const mousePos = ref<{ x: number; y: number } | null>(null)
const isHovering = ref(false)
let hasDropped = false

const currentZoom = computed(() => {
  return props.board ? props.board.graph.zoom() : 1
})

const ghostStyle = computed(() => {
  if (!props.pendingPlacement || !mousePos.value) return {}
  const zoom = currentZoom.value
  const w = props.pendingPlacement.width * zoom
  const h = props.pendingPlacement.height * zoom
  const left = mousePos.value.x - w / 2
  const top = mousePos.value.y - h / 2

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

const cancel = () => {
  hasDropped = true
  mousePos.value = null
  isHovering.value = false
  window.removeEventListener('pointermove', onWindowPointerMove)
  window.removeEventListener('pointerup', onWindowPointerUp)
  emit('cancel')
}

const onWindowPointerMove = (e: PointerEvent) => {
  if (!props.canvasWrapper || !props.pendingPlacement) return
  const rect = props.canvasWrapper.getBoundingClientRect()
  mousePos.value = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }
  const isInside =
    e.clientX >= rect.left &&
    e.clientX <= rect.right &&
    e.clientY >= rect.top &&
    e.clientY <= rect.bottom
  isHovering.value = isInside
}

const onWindowPointerUp = (e: PointerEvent) => {
  if (!props.pendingPlacement || !isHovering.value) return
  if (e.button !== 0) return
  dropAtEvent(e)
}

watch(
  () => props.pendingPlacement,
  (newVal) => {
    hasDropped = false
    if (newVal) {
      window.addEventListener('pointermove', onWindowPointerMove, { passive: true })
      window.addEventListener('pointerup', onWindowPointerUp)
    } else {
      window.removeEventListener('pointermove', onWindowPointerMove)
      window.removeEventListener('pointerup', onWindowPointerUp)
      mousePos.value = null
      isHovering.value = false
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  window.removeEventListener('pointermove', onWindowPointerMove)
  window.removeEventListener('pointerup', onWindowPointerUp)
})

const onPointerMove = (e: PointerEvent) => {
  if (!props.canvasWrapper || !props.pendingPlacement) return
  const rect = props.canvasWrapper.getBoundingClientRect()
  mousePos.value = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }
  isHovering.value = true
}

const onPointerLeave = () => {
  isHovering.value = false
}

const dropAtEvent = (e: PointerEvent) => {
  if (hasDropped || !props.pendingPlacement || !props.board) return

  // 右键点击取消放置
  if (e.button === 2) {
    cancel()
    return
  }

  if (e.button !== 0) return

  hasDropped = true
  e.preventDefault()
  e.stopPropagation()

  const item = props.pendingPlacement
  const graph = props.board.graph
  const local = graph.clientToLocal(e.clientX, e.clientY)
  const targetX = Math.round(local.x - item.width / 2)
  const targetY = Math.round(local.y - item.height / 2)

  let node: any = null

  if (item.type === 'text') {
    node = props.board.addShape({
      shape: 'text',
      x: targetX,
      y: targetY,
      width: item.width,
      height: item.height,
      ...item.textConfig,
    })
  } else if (item.type === 'shape' && item.shapeConfig) {
    node = props.board.addVectorShape({
      x: targetX,
      y: targetY,
      width: item.width,
      height: item.height,
      ...item.shapeConfig,
    })
  } else if (item.type === 'icon' && item.iconConfig) {
    node = props.board.addSvgIcon({
      x: targetX,
      y: targetY,
      width: item.width,
      height: item.height,
      ...item.iconConfig,
    })
  } else if (item.type === 'mindmap') {
    if ((props.board as any).commands?.insertMindmap) {
      (props.board as any).commands.insertMindmap({
        x: targetX,
        y: targetY,
        text: item.basicConfig?.text || '思维导图',
      })
      const selected = graph.getSelectedCells()
      if (selected.length > 0) {
        node = selected[0]
      }
    }
  } else if (item.type === 'basic' && item.basicConfig) {
    node = props.board.addShape({
      shape: 'basic',
      x: targetX,
      y: targetY,
      width: item.width,
      height: item.height,
      ...(item.basicConfig as any),
    })
  }

  cancel()

  if (node) {
    graph.cleanSelection()
    graph.select(node)
    graph.trigger('selection:changed', { selected: [node] })

    emit('place', { item, node })
  }
}

const onPointerDown = (e: PointerEvent) => {
  dropAtEvent(e)
}

const onPointerUp = (e: PointerEvent) => {
  dropAtEvent(e)
}
</script>

<style scoped lang="less">
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
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    white-space: nowrap !important;
    border: 1.5px dashed #3b82f6;
    background: rgba(239, 246, 255, 0.7);
    color: #262626;
    border-radius: 4px;
    box-sizing: border-box;
    span {
      white-space: nowrap;
    }
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
