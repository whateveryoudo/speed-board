<template>
  <div class="iconfont-panel">
    <div class="iconfont-header">
      <div class="iconfont-brand">
        <svg viewBox="0 0 1024 1024" width="20" height="20" class="iconfont-logo">
          <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z" fill="#00c1de"/>
          <circle cx="512" cy="512" r="220" fill="#00c1de"/>
        </svg>
        <span class="iconfont-title">Iconfont<sup>&reg;</sup></span>
      </div>
      <span class="iconfont-badge">矢量素材库</span>
    </div>

    <!-- 搜索框 -->
    <div class="iconfont-search">
      <input
        v-model="searchKeyword"
        type="text"
        placeholder="搜索图标素材 (如 用户、云、服务器)..."
        class="search-input"
        @input="onSearchInput"
      />
    </div>

    <!-- 分类标签 -->
    <div class="iconfont-categories">
      <button
        v-for="cat in DEFAULT_ICON_CATEGORIES"
        :key="cat.key"
        class="category-btn"
        :class="{ active: currentCategory === cat.key }"
        @click="changeCategory(cat.key)"
      >
        {{ cat.label }}
      </button>
    </div>

    <!-- 图标网格 -->
    <div class="iconfont-grid">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner" />
        <span>正在加载素材...</span>
      </div>

      <template v-else>
        <div
          v-for="icon in icons"
          :key="icon.id"
          class="icon-grid-item"
          :title="icon.name"
          @click="onSelect(icon)"
        >
          <div class="icon-svg-wrapper">
            <!-- 优先展示本地内嵌 SVG，否则展示 url -->
            <div v-if="icon.svg" v-html="icon.svg" />
            <img v-else-if="icon.url" :src="icon.url" :alt="icon.name" class="icon-remote-img" />
          </div>
          <span class="icon-label">{{ icon.name }}</span>
        </div>

        <div v-if="icons.length === 0" class="empty-state">
          未找到相关图标素材
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import {
  defaultIconProvider,
  DEFAULT_ICON_CATEGORIES,
  type BoardIconItem,
  type IconProvider,
} from '../data/defaultIcons'

const props = withDefaults(
  defineProps<{
    provider?: IconProvider
  }>(),
  {
    provider: () => defaultIconProvider,
  }
)

const emit = defineEmits<{
  (e: 'select', icon: BoardIconItem): void
}>()

const searchKeyword = ref('')
const currentCategory = ref('all')
const loading = ref(false)
const icons = ref<BoardIconItem[]>([])

let searchTimer: ReturnType<typeof setTimeout> | null = null

const fetchIcons = async () => {
  loading.value = true
  try {
    const res = await props.provider.search({
      query: searchKeyword.value.trim(),
      category: currentCategory.value,
      page: 1,
      pageSize: 60,
    })
    icons.value = res.icons || []
  } catch (err) {
    console.error('Failed to fetch icons from provider', err)
    icons.value = []
  } finally {
    loading.value = false
  }
}

const onSearchInput = () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    fetchIcons()
  }, 300)
}

const changeCategory = (key: string) => {
  currentCategory.value = key
  fetchIcons()
}

const onSelect = async (icon: BoardIconItem) => {
  // 如果 icon 只有 url 没有 svg，异步 fetch 获取其 SVG 结构
  if (!icon.svg && icon.url) {
    try {
      const res = await fetch(icon.url)
      const svgText = await res.text()
      emit('select', { ...icon, svg: svgText })
      return
    } catch (e) {
      console.warn('Failed to fetch icon SVG, fallback to img tag', e)
      emit('select', {
        ...icon,
        svg: `<img src="${icon.url}" width="48" height="48" style="pointer-events:none;"/>`,
      })
      return
    }
  }
  emit('select', icon)
}

watch(
  () => props.provider,
  () => {
    fetchIcons()
  }
)

onMounted(() => {
  fetchIcons()
})
</script>

<style scoped>
.iconfont-panel {
  width: 300px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
}

.iconfont-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 8px;
  border-bottom: 1px solid #f1f5f9;
}

.iconfont-brand {
  display: flex;
  align-items: center;
  gap: 6px;
}

.iconfont-title {
  font-weight: 600;
  font-size: 15px;
  color: #1e293b;
}

.iconfont-title sup {
  font-size: 10px;
  color: #94a3b8;
}

.iconfont-badge {
  font-size: 11px;
  background: #eff6ff;
  color: #3b82f6;
  padding: 2px 6px;
  border-radius: 4px;
}

.iconfont-search {
  padding: 10px 14px 6px;
}

.search-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: #3b82f6;
}

.iconfont-categories {
  display: flex;
  gap: 6px;
  padding: 4px 14px 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.iconfont-categories::-webkit-scrollbar {
  display: none;
}

.category-btn {
  border: none;
  background: #f1f5f9;
  color: #64748b;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.category-btn:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.category-btn.active {
  background: #3b82f6;
  color: #ffffff;
}

.iconfont-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 10px 14px 14px;
  max-height: 280px;
  min-height: 180px;
  overflow-y: auto;
}

.icon-grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.icon-grid-item:hover {
  background: #f8fafc;
  transform: translateY(-1px);
}

.icon-svg-wrapper {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-remote-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.icon-label {
  font-size: 11px;
  color: #64748b;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 56px;
  text-align: center;
}

.loading-state {
  grid-column: span 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: #94a3b8;
  font-size: 12px;
  gap: 8px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  grid-column: span 4;
  text-align: center;
  padding: 30px 0;
  color: #94a3b8;
  font-size: 12px;
}
</style>
