<template>
  <div class="shape-picker-container" @click.stop>
    <!-- 1. 顶部锚点 Tab 导航 (1:1 语雀白板：基础图形 / 流程图 / Smart / ··· 更多) -->
    <div class="shape-picker-header">
      <div class="tab-list">
        <button
          v-for="tab in visibleTabs"
          :key="tab.key"
          class="tab-btn"
          :class="{ 'is-active': activeGroupKey === tab.key }"
          @click="scrollToGroup(tab.key)"
        >
          <span>{{ tab.title }}</span>
        </button>

        <!-- 更多下拉菜单 (···) 包含 Smart / UML / ER 图 -->
        <a-dropdown :trigger="['hover', 'click']" placement="bottomRight">
          <button
            class="tab-btn more-btn"
            :class="{ 'is-active': isMoreTabActive }"
          >
            <span>···</span>
          </button>
          <template #overlay>
            <a-menu class="shape-picker-more-menu" @click="onMoreMenuClick">
              <a-menu-item
                v-for="moreTab in moreTabs"
                :key="moreTab.key"
                :class="{ 'is-active': activeGroupKey === moreTab.key }"
              >
                {{ moreTab.title }}
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
    </div>

    <!-- 2. 内容平滑滚动区 (包含 5 大分组与 6 列栅格网格) -->
    <div
      ref="scrollContainerRef"
      class="shape-picker-body"
      @scroll="onContainerScroll"
    >
      <div
        v-for="group in SHAPE_GROUPS"
        :id="`shape-group-${group.key}`"
        :key="group.key"
        :ref="(el) => setGroupRef(group.key, el)"
        class="shape-group-section"
      >
        <!-- 分组标头 (如: 基础图形、流程图、Smart、UML、ER 图) -->
        <div class="shape-group-header">
          <span class="group-title">{{ group.title }}</span>
        </div>

        <!-- 6 列图形栅格 -->
        <div class="shape-grid">
          <a-tooltip
            v-for="shape in group.shapes"
            :key="shape.id"
            :title="shape.name"
            placement="top"
            :mouse-enter-delay="0.25"
            :arrow="false"
          >
            <button
              class="shape-item-btn"
              :class="{ 'is-active': props.activeShapeId === shape.id }"
              @click="onSelectShape(shape)"
            >
              <div
                class="shape-svg-wrapper"
                v-html="getShapeIconSvg(shape)"
              />
            </button>
          </a-tooltip>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Dropdown as ADropdown,
  Menu as AMenu,
  MenuItem as AMenuItem,
  Tooltip as ATooltip,
} from 'ant-design-vue'
import {
  SHAPE_GROUPS,
  getShapeIconSvg,
  type ShapeDefinition,
} from '../data/shapeLibrary'

const props = defineProps<{
  activeShapeId?: string
}>()

const emit = defineEmits<{
  (e: 'select', shape: ShapeDefinition): void
}>()

// 顶部常驻 Tab: 基础图形 | 流程图 | Smart (1:1 语雀白板)
const visibleTabs = [
  { key: 'basic', title: '基础图形' },
  { key: 'flowchart', title: '流程图' },
  { key: 'DSL', title: 'Smart' },
]

// 更多下拉 Tab: UML | ER 图 (1:1 语雀白板下拉菜单两项)
const moreTabs = [
  { key: 'UML', title: 'UML' },
  { key: 'ER', title: 'ER 图' },
]

// 当前高亮的分组 key
const activeGroupKey = ref<string>('basic')

// 判断当前是否处于“更多”子项中 (UML / ER)
const isMoreTabActive = computed(() => {
  return activeGroupKey.value === 'UML' || activeGroupKey.value === 'ER'
})

const scrollContainerRef = ref<HTMLElement | null>(null)
const groupElements = new Map<string, HTMLElement>()

const setGroupRef = (key: string, el: any) => {
  if (el) {
    groupElements.set(key, el as HTMLElement)
  } else {
    groupElements.delete(key)
  }
}

// 滚动锁：点击 Tab 平滑滚动期间，避免被 onScroll 频繁覆写
let isManualScrolling = false
let manualScrollTimer: any = null

// 点击 Tab 锚点定位平滑滚动
const scrollToGroup = (groupKey: string) => {
  activeGroupKey.value = groupKey
  const container = scrollContainerRef.value
  const targetEl = groupElements.get(groupKey)
  if (!container || !targetEl) return

  isManualScrolling = true
  clearTimeout(manualScrollTimer)

  const containerRect = container.getBoundingClientRect()
  const targetRect = targetEl.getBoundingClientRect()
  const offsetTop = targetRect.top - containerRect.top + container.scrollTop - 6

  container.scrollTo({
    top: Math.max(0, offsetTop),
    behavior: 'smooth',
  })

  manualScrollTimer = setTimeout(() => {
    isManualScrolling = false
  }, 450)
}

// 点击更多下拉菜单项
const onMoreMenuClick = ({ key }: any) => {
  scrollToGroup(String(key))
}

// 滚动监听联动（Scroll Spy）
const onContainerScroll = () => {
  if (isManualScrolling) return
  const container = scrollContainerRef.value
  if (!container) return

  const containerTop = container.getBoundingClientRect().top

  let currentKey = SHAPE_GROUPS[0].key

  for (const group of SHAPE_GROUPS) {
    const el = groupElements.get(group.key)
    if (!el) continue
    const elRect = el.getBoundingClientRect()
    const relTop = elRect.top - containerTop
    if (relTop <= 45) {
      currentKey = group.key
    }
  }

  activeGroupKey.value = currentKey
}

// 选择图元
const onSelectShape = (shape: ShapeDefinition) => {
  emit('select', shape)
}
</script>

<style lang="less">
.shape-picker-popover-overlay {
  .ant-popover-inner {
    padding: 0 !important;
    border-radius: 8px !important;
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08) !important;
    border: 1px solid #f0f0f0;
  }
}

.shape-picker-container {
  width: 256px;
  height: 420px;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  user-select: none;

  // 1. 顶部 Tab 栏 (1:1 语雀白板黑线高亮)
  .shape-picker-header {
    height: 44px;
    padding: 0 12px;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    align-items: center;
    background-color: #ffffff;
    flex-shrink: 0;

    .tab-list {
      display: flex;
      align-items: center;
      width: 100%;
      justify-content: space-between;

      .tab-btn {
        background: transparent;
        border: none;
        outline: none;
        padding: 10px 4px 8px 4px;
        font-size: 14px;
        color: #595959;
        cursor: pointer;
        transition: all 0.15s ease;
        position: relative;
        font-weight: 400;

        &:hover {
          color: #262626;
        }

        &.is-active {
          color: #262626;
          font-weight: 500;

          &::after {
            content: '';
            position: absolute;
            bottom: -1px;
            left: 0;
            right: 0;
            height: 2px;
            background-color: #262626;
            border-radius: 1px;
          }
        }

        &.more-btn {
          font-weight: bold;
          font-size: 14px;
          letter-spacing: 1px;
          padding-left: 6px;
          padding-right: 6px;
        }
      }
    }
  }

  // 2. 内容平滑滚动区
  .shape-picker-body {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    scroll-behavior: smooth;

    &::-webkit-scrollbar {
      width: 4px;
    }
    &::-webkit-scrollbar-thumb {
      background-color: #d1d5db;
      border-radius: 2px;
    }
    &::-webkit-scrollbar-thumb:hover {
      background-color: #9ca3af;
    }

    .shape-group-section {
      margin-bottom: 16px;

      &:last-child {
        margin-bottom: 8px;
      }

      .shape-group-header {
        display: flex;
        align-items: center;
        margin-bottom: 8px;

        .group-title {
          font-size: 13px;
          font-weight: 500;
          color: #262626;
        }
      }

      // 6 列图形栅格
      .shape-grid {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 2px;

        .shape-item-btn {
          width: 30px;
          height: 30px;
          border: 1px solid transparent;
          background: transparent;
          border-radius: 4px;
          padding: 0;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #595959;
          transition: all 0.15s ease;

          &:hover {
            background-color: #f5f5f5;
            color: #262626;
            transform: scale(1.05);
          }

          &:active {
            transform: scale(0.96);
          }

          &.is-active {
            background-color: var(--speed-board-primary-bg, #eff6ff);
            border-color: var(--speed-board-primary, #3b82f6);
            color: var(--speed-board-primary, #3b82f6);
          }

          .shape-svg-wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;

            svg {
              width: 30px;
              height: 30px;
            }
          }
        }
      }
    }
  }
}

.shape-picker-more-menu {
  min-width: 96px;
  border-radius: 6px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12) !important;
  z-index: 1060 !important;

  .ant-dropdown-menu-item,
  .ant-menu-item {
    font-size: 13px;
    padding: 6px 14px;
    color: #262626;
    cursor: pointer;

    &:hover {
      background-color: #f5f5f5;
    }

    &.is-active,
    &.ant-menu-item-selected {
      font-weight: 500;
      color: #1677ff;
      background-color: #e6f4ff;
    }
  }
}
</style>
