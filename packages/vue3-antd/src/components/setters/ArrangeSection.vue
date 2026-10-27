<template>
  <div class="arrange-section-wrap">
    <!-- 1. 对齐方式 (6个对齐按钮) -->
    <div class="arrange-block">
      <div class="align-group">
        <a-tooltip title="左对齐">
          <button
            class="arrange-icon-btn"
            :disabled="selectedCount < 2"
            @click="props.board?.alignSelectedNodes('left')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="4" y1="21" x2="4" y2="3" />
              <rect x="8" y="6" width="12" height="4" rx="1" />
              <rect x="8" y="14" width="8" height="4" rx="1" />
            </svg>
          </button>
        </a-tooltip>

        <a-tooltip title="水平居中">
          <button
            class="arrange-icon-btn"
            :disabled="selectedCount < 2"
            @click="props.board?.alignSelectedNodes('center')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="21" x2="12" y2="3" />
              <rect x="6" y="6" width="12" height="4" rx="1" />
              <rect x="8" y="14" width="8" height="4" rx="1" />
            </svg>
          </button>
        </a-tooltip>

        <a-tooltip title="右对齐">
          <button
            class="arrange-icon-btn"
            :disabled="selectedCount < 2"
            @click="props.board?.alignSelectedNodes('right')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="20" y1="21" x2="20" y2="3" />
              <rect x="4" y="6" width="12" height="4" rx="1" />
              <rect x="8" y="14" width="8" height="4" rx="1" />
            </svg>
          </button>
        </a-tooltip>

        <a-tooltip title="顶对齐">
          <button
            class="arrange-icon-btn"
            :disabled="selectedCount < 2"
            @click="props.board?.alignSelectedNodes('top')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="4" x2="21" y2="4" />
              <rect x="6" y="8" width="4" height="12" rx="1" />
              <rect x="14" y="8" width="4" height="8" rx="1" />
            </svg>
          </button>
        </a-tooltip>

        <a-tooltip title="垂直居中">
          <button
            class="arrange-icon-btn"
            :disabled="selectedCount < 2"
            @click="props.board?.alignSelectedNodes('middle')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <rect x="6" y="6" width="4" height="12" rx="1" />
              <rect x="14" y="8" width="4" height="8" rx="1" />
            </svg>
          </button>
        </a-tooltip>

        <a-tooltip title="底对齐">
          <button
            class="arrange-icon-btn"
            :disabled="selectedCount < 2"
            @click="props.board?.alignSelectedNodes('bottom')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="20" x2="21" y2="20" />
              <rect x="6" y="4" width="4" height="12" rx="1" />
              <rect x="14" y="8" width="4" height="8" rx="1" />
            </svg>
          </button>
        </a-tooltip>
      </div>
    </div>

    <!-- 2. 分布方式 (水平等间距 / 垂直等间距) -->
    <div class="arrange-block">
      <div class="distribute-group">
        <button
          class="distribute-btn"
          :disabled="selectedCount < 3"
          @click="props.board?.distributeSelectedNodes('horizontal')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="5" width="4" height="14" rx="1" />
            <rect x="17" y="5" width="4" height="14" rx="1" />
            <line x1="11" y1="5" x2="13" y2="5" />
            <line x1="11" y1="19" x2="13" y2="19" />
          </svg>
          <span>水平均分</span>
        </button>

        <button
          class="distribute-btn"
          :disabled="selectedCount < 3"
          @click="props.board?.distributeSelectedNodes('vertical')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="5" y="3" width="14" height="4" rx="1" />
            <rect x="5" y="17" width="14" height="4" rx="1" />
            <line x1="5" y1="11" x2="5" y2="13" />
            <line x1="19" y1="11" x2="19" y2="13" />
          </svg>
          <span>垂直均分</span>
        </button>
      </div>
    </div>

    <!-- 3. 图层层叠顺序 -->
    <div class="arrange-block">
      <div class="layer-btn-row">
        <div class="layer-sub-group">
          <a-tooltip title="置于顶层">
            <button class="arrange-icon-btn" @click="props.board?.bringSelectedToFront()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="8" y="8" width="12" height="12" rx="2" fill="currentColor" fill-opacity="0.1" />
                <rect x="4" y="4" width="12" height="12" rx="2" stroke-dasharray="3,3" />
              </svg>
            </button>
          </a-tooltip>
          <a-tooltip title="置于底层">
            <button class="arrange-icon-btn" @click="props.board?.sendSelectedToBack()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="4" width="12" height="12" rx="2" fill="currentColor" fill-opacity="0.1" />
                <rect x="8" y="8" width="12" height="12" rx="2" />
              </svg>
            </button>
          </a-tooltip>
        </div>

        <div class="layer-sub-group">
          <a-tooltip title="上移一层">
            <button class="arrange-icon-btn" @click="props.board?.bringSelectedForward()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="8" width="12" height="12" rx="2" />
                <path d="M16 14l4-4 4 4" />
                <path d="M20 10v10" />
              </svg>
            </button>
          </a-tooltip>
          <a-tooltip title="下移一层">
            <button class="arrange-icon-btn" @click="props.board?.sendSelectedBackward()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="8" width="12" height="12" rx="2" />
                <path d="M16 16l4 4 4-4" />
                <path d="M20 10v10" />
              </svg>
            </button>
          </a-tooltip>
        </div>
      </div>
    </div>

    <!-- 4. 组织与管理 (成组 / 解散成组 / 锁定 / 复制副本) -->
    <div class="arrange-block">
      <div class="organize-btn-row">
        <a-tooltip title="成组 (Cmd/Ctrl+G)">
          <button
            class="organize-btn"
            :disabled="selectedCount < 2"
            @click="props.board?.groupSelected()"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
            <span>成组</span>
          </button>
        </a-tooltip>

        <a-tooltip title="解组 (Cmd/Ctrl+Shift+G)">
          <button
            class="organize-btn"
            :disabled="selectedCount < 1"
            @click="props.board?.ungroupSelected()"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke-dasharray="2,2" />
              <rect x="3" y="11" width="18" height="10" rx="2" />
            </svg>
            <span>解组</span>
          </button>
        </a-tooltip>

        <a-tooltip title="锁定/解锁 (Cmd/Ctrl+L)">
          <button
            class="organize-btn"
            :disabled="selectedCount < 1"
            @click="props.board?.toggleLockSelected()"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>锁定</span>
          </button>
        </a-tooltip>

        <a-tooltip title="复制副本 (Cmd/Ctrl+D)">
          <button
            class="organize-btn"
            :disabled="selectedCount < 1"
            @click="props.board?.duplicateSelected()"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span>副本</span>
          </button>
        </a-tooltip>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Tooltip as ATooltip } from 'ant-design-vue'
import type { Board } from '@speed-board/core'

const props = defineProps<{
  board: Board | null
}>()

const selectedCount = computed(() => {
  return props.board?.selectedElements?.length || 0
})
</script>

<style scoped>
.arrange-section-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.arrange-block {
  padding-bottom: 8px;
  border-bottom: 1px solid #f3f4f6;
}

.arrange-block:last-child {
  border-bottom: none;
}

.align-group {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  background-color: #f3f4f6;
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}

.arrange-icon-btn {
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: #4b5563;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.arrange-icon-btn:hover:not(:disabled) {
  background-color: #ffffff;
  color: #111827;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.arrange-icon-btn:disabled {
  color: #d1d5db;
  cursor: not-allowed;
}

.distribute-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.distribute-btn {
  height: 28px;
  border: 1px solid #e5e7eb;
  background-color: #ffffff;
  border-radius: 6px;
  color: #4b5563;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.15s ease;
}

.distribute-btn:hover:not(:disabled) {
  border-color: #d1d5db;
  color: #111827;
  background-color: #f9fafb;
}

.distribute-btn:disabled {
  color: #d1d5db;
  border-color: #f3f4f6;
  cursor: not-allowed;
}

.layer-btn-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.layer-sub-group {
  flex: 1;
  display: flex;
  background-color: #f3f4f6;
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}

.layer-sub-group .arrange-icon-btn {
  flex: 1;
}

.organize-btn-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.organize-btn {
  height: 28px;
  border: 1px solid #e5e7eb;
  background-color: #ffffff;
  border-radius: 6px;
  color: #4b5563;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.15s ease;
}

.organize-btn:hover:not(:disabled) {
  border-color: #d1d5db;
  color: #111827;
  background-color: #f9fafb;
}

.organize-btn:disabled {
  color: #d1d5db;
  border-color: #f3f4f6;
  cursor: not-allowed;
}
</style>
