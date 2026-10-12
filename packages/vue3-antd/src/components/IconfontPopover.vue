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
        placeholder="搜索图标素材..."
        class="search-input"
      />
    </div>

    <!-- 分类标签 -->
    <div class="iconfont-categories">
      <button
        v-for="cat in DEFAULT_ICON_CATEGORIES"
        :key="cat.key"
        class="category-btn"
        :class="{ active: currentCategory === cat.key }"
        @click="currentCategory = cat.key"
      >
        {{ cat.label }}
      </button>
    </div>

    <!-- 图标网格 -->
    <div class="iconfont-grid">
      <div
        v-for="icon in filteredIcons"
        :key="icon.id"
        class="icon-grid-item"
        :title="icon.name"
        @click="onSelect(icon)"
      >
        <div class="icon-svg-wrapper" v-html="icon.svg" />
        <span class="icon-label">{{ icon.name }}</span>
      </div>
      <div v-if="filteredIcons.length === 0" class="empty-state">
        未找到相关图标
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  DEFAULT_BOARD_ICONS,
  DEFAULT_ICON_CATEGORIES,
  type BoardIconItem,
} from '../data/defaultIcons'

const emit = defineEmits<{
  (e: 'select', icon: BoardIconItem): void
}>()

const searchKeyword = ref('')
const currentCategory = ref('all')

const filteredIcons = computed(() => {
  return DEFAULT_BOARD_ICONS.filter((item) => {
    const matchCategory =
      currentCategory.value === 'all' || item.category === currentCategory.value
    const matchSearch =
      !searchKeyword.value ||
      item.name.toLowerCase().includes(searchKeyword.value.toLowerCase())
    return matchCategory && matchSearch
  })
})

const onSelect = (icon: BoardIconItem) => {
  emit('select', icon)
}
</script>

<style scoped>
.iconfont-panel {
  width: 290px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
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

.empty-state {
  grid-column: span 4;
  text-align: center;
  padding: 24px 0;
  color: #94a3b8;
  font-size: 12px;
}
</style>
