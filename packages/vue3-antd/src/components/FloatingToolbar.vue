<template>
  <div
    v-show="visible"
    ref="toolbarRef"
    class="speed-floating-toolbar"
    :style="toolbarStyle"
    @pointerdown.stop
    @mousedown.stop
  >
    <!-- 1. 填充颜色 (几何图形、脑图节点) -->
    <a-popover
      v-if="hasFill"
      v-model:open="fillOpen"
      trigger="click"
      placement="bottom"
      overlay-class-name="floating-popover-overlay"
      :arrow="false"
    >
      <template #content>
        <div class="color-picker-grid">
          <div
            class="color-dot is-transparent-dot"
            title="无填充"
            @click="updateFill('transparent')"
          >
            <span class="transparent-slash" />
          </div>
          <div
            v-for="color in presetColors"
            :key="color"
            class="color-dot"
            :style="{ backgroundColor: color }"
            @click="updateFill(color)"
          />
        </div>
      </template>
      <a-tooltip title="填充颜色" placement="top">
        <button class="floating-btn">
          <span class="color-preview" :style="{ backgroundColor: currentFill }" />
        </button>
      </a-tooltip>
    </a-popover>

    <!-- 2. 描边与边框 (线条、几何图形、脑图) -->
    <a-popover
      v-if="hasStroke"
      v-model:open="strokeOpen"
      trigger="click"
      placement="bottom"
      overlay-class-name="floating-popover-overlay"
      :arrow="false"
    >
      <template #content>
        <div class="stroke-picker-panel">
          <div class="section-label">描边颜色</div>
          <div class="color-picker-grid">
            <div
              v-for="color in presetColors"
              :key="color"
              class="color-dot"
              :style="{ backgroundColor: color }"
              @click="updateStrokeColor(color)"
            />
          </div>
          <div class="section-label" style="margin-top: 8px;">粗细</div>
          <div class="stroke-width-group">
            <button
              v-for="w in [1, 2, 4, 6]"
              :key="w"
              class="width-btn"
              :class="{ 'is-active': currentStrokeWidth === w }"
              @click="updateStrokeWidth(w)"
            >
              <span class="width-line" :style="{ height: `${w}px` }" />
            </button>
          </div>
          <div class="section-label" style="margin-top: 8px;">线型</div>
          <div class="stroke-style-group">
            <button
              class="style-btn"
              :class="{ 'is-active': currentStrokeStyle === 'solid' }"
              @click="updateStrokeStyle('solid')"
            >
              实线
            </button>
            <button
              class="style-btn"
              :class="{ 'is-active': currentStrokeStyle === 'dashed' }"
              @click="updateStrokeStyle('dashed')"
            >
              虚线
            </button>
          </div>
        </div>
      </template>
      <a-tooltip title="描边" placement="top">
        <button class="floating-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="9" :stroke="currentStrokeColor" :stroke-width="3" />
          </svg>
        </button>
      </a-tooltip>
    </a-popover>

    <!-- 3. 线条专用设置 (线型 + 箭头端点) -->
    <template v-if="isLine">
      <div class="floating-divider" />
      <!-- 折线 / 直线 / 曲线 -->
      <a-tooltip title="折线" placement="top">
        <button
          class="floating-btn"
          :class="{ 'is-active': currentLineShape === 'elbow' }"
          @click="updateLineShape('elbow')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 20h8V4h8" />
          </svg>
        </button>
      </a-tooltip>
      <a-tooltip title="直线" placement="top">
        <button
          class="floating-btn"
          :class="{ 'is-active': currentLineShape === 'straight' }"
          @click="updateLineShape('straight')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="4" y1="20" x2="20" y2="4" />
          </svg>
        </button>
      </a-tooltip>
      <a-tooltip title="曲线" placement="top">
        <button
          class="floating-btn"
          :class="{ 'is-active': currentLineShape === 'curve' }"
          @click="updateLineShape('curve')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 20C12 20 12 4 20 4" />
          </svg>
        </button>
      </a-tooltip>

      <!-- 终点箭头切换 -->
      <a-tooltip title="切换端点箭头" placement="top">
        <button class="floating-btn" @click="toggleTargetMarker">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="4" y1="12" x2="16" y2="12" />
            <polygon points="16 7 22 12 16 17" fill="currentColor" />
          </svg>
        </button>
      </a-tooltip>
    </template>

    <!-- 4. 脑图专用设置 (布局结构) -->
    <template v-if="isMind">
      <div class="floating-divider" />
      <a-tooltip title="向两侧分布 (平衡)" placement="top">
        <button class="floating-btn" @click="setMindmapLayout('standard')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="8" width="6" height="8" rx="2" fill="currentColor" fill-opacity="0.2" />
            <path d="M9 12H4M4 8v8M15 12h5M20 8v8" />
          </svg>
        </button>
      </a-tooltip>
      <a-tooltip title="向右分布" placement="top">
        <button class="floating-btn" @click="setMindmapLayout('right')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="4" y="8" width="6" height="8" rx="2" fill="currentColor" fill-opacity="0.2" />
            <path d="M10 12h10M20 8v8" />
          </svg>
        </button>
      </a-tooltip>
      <a-tooltip title="向左分布" placement="top">
        <button class="floating-btn" @click="setMindmapLayout('left')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="14" y="8" width="6" height="8" rx="2" fill="currentColor" fill-opacity="0.2" />
            <path d="M14 12H4M4 8v8" />
          </svg>
        </button>
      </a-tooltip>
    </template>

    <div class="floating-divider" />

    <!-- 5. 更多选项 (排列 / 对齐 / 图层 / 成组) -->
    <a-popover
      v-model:open="moreOpen"
      trigger="click"
      placement="bottom"
      overlay-class-name="floating-popover-overlay"
      :arrow="false"
    >
      <template #content>
        <div class="more-options-panel">
          <div class="section-label">图层顺序</div>
          <div class="layer-btn-row">
            <a-tooltip title="置于顶层" placement="top">
              <button class="action-btn" @click="props.board?.bringSelectedToFront()">置顶</button>
            </a-tooltip>
            <a-tooltip title="置于底层" placement="top">
              <button class="action-btn" @click="props.board?.sendSelectedToBack()">置底</button>
            </a-tooltip>
            <a-tooltip title="上移一层" placement="top">
              <button class="action-btn" @click="props.board?.bringSelectedForward()">上移</button>
            </a-tooltip>
            <a-tooltip title="下移一层" placement="top">
              <button class="action-btn" @click="props.board?.sendSelectedBackward()">下移</button>
            </a-tooltip>
          </div>

          <div class="section-label" style="margin-top: 8px;">对齐方式</div>
          <div class="align-btn-grid">
            <button class="action-btn" @click="props.board?.alignSelectedNodes('left')">左对齐</button>
            <button class="action-btn" @click="props.board?.alignSelectedNodes('center')">水平居中</button>
            <button class="action-btn" @click="props.board?.alignSelectedNodes('right')">右对齐</button>
            <button class="action-btn" @click="props.board?.alignSelectedNodes('top')">顶对齐</button>
            <button class="action-btn" @click="props.board?.alignSelectedNodes('middle')">垂直居中</button>
            <button class="action-btn" @click="props.board?.alignSelectedNodes('bottom')">底对齐</button>
          </div>

          <div class="section-label" style="margin-top: 8px;">操作</div>
          <div class="layer-btn-row">
            <button class="action-btn" @click="props.board?.groupSelected()">成组</button>
            <button class="action-btn" @click="props.board?.ungroupSelected()">解组</button>
            <button class="action-btn" @click="props.board?.duplicateSelected()">复制</button>
            <button class="action-btn" @click="props.board?.toggleLockSelected()">锁定</button>
          </div>
        </div>
      </template>
      <a-tooltip title="更多设置" placement="top">
        <button class="floating-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        </button>
      </a-tooltip>
    </a-popover>

    <!-- 6. 删除所选图元 -->
    <a-tooltip title="删除 (Delete)" placement="top">
      <button class="floating-btn is-danger" @click="deleteSelected">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
      </button>
    </a-tooltip>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Tooltip as ATooltip, Popover as APopover } from 'ant-design-vue'
import type { Board } from '@speed-board/core'
import { useFloatingToolbar } from '@speed-board/vue3'

const props = defineProps<{
  board: Board | null
}>()

const fillOpen = ref(false)
const strokeOpen = ref(false)
const moreOpen = ref(false)

const presetColors = [
  '#000000',
  '#4b5563',
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#ffffff',
]

const {
  state,
  toolbarStyle,
  updateFill: baseUpdateFill,
  updateStrokeColor,
  updateStrokeWidth,
  updateStrokeStyle,
  updateLineShape,
  toggleTargetMarker,
  setMindmapLayout,
  deleteSelected,
} = useFloatingToolbar(() => props.board)

const visible = computed(() => state.value.visible)
const hasFill = computed(() => state.value.hasFill)
const hasStroke = computed(() => state.value.hasStroke)
const isLine = computed(() => state.value.isLine)
const isMind = computed(() => state.value.isMind)
const currentFill = computed(() => state.value.currentFill)
const currentStrokeColor = computed(() => state.value.currentStrokeColor)
const currentStrokeWidth = computed(() => state.value.currentStrokeWidth)
const currentStrokeStyle = computed(() => state.value.currentStrokeStyle)
const currentLineShape = computed(() => state.value.currentLineShape)
const targetMarker = computed(() => state.value.targetMarker)

const updateFill = (color: string) => {
  fillOpen.value = false
  baseUpdateFill(color)
}
</script>

<style scoped lang="less">
.speed-floating-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05);
  pointer-events: auto;
  user-select: none;
  transition: opacity 0.15s ease;

  .floating-btn {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    border-radius: 6px;
    color: #374151;
    cursor: pointer;
    transition: background 0.15s;

    &:hover {
      background: #f3f4f6;
    }

    &.is-active {
      background: #e0e7ff;
      color: #4f46e5;
    }

    &.is-danger:hover {
      background: #fee2e2;
      color: #ef4444;
    }

    .color-preview {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      border: 1px solid rgba(0, 0, 0, 0.15);
    }
  }

  .floating-divider {
    width: 1px;
    height: 16px;
    background: #e5e7eb;
    margin: 0 2px;
  }
}

.color-picker-grid {
  display: grid;
  grid-template-columns: repeat(5, 20px);
  gap: 6px;
  padding: 4px;

  .color-dot {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid rgba(0, 0, 0, 0.1);
    transition: transform 0.1s;

    &:hover {
      transform: scale(1.15);
    }

    &.is-transparent-dot {
      background: #ffffff;
      position: relative;
      overflow: hidden;

      .transparent-slash {
        position: absolute;
        width: 100%;
        height: 1.5px;
        background: #ef4444;
        top: 50%;
        left: 0;
        transform: rotate(-45deg);
      }
    }
  }
}

.stroke-picker-panel {
  padding: 6px;
  width: 140px;

  .section-label {
    font-size: 11px;
    color: #6b7280;
    margin-bottom: 4px;
  }

  .stroke-width-group {
    display: flex;
    gap: 4px;

    .width-btn {
      flex: 1;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #e5e7eb;
      background: #fff;
      border-radius: 4px;
      cursor: pointer;

      &.is-active {
        border-color: #3b82f6;
        background: #eff6ff;
      }

      .width-line {
        width: 14px;
        background: #374151;
        border-radius: 1px;
      }
    }
  }

  .stroke-style-group {
    display: flex;
    gap: 4px;

    .style-btn {
      flex: 1;
      height: 24px;
      border: 1px solid #e5e7eb;
      background: #fff;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;

      &.is-active {
        border-color: #3b82f6;
        background: #eff6ff;
        color: #3b82f6;
      }
    }
  }
}

.more-options-panel {
  padding: 8px;
  width: 180px;

  .section-label {
    font-size: 11px;
    color: #6b7280;
    margin-bottom: 4px;
  }

  .layer-btn-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
  }

  .align-btn-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
  }

  .action-btn {
    height: 24px;
    border: 1px solid #e5e7eb;
    background: #ffffff;
    border-radius: 4px;
    font-size: 11px;
    color: #374151;
    cursor: pointer;

    &:hover {
      border-color: #3b82f6;
      color: #3b82f6;
    }
  }
}
</style>
