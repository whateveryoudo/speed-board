<template>
  <div class="top-bar-container plait-board-attached">
    <!-- 1. 左上角悬浮胶囊：保存 / 撤销 / 重做 (编辑态独占) -->
    <div v-if="!props.readonly" class="board-floating-capsule top-left-floating-capsule">
      <!-- <a-tooltip title="保存 (⌘+S)">
        <a-button
          type="text"
          class="shadow-btn-wrapper"
          @click="onSave"
        >
          <SaveOutlined />
        </a-button>
      </a-tooltip> -->

      <a-tooltip title="撤销 (⌘+Z)">
        <a-button
          type="text"
          class="shadow-btn-wrapper"
          :disabled="!canUndo"
          @click="undo"
        >
          <SIconFont type="icon-kl-undo" :size="18" />
        </a-button>
      </a-tooltip>

      <a-tooltip title="重做 (⌘+Y)">
        <a-button
          type="text"
          class="shadow-btn-wrapper"
          :disabled="!canRedo"
          @click="redo"
        >
          <SIconFont type="icon-kl-redo" :size="18" />
        </a-button>
      </a-tooltip>
    </div>

    <!-- 3. 右上角悬浮胶囊组：拖拽 / 自适应 / 缩放 / 辅助工具 / 展开收起 -->
    <div
      class="top-right-floating-group"
      :class="{ 'has-settings-open': props.showSettings }"
    >
      <!-- 胶囊 1: 视口与缩放 -->
      <div class="board-floating-capsule viewport-zoom-capsule">
        <a-tooltip title="拖拽 (Space)">
          <a-button
            type="text"
            class="shadow-btn-wrapper"
            :class="{ 'is-active': isPanningActive }"
            @click="togglePanning"
          >
            <SIconFont type="icon-kl-board-hand-pan" :size="18" />
          </a-button>
        </a-tooltip>

        <a-tooltip title="自适应画布">
          <a-button
            type="text"
            class="shadow-btn-wrapper"
            @click="centerContent"
          >
            <SIconFont type="icon-kl-shiyinghuabu" :size="18" />
          </a-button>
        </a-tooltip>

        <div class="capsule-divider" />

        <a-tooltip title="缩小 (Ctrl -)">
          <a-button
            type="text"
            class="shadow-btn-wrapper zoom-icon-btn"
            @click="zoomOut"
          >
            <MinusOutlined />
          </a-button>
        </a-tooltip>

        <a-tooltip title="重置为 100%">
          <span class="zoom-text-val" @click="resetZoom">
            {{ Math.round(currentZoom * 100) }}%
          </span>
        </a-tooltip>

        <a-tooltip title="放大 (Ctrl +)">
          <a-button
            type="text"
            class="shadow-btn-wrapper zoom-icon-btn"
            @click="zoomIn"
          >
            <PlusOutlined />
          </a-button>
        </a-tooltip>
      </div>

      <!-- 胶囊 2: 辅助工具 (AI / 设置) -->
      <!-- <div class="board-floating-capsule tool-capsule">
        <a-tooltip title="AI 助手">
          <a-button type="text" class="shadow-btn-wrapper">
            <SIconFont type="icon-kl-ai-assistant" :size="18" />
          </a-button>
        </a-tooltip>

        <a-tooltip title="画板偏好设置">
          <a-button
            type="text"
            class="shadow-btn-wrapper"
            @click="emit('toggle-settings')"
          >
            <SettingOutlined />
          </a-button>
        </a-tooltip>
      </div> -->

      <!-- 胶囊 3: 展开/收起左侧工具栏 (快捷键 ⌘+.) (仅在非只读态展示) -->
      <div v-if="!props.readonly" class="board-floating-capsule toggle-capsule">
        <a-tooltip :title="props.showLeftToolbar ? '收起工具栏 (⌘+.)' : '展开工具栏 (⌘+.)'">
          <a-button
            type="text"
            class="shadow-btn-wrapper toggle-btn"
            @click="toggleLeftToolbar"
          >
            <DoubleRightOutlined v-if="props.showLeftToolbar" />
            <DoubleLeftOutlined v-else />
          </a-button>
        </a-tooltip>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import {
  Tooltip as ATooltip,
  Button as AButton,
  message,
} from 'ant-design-vue'
import {
  SaveOutlined,
  MinusOutlined,
  PlusOutlined,
  AimOutlined,
  SettingOutlined,
  DoubleRightOutlined,
  DoubleLeftOutlined,
} from '@ant-design/icons-vue'
import { IconFont as SIconFont } from 'speed-components-ui/components'
import type { Board } from '@speed-board/core'

const props = withDefaults(
  defineProps<{
    board: Board | null
    showLeftToolbar?: boolean
    showSettings?: boolean
    readonly?: boolean
  }>(),
  {
    showLeftToolbar: true,
    showSettings: false,
    readonly: false,
  }
)

const emit = defineEmits<{
  (e: 'update:showLeftToolbar', val: boolean): void
  (e: 'save'): void
  (e: 'toggle-settings'): void
}>()

import { useBoardHistory } from '@speed-board/vue3'

const currentZoom = ref(1)
const isPanningActive = ref(false)

const { canUndo, canRedo, undo, redo } = useBoardHistory(() => props.board)

const onSave = () => {
  emit('save')
  message.success('画板已保存')
}

const togglePanning = () => {
  isPanningActive.value = !isPanningActive.value
  if (!props.board) return
  props.board.setHandMode(isPanningActive.value)
}

const toggleLeftToolbar = () => {
  emit('update:showLeftToolbar', !props.showLeftToolbar)
}

const updateZoom = () => {
  if (!props.board) return
  currentZoom.value = props.board.getZoom()
}

const zoomIn = () => {
  if (!props.board) return
  props.board.zoom(0.1)
  updateZoom()
}

const zoomOut = () => {
  if (!props.board) return
  props.board.zoom(-0.1)
  updateZoom()
}

const resetZoom = () => {
  if (!props.board) return
  props.board.zoomTo(1)
  updateZoom()
}

const centerContent = () => {
  if (!props.board) return
  props.board.centerContent()
}

// 监听快捷键 ⌘+. / Ctrl+. 切换工具栏
const handleKeydown = (e: KeyboardEvent) => {
  if (props.readonly) return
  if ((e.metaKey || e.ctrlKey) && e.key === '.') {
    e.preventDefault()
    toggleLeftToolbar()
  }
  if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
    e.preventDefault()
    onSave()
  }
}

watch(
  () => props.board,
  (newBoard, oldBoard) => {
    if (oldBoard) {
      oldBoard.off('scale', updateZoom)
      oldBoard.off('change', updateZoom)
    }
    if (newBoard) {
      newBoard.on('scale', updateZoom)
      newBoard.on('change', updateZoom)
    }
    updateZoom()
  },
  { immediate: true }
)

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (props.board) {
    props.board.off('scale', updateZoom)
    props.board.off('change', updateZoom)
  }
})
</script>

<style scoped lang="less">
.top-bar-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 90;
  pointer-events: none; // 让未占用的区域点击穿透到画布
  user-select: none;
}

// 左上角浮动胶囊 (保存 / 撤销 / 重做)
.top-left-floating-capsule {
  position: absolute;
  top: 16px;
  left: 16px;
  pointer-events: auto;
  gap: 2px;
  padding: 4px;
}

// 右上角浮动胶囊组
.top-right-floating-group {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  pointer-events: auto;
}

.viewport-zoom-capsule {
  align-items: center;
  gap: 2px;
}

.tool-capsule {
  align-items: center;
  gap: 2px;
}

.toggle-capsule {
  align-items: center;
  padding: 4px;
}

.capsule-divider {
  width: 1px;
  height: 16px;
  background-color: var(--ant-color-border-secondary, #f0f0f0);
  margin: 0 4px;
}

.zoom-text-val {
  font-size: 12px;
  font-weight: 500;
  color: var(--ant-color-text, rgba(0, 0, 0, 0.88));
  padding: 0 6px;
  cursor: pointer;
  border-radius: var(--ant-border-radius-sm, 4px);
  transition: all var(--ant-motion-duration-mid, 0.2s);

  &:hover {
    background-color: var(--ant-color-fill-secondary, rgba(0, 0, 0, 0.06));
    color: var(--ant-color-primary, #1677ff);
  }
}

.zoom-icon-btn {
  height: 28px;
  min-width: 28px;
  padding: 2px;

  .anticon {
    font-size: 13px;
  }
}

.toggle-btn {
  color: var(--ant-color-text-secondary, rgba(0, 0, 0, 0.65));

  &:hover {
    color: var(--ant-color-primary, #1677ff);
  }
}
</style>
