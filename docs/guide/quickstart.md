# 快速开始

本章节将指引您在 Vue 3 项目中快速引入并使用 SpeedBoard。

## 1. 安装依赖

在您的 Vue 3 项目中运行以下命令：

```bash
pnpm add @speed-board/vue3-antd ant-design-vue
# 或使用 npm / yarn
npm install @speed-board/vue3-antd ant-design-vue
```

> **提示**：如果您的构建环境限制了某些子包引用，建议确保 Vue 版本为 `^3.3.0` 或更高版本。

---

## 2. 全局注册插件与样式

在入口文件（如 `main.ts` 或 `main.js`）中引入组件库并全局注册：

```ts
import { createApp } from 'vue';
import Antd from 'ant-design-vue';
import SpeedBoardPlugin from '@speed-board/vue3-antd';

// 引入样式
import 'ant-design-vue/dist/reset.css';
import '@speed-board/vue3-antd/dist/index.css';

import App from './App.vue';

const app = createApp(App);
app.use(Antd);
app.use(SpeedBoardPlugin);
app.mount('#app');
```

---

## 3. 在页面中使用组件

根据您的业务场景选择对应的组件：

### 场景一：全功能白板 (`<SpeedBoard />`)

```vue
<template>
  <div class="canvas-container">
    <SpeedBoard
      title="架构白板"
      :data="boardData"
      :upload-config="uploadConfig"
      @created="onBoardCreated"
      @save="onSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { SpeedBoard } from '@speed-board/vue3-antd';
import type { Board } from '@speed-board/core';

const boardData = ref<any[]>([]);
const boardRef = ref<Board | null>(null);

const uploadConfig = {
  uploadImage: async (file: File) => {
    // 处理文件上传并返回 url 与 id
    return { url: URL.createObjectURL(file), id: 'img_' + Date.now() };
  },
};

const onBoardCreated = (board: Board) => {
  boardRef.value = board;
  console.log('画布初始化完成:', board);
};

const onSave = () => {
  if (!boardRef.value) return;
  const currentData = boardRef.value.raw.children;
  console.log('保存数据:', currentData);
};
</script>

<style scoped>
.canvas-container {
  width: 100vw;
  height: 100vh;
}
</style>
```

### 场景二：独立思维导图 (`<SpeedMindmap />`)

```vue
<template>
  <div class="canvas-container">
    <SpeedMindmap
      title="需求梳理导图"
      :data="mindmapData"
      @created="onMindmapCreated"
      @save="onSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { SpeedMindmap } from '@speed-board/vue3-antd';
import { createEmptyMindmap } from '@speed-board/extension-mindmap';
import type { Board } from '@speed-board/core';

const mindmapRef = ref<Board | null>(null);

// 可传入初始导图数据，不传则默认展示“中心主题”
const mindmapData = createEmptyMindmap('产品规划', {
  layout: 'right', // 布局：'right' (向右), 'standard' (左右分布), 'organization' (组织架构)
  fill: '#3b82f6',
  color: '#ffffff',
});

const onMindmapCreated = (board: Board) => {
  mindmapRef.value = board;
};

const onSave = () => {
  if (!mindmapRef.value) return;
  const currentTree = mindmapRef.value.raw.children[0];
  console.log('保存导图树:', currentTree);
};
</script>

<style scoped>
.canvas-container {
  width: 100vw;
  height: 100vh;
}
</style>
```
