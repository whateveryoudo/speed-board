# speed-board

轻量级现代化协同画板（白板 / 流程图）引擎，基于 **AntV X6** 与 **Yjs CRDT** 构建，采用类似 Tiptap / Speed-Sheet 的模块化与插件化架构。

## 特性规划

- 🎨 **SVG + `<foreignObject>` 混合渲染**：图形矢量无损缩放，节点富文本排版完美复用原生 HTML/CSS。
- 🤝 **天然 0 冲突协同**：基于 Yjs 扁平 Entity 模型，多端无缝实时协同，支持感知（Awareness）多人鼠标光标。
- 🔌 **高扩展插件机制**：解耦核心内核 (`@speed-board/core`) 与 UI 展现层 (`@speed-board/vue3`)。
- 📐 **专业图编辑能力**：正交折线路由、锚点吸附、辅助对齐线、浮动气泡工具栏（Bubble Floating Bar）。

## 目录结构

```text
speed-board/
├── packages/
│   ├── core/                      # 纯 TypeScript 内核
│   │   ├── src/
│   │   │   ├── Board.ts           # 核心控制器
│   │   │   ├── extension/         # 插件抽象与内置插件
│   │   │   ├── commands/          # 画板命令调度
│   │   │   ├── yjs/               # Yjs CRDT 数据同步层
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── vue3/                      # Vue 3 适配层与 UI 组件
│       ├── src/
│       │   ├── components/        # 画布与浮动工具条组件
│       │   ├── composables/       # useBoard 等组合式 API
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
