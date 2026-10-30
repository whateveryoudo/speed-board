<template>
  <teleport to="body">
    <div
      v-show="visible"
      ref="pickerRef"
      class="mindmap-marker-quick-picker"
      :style="pickerStyle"
      @pointerdown.stop
      @mousedown.stop
      @click.stop
    >
      <!-- 对应分类下的全部标记项 -->
      <button
        v-for="item in currentMarkersList"
        :key="item.key"
        class="quick-picker-item-btn"
        :class="{ 'is-active': isItemActive(item) }"
        :title="item.label"
        @click="handleSelect(item)"
      >
        <svg class="quick-picker-marker-svg">
          <use :xlink:href="'#' + item.symbolId" :href="'#' + item.symbolId" />
        </svg>
      </button>

      <!-- 分隔线 -->
      <div class="quick-picker-divider" />

      <!-- 清除当前标记的垃圾桶按钮 -->
      <button
        class="quick-picker-delete-btn"
        title="清除此标记"
        @click="handleDelete"
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          style="pointer-events: none;"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      </button>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { computePosition, offset, flip, shift } from '@floating-ui/dom'
import type { Board } from '@speed-board/core'
import {
  PRIORITY_MARKERS,
  PROGRESS_MARKERS,
  FLAG_MARKERS,
  ensureMarkerSprite,
  type MarkerDef,
} from '@speed-board/shared'

const props = defineProps<{
  board: Board | null
  visible: boolean
  targetEl: HTMLElement | SVGElement | null
  nodeId: string | null
  category: string
  value: any
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const pickerRef = ref<HTMLElement | null>(null)
const pickerStyle = ref<Record<string, string>>({})

const currentMarkersList = computed<MarkerDef[]>(() => {
  if (props.category === 'priority') {
    return PRIORITY_MARKERS
  }
  if (props.category === 'progress') {
    return PROGRESS_MARKERS
  }
  if (props.category === 'flag') {
    return FLAG_MARKERS
  }
  return []
})

const isItemActive = (item: MarkerDef) => {
  if (props.category === 'priority') {
    return Number(props.value) === Number(item.value)
  }
  if (props.category === 'progress') {
    return Number(props.value) === Number(item.value)
  }
  if (props.category === 'flag') {
    const v = String(props.value || '')
    return v === String(item.value) || v === item.key || v.endsWith(String(item.value))
  }
  return false
}

const updatePosition = async () => {
  if (!props.visible || !props.targetEl || !pickerRef.value) return

  const referenceEl = props.targetEl

  const { x, y } = await computePosition(referenceEl, pickerRef.value, {
    placement: 'bottom',
    strategy: 'fixed',
    middleware: [
      offset(6),
      flip({ fallbackPlacements: ['top', 'bottom'] }),
      shift({ padding: 8 }),
    ],
  })

  pickerStyle.value = {
    position: 'fixed',
    left: `${Math.round(x)}px`,
    top: `${Math.round(y)}px`,
  }
}

let justOpened = false

watch(
  () => props.visible,
  (val) => {
    if (val) {
      justOpened = true
      setTimeout(() => {
        justOpened = false
      }, 80)
      ensureMarkerSprite()
      nextTick(() => {
        updatePosition()
      })
    }
  }
)

watch(
  () => props.targetEl,
  (newEl) => {
    if (newEl && props.visible) {
      nextTick(() => {
        updatePosition()
      })
    }
  }
)

const handleSelect = (item: MarkerDef) => {
  if (!props.board) return
  if (typeof (props.board as any).setMindmapMarkers === 'function') {
    (props.board as any).setMindmapMarkers(
      { [props.category]: item.value },
      props.nodeId || undefined
    )
  }
  emit('close')
}

const handleDelete = () => {
  if (!props.board) return
  if (typeof (props.board as any).setMindmapMarkers === 'function') {
    (props.board as any).setMindmapMarkers(
      { [props.category]: null },
      props.nodeId || undefined
    )
  }
  emit('close')
}

const handleClose = () => {
  emit('close')
}

watch(
  () => props.board,
  (b, oldB) => {
    if (oldB) {
      oldB.off('viewport:scroll', handleClose)
    }
    if (b) {
      b.on('viewport:scroll', handleClose)
    }
  },
  { immediate: true }
)

const onGlobalPointerDown = (e: MouseEvent | PointerEvent) => {
  if (!props.visible || justOpened) return
  const target = e.target as HTMLElement | null
  if (!target) return

  const path = e.composedPath ? (e.composedPath() as Element[]) : []
  if (pickerRef.value && (pickerRef.value === target || pickerRef.value.contains(target) || path.includes(pickerRef.value))) return
  if (props.targetEl && (props.targetEl === target || props.targetEl.contains(target) || path.includes(props.targetEl))) return

  emit('close')
}

const onKeyDown = (e: KeyboardEvent) => {
  if (props.visible && e.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('pointerdown', onGlobalPointerDown)
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('pointerdown', onGlobalPointerDown)
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<style scoped lang="less">
.mindmap-marker-quick-picker {
  position: fixed;
  z-index: 1060;
  display: inline-flex;
  align-items: center;
  background-color: #ffffff;
  border-radius: 8px;
  padding: 4px 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1), 0 0 1px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.06);
  gap: 2px;
  user-select: none;
  animation: pickerFadeIn 0.12s ease-out;

  @keyframes pickerFadeIn {
    from {
      opacity: 0;
      transform: scale(0.96);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
}

.quick-picker-item-btn {
  width: 26px;
  height: 26px;
  border-radius: 4px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  outline: none;
  box-sizing: border-box;
  transition: all 0.15s ease;

  &:hover {
    background-color: #f3f4f6;
  }

  &.is-active {
    background-color: #e5e7eb;
    border-color: #d1d5db;
  }
}

.quick-picker-marker-svg {
  width: 18px;
  height: 18px;
  display: block;
  pointer-events: none;
}

.quick-picker-divider {
  width: 1px;
  height: 18px;
  background-color: #e5e7eb;
  margin: 0 4px;
  flex-shrink: 0;
}

.quick-picker-delete-btn {
  width: 26px;
  height: 26px;
  border-radius: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  padding: 0;
  margin: 0;
  outline: none;
  box-sizing: border-box;
  transition: all 0.15s ease;

  &:hover {
    background-color: #fee2e2;
    color: #ef4444;
  }
}
</style>
