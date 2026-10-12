<template>
  <div class="demo-container">
    <SpeedBoard
      title="测试画板1"
      :icon-provider="activeProvider"
      @created="onBoardCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  SpeedBoard,
  type Board,
  defaultIconProvider,
  type IconProvider,
} from '@speed-board/vue3-antd'

const activeProvider = ref<IconProvider>(defaultIconProvider)

const onBoardCreated = (board: Board) => {
  console.log('Speed-Board initialized:', board)
}
</script>

<style>
html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.demo-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
}
</style>
