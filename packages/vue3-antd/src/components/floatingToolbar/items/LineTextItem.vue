<template>
  <a-popover
    v-model:open="isOpen"
    trigger="click"
    placement="top"
    :arrow="false"
    overlay-class-name="quick-bubble-popover"
    :overlay-inner-style="{ padding: '8px 10px', borderRadius: '8px' }"
    @open-change="onOpenChange"
  >
    <template #content>
      <div class="line-text-popover">
        <a-input
          ref="inputRef"
          v-model:value="inputValue"
          size="small"
          placeholder="输入线条文字..."
          allow-clear
          @pressEnter="confirmText"
        >
          <template #suffix>
            <a-button size="small" type="primary" class="confirm-btn" @click="confirmText">
              确定
            </a-button>
          </template>
        </a-input>
      </div>
    </template>

    <a-tooltip title="线条文字" placement="bottom" :open="isOpen ? false : undefined">
      <button class="bubble-toolbar-btn" :class="{ 'is-active': isOpen }">
        <span class="t-icon">T</span>
      </button>
    </a-tooltip>
  </a-popover>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { Popover as APopover, Tooltip as ATooltip, Input as AInput, Button as AButton } from 'ant-design-vue'
import type { Board } from '@speed-board/core'
import { useLineOperations } from '../../../composables/useLineOperations'
import { useToolbarPopover } from '../useToolbarPopover'

const props = defineProps<{
  board: Board | null
}>()

const { isOpen } = useToolbarPopover('line-text')
const inputValue = ref('')
const inputRef = ref()

const { getLineText, setLineText } = useLineOperations(() => props.board)

const onOpenChange = (open: boolean) => {
  if (open) {
    inputValue.value = getLineText()
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
}

const confirmText = () => {
  setLineText(inputValue.value)
  isOpen.value = false
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

.line-text-popover {
  width: 180px;
}

.confirm-btn {
  font-size: 11px;
  height: 22px;
  padding: 0 6px;
  background-color: #10b981 !important;
  border-color: #10b981 !important;
}
</style>
