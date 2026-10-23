# X6 In-Canvas 原生文本就地编辑与 Attr 渲染生命周期深度解析

> **适用场景**：基于 AntV X6 构建白板、思维导图、富文本便签时，采用 In-Canvas 原生 `foreignObject` + `contenteditable` 架构，并在打字输入过程中动态调整节点尺寸（`node.setSize`）。

---

## 1. 架构背景与设计诉求

在现代图形白板（如语雀白板、Miro、Figma）中，文本编辑主要有两种实现路径：

| 方案 | 原理 | 优缺点 |
| :--- | :--- | :--- |
| **外部 Overlay 弹窗** | 在 Canvas 外层绝对定位一个浮动 `textarea` / `div` 遮罩层盖在节点上方 | ❌ 缩放/平移视口极易出现 1 像素偏差和抖动<br>❌ 无法与 SVG 内部排版（居中、弹性伸缩）100% 对齐 |
| **In-Canvas 原生编辑** (本架构所采用) | 直接在节点内部的 `<foreignObject>` 中挂载 `<div contenteditable="true">` | ✅ **0 像素抖动**，绝对自然无缝<br>✅ 支持视口缩放下的完美硬件加速矩阵变换 |

### 核心交互诉求
在用户就地输入文本时，节点尺寸需**随着打字实时伸缩（自适应单行/多行扩展）**。因此在 `onInput` 事件中，必须实时调用：
```ts
node.setSize(calcWidth, calcHeight)
```

---

## 2. 核心痛点与深度根因剖析（踩坑复盘）

### 2.1 故障现象
在接入 `node.setSize()` 实时同步节点宽高后，出现了极难修复的一系列恶性 Bug：
- 输入单个字母即失焦，光标跳至末尾或消失；
- 键入中文拼音（IME）时，首个字母落入后拼音候选窗口瞬间崩溃被掐断；
- 换行与回删异常，文字偶尔被覆盖还原。

### 2.2 早期弯路（应用层 DOM 补丁的局限）
起初尝试在应用层进行修复：
1. 试图通过 `window.getSelection()` 在 `setSize` 前后手动保存/恢复 `Range` 选区；
2. 试图通过 `beforeinput`、`compositionstart` 拦截浏览器事件；
3. 试图利用 `requestAnimationFrame` 异步恢复焦点。

**为什么上述手段全部宣告失败？**
因为根本问题出在 **X6 内部渲染管道的破坏性生命周期** 上，而非浏览器的事件机制。

### 2.3 X6 源码底层根因（三层“暴击”）

跟踪 `/speed-platform/X6` 源码中的执行链路：
```text
node.setSize(width, height)
  └── NodeView.resize()
        └── this.update()
              └── this.updateAttrs(container, attrs)
```
当 `updateAttrs()` 运行时，对节点的 `<div class="speed-node-text">` 产生了连续三次致命覆写：

#### ① 第一击：`html` 属性的盲目全量重建 (`X6/src/registry/attr/html.ts`)
```ts
export const html: AttrDefinition = {
  set(html, { elem }) {
    elem.innerHTML = `${html}` // 🔴 极度暴力：不管内容是否改变，每次都连根拔起并销毁当前 DOM 树！
  },
}
```
`elem.innerHTML` 的无条件重写使得底层的文本节点（Text Node）全部被销毁重建。之前保存的 `Range.startContainer` 所引用的真实 DOM 节点直接变成了游离态（Detached Node），导致光标与正在组装中的 IME 中文拼音缓冲区被彻底打碎！

#### ② 第二击：未注册属性回退为普通 DOM Attribute
在节点默认定义中，包含 `contenteditable: 'false'`：
```ts
textWrap: {
  contenteditable: 'false',
  html: '文本',
}
```
因为 `contenteditable` 不是 X6 内置已注册的特殊 Attr，X6 在 `processAttrs` 时将其分类为 `normal` 属性，并在 `NodeView.updateAttrs()` 中调用 `Dom.attr(elem, { contenteditable: 'false' })`。
**结果：打字时刚刚被设置为 `true` 的编辑态，被 X6 硬生生重置回了 `'false'`！**

#### ③ 第三击：`style` 属性覆盖激活态样式 (`X6/src/registry/attr/style.ts`)
默认节点为了画布拖拽体验，在 `textWrap.style` 中配置了 `userSelect: 'none'`。
每次 `setSize` 触发 `updateAttrs`，`style.set` 都会再次把 `userSelect = 'none'` 盖上去，导致浏览器强制拒绝在其中进行文本选取与焦点维持。

---

## 3. 架构解决方案：X6 官方属性扩展与生命周期守卫

针对上述底层生命周期的特点，最佳解法并非修改 X6 源码，而是**使用 X6 官方开放的一等公民机制：`Graph.registerAttr(..., true)` 进行无侵入式能力增强**。

我们在 `packages/core/src/nodes/registerAttrs.ts` 中注册了全局属性守卫：

### 3.1 核心防护逻辑实现

```ts
import { Graph, Dom } from '@antv/x6'

export function registerCustomAttrs(): void {
  // 1. 增强 html 属性处理器：引入【活动编辑态保护】与【内容脏检查】
  Graph.registerAttr(
    'html',
    {
      set(val, { elem }) {
        // 关键守卫：如果元素正在就地输入打字（data-editing / isContentEditable），禁止重写 innerHTML！
        if (
          elem.getAttribute('data-editing') === 'true' ||
          elem.getAttribute('contenteditable') === 'true' ||
          (elem instanceof HTMLElement && elem.isContentEditable)
        ) {
          return
        }
        const str = val == null ? '' : `${val}`
        // 脏检查：内容一致时不触发 DOM 重设
        if (elem.innerHTML !== str) {
          elem.innerHTML = str
        }
      },
    },
    true // force = true 强制覆盖内置处理器
  )

  // 2. 增强 contenteditable 属性处理器：防止 X6 尺寸更新时将编辑态倒退为 false
  Graph.registerAttr(
    'contenteditable',
    {
      set(val, { elem }) {
        if (
          elem.getAttribute('data-editing') === 'true' ||
          (elem instanceof HTMLElement && elem.isContentEditable)
        ) {
          return // 编辑中严禁重设
        }
        if (val != null) {
          elem.setAttribute('contenteditable', `${val}`)
        } else {
          elem.removeAttribute('contenteditable')
        }
      },
    },
    true
  )

  // 3. 增强 style 属性处理器：编辑状态下强制保持文本可选光标
  Graph.registerAttr(
    'style',
    {
      qualify(val: any) {
        return typeof val === 'object' && val !== null
      },
      set(styles: any, { elem }) {
        if (
          elem.getAttribute('data-editing') === 'true' ||
          (elem instanceof HTMLElement && elem.isContentEditable)
        ) {
          const merged = {
            ...(styles as Record<string, any>),
            userSelect: 'text',
            cursor: 'text',
          }
          Dom.css(elem, merged)
          return
        }
        Dom.css(elem, styles as Record<string, string | number>)
      },
    },
    true
  )
}
```

### 3.2 契约与生命周期协同
在 `textOps.ts` 与 `mindmapCommands.ts` 的编辑流程中，建立标准的生命周期状态标记：

```text
[双击节点 / 触发编辑]
    │
    ▼
textEl.setAttribute('data-editing', 'true')
textEl.setAttribute('contenteditable', 'true')
    │
    ├─► [用户打字 input 事件]
    │       │
    │       ▼
    │   node.setSize(calcW, calcH) ──► 触发 NodeView.update()
    │                                       │
    │                                       ├─► SVG width/height 重新计算更新 (生效)
    │                                       └─► html/contenteditable 处理器拦截 (跳过，保护 DOM)
    │
    ▼
[回车 / 失焦 commitEdit]
    │
    ▼
textEl.removeAttribute('data-editing')
textEl.setAttribute('contenteditable', 'false')
node.updateTextNode(newText) ──► 此时 isContentEditable 为 false，正常同步最终纯文本并触发协同广播
```

---

## 4. X6 框架设计的局限性与官方演进建议

本次踩坑直戳了目前 X6 渲染架构上的两处设计软肋，已沉淀并向 AntV 官方提交 Feature/Enhancement 建议：

### 4.1 缺少基础的 DOM 脏检查（Dirty Check）
- **问题**：`registry/attr/html.ts` 和 `registry/attr/text.ts` 缺少 `elem.innerHTML !== nextHtml` 判定，造成大量不必要的 DOM 垃圾回收、样式重排与子节点状态丢失。
- **演进建议**：官方内置 `html` 处理器中应默认增加脏检查与 `isContentEditable` 校验。

### 4.2 纯几何变更（`setSize`）绑架了全量内容更新（`updateAttrs`）
- **问题**：节点改变尺寸（`resize`）本质上是**几何布局变化（Geometry Change）**，只需要重新计算相对比例属性（`refWidth`、`refHeight`、`refBBox`）。但目前的 `NodeView.resize()` 粗暴调用了全局无差别的 `this.update()`，连带把非几何的内容属性（`html`、`text`、`fill`、`stroke`）全部跑了一遍。
- **演进建议**：
  1. `NodeView` 内部细粒度拆分 `updateGeometryAttrs()` 与 `updateContentAttrs()`；
  2. `node.setSize()` 提供参数选项支持：
     ```ts
     node.setSize(w, h, { ignoreAttrs: ['html', 'text'] })
     ```

---

## 5. 项目落地文件清单

| 文件路径 | 职责说明 |
| :--- | :--- |
| [registerAttrs.ts](file:///Volumes/ykxDrive/gitee/speed-platform/speed-board/packages/core/src/nodes/registerAttrs.ts) | 集中注册覆盖全局 X6 的增强型 `html`、`contenteditable`、`style` 属性守卫 |
| [nodes/index.ts](file:///Volumes/ykxDrive/gitee/speed-platform/speed-board/packages/core/src/nodes/index.ts) | 在全局节点注册入口统一调用 `registerCustomAttrs()` |
| [operations/textOps.ts](file:///Volumes/ykxDrive/gitee/speed-platform/speed-board/packages/core/src/operations/textOps.ts) | 文本/图形节点 In-Canvas 编辑，在 `onInput` 中平滑调用 `node.setSize()` 自适应宽高 |
| [mindmapCommands.ts](file:///Volumes/ykxDrive/gitee/speed-platform/speed-board/packages/extensions/extension-mindmap/src/commands/mindmapCommands.ts) | 思维导图节点编辑，结合 `calculateMindmapNodeWidth` 实时动态重绘分支尺寸 |
