<template>
  <div class="speed-board">
    <!-- 顶部状态栏与控制组 (撤销/重做/视口缩放/保存) -->
    <TopToolbar
      :board="boardInstance"
      :title="props.title"
      :show-left-toolbar="showLeftToolbar"
      :show-settings="showSettingsPanel"
      @update:show-left-toolbar="showLeftToolbar = $event"
      @toggle-settings="showSettingsPanel = !showSettingsPanel"
      @save="onSave"
    />

    <!-- 左侧悬浮胶囊工具栏 (选择/抓手/画笔/文本/图形库/连线/思维导图/图标) -->
    <LeftToolbar
      :board="boardInstance"
      :icon-provider="props.iconProvider"
      :upload-config="props.uploadConfig"
      :visible="showLeftToolbar"
      :active-mode="activeMode"
      @mode-change="onToolbarModeChange"
    />

    <!-- 选区浮动工具栏 (贴合所选图元的 Tip Config，支持描边/填充/连线箭头/脑图结构/更多图层对齐操作) -->
    <FloatingToolbar
      :board="boardInstance"
      @open-panel="showSettingsPanel = true"
      @toggle-settings="showSettingsPanel = !showSettingsPanel"
    />

    <!-- 脑图标记快捷选择弹层 (点击节点上的优先级/进度/旗帜时就地弹出切换) -->
    <MindmapMarkerQuickPicker
      :board="boardInstance"
      :visible="showMarkerPicker"
      :target-el="markerPickerTargetEl"
      :node-id="markerPickerNodeId"
      :category="markerPickerCategory"
      :value="markerPickerValue"
      @close="showMarkerPicker = false"
    />

    <!-- 右侧属性深度设置抽屉 -->
    <StyleSettingsPanel
      v-model:visible="showSettingsPanel"
      :board="boardInstance"
    />

    <!-- 右键快捷上下文菜单 (区分脑图节点与通用图形，右键直接选中目标) -->
    <ContextMenu
      :board="boardInstance"
      :visible="contextMenuVisible"
      :position="contextMenuPosition"
      :target-type="contextMenuTargetType"
      :target-data="contextMenuTargetData"
      @close="contextMenuVisible = false"
    />

    <!-- 主画布承载容器 (100% 纯正 Plait 原生 SVG 容器) -->
    <div
      ref="canvasWrapperRef"
      class="speed-board-canvas-wrapper"
      @contextmenu.prevent="handleContextMenu"
    >
      <BoardCanvas
        :options="mergedOptions"
        @created="onBoardCreated"
        @contextmenu="handleContextMenu"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, onMounted, onBeforeUnmount } from 'vue';
import { message } from 'ant-design-vue';
import {
  Board,
  type BoardOptions,
  PlaitPointerType,
  clearSelectedElement,
  addSelectedElement,
  toHostPoint,
  toViewBoxPoint,
  getHitElementByPoint,
} from '@speed-board/core';
import {
  withDrawKit,
  BasicShapes,
  ArrowLineShape,
  VectorLinePointerType,
  FreehandShape,
} from '@speed-board/extension-draw';
import {
  withSpeedMind,
  MindPointerType,
  findMindRootAndPath,
  setSelectedMindNodeId,
} from '@speed-board/extension-mindmap';
import { BoardCanvas } from '@speed-board/vue3';
import TopToolbar from './TopToolbar.vue';
import LeftToolbar from './LeftToolbar.vue';
import FloatingToolbar from './FloatingToolbar.vue';
import MindmapMarkerQuickPicker from './MindmapMarkerQuickPicker.vue';
import StyleSettingsPanel from './StyleSettingsPanel.vue';
import ContextMenu from './ContextMenu.vue';
import { useAntdCssVars } from 'speed-components-ui/hooks';
import type { IconProvider } from '../data/defaultIcons';
import '../style/index.less';

defineOptions({
  name: 'SpeedBoard',
});

const props = withDefaults(
  defineProps<{
    options?: Omit<BoardOptions, 'container'>;
    iconProvider?: IconProvider;
    uploadConfig?: any;
    title?: string;
  }>(),
  {
    title: '测试画板1',
  }
);

const emit = defineEmits<{
  (e: 'created', board: Board): void;
  (e: 'save'): void;
}>();

useAntdCssVars();

const boardInstance = shallowRef<Board | null>(null);
const canvasWrapperRef = ref<HTMLDivElement | null>(null);

const showLeftToolbar = ref(true);
const showSettingsPanel = ref(false);
const activeMode = ref<string>('select');

const showMarkerPicker = ref(false);
const markerPickerTargetEl = ref<HTMLElement | SVGElement | null>(null);
const markerPickerNodeId = ref<string | null>(null);
const markerPickerCategory = ref<string>('priority');
const markerPickerValue = ref<any>(null);

const mergedOptions = computed(() => ({
  ...props.options,
  plugins: [withDrawKit, withSpeedMind, ...(props.options?.plugins || [])],
}));

const onBoardCreated = (board: Board) => {
  boardInstance.value = board;

  const eventEmitter = (board as any).boardWrapper || board;
  eventEmitter.on('mindmap:marker:click', (payload: any) => {
    markerPickerTargetEl.value = payload.targetEl;
    markerPickerNodeId.value = payload.nodeId;
    markerPickerCategory.value = payload.category;
    markerPickerValue.value = payload.value;
    showMarkerPicker.value = true;
  });

  emit('created', board);
};

const onSave = () => {
  emit('save');
  message.success('画板已保存');
};

const onToolbarModeChange = (payload: {
  mode: string;
  lineType?: 'elbow' | 'straight' | 'curve';
}) => {
  activeMode.value = payload.mode;
  if (!boardInstance.value) return;

  switch (payload.mode) {
    case 'select':
      boardInstance.value.setPointer(PlaitPointerType.selection);
      break;
    case 'hand':
      boardInstance.value.setPointer(PlaitPointerType.hand);
      break;
    case 'rect':
      boardInstance.value.setPointer(BasicShapes.rectangle);
      break;
    case 'circle':
      boardInstance.value.setPointer(BasicShapes.ellipse);
      break;
    case 'diamond':
      boardInstance.value.setPointer(BasicShapes.diamond);
      break;
    case 'text':
      boardInstance.value.setPointer(BasicShapes.text);
      break;
    case 'line': {
      const lineType = payload.lineType || 'elbow';
      if (lineType === 'elbow') {
        boardInstance.value.setPointer(ArrowLineShape.elbow);
      } else if (lineType === 'curve') {
        boardInstance.value.setPointer(ArrowLineShape.curve);
      } else {
        boardInstance.value.setPointer(ArrowLineShape.straight);
      }
      break;
    }
    case 'mindmap':
    case 'mind':
      boardInstance.value.setPointer(MindPointerType.mind);
      break;
    case 'pencil':
    case 'nibPen':
      boardInstance.value.setPointer(FreehandShape.nibPen);
      break;
    case 'marker':
    case 'feltTipPen':
      boardInstance.value.setPointer(FreehandShape.feltTipPen);
      break;
    case 'eraser':
      boardInstance.value.setPointer(FreehandShape.eraser);
      break;
    case 'vector':
    case 'vectorLine':
      boardInstance.value.setPointer(VectorLinePointerType.vectorLine);
      break;
    default:
      boardInstance.value.setPointer(boardInstance.value.mapShapeToPointer(payload.mode));
      break;
  }
};

// --- 右键上下文菜单状态与事件 ---
const contextMenuVisible = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const contextMenuTargetType = ref<'mindmap' | 'element' | 'blank'>('blank');
const contextMenuTargetData = ref<any>({});

const handleContextMenu = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();

  if (!boardInstance.value) return;
  const board = boardInstance.value;
  const rawBoard = board.raw;

  const target = e.target as HTMLElement | SVGElement | null;
  const hostPoint = toHostPoint(rawBoard, e.clientX, e.clientY);
  const viewBoxPoint = toViewBoxPoint(rawBoard, hostPoint);

  // 1. 检查是否右键点击思维导图节点
  const nodeEl = target?.closest?.('.speed-mind-node-g') as HTMLElement | SVGElement | null;
  let hitNodeId = nodeEl?.getAttribute('data-node-id');
  let hitMindRoot: any = null;

  if (hitNodeId) {
    const info = findMindRootAndPath(rawBoard, hitNodeId);
    if (info) {
      hitMindRoot = info.root;
    }
  }

  if (hitNodeId && hitMindRoot) {
    // 立即选中该脑图节点
    clearSelectedElement(rawBoard);
    addSelectedElement(rawBoard, hitMindRoot);
    setSelectedMindNodeId(rawBoard, hitNodeId);
    board.emit('selection:change', { selected: [hitMindRoot] });
    (rawBoard as any).apply({ type: 'set_selection' } as any);

    contextMenuTargetType.value = 'mindmap';
    contextMenuTargetData.value = {
      nodeId: hitNodeId,
      root: hitMindRoot,
    };
    contextMenuPosition.value = { x: e.clientX, y: e.clientY };
    contextMenuVisible.value = true;
    return;
  }

  // 2. 检查是否右键命中常规图元
  const hitElement = getHitElementByPoint(rawBoard, viewBoxPoint);
  if (hitElement) {
    // 立即选中该图元
    clearSelectedElement(rawBoard);
    addSelectedElement(rawBoard, hitElement);
    board.emit('selection:change', { selected: [hitElement] });
    (rawBoard as any).apply({ type: 'set_selection' } as any);

    contextMenuTargetType.value = 'element';
    contextMenuTargetData.value = {
      element: hitElement,
    };
    contextMenuPosition.value = { x: e.clientX, y: e.clientY };
    contextMenuVisible.value = true;
    return;
  }

  // 3. 右键画板空白区域
  contextMenuTargetType.value = 'blank';
  contextMenuTargetData.value = {};
  contextMenuPosition.value = { x: e.clientX, y: e.clientY };
  contextMenuVisible.value = true;
};

// 全局层级快捷键支持 (⌘+] 置顶, ⌘+[ 置底, ⌘+Option+] 上移一层, ⌘+Option+[ 下移一层)
const onGlobalKeyDown = (e: KeyboardEvent) => {
  if (!boardInstance.value) return;
  const isInput =
    (e.target as HTMLElement)?.tagName === 'INPUT' ||
    (e.target as HTMLElement)?.tagName === 'TEXTAREA' ||
    (e.target as HTMLElement)?.isContentEditable;
  if (isInput) return;

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

  // ⌘+] 置顶 / ⌘+Option+] 上移一层
  if (cmdOrCtrl && (e.key === ']' || e.code === 'BracketRight')) {
    e.preventDefault();
    if (e.altKey) {
      boardInstance.value.bringSelectedForward();
    } else {
      boardInstance.value.bringSelectedToFront();
    }
  }

  // ⌘+[ 置底 / ⌘+Option+[ 下移一层
  if (cmdOrCtrl && (e.key === '[' || e.code === 'BracketLeft')) {
    e.preventDefault();
    if (e.altKey) {
      boardInstance.value.sendSelectedBackward();
    } else {
      boardInstance.value.sendSelectedToBack();
    }
  }
};

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeyDown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeyDown);
});
</script>

<style scoped>
.speed-board {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.speed-board-canvas-wrapper {
  flex: 1;
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}
</style>
