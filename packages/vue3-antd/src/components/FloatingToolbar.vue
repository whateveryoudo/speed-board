<template>
  <div
    v-show="visible"
    ref="toolbarRef"
    class="speed-floating-toolbar plait-board-attached"
    :style="toolbarStyle"
    @pointerdown.stop
    @pointerup.stop
    @mousedown.stop
    @mouseup.stop
    @click.stop
  >
    <!-- 1. 填充颜色 (几何图形、矢量图、脑图节点) -->
    <a-popover
      v-if="hasItem('fill')"
      v-model:open="fillOpen"
      trigger="click"
      placement="bottom"
      overlay-class-name="floating-popover-overlay plait-board-attached"
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

    <!-- 2. 描边与边框 (线条、几何图形、矢量图、脑图) -->
    <a-popover
      v-if="hasItem('stroke')"
      v-model:open="strokeOpen"
      trigger="click"
      placement="bottom"
      overlay-class-name="floating-popover-overlay plait-board-attached"
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
    <template v-if="hasItem('line-type')">
      <div class="floating-divider" />
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
    </template>

    <template v-if="hasItem('arrow-head')">
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

    <!-- 4. 纯文本专属工具 (字号、颜色、粗体、对齐) -->
    <template v-if="hasItem('font-size')">
      <div v-if="hasItem('fill') || hasItem('stroke')" class="floating-divider" />
      <a-select
        :value="textState.fontSize || 14"
        size="small"
        class="floating-font-select"
        :bordered="false"
        :options="fontSizeOptions"
        :dropdown-match-select-width="false"
        popup-class-name="plait-board-attached"
        @change="onFontSizeChange"
      />
    </template>

    <template v-if="hasItem('text-color')">
      <a-popover
        v-model:open="textColorOpen"
        trigger="click"
        placement="bottom"
        overlay-class-name="floating-popover-overlay plait-board-attached"
        :arrow="false"
      >
        <template #content>
          <div class="color-picker-grid">
            <div
              v-for="color in presetColors"
              :key="color"
              class="color-dot"
              :style="{ backgroundColor: color }"
              @click="updateTextColor(color)"
            />
          </div>
        </template>
        <a-tooltip title="文字颜色" placement="top">
          <button class="floating-btn text-color-btn">
            <span class="a-letter">A</span>
            <span class="color-bar" :style="{ backgroundColor: textState.fill || '#262626' }" />
          </button>
        </a-tooltip>
      </a-popover>
    </template>

    <template v-if="hasItem('bold')">
      <a-tooltip title="加粗" placement="top">
        <button
          class="floating-btn"
          :class="{ 'is-active': textState.bold }"
          @click="toggleBold"
        >
          <span class="bold-b">B</span>
        </button>
      </a-tooltip>
    </template>

    <template v-if="hasItem('align-h')">
      <a-tooltip :title="alignTooltip" placement="top">
        <button class="floating-btn" @click="cycleAlign">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <template v-if="textState.align === 'center'">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="6" y1="12" x2="18" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </template>
            <template v-else-if="textState.align === 'right'">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="9" y1="12" x2="21" y2="12" />
              <line x1="6" y1="18" x2="21" y2="18" />
            </template>
            <template v-else>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="15" y2="12" />
              <line x1="3" y1="18" x2="18" y2="18" />
            </template>
          </svg>
        </button>
      </a-tooltip>
    </template>

    <!-- 5. 形状内部文字排版气泡 (Shape / Mindmap 节点文本) -->
    <a-popover
      v-if="hasItem('text')"
      v-model:open="textPopoverOpen"
      trigger="click"
      placement="bottom"
      overlay-class-name="floating-popover-overlay plait-board-attached"
      :arrow="false"
    >
      <template #content>
        <div class="quick-text-panel">
          <div class="format-btn-row">
            <button class="fmt-btn" :class="{ 'is-active': textState.bold }" title="加粗" @click="toggleBold">
              <b>B</b>
            </button>
            <button class="fmt-btn" :class="{ 'is-active': textState.italic }" title="斜体" @click="updateTextStyle({ italic: !textState.italic })">
              <i>I</i>
            </button>
            <button class="fmt-btn" :class="{ 'is-active': textState.strike }" title="删除线" @click="updateTextStyle({ strike: !textState.strike })">
              <s>S</s>
            </button>
            <button class="fmt-btn" :class="{ 'is-active': textState.underline }" title="下划线" @click="updateTextStyle({ underline: !textState.underline })">
              <u>U</u>
            </button>
          </div>
          <div class="section-divider" />
          <div class="format-btn-row">
            <a-select
              :value="textState.fontSize || 14"
              size="small"
              class="floating-font-select"
              :bordered="false"
              :options="fontSizeOptions"
              popup-class-name="plait-board-attached"
              @change="onFontSizeChange"
            />
            <div class="text-color-preview-wrapper" @click="textSubColorOpen = !textSubColorOpen">
              <span class="a-letter">A</span>
              <span class="color-bar" :style="{ backgroundColor: textState.fill || '#262626' }" />
            </div>
            <button class="fmt-btn" :title="alignTooltip" @click="cycleAlign">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <template v-if="textState.align === 'center'">
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
                </template>
                <template v-else-if="textState.align === 'right'">
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" />
                </template>
                <template v-else>
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" />
                </template>
              </svg>
            </button>
          </div>
          <div v-if="textSubColorOpen" class="color-picker-grid" style="margin-top: 6px;">
            <div
              v-for="color in presetColors"
              :key="color"
              class="color-dot"
              :style="{ backgroundColor: color }"
              @click="updateTextColor(color); textSubColorOpen = false;"
            />
          </div>
        </div>
      </template>
      <a-tooltip title="文本样式" placement="top">
        <button class="floating-btn" :class="{ 'is-active': textPopoverOpen }">
          <span class="t-icon">T</span>
        </button>
      </a-tooltip>
    </a-popover>

    <!-- 6. 不透明度 (图片等) -->
    <a-popover
      v-if="hasItem('opacity')"
      v-model:open="opacityOpen"
      trigger="click"
      placement="bottom"
      overlay-class-name="floating-popover-overlay plait-board-attached"
      :arrow="false"
    >
      <template #content>
        <div class="opacity-picker-panel">
          <div class="section-label">不透明度: {{ Math.round((styleState.opacity ?? 1) * 100) }}%</div>
          <a-slider
            :value="Math.round((styleState.opacity ?? 1) * 100)"
            :min="10"
            :max="100"
            :step="5"
            style="width: 140px; margin: 6px 4px 2px 4px;"
            @change="(val: any) => updateStyle({ opacity: Number(val) / 100 })"
          />
        </div>
      </template>
      <a-tooltip title="不透明度" placement="top">
        <button class="floating-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="9" stroke-dasharray="2 2" />
            <path d="M12 3v18A9 9 0 0 0 12 3z" fill="currentColor" />
          </svg>
        </button>
      </a-tooltip>
    </a-popover>

    <!-- 7. 脑图专用设置 (布局结构) -->
    <template v-if="hasItem('mindmap-layout')">
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

    <!-- 8. 多选排列与成组 -->
    <template v-if="hasItem('arrange')">
      <a-tooltip title="左对齐" placement="top">
        <button class="floating-btn" @click="props.board?.alignSelected('left')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="4" y1="4" x2="4" y2="20" />
            <rect x="4" y="6" width="12" height="4" rx="1" />
            <rect x="4" y="14" width="8" height="4" rx="1" />
          </svg>
        </button>
      </a-tooltip>
      <a-tooltip title="水平居中" placement="top">
        <button class="floating-btn" @click="props.board?.alignSelected('center')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="4" x2="12" y2="20" />
            <rect x="6" y="6" width="12" height="4" rx="1" />
            <rect x="8" y="14" width="8" height="4" rx="1" />
          </svg>
        </button>
      </a-tooltip>
      <a-tooltip title="右对齐" placement="top">
        <button class="floating-btn" @click="props.board?.alignSelected('right')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="20" y1="4" x2="20" y2="20" />
            <rect x="8" y="6" width="12" height="4" rx="1" />
            <rect x="12" y="14" width="8" height="4" rx="1" />
          </svg>
        </button>
      </a-tooltip>
    </template>

    <!-- 9. 打开右侧设置面板 -->
    <template v-if="hasItem('open-panel')">
      <div class="floating-divider" />
      <a-tooltip title="打开设置面板" placement="top">
        <button class="floating-btn" @click="emit('toggle-settings')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" />
            <line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
          </svg>
        </button>
      </a-tooltip>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Tooltip as ATooltip,
  Popover as APopover,
  Select as ASelect,
  Slider as ASlider,
} from 'ant-design-vue'
import type { Board } from '@speed-board/core'
import { useFloatingToolbar, useNodeStyle } from '@speed-board/vue3'
import { getNodeSchema, type QuickToolbarItem } from '../schema/nodeSchema'

const props = defineProps<{
  board: Board | null
}>()

const emit = defineEmits<{
  (e: 'toggle-settings'): void
}>()

const fillOpen = ref(false)
const strokeOpen = ref(false)
const textColorOpen = ref(false)
const textPopoverOpen = ref(false)
const textSubColorOpen = ref(false)
const opacityOpen = ref(false)

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

const fontSizeOptions = [
  { label: '12', value: 12 },
  { label: '14', value: 14 },
  { label: '16', value: 16 },
  { label: '18', value: 18 },
  { label: '20', value: 20 },
  { label: '24', value: 24 },
  { label: '32', value: 32 },
  { label: '48', value: 48 },
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
} = useFloatingToolbar(() => props.board)

const {
  textState,
  styleState,
  updateTextStyle,
  updateStyle,
} = useNodeStyle(() => props.board)

const visible = computed(() => state.value.visible)
const selectedType = computed(() => state.value.selectedType)
const activeSchema = computed(() => getNodeSchema(selectedType.value))
const activeToolbarItems = computed(() => activeSchema.value?.quickToolbar || [])

const hasItem = (item: QuickToolbarItem) => {
  return activeToolbarItems.value.includes(item)
}

const currentFill = computed(() => state.value.currentFill)
const currentStrokeColor = computed(() => state.value.currentStrokeColor)
const currentStrokeWidth = computed(() => state.value.currentStrokeWidth)
const currentStrokeStyle = computed(() => state.value.currentStrokeStyle)
const currentLineShape = computed(() => state.value.currentLineShape)

const updateFill = (color: string) => {
  fillOpen.value = false
  baseUpdateFill(color)
}

const onFontSizeChange = (val: any) => {
  updateTextStyle({ fontSize: Number(val) })
}

const updateTextColor = (color: string) => {
  textColorOpen.value = false
  updateTextStyle({ fill: color })
}

const toggleBold = () => {
  updateTextStyle({ bold: !textState.value.bold })
}

const cycleAlign = () => {
  const cur = textState.value.align || 'left'
  const next = cur === 'left' ? 'center' : cur === 'center' ? 'right' : 'left'
  updateTextStyle({ align: next })
}

const alignTooltip = computed(() => {
  const cur = textState.value.align || 'left'
  return cur === 'left' ? '左对齐' : cur === 'center' ? '居中对齐' : '右对齐'
})
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

    .color-preview {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      border: 1px solid rgba(0, 0, 0, 0.15);
    }
  }

  .text-color-btn {
    flex-direction: column;
    gap: 1px;
  }

  .a-letter {
    font-size: 13px;
    font-weight: 700;
    line-height: 13px;
    color: #1f2937;
  }

  .color-bar {
    width: 14px;
    height: 3px;
    border-radius: 1px;
  }

  .bold-b {
    font-size: 14px;
    font-weight: 700;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  .t-icon {
    font-size: 14px;
    font-weight: 600;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  .floating-font-select {
    width: 58px;

    :deep(.ant-select-selector) {
      padding: 0 4px !important;
      font-size: 13px !important;
      font-weight: 500;
      color: #374151;
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

.quick-text-panel {
  width: 160px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px;

  .format-btn-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
  }

  .fmt-btn {
    flex: 1;
    height: 26px;
    border: none;
    background: transparent;
    border-radius: 4px;
    font-size: 13px;
    color: #374151;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;

    &:hover {
      background-color: #f3f4f6;
      color: #111827;
    }

    &.is-active {
      background-color: #e5e7eb;
      color: #111827;
    }
  }

  .text-color-preview-wrapper {
    width: 26px;
    height: 26px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 4px;
    transition: background 0.15s;

    &:hover {
      background: #f3f4f6;
    }

    .a-letter {
      font-size: 12px;
      font-weight: 700;
      line-height: 12px;
    }

    .color-bar {
      width: 14px;
      height: 2.5px;
      border-radius: 1px;
      margin-top: 1px;
    }
  }

  .section-divider {
    height: 1px;
    background: #f3f4f6;
  }
}

.opacity-picker-panel {
  padding: 6px;

  .section-label {
    font-size: 11px;
    color: #6b7280;
    margin-bottom: 2px;
  }
}
</style>
