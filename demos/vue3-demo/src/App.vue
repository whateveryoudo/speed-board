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
  'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwiZXhwIjoxNzkyMjI4MzA0fQ.laTeKvvb7_O629ceqrIdEZIwCnSh6E91yO6UfK1ue-Y';

const uploadConfig = {
  fileUploadSingle: async (formData: FormData) => {
    const res = await fetch('/api/v1/attachment/upload/single', {
      method: 'POST',
      headers: {
        Authorization: authToken,
      },
      body: formData,
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.detail || errJson.errMessage || `上传失败 (HTTP ${res.status})`);
    }
    return await res.json();
  },
  getPreviewUrl: (fileId: string) => {
    return `/api/v1/attachment/public/preview/${fileId}`;
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
