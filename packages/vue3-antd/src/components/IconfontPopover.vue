<template>
  <div class="iconfont-panel">
    <!-- 顶部标题栏：Iconify 品牌与帮助提示 -->
    <div class="iconfont-header">
      <div class="iconfont-brand">
        <!-- Iconify 官方品牌 Logo 矢量 -->
        <svg class="iconfont-logo" viewBox="0 0 24 24" width="20" height="20" fill="none">
          <path
            fill="#1769AA"
            d="M2.857 19.429V9.642q.35-.089.67-.295l1.616-1.045v9.984h4.571v2.285H4c-.63 0-1.143-.512-1.143-1.142m7.429-8.572a1.715 1.715 0 1 1 3.43.001a1.715 1.715 0 0 1-3.43 0m-5.143-8V1.143a1.143 1.143 0 0 1 2.286 0v.235zm9.143 15.429h4.571V8.302l1.616 1.045q.32.206.67.295v9.787c0 .63-.512 1.143-1.143 1.143h-5.714Zm-.004-17.028l8.053 5.211a1.144 1.144 0 0 1-1.242 1.919l-8.041-5.203l.19-.123a2.28 2.28 0 0 0 1.04-1.804M11.38.183a1.144 1.144 0 0 1 1.242 1.92L2.907 8.387a1.144 1.144 0 0 1-1.242-1.919Zm2.6 22.103H22c.473 0 .857.384.857.857A.86.86 0 0 1 22 24H2a.86.86 0 0 1-.857-.857c0-.473.384-.857.857-.857h8.02a2.286 2.286 0 0 0 3.96 0m-.836-8.81v7.667a1.143 1.143 0 0 1-2.286 0v-7.667a2.85 2.85 0 0 0 1.143.238c.406 0 .793-.085 1.143-.238"
          />
        </svg>
        <span class="iconfont-title">Iconify</span>
      </div>
      <a-tooltip title="内置 Iconify 海量开源矢量素材库，批量聚合渲染，支持中英文即时搜索" placement="top">
        <QuestionCircleOutlined class="iconfont-help-icon" />
      </a-tooltip>
    </div>

    <!-- 搜索框：支持中文与英文模糊匹配，加大尺寸与间距 -->
    <div class="iconfont-search">
      <a-input
        v-model:value="searchKeyword"
        placeholder="搜索图标 (如: arrow, 箭头, 用户, 数据库)..."
        allow-clear
        size="middle"
        @input="onSearchInput"
        @press-enter="triggerSearch"
      >
        <template #prefix>
          <SearchOutlined class="search-prefix-icon" />
        </template>
      </a-input>
    </div>

    <!-- 6 列紧凑矢量图标网格 (内联原生 SVG，绝不产生并发 429 与跨域错误) -->
    <div class="iconfont-grid">
      <div v-if="loading && icons.length === 0" class="loading-state">
        <a-spin size="small" />
        <span class="loading-text">正在检索矢量图标...</span>
      </div>

      <template v-else>
        <div
          v-for="icon in icons"
          :key="icon.id"
          class="icon-grid-item"
          :title="icon.name"
          @pointerdown="(e: PointerEvent) => onIconPointerDown(e, icon)"
          @click="onSelect(icon)"
        >
          <svg
            :viewBox="`0 0 ${icon.width} ${icon.height}`"
            class="icon-svg"
            v-html="icon.body"
          />
        </div>

        <div v-if="!loading && icons.length === 0" class="empty-state">
          <a-empty :image="emptySimpleImage" description="未找到相关图标素材" />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  Input as AInput,
  Spin as ASpin,
  Empty as AEmpty,
  Tooltip as ATooltip,
} from 'ant-design-vue'
import {
  SearchOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons-vue'
import type { BoardIconItem, IconProvider } from '../data/defaultIcons'

const emptySimpleImage = AEmpty.PRESENTED_IMAGE_SIMPLE

const props = defineProps<{
  provider?: IconProvider
}>()

const emit = defineEmits<{
  (e: 'select', icon: BoardIconItem): void
}>()

export interface LoadedIconItem {
  id: string
  name: string
  body: string
  width: number
  height: number
}

// 默认直接搜索 arrow，1:1 对齐语雀默认呈现丰富方向与界面箭头素材
const searchKeyword = ref('arrow')
const loading = ref(false)
const icons = ref<LoadedIconItem[]>([])

// 全局内存缓存
const searchCache = new Map<string, LoadedIconItem[]>()
const prefixDataCache = new Map<string, any>()

let debounceTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 常用中文关键词映射词典 (白板架构设计与流程图核心高频词汇)
 */
const ZH_EN_MAP: Record<string, string> = {
  箭头: 'arrow',
  向上: 'arrow-up',
  向下: 'arrow-down',
  向左: 'arrow-left',
  向右: 'arrow-right',
  返回: 'arrow-left',
  前进: 'arrow-right',
  双向: 'arrows',
  交换: 'swap',
  循环: 'repeat',
  刷新: 'refresh',
  同步: 'sync',
  撤回: 'undo',
  重做: 'redo',
  用户: 'user',
  人员: 'user',
  人物: 'user',
  客户: 'user',
  头像: 'avatar',
  管理员: 'admin',
  群组: 'group',
  团队: 'users',
  成员: 'user-group',
  角色: 'account',
  云: 'cloud',
  云端: 'cloud',
  服务器: 'server',
  主机: 'server',
  集群: 'server',
  数据库: 'database',
  数据: 'database',
  存储: 'storage',
  硬盘: 'hard-drive',
  网络: 'network',
  网关: 'gateway',
  防火墙: 'firewall',
  路由器: 'router',
  交换机: 'switch',
  终端: 'terminal',
  代码: 'code',
  编程: 'code',
  接口: 'api',
  配置: 'settings',
  设置: 'settings',
  齿轮: 'settings',
  系统: 'system',
  监控: 'monitor',
  告警: 'alert',
  电脑: 'computer',
  显示器: 'monitor',
  笔记本: 'laptop',
  手机: 'phone',
  移动: 'mobile',
  文件: 'file',
  文档: 'document',
  文件夹: 'folder',
  表格: 'table',
  邮件: 'mail',
  信封: 'mail',
  消息: 'message',
  聊天: 'chat',
  通知: 'bell',
  日程: 'calendar',
  时间: 'clock',
  成功: 'check-circle',
  完成: 'check',
  对勾: 'check',
  失败: 'close-circle',
  错误: 'error',
  关闭: 'close',
  警告: 'warning',
  帮助: 'help-circle',
  安全: 'shield-check',
  锁: 'lock',
  钥匙: 'key',
  密码: 'password',
  加: 'plus',
  减: 'minus',
  删除: 'trash',
  垃圾桶: 'trash',
  编辑: 'edit',
  搜索: 'search',
  分享: 'share',
  下载: 'download',
  上传: 'upload',
  钱: 'money',
  钱包: 'wallet',
  购物车: 'shopping-cart',
  图表: 'chart',
  图片: 'image',
  视频: 'video',
  主页: 'home',
  首页: 'home',
  地图: 'map',
  定位: 'pin',
  星星: 'star',
  收藏: 'star',
  爱心: 'heart',
  火: 'fire',
  ai: 'robot',
  机器人: 'robot',
}

/**
 * 本地保底高频图标 (在断网或极限网络状况下保证白板 100% 可用)
 */
const FALLBACK_ICONS: LoadedIconItem[] = [
  {
    id: 'mdi:arrow-up',
    name: 'arrow-up',
    body: '<path fill="currentColor" d="M13 20h-2V8l-5.5 5.5l-1.42-1.42L12 4.16l7.92 7.92l-1.42 1.42L13 8z"/>',
    width: 24,
    height: 24,
  },
  {
    id: 'mdi:arrow-down',
    name: 'arrow-down',
    body: '<path fill="currentColor" d="M11 4h2v12l5.5-5.5l1.42 1.42L12 19.84l-7.92-7.92L5.5 10.5L11 16z"/>',
    width: 24,
    height: 24,
  },
  {
    id: 'mdi:arrow-left',
    name: 'arrow-left',
    body: '<path fill="currentColor" d="M20 11v2H8l5.5 5.5l-1.42 1.42L4.16 12l7.92-7.92L13.5 5.5L8 11z"/>',
    width: 24,
    height: 24,
  },
  {
    id: 'mdi:arrow-right',
    name: 'arrow-right',
    body: '<path fill="currentColor" d="M4 11v2h12l-5.5 5.5l1.42 1.42L19.84 12l-7.92-7.92L10.5 5.5L16 11z"/>',
    width: 24,
    height: 24,
  },
  {
    id: 'mdi:arrow-all',
    name: 'arrow-all',
    body: '<path fill="currentColor" d="M13 2v4h-2V2h2m0 16v4h-2v-4h2m9-7v2h-4v-2h4M2 11h4v2H2v-2m10.5-6.5l3.5 3.5h-2v3h-3v-3h-2l3.5-3.5m0 17l-3.5-3.5h2v-3h3v3h2l-3.5 3.5m-6.5-6.5h-3v-2l-3.5 3.5 3.5 3.5v-2h3v-3m10 0h3v-2l3.5 3.5-3.5 3.5v-2h-3v-3z"/>',
    width: 24,
    height: 24,
  },
  {
    id: 'mdi:refresh',
    name: 'refresh',
    body: '<path fill="currentColor" d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>',
    width: 24,
    height: 24,
  },
  {
    id: 'mdi:account',
    name: 'user',
    body: '<path fill="currentColor" d="M12 4a4 4 0 0 1 4 4a4 4 0 0 1-4 4a4 4 0 0 1-4-4a4 4 0 0 1 4-4m0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4z"/>',
    width: 24,
    height: 24,
  },
  {
    id: 'mdi:cloud',
    name: 'cloud',
    body: '<path fill="currentColor" d="M19.35 10.04C18.67 6.59 15.64 4 12 4C9.11 4 6.6 5.64 5.35 8.04C2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5c0-2.64-2.05-4.78-4.65-4.96z"/>',
    width: 24,
    height: 24,
  },
  {
    id: 'mdi:database',
    name: 'database',
    body: '<path fill="currentColor" d="M12 3C7.58 3 4 4.79 4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7c0-2.21-3.58-4-8-4m0 2c3.87 0 6 1.5 6 2s-2.13 2-6 2s-6-1.5-6-2s2.13-2 6-2m0 5c3.87 0 6 1.5 6 2s-2.13 2-6 2s-6-1.5-6-2s2.13-2 6-2m0 5c3.87 0 6 1.5 6 2s-2.13 2-6 2s-6-1.5-6-2s2.13-2 6-2z"/>',
    width: 24,
    height: 24,
  },
  {
    id: 'mdi:server',
    name: 'server',
    body: '<path fill="currentColor" d="M4 1h16a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1m0 8h16a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1m0 8h16a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1M9 5h2V3H9v2m0 8h2v-2H9v2m0 8h2v-2H9v2M5 5h2V3H5v2m0 8h2v-2H5v2m0 8h2v-2H5v2z"/>',
    width: 24,
    height: 24,
  },
]

const resolveSearchQuery = (input: string): string => {
  const trimmed = input.trim()
  if (!trimmed) return 'arrow'

  if (ZH_EN_MAP[trimmed]) {
    return ZH_EN_MAP[trimmed]
  }

  for (const [zh, en] of Object.entries(ZH_EN_MAP)) {
    if (trimmed.includes(zh)) {
      return en
    }
  }

  return trimmed
}

/**
 * 核心：通过 CDN 批量 JSON 接口聚合拉取，绝不调用单体 .svg 接口产生 429
 */
const fetchIcons = async () => {
  const query = resolveSearchQuery(searchKeyword.value)

  if (searchCache.has(query)) {
    icons.value = searchCache.get(query)!
    return
  }

  loading.value = true
  try {
    // 聚焦最主流的开源图标体系 (MDI, Tabler, UIL, Solar, Remix)，总量超 2.5万+
    const prefixes = 'mdi,tabler,uil,solar,ri'
    const searchUrl = `https://api.iconify.design/search?query=${encodeURIComponent(query)}&prefixes=${prefixes}&limit=60`

    const searchRes = await fetch(searchUrl)
    if (!searchRes.ok) {
      throw new Error(`Search failed: HTTP ${searchRes.status}`)
    }
    const searchData = await searchRes.json()
    const foundIcons: string[] = Array.isArray(searchData.icons) ? searchData.icons : []

    if (foundIcons.length === 0) {
      icons.value = []
      searchCache.set(query, [])
      return
    }

    // 按 prefix 分组，实现 3-5 次 CDN-cached 批量请求，而不是 100 次单独请求！
    const prefixGroups = new Map<string, string[]>()
    for (const fullId of foundIcons) {
      const [prefix, name] = fullId.split(':')
      if (prefix && name) {
        if (!prefixGroups.has(prefix)) prefixGroups.set(prefix, [])
        prefixGroups.get(prefix)!.push(name)
      }
    }

    const loadedList: LoadedIconItem[] = []

    await Promise.all(
      Array.from(prefixGroups.entries()).map(async ([prefix, names]) => {
        try {
          let data = prefixDataCache.get(`${prefix}:${names.join(',')}`)
          if (!data) {
            const jsonUrl = `https://api.iconify.design/${prefix}.json?icons=${names.join(',')}`
            const res = await fetch(jsonUrl)
            if (res.ok) {
              data = await res.json()
              prefixDataCache.set(`${prefix}:${names.join(',')}`, data)
            }
          }

          if (data) {
            for (const name of names) {
              let item = data.icons?.[name]
              if (!item && data.aliases?.[name]) {
                const parent = data.aliases[name].parent
                item = data.icons?.[parent]
              }
              if (item && item.body) {
                loadedList.push({
                  id: `${prefix}:${name}`,
                  name,
                  body: item.body,
                  width: item.width || data.width || 24,
                  height: item.height || data.height || 24,
                })
              }
            }
          }
        } catch (prefixErr) {
          console.warn(`Failed to batch load icons for prefix ${prefix}`, prefixErr)
        }
      })
    )

    if (loadedList.length > 0) {
      icons.value = loadedList
      searchCache.set(query, loadedList)
    } else {
      // 保底
      icons.value = FALLBACK_ICONS
    }
  } catch (err) {
    console.warn('Network error fetching icons from Iconify, using fallback icons:', err)
    icons.value = FALLBACK_ICONS
  } finally {
    loading.value = false
  }
}

const onSearchInput = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    fetchIcons()
  }, 300)
}

const triggerSearch = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  fetchIcons()
}

/**
 * 点击图标：SVG 结构早已就绪，零网络延迟立即放置！
 */
let justDraggedIcon = false

const onIconPointerDown = (e: PointerEvent, icon: LoadedIconItem) => {
  if (e.button !== 0) return
  const startX = e.clientX
  const startY = e.clientY
  let dragging = false

  const onPointerMove = (ev: PointerEvent) => {
    if (!dragging && Math.hypot(ev.clientX - startX, ev.clientY - startY) > 4) {
      dragging = true
      justDraggedIcon = true
      onSelect(icon)
    }
  }

  const onPointerUp = () => {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    if (dragging) {
      setTimeout(() => {
        justDraggedIcon = false
      }, 50)
    }
  }

  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

const onSelect = (icon: LoadedIconItem) => {
  if (justDraggedIcon) return
  const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${icon.width} ${icon.height}" width="100%" height="100%" style="width:100%;height:100%;display:block;color:#333333;fill:#333333;">${icon.body}</svg>`

  emit('select', {
    id: icon.id,
    name: icon.name,
    svg: fullSvg,
  })
}

onMounted(() => {
  fetchIcons()
})
</script>

<style scoped lang="less">
.iconfont-panel {
  width: 300px;
  background: var(--ant-color-bg-container, #ffffff);
  border-radius: var(--ant-border-radius-lg, 8px);
  box-shadow: var(--ant-box-shadow-secondary, 0 4px 20px rgba(0, 0, 0, 0.12));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
}

// 顶部栏：Iconify + ? 帮助说明
.iconfont-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 6px;
}

.iconfont-brand {
  display: flex;
  align-items: center;
  gap: 7px;

  .iconfont-logo {
    display: block;
    flex-shrink: 0;
  }
}

.iconfont-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--ant-color-text, rgba(0, 0, 0, 0.88));
  letter-spacing: -0.2px;
}

.iconfont-help-icon {
  font-size: 14px;
  color: var(--ant-color-text-quaternary, rgba(0, 0, 0, 0.3));
  cursor: pointer;
  transition: color var(--ant-motion-duration-mid, 0.2s);

  &:hover {
    color: var(--ant-color-text-secondary, rgba(0, 0, 0, 0.65));
  }
}

.iconfont-search {
  padding: 6px 14px 10px;

  .search-prefix-icon {
    color: var(--ant-color-text-tertiary, rgba(0, 0, 0, 0.45));
    font-size: 15px;
  }

  :deep(.ant-input-affix-wrapper) {
    height: 36px;
    padding: 4px 11px;
    font-size: 13px;
    border-radius: 6px;
    background: var(--ant-color-fill-quaternary, rgba(0, 0, 0, 0.02));
    border-color: var(--ant-color-border-secondary, #e5e7eb);

    &:hover,
    &:focus-within {
      border-color: var(--ant-color-primary, #1677ff);
      background: #ffffff;
      box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.08);
    }

    input.ant-input {
      font-size: 13px;
    }
  }
}

// 6 列紧凑图标网格：对齐语雀 1:1
.iconfont-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
  padding: 6px 12px 12px;
  max-height: 330px;
  min-height: 200px;
  overflow-y: auto;
  overflow-x: hidden;

  &::-webkit-scrollbar {
    width: 5px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.15);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
  }
}

.icon-grid-item {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  box-sizing: border-box;
  color: #333333;
  transition: all var(--ant-motion-duration-mid, 0.15s);

  &:hover {
    background: var(--ant-color-fill-secondary, rgba(0, 0, 0, 0.06));
    color: var(--ant-color-primary, #1677ff);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.94);
  }
}

.icon-svg {
  width: 22px;
  height: 22px;
  display: block;
  pointer-events: none;
}

.loading-state {
  grid-column: span 6;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  gap: 10px;

  .loading-text {
    color: var(--ant-color-text-tertiary, rgba(0, 0, 0, 0.45));
    font-size: 12px;
  }
}

.empty-state {
  grid-column: span 6;
  padding: 30px 0;
}
</style>
