<template>
  <a-popover
    v-model:open="isOpen"
    trigger="click"
    placement="bottom"
    :arrow="false"
    overlay-class-name="quick-bubble-popover"
    :overlay-inner-style="{ padding: '8px 10px', borderRadius: '8px' }"
  >
    <template #content>
      <div class="quick-text-popover">
        <!-- 上排：B I S U -->
        <div class="format-btn-row">
          <button
            class="fmt-btn is-bold"
            :class="{ 'is-active': textState.bold }"
            title="加粗"
            @click="toggleBold"
          >
            B
          </button>
          <button
            class="fmt-btn is-italic"
            :class="{ 'is-active': textState.italic }"
            title="斜体"
            @click="toggleItalic"
          >
            I
          </button>
          <button
            class="fmt-btn is-strike"
            :class="{ 'is-active': textState.strike }"
            title="删除线"
            @click="toggleStrike"
          >
            S
          </button>
          <button
            class="fmt-btn is-underline"
            :class="{ 'is-active': textState.underline }"
            title="下划线"
            @click="toggleUnderline"
          >
            U
          </button>
        </div>

        <div class="divider" />

        <!-- 下排：字号 + 字体颜色 + 水平对齐 + 垂直对齐 -->
        <div class="second-row">
          <!-- 字号切换 -->
          <a-select
            :value="textState.fontSize || 14"
            size="small"
            class="font-select"
            :bordered="false"
            :options="fontSizeOptions"
            @change="onFontSizeChange"
          />

          <!-- 文本颜色 -->
          <a-popover
            v-model:open="colorOpen"
            trigger="click"
            placement="bottom"
            :arrow="false"
            overlay-class-name="quick-bubble-popover"
            :overlay-inner-style="{ padding: '12px 14px', borderRadius: '10px' }"
          >
            <template #content>
              <ColorTonePicker
                :model-value="textState.fill || '#262626'"
                :allow-transparent="false"
                @update:model-value="onTextColorSelect"
              />
            </template>
            <button class="text-color-btn" title="文字颜色">
              <span class="a-letter">A</span>
              <span class="color-bar" :style="{ backgroundColor: textState.fill || '#262626' }" />
            </button>
          </a-popover>

          <!-- 水平对齐切换 (循环切换: left -> center -> right) -->
          <button class="cycle-align-btn" title="水平对齐" @click="cycleHorizontalAlign">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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

          <!-- 垂直对齐切换 (循环切换: top -> middle -> bottom) -->
          <button class="cycle-align-btn" title="垂直对齐" @click="cycleVerticalAlign">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="4" y1="12" x2="20" y2="12" stroke-width="2.5" />
              <path v-if="textState.verticalAlign === 'top'" d="M12 7v13M8 11l4-4 4 4" />
              <path v-else-if="textState.verticalAlign === 'bottom'" d="M12 17V4M8 13l4 4 4-4" />
              <path v-else d="M12 5v14M8 8l4-3 4 3M8 16l4 3 4-3" />
            </svg>
          </button>
        </div>
      </div>
    </template>

    <a-tooltip title="文本" placement="top" :open="isOpen ? false : undefined">
      <button class="bubble-toolbar-btn" :class="{ 'is-active': isOpen }">
        <span class="t-icon">T</span>
      </button>
    </a-tooltip>
  </a-popover>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Popover as APopover, Tooltip as ATooltip, Select as ASelect } from 'ant-design-vue'
import type { Board } from '@speed-board/core'
import ColorTonePicker from '../../ColorTonePicker.vue'
import { useNodeStyle } from '../../../composables/useNodeStyle'

const props = defineProps<{
  board: Board | null
}>()

const isOpen = ref(false)
const colorOpen = ref(false)
const { textState, updateTextStyle } = useNodeStyle(() => props.board)

const fontSizeOptions = [
  { label: '12px', value: 12 },
  { label: '14px', value: 14 },
  { label: '16px', value: 16 },
  { label: '18px', value: 18 },
  { label: '24px', value: 24 },
  { label: '32px', value: 32 },
]

const toggleBold = () => {
  updateTextStyle({ bold: !textState.value.bold })
}

const toggleItalic = () => {
  updateTextStyle({ italic: !textState.value.italic })
}

const toggleStrike = () => {
  updateTextStyle({ strike: !textState.value.strike })
}

const toggleUnderline = () => {
  updateTextStyle({ underline: !textState.value.underline })
}

const onFontSizeChange = (val: any) => {
  updateTextStyle({ fontSize: Number(val) })
}

const onTextColorSelect = (color: string) => {
  updateTextStyle({ fill: color })
}

const cycleHorizontalAlign = () => {
  const current = textState.value.align || 'left'
  const next = current === 'left' ? 'center' : current === 'center' ? 'right' : 'left'
  updateTextStyle({ align: next })
}

const cycleVerticalAlign = () => {
  const current = textState.value.verticalAlign || 'middle'
  const next = current === 'top' ? 'middle' : current === 'middle' ? 'bottom' : 'top'
  updateTextStyle({ verticalAlign: next })
}
</script>

<style scoped>
.bubble-toolbar-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #374151;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.bubble-toolbar-btn:hover {
  background-color: #f3f4f6;
  color: #111827;
}

.bubble-toolbar-btn.is-active {
  background-color: #e5e7eb;
}

.t-icon {
  font-size: 16px;
  font-weight: 500;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.quick-text-popover {
  width: 172px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.format-btn-row {
  display: flex;
  align-items: center;
  background-color: #f3f4f6;
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}

.fmt-btn {
  flex: 1;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 4px;
  font-size: 13px;
  color: #4b5563;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.fmt-btn:hover {
  color: #111827;
}

.fmt-btn.is-active {
  background-color: #ffffff;
  color: #10b981;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.fmt-btn.is-bold { font-weight: bold; }
.fmt-btn.is-italic { font-style: italic; }
.fmt-btn.is-strike { text-decoration: line-through; }
.fmt-btn.is-underline { text-decoration: underline; }

.divider {
  height: 1px;
  background-color: #f3f4f6;
}

.second-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.font-select {
  width: 72px;
}

.font-select :deep(.ant-select-selector) {
  padding: 0 4px !important;
  font-size: 12px;
}

.text-color-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
}

.text-color-btn:hover {
  background-color: #f3f4f6;
}

.a-letter {
  font-size: 12px;
  font-weight: 600;
  line-height: 12px;
  color: #374151;
}

.color-bar {
  width: 14px;
  height: 3px;
  border-radius: 1px;
  margin-top: 1px;
}

.cycle-align-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: #4b5563;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cycle-align-btn:hover {
  background-color: #f3f4f6;
  color: #111827;
}
</style>
