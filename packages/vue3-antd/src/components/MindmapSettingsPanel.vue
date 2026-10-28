<template>
  <a-drawer
    :open="visible"
    title="思维导图样式"
    placement="right"
    :width="300"
    :mask="false"
    class="speed-mindmap-settings-drawer"
    @update:open="onVisibleChange"
  >
    <div class="mindmap-settings-body">
      <!-- 1. 结构布局 -->
      <div class="setting-section">
        <div class="section-title">结构布局</div>
        <a-radio-group
          v-model:value="currentLayout"
          size="small"
          class="layout-radio-group"
          @change="onLayoutChange"
        >
          <a-radio-button value="standard">左右分布</a-radio-button>
          <a-radio-button value="right">单向向右</a-radio-button>
          <a-radio-button value="downward">组织架构</a-radio-button>
        </a-radio-group>
      </div>

      <!-- 2. 分支连线 -->
      <div class="setting-section">
        <div class="section-title">分支线条</div>
        <div class="setting-row">
          <span class="row-label">线形</span>
          <a-select
            v-model:value="currentBranchShape"
            size="small"
            style="width: 130px"
            @change="onBranchShapeChange"
          >
            <a-select-option value="curve">平滑曲线</a-select-option>
            <a-select-option value="polyline">直角折线</a-select-option>
          </a-select>
        </div>
      </div>

      <!-- 3. 卡片形状 -->
      <div class="setting-section">
        <div class="section-title">卡片外形</div>
        <a-radio-group
          v-model:value="currentShape"
          size="small"
          @change="onShapeChange"
        >
          <a-radio-button value="roundRectangle">圆角卡片</a-radio-button>
          <a-radio-button value="underline">优雅下划线</a-radio-button>
        </a-radio-group>
      </div>

      <!-- 4. 快捷键指南 -->
      <div class="setting-section shortcut-guide">
        <div class="section-title">键盘流快捷键</div>
        <div class="shortcut-item"><kbd>Enter</kbd> 增加同级节点 / 退出编辑</div>
        <div class="shortcut-item"><kbd>Tab</kbd> 增加子节点</div>
        <div class="shortcut-item"><kbd>Space</kbd> 或双击进入编辑</div>
        <div class="shortcut-item"><kbd>Delete</kbd> 删除选中节点</div>
      </div>
    </div>
  </a-drawer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Board } from '@speed-board/core';

defineOptions({
  name: 'MindmapSettingsPanel',
});

const props = defineProps<{
  visible: boolean;
  board: Board | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void;
}>();

const onVisibleChange = (val: boolean) => {
  emit('update:visible', val);
};

const selectedElement = computed(() => {
  return props.board?.selectedElements?.[0] as any;
});

const currentLayout = ref('standard');
const currentBranchShape = ref('curve');
const currentShape = ref('roundRectangle');

const onLayoutChange = () => {
  props.board?.setMindmapLayout(currentLayout.value);
};

const onBranchShapeChange = () => {
  props.board?.setMindmapBranchShape(currentBranchShape.value);
};

const onShapeChange = () => {
  props.board?.setMindmapShape(currentShape.value);
};
</script>

<style scoped>
.mindmap-settings-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.setting-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.row-label {
  font-size: 12px;
  color: #64748b;
}

.shortcut-guide {
  background: #f8fafc;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.shortcut-item {
  font-size: 12px;
  color: #475569;
  line-height: 22px;
}

kbd {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 11px;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
}
</style>
