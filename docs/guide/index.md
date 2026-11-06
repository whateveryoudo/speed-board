# 介绍

**SpeedBoard** 是一套基于纯原生 SVG 白板引擎 **Plait** 打造的现代协同白板与思维导图套件。

针对业务系统开发中对“白板”与“思维导图”不同形态的使用诉求，SpeedBoard 提供了清晰解耦的双场景组件：
1. **`<SpeedBoard />`**：全功能协作白板，适合无界画布、自由草稿、业务流程图与头脑风暴，支持同时排版多棵导图、几何图元、连线与手绘；
2. **`<SpeedMindmap />`**：独立思维导图专属文档，画布中央默认渲染单一根节点，开箱即写，屏蔽白板左侧工具栏与落点门槛，专注于深度树形思考。

---

## 核心特性一览

| 模块 | 核心能力 |
| :--- | :--- |
| **思维导图引擎** | 11 种结构布局（逻辑图向左/向右/双向、组织架构、鱼骨图、时间线等）；优先级/进度/旗帜标记；概要（Summary）大括号分组；极简键盘流（Tab 增加子级、Enter 增加同级） |
| **基础几何图元** | 19+ 种标准矢量图元（矩形、椭圆、菱形、立方体、气泡等）；原生 Slate 富文本双击排版；中空穿透点击优化（`withHitEnhance`） |
| **智能连线路由** | 内置曼哈顿正交避障算法（Manhattan Router）；移动图形时折线 90° 直角绕行；9 种端点箭头形态；端点磁吸联动 |
| **手绘画笔** | 平滑 Catmull-Rom 贝塞尔曲线拟合；多挡粗细与调色盘 |
| **1:1 原生待放置虚影** | 原生绝对坐标渲染 `PlacementGhostOverlay`，杜绝缩放模糊与落地抖动 |
| **Schema 驱动体系** | 选区浮动工具栏与右侧样式抽屉由选中目标图元 Schema 动态装配；支持对齐、等间距分布、图层层叠与成组 |

---

## 在线体验

- 在线 Demo：[https://whateveryoudo.github.io/speed-board/demo/](https://whateveryoudo.github.io/speed-board/demo/)
- 源码仓库：[https://github.com/whateveryoudo/speed-board](https://github.com/whateveryoudo/speed-board)
