<template>
  <a-popover
    v-model:open="isOpen"
    trigger="click"
    placement="top"
    :arrow="false"
    :get-popup-container="getPopupContainer"
    overlay-class-name="link-bubble-popover plait-board-attached"
    :overlay-inner-style="{ padding: '12px 14px 10px', borderRadius: '10px' }"
    @open-change="onOpenChange"
  >
    <template #content>
      <div class="link-editor-container">
        <!-- 1. 文本输入框 (第一行) -->
        <div class="overlay-field">
          <label class="field-label">文本</label>
          <a-input
            ref="textInputRef"
            v-model:value="formText"
            placeholder="文本内容"
            class="field-input"
            allow-clear
            @pressEnter="confirmLink"
          />
        </div>

        <!-- 2. 链接输入框 (第二行) -->
        <div class="overlay-field">
          <label class="field-label">链接</label>
          <a-input
            ref="linkInputRef"
            v-model:value="formLink"
            placeholder="链接地址，如 https://..."
            class="field-input is-link"
            allow-clear
            @pressEnter="confirmLink"
          >
            <template #prefix>
              <SIconFont type="icon-kl-link1" :size="14" style="color: #9ca3af; margin-right: 2px;" />
            </template>
          </a-input>
        </div>

        <!-- 3. 底部操作区 -->
        <div class="overlay-actions">
          <div class="actions-left">
            <a
              v-if="formattedLink && formattedLink !== '#'"
              :href="formattedLink"
              target="_blank"
              rel="noopener noreferrer"
              class="link-open-anchor"
              title="新标签页打开"
            >
              <ExportOutlined style="font-size: 12px; margin-right: 3px;" />
              打开
            </a>
            <button
              v-if="hasInitialLink"
              class="action-text-btn danger"
              title="清除链接"
              @click="removeLink"
            >
              移除链接
            </button>
          </div>
          <div class="actions-right">
            <a-button
              type="primary"
              class="confirm-btn"
              @click="confirmLink"
            >
              确定
            </a-button>
          </div>
        </div>
      </div>
    </template>

    <a-tooltip title="链接" placement="bottom" :open="isOpen ? false : undefined">
      <button class="bubble-toolbar-btn" :class="{ 'is-active': isOpen || !!hasInitialLink }">
        <SIconFont type="icon-kl-link1" :size="18"/>
      </button>
    </a-tooltip>
  </a-popover>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import {
  Popover as APopover,
  Tooltip as ATooltip,
  Input as AInput,
  Button as AButton,
} from 'ant-design-vue'
import { ExportOutlined } from '@ant-design/icons-vue'
import { IconFont as SIconFont } from 'speed-components-ui/components'
import type { Board } from '@speed-board/core'
import { useNodeStyle } from '@speed-board/vue3'
import { useToolbarPopover } from '../useToolbarPopover'

const props = defineProps<{
  board: Board | null
}>()

const { isOpen, getPopupContainer } = useToolbarPopover('link')
const { textState, updateTextStyle } = useNodeStyle(() => props.board)

const formText = ref('')
const formLink = ref('')
const textInputRef = ref()
const linkInputRef = ref()

const currentText = computed(() => {
  return textState.value.text || ''
})

const currentLink = computed(() => {
  const tLink = textState.value.link
  if (tLink) return tLink
  const firstElem: any = props.board?.selectedElements?.[0]
  return firstElem?.data?.link || firstElem?.link || ''
})

const hasInitialLink = computed(() => !!currentLink.value)

const formattedLink = computed(() => {
  const url = (formLink.value || currentLink.value).trim()
  if (!url) return '#'
  if (/^[a-zA-Z]+:\/\//.test(url)) return url
  return `https://${url}`
})

const onOpenChange = (open: boolean) => {
  if (open) {
    formText.value = currentText.value
    formLink.value = currentLink.value
    nextTick(() => {
      if (formText.value && !formLink.value) {
        linkInputRef.value?.focus()
      } else {
        textInputRef.value?.focus()
      }
    })
  }
}

const confirmLink = () => {
  const tVal = formText.value
  const lVal = formLink.value.trim()

  updateTextStyle({
    text: tVal,
    link: lVal,
  })

  if (props.board) {
    props.board.setShapeProperty({ link: lVal })
  }

  isOpen.value = false
}

const removeLink = () => {
  formLink.value = ''
  updateTextStyle({ link: '' })
  if (props.board) {
    props.board.setShapeProperty({ link: '' })
  }
  isOpen.value = false
}
</script>

<style scoped lang="less">
.link-editor-container {
  width: 270px;
  user-select: none;
}

.overlay-field {
  display: flex;
  flex-direction: column;
  margin-bottom: 10px;

  .field-label {
    font-size: 12px;
    font-weight: 500;
    color: #4b5563;
    margin-bottom: 4px;
  }

  .field-input {
    border-radius: 6px;
    font-size: 13px;

    &:hover {
      border-color: #9ca3af;
    }

    &:focus,
    &.ant-input-focused {
      border-color: #10b981 !important;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15) !important;
    }
  }
}

.overlay-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
  padding-top: 8px;
  border-top: 1px solid #f3f4f6;

  .actions-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .actions-right {
    display: flex;
    align-items: center;
  }

  .link-open-anchor {
    font-size: 12px;
    color: #1677ff;
    text-decoration: none;
    display: inline-flex;
    align-items: center;

    &:hover {
      text-decoration: underline;
    }
  }

  .action-text-btn {
    border: none;
    background: transparent;
    font-size: 12px;
    color: #9ca3af;
    cursor: pointer;
    padding: 0 2px;

    &.danger:hover {
      color: #ef4444;
    }
  }

  .confirm-btn {
    border-radius: 6px;
    font-size: 13px;
    height: 32px;
    padding: 0 16px;
    background-color: #10b981 !important;
    border-color: #10b981 !important;
    color: #ffffff !important;

    &:hover {
      background-color: #059669 !important;
      border-color: #059669 !important;
    }
  }
}
</style>
