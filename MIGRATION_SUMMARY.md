# SpeedBoard 架构迁移与底层变动总结报告

本文档记录 SpeedBoard 从 `@antv/x6` 迁移至原生现代白板引擎 `Plait`（及参考 `Drawnix` 工业级实现）的变动背景、踩坑复盘与解决方案。

---

## 1. 迁移背景与底层动机

### 1.1 为什么放弃 @antv/x6？
在过去的旧架构中，SpeedBoard 采用 `@antv/x6` 作为底座。然而随着白板业务的发展，X6 暴露了若干核心瓶颈：
1. **重型拓扑图与白板交互定位冲突**：
   - X6 本质是为图编辑、流程设计器（DAG、连线拓扑）设计的，其视图层大量依赖 DOM 容器外挂，图形缩放、平移时容易产生微小错位和层级闪烁。
2. **富文本与内联编辑割裂**：
   - X6 节点内部的文本编辑多采用 HTML 外挂 `foreignObject` 或临时 input/textarea 叠加，双击输入、光标选区管理、撤销重做（Undo/Redo）与节点本身的属性树无法原子化合并。
3. **思维导图与自由手绘支撑困难**：
   - 在 X6 中实现思维导图自动排版、鱼骨图、组织架构图切换需要编写繁重的外置布局算法，每次节点增删都需要全量 recalculate；
   - 自由画笔（Freehand / Pencil）受限于 SVG Path 的逐点更新性能与平滑算法（Catmull-Rom），在大白板场景下极易卡顿。

### 1.2 为什么全面拥抱 Plait 原生架构？
`Plait`（由 Worktile 团队开源，及衍生产品 `Drawnix`）是专为现代协同白板设计的原生架构：
- **纯粹的不可变数据流（Immer-based）**：数据模型与 Slate.js 高度统一，节点增删改全部走标准的 `Transforms` 操作流水线。
- **真正的原生多图元渲染**：几何图形（Geometry）、思维导图（Mind）、连线（ArrowLine）、自由画笔（Freehand）、表格（Table）、图片全部在统一的 SVG Viewport 中通过插件扩展，零外挂 DOM。
- **富文本原生集成**：文字节点直接依托 Slate 富文本能力，排版计算与选区光标完全原生。

---

## 2. 关键迁移故障复盘与解决方案

在本次迁移中，我们攻克了以下几个最为隐蔽且关键的底层与交互问题：

### 2.1 图形单击“必须点边框才能选中，点内部空白选不中”的底层 Bug
- **现象**：
  用户在画布中随手画出一个矩形或圆形，如果用鼠标点击图形正中间的腹地，图形**毫无反应、无法选中**；只有极其小心地瞄准 **4~5px 的细边框线**点击，或者使用鼠标框选（拉框），才能成功选中。
- **源码根因（Plait 底层设计 + 时序异常）**：
  查阅 Plait 源码 `packages/draw/src/utils/hit.ts` 第 217~227 行发现：
  ```ts
  export const isHitDrawElement = (board, element, point, isStrict = true) => {
      // 1. 先检测是否击中边框线 (距离在 4~5px 缓冲内)
      if (isHitEdgeOfShape(board, element, point, HIT_DISTANCE_BUFFER)) {
          return true;
      }
      
      // 2. 底层代码：如果是严格模式 + 没有文字 + 没有填充颜色
      if (!!isStrict && isEmptyTextElement(element) && !isFilledDrawElement(board, element)) {
          return false; // <--- 只要点在图形内部空白处，底层直接强行返回 false！
      }

      // 3. 只有上面没被 return 拦截，才会执行几何内部判定
      const engine = getEngine(getElementShape(element));
      return isHitText || engine.isInsidePoint(rectangle!, point);
  };
  ```
  - **官方作者的设计初衷**：Plait 作者沿袭了传统 CAD / Illustrator 的“中空穿透”理念，认为未填色未输入文字的图形是“中空透明”的，中间点击应该穿透以操作背后的图元；
  - **时序 NPE 缺陷**：在刚创建图形时，富文本 Slate 编辑器尚未挂载到 WeakMap，`isEmptyTextElement` 内部调用 `editor.children[0]` 抛出 `Cannot read properties of undefined`，异常被外层 catch 吞掉后直接判定未命中。
- **解决方案**：
  编写 [`withHitEnhance`](file:///Volumes/ykxDrive/gitee/speed-platform/speed-board/packages/core/src/plait/with-hit-enhance.ts) 插件切片：
  - 捕获 NPE 异常；
  - 当底层因“无填充/无文字”返回 `false` 时，调用 Plait 原生的闭合图形几何判定 `board.isInsidePoint(element, point)`，无论是否有颜色填充，只要在几何图形轮廓内部，均立即判定为命中。修复后单击图形内部任意位置秒级灵敏选中！

---

### 2.2 画笔（Pencil / Freehand）无法绘制的问题
- **根因**：
  在 `packages/core/src/plait/freehand/utils.ts` 中，`getFreehandPointers()` 枚举数组中只写了 `[FreehandShape.feltTipPen, FreehandShape.eraser]`，遗漏了钢笔指针 `FreehandShape.nibPen`。
- **修复**：补齐 `FreehandShape.nibPen`，画笔和马克笔即刻恢复流畅绘制。

---

### 2.3 工具栏与弹出层图标全部显示为空白方块
- **根因**：
  SpeedBoard 工具栏使用 `<SIconFont>` 组件（依赖阿里巴巴 Iconfont 符号库 `font_3786040_k69q5351cel.js`）。拆分包后漏掉了注入脚本的 `install.ts`，导致 `<use xlink:href="#...">` 找不到 SVG Symbol 定义。
- **修复**：
  在 `packages/vue3-antd/src/install.ts` 中恢复 `ensureSpeedComponents` 自动注入阿里巴巴矢量图标库 JS，图标全部瞬间恢复。

---

### 2.4 思维导图结构切换报错 `getData is not a function`
- **根因**：
  旧代码中残留了 X6 时代的节点数据获取方式 `selectedCell.value?.getData()`。
- **修复**：
  全面移除 X6 兼容垫片，规范接入 Plait 原生导图 API：`MindTransforms.setLayout(board, layout)` 和 `MindTransforms.setShape(board, shape)`。

---

### 2.5 选区悬浮工具栏（FloatingToolbar / Tip Config）双坐标系转换与自动跟随
- **根因**：
  画布支持缩放（Zoom）和平移（Pan），图形的真实坐标在 Plait `ViewBox` 坐标系中，而悬浮工具栏是挂载在页面外层宿主（Host）的 DOM 元素。直接使用图元坐标会导致缩放后悬浮栏位置漂移。
- **修复**：
  在 `FloatingToolbarController` 中使用 `getRectangleByElements(board.raw, selected)` 获取当前选区联合外接矩形，并通过 `toHostPointFromViewBoxPoint` 严谨换算为 Host 像素坐标，无论画布如何缩放平移，悬浮工具栏均稳固居中贴合在选中图形顶部上方。

---

## 3. 迁移前后对比

| 指标 / 维度 | 旧版 (X6 方案) | 新版 (Plait + 无头分层方案) |
| :--- | :--- | :--- |
| **外部依赖** | `@antv/x6`, `@antv/x6-plugin-*` (230+ 冗余包) | 纯净 `@plait/*` 原生白板套件，零 X6 依赖 |
| **打包体积** | 庞大，大量 DOM 兼容胶水层 | 干净轻量，核心逻辑纯 TS 无 DOM |
| **选区交互** | 外挂 DOM 浮层，缩放易偏移 | 统一矩阵变换，精确贴合图元顶部 |
| **点击命中** | 存在边缘拾取与中空判定死角 | `withHitEnhance` 几何感知，任意区域秒级响应 |
| **多框架支持** | 仅支持 Vue 3，与 Ant Design 强耦合 | 核心控制器与 Vue 3 无头 Hook 解耦，可无缝支持 React / Solid |
