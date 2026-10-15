<template>
  <div class="align-setter">
    <!-- 水平对齐 3 键 -->
    <div class="setting-row">
      <span class="row-label">水平对齐</span>
      <div class="align-btn-group">
        <button
          class="align-btn"
          :class="{ 'is-active': props.align === 'left' }"
          title="左对齐"
          @click="emit('update:align', 'left')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="15" y2="12" />
            <line x1="3" y1="18" x2="18" y2="18" />
          </svg>
        </button>
        <button
          class="align-btn"
          :class="{ 'is-active': props.align === 'center' }"
          title="居中对齐"
          @click="emit('update:align', 'center')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="6" y1="12" x2="18" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
        <button
          class="align-btn"
          :class="{ 'is-active': props.align === 'right' }"
          title="右对齐"
          @click="emit('update:align', 'right')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="9" y1="12" x2="21" y2="12" />
            <line x1="6" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 垂直对齐 3 键 -->
    <div class="setting-row">
      <span class="row-label">垂直对齐</span>
      <div class="align-btn-group">
        <button
          class="align-btn"
          :class="{ 'is-active': props.verticalAlign === 'top' }"
          title="顶部对齐"
          @click="emit('update:verticalAlign', 'top')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="4" y1="4" x2="20" y2="4" stroke-width="2.5" />
            <path d="M12 7v13M8 11l4-4 4 4" />
          </svg>
        </button>
        <button
          class="align-btn"
          :class="{ 'is-active': props.verticalAlign === 'middle' }"
          title="垂直居中"
          @click="emit('update:verticalAlign', 'middle')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="4" y1="12" x2="20" y2="12" stroke-width="2.5" />
            <path d="M12 5v14M8 8l4-3 4 3M8 16l4 3 4-3" />
          </svg>
        </button>
        <button
          class="align-btn"
          :class="{ 'is-active': props.verticalAlign === 'bottom' }"
          title="底部对齐"
          @click="emit('update:verticalAlign', 'bottom')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="4" y1="20" x2="20" y2="20" stroke-width="2.5" />
            <path d="M12 17V4M8 13l4 4 4-4" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    align?: 'left' | 'center' | 'right' | 'justify'
    verticalAlign?: 'top' | 'middle' | 'bottom'
  }>(),
  {
    align: 'left',
    verticalAlign: 'middle',
  }
)

const emit = defineEmits<{
  (e: 'update:align', val: 'left' | 'center' | 'right'): void
  (e: 'update:verticalAlign', val: 'top' | 'middle' | 'bottom'): void
}>()
</script>

<style scoped>
.align-setter {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.row-label {
  font-size: 12px;
  color: #6b7280;
}

.align-btn-group {
  display: flex;
  align-items: center;
  background-color: #f3f4f6;
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}

.align-btn {
  width: 28px;
  height: 24px;
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

.align-btn:hover {
  background-color: #e5e7eb;
  color: #111827;
}

.align-btn.is-active {
  background-color: #ffffff;
  color: #10b981;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}
</style>
