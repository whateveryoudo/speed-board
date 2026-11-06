# SpeedBoard

> 现代化轻量白板与思维导图套件 · 原生 SVG 视口 · Plait 引擎 · 独立双模式

[![GitHub Pages](https://img.shields.io/badge/docs-GitHub%20Pages-blue)](https://whateveryoudo.github.io/speed-board/docs/)
[![Live Demo](https://img.shields.io/badge/demo-online-brightgreen)](https://whateveryoudo.github.io/speed-board/demo/)
[![Vue 3](https://img.shields.io/badge/vue-3.x-green)](https://vuejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 🎯 核心特性

- 🧠 **独立双场景形态**：提供 `<SpeedBoard />`（自由无界全功能白板）与 `<SpeedMindmap />`（开箱即写专属思维导图文档）双形态，支持按需使用与 Tree-shaking 彻底隔离。
- 🌳 **11 种思维导图布局**：支持逻辑图（向左/向右/双向分布）、组织架构图、鱼骨图、时间线、缩进图等，支持快捷气泡切换优先级/进度/旗帜标记及概要（Summary）大括号分组。
- 📐 **19+ 矢量几何图元**：矩形、圆角矩形、菱形、多边形、立方体、气泡等，支持中空穿透智能命中（`withHitEnhance`）与 Slate 富文本原位双击排版。
- ⚡ **智能连线正交避障**：内置曼哈顿直角避障路由（Manhattan Router），拖拽图元时自动规避阻挡、90° 规则绕行，支持端点磁吸吸附。
- 🎨 **1:1 原生待放置虚影**：从工具栏点选拖入画布时，以 Plait 原生绘图指令原位投射 1:1 绝对坐标虚影，杜绝缩放模糊与落地跳动。
- 🎛 **统一 Schema 驱动交互**：选区浮动工具栏与右侧样式抽屉均由图元 Schema 动态装配，开箱即用。

---

## 💡 致敬与自研优化

本项目底层借鉴并参考了 [worktile/plait](https://github.com/worktile/plait) 与 [plait-board/drawnix](https://github.com/plait-board/drawnix)，可视为其在 **Vue 3 生态**下的现代化高内聚封装与业务落地版本。

- **沿用官方核心**：仅沿用了 `@plait/core`、`@plait/common`、`@plait/layouts`、`@plait/text-plugins` 最核心的基础能力。
- **思维导图自主重构**：脑图模块全新自研，解耦业务并**新增端点连线支持**，脑图节点可与几何图形自由建立避障连线。
- **查看态 / 编辑态分离模式**：针对官方 Issue [#564](https://github.com/worktile/plait/issues/564) 的常驻 Slate 实例性能瓶颈，本仓库采用静态查看态与动态编辑态分离机制，仅在双击编辑时按需挂载 Slate，大幅降低千级节点下的内存占用与视口平移开销。

---

## 📖 在线体验与文档

- 📘 **完整文档**：[https://whateveryoudo.github.io/speed-board/docs/](https://whateveryoudo.github.io/speed-board/docs/)
- 🚀 **在线 Demo**：[https://whateveryoudo.github.io/speed-board/demo/](https://whateveryoudo.github.io/speed-board/demo/)

---

## 📦 安装与快速上手

### 1. 安装依赖

```bash
pnpm add @speed-board/vue3-antd ant-design-vue
```

### 2. 全局注册

在入口文件（如 `main.ts`）中引入：

```ts
import { createApp } from 'vue';
import Antd from 'ant-design-vue';
import SpeedBoardPlugin from '@speed-board/vue3-antd';

import 'ant-design-vue/dist/reset.css';
import '@speed-board/vue3-antd/dist/index.css';
import App from './App.vue';

const app = createApp(App);
app.use(Antd);
app.use(SpeedBoardPlugin);
app.mount('#app');
```

---

## 💻 场景使用示例

### 场景 A：全功能协作白板 (`<SpeedBoard />`)

自由混合画布，支持同时绘制多棵思维导图、几何图元、避障连线与自由手绘：

```vue
<template>
  <div style="width: 100vw; height: 100vh;">
    <SpeedBoard
      title="项目架构白板"
      :data="boardData"
      :upload-config="uploadConfig"
      @created="onBoardCreated"
      @save="onSaveBoard"
      @change="onBoardChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { SpeedBoard } from '@speed-board/vue3-antd';
import type { Board } from '@speed-board/core';

const boardInstance = ref<Board | null>(null);
const boardData = ref<any[]>([]);

const uploadConfig = {
  uploadImage: async (file: File) => {
    // 实际项目中可上传至服务器，此处直接返回对象 URL
    return { url: URL.createObjectURL(file), id: 'img_' + Date.now() };
  },
};

const onBoardCreated = (board: Board) => {
  boardInstance.value = board;
};

const onSaveBoard = () => {
  if (!boardInstance.value) return;
  const data = boardInstance.value.raw.children;
  console.log('保存白板数据:', data);
};

const onBoardChange = (elements: any[]) => {
  // 画布内容变动
};
</script>
```

### 场景 B：独立思维导图专属文档 (`<SpeedMindmap />`)

画布中央默认初始主题，开箱即写，屏蔽白板左侧工具栏，适合专属大纲、读书笔记与深度思考：

```vue
<template>
  <div style="width: 100vw; height: 100vh;">
    <SpeedMindmap
      title="产品规划导图"
      :data="mindmapData"
      @created="onMindmapCreated"
      @save="onSaveMindmap"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { SpeedMindmap } from '@speed-board/vue3-antd';
import { createEmptyMindmap } from '@speed-board/extension-mindmap';
import type { Board } from '@speed-board/core';

const mindmapBoard = ref<Board | null>(null);

// 可选：指定中心主题与预设布局 ('right' | 'standard' | 'organization' 等)
const mindmapData = createEmptyMindmap('核心主题', {
  layout: 'right',
  fill: '#3b82f6',
  color: '#ffffff',
});

const onMindmapCreated = (board: Board) => {
  mindmapBoard.value = board;
};

const onSaveMindmap = () => {
  if (!mindmapBoard.value) return;
  const currentTree = mindmapBoard.value.raw.children[0];
  console.log('保存导图树:', currentTree);
};
</script>
```

---

## ⚙️ 常用 Props 与 Emits

### Props 速查

| 组件 | 属性名 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| **SpeedBoard** | `title` | `string` | `'测试画板1'` | 顶部标题 |
| | `data` | `PlaitElement[]` | `[]` | 画布初始图元数据 |
| | `uploadConfig` | `UploadConfig` | `undefined` | 图片上传与在线预览配置 |
| | `options` | `BoardOptions` | `{}` | 底层 Plait 视口配置项 |
| **SpeedMindmap** | `title` | `string` | `'新建思维导图'` | 顶部标题 |
| | `data` | `SpeedMindElement` | `undefined` | 根导图数据（缺省时自动生成中心主题） |
| | `options` | `BoardOptions` | `{}` | 底层 Plait 视口配置项 |

### Emits 速查

- `@created="(board: Board) => void"`: 画布实例初始化就绪时触发；
- `@save="() => void"`: 点击保存按钮或按下 `⌘ + S` / `Ctrl + S` 时触发；
- `@change="(elements: any[]) => void"`: 画布内容修改时触发。

---

## 🛠 `Board` 门面常用 API

通过 `@created="board => ..."` 获得的 `board` 实例已封装常用画布操作：

```ts
// 数据存取
const elements = board.raw.children;           // 获取全量图元 JSON
board.setChildren(newElements);               // 重设全量图元

// 视口与缩放
board.zoom(0.1);                              // 放大 10%
board.zoom(-0.1);                             // 缩小 10%
board.zoomTo(1.0);                            // 恢复 100% 原始尺寸
board.centerContent();                        // 居中并自适应内容
board.setHandMode(true);                      // 切换抓手漫游模式

// 选区与对齐
board.deleteSelectedElements();               // 删除当前选中图元
board.alignSelectedNodes('center');           // 选中图元水平居中对齐
board.distributeSelectedNodes('horizontal');  // 选中图元水平等间距分布

// 历史操作
board.undo();                                 // 撤销
board.redo();                                 // 重做
```

---

## 🏗 Monorepo 模块分层

| 包名 | 职责说明 |
| :--- | :--- |
| `@speed-board/shared` | 纯工具函数库、调色板预设、9 种连线端点箭头预设 |
| `@speed-board/core` | Plait 引擎二次封装、Board 门面 API、选区浮动坐标换算 |
| `@speed-board/extension-draw` | 19 种基础矢量图形库、曼哈顿正交避障连线算法、磁吸机制 |
| `@speed-board/extension-mindmap`| 树形思维导图引擎、11 种布局排版算法、节点概要、状态标记 |
| `@speed-board/vue3` | 框架抽象层，提供 `useBoard`、`BoardCanvas.vue` 纯 SVG 画布 |
| `@speed-board/vue3-antd` | UI 表现层，提供 `<SpeedBoard />`、`<SpeedMindmap />`、选区浮动栏、样式抽屉 |

---

## 🚀 本地开发与构建

```bash
# 安装依赖
pnpm install

# 启动本地开发 Demo 调试（支持白板/思维导图双模式切换）
pnpm dev

# 启动 VitePress 文档站开发
pnpm docs:dev

# 全量打包构建（文档 + 演示站点）
pnpm build:deploy
```

---

## 📄 License

MIT © [Speed Platform](https://github.com/whateveryoudo)
