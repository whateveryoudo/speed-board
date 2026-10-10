# speed-board

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
│   ├── core/                      # 纯 TypeScript 内核 (@speed-board/core)
│   │   ├── src/
│   │   │   ├── Board.ts           # 核心控制器 (Yjs Doc/Map, 扩展注册)
│   │   │   ├── extension/         # 插件抽象 Extension 基类
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── vue3/                      # Headless Vue 3 适配层 (@speed-board/vue3, 0 UI库依赖)
│   │   ├── src/
│   │   │   ├── components/        # BoardCanvas 基础画布容器
│   │   │   ├── composables/       # useBoard 等响应式 Hooks
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── vue3-antd/                 # 产品 UI 组件层 (@speed-board/vue3-antd)
│       ├── src/
│       │   ├── components/        # SpeedBoard 完整白板组件 (工具栏、浮动气泡菜单)
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
