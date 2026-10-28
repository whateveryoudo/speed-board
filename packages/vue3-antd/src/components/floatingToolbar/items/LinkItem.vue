<template>
  <a-popover
    v-model:open="isOpen"
    trigger="click"
    placement="top"
    :arrow="false"
    overlay-class-name="quick-bubble-popover plait-board-attached"
    :overlay-inner-style="{ padding: '8px 10px', borderRadius: '8px' }"
    @open-change="onOpenChange"
  >
    <template #content>
      <div class="link-popover-content">
        <!-- 1. 已有链接预览卡片 -->
        <div v-if="currentLink && !isEditing" class="link-preview-box">
          <a
            :href="formattedLink"
            target="_blank"
            rel="noopener noreferrer"
            class="link-preview-url"
            :title="currentLink"
          >
            <SIconFont type="icon-kl-link1" :size="14" style="margin-right: 4px; flex-shrink: 0;" />
            <span class="url-text">{{ currentLink }}</span>
          </a>
          <div class="link-actions">
            <a-tooltip title="打开链接" placement="top">
              <button class="link-action-btn" @click="openLink">
                <ExportOutlined />
              </button>
            </a-tooltip>
            <a-tooltip title="编辑" placement="top">
              <button class="link-action-btn" @click="startEdit">
                <EditOutlined />
              </button>
            </a-tooltip>
            <a-tooltip title="移除链接" placement="top">
              <button class="link-action-btn danger" @click="removeLink">
                <DeleteOutlined />
              </button>
            </a-tooltip>
          </div>
        </div>

        <!-- 2. 编辑或新建链接输入框 -->
        <div v-else class="link-edit-box">
          <a-input
            ref="inputRef"
            v-model:value="inputValue"
            size="small"
            placeholder="输入或粘贴链接 (如 https://...)"
            allow-clear
            @pressEnter="confirmLink"
          >
            <template #prefix>
              <SIconFont type="icon-kl-link1" :size="14" style="color: #9ca3af; margin-right: 2px;" />
            </template>
            <template #suffix>
              <a-button size="small" type="primary" class="confirm-btn" @click="confirmLink">
                确定
              </a-button>
            </template>
          </a-input>
          <div v-if="currentLink" class="link-cancel-row">
            <button class="cancel-text-btn" @click="isEditing = false">取消</button>
          </div>
        </div>
      </div>
    </template>

    <a-tooltip title="链接" placement="bottom" :open="isOpen ? false : undefined">
      <button class="bubble-toolbar-btn" :class="{ 'is-active': isOpen || !!currentLink }">
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
import { ExportOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { IconFont as SIconFont } from 'speed-components-ui/components'
import type { Board } from '@speed-board/core'
import { useNodeStyle } from '@speed-board/vue3'
import { useToolbarPopover } from '../useToolbarPopover'

const props = defineProps<{
  board: Board | null
}>()

const { isOpen } = useToolbarPopover('link')
const { textState, updateTextStyle } = useNodeStyle(() => props.board)

const inputValue = ref('')
const isEditing = ref(false)
const inputRef = ref()

const currentLink = computed(() => {
  const tLink = textState.value.link
  if (tLink) return tLink
  const firstElem: any = props.board?.selectedElements?.[0]
  return firstElem?.data?.link || firstElem?.link || ''
})

const formattedLink = computed(() => {
  const url = currentLink.value.trim()
  if (!url) return '#'
  if (/^[a-zA-Z]+:\/\//.test(url)) return url
  return `https://${url}`
})

const onOpenChange = (open: boolean) => {
  if (open) {
    if (currentLink.value) {
      isEditing.value = false
      inputValue.value = currentLink.value
    } else {
      isEditing.value = true
      inputValue.value = ''
      nextTick(() => {
        inputRef.value?.focus()
      })
    }
  }
}

const startEdit = () => {
  isEditing.value = true
  inputValue.value = currentLink.value
  nextTick(() => {
    inputRef.value?.focus()
  })
}

const confirmLink = () => {
  const val = inputValue.value.trim()
  updateTextStyle({ link: val })
  if (props.board) {
    props.board.setShapeProperty({ link: val })
  }
  isEditing.value = false
  if (!val) {
    isOpen.value = false
  }
}

const removeLink = () => {
  updateTextStyle({ link: '' })
  if (props.board) {
    props.board.setShapeProperty({ link: '' })
  }
  inputValue.value = ''
  isEditing.value = false
  isOpen.value = false
}

const openLink = () => {
  if (formattedLink.value && formattedLink.value !== '#') {
    window.open(formattedLink.value, '_blank', 'noopener,noreferrer')
  }
}
</script>

<style scoped>
.link-popover-content {
  min-width: 220px;
  max-width: 320px;
}

.link-preview-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 4px;
}

.link-preview-url {
  display: flex;
  align-items: center;
  flex: 1;
  overflow: hidden;
  color: #1677ff;
  text-decoration: none;
  font-size: 13px;

  &:hover {
    text-decoration: underline;
  }
}

.url-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.link-action-btn {
  border: none;
  background: transparent;
  padding: 4px;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: #f3f4f6;
    color: #1f2937;
  }

  &.danger:hover {
    color: #ef4444;
    background-color: #fee2e2;
  }
}

.link-edit-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.confirm-btn {
  font-size: 11px;
  height: 22px;
  padding: 0 8px;
  background-color: #10b981 !important;
  border-color: #10b981 !important;
}

.link-cancel-row {
  display: flex;
  justify-content: flex-end;
}

.cancel-text-btn {
  border: none;
  background: transparent;
  font-size: 12px;
  color: #9ca3af;
  cursor: pointer;
  padding: 0 2px;

  &:hover {
    color: #4b5563;
  }
}
</style>
