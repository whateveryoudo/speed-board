# 独立思维导图组件

`<SpeedMindmap />` 是面向知识库、大纲笔记、需求规划场景专门封装的独立思维导图组件。

---

## 为什么需要独立思维导图模式？

在通用白板中，用户需要先从工具栏拖入或点击思维导图，选择画布落点后才能开始编辑。而在文档型业务场景（如类似 Notion / 语雀思维导图卡片）中，用户期望：
- 页面加载后，中心节点直接呈现，随时开箱即写；
- 界面隐藏掉白板绘图库无关的左侧几何工具栏；
- 底层白板的绘图库代码被 Tree-Shaking 彻底剔除，避免加载不必要的开销。

`<SpeedMindmap />` 正是为满足此类诉求而设计。

---

## 基础使用示例

```vue
<template>
  <div class="mindmap-wrapper">
    <SpeedMindmap
      title="产品路线图"
      :data="initialMindmap"
      @created="onCreated"
      @save="onSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { SpeedMindmap } from '@speed-board/vue3-antd';
import { createEmptyMindmap } from '@speed-board/extension-mindmap';
import type { Board } from '@speed-board/core';

const mindmapBoard = ref<Board | null>(null);

// 初始化导图树结构
const initialMindmap = createEmptyMindmap('核心主题', {
  layout: 'right', // 向右分布
  fill: '#1677ff',
  color: '#ffffff',
});

const onCreated = (board: Board) => {
  mindmapBoard.value = board;
};

const onSave = () => {
  if (!mindmapBoard.value) return;
  const tree = mindmapBoard.value.raw.children[0];
  console.log('保存思维导图树:', tree);
};
</script>

<style scoped>
.mindmap-wrapper {
  width: 100%;
  height: 100vh;
}
</style>
```

---

## 键盘快捷流

思维导图支持极简高效的键盘交互流：

| 按键 | 功能 |
| :--- | :--- |
| `Tab` | 为当前选中节点新增一个**子级节点** |
| `Enter` | 为当前选中节点新增一个**同级节点**（或提交当前正在编辑的富文本） |
| `Space` 或 `双击` | 进入节点富文本的原位编辑模式 |
| `Delete` / `Backspace` | 删除当前选中节点（及其所有子孙分支） |
| `方向键 (↑ ↓ ← →)` | 在相邻分支节点间快速移动光标焦点 |
