<template>
  <div class="demo-container">
    <header class="demo-header">
      <h2>Speed-Board Collaborative Whiteboard Demo</h2>
    </header>
    <main class="demo-main">
      <SpeedBoard @created="onBoardCreated" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { SpeedBoard, type Board } from '@speed-board/vue3-antd'

const onBoardCreated = (board: Board) => {
  console.log('Speed-Board initialized:', board)
}
</script>

<style scoped>
.demo-container {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
}

.demo-header {
  height: 48px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: #fafafa;
}

.demo-header h2 {
  font-size: 16px;
  margin: 0;
  font-weight: 600;
  color: #1f2937;
}

.demo-main {
  flex: 1;
  position: relative;
}
</style>
