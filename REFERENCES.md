# SpeedBoard 底层引擎与开源项目推荐指引

SpeedBoard 的纯净原生白板能力建立在现代高质量开源白板生态的基础之上。在深入二次开发、调试复杂渲染或扩展自定义图元时，强烈推荐参考以下两份核心源码及架构设计：

---

## 1. 核心底层开源项目

### 1.1 Plait 核心引擎
- **GitHub 仓库**：[https://github.com/worktile/plait](https://github.com/worktile/plait)
- **本地参考路径**：`/Volumes/ykxDrive/gitee/speed-platform/plait`
- **定位**：现代白板内核基础设施（基于 Immer 不可变数据流 + Slate 富文本模型 + 原生 SVG/Canvas 渲染）。
- **重点参考目录**：
  - `packages/core/src/transforms/`：核心变换操作（`setSelection`, `setNode`, `insertNode`, `removeNode`）。
  - `packages/core/src/plugins/`：基础白板插件流水线（`with-board`, `with-selection`, `with-moving`, `with-history`）。
  - `packages/draw/src/utils/hit.ts`：图形命中检测与相交算法（包括边框检测、中空穿透判定与多边形算法）。
  - `packages/mind/src/`：脑图排版、结构分支计算与连接线路由算法。

### 1.2 Drawnix 工业级白板实现
- **GitHub 仓库**：[https://github.com/plait-board/drawnix/tree/develop](https://github.com/plait-board/drawnix/tree/develop)
- **本地参考路径**：`/Volumes/ykxDrive/gitee/speed-platform/drawnix`
- **定位**：基于 Plait 打造的成熟工业级白板应用（手绘 Rough.js 风格、完整工具栏体系、富文本深度绑定）。
- **重点参考目录**：
  - `packages/drawnix/src/components/toolbar/popup-toolbar/`：悬浮工具栏（Popup Toolbar）图元属性提取与位置计算标杆。
  - `packages/drawnix/src/plugins/freehand/`：手绘笔刷、平滑算法（Catmull-Rom）与橡皮擦实现。
  - `packages/drawnix/src/transforms/property.ts`：属性批量补丁与透明度/主题色映射规范。

---

## 2. 深入开发技巧与调试指南

### 2.1 如何调试 Plait 节点映射（WeakMap）
Plait 为了保证极高性能，将节点与 DOM、父节点、索引的关联保存在一系列全局 WeakMap 中：
- `NODE_TO_INDEX`: 当前元素在 `board.children` 中的索引。
- `NODE_TO_PARENT`: 当前元素的父容器（画板根或脑图父节点）。
- `NODE_TO_G`: 当前元素对应的底层 SVG `<g>` 容器。

> **最佳实践**：在任何批量操作（如组合、对齐、移动）前，建议调用 `Board.syncNodeIndices()` 重新同步 WeakMap 索引，避免因索引过期导致操作错位。

### 2.2 如何自定义扩展全新图元插件
若未来需要新增类似“UML 时序图”或“富文本便签”的新图元，规范流程如下：
1. **定义数据模型**：在 `@speed-board/shared` 中定义图元数据接口（必须包含 `id`, `type`, `points`）。
2. **编写组件渲染器**：继承或实现 Plait Component，在 `drawElement` 钩子中返回对应 SVG/HTML 渲染函数。
3. **注册交互切片**：
   - `board.getRectangle`：定义外接矩形计算；
   - `board.isHit`：定义点击拾取范围；
   - `board.isRectangleHit`：定义框选相交范围。
4. **接入控制器**：在 `@speed-board/view` 中添加该图元类型在 FloatingToolbar 和属性面板中的动作映射。
