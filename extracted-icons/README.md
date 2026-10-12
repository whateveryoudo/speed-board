# 画板图标提取产物 (Iconfont 导入指南)

本目录由 `scripts/extract-icons.mjs` 自动生成，提取自：
`https://at.alicdn.com/t/a/font_943843_4hllx7w8s1k.js`

## 目录结构
- **`board-core/`** (22 个): 画板最核心工具图标（橡皮擦、马克笔、铅笔、画笔、指针、形状、连线等），已去色并规范命名，**推荐直接全选此目录拖拽上传**。
- **`all/`** (395 个): 该字体库中的全量原始图标。

## 批量上传至个人/团队 iconfont 项目步骤：
1. 登录 [iconfont.cn](https://www.iconfont.cn/)，进入你的项目（如 `we-knowledge-base`）。
2. 点击顶部 **「上传图标至项目」**。
3. 打开本地 `board-core/` 目录，全选所有 `.svg` 文件拖入上传区。
4. 弹窗中选择 **「去色」** 后点击提交。
5. 在项目主页点击 **「更新代码」** 获取最新的 `.js` 链接。
