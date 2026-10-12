<template>
  <div class="speed-board">
    <!-- 顶部状态与缩放栏 -->
    <TopToolbar :board="boardInstance" />

    <!-- 左侧悬浮胶囊工具栏 (Iconfont、基础图形、便签、文本) -->
    <LeftToolbar :board="boardInstance" :icon-provider="props.iconProvider" />

    <!-- 主画布承载容器 -->
    <div class="speed-board-canvas-wrapper">
      <BoardCanvas :options="props.options" @created="onBoardCreated" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { shallowRef, onUnmounted } from 'vue'
import { BoardCanvas, type Board, type BoardOptions } from '@speed-board/vue3'
import { useAntdCssVars } from 'speed-components-ui/hooks'
import LeftToolbar from './LeftToolbar.vue'
import TopToolbar from './TopToolbar.vue'
import type { IconProvider } from '../data/defaultIcons'
import '../style/index.less'

defineOptions({
  name: 'SpeedBoard',
})

const props = defineProps<{
  options?: Omit<BoardOptions, 'container'>
  iconProvider?: IconProvider
}>()

const emit = defineEmits<{
  (e: 'created', board: Board): void
}>()

// 注入并管理 Ant Design Vue CSS 变量 (--ant-*)
const { cleanup: cleanupAntdCssVars } = useAntdCssVars()

onUnmounted(() => {
  cleanupAntdCssVars?.()
})

const boardInstance = shallowRef<Board | null>(null)

const onBoardCreated = (board: Board) => {
  boardInstance.value = board
  emit('created', board)
}
</script>

<style scoped lang="less">
.speed-board {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: var(--speed-board-bg, #ffffff);
  color: var(--speed-board-text, rgba(0, 0, 0, 0.88));
}

.speed-board-canvas-wrapper {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
</style>
