<template>
  <transition name="popover-scale">
    <div
      v-if="props.visible"
      ref="panelRef"
      class="text-overlay-editor"
      :style="{
        left: `${props.position.x}px`,
        top: `${props.position.y}px`,
      }"
      @click.stop
      @pointerdown.stop
    >
      <!-- 1. 文本输入框 -->
      <div class="overlay-field">
        <label class="field-label">文本</label>
        <a-input
          ref="textInputRef"
          v-model:value="formText"
          placeholder="文本内容"
          class="field-input"
          @input="onTextInput"
          @keydown.enter="onConfirm"
          @keydown.esc="onClose"
        />
      </div>

      <!-- 2. 链接输入框 -->
      <div class="overlay-field">
        <label class="field-label">链接</label>
        <a-input
          ref="linkInputRef"
          v-model:value="formLink"
          placeholder="链接地址"
          class="field-input is-link"
          @input="onLinkInput"
          @keydown.enter="onConfirm"
          @keydown.esc="onClose"
        />
      </div>

      <!-- 3. 底部确定按钮 -->
      <div class="overlay-actions">
        <a-button
          size="small"
          class="confirm-btn"
          @click="onConfirm"
        >
          确定
        </a-button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { Input as AInput, Button as AButton } from 'ant-design-vue'

const props = withDefaults(
  defineProps<{
    visible: boolean
    position: { x: number; y: number }
    text?: string
    link?: string
    focusLink?: boolean
  }>(),
  {
    visible: false,
    position: () => ({ x: 0, y: 0 }),
    text: '',
    link: '',
    focusLink: false,
  }
)

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'change', payload: { text: string; link: string }): void
  (e: 'confirm', payload: { text: string; link: string }): void
}>()

const formText = ref(props.text)
const formLink = ref(props.link)
const textInputRef = ref<any>(null)
const linkInputRef = ref<any>(null)

watch(
  () => props.visible,
  (val) => {
    if (val) {
      formText.value = props.text || ''
      formLink.value = props.link || ''
      nextTick(() => {
        if (props.focusLink) {
          linkInputRef.value?.focus()
        } else {
          textInputRef.value?.focus()
          textInputRef.value?.select()
        }
      })
    }
  }
)

watch(
  () => props.text,
  (val) => {
    formText.value = val || ''
  }
)

watch(
  () => props.link,
  (val) => {
    formLink.value = val || ''
  }
)

const onTextInput = () => {
  emit('change', {
    text: formText.value,
    link: formLink.value,
  })
}

const onLinkInput = () => {
  emit('change', {
    text: formText.value,
    link: formLink.value,
  })
}

const onConfirm = () => {
  emit('confirm', {
    text: formText.value,
    link: formLink.value,
  })
  emit('update:visible', false)
}

const onClose = () => {
  emit('update:visible', false)
}
</script>

<style scoped lang="less">
.text-overlay-editor {
  position: absolute;
  width: 270px;
  background: var(--speed-board-bg, var(--ant-color-bg-elevated, #ffffff));
  border-radius: var(--speed-board-radius-lg, 10px);
  border: 1px solid var(--speed-board-border, var(--ant-color-border-secondary, rgba(0, 0, 0, 0.08)));
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.06);
  padding: 14px 16px 12px;
  z-index: 120;
  user-select: none;
}

.overlay-field {
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;

  .field-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--speed-board-text, var(--ant-color-text, rgba(0, 0, 0, 0.88)));
    margin-bottom: 6px;
  }

  .field-input {
    border-radius: var(--speed-board-radius, 6px);
    border-color: var(--speed-board-border-strong, var(--ant-color-border, #d1d5db));
    font-size: 13px;
    padding: 5px 10px;
    transition: all 0.2s ease;

    &:hover {
      border-color: var(--speed-board-border-strong, var(--ant-color-border, #9ca3af));
    }

    &:focus,
    &.ant-input-focused {
      border-color: var(--speed-board-accent, var(--ant-color-primary, #10b981)) !important;
      box-shadow: 0 0 0 2px var(--speed-board-primary-bg, rgba(16, 185, 129, 0.15)) !important;
    }
  }
}

.overlay-actions {
  display: flex;
  justify-content: flex-start;

  .confirm-btn {
    border-radius: var(--speed-board-radius, 6px);
    font-size: 13px;
    padding: 0 16px;
    height: 28px;
    color: var(--speed-board-text, var(--ant-color-text, rgba(0, 0, 0, 0.88)));
    border-color: var(--speed-board-border-strong, var(--ant-color-border, #d1d5db));
    background-color: var(--speed-board-bg, var(--ant-color-bg-container, #ffffff));

    &:hover {
      background-color: var(--speed-board-hover-bg, var(--ant-control-item-bg-hover, rgba(0, 0, 0, 0.04)));
      border-color: var(--speed-board-border-strong, var(--ant-color-border, #9ca3af));
      color: var(--speed-board-text, var(--ant-color-text, rgba(0, 0, 0, 0.88)));
    }
  }
}

.popover-scale-enter-active,
.popover-scale-leave-active {
  transition: opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.popover-scale-enter-from,
.popover-scale-leave-to {
  opacity: 0;
  transform: scale(0.96) translateY(-4px);
}
</style>
