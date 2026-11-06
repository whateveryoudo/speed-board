# 组件 Props 与 Emits

本篇详细列出 `<SpeedBoard />` 与 `<SpeedMindmap />` 组件支持的 Props 属性及 Emits 事件。

---

## `<SpeedBoard />` 属性规范

用于自由全功能白板容器。

| 属性名 | 类型 | 默认值 | 必填 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `title` | `string` | `'测试画板1'` | 否 | 顶部导航栏展示的白板标题 |
| `data` | `PlaitElement[]` | `[]` | 否 | 白板初始化全量图元数据列表 |
| `uploadConfig` | `UploadConfig` | `undefined` | 否 | 图片与文件上传解析配置 |
| `options` | `Omit<BoardOptions, 'container'>` | `{}` | 否 | 底层 Plait 引擎视口配置项（缩放限制、只读等） |
| `iconProvider` | `any` | `undefined` | 否 | 扩展图标库数据提供者 |

### UploadConfig 接口定义

```ts
export interface UploadConfig {
  /**
   * 上传单张图片
   */
  uploadImage?: (file: File) => Promise<{ url: string; id?: string }>;
  
  /**
   * 兼容传统通用表单单文件上传
   */
  fileUploadSingle?: (formData: FormData) => Promise<any>;

  /**
   * 将文件 ID 解析为可访问的预览 URL
   */
  getPreviewUrl?: (fileId: string) => string;
}
```

---

## `<SpeedMindmap />` 属性规范

用于专属思维导图文档容器。

| 属性名 | 类型 | 默认值 | 必填 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `title` | `string` | `'新建思维导图'` | 否 | 顶部导航栏展示的导图标题 |
| `data` | `SpeedMindElement` | `undefined` | 否 | 思维导图根节点数据对象；若不传，则默认自动生成“中心主题” |
| `options` | `Omit<BoardOptions, 'container'>` | `{}` | 否 | 底层 Plait 引擎视口配置项 |

---

## 组件通用 Emits 事件

`<SpeedBoard />` 与 `<SpeedMindmap />` 对外派发一致的核心生命周期与业务事件：

| 事件名 | 回调参数 | 触发时机 |
| :--- | :--- | :--- |
| `@created` | `(board: Board) => void` | 画布容器完成 DOM 挂载、Plait 插件链就绪后触发，返回统一门面实例 |
| `@save` | `() => void` | 用户点击顶部工具栏的“保存”按钮，或在画布中按下快捷键 `⌘ + S` / `Ctrl + S` 时触发 |
| `@change` | `(elements: any[]) => void` | 画布图元发生变动（新增、修改、删除、移动等）时触发 |
