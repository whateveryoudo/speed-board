<template>
  <div class="mindmap-setter-section">
    <div class="section-title">布局</div>
    <div class="setter-row">
      <span class="label">结构</span>
      <div class="structure-button-group">
        <a-tooltip title="向右侧分布 (默认)">
          <button
            class="struct-btn"
            :class="{ 'is-active': currentStructure === 'right' }"
            @click="setStructure('right')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="4" y="8" width="6" height="8" rx="2" fill="currentColor" fill-opacity="0.2" />
              <path d="M10 12h10M20 8v8" />
            </svg>
          </button>
        </a-tooltip>

        <a-tooltip title="向两侧分布 (平衡)">
          <button
            class="struct-btn"
            :class="{ 'is-active': currentStructure === 'standard' || currentStructure === 'balanced' }"
            @click="setStructure('standard')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="8" width="6" height="8" rx="2" fill="currentColor" fill-opacity="0.2" />
              <path d="M9 12H4M4 8v8M15 12h5M20 8v8" />
            </svg>
          </button>
        </a-tooltip>

        <a-tooltip title="向左侧分布">
          <button
            class="struct-btn"
            :class="{ 'is-active': currentStructure === 'left' }"
            @click="setStructure('left')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="14" y="8" width="6" height="8" rx="2" fill="currentColor" fill-opacity="0.2" />
              <path d="M14 12H4M4 8v8" />
            </svg>
          </button>
        </a-tooltip>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Tooltip as ATooltip } from 'ant-design-vue';
import type { Board } from '@speed-board/core';

const props = defineProps<{
  board: Board | null;
}>();

const selectedMind = computed(() => {
  return (props.board?.selectedElements || []).find(
    (el: any) => el.type === 'mind' || el.isRoot
  ) as any;
});

const currentStructure = computed(() => {
  return selectedMind.value?.layout || 'right';
});

const setStructure = (structure: string) => {
  if (!props.board) return;
  props.board.setMindmapLayout(structure);
};
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

    .label {
      font-size: 12px;
      color: #6b7280;
    }

    .structure-button-group {
      display: flex;
      gap: 6px;

      .struct-btn {
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

        &:hover {
          border-color: #3b82f6;
          color: #3b82f6;
        }

        &.is-active {
          border-color: #3b82f6;
          background: #eff6ff;
          color: #3b82f6;
        }
      }
    }
  }
}
</style>
