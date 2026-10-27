<template>
  <div class="mindmap-setter-section">
    <div class="section-title">分支</div>

    <!-- 1. 分支颜色 -->
    <div class="setter-row">
      <span class="label">分支颜色</span>
      <div class="color-control-wrapper">
        <a-popover
          v-model:open="colorOpen"
          trigger="click"
          placement="leftTop"
          :arrow="false"
          overlay-class-name="color-picker-popover-overlay"
          :overlay-inner-style="{ padding: '12px 14px', borderRadius: '10px' }"
        >
          <template #content>
            <ColorTonePicker
              :model-value="currentColor"
              :allow-transparent="false"
              @update:model-value="onColorSelect"
            />
          </template>
          <div
            class="color-preview-trigger"
            :class="{ 'is-rainbow': isRoot && isRainbow }"
            :style="!(isRoot && isRainbow) ? { backgroundColor: currentColor } : {}"
            :title="isRoot && isRainbow ? '彩虹分支已开启，点击可修改单色备用色' : '点击选择分支颜色'"
          >
            <div v-if="isRoot && isRainbow" class="rainbow-gradient-bar" />
          </div>
        </a-popover>

        <!-- 子节点局部覆盖时显示“恢复继承”按钮 -->
        <a-button
          v-if="!isRoot && isChildColorOverridden"
          type="link"
          size="small"
          class="reset-link-btn"
          @click="onResetColor"
        >
          恢复继承
        </a-button>
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
        <a-button
          v-if="!isRoot && isChildWidthOverridden"
          type="link"
          size="small"
          class="reset-link-btn"
          @click="onResetWidth"
        >
          恢复继承
        </a-button>
      </div>
    </div>

    <!-- 3. 分支类型 -->
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
  Checkbox as ACheckbox,
  InputNumber as AInputNumber,
  Popover as APopover,
  Button as AButton,
} from 'ant-design-vue'
import { IconFont as SIconFont } from 'speed-components-ui/components'
import type { Board } from '@speed-board/core'
import type { MindmapBranchType, MindmapNodeData } from '@speed-board/shared'
import ColorTonePicker from '../ColorTonePicker.vue'

const props = defineProps<{
  board: Board | null
}>()

const colorOpen = ref(false)

const selectedCell = computed(() => {
  return props.board?.selectedElements?.[0] || null
})

const selectedNodeData = computed<MindmapNodeData | null>(() => {
  return (selectedCell.value?.getData?.() || selectedCell.value?.data || selectedCell.value || null) as MindmapNodeData | null
})

const isRoot = computed(() => {
  return !!selectedNodeData.value?.isRoot
})

const rootNode = computed(() => {
  if (!props.board || !selectedNodeData.value?.mindmapId) return null
  return (props.board.raw?.children || []).find((n: any) => {
    const d = (n.getData?.() || n.data || n) as MindmapNodeData | undefined
    return d?.type === 'mindmap-node' && d?.mindmapId === selectedNodeData.value?.mindmapId && d?.isRoot
  })
})

const rootBranchConfig = computed(() => {
  const d = rootNode.value?.getData() as MindmapNodeData | undefined
  return d?.branch || {}
})

const branchType = computed<MindmapBranchType>(() => {
  return rootBranchConfig.value.type || 'curve'
})

const isRainbow = computed(() => {
  return rootBranchConfig.value.isRainbow ?? true
})

const isTapered = computed(() => {
  return rootBranchConfig.value.isTapered ?? false
})

const currentColor = computed(() => {
  if (isRoot.value) {
    return rootBranchConfig.value.color || '#8b5cf6'
  }
  return selectedNodeData.value?.branch?.color || rootBranchConfig.value.color || '#8b5cf6'
})

const isChildColorOverridden = computed(() => {
  if (isRoot.value) return false
  return !!selectedNodeData.value?.branch?.color
})

const currentWidth = computed(() => {
  if (isRoot.value) {
    return rootBranchConfig.value.width ?? 3
  }
  return selectedNodeData.value?.branch?.width ?? rootBranchConfig.value.width ?? 3
})

const isChildWidthOverridden = computed(() => {
  if (isRoot.value) return false
  return selectedNodeData.value?.branch?.width !== undefined
})

const onBranchTypeChange = (type: MindmapBranchType) => {
  if (!selectedCell.value || !props.board) return
  ;(props.board as any).commands?.setMindmapBranchStyle?.(selectedCell.value.id, {
    type,
  })
}

const onRainbowChange = (e: any) => {
  if (!selectedCell.value || !props.board) return
  const targetId = rootNode.value?.id || selectedCell.value.id
  ;(props.board as any).commands?.setMindmapBranchStyle?.(targetId, {
    isRainbow: e.target.checked,
  })
}

const onTaperedChange = (e: any) => {
  if (!selectedCell.value || !props.board) return
  const targetId = rootNode.value?.id || selectedCell.value.id
  ;(props.board as any).commands?.setMindmapBranchStyle?.(targetId, {
    isTapered: e.target.checked,
  })
}

const onColorSelect = (color: string) => {
  if (!selectedCell.value || !props.board) return
  colorOpen.value = false
  if (isRoot.value) {
    ;(props.board as any).commands?.setMindmapBranchStyle?.(selectedCell.value.id, {
      color,
      isRainbow: false, // 明确选色即切换为单色模式
    })
  } else {
    ;(props.board as any).commands?.setMindmapBranchStyle?.(selectedCell.value.id, {
      color,
    })
  }
}

const onResetColor = () => {
  if (!selectedCell.value || !props.board) return
  ;(props.board as any).commands?.setMindmapBranchStyle?.(selectedCell.value.id, {
    resetColor: true,
  })
}

const onWidthChange = (val: any) => {
  if (!selectedCell.value || !props.board || val === null || val === undefined) return
  ;(props.board as any).commands?.setMindmapBranchStyle?.(selectedCell.value.id, {
    width: Number(val),
  })
}

const onResetWidth = () => {
  if (!selectedCell.value || !props.board) return
  ;(props.board as any).commands?.setMindmapBranchStyle?.(selectedCell.value.id, {
    resetWidth: true,
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

    .reset-link-btn {
      padding: 0;
      font-size: 11px;
      height: auto;
      color: #3b82f6;
      line-height: 1;

      &:hover {
        color: #1d4ed8;
      }
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

      &.is-rainbow {
        background: linear-gradient(
          90deg,
          #8b5cf6 0%,
          #3b82f6 25%,
          #10b981 50%,
          #f59e0b 75%,
          #ef4444 100%
        );
      }

      .rainbow-gradient-bar {
        width: 100%;
        height: 100%;
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
</style>
