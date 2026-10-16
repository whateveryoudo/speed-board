<template>
  <textarea
    v-if="props.visible && editorStyle"
    ref="textareaRef"
    v-model="inlineTextValue"
    class="speed-inline-text-editor"
    :style="editorStyle"
    @input="onInput"
    @keydown.stop="onKeyDown"
    @compositionstart="notifyTyping"
    @compositionupdate="notifyTyping"
    @blur="onBlur"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import type { Board } from '@speed-board/core'
import { computeInlineEditorLayout } from '@speed-board/view'
import { calculateMindmapNodeWidth } from '@speed-board/shared'

const props = defineProps<{
  board: Board | null
  activeNode: any
  canvasWrapper: HTMLDivElement | null
  visible: boolean
  initialChar?: string | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:visible', val: boolean): void
  (e: 'update:activeNode', node: any): void
  (e: 'typing', val: boolean): void
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const inlineTextValue = ref('')
const updateTick = ref(0)

const editorStyle = computed(() => {
  void updateTick.value
  return computeInlineEditorLayout(
    props.board,
    props.activeNode,
    props.canvasWrapper,
    inlineTextValue.value
  )
})

watch(
  () => [props.visible, props.activeNode, props.initialChar],
  ([visible, node, initialChar]) => {
    if (visible && node) {
      const data = node.getData() || {}
      const attrs = node.getAttrs()?.label || {}
      node.setAttrByPath('label/visibility', 'hidden')
      updateTick.value++

      if (initialChar) {
        // 模式 A：选中即输入 (Type-to-edit)
        // 直接以敲入的初始字符作为全新文本，光标置于字符后继续打字
        inlineTextValue.value = initialChar
        if (props.board) {
          if (props.board.isShapeNode(node)) {
            props.board.updateShapeNode(node, { text: initialChar })
          } else {
            props.board.updateTextNode(node, { text: initialChar })
          }
        }
        setTimeout(() => {
          if (textareaRef.value) {
            textareaRef.value.focus()
            const len = textareaRef.value.value.length
            textareaRef.value.setSelectionRange(len, len)
          }
        }, 30)
      } else {
        // 模式 B：双击进入，或新增分支后自动进入
        // 保留原内容，但全选所有文本，敲字直接完全替换
        const rawText = (attrs.text as string) ?? (data.text as string) ?? ''
        inlineTextValue.value = rawText.replace(/^\n+|\n+$/g, '')

        setTimeout(() => {
          if (textareaRef.value) {
            textareaRef.value.focus()
            textareaRef.value.select()
          }
        }, 30)
      }
    }
  },
  { immediate: true }
)

let typingTimer: any = null
const notifyTyping = () => {
  emit('typing', true)
  if (typingTimer) clearTimeout(typingTimer)
  typingTimer = setTimeout(() => {
    emit('typing', false)
  }, 400)
}

const onInput = (e?: Event) => {
  notifyTyping()
  if (!props.activeNode || !props.board) return
  const textarea = (e?.target as HTMLTextAreaElement) || textareaRef.value
  if (!textarea) return
  const text = textarea.value
  inlineTextValue.value = text

  if (props.board.isShapeNode(props.activeNode)) {
    props.board.updateShapeNode(props.activeNode, { text })
  } else {
    // 文本/导图输入过程中仅同步数据与文本，不在此刻破坏节点尺寸或造成背后布局闪烁错位
    props.board.updateTextNode(props.activeNode, { text, resize: false })
  }
  updateTick.value++
}

const finish = () => {
  if (typingTimer) {
    clearTimeout(typingTimer)
    typingTimer = null
  }
  emit('typing', false)

  if (props.activeNode) {
    props.activeNode.setAttrByPath('label/visibility', 'visible')
    const rawText = inlineTextValue.value || ''
    const cleaned = rawText.replace(/^\n+|\n+$/g, '')

    if (props.activeNode.getData()?.type === 'mindmap-node') {
      const text = cleaned.trim() === '' ? (props.activeNode.getData()?.text || '分支主题') : cleaned
      const isRoot = !!props.activeNode.getData()?.isRoot
      const calcW = calculateMindmapNodeWidth(text, isRoot)
      const lines = text.split('\n')
      const baseHeight = isRoot ? 42 : 32
      const lineH = (isRoot ? 16 : 14) * 1.45
      const targetHeight = lines.length > 1 ? Math.round(lines.length * lineH + 14) : baseHeight
      if (props.board) {
        props.board.updateTextNode(props.activeNode, { text, resize: true })
      }
      props.activeNode.resize(calcW, targetHeight)
      ;(props.board as any)?.commands?.updateMindmapLayout?.(props.activeNode.id)
    } else {
      if (props.board) {
        if (props.board.isShapeNode(props.activeNode)) {
          props.board.updateShapeNode(props.activeNode, { text: cleaned })
        } else {
          props.board.updateTextNode(props.activeNode, { text: cleaned, resize: true })
        }
      }
    }
  }
  emit('close')
  emit('update:visible', false)
  emit('update:activeNode', null)
}

const onBlur = () => {
  finish()
}

defineExpose({
  finish,
})

const insertNewline = () => {
  const ta = textareaRef.value
  if (!ta) return

  // 尝试使用 document.execCommand 保留原生撤销历史 (Cmd+Z)
  const ok = document.execCommand?.('insertText', false, '\n')
  if (!ok) {
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const val = ta.value
    ta.value = val.substring(0, start) + '\n' + val.substring(end)
    ta.selectionStart = ta.selectionEnd = start + 1
  }
  inlineTextValue.value = ta.value
  onInput()
}

const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    finish()
    return
  }

  if (e.key === 'Enter') {
    if (e.isComposing || (e as any).keyCode === 229) {
      notifyTyping()
      return
    }

    // 语雀白板规范：Alt+Enter / Cmd+Enter / Ctrl+Enter / Shift+Enter 强制换行
    if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      insertNewline()
      return
    }

    // 单独按 Enter：结束编辑并提交
    e.preventDefault()
    e.stopPropagation()
    finish()
    return
  }

  notifyTyping()
}

const syncTick = () => {
  updateTick.value++
}

onMounted(() => {
  if (props.board) {
    props.board.graph.on('scale', syncTick)
    props.board.graph.on('translate', syncTick)
    props.board.graph.on('node:change:position', syncTick)
    props.board.graph.on('node:change:size', syncTick)
    props.board.scrollerPlugin?.container?.addEventListener('scroll', syncTick, { passive: true })
  }
})

onUnmounted(() => {
  if (props.board) {
    props.board.graph.off('scale', syncTick)
    props.board.graph.off('translate', syncTick)
    props.board.graph.off('node:change:position', syncTick)
    props.board.graph.off('node:change:size', syncTick)
    props.board.scrollerPlugin?.container?.removeEventListener('scroll', syncTick)
  }
})
</script>

<style scoped>
.speed-inline-text-editor {
  margin: 0;
  padding: 0;
  border: 1.5px solid #1677ff;
  outline: none;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(22, 119, 255, 0.15);
  resize: none;
  overflow: hidden;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  border-radius: 4px;
  line-height: 1.45;
  white-space: pre;
  word-break: keep-all;
}
</style>
