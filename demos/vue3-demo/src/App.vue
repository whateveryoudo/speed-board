<template>
  <div class="demo-container">
    <SpeedBoard
      title="测试画板1"
      :upload-config="uploadConfig"
      @created="onBoardCreated"
    />
  </div>
</template>

<script setup lang="ts">
import {
  SpeedBoard,
  type Board,
  type BoardUploadConfig,
} from '@speed-board/vue3-antd'

const authToken =
  'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwiZXhwIjoxNzkyMjI4MzA0fQ.laTeKvvb7_O629ceqrIdEZIwCnSh6E91yO6UfK1ue-Y'

const uploadConfig: BoardUploadConfig = {
  // 单文件上传到后端 FastAPI (/api/v1/attachment/upload/single)
  fileUploadSingle: async (formData: FormData) => {
    const res = await fetch('/api/v1/attachment/upload/single', {
      method: 'POST',
      headers: {
        Authorization: authToken,
      },
      body: formData,
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.detail || errJson.errMessage || `上传失败 (HTTP ${res.status})`)
    }
    return await res.json()
  },
  // 获取附件公开预览地址
  getPreviewUrl: (fileId: string) => {
    return `/api/v1/attachment/public/preview/${fileId}`
  },
}

const onBoardCreated = (board: Board) => {
  console.log('Speed-Board initialized:', board)
  ;(window as any).__board__ = board
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
