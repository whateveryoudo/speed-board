<template>
  <div class="speed-board-root">
    <BoardCanvas :options="props.options" @created="onBoardCreated" />
  </div>
</template>

<script setup lang="ts">
import { BoardCanvas, type Board, type BoardOptions } from '@speed-board/vue3'

const props = defineProps<{
  options?: Omit<BoardOptions, 'container'>
}>()

const emit = defineEmits<{
  (e: 'created', board: Board): void
}>()

const onBoardCreated = (board: Board) => {
  emit('created', board)
}
</script>

<style scoped>
.speed-board-root {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}
</style>
