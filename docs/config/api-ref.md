# Board 门面常用 API

通过 `@created="board => onBoardCreated(board)"` 获取到的 `board` 实例由 `@speed-board/core` 提供，它封装了底层 Plait 引擎的各类底层操作，并提供统一的门面方法。

---

## 1. 数据存取

```ts
// 1. 获取当前画布全量图元 JSON
const elements = board.raw.children;

// 2. 批量替换/重设画布全量图元
board.setChildren(newElements);

// 3. 触发底层重绘
board.render();
```

---

## 2. 视口与缩放控制

```ts
// 1. 获取当前视口缩放比例 (如 1.0)
const zoomLevel = board.getZoom();

// 2. 相对缩放
board.zoom(0.1);  // 放大 10%
board.zoom(-0.1); // 缩小 10%

// 3. 绝对缩放
board.zoomTo(1.0); // 重置为 100% 原始比例

// 4. 内容居中并自适应视口
board.centerContent();

// 5. 抓手模式（漫游/平移画布）
board.setHandMode(true);  // 开启抓手漫游
board.setHandMode(false); // 关闭抓手，恢复默认选择模式
```

---

## 3. 选区与图元操作

```ts
// 1. 获取当前选中图元详情
const selection = board.getSelectionInfo();
// selection: { type: 'shape' | 'mindmap' | 'line' | ..., cell: ... }

// 2. 清空所有选中状态
board.clearSelection();

// 3. 删除当前选中的所有图元
board.deleteSelectedElements();

// 4. 多选图元几何对齐
// 可选方向: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
board.alignSelectedNodes('center');

// 5. 多选图元等间距分布
// 可选方向: 'horizontal' | 'vertical'
board.distributeSelectedNodes('horizontal');

// 6. 图层层级调整
board.bringForward(); // 上移一层
board.sendBackward(); // 下移一层
board.bringToFront(); // 置于顶层
board.sendToBack();   // 置于底层
```

---

## 4. 历史记录 (Undo / Redo)

```ts
// 撤销上一步操作
board.undo();

// 重做下一步操作
board.redo();

// 检查是否可撤销 / 重做
const canUndo = board.canUndo?.();
const canRedo = board.canRedo?.();
```

---

## 5. 访问底层原生 Plait 实例

如果需要调用原生 Plait 或 Slate 的内部底层方法，可直接通过 `board.raw` 访问：

```ts
const plaitBoard = board.raw;
console.log('Plait Native Viewport:', plaitBoard.viewport);
```
