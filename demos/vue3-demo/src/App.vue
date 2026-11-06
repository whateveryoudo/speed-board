<template>
  <div class="demo-container">
    <div class="mode-switcher">
      <a-radio-group v-model:value="currentMode" button-style="solid" size="small">
        <a-radio-button value="board">🎨 全功能白板</a-radio-button>
        <a-radio-button value="mindmap">🧠 独立思维导图</a-radio-button>
      </a-radio-group>
    </div>

    <SpeedBoard
      v-if="currentMode === 'board'"
      title="SpeedBoard Next 纯净版"
      :upload-config="uploadConfig"
      @created="onBoardCreated"
    />

    <SpeedMindmap
      v-else
      title="思维导图专属文档"
      @created="onBoardCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { SpeedBoard, SpeedMindmap } from '@speed-board/vue3-antd';
import type { Board } from '@speed-board/core';
const currentMode = ref<'board' | 'mindmap'>('board');

const authToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwiZXhwIjoxNzk0MzY2MjU5fQ.nVmF8gOi8Vr9WBYQTM7q7AnhZqvKdKXaI7yUOo-G0D8';

const uploadConfig = {
  uploadImage: async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/api/v1/attachment/upload/single', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + authToken,
        },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        const fileId = data?.data?.id || data?.id;
        return {
          id: fileId,
          url: fileId ? `/api/api/v1/attachment/public/preview/${fileId}` : data?.data?.url || data?.url,
        };
      }
    } catch {
      // 忽略静态演示环境中的网络异常
    }
    return {
      id: 'demo_' + Date.now(),
      url: URL.createObjectURL(file),
    };
  },
  fileUploadSingle: async (formData: FormData) => {
    try {
      const res = await fetch('/api/api/v1/attachment/upload/single', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + authToken,
        },
        body: formData,
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // 忽略静态环境异常
    }
    const file = formData.get('file') as File;
    return {
      data: {
        id: 'demo_' + Date.now(),
        url: file ? URL.createObjectURL(file) : '',
      },
    };
  },
  getPreviewUrl: (fileId: string) => {
    return `/api/api/v1/attachment/public/preview/${fileId}`;
  },
};

const onBoardCreated = (board: Board) => {
  console.log('Board initialized:', board);
  (window as any).__board__ = board;
};
</script>

<style scoped>
.demo-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.mode-switcher {
  position: absolute;
  top: 8px;
  right: 180px;
  z-index: 100;
  background: rgba(255, 255, 255, 0.9);
  padding: 4px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
</style>
