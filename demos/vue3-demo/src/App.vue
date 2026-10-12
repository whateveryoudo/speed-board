<template>
  <div class="demo-container">
    <header class="demo-header">
      <h2>Speed-Board Collaborative Whiteboard Demo</h2>
      <div class="header-actions">
        <span class="label">图标素材源:</span>
        <select v-model="selectedProviderKey" class="provider-select">
          <option value="default">默认内置矢量库 (离线零依赖)</option>
          <option value="iconify">Iconify 云端素材源 (纯前端免后端)</option>
          <option value="custom">FastAPI 模拟代理源 (测试后端对接)</option>
        </select>
      </div>
    </header>
    <main class="demo-main">
      <SpeedBoard
        :key="selectedProviderKey"
        :icon-provider="activeProvider"
        @created="onBoardCreated"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  SpeedBoard,
  type Board,
  defaultIconProvider,
  createIconifyProvider,
  type IconProvider,
} from '@speed-board/vue3-antd'

const selectedProviderKey = ref<'default' | 'iconify' | 'custom'>('default')

// 模拟未来的 FastAPI 接口 Provider 示例
const customFastApiMockProvider: IconProvider = {
  search: async ({ query }) => {
    console.log('[FastAPI] 收到图标搜索请求 query =', query)
    // 模拟调你的 FastAPI: fetch(`/api/board/iconfont?query=${query}`)
    return defaultIconProvider.search({ query })
  },
}

const activeProvider = computed<IconProvider>(() => {
  if (selectedProviderKey.value === 'iconify') {
    return createIconifyProvider('lucide')
  }
  if (selectedProviderKey.value === 'custom') {
    return customFastApiMockProvider
  }
  return defaultIconProvider
})

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
  justify-content: space-between;
  padding: 0 16px;
  background: #ffffff;
  z-index: 100;
}

.demo-header h2 {
  font-size: 15px;
  margin: 0;
  font-weight: 600;
  color: #1f2937;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #475569;
}

.provider-select {
  padding: 4px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 12px;
  outline: none;
  background: #f8fafc;
  color: #334155;
}

.demo-main {
  flex: 1;
  position: relative;
  overflow: hidden;
}
</style>
