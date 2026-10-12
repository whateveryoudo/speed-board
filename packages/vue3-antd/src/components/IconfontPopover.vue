<template>
  <div class="iconfont-panel">
    <div class="iconfont-header">
      <div class="iconfont-brand">
        <AppstoreOutlined class="brand-icon" />
        <span class="iconfont-title">Iconfont 素材库</span>
      </div>
      <span class="iconfont-badge">矢量素材</span>
    </div>

    <!-- 搜索框：对齐 antd a-input 规范 -->
    <div class="iconfont-search">
      <a-input
        v-model:value="searchKeyword"
        placeholder="搜索图标素材 (如 用户、云、服务器)..."
        allow-clear
        size="small"
        @change="onSearchInput"
        @press-enter="fetchIcons"
      >
        <template #prefix>
          <SearchOutlined class="search-prefix-icon" />
        </template>
      </a-input>
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
        <a-spin size="small" />
        <span class="loading-text">正在加载素材...</span>
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
          <a-empty :image="emptySimpleImage" description="未找到相关图标素材" />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import {
  Input as AInput,
  Spin as ASpin,
  Empty as AEmpty,
} from 'ant-design-vue'
import {
  SearchOutlined,
  AppstoreOutlined,
} from '@ant-design/icons-vue'
import {
  defaultIconProvider,
  DEFAULT_ICON_CATEGORIES,
  type BoardIconItem,
  type IconProvider,
} from '../data/defaultIcons'

const emptySimpleImage = AEmpty.PRESENTED_IMAGE_SIMPLE

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

<style scoped lang="less">
.iconfont-panel {
  width: 320px;
  background: var(--ant-color-bg-container, #ffffff);
  border-radius: var(--ant-border-radius-lg, 8px);
  box-shadow: var(--ant-box-shadow-secondary, 0 4px 18px rgba(0, 0, 0, 0.12));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
}

.iconfont-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px 8px;
  border-bottom: 1px solid var(--ant-color-border-secondary, #f0f0f0);
}

.iconfont-brand {
  display: flex;
  align-items: center;
  gap: 8px;

  .brand-icon {
    font-size: 16px;
    color: var(--ant-color-primary, #1677ff);
  }
}

.iconfont-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--ant-color-text, rgba(0, 0, 0, 0.88));
}

.iconfont-badge {
  font-size: 11px;
  background: var(--ant-color-primary-bg, #e6f4ff);
  color: var(--ant-color-primary, #1677ff);
  padding: 2px 6px;
  border-radius: var(--ant-border-radius-sm, 4px);
}

.iconfont-search {
  padding: 8px 14px 4px;

  .search-prefix-icon {
    color: var(--ant-color-text-tertiary, rgba(0, 0, 0, 0.45));
  }
}

.iconfont-categories {
  display: flex;
  gap: 6px;
  padding: 4px 14px 8px;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.category-btn {
  border: none;
  background: var(--ant-color-fill-quaternary, rgba(0, 0, 0, 0.02));
  color: var(--ant-color-text-secondary, rgba(0, 0, 0, 0.65));
  padding: 3px 8px;
  border-radius: var(--ant-border-radius-sm, 4px);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--ant-motion-duration-mid, 0.2s);

  &:hover {
    background: var(--ant-color-fill-secondary, rgba(0, 0, 0, 0.06));
    color: var(--ant-color-text, rgba(0, 0, 0, 0.88));
  }

  &.active {
    background: var(--ant-color-primary, #1677ff);
    color: #ffffff;
  }
}

.iconfont-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 8px 14px 12px;
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
  border-radius: var(--ant-border-radius, 6px);
  cursor: pointer;
  transition: all var(--ant-motion-duration-mid, 0.15s);

  &:hover {
    background: var(--ant-color-fill-secondary, rgba(0, 0, 0, 0.06));
    transform: translateY(-1px);

    .icon-label {
      color: var(--ant-color-primary, #1677ff);
    }
  }
}

.icon-svg-wrapper {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ant-color-text, rgba(0, 0, 0, 0.88));
}

.icon-remote-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.icon-label {
  font-size: 11px;
  color: var(--ant-color-text-secondary, rgba(0, 0, 0, 0.65));
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60px;
  text-align: center;
  transition: color var(--ant-motion-duration-mid, 0.2s);
}

.loading-state {
  grid-column: span 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  gap: 8px;

  .loading-text {
    color: var(--ant-color-text-tertiary, rgba(0, 0, 0, 0.45));
    font-size: 12px;
  }
}

.empty-state {
  grid-column: span 4;
  padding: 20px 0;
}
</style>
