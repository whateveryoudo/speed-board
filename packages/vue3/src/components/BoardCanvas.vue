<template>
  <PlaitBoard
    ref="plaitBoardRef"
    :value="props.options?.value"
    :options="props.options"
    @created="onPlaitCreated"
    @change="onPlaitChange"
  >
    <slot />
  </PlaitBoard>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue';
import PlaitBoard from './PlaitBoard.vue';
import { Board, type BoardOptions, type PlaitBoard as PlaitBoardType } from '@speed-board/core';

const props = defineProps<{
  options?: Omit<BoardOptions, 'container'>;
}>();

const emit = defineEmits<{
  (e: 'created', board: Board): void;
}>();

const plaitBoardRef = ref();
let boardInstance: Board | null = null;

const onPlaitCreated = (plaitBoard: PlaitBoardType) => {
  boardInstance = new Board({
    ...props.options,
  });
  boardInstance.plaitBoard = plaitBoard;
  emit('created', boardInstance);
};

const onPlaitChange = (data: any) => {
  boardInstance?.emit('change', data);
  boardInstance?.emit('selection:change', data.selection);
};

onBeforeUnmount(() => {
  boardInstance?.destroy();
  boardInstance = null;
});
</script>

<style scoped>
:deep(.plait-board-container) {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}
</style>
