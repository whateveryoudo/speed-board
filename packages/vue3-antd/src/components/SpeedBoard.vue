<template>
  <div class="speed-board-root">
    <!-- 顶部状态与缩放栏 -->
    <TopToolbar :board="boardInstance" />

    <!-- 左侧悬浮胶囊工具栏 (Iconfont、基础图形、便签、文本) -->
    <LeftToolbar :board="boardInstance" />

    <!-- 主画布承载容器 -->
    <div class="speed-board-canvas-wrapper">
      <BoardCanvas :options="props.options" @created="onBoardCreated" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { BoardCanvas, type Board, type BoardOptions } from '@speed-board/vue3'
import LeftToolbar from './LeftToolbar.vue'
import TopToolbar from './TopToolbar.vue'

const props = defineProps<{
  options?: Omit<BoardOptions, 'container'>
}>()

const emit = defineEmits<{
  (e: 'created', board: Board): void
}>()

const boardInstance = shallowRef<Board | null>(null)

const onBoardCreated = (board: Board) => {
  boardInstance.value = board
  emit('created', board)
}
</script>

<style scoped>
.speed-board-root {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #ffffff;
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
