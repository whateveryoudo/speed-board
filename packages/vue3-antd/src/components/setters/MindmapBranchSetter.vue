<template>
  <div class="mindmap-setter-section">
    <div class="section-title">分支</div>

    <!-- 1. 分支颜色 -->
    <div class="setter-row">
      <span class="label">分支颜色</span>
      <div class="color-control-wrapper">
        <a-popover v-model:open="colorOpen" trigger="click" placement="left">
          <template #content>
            <div class="color-palette">
              <div
                v-for="color in PRESET_COLORS"
                :key="color"
                class="color-dot"
                :style="{ backgroundColor: color }"
                @click="onColorSelect(color)"
              />
            </div>
          </template>
          <div
            class="color-preview-trigger"
            :style="{ backgroundColor: currentColor }"
            title="点击选择分支颜色"
          />
        </a-popover>
      </div>
    </div>

    <!-- 2. 分支粗细 -->
    <div class="setter-row">
      <span class="label">分支粗细</span>
      <div class="width-control-wrapper">
        <a-input-number
          :value="currentWidth"
          :min="1"
          :max="8"
          :step="1"
          size="small"
          class="branch-width-input"
          @change="onWidthChange"
        />
      </div>
    </div>

    <!-- 3. 分支类型 (平滑曲线 vs 直角折线) -->
    <div class="setter-row">
      <span class="label">分支类型</span>
      <div class="branch-types-row">
        <div
          class="branch-item-btn"
          :class="{ 'is-active': branchType === 'curve' }"
          title="圆角/曲线"
          @click="onBranchTypeChange('curve')"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 18c6 0 6-12 16-12" />
          </svg>
          <span class="btn-label">曲线</span>
        </div>
        <div
          class="branch-item-btn"
          :class="{ 'is-active': branchType === 'polyline' }"
          title="直角/折线"
          @click="onBranchTypeChange('polyline')"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 18h8V6h8" />
          </svg>
          <span class="btn-label">直角</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  InputNumber as AInputNumber,
  Popover as APopover,
} from 'ant-design-vue';
import type { Board } from '@speed-board/core';
import { PRESET_COLORS } from '@speed-board/shared';

const props = defineProps<{
  board: Board | null;
}>();

const colorOpen = ref(false);

const selectedMind = computed(() => {
  return (props.board?.selectedElements || []).find(
    (el: any) => el.type === 'mind' || el.isRoot
  ) as any;
});

const branchType = computed<'curve' | 'polyline'>(() => {
  return selectedMind.value?.branchShape === 'polyline' ? 'polyline' : 'curve';
});

const currentColor = computed(() => {
  return selectedMind.value?.branchColor || '#8b5cf6';
});

const currentWidth = computed(() => {
  return selectedMind.value?.branchWidth ?? 2;
});

const onBranchTypeChange = (type: 'curve' | 'polyline') => {
  if (!props.board) return;
  props.board.setMindmapBranchShape(type);
};

const onColorSelect = (color: string) => {
  if (!props.board) return;
  colorOpen.value = false;
  props.board.setMindmapBranchProperty({ branchColor: color });
};

const onWidthChange = (val: any) => {
  if (!props.board || val === null || val === undefined) return;
  props.board.setMindmapBranchProperty({ branchWidth: Number(val) });
};
</script>

<style scoped lang="less">
.mindmap-setter-section {
  padding: 8px 0;

  .section-title {
    font-size: 13px;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 12px;
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

    .color-control-wrapper,
    .width-control-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .branch-width-input {
      width: 72px;
    }

    .color-preview-trigger {
      width: 48px;
      height: 24px;
      border-radius: 4px;
      border: 1px solid #d1d5db;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;

      &:hover {
        border-color: #9ca3af;
        transform: scale(1.02);
      }
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
    position: relative;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid rgba(0, 0, 0, 0.1);
    overflow: hidden;
    background-color: #ffffff;

    &:hover {
      transform: scale(1.15);
    }
  }
}
</style>
