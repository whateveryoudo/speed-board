<template>
  <div class="mindmap-setter-section">
    <div class="section-title">分支</div>

    <!-- 1. 分支类型 -->
    <div class="setter-row">
      <span class="label">分支类型</span>
      <div class="branch-types-row">
        <div
          class="branch-item-btn"
          :class="{ 'is-active': branchType === 'curve' }"
          title="圆角/曲线"
          @click="onBranchTypeChange('curve')"
        >
          <SIconFont type="icon-kl-fenzhi0" :size="20" />
          <span class="btn-label">曲线</span>
        </div>
        <div
          class="branch-item-btn"
          :class="{ 'is-active': branchType === 'straight' }"
          title="直角/折线"
          @click="onBranchTypeChange('straight')"
        >
          <SIconFont type="icon-kl-fenzhi1" :size="20" />
          <span class="btn-label">直角</span>
        </div>
      </div>
    </div>

    <!-- 2. 彩虹分支复选框 -->
    <div class="setter-row">
      <a-checkbox :checked="isRainbow" @change="onRainbowChange">
        彩虹分支
      </a-checkbox>
    </div>

    <!-- 3. 分支线条宽度逐渐变细 -->
    <div class="setter-row">
      <a-checkbox :checked="isTapered" @change="onTaperedChange">
        分支线条宽度逐渐变细
      </a-checkbox>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Checkbox as ACheckbox,
} from 'ant-design-vue'
import { IconFont as SIconFont } from 'speed-components-ui/components'
import type { Board } from '@speed-board/core'
import type { MindmapBranchType } from '@speed-board/shared'

const props = defineProps<{
  board: Board | null
}>()

const selectedCell = computed(() => {
  return props.board?.graph.getSelectedCells()[0] || null
})

const branchConfig = computed(() => {
  const data = (selectedCell.value?.getData() || {}) as any
  return data.branch || {}
})

const branchType = computed<MindmapBranchType>(() => {
  return branchConfig.value.type || 'curve'
})

const isRainbow = computed(() => {
  return branchConfig.value.isRainbow ?? true
})

const isTapered = computed(() => {
  return branchConfig.value.isTapered ?? false
})

const onBranchTypeChange = (type: MindmapBranchType) => {
  if (!selectedCell.value || !props.board) return
  ;(props.board as any).commands?.setMindmapBranchStyle?.(selectedCell.value.id, {
    type,
  })
}

const onRainbowChange = (e: any) => {
  if (!selectedCell.value || !props.board) return
  ;(props.board as any).commands?.setMindmapBranchStyle?.(selectedCell.value.id, {
    isRainbow: e.target.checked,
  })
}

const onTaperedChange = (e: any) => {
  if (!selectedCell.value || !props.board) return
  ;(props.board as any).commands?.setMindmapBranchStyle?.(selectedCell.value.id, {
    isTapered: e.target.checked,
  })
}
</script>

<style scoped lang="less">
.mindmap-setter-section {
  padding: 8px 0;

  .section-title {
    font-size: 13px;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 10px;
  }

  .setter-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;

    .label {
      font-size: 12px;
      color: #6b7280;
    }

    .branch-types-row {
      display: flex;
      gap: 8px;
      width: 140px;
    }

    .branch-item-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 6px 0;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
      background-color: #ffffff;
      cursor: pointer;
      color: #4b5563;
      transition: all 0.15s ease;

      .btn-label {
        font-size: 11px;
        margin-top: 4px;
      }

      &:hover {
        background-color: #f3f4f6;
        border-color: #d1d5db;
        color: #111827;
      }

      &.is-active {
        background-color: #eff6ff;
        border-color: #3b82f6;
        color: #2563eb;
      }
    }
  }
}

.color-palette {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  width: 130px;

  .color-dot {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid rgba(0, 0, 0, 0.1);
    &:hover {
      transform: scale(1.15);
    }
  }
}
</style>
