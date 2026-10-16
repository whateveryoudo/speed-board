<template>
  <div class="mindmap-setter-section">
    <div class="section-title">分支</div>

    <!-- 1. 分支颜色 -->
    <div class="setter-row">
      <span class="label">分支颜色</span>
      <a-popover v-model:open="colorPopoverOpen" trigger="click" placement="left">
        <template #content>
          <div class="color-palette">
            <div
              v-for="color in PRESET_COLORS"
              :key="color"
              class="color-dot"
              :style="{ backgroundColor: color }"
              @click="onBranchColorChange(color)"
            />
          </div>
        </template>
        <div class="branch-color-preview">
          <svg width="48" height="20" viewBox="0 0 48 20" fill="none">
            <path
              d="M 4 15 C 16 15 24 5 44 5"
              :stroke="branchColor"
              :stroke-width="branchWidth"
              stroke-linecap="round"
            />
          </svg>
        </div>
      </a-popover>
    </div>

    <!-- 2. 分支粗细 -->
    <div class="setter-row">
      <span class="label">分支粗细</span>
      <a-input-number
        :value="branchWidth"
        :min="1"
        :max="10"
        size="small"
        style="width: 80px"
        @change="onBranchWidthChange"
      />
    </div>

    <!-- 3. 分支类型 -->
    <div class="setter-row">
      <span class="label">分支类型</span>
      <div class="branch-type-group">
        <button
          class="type-btn"
          :class="{ 'is-active': branchType === 'curve' }"
          @click="onBranchTypeChange('curve')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 18c6 0 8-12 16-12" stroke-linecap="round" />
          </svg>
        </button>
        <button
          class="type-btn"
          :class="{ 'is-active': branchType === 'straight' }"
          @click="onBranchTypeChange('straight')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 12h16" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 4. 彩虹分支复选框 -->
    <div class="setter-row">
      <a-checkbox :checked="isRainbow" @change="onRainbowChange">
        彩虹分支
      </a-checkbox>
    </div>

    <!-- 5. 分支线条宽度逐渐变细 -->
    <div class="setter-row">
      <a-checkbox :checked="isTapered" @change="onTaperedChange">
        分支线条宽度逐渐变细
      </a-checkbox>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Popover as APopover,
  InputNumber as AInputNumber,
  Checkbox as ACheckbox,
} from 'ant-design-vue'
import type { Board } from '@speed-board/core'
import { PRESET_COLORS, type MindmapBranchType } from '@speed-board/shared'

const props = defineProps<{
  board: Board | null
}>()

const colorPopoverOpen = ref(false)

const selectedCell = computed(() => {
  return props.board?.graph.getSelectedCells()[0] || null
})

const branchConfig = computed(() => {
  const data = (selectedCell.value?.getData() || {}) as any
  return data.branch || {}
})

const branchColor = computed(() => {
  return branchConfig.value.color || '#8b5cf6'
})

const branchWidth = computed(() => {
  return branchConfig.value.width ?? 3
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

const onBranchColorChange = (color: string) => {
  colorPopoverOpen.value = false
  if (!selectedCell.value || !props.board) return
  ;(props.board as any).commands?.setMindmapBranchStyle?.(selectedCell.value.id, {
    color,
  })
}

const onBranchWidthChange = (val: any) => {
  if (!selectedCell.value || !props.board) return
  ;(props.board as any).commands?.setMindmapBranchStyle?.(selectedCell.value.id, {
    width: Number(val) || 3,
  })
}

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
    margin-bottom: 8px;

    .label {
      font-size: 12px;
      color: #6b7280;
    }

    .branch-color-preview {
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      padding: 2px 4px;
      cursor: pointer;
      background: #fafafa;
    }

    .branch-type-group {
      display: flex;
      gap: 6px;

      .type-btn {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #e5e7eb;
        background: #fff;
        border-radius: 6px;
        color: #4b5563;
        cursor: pointer;
        transition: all 0.2s;

        &.is-active {
          border-color: #3b82f6;
          background: #eff6ff;
          color: #3b82f6;
        }
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
