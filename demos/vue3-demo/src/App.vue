<template>
  <div class="demo-container">
    <SpeedBoard
      title="SpeedBoard Next 纯净版"
      :upload-config="uploadConfig"
      @created="onBoardCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { SpeedBoard } from '@speed-board/vue3-antd';
import type { Board } from '@speed-board/core';

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
  console.log('SpeedBoard Next initialized successfully:', board);
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
</style>
