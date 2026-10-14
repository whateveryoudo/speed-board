<template>
  <div class="color-tone-picker">
    <!-- 1. 顶部配色方案胶囊切换 (主题配色 / 默认配色) -->
    <div class="picker-tabs-segment">
      <div
        class="tab-pill"
        :class="{ 'is-active': activeTab === 'theme' }"
        @click="activeTab = 'theme'"
      >
        主题配色
      </div>
      <div
        class="tab-pill"
        :class="{ 'is-active': activeTab === 'default' }"
        @click="activeTab = 'default'"
      >
        默认配色
      </div>
    </div>

    <!-- 2. 预设调色板色块矩阵 (2 行 x 6 列) -->
    <div class="palette-swatches-grid">
      <div
        v-for="(color, index) in currentPalette"
        :key="color + index"
        class="swatch-item"
        :class="{
          'is-transparent': color === 'transparent',
          'is-white': color.toLowerCase() === '#ffffff',
          'is-active': isBaseColorSelected(color),
        }"
        :style="color !== 'transparent' ? { backgroundColor: color } : {}"
        @click="selectBaseColor(color)"
      >
        <!-- 透明对角斜线 -->
        <span v-if="color === 'transparent'" class="transparent-slash" />
      </div>
    </div>

    <!-- 3. 色彩梯度 (根据当前基础色调动态派生的 5 阶渐变色块) -->
    <div class="tone-gradient-section">
      <div class="section-title">色彩梯度</div>
      <div class="tone-swatches-row">
        <div
          v-for="(tone, idx) in toneLevels"
          :key="tone + idx"
          class="tone-swatch-item"
          :class="{
            'is-active': isToneActive(tone),
            'is-dark': isDarkColor(tone),
          }"
          :style="{ backgroundColor: tone }"
          @click="selectTone(tone)"
        >
          <!-- 选中时的对勾标记 (1:1 语雀白板风格) -->
          <svg
            v-if="isToneActive(tone)"
            class="check-icon"
            viewBox="0 0 1024 1024"
            width="12"
            height="12"
          >
            <path
              d="M384 700.5L166.8 483.3l-56.6 56.6L384 813.7 913.8 283.9l-56.6-56.6z"
              :fill="isDarkColor(tone) ? '#ffffff' : '#333333'"
            />
          </svg>
        </div>
      </div>
    </div>

    <!-- 4. 自定义颜色 (彩虹圆环 + 点击拾色) -->
    <div class="custom-color-section">
      <div class="section-title">自定义颜色</div>
      <div class="custom-color-trigger" @click="openNativeColorPicker">
        <div class="rainbow-circle">
          <span class="dots-label">···</span>
        </div>
        <input
          ref="colorInputRef"
          type="color"
          class="hidden-color-input"
          :value="normalizeHex(props.modelValue)"
          @input="onNativeColorChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    allowTransparent?: boolean
  }>(),
  {
    modelValue: '#ec4899',
    allowTransparent: true,
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}>()

const activeTab = ref<'theme' | 'default'>('theme')
const colorInputRef = ref<HTMLInputElement | null>(null)

// 主题配色 (1:1 语雀白板配色方案)
const themePalette = [
  'transparent',
  '#262626',
  '#ffffff',
  '#8b5cf6',
  '#3b82f6',
  '#14b8a6',
  '#eab308',
  '#22c55e',
  '#ef4444',
  '#ec4899',
  '#0ea5e9',
  '#f97316',
]

// 默认高保真基础配色
const defaultPalette = [
  '#ffffff',
  '#fde047',
  '#fdba74',
  '#fca5a5',
  '#f472b6',
  '#c084fc',
  '#1e293b',
  '#84cc16',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
]

const currentPalette = computed(() => {
  return activeTab.value === 'theme' ? themePalette : defaultPalette
})

// 当前选中的基准主色（用于驱动下方 5 阶梯度）
const currentBaseColor = ref(props.modelValue || '#ec4899')

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal && newVal !== 'transparent') {
      currentBaseColor.value = newVal
    }
  }
)

// HSL <-> HEX 色彩换算引擎
function hexToHsl(hexStr: string): { h: number; s: number; l: number } {
  let hex = hexStr.replace('#', '').trim()
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('')
  }
  const r = parseInt(hex.substring(0, 2), 16) / 255 || 0
  const g = parseInt(hex.substring(2, 4), 16) / 255 || 0
  const b = parseInt(hex.substring(4, 6), 16) / 255 || 0

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

function hslToHex(h: number, s: number, l: number): string {
  s = Math.max(0, Math.min(100, s)) / 100
  l = Math.max(0, Math.min(100, l)) / 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

// 动态生成 5 阶明暗梯度的色彩序列
const toneLevels = computed<string[]>(() => {
  const base = currentBaseColor.value
  if (!base || base === 'transparent') {
    return ['#fafafa', '#f4f4f5', '#e4e4e7', '#a1a1aa', '#52525b']
  }

  const { h, s } = hexToHsl(base)

  // 灰度/中性色处理
  if (s < 10) {
    return ['#fafafa', '#f4f4f5', '#e4e4e7', '#71717a', '#27272a']
  }

  // 5 个语雀白板梯度 Lightness 步阶:
  // 阶 1: 极浅淡背景 (94% 明度)
  // 阶 2: 柔和浅色 (83% 明度)
  // 阶 3: 中度饱满色 (65% 明度)
  // 阶 4: 深层次主色 (46% 明度)
  // 阶 5: 浓郁暗调 (25% 明度)
  return [
    hslToHex(h, Math.min(s, 75), 94),
    hslToHex(h, Math.min(s, 85), 83),
    hslToHex(h, s, 65),
    hslToHex(h, Math.max(s, 60), 46),
    hslToHex(h, Math.max(s, 65), 25),
  ]
})

const isBaseColorSelected = (color: string) => {
  if (color === 'transparent') {
    return props.modelValue === 'transparent'
  }
  return (
    props.modelValue?.toLowerCase() === color.toLowerCase() ||
    currentBaseColor.value?.toLowerCase() === color.toLowerCase()
  )
}

const isToneActive = (tone: string) => {
  return props.modelValue?.toLowerCase() === tone.toLowerCase()
}

const isDarkColor = (hex: string) => {
  if (!hex || hex === 'transparent') return false
  const { l } = hexToHsl(hex)
  return l < 50
}

const normalizeHex = (c?: string) => {
  if (!c || c === 'transparent') return '#3b82f6'
  return c
}

const selectBaseColor = (color: string) => {
  if (color !== 'transparent') {
    currentBaseColor.value = color
  }
  emit('update:modelValue', color)
  emit('change', color)
}

const selectTone = (tone: string) => {
  emit('update:modelValue', tone)
  emit('change', tone)
}

const openNativeColorPicker = () => {
  colorInputRef.value?.click()
}

const onNativeColorChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target?.value) {
    currentBaseColor.value = target.value
    emit('update:modelValue', target.value)
    emit('change', target.value)
  }
}
</script>

<style scoped lang="less">
.color-tone-picker {
  width: 236px;
  padding: 6px;
  user-select: none;
}

// 顶部选项卡胶囊
.picker-tabs-segment {
  display: flex;
  background: #f3f4f6;
  border-radius: 8px;
  padding: 3px;
  margin-bottom: 12px;

  .tab-pill {
    flex: 1;
    text-align: center;
    font-size: 13px;
    line-height: 24px;
    color: #4b5563;
    cursor: pointer;
    border-radius: 6px;
    font-weight: 500;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      color: #1f2937;
    }

    &.is-active {
      background: #ffffff;
      color: #111827;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }
  }
}

// 矩阵色块网格 (2行 x 6列)
.palette-swatches-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  margin-bottom: 14px;

  .swatch-item {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    cursor: pointer;
    position: relative;
    border: 1px solid rgba(0, 0, 0, 0.08);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    box-sizing: border-box;

    &:hover {
      transform: scale(1.12);
    }

    &.is-white {
      border: 1.5px solid var(--speed-board-border-strong, var(--ant-color-border, #d1d5db));
    }

    &.is-transparent {
      background: var(--speed-board-bg, var(--ant-color-bg-container, #ffffff));
      border: 1.5px solid var(--speed-board-border, var(--ant-color-border-secondary, #e5e7eb));
      overflow: hidden;

      .transparent-slash {
        position: absolute;
        top: 50%;
        left: -20%;
        width: 140%;
        height: 2px;
        background: var(--ant-color-error, #ef4444);
        transform: rotate(-45deg);
        transform-origin: center;
      }
    }

    &.is-active {
      box-shadow: 0 0 0 2px var(--speed-board-bg, #ffffff), 0 0 0 3.5px var(--speed-board-selection, var(--ant-color-primary, #3b82f6));
    }
  }
}

// 色彩梯度区域
.tone-gradient-section {
  margin-bottom: 14px;

  .section-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--speed-board-text, var(--ant-color-text, rgba(0, 0, 0, 0.88)));
    margin-bottom: 8px;
  }

  .tone-swatches-row {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .tone-swatch-item {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(0, 0, 0, 0.08);
      transition: transform 0.15s ease;

      &:hover {
        transform: scale(1.12);
      }

      &.is-active {
        box-shadow: 0 0 0 2px var(--speed-board-bg, #ffffff), 0 0 0 3.5px var(--speed-board-selection, var(--ant-color-primary, #3b82f6));
      }
    }
  }
}

// 自定义颜色区域
.custom-color-section {
  .section-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--speed-board-text, var(--ant-color-text, rgba(0, 0, 0, 0.88)));
    margin-bottom: 8px;
  }

  .custom-color-trigger {
    display: inline-block;
    cursor: pointer;
    position: relative;

    .rainbow-circle {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: conic-gradient(
        #ef4444,
        #f59e0b,
        #10b981,
        #06b6d4,
        #3b82f6,
        #8b5cf6,
        #ec4899,
        #ef4444
      );
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
      transition: transform 0.15s ease;

      &:hover {
        transform: scale(1.1);
      }

      .dots-label {
        color: #ffffff;
        font-weight: 900;
        font-size: 14px;
        line-height: 1;
        letter-spacing: -1px;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
      }
    }

    .hidden-color-input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
      pointer-events: none;
    }
  }
}
</style>
