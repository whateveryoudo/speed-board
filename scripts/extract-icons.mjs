#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 默认语雀 lake-icon 阿里 iconfont 产物链接，支持命令行参数覆盖
const DEFAULT_URL =
  process.argv[2] ||
  'https://at.alicdn.com/t/a/font_943843_4hllx7w8s1k.js'

const ROOT_OUTPUT = path.resolve(__dirname, '../extracted-icons')
const ALL_DIR = path.join(ROOT_OUTPUT, 'all')
const BOARD_CORE_DIR = path.join(ROOT_OUTPUT, 'board-core')

// 画板核心图标中英对照映射
const CORE_BOARD_MAP = {
  'xiangpi': { name: 'board-eraser', label: '橡皮擦' },
  'makebi': { name: 'board-marker-pen', label: '马克笔/荧光笔' },
  'qianbiicon': { name: 'board-pencil', label: '铅笔' },
  'huabiicon': { name: 'board-brush', label: '画笔' },
  'xuanze': { name: 'board-select-cursor', label: '选择指针' },
  'xuanzequyu': { name: 'board-select-area', label: '框选区域' },
  'hand': { name: 'board-hand-pan', label: '抓手拖拽' },
  'mind': { name: 'board-mindmap', label: '思维导图' },
  'shape': { name: 'board-shape-rect', label: '基础矩形' },
  'shape1': { name: 'board-shape-circle', label: '基础圆形' },
  'shape2': { name: 'board-shape-diamond', label: '基础菱形' },
  'shape3': { name: 'board-shape-round-rect', label: '圆角矩形' },
  'shape4': { name: 'board-shape-triangle', label: '三角形' },
  'line': { name: 'board-line-straight', label: '直线' },
  'line-s1': { name: 'board-line-arrow', label: '箭头连线' },
  'line-s2': { name: 'board-line-elbow', label: '折线连线' },
  'curve1': { name: 'board-line-curve', label: '曲线连线' },
  'edit-pen': { name: 'board-text-edit', label: '文本编辑' },
  'bihetuxing': { name: 'board-closed-shape', label: '闭合图形' },
  'shilianghuitu': { name: 'board-vector-drawing', label: '矢量绘图' },
  'gangbixinzengjiedian': { name: 'board-pen-add-node', label: '钢笔新增节点' },
  'yidongjiedian': { name: 'board-move-node', label: '移动节点' },
}

async function run() {
  console.log(`[Icon Extractor] 正在从以下地址下载图标库:\n  ${DEFAULT_URL}\n`)

  const response = await fetch(DEFAULT_URL)
  if (!response.ok) {
    throw new Error(`下载失败: HTTP ${response.status} ${response.statusText}`)
  }

  const scriptText = await response.text()

  // 确保输出目录存在
  fs.mkdirSync(ALL_DIR, { recursive: true })
  fs.mkdirSync(BOARD_CORE_DIR, { recursive: true })

  // 正则解析出所有 <symbol id="..." viewBox="...">...</symbol>
  const symbolRegex =
    /<symbol id="([^"]+)" viewBox="([^"]+)">([\s\S]*?)<\/symbol>/g
  let match
  let totalCount = 0
  let coreCount = 0
  const manifest = []

  while ((match = symbolRegex.exec(scriptText)) !== null) {
    const rawId = match[1] // 例如 icon-xiangpi
    const viewBox = match[2]
    const innerContent = match[3]

    // 清理前缀
    const cleanKey = rawId.replace(/^icon-/, '')

    // 构建符合 iconfont.cn 严格上传规范的标准独立 SVG XML：
    // 1. 必须使用实体纯色 (如 fill="#333333")，绝对不能用 currentColor（否则 iconfont 的 canvas 离屏预检会当作空白图判定上传失败）
    // 2. 补齐 width="1024" height="1024" 与标准 XML 声明
    let cleanedInner = innerContent
      .replace(/\sclass="[^"]*"/g, '')
      .trim()

    // 如果 path 没有 fill，或者 fill 是空/currentColor，统一补上 fill="#333333"
    if (!/fill="/.test(cleanedInner)) {
      cleanedInner = cleanedInner.replace(/<path\s/g, '<path fill="#333333" ')
    } else {
      cleanedInner = cleanedInner.replace(/fill="currentColor"/g, 'fill="#333333"')
    }

    const svgOutput = `<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg class="icon" viewBox="${viewBox}" version="1.1" xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  ${cleanedInner}
</svg>
`

    // 1. 存入 all/
    const allFilePath = path.join(ALL_DIR, `${cleanKey}.svg`)
    fs.writeFileSync(allFilePath, svgOutput, 'utf-8')
    totalCount++

    // 2. 如果属于画板精选集，存入 board-core/
    if (CORE_BOARD_MAP[cleanKey]) {
      const coreInfo = CORE_BOARD_MAP[cleanKey]
      const coreFilePath = path.join(BOARD_CORE_DIR, `${coreInfo.name}.svg`)
      fs.writeFileSync(coreFilePath, svgOutput, 'utf-8')
      coreCount++
      manifest.push({
        key: cleanKey,
        name: coreInfo.name,
        label: coreInfo.label,
        path: `board-core/${coreInfo.name}.svg`,
      })
    }
  }

  // 生成使用说明 README.md
  const readmeContent = `# 画板图标提取产物 (Iconfont 导入指南)

本目录由 \`scripts/extract-icons.mjs\` 自动生成，提取自：
\`${DEFAULT_URL}\`

## 目录结构
- **\`board-core/\`** (${coreCount} 个): 画板最核心工具图标（橡皮擦、马克笔、铅笔、画笔、指针、形状、连线等），已去色并规范命名，**推荐直接全选此目录拖拽上传**。
- **\`all/\`** (${totalCount} 个): 该字体库中的全量原始图标。

## 批量上传至个人/团队 iconfont 项目步骤：
1. 登录 [iconfont.cn](https://www.iconfont.cn/)，进入你的项目（如 \`we-knowledge-base\`）。
2. 点击顶部 **「上传图标至项目」**。
3. 打开本地 \`board-core/\` 目录，全选所有 \`.svg\` 文件拖入上传区。
4. 弹窗中选择 **「去色」** 后点击提交。
5. 在项目主页点击 **「更新代码」** 获取最新的 \`.js\` 链接。
`

  fs.writeFileSync(path.join(ROOT_OUTPUT, 'README.md'), readmeContent, 'utf-8')
  fs.writeFileSync(
    path.join(ROOT_OUTPUT, 'core-manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  )

  console.log(`✅ 提取完成！`)
  console.log(`- 全量图标: ${totalCount} 个 -> ${ALL_DIR}`)
  console.log(`- 画板精选: ${coreCount} 个 -> ${BOARD_CORE_DIR}`)
  console.log(`- 说明文档: ${path.join(ROOT_OUTPUT, 'README.md')}\n`)
}

run().catch((err) => {
  console.error('[Icon Extractor Error]:', err)
  process.exit(1)
})
