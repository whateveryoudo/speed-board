# SpeedBoard 项目开发进度与技术交接文档

> **文档版本**: 1.0.0  
> **更新时间**: 2026-10-13  
> **适用范围**: 新会话承接、架构交接与后续功能开发指引

---

## 一、项目架构与技术栈概览

- **代码仓库**: `speed-board` (Pnpm Monorepo)
- **底层图形引擎**: `@antv/x6` v2.18+ (SVG / Canvas 矢量画布)
- **UI 组件层**: `Vue 3` + `TypeScript` + `ant-design-vue` + `speed-components-ui`
- **协同引擎**: `Yjs` CRDT + `y-protocols`
- **主要 Package 划分**:
  - `packages/core`: 画板核心引擎封装 (`Board.ts`)，包含 X6 实例化、插件调度、图形注册、协同绑定、手绘与文本操作 API。
  - `packages/vue3`: Vue3 画布基础绑定 (`BoardCanvas.vue`)。
  - `packages/vue3-antd`: 1:1 语雀白板风格交互层与工具链（顶栏、左侧悬浮胶囊栏、右侧属性面板、就地文本输入、悬浮链接面板等）。
  - `demos/vue3-demo`: 本地调试工程（Vite 启动，端口 5175）。

---

## 二、当前已完成的核心功能

### 1. 矢量钢笔与手绘交互引擎
- **手绘笔触**: 支持普通铅笔、荧光马克笔（半透明）与橡皮擦功能。
- **矢量钢笔 (Vector Pen)**:
  - 动态描点与折线实时预览，支持辅助虚线引线。
  - 起点闭合检测（磁吸蓝光扩散动效），双击或闭合时自动生成闭合多边形。
  - 填充颜色联动（支持单色与 5 阶梯度色盘）、边框颜色、粗细、虚线样式与整体透明度。

### 2. 图元变换选框与独立旋转手柄 (1:1 语雀白板)
- **单一变换选框**: 规避了 Selection 选框与 Transform 控制框重叠的问题，通过自定义样式实现极简高清蓝线选框。
- **旋转手柄**:
  - 独立手柄统一定位在左下角（`-24px, -24px`），采用专属矢量图标 `@images/rotate.svg`。
  - 旋转过程在图元正下方居中动态展示平滑度数气泡（如 `45°`、`-90°`），旋转结束淡出。
- **全边框隐形拖拽热区**:
  - 选框四条边线上**去除了突兀的视觉标记/胶囊块**，保持纯粹蓝线。
  - 上下左右四条边线自带全长透明感应热区：移到左右边线显示 `ew-resize`，可直接拖拽单改**宽度**；移到上下边线显示 `ns-resize`，可直接拖拽单改**高度**；四角圆点保留等比/双向缩放。

### 3. 文本图元与选框内就地打字 (Inline In-Place Editing)
- **原理方案**:
  - SVG `<text>` 本身无法获得原生键盘光标与拼音输入法，采用**就地透明 HTML `<textarea>` 模拟输入**方案。
  - 双击文本节点或在工具栏点击 `T` 放置文本时，直接在选框正上方贴合挂载透明输入框，底层 SVG 文本临时隐藏，呈现 100% 选框内就地输入光标。
  - 输入过程中文本框与选框根据字数和换行**实时动态扩展尺寸**；画布缩放与平移时输入框像素级贴合。
  - 失焦（Blur）或按 `Esc` / `Ctrl+Enter` 自动提交保存并写回图元。
- **链接配置悬浮框 (`TextOverlayEditor.vue`)**:
  - 双击打字时不弹窗，**仅在右侧面板点击「添加链接」或「编辑」时才在图元下方弹出**。
  - 包含文本字段、链接地址输入框（聚焦翠绿边框）与确定按钮。

### 4. 右侧属性设置面板 (`StyleSettingsPanel.vue`)
- **智能标签切换**:
  - 选中图形/矢量节点时显示：`样式`（填充颜色+5阶梯度、边框颜色/粗细/样式、不透明度滑块） | `排列`（置顶/置底/上下移一层）。
  - 选中文字节点时显示：`文本`（粗体、斜体、删除线、下划线、字号下拉选择、文本颜色、水平/垂直对齐、添加/编辑链接） | `排列`。

---

## 三、当前代码变更状态

> **重要约束**: 所有代码均仅保留在本地工作区，**未执行任何 git commit 或 git push**。

**涉及修改与新增的文件清单**:
1. `packages/core/src/Board.ts`:
   - 注册 `speed-text-node`，完善文本与基础图元更新逻辑。
   - 实现 `isTextNode()`、`updateTextNode()`、`updateSelectedTextStyle()`、`getSelectedTextData()`。
   - 优化文本节点动态尺寸计算逻辑（`minWidth: 80, minHeight: 36`，字长缩放自适应）。
2. `packages/vue3-antd/src/components/SpeedBoard.vue`:
   - 实现选框内就地文本打字控制器与样式计算（`inlineEditorStyle`, `startInlineTextEdit`, `finishInlineTextEdit`）。
   - 挂载 `TextOverlayEditor`（按需呼出链接编辑框）。
   - 挂载旋转度数提示气泡。
3. `packages/vue3-antd/src/components/LeftToolbar.vue`:
   - 在图元创建时向外派发 `shape-added` 事件，实现点击 `T` 立即进入就地编辑。
4. `packages/vue3-antd/src/components/StyleSettingsPanel.vue`:
   - 全新实现右侧面板文本模式与图形模式无缝自适应切换。
5. `packages/vue3-antd/src/components/TextOverlayEditor.vue` (新文件):
   - 1:1 语雀白板文本与链接配置 Popover 组件。
6. `packages/vue3-antd/src/components/ColorTonePicker.vue` (新文件):
   - 1:1 语雀白板经典 9 基础色调 + 5 阶梯度颜色选择器。
7. `packages/vue3-antd/src/style/common.less`:
   - X6 变换框美化：去除边框视觉小胶囊、保留全长隐形热区、四角圆点与左下角独立旋转手柄样式。
   - 旋转图标切换为 `@images/rotate.svg`。
8. `demos/vue3-demo/vite.config.ts`:
   - 配置路径别名 `@` -> `packages/vue3-antd/src`、`@images` -> `packages/vue3-antd/src/assets/images`。
9. `packages/vue3-antd/src/index.ts`:
   - 导出 `TextOverlayEditor`、`StyleSettingsPanel`、`ColorTonePicker`。

---

## 四、新会话待启动开发任务：全量图形库与锚点选择器

用户已从语雀控制台完整提取了全部基础图形、流程图、Smart、UML、ER 图形的矢量 SVG 数据结构。新会话将以此为基础实现完整的图形选择器与扩展节点。

### 1. 结构化解析图形数据集 (`packages/vue3-antd/src/data/shapeLibrary.ts`)
用户提取的数据包含以下 5 大核心分组与具体图形：
1. **基础图形 (`basic`)**:
   - 矩形 (`rect`)、圆角矩形 (`rounded-rect`)、圆形 (`circle`)、三角形 (`triangle`)、菱形 (`diamond`)、平行四边形 (`parallelogram`)、梯形 (`trapezoid`)、十字 (`cross`)、标注 2 (`comment-2`)、标注 (`comment`)、左括号 (`left-bracket`)、右括号 (`right-bracket`)、五边形 (`polygon`)、五角星 (`star`)、左箭头 (`arrow-1`)、右箭头 (`arrow-2`)、双向箭头 (`arrow-3`)、五边箭头 (`pentagon-arrow`)、流程箭头 (`process-arrow`)、云 (`cloud`)、泳道垂直 (`swimlane-vertical`)、泳道水平 (`swimlane-horizontal`)。
2. **流程图 (`flowchart`)**:
   - 过程 (`process`)、决策 (`decision`)、起止符 (`start-end`)、预定义流程 (`subroutine`)、文档 (`document`)、多文档 (`multi-document`)、手动输入 (`manual-input`)、准备 (`preparation`)、数据 (`data`)、数据库 (`database`)、硬盘 (`hard-disk`)、内部存储 (`internal-storage`)、条带 (`paper-tape`)、手动循环 (`manual-loop`)、延迟 (`delay`)、存储数据 (`stored-data`)、合并 (`merge`)、连接器 (`connector`)、或者 (`or`)、汇总连接 (`summing-junction`)、显示 (`display`)、页外连接符 (`off-page`)、循环起止符 (`loop-limit`)、卡片 (`card`)、排序 (`sort`)、整理 (`collate`)、并行模式 (`parallel`)、批注 (`annotation`)。
3. **Smart (`DSL`)**:
   - 金字塔 (`pyramid`)、分段金字塔 (`segmented pyramid`)、阶段图 (`stage`)、架构图 (`architecture`)。
4. **UML (`UML`)**:
   - 角色 (`actor`)、用例 (`use-case`)、包 (`package`)、组合片段 (`frame`)、约束 (`constraint`)、注释 (`note`)、类 (`class`)、活动类 (`activity-class`)、简单类 (`simple-class`)、接口 (`interface`)、多类例 (`multiplicity`)、时间信号 (`frequency`)、激活 (`activation`)、实体 (`entity`)、控制 (`control`)、绑定 (`boundary`)、删除 (`deletion`)、状态 (`state`)、对象 (`object`)、开始 (`start`)、结束 (`finish`)、流终止 (`termination-pseudostate`)、历史 (`history-pseudostate`)、分支 (`choice`)、活动 (`activity`)、发送信号 (`send-signal`)、接收信号 (`receive-signal`)、同步 (`fork`)、组件 (`component`)、节点 (`node`)。
5. **ER 图 (`ER`)**:
   - 实体 (`er-entity`)、弱实体 (`weak-entity`)、派生属性 (`derived-attribute`)、属性 (`attribute`)、多值属性 (`multivalued-attribute`)、关系 (`relationship`)、弱关系 (`weak-relationship`)、概化 (`generalization`)、全部概化 (`total-generalization`)。

### 2. 图形选择面板交互 (`ShapePickerPopover.vue`)
- **面板形态**: 位于左侧胶囊工具栏图形图标旁边弹出的 Popover。
- **顶部锚点 Tab 导航** (参考 `speed-editor` 仓库中 `emojiPicker` 模式)：
  - 常驻 Tab：`基础图形` | `流程图` | `Smart`；
  - 更多下拉菜单：`···` 下拉展示 `UML`、`ER`。
- **锚点平滑联动**:
  - 点击 Tab：内容滚动容器自动平滑滚动到对应分组（`scrollIntoView({ behavior: 'smooth' })`）。
  - 内容区滚动：监听 `onScroll`，当前视口内的分组自动高亮顶部对应 Tab。
- **图形网格**: 6 列栅格网格，悬浮显示图元名称 Tooltip，点击后在画布中央生成图元。

### 5. 全量图形库与锚点导航图形选择器 (1:1 语雀白板)
- **结构化全量矢量图形库 (`packages/vue3-antd/src/data/shapeLibrary.ts`)**:
  - 完整解析 5 大分类、共 93 个矢量图形数据（基础图形 22 个、流程图 28 个、Smart 4 个、UML 30 个、ER 图 9 个）。
  - 内置 `vector-effect="non-scaling-stroke"` 保证在任意缩放拉伸下边框线条粗细均匀高清。
  - 提供 `getShapeIconSvg()` (选择器 22x22 网格渲染) 和 `renderShapeCanvasSvg()` (画布图元动态矢量重绘)。
- **1:1 语雀白板图形选择器 Popover (`ShapePickerPopover.vue`)**:
  - 顶部锚点 Tab 导航：常驻 `基础图形` | `流程图` | `Smart`；更多下拉菜单 `···` 显示 `Smart`、`UML`、`ER`。
  - 下划线黑色活动指示器，支持点击平滑滚动（`behavior: 'smooth'`），滚动锁定机制与内容区 Scroll Spy 监听双向精准同步联动。
  - 6 列图形网格布局，悬浮显示 Tooltip 描述，点击直接在视口中心生成。
- **图形 4 桩点 Ports 与延伸自动补线交互 (1:1 语雀白板)**:
  - 选中图形图元时，四周精准外浮 4 个淡蓝微圆点（`#badaf9`，外浮 14px）。
  - 鼠标悬浮桩点时平滑过渡为对应方向的延伸箭头（`↑`、`→`、`↓`、`←`）。
  - 点击桩点即呼出 `QuickShapeConnectPopover.vue`（包含「最近使用」LRU 缓存与 6 列常用图形候选）。
  - 点击任意候选图形，自动在延伸方向计算坐标并创建下一个节点，且自动通过 X6 曼哈顿正交折线（`router: manhattan`, `radius: 8`）连接目标端口并带经典箭头。
- **图形内部就地打字**:
  - `speed-shape-node` 默认多居中对齐，继承支持双击直接在选框内透明打字（复用 `inlineEditorStyle` 与 `startInlineTextEdit`）。
- **右侧样式面板完全打通**:
  - 选中图形节点时展示 3 大 Tab：`样式` | `文本` | `排列`。
  - `样式` 选项卡顶部实时渲染当前图元的 SVG 缩略图；填充颜色支持 5 阶梯度选择；边框颜色、粗细、线型（实线/虚线/点线）和不透明度滑块均与图形 SVG 即时双向联动。

---

## 五、当前代码变更状态

> **重要约束**: 所有代码均仅保留在本地工作区，**未执行任何 git commit 或 git push**。

**涉及修改与新增的文件清单**:
1. `packages/vue3-antd/src/data/shapeLibrary.ts` (新文件): 全量 93 个矢量图形数据源与渲染引擎（输出受控 `<g>` 容器，由节点自身 svg 视口做像素级约束）。
2. `packages/vue3-antd/src/components/ShapePickerPopover.vue` (新文件): 1:1 语雀白板顶部 Tab 锚点导航图形选择器。
3. `packages/vue3-antd/src/components/QuickShapeConnectPopover.vue` (新文件): 4 桩点延伸快捷候选与补线浮层。
4. `packages/core/src/Board.ts`:
   - 注册 `speed-shape-node`（嵌套 `<svg selector="shapeBody" viewBox="0 0 32 32">` 严格隔离视口，避免内嵌 svg 溢出到全画布；4 个连接桩 Ports 设为可见吸附）。
   - 实现 `addLine` 独立连线生成（箭头连线、直线、正交折线、曲线）。
   - 监听 `edge:selected` / `edge:unselected`，激活 1:1 语雀白板连线端点拉伸白圆圈手柄与折点控制手柄。
   - 配置 `connecting.allowBlank: true`，支持直接从图元桩点拉出连线到空白处或其他图元桩点。
   - 扩充 `connectNodes`（曼哈顿正交折线 + 圆角 + 箭头）。
   - 扩充 `addVectorShape`、`updateShapeNode`、`isShapeNode`、`getShapeNodeData`。
   - 扩充 `updateSelectedStyle`、`updateSelectedTextStyle` 支持图形节点。
5. `packages/vue3-antd/src/components/LeftToolbar.vue`: 
   - 挂载 `ShapePickerPopover` 并适配 `getShapeTightViewBox` 紧凑尺寸。
   - 连线工具重构为 3 类经典连线（折线、直线、曲线），点击切换交互式两点拖拽模式。
6. `packages/vue3-antd/src/components/StyleSettingsPanel.vue`: 适配 `样式` / `文本` / `排列` 3 Tab 结构与图形预览联动。
7. `packages/vue3-antd/src/components/SpeedBoard.vue`: 
   - 采用 DOM `getBoundingClientRect()` + 原生全局 Capture 滚动监听计算桩点，彻底消除缩放与平移滚动下的错位漂移。
   - 锚点点击立即在对应方向延伸生成深色黑色连线（`#374151`，带箭头），取消浮层后连线依然保留。
   - 新增两点拖拽绘制连线（折线/直线/曲线实时引线预览与智能图元端点吸附）。
8. `packages/vue3-antd/src/index.ts`: 导出 `ShapePickerPopover`、`QuickShapeConnectPopover`、`shapeLibrary`。

### 6. 最近一次针对用户反馈的专项修复与调优
1. **锚点定位漂移彻底根治**:
   - 弃用容易受 X6 Scroller 滚动容器内部偏移影响的 `localToClient`，改用底层渲染节点 DOM 的 `view.container.getBoundingClientRect()` 结合 `canvasWrapperRef`。
   - 支持图元任意角度旋转时的三角函数旋转锚点换算（`rotatePoint`），无论平移、滚动、缩放还是旋转均像素级吸附。
   - 全局捕获包括滚动条滚轮在内的所有原生滚动事件（`window.addEventListener('scroll', onTick, true)`），实时同步零延迟。
2. **图形 0 内边距紧贴选框**:
   - 新增 `getShapeTightViewBox()` 紧凑视口计算机制，将原本 32x32 工具栏图标留白全部裁切为图元实际几何包围盒。
   - 图形节点边框 100% 紧贴 Transform 变换蓝框，彻底消除 25% 的多余内边距。
3. **选框边线清爽无圆圈，保留鼠标悬停拖拽改宽高**:
   - 将底层的 ports 圆点默认设为 `visibility: 'hidden'`，不在宽高边线上渲染突兀的小圆圈。
   - Transform 选框的四条边线保留纯粹的隐形热区，鼠标悬停时分别显示 `ns-resize` 和 `ew-resize`，可直接拖拽调整宽高。
4. **锚点点击立即生成并保留深色黑色连线**:
   - 点击桩点延伸手柄时，立即在画布上建立一条深灰/黑色曼哈顿折线箭头（`stroke: '#374151', strokeWidth: 2`）。
   - 随后弹出快捷图形选择器；若用户选择新图形，连线目标端点自动无缝对接到新图形；若用户点击空白取消选择，生成的深色黑色连线永久保留在画布上。
5. **三类连线工具交互式两点拖拽建线**:
   - 左侧胶囊栏连线菜单精简规范为 3 类：**折线**、**直线**、**曲线**。
   - 点击菜单不再直接在画布正中盲目生成，而是切换到交互绘图模式；用户在画布上按住并拖拽两点时，显示实时的虚线与箭头引线预览；松开鼠标后正式创建连线并自动吸附两端图元。
6. **图元默认无背景色与无彩色边框（透明背景 + 经典深灰黑线条）**:
   - 全量图形库、基础图元及快捷延伸图元的默认样式统一设为：`fill: 'transparent'`（无背景填充）、`stroke: '#374151'`（经典深黑灰边框）、`strokeWidth: 2`，彻底告别此前的淡青/淡蓝预设色彩。
7. **确认并保留 X6 原生连线工具**:
   - 连线选中时展现的端点箭头拉伸手柄（`arrowhead`）、折点小圆点（`vertices`）及线段中间平移胶囊（`segments`）均为 AntV X6 原生内置的高性能 Edge Tools，交互成熟完备，满足直接拖拽与折线调节点位需求。



