<template>
  <div ref="containerRef" class="speed-board-canvas" />
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Board, type BoardOptions } from '@speed-board/core'

const props = defineProps<{
  options?: Omit<BoardOptions, 'container'>
}>()

const emit = defineEmits<{
  (e: 'created', board: Board): void
}>()

const containerRef = ref<HTMLDivElement>()
let board: Board | null = null

onMounted(() => {
  if (!containerRef.value) return
  board = new Board({
    container: containerRef.value,
    ...props.options,
  })
  emit('created', board)
})

onBeforeUnmount(() => {
  board?.destroy()
  board = null
})
</script>

<style scoped>
.speed-board-canvas {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}
</style>
