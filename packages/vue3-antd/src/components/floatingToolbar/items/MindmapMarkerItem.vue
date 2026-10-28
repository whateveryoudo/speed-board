<template>
  <a-popover
    v-model:open="isOpen"
    trigger="click"
    placement="top"
    :arrow="false"
    overlay-class-name="quick-bubble-popover plait-board-attached"
    :overlay-inner-style="{ padding: '10px 12px', borderRadius: '8px' }"
  >
    <template #content>
      <div class="mindmap-marker-popover">
        <!-- 1. 优先级 -->
        <div class="marker-group">
          <div class="group-title">优先级</div>
          <div class="markers-row">
            <div
              v-for="item in PRIORITY_MARKERS"
              :key="item.id"
              class="marker-item-btn"
              :class="{ 'is-active': currentMarkers.priority === item.value }"
              :title="item.label"
              @click="togglePriority(item.value)"
            >
              <svg class="marker-svg">
                <use :xlink:href="'#' + item.symbolId" :href="'#' + item.symbolId" />
              </svg>
            </div>
          </div>
        </div>

        <!-- 2. 进度 -->
        <div class="marker-group">
          <div class="group-title">进度</div>
          <div class="markers-row">
            <div
              v-for="item in PROGRESS_MARKERS"
              :key="item.id"
              class="marker-item-btn"
              :class="{ 'is-active': currentMarkers.progress === item.value }"
              :title="item.label"
              @click="toggleProgress(item.value)"
            >
              <svg class="marker-svg">
                <use :xlink:href="'#' + item.symbolId" :href="'#' + item.symbolId" />
              </svg>
            </div>
          </div>
        </div>

        <!-- 3. 旗帜 -->
        <div class="marker-group">
          <div class="group-title">旗帜</div>
          <div class="markers-row">
            <div
              v-for="item in FLAG_MARKERS"
              :key="item.id"
              class="marker-item-btn"
              :class="{ 'is-active': currentMarkers.flag === item.value }"
              :title="item.label"
              @click="toggleFlag(item.value)"
            >
              <svg class="marker-svg">
                <use :xlink:href="'#' + item.symbolId" :href="'#' + item.symbolId" />
              </svg>
            </div>
          </div>
        </div>

        <!-- 4. 清除操作 -->
        <div v-if="hasActiveMarkers" class="marker-clear-action" @click="clearAllMarkers">
          <span>清除所有标记</span>
        </div>
      </div>
    </template>

    <a-tooltip title="标记" placement="bottom" :open="isOpen ? false : undefined">
      <button class="bubble-toolbar-btn" :class="{ 'is-active': isOpen }">
        <SIconFont type="icon-kl-a-biaoshiicon" :size="18" />
      </button>
    </a-tooltip>
  </a-popover>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { Popover as APopover, Tooltip as ATooltip } from 'ant-design-vue'
import type { Board } from '@speed-board/core'
import { IconFont as SIconFont } from 'speed-components-ui/components'
import {
  PRIORITY_MARKERS,
  PROGRESS_MARKERS,
  FLAG_MARKERS,
  ensureMarkerSprite,
  type MindmapNodeData,
  type MindmapMarkers,
} from '@speed-board/shared'
import { updateMindmapLayout } from '@speed-board/extension-mindmap'
import { useToolbarPopover } from '../useToolbarPopover'

const props = defineProps<{
  board: Board | null
}>()

const { isOpen } = useToolbarPopover('mindmap-marker')

onMounted(() => {
  ensureMarkerSprite()
})

watch(isOpen, (open) => {
  if (open) {
    ensureMarkerSprite()
  }
})

const selectedCell = computed(() => {
  return (props.board?.selectedElements?.[0] || null) as any
})

const currentMarkers = computed<MindmapMarkers>(() => {
  if (!selectedCell.value || !selectedCell.value.isNode()) return {}
  const data = selectedCell.value.getData() as MindmapNodeData | undefined
  return data?.markers || {}
})

const hasActiveMarkers = computed(() => {
  const m = currentMarkers.value
  return typeof m.priority === 'number' || typeof m.progress === 'number' || !!m.flag
})

const firstActiveSymbol = computed<string | null>(() => {
  const m = currentMarkers.value
  if (typeof m.priority === 'number') {
    return `marker-priority-${m.priority}`
  }
  if (typeof m.progress === 'number') {
    return `marker-progress-${m.progress}`
  }
  if (m.flag) {
    const f = m.flag.startsWith('flag-') ? m.flag : `flag-${m.flag}`
    return `marker-${f}`
  }
  return null
})

const updateMarkers = (updater: (prev: MindmapMarkers) => MindmapMarkers) => {
  const cell = selectedCell.value
  if (!cell || !cell.isNode() || !props.board) return

  const currentData = (cell.getData() || {}) as MindmapNodeData
  const prev = currentData.markers || {}
  const next = updater({ ...prev })

  // 清除空属性
  const cleaned: MindmapMarkers = {}
  if (typeof next.priority === 'number') cleaned.priority = next.priority
  if (typeof next.progress === 'number') cleaned.progress = next.progress
  if (next.flag) cleaned.flag = next.flag

  cell.setData(
    {
      ...currentData,
      markers: Object.keys(cleaned).length > 0 ? cleaned : undefined,
    },
    { overwrite: true }
  )

  updateMindmapLayout(props.board, currentData.mindmapId || cell.id)
}

const togglePriority = (val: number) => {
  updateMarkers((prev) => {
    if (prev.priority === val) {
      delete prev.priority
    } else {
      prev.priority = val
    }
    return prev
  })
}

const toggleProgress = (val: number) => {
  updateMarkers((prev) => {
    if (prev.progress === val) {
      delete prev.progress
    } else {
      prev.progress = val
    }
    return prev
  })
}

const toggleFlag = (val: string) => {
  updateMarkers((prev) => {
    if (prev.flag === val) {
      delete prev.flag
    } else {
      prev.flag = val
    }
    return prev
  })
}

const clearAllMarkers = () => {
  updateMarkers(() => ({}))
}
</script>

<style scoped lang="less">
.mindmap-marker-popover {
  width: 220px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  .marker-group {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .group-title {
      font-size: 12px;
      font-weight: 500;
      color: #6b7280;
      padding-left: 2px;
    }

    .markers-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .marker-item-btn {
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      border: 1px solid transparent;
      background-color: transparent;
      cursor: pointer;
      transition: all 0.15s ease;

      .marker-svg {
        width: 20px;
        height: 20px;
        display: block;
        user-select: none;
      }

      &:hover {
        background-color: #f3f4f6;
        border-color: #e5e7eb;
      }

      &.is-active {
        background-color: #eff6ff;
        border-color: #3b82f6;
        box-shadow: 0 0 0 1px #3b82f6;
      }
    }
  }

  .marker-clear-action {
    margin-top: 4px;
    padding-top: 8px;
    text-align: center;
    font-size: 12px;
    color: #ef4444;
    cursor: pointer;
    border-radius: 4px;
    padding: 4px 0;
    transition: background-color 0.15s ease;

    &:hover {
      background-color: #fef2f2;
    }
  }
}
</style>
