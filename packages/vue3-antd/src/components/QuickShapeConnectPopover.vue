<template>
  <div
    v-show="visible"
    class="quick-shape-connect-popover"
    :style="popupStyle"
    @click.stop
    @mousedown.stop
  >
    <!-- 最近使用 -->
    <div class="quick-section">
      <div class="quick-title">最近使用</div>
      <div class="quick-grid recent-grid">
        <a-tooltip
          v-for="shape in recentShapes"
          :key="shape.id"
          :title="shape.name"
          placement="top"
          :mouse-enter-delay="0.3"
          :arrow="false"
        >
          <button
            class="quick-shape-btn"
            @click="onSelect(shape)"
          >
            <div class="quick-svg" v-html="getShapeIconSvg(shape)" />
          </button>
        </a-tooltip>
      </div>
    </div>

    <!-- 基础图形 -->
    <div class="quick-section">
      <div class="quick-title">基础图形</div>
      <div class="quick-grid basic-grid">
        <a-tooltip
          v-for="shape in basicShapes"
          :key="shape.id"
          :title="shape.name"
          placement="top"
          :mouse-enter-delay="0.3"
          :arrow="false"
        >
          <button
            class="quick-shape-btn"
            @click="onSelect(shape)"
          >
            <div class="quick-svg" v-html="getShapeIconSvg(shape)" />
          </button>
        </a-tooltip>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  SHAPE_GROUPS,
  getShapeById,
  getShapeIconSvg,
  type ShapeDefinition,
} from '../data/shapeLibrary'

const props = defineProps<{
  visible: boolean
  x: number
  y: number
}>()

const emit = defineEmits<{
  (e: 'select', shape: ShapeDefinition): void
  (e: 'close'): void
}>()

const popupStyle = computed(() => ({
  left: `${props.x}px`,
  top: `${props.y}px`,
}))

// 默认最近使用列表 (若 localStorage 未存则使用经典 5 种)
const RECENT_KEY = 'SPEED_BOARD_RECENT_SHAPES'
const defaultRecentIds = ['process-arrow', 'rect', 'cross', 'star', 'rounded-rect']

const getRecentIds = (): string[] => {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr) && arr.length > 0) return arr
    }
  } catch {}
  return defaultRecentIds
}

const recentShapes = computed<ShapeDefinition[]>(() => {
  const ids = getRecentIds()
  return ids.map((id) => getShapeById(id)).filter(Boolean) as ShapeDefinition[]
})

// 基础图形列表 ( basic 分组中的所有图形 )
const basicShapes = computed<ShapeDefinition[]>(() => {
  const basicGroup = SHAPE_GROUPS.find((g) => g.key === 'basic')
  return basicGroup ? basicGroup.shapes : []
})

const onSelect = (shape: ShapeDefinition) => {
  // 记录到最近使用
  try {
    const current = getRecentIds().filter((id) => id !== shape.id)
    current.unshift(shape.id)
    localStorage.setItem(RECENT_KEY, JSON.stringify(current.slice(0, 5)))
  } catch {}

  emit('select', shape)
}
</script>

<style lang="less" scoped>
.quick-shape-connect-popover {
  position: absolute;
  z-index: 1000;
  width: 250px;
  background-color: var(--speed-board-bg, var(--ant-color-bg-elevated, #ffffff));
  border-radius: var(--speed-board-radius-lg, 8px);
  padding: 10px 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--speed-board-border, var(--ant-color-border-secondary, #e5e7eb));
  user-select: none;
  animation: fadeIn 0.15s ease-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.96);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .quick-section {
    margin-bottom: 10px;

    &:last-child {
      margin-bottom: 0;
    }

    .quick-title {
      font-size: 12px;
      color: var(--speed-board-text-secondary, var(--ant-color-text-secondary, rgba(0, 0, 0, 0.65)));
      margin-bottom: 6px;
      font-weight: 500;
    }

    .quick-grid {
      display: grid;
      gap: 3px;

      &.recent-grid {
        grid-template-columns: repeat(5, 1fr);
      }

      &.basic-grid {
        grid-template-columns: repeat(6, 1fr);
      }

      .quick-shape-btn {
        width: 34px;
        height: 34px;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 5px;
        padding: 0;
        margin: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: var(--speed-board-text-secondary, var(--ant-color-text-secondary, rgba(0, 0, 0, 0.65)));
        transition: all 0.15s ease;

        &:hover {
          background-color: var(--speed-board-hover-bg, var(--ant-control-item-bg-hover, rgba(0, 0, 0, 0.04)));
          color: var(--speed-board-text, var(--ant-color-text, rgba(0, 0, 0, 0.88)));
          border-color: var(--speed-board-border, var(--ant-color-border-secondary, #e5e7eb));
          transform: scale(1.08);
        }

        &:active {
          transform: scale(0.96);
        }

        .quick-svg {
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;

          :deep(svg) {
            width: 20px;
            height: 20px;
          }
        }
      }
    }
  }
}
</style>
