<template>
  <div class="speed-board">
    <!-- 顶部状态栏与控制组 (撤销/重做/视口缩放/保存) -->
    <TopToolbar
      :board="boardInstance"
      :title="props.title"
      :show-left-toolbar="showLeftToolbar"
      :show-settings="showSettingsPanel"
      :readonly="props.readonly"
      @update:show-left-toolbar="showLeftToolbar = $event"
      @toggle-settings="showSettingsPanel = !showSettingsPanel"
      @save="onSave"
    />

    <!-- 左侧悬浮胶囊工具栏 (仅在编辑态可见) -->
    <LeftToolbar
      v-if="!props.readonly"
      :board="boardInstance"
      :icon-provider="props.iconProvider"
      :upload-config="props.uploadConfig"
      :visible="showLeftToolbar"
      :active-mode="activeMode"
      @mode-change="onToolbarModeChange"
    />

    <!-- 选区浮动工具栏 (仅在编辑态可见) -->
    <FloatingToolbar
      v-if="!props.readonly"
      :board="boardInstance"
      @open-panel="showSettingsPanel = true"
      @toggle-settings="showSettingsPanel = !showSettingsPanel"
    />

    <!-- 脑图标记快捷选择弹层 (仅在编辑态可点击切换) -->
    <MindmapMarkerQuickPicker
      v-if="!props.readonly"
      :board="boardInstance"
      :visible="showMarkerPicker"
      :target-el="markerPickerTargetEl"
      :node-id="markerPickerNodeId"
      :category="markerPickerCategory"
      :value="markerPickerValue"
      @close="showMarkerPicker = false"
    />

    <!-- 右侧属性深度设置抽屉 (仅在编辑态可用) -->
    <StyleSettingsPanel
      v-if="!props.readonly"
      v-model:visible="showSettingsPanel"
      :board="boardInstance"
    />

    <!-- 右键快捷上下文菜单 (仅在编辑态激活) -->
    <ContextMenu
      v-if="!props.readonly"
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

      <!-- 语雀 1:1 待放置鼠标虚影跟随 (仅在编辑态生效) -->
      <PlacementGhostOverlay
        v-if="!props.readonly"
        :board="boardInstance"
        :wrapper-el="canvasWrapperRef"
        :active-mode="activeMode"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted, onBeforeUnmount } from 'vue';
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
import PlacementGhostOverlay from './PlacementGhostOverlay.vue';
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
    readonly?: boolean;
  }>(),
  {
    title: '测试画板1',
    readonly: false,
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
  options: {
    ...(props.options?.options || {}),
    readonly: props.readonly,
  },
  plugins: [withDrawKit, withSpeedMind, ...(props.options?.plugins || [])],
}));

watch(
  () => props.readonly,
  (val) => {
    boardInstance.value?.setReadonly(val);
  }
);

const onBoardCreated = (board: Board) => {
  boardInstance.value = board;

  if (props.readonly) {
    board.setHandMode(true);
    activeMode.value = 'hand';
  }

  const eventEmitter = (board as any).boardWrapper || board;
  eventEmitter.on('mindmap:marker:click', (payload: any) => {
    markerPickerTargetEl.value = payload.targetEl;
    markerPickerNodeId.value = payload.nodeId;
    markerPickerCategory.value = payload.category;
    markerPickerValue.value = payload.value;
    showMarkerPicker.value = true;
  });

  eventEmitter.on('pointer:change', (pointer: any) => {
    if (pointer === PlaitPointerType.selection && activeMode.value !== 'select' && activeMode.value !== 'hand') {
      activeMode.value = 'select';
    }
  });
  eventEmitter.on('change', () => {
    if (board.pointer === PlaitPointerType.selection && activeMode.value !== 'select' && activeMode.value !== 'hand') {
      activeMode.value = 'select';
    }
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
      const lineType = payload.lineType || 'straight';
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

  if (props.readonly || !boardInstance.value) return;
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
