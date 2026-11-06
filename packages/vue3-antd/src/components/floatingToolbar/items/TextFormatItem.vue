<template>
  <a-popover
    v-model:open="isOpen"
    trigger="click"
    placement="top"
    :arrow="false"
    :get-popup-container="getPopupContainer"
    overlay-class-name="quick-bubble-popover plait-board-attached"
    :overlay-inner-style="{ padding: '8px 10px', borderRadius: '8px' }"
  >
    <template #content>
      <div class="quick-text-popover" @mousedown.prevent>
        <!-- 上排：B I S U (Ant Design Vue 图标，对齐 speed-editor / speed-sheet) -->
        <div class="format-btn-row">
          <button
            class="fmt-btn is-bold"
            :class="{ 'is-active': textState.bold }"
            title="加粗"
            @mousedown.prevent
            @click="toggleBold"
          >
            <BoldOutlined />
          </button>
          <button
            class="fmt-btn is-italic"
            :class="{ 'is-active': textState.italic }"
            title="斜体"
            @mousedown.prevent
            @click="toggleItalic"
          >
            <ItalicOutlined />
          </button>
          <button
            class="fmt-btn is-strike"
            :class="{ 'is-active': textState.strike }"
            title="删除线"
            @mousedown.prevent
            @click="toggleStrike"
          >
            <StrikethroughOutlined />
          </button>
          <button
            class="fmt-btn is-underline"
            :class="{ 'is-active': textState.underline }"
            title="下划线"
            @mousedown.prevent
            @click="toggleUnderline"
          >
            <UnderlineOutlined />
          </button>
        </div>

        <div class="divider" />

        <!-- 下排：字号 + 字体颜色 + 水平对齐 + 垂直对齐 -->
        <div class="second-row">
          <!-- 字号选择 (二级 Popover 下拉，防失焦，防跳闪) -->
          <a-popover
            v-model:open="fontSizeOpen"
            trigger="click"
            placement="top"
            :arrow="false"
            :get-popup-container="getPopupContainer"
            overlay-class-name="quick-bubble-popover plait-board-attached"
            :overlay-inner-style="{ padding: '4px', borderRadius: '8px' }"
          >
            <template #content>
              <div class="font-size-dropdown-menu">
                <div
                  v-for="opt in fontSizeOptions"
                  :key="opt.value"
                  class="font-size-dropdown-item"
                  :class="{ 'is-selected': (textState.fontSize || 14) === opt.value }"
                  @mousedown.prevent
                  @click="onSelectFontSize(opt.value)"
                >
                  <span class="font-size-label">{{ opt.label }}</span>
                  <CheckOutlined v-if="(textState.fontSize || 14) === opt.value" style="color: #10b981; font-size: 11px; margin-left: auto;" />
                </div>
              </div>
            </template>
            <button class="font-size-btn" title="字号" :class="{ 'is-active': fontSizeOpen }" @mousedown.prevent>
              <span class="font-size-text">{{ textState.fontSize || 14 }}px</span>
              <DownOutlined class="dropdown-arrow" />
            </button>
          </a-popover>

          <!-- 文本颜色 -->
          <a-popover
            v-model:open="colorOpen"
            trigger="click"
            placement="top"
            :arrow="false"
            :get-popup-container="getPopupContainer"
            overlay-class-name="quick-bubble-popover plait-board-attached"
            :overlay-inner-style="{ padding: '12px 14px', borderRadius: '10px' }"
          >
            <template #content>
              <ColorTonePicker
                :model-value="textState.fill || '#262626'"
                :allow-transparent="false"
                @update:model-value="onTextColorSelect"
              />
            </template>
            <button class="text-color-btn" title="文字颜色" @mousedown.prevent>
              <span class="a-letter">A</span>
              <span class="color-bar" :style="{ backgroundColor: textState.fill || '#262626' }" />
            </button>
          </a-popover>

          <!-- 水平对齐切换 (1:1 语雀 / speed-sheet: 左对齐 / 居中对齐 / 右对齐 / 两端对齐) -->
          <a-popover
            v-model:open="alignOpen"
            trigger="click"
            placement="top"
            :arrow="false"
            :get-popup-container="getPopupContainer"
            overlay-class-name="quick-bubble-popover plait-board-attached"
            :overlay-inner-style="{ padding: '4px', borderRadius: '8px' }"
          >
            <template #content>
              <div class="align-dropdown-menu" @mousedown.prevent>
                <div
                  v-for="opt in alignOptions"
                  :key="opt.value"
                  class="align-dropdown-item"
                  :class="{ 'is-selected': (textState.align || 'center') === opt.value }"
                  @mousedown.prevent
                  @click="onSelectAlign(opt.value)"
                >
                  <span class="check-icon">
                    <CheckOutlined
                      v-if="(textState.align || 'center') === opt.value"
                      style="color: #10b981; font-size: 11px;"
                    />
                  </span>
                  <span class="align-opt-icon">
                    <AlignLeftOutlined v-if="opt.value === 'left'" />
                    <AlignRightOutlined v-else-if="opt.value === 'right'" />
                    <MenuOutlined v-else-if="opt.value === 'justify'" />
                    <AlignCenterOutlined v-else />
                  </span>
                  <span class="align-opt-label">{{ opt.label }}</span>
                </div>
              </div>
            </template>
            <button class="cycle-align-btn" title="水平对齐" :class="{ 'is-active': alignOpen }" @mousedown.prevent>
              <AlignLeftOutlined v-if="textState.align === 'left'" />
              <AlignRightOutlined v-else-if="textState.align === 'right'" />
              <MenuOutlined v-else-if="textState.align === 'justify'" />
              <AlignCenterOutlined v-else />
            </button>
          </a-popover>

          <!-- 垂直对齐切换 (1:1 speed-sheet: 顶部对齐 / 居中对齐 / 底部对齐) -->
          <a-popover
            v-model:open="valignOpen"
            trigger="click"
            placement="top"
            :arrow="false"
            :get-popup-container="getPopupContainer"
            overlay-class-name="quick-bubble-popover plait-board-attached"
            :overlay-inner-style="{ padding: '4px', borderRadius: '8px' }"
          >
            <template #content>
              <div class="align-dropdown-menu" @mousedown.prevent>
                <div
                  v-for="opt in valignOptions"
                  :key="opt.value"
                  class="align-dropdown-item"
                  :class="{ 'is-selected': (textState.verticalAlign || 'middle') === opt.value }"
                  @mousedown.prevent
                  @click="onSelectValign(opt.value)"
                >
                  <span class="check-icon">
                    <CheckOutlined
                      v-if="(textState.verticalAlign || 'middle') === opt.value"
                      style="color: #10b981; font-size: 11px;"
                    />
                  </span>
                  <span class="align-opt-icon">
                    <VerticalAlignTopOutlined v-if="opt.value === 'top'" />
                    <VerticalAlignBottomOutlined v-else-if="opt.value === 'bottom'" />
                    <VerticalAlignMiddleOutlined v-else />
                  </span>
                  <span class="align-opt-label">{{ opt.label }}</span>
                </div>
              </div>
            </template>
            <button class="cycle-align-btn" title="垂直对齐" :class="{ 'is-active': valignOpen }" @mousedown.prevent>
              <VerticalAlignTopOutlined v-if="textState.verticalAlign === 'top'" />
              <VerticalAlignBottomOutlined v-else-if="textState.verticalAlign === 'bottom'" />
              <VerticalAlignMiddleOutlined v-else />
            </button>
          </a-popover>
        </div>
      </div>
    </template>

    <a-tooltip title="文本" placement="top" :open="isOpen ? false : undefined">
      <button class="bubble-toolbar-btn" :class="{ 'is-active': isOpen }" @mousedown.prevent>
        <FontSizeOutlined :style="{ fontSize: '16px' }" />
      </button>
    </a-tooltip>
  </a-popover>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Popover as APopover, Tooltip as ATooltip } from 'ant-design-vue'
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  MenuOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignMiddleOutlined,
  VerticalAlignBottomOutlined,
  DownOutlined,
  CheckOutlined,
  FontSizeOutlined,
} from '@ant-design/icons-vue'
import type { Board } from '@speed-board/core'
import ColorTonePicker from '../../ColorTonePicker.vue'
import { useNodeStyle } from '@speed-board/vue3'
import { useToolbarPopover } from '../useToolbarPopover'

const props = defineProps<{
  board: Board | null
}>()

const { isOpen, getPopupContainer } = useToolbarPopover('text')
const fontSizeOpen = ref(false)
const colorOpen = ref(false)
const alignOpen = ref(false)
const valignOpen = ref(false)

watch(isOpen, (v) => {
  if (!v) {
    fontSizeOpen.value = false
    colorOpen.value = false
    alignOpen.value = false
    valignOpen.value = false
  }
})
const { textState, updateTextStyle } = useNodeStyle(() => props.board)

const fontSizeOptions = [
  { label: '12px', value: 12 },
  { label: '14px', value: 14 },
  { label: '15px', value: 15 },
  { label: '16px', value: 16 },
  { label: '18px', value: 18 },
  { label: '19px', value: 19 },
  { label: '22px', value: 22 },
  { label: '24px', value: 24 },
  { label: '28px', value: 28 },
  { label: '32px', value: 32 },
  { label: '36px', value: 36 },
]

const alignOptions = [
  { label: '左对齐', value: 'left' },
  { label: '居中对齐', value: 'center' },
  { label: '右对齐', value: 'right' },
  { label: '两端对齐', value: 'justify' },
]

const valignOptions = [
  { label: '顶部对齐', value: 'top' },
  { label: '居中对齐', value: 'middle' },
  { label: '底部对齐', value: 'bottom' },
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

const onSelectFontSize = (val: number) => {
  updateTextStyle({ fontSize: Number(val) })
  fontSizeOpen.value = false
}

const onTextColorSelect = (color: string) => {
  updateTextStyle({ fill: color })
}

const onSelectAlign = (val: string) => {
  updateTextStyle({ align: val as any })
  alignOpen.value = false
}

const onSelectValign = (val: string) => {
  updateTextStyle({ verticalAlign: val as any })
  valignOpen.value = false
}
</script>

<style scoped>
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
  justify-content: space-between;
  gap: 4px;
}

.fmt-btn {
  flex: 1;
  height: 28px;
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
}

.fmt-btn:hover {
  background-color: #f3f4f6;
  color: #111827;
}

.fmt-btn.is-active {
  background-color: #e5e7eb;
  color: #111827;
  font-weight: 600;
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
  gap: 4px;
}

.font-size-btn {
  height: 26px;
  padding: 0 4px 0 6px;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 3px;
  border-radius: 4px;
  cursor: pointer;
  color: #374151;
  transition: all 0.15s ease;
  user-select: none;
}

.font-size-btn:hover {
  background-color: #f3f4f6;
  color: #111827;
}

.font-size-btn.is-active {
  background-color: #e5e7eb;
  color: #111827;
}

.font-size-text {
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
}

.dropdown-arrow {
  color: #6b7280;
  transition: transform 0.15s ease;
}

.font-size-btn.is-active .dropdown-arrow {
  transform: rotate(180deg);
}

.font-size-dropdown-menu {
  display: flex;
  flex-direction: column;
  min-width: 80px;
  gap: 2px;
}

.font-size-dropdown-item {
  display: flex;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #374151;
  transition: all 0.15s ease;
  user-select: none;
}

.font-size-dropdown-item:hover {
  background-color: #f3f4f6;
  color: #111827;
}

.font-size-dropdown-item.is-selected {
  font-weight: 600;
  color: #1677ff;
  background-color: #e6f4ff;
}

.text-color-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.text-color-btn:hover {
  background-color: #f3f4f6;
}

.text-color-btn.is-active {
  background-color: #e5e7eb;
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
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: #374151;
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

.cycle-align-btn.is-active {
  background-color: #e5e7eb;
  color: #111827;
}

.align-dropdown-menu {
  display: flex;
  flex-direction: column;
  min-width: 116px;
  gap: 2px;
}

.align-dropdown-item {
  display: flex;
  align-items: center;
  height: 30px;
  padding: 0 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #374151;
  transition: all 0.15s ease;
  user-select: none;
}

.align-dropdown-item:hover {
  background-color: #f3f4f6;
  color: #111827;
}

.align-dropdown-item.is-selected {
  font-weight: 500;
  color: #111827;
}

.check-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
}

.align-opt-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  color: #4b5563;
}

.align-opt-label {
  flex: 1;
}
</style>
