<template>
  <transition name="drawer-slide">
    <div
      v-show="props.visible"
      class="style-settings-panel plait-board-attached"
      @pointerdown.stop
      @pointerup.stop
      @mousedown.stop
      @mouseup.stop
      @click.stop
    >
      <!-- 1. 顶部标头 (标题 + 关闭按钮) -->
      <div class="panel-header">
        <span class="panel-title">设置</span>
        <button class="close-btn" @click="onClose">
          <CloseOutlined />
        </button>
      </div>

      <!-- 2. 一级分类选项卡 -->
      <div class="panel-tabs-wrapper">
        <a-tabs v-model:activeKey="activeTab" size="small" class="panel-ant-tabs">
          <a-tab-pane key="style" tab="样式" />
          <a-tab-pane key="text" tab="文本" />
          <a-tab-pane key="arrange" tab="排列" />
        </a-tabs>
      </div>

      <!-- 3. 面板主体 -->
      <div class="panel-content">
        <!-- 3.1 样式 Tab -->
        <template v-if="activeTab === 'style'">
          <!-- 填充颜色 -->
          <div v-if="hasFill" class="setter-row">
            <span class="label">填充颜色</span>
            <div class="color-control-wrapper">
              <a-popover
                v-model:open="fillOpen"
                trigger="click"
                placement="left"
                overlay-class-name="style-popover-overlay plait-board-attached"
                :arrow="false"
              >
                <template #content>
                  <div class="color-picker-grid">
                    <div
                      class="color-dot is-transparent-dot"
                      title="无填充"
                      @click="updateFill('transparent')"
                    >
                      <span class="transparent-slash" />
                    </div>
                    <div
                      v-for="color in presetColors"
                      :key="color"
                      class="color-dot"
                      :style="{ backgroundColor: color }"
                      @click="updateFill(color)"
                    />
                  </div>
                </template>
                <div class="color-preview-block" :style="{ backgroundColor: styleState.fill }" />
              </a-popover>
            </div>
          </div>

          <!-- 边框描边 -->
          <div v-if="hasStroke" class="setter-row">
            <span class="label">边框描边</span>
            <div class="color-control-wrapper">
              <a-popover
                v-model:open="strokeOpen"
                trigger="click"
                placement="left"
                overlay-class-name="style-popover-overlay plait-board-attached"
                :arrow="false"
              >
                <template #content>
                  <div class="color-picker-grid">
                    <div
                      v-for="color in presetColors"
                      :key="color"
                      class="color-dot"
                      :style="{ backgroundColor: color }"
                      @click="updateStrokeColor(color)"
                    />
                  </div>
                </template>
                <div class="color-preview-block" :style="{ backgroundColor: styleState.stroke }" />
              </a-popover>
            </div>
          </div>

          <!-- 描边粗细 -->
          <div v-if="hasStroke" class="setter-row">
            <span class="label">描边粗细</span>
            <a-input-number
              :value="styleState.strokeWidth"
              :min="0"
              :max="20"
              size="small"
              style="width: 80px;"
              @change="(v) => updateStyle({ strokeWidth: Number(v) })"
            />
          </div>

          <!-- 不透明度 -->
          <div class="setter-row">
            <span class="label">不透明度</span>
            <a-slider
              :value="Math.round(styleState.opacity * 100)"
              :min="10"
              :max="100"
              size="small"
              style="flex: 1; margin-left: 16px;"
              @change="(v) => updateStyle({ opacity: Number(v) / 100 })"
            />
          </div>

          <!-- 脑图专属：结构布局 -->
          <template v-if="selectedType.startsWith('mindmap')">
            <div class="panel-divider" />
            <div class="setter-section-title">脑图结构</div>
            <div class="setter-row">
              <button
                class="struct-btn"
                @click="props.board?.setMindmapLayout('standard')"
              >
                平衡 (双侧)
              </button>
              <button
                class="struct-btn"
                @click="props.board?.setMindmapLayout('right')"
              >
                向右分布
              </button>
              <button
                class="struct-btn"
                @click="props.board?.setMindmapLayout('left')"
              >
                向左分布
              </button>
            </div>
          </template>
        </template>

        <!-- 3.2 文本 Tab -->
        <template v-else-if="activeTab === 'text'">
          <div class="setter-row">
            <span class="label">字号</span>
            <a-input-number
              :value="textState.fontSize"
              :min="10"
              :max="72"
              size="small"
              style="width: 80px;"
              @change="(v) => updateTextStyle({ fontSize: Number(v) })"
            />
          </div>

          <div class="setter-row">
            <span class="label">颜色</span>
            <div class="color-control-wrapper">
              <a-popover
                v-model:open="textColorOpen"
                trigger="click"
                placement="left"
                overlay-class-name="style-popover-overlay plait-board-attached"
                :arrow="false"
              >
                <template #content>
                  <div class="color-picker-grid">
                    <div
                      v-for="color in presetColors"
                      :key="color"
                      class="color-dot"
                      :style="{ backgroundColor: color }"
                      @click="updateTextColor(color)"
                    />
                  </div>
                </template>
                <div class="color-preview-block" :style="{ backgroundColor: textState.fill }" />
              </a-popover>
            </div>
          </div>

          <div class="setter-row">
            <span class="label">字形</span>
            <div class="btn-toggle-group">
              <button
                class="icon-toggle-btn"
                :class="{ 'is-active': textState.bold }"
                @click="updateTextStyle({ bold: !textState.bold })"
              >
                <strong>B</strong>
              </button>
              <button
                class="icon-toggle-btn"
                :class="{ 'is-active': textState.italic }"
                @click="updateTextStyle({ italic: !textState.italic })"
              >
                <em>I</em>
              </button>
              <button
                class="icon-toggle-btn"
                :class="{ 'is-active': textState.underline }"
                @click="updateTextStyle({ underline: !textState.underline })"
              >
                <u>U</u>
              </button>
              <button
                class="icon-toggle-btn"
                :class="{ 'is-active': textState.strike }"
                @click="updateTextStyle({ strike: !textState.strike })"
              >
                <s>S</s>
              </button>
            </div>
          </div>

          <!-- 链接配置 -->
          <div class="panel-divider" />
          <div class="setter-section-title">链接</div>
          <div class="setter-row" style="flex-direction: column; align-items: stretch; gap: 8px;">
            <a-input
              :value="textState.link"
              size="small"
              placeholder="输入链接地址 (如 https://...)"
              allow-clear
              @change="(e: any) => updateTextStyle({ link: e.target.value })"
            >
              <template #prefix>
                <SIconFont type="icon-kl-link1" :size="14" style="color: #9ca3af; margin-right: 2px;" />
              </template>
            </a-input>
            <div v-if="textState.link" style="display: flex; justify-content: flex-end;">
              <a
                :href="/^[a-zA-Z]+:\/\//.test(textState.link) ? textState.link : `https://${textState.link}`"
                target="_blank"
                rel="noopener noreferrer"
                class="panel-link-open"
              >
                打开链接 ↗
              </a>
            </div>
          </div>
        </template>

        <!-- 3.3 排列 Tab -->
        <template v-else-if="activeTab === 'arrange'">
          <div class="setter-section-title">对齐与分布</div>
          <div class="arrange-grid">
            <button class="arrange-btn" @click="props.board?.alignSelectedNodes('left')">左对齐</button>
            <button class="arrange-btn" @click="props.board?.alignSelectedNodes('center')">水平居中</button>
            <button class="arrange-btn" @click="props.board?.alignSelectedNodes('right')">右对齐</button>
            <button class="arrange-btn" @click="props.board?.alignSelectedNodes('top')">顶对齐</button>
            <button class="arrange-btn" @click="props.board?.alignSelectedNodes('middle')">垂直居中</button>
            <button class="arrange-btn" @click="props.board?.alignSelectedNodes('bottom')">底对齐</button>
          </div>
          <div class="arrange-grid" style="margin-top: 6px;">
            <button class="arrange-btn" @click="props.board?.distributeSelectedNodes('horizontal')">水平等距</button>
            <button class="arrange-btn" @click="props.board?.distributeSelectedNodes('vertical')">垂直等距</button>
          </div>

          <div class="panel-divider" />
          <div class="setter-section-title">图层顺序</div>
          <div class="arrange-grid">
            <button class="arrange-btn" @click="props.board?.bringSelectedToFront()">置于顶层</button>
            <button class="arrange-btn" @click="props.board?.sendSelectedToBack()">置于底层</button>
            <button class="arrange-btn" @click="props.board?.bringSelectedForward()">上移一层</button>
            <button class="arrange-btn" @click="props.board?.sendSelectedBackward()">下移一层</button>
          </div>

          <div class="panel-divider" />
          <div class="setter-section-title">编组与锁定</div>
          <div class="arrange-grid">
            <button class="arrange-btn" @click="props.board?.groupSelected()">成组</button>
            <button class="arrange-btn" @click="props.board?.ungroupSelected()">解组</button>
            <button class="arrange-btn" @click="props.board?.duplicateSelected()">复制副本</button>
            <button class="arrange-btn" @click="props.board?.toggleLockSelected()">锁定/解锁</button>
          </div>
        </template>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { CloseOutlined } from '@ant-design/icons-vue'
import {
  Tabs as ATabs,
  TabPane as ATabPane,
  InputNumber as AInputNumber,
  Input as AInput,
  Slider as ASlider,
  Popover as APopover,
} from 'ant-design-vue'
import { IconFont as SIconFont } from 'speed-components-ui/components'
import type { Board } from '@speed-board/core'
import { useNodeStyle } from '@speed-board/vue3'

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
}>()

const activeTab = ref<'style' | 'text' | 'arrange'>('style')
const fillOpen = ref(false)
const strokeOpen = ref(false)
const textColorOpen = ref(false)

const presetColors = [
  '#000000',
  '#4b5563',
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#ffffff',
]

const {
  selectedType,
  styleState,
  textState,
  syncFromSelection,
  updateStyle,
  updateTextStyle,
} = useNodeStyle(() => props.board)

const hasFill = computed(() => selectedType.value !== 'line' && selectedType.value !== 'image')
const hasStroke = computed(() => selectedType.value !== 'image')

const onClose = () => {
  emit('update:visible', false)
}

const updateFill = (color: string) => {
  fillOpen.value = false
  updateStyle({ fill: color })
}

const updateStrokeColor = (color: string) => {
  strokeOpen.value = false
  updateStyle({ stroke: color })
}

const updateTextColor = (color: string) => {
  textColorOpen.value = false
  updateTextStyle({ fill: color })
}

const sync = () => {
  syncFromSelection()
}

watch(
  () => props.board,
  (b, oldB) => {
    if (oldB) {
      oldB.off('selection:change', sync)
      oldB.off('change', sync)
    }
    if (b) {
      b.on('selection:change', sync)
      b.on('change', sync)
    }
  },
  { immediate: true }
)

watch(
  () => props.visible,
  (val) => {
    if (val) sync()
  }
)
</script>

<style scoped lang="less">
.style-settings-panel {
  position: absolute;
  top: 104px; /* 紧随右上角胶囊下方垂直排列，避免遮挡顶部视口工具胶囊 */
  right: 16px;
  width: 280px;
  max-height: calc(100vh - 120px);
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  overflow: hidden;
  user-select: none;
}

.panel-link-open {
  font-size: 12px;
  color: #1677ff;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.panel-header {
  height: 44px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f0f0f0;

  .panel-title {
    font-size: 14px;
    font-weight: 600;
    color: #1f2937;
  }

  .close-btn {
    border: none;
    background: transparent;
    color: #9ca3af;
    cursor: pointer;
    font-size: 14px;
    padding: 4px;
    border-radius: 4px;

    &:hover {
      background: #f3f4f6;
      color: #374151;
    }
  }
}

.panel-tabs-wrapper {
  padding: 0 12px;
  border-bottom: 1px solid #f3f4f6;
}

.panel-content {
  flex: 1;
  padding: 12px 16px;
  overflow-y: auto;
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
}

.setter-section-title {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.panel-divider {
  height: 1px;
  background: #f0f0f0;
  margin: 12px 0;
}

.color-preview-block {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  cursor: pointer;
}

.color-picker-grid {
  display: grid;
  grid-template-columns: repeat(5, 20px);
  gap: 6px;
  padding: 4px;

  .color-dot {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid rgba(0, 0, 0, 0.1);

    &.is-transparent-dot {
      background: #ffffff;
      position: relative;
      overflow: hidden;

      .transparent-slash {
        position: absolute;
        width: 100%;
        height: 1.5px;
        background: #ef4444;
        top: 50%;
        left: 0;
        transform: rotate(-45deg);
      }
    }
  }
}

.btn-toggle-group {
  display: flex;
  gap: 4px;

  .icon-toggle-btn {
    width: 28px;
    height: 28px;
    border: 1px solid #e5e7eb;
    background: #fff;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;

    &.is-active {
      border-color: #3b82f6;
      background: #eff6ff;
      color: #3b82f6;
    }
  }
}

.struct-btn {
  flex: 1;
  height: 28px;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;

  &:hover {
    border-color: #3b82f6;
    color: #3b82f6;
  }
}

.arrange-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;

  .arrange-btn {
    height: 28px;
    border: 1px solid #e5e7eb;
    background: #fff;
    border-radius: 4px;
    font-size: 11px;
    color: #374151;
    cursor: pointer;

    &:hover {
      border-color: #3b82f6;
      color: #3b82f6;
    }
  }
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: all 0.2s ease;
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(30px);
  opacity: 0;
}
</style>
