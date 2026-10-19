<template>
  <transition name="drawer-slide">
    <div v-show="props.visible" class="style-settings-panel">
      <!-- 1. 顶部标头 (标题 + 关闭按钮) -->
      <div class="panel-header">
        <span class="panel-title">设置</span>
        <button class="close-btn" @click="onClose">
          <CloseOutlined />
        </button>
      </div>

      <!-- 2. 一级分类选项卡 (根据当前图元 Schema 动态计算，使用 a-tabs) -->
      <div class="panel-tabs-wrapper">
        <a-tabs
          v-model:activeKey="activeTab"
          size="small"
          class="panel-ant-tabs"
        >
          <a-tab-pane
            v-for="tab in availableTabs"
            :key="tab.key"
            :tab="tab.label"
          />
        </a-tabs>
      </div>

      <!-- 3. 面板主体 (根据当前图元 Schema 动态加载对应的原子 Setter) -->
      <div class="panel-content">
        <!-- 3.1 样式 Tab -->
        <template v-if="activeTab === 'style'">
          <div
            v-for="section in currentSections"
            :key="section"
            class="section-wrapper"
          >
            <!-- 形状图标预览 -->
            <ShapePreviewSetter
              v-if="section === 'shape-preview'"
              :shape-id="currentShapeId"
            />

            <!-- 填充颜色 -->
            <FillColorSetter
              v-else-if="section === 'fill'"
              :fill="styleState.fill"
              @update:fill="(c) => updateStyle({ fill: c })"
            />

            <!-- 边框 / 描边 (颜色、粗细、虚实) -->
            <StrokeSetter
              v-else-if="section === 'stroke'"
              :stroke="styleState.stroke"
              :stroke-width="styleState.strokeWidth"
              :stroke-dasharray="styleState.strokeDasharray"
              @update:stroke="(c) => updateStyle({ stroke: c })"
              @update:stroke-width="(w) => updateStyle({ strokeWidth: w })"
              @update:stroke-dasharray="(d) => updateStyle({ strokeDasharray: d })"
            />

            <!-- 线条专用控制 (线型、端点箭头) -->
            <LineStyleSetter
              v-else-if="section === 'line-style'"
              :board="props.board"
            />

            <!-- 不透明度滑块 (图片仅配置此项) -->
            <OpacitySetter
              v-else-if="section === 'opacity'"
              :model-value="styleState.opacity"
              @update:model-value="(op) => updateStyle({ opacity: op })"
            />

            <!-- 思维导图结构布局 -->
            <MindmapLayoutSetter
              v-else-if="section === 'mindmap-layout'"
              :board="props.board"
            />

            <!-- 思维导图节点形状与外观 -->
            <MindmapNodeSetter
              v-else-if="section === 'mindmap-node'"
              :board="props.board"
            />

            <!-- 思维导图分支与彩虹色 -->
            <MindmapBranchSetter
              v-else-if="section === 'mindmap-branch'"
              :board="props.board"
            />

            <div v-if="section !== 'opacity' && section !== 'mindmap-branch'" class="panel-divider" />
          </div>
        </template>

        <!-- 3.2 文本 Tab -->
        <template v-else-if="activeTab === 'text'">
          <div
            v-for="section in currentSections"
            :key="section"
            class="section-wrapper"
          >
            <!-- 文本字形排版 (B/I/S/U, 字号, 颜色) -->
            <TypographySetter
              v-if="section === 'typography'"
              :bold="textState.bold"
              :italic="textState.italic"
              :strike="textState.strike"
              :underline="textState.underline"
              :font-size="textState.fontSize"
              :color="textState.fill"
              @update:bold="(v) => updateTextStyle({ bold: v })"
              @update:italic="(v) => updateTextStyle({ italic: v })"
              @update:strike="(v) => updateTextStyle({ strike: v })"
              @update:underline="(v) => updateTextStyle({ underline: v })"
              @update:font-size="(v) => updateTextStyle({ fontSize: v })"
              @update:color="(v) => updateTextStyle({ fill: v })"
            />

            <!-- 文本对齐 (水平 & 垂直) -->
            <TextAlignSetter
              v-else-if="section === 'align'"
              :align="textState.align"
              :vertical-align="textState.verticalAlign"
              @update:align="(v) => updateTextStyle({ align: v })"
              @update:vertical-align="(v) => updateTextStyle({ verticalAlign: v })"
            />

            <!-- 超链接 -->
            <LinkSetter
              v-else-if="section === 'link'"
              :link="textState.link"
              @open-link-overlay="emit('open-link-overlay')"
            />

            <div class="panel-divider" />
          </div>
        </template>

        <!-- 3.3 排列 Tab (对齐、图层、成组) -->
        <template v-else-if="activeTab === 'arrange'">
          <ArrangeSection :board="props.board" />
        </template>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { CloseOutlined } from '@ant-design/icons-vue'
import { Tabs as ATabs, TabPane as ATabPane } from 'ant-design-vue'
import type { Board } from '@speed-board/core'
import { getNodeSchema, type PanelTabKey, type PanelSectionKey } from '../schema/nodeSchema'
import { useNodeStyle } from '../composables/useNodeStyle'
import OpacitySetter from './setters/OpacitySetter.vue'
import FillColorSetter from './setters/FillColorSetter.vue'
import StrokeSetter from './setters/StrokeSetter.vue'
import TypographySetter from './setters/TypographySetter.vue'
import TextAlignSetter from './setters/TextAlignSetter.vue'
import ShapePreviewSetter from './setters/ShapePreviewSetter.vue'
import LineStyleSetter from './setters/LineStyleSetter.vue'
import LinkSetter from './setters/LinkSetter.vue'
import ArrangeSection from './setters/ArrangeSection.vue'
import MindmapLayoutSetter from './setters/MindmapLayoutSetter.vue'
import MindmapNodeSetter from './setters/MindmapNodeSetter.vue'
import MindmapBranchSetter from './setters/MindmapBranchSetter.vue'

const props = withDefaults(
  defineProps<{
    board: Board | null
    visible: boolean
  }>(),
  {
    visible: false,
  }
)

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'open-link-overlay'): void
}>()

const activeTab = ref<PanelTabKey>('style')

const {
  selectedType,
  selectedCells,
  styleState,
  textState,
  syncFromSelection,
  updateStyle,
  updateTextStyle,
} = useNodeStyle(() => props.board)

/** 当前选中的图元 Schema */
const activeSchema = computed(() => {
  return getNodeSchema(selectedType.value)
})

const tabLabelMap: Record<PanelTabKey, string> = {
  style: '样式',
  text: '文本',
  arrange: '排列',
}

/** 动态计算当前可用 Tab */
const availableTabs = computed(() => {
  const tabs = activeSchema.value.panel.tabs
  return tabs.map((key) => ({
    key,
    label: tabLabelMap[key],
  }))
})

/** 动态计算当前激活 Tab 下的 Setter Sections */
const currentSections = computed<PanelSectionKey[]>(() => {
  const sections = activeSchema.value.panel.sections
  return (sections[activeTab.value] as PanelSectionKey[]) || []
})

const currentShapeId = computed(() => {
  const cell = selectedCells.value[0]
  if (cell && props.board?.isShapeNode(cell)) {
    return cell.getData()?.shapeId || 'rect'
  }
  return 'rect'
})

const onClose = () => {
  emit('update:visible', false)
}

// 监听选区变化，同步回显并自适应 Tab
const syncState = () => {
  syncFromSelection()
  const validTabs = activeSchema.value.panel.tabs
  if (!validTabs.includes(activeTab.value)) {
    activeTab.value = validTabs[0] || 'arrange'
  }
}

watch(
  () => props.board,
  (b) => {
    if (b) {
      b.graph.on('cell:selected', syncState)
      b.graph.on('cell:unselected', syncState)
      b.graph.on('selection:changed', syncState)
    }
  },
  { immediate: true }
)

watch(
  () => props.visible,
  (val) => {
    if (val) {
      syncState()
    }
  }
)
</script>

<style scoped>
.style-settings-panel {
  position: absolute;
  top: 108px; /* 紧随右上角工具条下方垂直排列，不与右上角胶囊工具条重叠 */
  right: 16px;
  width: 280px;
  max-height: calc(100vh - 124px);
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.12), 0 2px 8px -1px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  z-index: 60;
  overflow: hidden;
  border: 1px solid #f0f0f0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.panel-header {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  border-bottom: 1px solid #f3f4f6;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.close-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.close-btn:hover {
  color: #374151;
  background-color: #f3f4f6;
}

.panel-tabs-wrapper {
  padding: 0 14px;
  background-color: #fafafa;
  border-bottom: 1px solid #f3f4f6;
}

.panel-ant-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 0;
}

.panel-ant-tabs :deep(.ant-tabs-content-holder) {
  display: none;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
}

.panel-divider {
  height: 1px;
  background-color: #f3f4f6;
  margin: 12px 0;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(20px);
  opacity: 0;
}
</style>
