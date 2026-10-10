# Speed-Board 协同画板（白板/流程图）技术方案与架构设计

本文档总结自对语雀画板（Lakeboard）底层机制、渲染模型以及协同算法的深入调研，用于指导后续 `speed-board` 独立仓库/模块的开发落地。

---

## 一、 语雀画板（Lakeboard）核心技术机制剖析

### 1. 渲染架构：SVG + `<foreignObject>` 混合模式
- **图形与线条用 SVG 矢量渲染**：矩形、圆角椭圆、菱形、折线箭头等，缩放（0.1x - 5x）永不失真。
- **文字与富文本用 `<foreignObject>` 嵌入 HTML**：
  - 避免在 Canvas 中手工计算字号、行高、折行、对齐、富文本标签的巨大成本。
  - 直接在 SVG 内部承载 `<div style="...">富文本内容</div>`，样式排版完全复用浏览器原生 CSS 引擎。
- **底层原型推测**：阿里系图编辑框架 **AntV X6** / G6 规范，数据结构与节点锚点设计（`E/S/W/N`、曼哈顿折线路由）高度相似。

### 2. 坐标与定位系统
- **世界坐标系（World Coordinates）**：每个节点具备绝对逻辑坐标 `{ x, y, width, height, rotate, zIndex }`。
- **视口变换（Viewport Transform）**：
  $$\text{屏幕坐标} = (\text{世界坐标} - \text{视口左上角}) \times \text{Zoom}$$
  在根节点 `<g transform="matrix(zoom, 0, 0, zoom, tx, ty)">` 做全局硬件加速变换。
- **动态锚点与折线路由**：连线端点绑定到节点边界方位（如 `connection: "S"`），节点移动时动态更新连线起点终点，并由正交路由算法（Orthogonal Routing）计算折点。

---

## 二、 协同架构：CRDT / Yjs 接入方案

白板是**扁平实体模型（Entity Model）**，比起线性富文本（ProseMirror），它在 Yjs 上的映射更简单、几乎**天然 0 冲突**。

### 1. 数据结构设计
```typescript
import * as Y from 'yjs'

// 1. 文档根节点
const ydoc = new Y.Doc()

// 2. 所有图元（节点与连线）：Y.Map 以 ID 为 key
// yCells: Map<string, Y.Map<string, any>>
const yCells = ydoc.getMap('cells')

// 3. 协同状态（鼠标位置、选中框、用户头像）
// 走 y-protocols/awareness
```

### 2. Yjs 解决并发冲突机制
- **不同属性并发修改**：用户 A 改节点颜色，用户 B 同时拖拽位置 $\to$ 属性级自动合并，**0 冲突**。
- **同一属性并发拖拽**：用户 A 和 B 同时移动同一图形 $\to$ Yjs 基于 Lamport 逻辑时钟确定性胜出（LWW），两端无感收敛到同一坐标。
- **监听职责**：业务层**不需要编写任何冲突仲裁代码**，Yjs 触发更新时拿到的已经是最终合并好的数据，内核只负责将数据渲染到画布。

---

## 三、 整体系统分层架构（延续 Tiptap / Sheet 插件化设计）

```mermaid
flowchart TB
    subgraph UI_Layer ["UI 表现层 (@speed-board/vue3)"]
        Toolbar["左侧工具栏 (Toolbar.vue)"]
        FloatingTip["节点浮动工具条 (BubbleMenu.vue)"]
        CanvasContainer["画布容器 (BoardCanvas.vue)"]
    end

    subgraph Core_Layer ["内核层 (@speed-board/core) - 插件化驱动"]
        Board["Board 核心实例 (生命周期/事件分发)"]
        CommandManager["CommandManager (统一调度命令)"]
        PluginSystem["Extension / Plugin 系统"]

        subgraph Core_Extensions ["官方插件集"]
            ExtShape["ShapeExtension (基础图形: 矩形/圆/菱形)"]
            ExtEdge["EdgeExtension (曼哈顿折线/连线吸附)"]
            ExtHistory["HistoryExtension (Yjs UndoManager)"]
            ExtSnapline["SnaplineExtension (对齐辅助参考线)"]
            ExtBubble["BubbleMenuExtension (浮动工具栏)"]
            ExtSwimlane["SwimlaneExtension (后续扩展: 泳道容器)"]
        end
    end

    subgraph Engine_Layer ["底层图形引擎 (AntV X6)"]
        X6Graph["X6 Graph 实例 (SVG / DOM / 矩阵平移缩放)"]
        X6Events["X6 事件系统 (node:move, edge:connected)"]
    end

    subgraph Data_Layer ["数据与协同层 (Yjs CRDT)"]
        YDoc["Y.Doc"]
        YCells["Y.Map('cells') (所有图元实体)"]
        Awareness["Awareness (多人鼠标光标/选中框)"]
    end

    UI_Layer -->|调度命令 / 监听状态| Board
    Board --> PluginSystem
    PluginSystem --> Core_Extensions
    Core_Extensions -->|操控画布渲染| X6Graph
    X6Events -->|捕获用户操作| Core_Extensions
    Core_Extensions <-->|单向事务读写 / 监听变更| YCells
    YDoc <-->|WebSocket Provider| 远程服务端
```

---

## 四、 推荐项目目录结构（Monorepo）

```text
speed-board/
├── packages/
│   ├── core/                      # 纯 TypeScript 内核（类似 Sheet.ts / Editor.ts）
│   │   ├── src/
│   │   │   ├── Board.ts           # 核心控制器（生命周期、X6实例、事件总线）
│   │   │   ├── extension/         # 插件抽象与内置插件
│   │   │   │   ├── Extension.ts   # 插件基类
│   │   │   │   ├── core/
│   │   │   │   │   ├── shapes/    # 矩形、椭圆、菱形、文本
│   │   │   │   │   ├── edge/      # 连线、折线、箭头、磁吸桩
│   │   │   │   │   ├── history/   # Yjs UndoManager 撤销重做
│   │   │   │   │   └── snapline/  # 辅助对齐吸附线
│   │   │   ├── commands/          # 命令集合（addShape, updateShape, deleteCells 等）
│   │   │   ├── yjs/               # Yjs 绑定层（_initCollabSync、事务标记、origins）
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── vue3/                      # Vue3 适配层与 UI 组件
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── BoardCanvas.vue     # 主画布承载组件
│   │   │   │   ├── LeftToolbar.vue     # 左侧图元选择工具栏
│   │   │   │   └── FloatingTip/        # 节点选中浮动工具条 (Bubble Bar)
│   │   │   │       ├── ShapeTip.vue    # 图形专属 Tip (换颜色/形状/文字)
│   │   │   │       ├── EdgeTip.vue     # 连线专属 Tip (改线型/箭头/文字)
│   │   │   │       └── MultiSelectTip.vue # 多选批量对齐 Tip
│   │   │   ├── composables/            # useBoard, useSelection, useAwareness
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── demos/
│       └── vue3-demo/             # 本地开发与协同联调 Demo
├── pnpm-workspace.yaml
└── package.json
```

---

## 五、 最小可行性版本（MVP）实施路线

新开会话开发时，按以下节奏推进：

1. **第 1 阶段：底座与 Yjs 联通（1~2 天）**
   - 搭建 Monorepo 工程结构与打包配置。
   - 封装 `Board` 基础类，挂载 AntV X6 画布。
   - 实现 `Board.ts` 的 `_initCollabSync()`：
     - 本地变更 $\to$ 写入 `yCells`。
     - 远程 `ydoc.on('update')` $\to$ 更新 X6 Cell，完成两人同时开网页双向同步。
2. **第 2 阶段：核心图元扩展（1 天）**
   - 实现 4 种常用基础形状：开始/结束（圆角椭圆）、矩形（流程）、菱形（判断）、折线带箭头（Elbow Edge）。
   - 实现节点文字双击编辑（`<foreignObject>` / 内联 input）。
3. **第 3 阶段：浮动操作条 Floating Tip（1 天）**
   - 监听 X6 选中事件 `cell:selected`，实时计算在屏幕坐标上的浮动位置。
   - 渲染浮动 Tip：支持改填充色、边框样式、删除、层级置顶。
4. **第 4 阶段：多人光标与高级功能（后续迭代）**
   - 接入 Awareness 多人鼠标光标与选择框跟随。
   - 泳道（Swimlane）容器与更多图元。
