<template>
  <div class="mindmap-setter-section">
    <div class="section-title">节点</div>

    <!-- 1. 节点形状 -->
    <div class="setter-row">
      <span class="label">节点形状</span>
      <a-select
        :value="currentShapeStyle"
        style="width: 130px"
        @change="(val: any) => onShapeStyleChange(val)"
      >
        <a-select-option value="roundRectangle">矩形</a-select-option>
        <a-select-option value="capsule">胶囊</a-select-option>
        <a-select-option value="underline">纯文本/下划线</a-select-option>
      </a-select>
    </div>

    <!-- 2. 填充颜色 -->
    <div class="setter-row">
      <span class="label">填充颜色</span>
      <a-popover v-model:open="fillPopoverOpen" trigger="click" placement="left">
        <template #content>
          <div class="color-palette">
            <div
              class="color-dot is-transparent-dot"
              title="透明/无填充"
              @click="onFillChange('transparent')"
            >
              <span class="transparent-slash" />
            </div>
            <div
              v-for="color in PRESET_COLORS"
              :key="color"
              class="color-dot"
              :style="{ backgroundColor: color }"
              @click="onFillChange(color)"
            />
          </div>
        </template>
        <div class="color-preview-block" :style="fillPreviewStyle">
          <span v-if="currentFill === 'transparent'" class="transparent-slash" />
        </div>
      </a-popover>
    </div>

    <!-- 3. 边框颜色与粗细 -->
    <div class="setter-row">
      <span class="label">边框颜色</span>
      <a-popover v-model:open="strokePopoverOpen" trigger="click" placement="left">
        <template #content>
          <div class="color-palette">
            <div
              class="color-dot is-transparent-dot"
              title="无边框"
              @click="onStrokeChange('transparent')"
            >
              <span class="transparent-slash" />
            </div>
            <div
              v-for="color in PRESET_COLORS"
              :key="color"
              class="color-dot"
              :style="{ backgroundColor: color }"
              @click="onStrokeChange(color)"
            />
          </div>
        </template>
        <div class="color-preview-block" :style="strokePreviewStyle">
          <span v-if="currentStroke === 'transparent' || currentStrokeWidth === 0" class="transparent-slash" />
        </div>
      </a-popover>
    </div>

    <div class="setter-row">
      <span class="label">边框粗细</span>
      <a-input-number
        :value="currentStrokeWidth"
        :min="0"
        :max="10"
        size="small"
        style="width: 80px"
        @change="onStrokeWidthChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Select as ASelect,
  SelectOption as ASelectOption,
  Popover as APopover,
  InputNumber as AInputNumber,
} from 'ant-design-vue';
import type { Board } from '@speed-board/core';
import { PRESET_COLORS } from '@speed-board/shared';

const props = defineProps<{
  board: Board | null;
}>();

const fillPopoverOpen = ref(false);
const strokePopoverOpen = ref(false);

const selectedMind = computed(() => {
  return (props.board?.selectedElements || []).find(
    (el: any) => el.type === 'mind' || el.isRoot
  ) as any;
});

const currentShapeStyle = computed(() => {
  return selectedMind.value?.shape || 'roundRectangle';
});

const currentFill = computed(() => {
  return selectedMind.value?.fill || '#ffffff';
});

const currentStroke = computed(() => {
  return selectedMind.value?.strokeColor || '#8b5cf6';
});

const currentStrokeWidth = computed(() => {
  return Number(selectedMind.value?.strokeWidth) || 1.5;
});

const fillPreviewStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {};
  if (currentFill.value !== 'transparent') {
    style.backgroundColor = String(currentFill.value);
  }
  return style;
});

const strokePreviewStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {};
  if (currentStroke.value !== 'transparent' && currentStrokeWidth.value > 0) {
    style.backgroundColor = String(currentStroke.value);
  }
  return style;
});

const onShapeStyleChange = (shape: string) => {
  if (!props.board) return;
  props.board.setMindmapShape(shape);
};

const onFillChange = (color: string) => {
  fillPopoverOpen.value = false;
  if (!props.board) return;
  props.board.setMindmapNodeProperty({ fill: color });
};

const onStrokeChange = (color: string) => {
  strokePopoverOpen.value = false;
  if (!props.board) return;
  props.board.setMindmapNodeProperty({ strokeColor: color, stroke: color });
};

const onStrokeWidthChange = (val: any) => {
  if (!props.board || val === null || val === undefined) return;
  props.board.setMindmapNodeProperty({ strokeWidth: Number(val) });
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
    margin-bottom: 8px;

    .label {
      font-size: 12px;
      color: #6b7280;
    }

    .color-preview-block {
      position: relative;
      width: 48px;
      height: 24px;
      border-radius: 4px;
      border: 1px solid #d1d5db;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      background-color: #ffffff;
      overflow: hidden;

      .transparent-slash {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(
          to top right,
          transparent calc(50% - 1px),
          #ef4444 calc(50% - 1px),
          #ef4444 calc(50% + 1px),
          transparent calc(50% + 1px)
        );
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

    .transparent-slash {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        to top right,
        transparent calc(50% - 1px),
        #ef4444 calc(50% - 1px),
        #ef4444 calc(50% + 1px),
        transparent calc(50% + 1px)
      );
    }

    &:hover {
      transform: scale(1.15);
    }
  }
}
</style>
