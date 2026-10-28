<template>
  <FloatingToolbarHost
    :board="props.board"
    @open-panel="emit('toggle-settings')"
    @toggle-settings="emit('toggle-settings')"
  />
</template>

<script setup lang="ts">
import type { Board } from '@speed-board/core'
import FloatingToolbarHost from './floatingToolbar/FloatingToolbarHost.vue'

const props = defineProps<{
  board: Board | null
}>()

const emit = defineEmits<{
  (e: 'toggle-settings'): void
}>()
</script>
