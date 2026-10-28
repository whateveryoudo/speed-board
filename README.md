# speed-board

> 📢 **重要重构通告 (重大版本迁移)**：
>
> SpeedBoard 项目已完成**全面底层架构重构**，彻底淘汰了旧版 `@antv/x6` 拓扑方案，全量切换至现代化原生无界白板引擎 **[Plait](https://github.com/worktile/plait)**（参考工业级实现 **[Drawnix](https://github.com/plait-board/drawnix/tree/develop)**），并落地面向多框架（Vue 3 / React / Solid）的工业级无头分层体系（Headless Architecture）。
>
> 🚀 **全新重构代码、核心动机深度剖析、架构设计图及最新体验，请直接前往迁移分支：**
> 
> 👉 **[【点击跳转至全新 Plait 原生白板分支：feat/plait-migration】](https://github.com/whateveryoudo/speed-board/tree/feat/plait-migration)**
>
> ---
>
> ### 💡 为什么必须从 X6 迁移？核心原因速览：
> 1. **连线交互降维打击**：旧版 X6 在**正交折线避障路由（Manhattan Router）**和**边缘桩位吸附**上投入了巨大成本，但实现依然脆弱且容易产生折返死结、斜穿节点与吸附漂移；新版 Plait 底层直接内置专用正交折线算法（`generateElbowLineRoute` 与 `simplifyOrthogonalPoints`）及几何边缘吸附联动（`boundReaction`），彻底解决连线打结与吸附错位问题。
> 2. **100% 纯原生 SVG 渲染**：彻底告别 X6 沉重的 DOM / `<foreignObject>` 容器外挂，缩放平移无任何亚像素抖动与层级错位。
> 3. **原子级 Slate 富文本集成**：文字直接依托 Slate.js 不可变数据流，支持双击内联排版与连线文字自适应居中。
> 4. **底层中空点击穿透攻坚**：封装 `withHitEnhance` 增强插件，修复了 Plait 默认无填充无文字图形必须瞄准 4px 边框点击的缺陷，实现点击图形内部任意区域秒级响应。
> 5. **工业级极简 3+1 分层体系**：`@speed-board/shared` (几何/资产) + `@speed-board/core` (纯TS引擎统一中枢) + `@speed-board/vue3` (无UI耦合Hook) + `@speed-board/vue3-antd` (视觉UI)，去除了无意义的透传包装层，直连高效，未来可直接无缝扩展至 React / Solid。
>
> 📖 欢迎查阅重构分支首页完整文档：[https://github.com/whateveryoudo/speed-board/tree/feat/plait-migration](https://github.com/whateveryoudo/speed-board/tree/feat/plait-migration)

---

*(以下为旧版 @antv/x6 历史存档说明)*

轻量级现代化协同画板（白板 / 流程图）引擎，基于 **AntV X6** 与 **Yjs CRDT** 构建，采用与 `speed-sheet`、`speed-editor` 高度对称的插件化与分层架构。

## 特性规划

- 🎨 **SVG + `<foreignObject>` 混合渲染**：图形矢量无损缩放，节点富文本排版完美复用原生 HTML/CSS。
- 🤝 **天然 0 冲突协同**：基于 Yjs 扁平 Entity 模型，多端无缝实时协同，支持感知（Awareness）多人鼠标光标。
- 🔌 **高内聚单向流架构**：`core` 纯 TS 引擎、`vue3` Headless 响应式层、`vue3-antd` 开箱即用组件层清晰解耦。
- 📐 **专业图编辑能力**：正交折线路由、锚点吸附、辅助对齐线、浮动气泡工具栏（Bubble Floating Bar）。

## 目录结构

```text
speed-board/
├── packages/
│   ├── shared/                    # 零依赖公共数据契约与资产包 (@speed-board/shared)
│   │   ├── src/
│   │   │   ├── types/             # 几何类型、图元 Schema、交互契约
│   │   │   ├── shapes/            # 93 个全量标准矢量图元库 (SHAPE_GROUPS)
│   │   │   └── constants/         # 调色盘预设、默认图形尺寸
│   │   └── package.json
│   │
│   ├── core/                      # 纯 TypeScript 内核 (@speed-board/core, 0 框架依赖)
│   │   ├── src/
│   │   │   ├── Board.ts           # 调度中枢控制器 (commands 语法糖)
│   │   │   ├── commands/          # TipTap 链式命令管理器
│   │   │   ├── extension/         # 插件抽象与内置插件执行体 (history, clipboard, selection, shape)
│   │   │   ├── nodes/             # X6 节点驱动定义 (shape, text, vector, icon, image)
│   │   │   └── operations/        # 领域操作算子 (shapeOps, textOps, layoutOps)
│   │   └── package.json
│   │
│   ├── view/                      # 跨框架视口与几何运算引擎 (@speed-board/view, 纯 TS 无框架依赖)
│   │   ├── src/
│   │   │   ├── draw/              # 贝塞尔平滑拟合 (path-smoother.ts)
│   │   │   ├── snapping/          # 边缘磁吸与对齐检测 (port-snapping.ts)
│   │   │   └── overlay/           # 浮动编辑器定位、4向连接桩坐标投影、虚影布局
│   │   └── package.json
│   │
│   ├── vue3/                      # Headless Vue 3 适配层 (@speed-board/vue3, 0 UI库依赖)
│   │   ├── src/
│   │   │   ├── Board.ts           # TipTap Editor.ts 模式：markRaw + Vue 响应式状态桥接
│   │   │   ├── components/        # 4 大 Headless 核心交互图层 (Drawing/Text/Ports/Placement)
│   │   │   ├── composables/       # useBoard 等响应式 Hooks
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── vue3-antd/                 # 产品 UI 组件层 (@speed-board/vue3-antd)
│       ├── src/
│       │   ├── components/        # SpeedBoard 完整 Ant Design 白板 (工具栏、属性面板、浮动气泡菜单)
│       │   └── index.ts
│       └── package.json
│
├── demos/
│   └── vue3-demo/                 # 本地开发与协同联调 Demo
├── ARCHITECTURE.md                # 架构设计方案与演进路线
├── pnpm-workspace.yaml
└── package.json
```

## 快速开始

```bash
# 安装依赖
pnpm install

# 运行本地开发 Demo
pnpm dev
```
