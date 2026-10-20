import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const OUTPUT_DIR = path.resolve(__dirname, '../extracted-icons/mindmap-markers')

const ICONS = [
  // 优先级 (7个)
  { category: 'priority', id: 'insert-icon-priority-0', name: 'priority-1', label: '优先级 1', url: 'https://gw.alipayobjects.com/zos/bmw-prod/bf9b8e4b-b1d4-45b1-bafc-f22c905b7b4e.svg' },
  { category: 'priority', id: 'insert-icon-priority-1', name: 'priority-2', label: '优先级 2', url: 'https://gw.alipayobjects.com/zos/bmw-prod/bbb05404-6149-4cd6-b234-e330d412ceff.svg' },
  { category: 'priority', id: 'insert-icon-priority-2', name: 'priority-3', label: '优先级 3', url: 'https://gw.alipayobjects.com/zos/bmw-prod/1ef71652-d5a3-48b7-9e57-de90c7aa835b.svg' },
  { category: 'priority', id: 'insert-icon-priority-3', name: 'priority-4', label: '优先级 4', url: 'https://gw.alipayobjects.com/zos/bmw-prod/4119993f-c9b6-4c2d-8a65-907840a47202.svg' },
  { category: 'priority', id: 'insert-icon-priority-4', name: 'priority-5', label: '优先级 5', url: 'https://gw.alipayobjects.com/zos/bmw-prod/61ae2c45-7c6d-40fe-a772-873e34aecc6f.svg' },
  { category: 'priority', id: 'insert-icon-priority-5', name: 'priority-6', label: '优先级 6', url: 'https://gw.alipayobjects.com/zos/bmw-prod/f9e31950-3daa-457b-a429-6da0c6f8fee0.svg' },
  { category: 'priority', id: 'insert-icon-priority-6', name: 'priority-7', label: '优先级 7', url: 'https://gw.alipayobjects.com/zos/bmw-prod/cf26510b-6d9a-43dc-9bba-67839b11c05b.svg' },

  // 进度 (7个)
  { category: 'progress', id: 'insert-icon-progress-0', name: 'progress-0', label: '进度 0%', url: 'https://gw.alipayobjects.com/zos/bmw-prod/8b4c2bef-649d-40ac-b43b-f33fd456284d.svg' },
  { category: 'progress', id: 'insert-icon-progress-1', name: 'progress-1', label: '进度 1/6', url: 'https://gw.alipayobjects.com/zos/bmw-prod/3a513a92-a334-4469-98ae-3c5825d8864e.svg' },
  { category: 'progress', id: 'insert-icon-progress-2', name: 'progress-2', label: '进度 2/6', url: 'https://gw.alipayobjects.com/zos/bmw-prod/bd0e81dc-34e8-4b6f-9221-9d33371f53b9.svg' },
  { category: 'progress', id: 'insert-icon-progress-3', name: 'progress-3', label: '进度 3/6', url: 'https://gw.alipayobjects.com/zos/bmw-prod/aad5a7c4-8f72-47c0-805b-6b0d239a51d5.svg' },
  { category: 'progress', id: 'insert-icon-progress-4', name: 'progress-4', label: '进度 4/6', url: 'https://gw.alipayobjects.com/zos/bmw-prod/5489b9dd-20bc-464a-a064-2593db39d1df.svg' },
  { category: 'progress', id: 'insert-icon-progress-5', name: 'progress-5', label: '进度 5/6', url: 'https://gw.alipayobjects.com/zos/bmw-prod/8d2d4df2-f1f0-48c6-875d-c694d01fcfad.svg' },
  { category: 'progress', id: 'insert-icon-progress-6', name: 'progress-6', label: '进度 6/6 (100%)', url: 'https://gw.alipayobjects.com/zos/bmw-prod/d07956ae-58ad-479a-b59d-310646dd5f37.svg' },

  // 旗帜 (7个)
  { category: 'flag', id: 'insert-icon-flag-0', name: 'flag-1-red', label: '红旗', url: 'https://gw.alipayobjects.com/zos/bmw-prod/01e45248-e9d6-4ac1-9018-f64b82050155.svg' },
  { category: 'flag', id: 'insert-icon-flag-1', name: 'flag-2-orange', label: '橙旗', url: 'https://gw.alipayobjects.com/zos/bmw-prod/ddb1da7b-5481-4d40-a9f0-d6aea06c0011.svg' },
  { category: 'flag', id: 'insert-icon-flag-2', name: 'flag-3-yellow', label: '黄旗', url: 'https://gw.alipayobjects.com/zos/bmw-prod/566d145a-bffa-4b19-b9fd-14315c9d2fd3.svg' },
  { category: 'flag', id: 'insert-icon-flag-3', name: 'flag-4-green', label: '绿旗', url: 'https://gw.alipayobjects.com/zos/bmw-prod/ba0e8dee-7014-4213-84d0-6aee48c37248.svg' },
  { category: 'flag', id: 'insert-icon-flag-4', name: 'flag-5-cyan', label: '青旗', url: 'https://gw.alipayobjects.com/zos/bmw-prod/d3e16f31-34bd-4269-9ef7-d04005303024.svg' },
  { category: 'flag', id: 'insert-icon-flag-5', name: 'flag-6-blue', label: '蓝旗', url: 'https://gw.alipayobjects.com/zos/bmw-prod/ca82f31a-a2d9-4751-a8d0-d4f87771b913.svg' },
  { category: 'flag', id: 'insert-icon-flag-6', name: 'flag-7-purple', label: '紫旗', url: 'https://gw.alipayobjects.com/zos/bmw-prod/1a24ad93-ccd5-4fe5-a42e-f8777b933e47.svg' },
]

async function extractAll() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  console.log(`[Mindmap Markers Extractor] 目标目录: ${OUTPUT_DIR}\n正在下载 ${ICONS.length} 个图标...`)

  const manifest = []

  for (const item of ICONS) {
    try {
      const res = await fetch(item.url)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      let svgText = await res.text()

      // 关键优化：语雀原始 SVG 中带有一个用于微内阴影的 `<use fill="black" ... filter="url(#filter-4)">`
      // 该滤镜在 macOS Finder 缩略图以及 iconfont.cn 的解析器中不支持 feComposite arithmetic，
      // 会导致缩略图回退渲染为一片「纯黑圆形遮罩」，遮盖底下的渐变色。
      // 清理该黑色滤镜层后，即可在 Finder 缩略图、浏览器和 iconfont 中完美呈现鲜艳的红/橙/黄/绿/蓝多色渐变！
      svgText = svgText
        .replace(/<filter[\s\S]*?<\/filter>/g, '')
        .replace(/<use\s+fill="black"[\s\S]*?<\/use>/g, '')

      // 提取内部真实 title
      const titleMatch = svgText.match(/<title>([^<]+)<\/title>/)
      const rawTitle = titleMatch ? titleMatch[1].trim() : item.label

      // 文件命名：支持两种，一种以规范命名的 name.svg，方便拖拽上传与识别
      const filename = `${item.name}.svg`
      const filePath = path.join(OUTPUT_DIR, filename)
      fs.writeFileSync(filePath, svgText, 'utf-8')

      // 也保存一份以原 id 命名的，防止代码按 id 索引
      const idFilePath = path.join(OUTPUT_DIR, `${item.id}.svg`)
      fs.writeFileSync(idFilePath, svgText, 'utf-8')

      manifest.push({
        id: item.id,
        name: item.name,
        category: item.category,
        label: item.label,
        rawTitle,
        filename,
        url: item.url,
      })
      console.log(`  ✓ 已下载: ${item.name} (${item.label}) -> ${filename}`)
    } catch (e) {
      console.error(`  ✗ 下载失败: ${item.name} (${item.url})`, e)
    }
  }

  // 写入 manifest.json
  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json')
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')

  // 写入 README.md
  const readmeContent = `# 思维导图标记图标 (Mindmap Markers)

本目录由 \`scripts/extract-mindmap-markers.mjs\` 提取自语雀思维导图标记组件 (\`.lake-diagram-mindmap-icons-table\`)。
共 **${manifest.length}** 个原生矢量 SVG 图标：
- **优先级 (Priority 1~7)**: 7 个彩色数字胶囊图标
- **进度 (Progress 0~6)**: 7 个饼图进度图标
- **旗帜 (Flag 1~7)**: 7 色标记旗帜图标

## 文件列表与说明
详见 \`manifest.json\`。

## 批量上传至 iconfont 指南：
1. 打开 [iconfont.cn](https://www.iconfont.cn/) 进入您的项目；
2. 点击「上传图标至项目」；
3. 将本目录下以 \`priority-*.svg\`、\`progress-*.svg\`、\`flag-*.svg\` 开头的文件批量拖入；
4. 勾选 **「保留颜色」**（因为这批是多色状态标记图标，不要选单色去色）；
5. 上传完成后点击「更新代码」获取最新 JS。
`
  fs.writeFileSync(path.join(OUTPUT_DIR, 'README.md'), readmeContent, 'utf-8')

  console.log(`\n🎉 全部提取完成！共保存 ${manifest.length} 个图标到 ${OUTPUT_DIR}`)
}

extractAll()
