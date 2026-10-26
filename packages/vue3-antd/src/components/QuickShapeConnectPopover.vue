<template>
  <div
    v-show="visible"
    class="quick-shape-connect-popover"
    :style="popupStyle"
    @click.stop
    @mousedown.stop
    @pointerdown.stop
  >
    <!-- 最近使用 -->
    <div class="shape-group-section">
      <div class="shape-group-header">
        <span class="group-title">最近使用</span>
      </div>
      <div class="shape-grid">
        <a-tooltip
          v-for="shape in recentShapes"
          :key="shape.id"
          :title="shape.name"
          placement="top"
          :mouse-enter-delay="0.25"
          :arrow="false"
        >
          <button
            class="shape-item-btn"
            @click.stop="onSelect(shape)"
            @pointerdown.stop.prevent="onSelect(shape)"
          >
            <div class="shape-svg-wrapper" v-html="getShapeIconSvg(shape)" />
          </button>
        </a-tooltip>
      </div>
    </div>

    <!-- 基础图形 -->
    <div class="shape-group-section">
      <div class="shape-group-header">
        <span class="group-title">基础图形</span>
      </div>
      <div class="shape-grid">
        <a-tooltip
          v-for="shape in basicShapes"
          :key="shape.id"
          :title="shape.name"
          placement="top"
          :mouse-enter-delay="0.25"
          :arrow="false"
        >
          <button
            class="shape-item-btn"
            @click.stop="onSelect(shape)"
            @pointerdown.stop.prevent="onSelect(shape)"
          >
            <div class="shape-svg-wrapper" v-html="getShapeIconSvg(shape)" />
          </button>
        </a-tooltip>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Tooltip as ATooltip } from 'ant-design-vue'
import {
  SHAPE_GROUPS,
  getShapeById,
  getShapeIconSvg,
  getRecentShapeIds,
  recordRecentShape,
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

// 最近使用图形列表（与左侧工具栏形状选择器完全共享同步）
const recentShapes = ref<ShapeDefinition[]>([])

const refreshRecentShapes = () => {
  const ids = getRecentShapeIds()
  recentShapes.value = ids.map((id) => getShapeById(id)).filter(Boolean) as ShapeDefinition[]
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      refreshRecentShapes()
    }
  },
  { immediate: true }
)

// 基础图形列表 ( basic 分组中的所有图形 )
const basicShapes = computed<ShapeDefinition[]>(() => {
  const basicGroup = SHAPE_GROUPS.find((g) => g.key === 'basic')
  return basicGroup ? basicGroup.shapes : []
})

const onSelect = (shape: ShapeDefinition) => {
  recordRecentShape(shape.id)
  emit('select', shape)
}
</script>

<style lang="less" scoped>
.quick-shape-connect-popover {
  position: absolute;
  z-index: 1000;
  width: 256px;
  background-color: #ffffff;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f0f0;
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

  .shape-group-section {
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }

    .shape-group-header {
      display: flex;
      align-items: center;
      margin-bottom: 8px;

      .group-title {
        font-size: 13px;
        font-weight: 500;
        color: #262626;
      }
    }

    // 与左侧 ShapePickerPopover 完全一致的 6 列栅格网格
    .shape-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 2px;

      .shape-item-btn {
        width: 30px;
        height: 30px;
        border: 1px solid transparent;
        background: transparent;
        border-radius: 4px;
        padding: 0;
        margin: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #595959;
        transition: all 0.15s ease;

        &:hover {
          background-color: #f5f5f5;
          color: #262626;
          transform: scale(1.05);
        }

        &:active {
          transform: scale(0.96);
        }

        .shape-svg-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;

          :deep(svg),
          svg {
            width: 30px;
            height: 30px;
          }
        }
      }
    }
  }
}
</style>
