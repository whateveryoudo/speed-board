<template>
  <a-popover
    v-model:open="isOpen"
    trigger="click"
    placement="top"
    :arrow="false"
    overlay-class-name="quick-bubble-popover plait-board-attached"
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
            @mousedown.prevent
            @click="toggleBold"
          >
            B
          </button>
          <button
            class="fmt-btn is-italic"
            :class="{ 'is-active': textState.italic }"
            title="斜体"
            @mousedown.prevent
            @click="toggleItalic"
          >
            I
          </button>
          <button
            class="fmt-btn is-strike"
            :class="{ 'is-active': textState.strike }"
            title="删除线"
            @mousedown.prevent
            @click="toggleStrike"
          >
            S
          </button>
          <button
            class="fmt-btn is-underline"
            :class="{ 'is-active': textState.underline }"
            title="下划线"
            @mousedown.prevent
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
            placement="top"
            :arrow="false"
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
            <button class="text-color-btn" title="文字颜色">
              <span class="a-letter">A</span>
              <span class="color-bar" :style="{ backgroundColor: textState.fill || '#262626' }" />
            </button>
          </a-popover>

          <!-- 水平对齐切换 (1:1 语雀二级下拉选择: 左对齐 / 居中对齐 / 右对齐 / 两端对齐) -->
          <a-popover
            v-model:open="alignOpen"
            trigger="click"
            placement="top"
            :arrow="false"
            overlay-class-name="quick-bubble-popover plait-board-attached"
            :overlay-inner-style="{ padding: '4px', borderRadius: '8px' }"
          >
            <template #content>
              <div class="align-dropdown-menu">
                <div
                  v-for="opt in alignOptions"
                  :key="opt.value"
                  class="align-dropdown-item"
                  :class="{ 'is-selected': (textState.align || 'center') === opt.value }"
                  @click="onSelectAlign(opt.value)"
                >
                  <span class="check-icon">
                    <svg
                      v-if="(textState.align || 'center') === opt.value"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#10b981"
                      stroke-width="2.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span class="align-opt-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <template v-if="opt.value === 'center'">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="6" y1="12" x2="18" y2="12" />
                        <line x1="4" y1="18" x2="20" y2="18" />
                      </template>
                      <template v-else-if="opt.value === 'right'">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="9" y1="12" x2="21" y2="12" />
                        <line x1="6" y1="18" x2="21" y2="18" />
                      </template>
                      <template v-else-if="opt.value === 'justify'">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                      </template>
                      <template v-else>
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="15" y2="12" />
                        <line x1="3" y1="18" x2="18" y2="18" />
                      </template>
                    </svg>
                  </span>
                  <span class="align-opt-label">{{ opt.label }}</span>
                </div>
              </div>
            </template>
            <button class="cycle-align-btn" title="水平对齐" :class="{ 'is-active': alignOpen }">
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
                <template v-else-if="textState.align === 'justify'">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </template>
                <template v-else>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="15" y2="12" />
                  <line x1="3" y1="18" x2="18" y2="18" />
                </template>
              </svg>
            </button>
          </a-popover>

          <!-- 垂直对齐切换 (1:1 语雀二级下拉选择: 顶部对齐 / 居中对齐 / 底部对齐) -->
          <a-popover
            v-model:open="valignOpen"
            trigger="click"
            placement="top"
            :arrow="false"
            overlay-class-name="quick-bubble-popover plait-board-attached"
            :overlay-inner-style="{ padding: '4px', borderRadius: '8px' }"
          >
            <template #content>
              <div class="align-dropdown-menu">
                <div
                  v-for="opt in valignOptions"
                  :key="opt.value"
                  class="align-dropdown-item"
                  :class="{ 'is-selected': (textState.verticalAlign || 'middle') === opt.value }"
                  @click="onSelectValign(opt.value)"
                >
                  <span class="check-icon">
                    <svg
                      v-if="(textState.verticalAlign || 'middle') === opt.value"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#10b981"
                      stroke-width="2.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span class="align-opt-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="4" y1="12" x2="20" y2="12" stroke-width="2.5" />
                      <path v-if="opt.value === 'top'" d="M12 7v13M8 11l4-4 4 4" />
                      <path v-else-if="opt.value === 'bottom'" d="M12 17V4M8 13l4 4 4-4" />
                      <path v-else d="M12 5v14M8 8l4-3 4 3M8 16l4 3 4-3" />
                    </svg>
                  </span>
                  <span class="align-opt-label">{{ opt.label }}</span>
                </div>
              </div>
            </template>
            <button class="cycle-align-btn" title="垂直对齐" :class="{ 'is-active': valignOpen }">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="4" y1="12" x2="20" y2="12" stroke-width="2.5" />
                <path v-if="textState.verticalAlign === 'top'" d="M12 7v13M8 11l4-4 4 4" />
                <path v-else-if="textState.verticalAlign === 'bottom'" d="M12 17V4M8 13l4 4 4-4" />
                <path v-else d="M12 5v14M8 8l4-3 4 3M8 16l4 3 4-3" />
              </svg>
            </button>
          </a-popover>
        </div>
      </div>
    </template>

    <a-tooltip title="文本" placement="top" :open="isOpen ? false : undefined">
      <button class="bubble-toolbar-btn" :class="{ 'is-active': isOpen }">
        <SIconFont type="icon-kl-text2" :size="18"/>
      </button>
    </a-tooltip>
  </a-popover>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Popover as APopover, Tooltip as ATooltip, Select as ASelect } from 'ant-design-vue'
import type { Board } from '@speed-board/core'
import ColorTonePicker from '../../ColorTonePicker.vue'
import { useNodeStyle } from '@speed-board/vue3'
import { IconFont as SIconFont } from 'speed-components-ui/components'
import { useToolbarPopover } from '../useToolbarPopover'

const props = defineProps<{
  board: Board | null
}>()

const { isOpen } = useToolbarPopover('text')
const colorOpen = ref(false)
const alignOpen = ref(false)
const valignOpen = ref(false)

watch(isOpen, (v) => {
  if (!v) {
    colorOpen.value = false
    alignOpen.value = false
    valignOpen.value = false
  }
})
const { textState, updateTextStyle } = useNodeStyle(() => props.board)

const fontSizeOptions = [
  { label: '12px', value: 12 },
  { label: '14px', value: 14 },
  { label: '16px', value: 16 },
  { label: '18px', value: 18 },
  { label: '24px', value: 24 },
  { label: '32px', value: 32 },
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

const onFontSizeChange = (val: any) => {
  updateTextStyle({ fontSize: Number(val) })
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

.font-select {
  width: 72px;
}

.font-select :deep(.ant-select-selector) {
  padding: 0 4px !important;
  font-size: 12px;
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
