<template>
  <div
    ref="boardContainerRef"
    class="plait-board-container"
    :class="[
      browserClass,
      `theme-${boardInstance?.theme?.themeColorMode || 'default'}`,
      `pointer-${boardInstance?.pointer || 'selection'}`,
      {
        focused: isFocused,
        readonly: isReadonly,
      },
    ]"
    :style="props.style"
  >
    <div
      ref="viewportContainerRef"
      class="viewport-container"
      style="width: 100%; height: 100%; overflow: auto;"
    >
      <svg
        ref="hostRef"
        width="100%"
        height="100%"
        style="position: relative;"
        class="board-host-svg"
      >
        <g ref="elementLowerHostRef" class="element-lower-host" />
        <g ref="elementHostRef" class="element-host" />
        <g ref="elementUpperHostRef" class="element-upper-host" />
        <g ref="elementTopHostRef" class="element-top-host" />
      </svg>
      <svg width="100%" height="100%" class="board-active-svg">
        <g ref="activeHostRef" class="active-host-g" />
      </svg>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, type CSSProperties } from 'vue';
import rough from 'roughjs';
import {
  createSpeedPlaitBoard,
  PlaitBoard,
  type PlaitElement,
  type PlaitBoardOptions,
  type PlaitPlugin,
  type Viewport,
  type PlaitTheme,
  type PlaitSelection,
  BOARD_TO_ROUGH_SVG,
  BOARD_TO_HOST,
  BOARD_TO_ELEMENT_HOST,
  BOARD_TO_CONTEXT,
  BOARD_TO_ON_CHANGE,
  BOARD_TO_AFTER_CHANGE,
  IS_BOARD_ALIVE,
  KEY_TO_ELEMENT_MAP,
  PlaitBoardContext,
  ListRender,
  initializeViewBox,
  initializeViewportContainer,
  initializeViewportOffset,
  updateViewBox,
  updateViewportOffset,
  getSelectedElements,
  BOARD_TO_MOVING_POINT,
  BOARD_TO_MOVING_POINT_IN_BOARD,
  hasInputOrTextareaTarget,
  WritableClipboardOperationType,
  setFragment,
  isFromScrolling,
  setIsFromScrolling,
  ZOOM_STEP,
  updateViewportByScrolling,
  isFromViewportChange,
  setIsFromViewportChange,
  BoardTransforms,
  PlaitCommonElementRef,
} from '@speed-board/core';
import '../styles/plait-board.css';

export interface PlaitBoardProps {
  value?: PlaitElement[];
  options?: Partial<PlaitBoardOptions>;
  plugins?: PlaitPlugin[];
  viewport?: Viewport;
  theme?: PlaitTheme;
  style?: CSSProperties;
}

const props = withDefaults(defineProps<PlaitBoardProps>(), {
  value: () => [],
  options: () => ({}),
  plugins: () => [],
});

const emit = defineEmits<{
  (e: 'created', board: PlaitBoard): void;
  (e: 'change', data: {
    children: PlaitElement[];
    operations: any[];
    viewport: Viewport;
    selection: PlaitSelection | null;
    theme?: PlaitTheme;
  }): void;
}>();

const boardContainerRef = ref<HTMLDivElement>();
const viewportContainerRef = ref<HTMLDivElement>();
const hostRef = ref<SVGSVGElement>();
const elementLowerHostRef = ref<SVGGElement>();
const elementHostRef = ref<SVGGElement>();
const elementUpperHostRef = ref<SVGGElement>();
const elementTopHostRef = ref<SVGGElement>();
const activeHostRef = ref<SVGGElement>();

const boardInstance = ref<PlaitBoard | null>(null);
const isFocused = computed(() => (boardInstance.value ? PlaitBoard.isFocus(boardInstance.value) : false));
const isReadonly = computed(() => (boardInstance.value ? PlaitBoard.isReadonly(boardInstance.value) : false));

const browserClass = computed(() => {
  const ua = navigator.userAgent;
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'safari';
  if (/firefox/i.test(ua)) return 'firefox';
  if (/chrome/i.test(ua)) return 'chrome';
  return '';
});

let resizeObserver: ResizeObserver | null = null;
let cleanups: (() => void)[] = [];

onMounted(() => {
  if (!hostRef.value || !boardContainerRef.value || !viewportContainerRef.value) return;

  const board = createSpeedPlaitBoard({
    value: props.value,
    options: props.options,
    plugins: props.plugins,
    viewport: props.viewport,
    theme: props.theme,
  });

  const roughSVG = rough.svg(hostRef.value, {
    options: { roughness: 0, strokeWidth: 1 },
  });

  BOARD_TO_ROUGH_SVG.set(board, roughSVG);
  BOARD_TO_HOST.set(board, hostRef.value);
  IS_BOARD_ALIVE.set(board, true);
  BOARD_TO_ELEMENT_HOST.set(board, {
    lowerHost: elementLowerHostRef.value!,
    host: elementHostRef.value!,
    upperHost: elementUpperHostRef.value!,
    topHost: elementTopHostRef.value!,
    activeHost: activeHostRef.value!,
    container: boardContainerRef.value,
    viewportContainer: viewportContainerRef.value,
  });

  const context = new PlaitBoardContext();
  BOARD_TO_CONTEXT.set(board, context);
  KEY_TO_ELEMENT_MAP.set(board, new Map());

  const listRender = new ListRender(board);
  listRender.initialize(board.children, {
    board,
    parent: board,
    parentG: PlaitBoard.getElementHost(board),
  });

  initializeViewportContainer(board);
  initializeViewBox(board);
  initializeViewportOffset(board);

  // 状态与变更侦听
  BOARD_TO_ON_CHANGE.set(board, () => {
    const isOnlySetSelection =
      board.operations.length && board.operations.every((op) => op.type === 'set_selection');
    if (isOnlySetSelection) {
      listRender.update(board.children, {
        board,
        parent: board,
        parentG: PlaitBoard.getElementHost(board),
      });
      return;
    }

    const isSetViewport =
      board.operations.length && board.operations.some((op) => op.type === 'set_viewport');
    if (isSetViewport && isFromScrolling(board)) {
      setIsFromScrolling(board, false);
      listRender.update(board.children, {
        board,
        parent: board,
        parentG: PlaitBoard.getElementHost(board),
      });
      return;
    }

    listRender.update(board.children, {
      board,
      parent: board,
      parentG: PlaitBoard.getElementHost(board),
    });

    if (isSetViewport) {
      initializeViewBox(board);
    } else {
      updateViewBox(board);
    }
    updateViewportOffset(board);

    const selectedElements = getSelectedElements(board);
    selectedElements.forEach((element) => {
      const elementRef = (PlaitBoard as any).getElementRef?.(element) || (element as any).elementRef;
      elementRef?.updateActiveSection?.();
    });
  });

  BOARD_TO_AFTER_CHANGE.set(board, () => {
    emit('change', {
      children: board.children,
      operations: board.operations,
      viewport: board.viewport,
      selection: board.selection,
      theme: board.theme,
    });
  });

  // 绑定事件委托
  const host = hostRef.value;
  const viewportEl = viewportContainerRef.value;

  const onPointerDown = (e: PointerEvent) => board.pointerDown(e);
  const onPointerMove = (e: PointerEvent) => {
    BOARD_TO_MOVING_POINT_IN_BOARD.set(board, [e.x, e.y]);
    board.pointerMove(e);
  };
  const onPointerLeave = (e: PointerEvent) => {
    BOARD_TO_MOVING_POINT_IN_BOARD.delete(board);
    board.pointerLeave(e);
  };
  const onPointerUp = (e: PointerEvent) => board.pointerUp(e);
  const onDblClick = (e: MouseEvent) => {
    if (PlaitBoard.isFocus(board) && !PlaitBoard.hasBeenTextEditing(board)) {
      board.dblClick(e);
    }
  };

  const onGlobalPointerMove = (e: PointerEvent) => {
    BOARD_TO_MOVING_POINT.set(board, [e.x, e.y]);
    board.globalPointerMove(e);
  };
  const onGlobalPointerUp = (e: PointerEvent) => board.globalPointerUp(e);

  const onGlobalKeyDown = (e: KeyboardEvent) => {
    board.globalKeyDown(e);
    if (
      PlaitBoard.isFocus(board) &&
      !PlaitBoard.hasBeenTextEditing(board) &&
      !hasInputOrTextareaTarget(e.target)
    ) {
      board.keyDown(e);
    }
  };
  const onGlobalKeyUp = (e: KeyboardEvent) => {
    if (PlaitBoard.isFocus(board) && !PlaitBoard.hasBeenTextEditing(board)) {
      board.keyUp(e);
    }
  };

  const onCopy = (e: ClipboardEvent) => {
    if (PlaitBoard.isFocus(board) && !PlaitBoard.hasBeenTextEditing(board)) {
      e.preventDefault();
      setFragment(board, WritableClipboardOperationType.copy, e.clipboardData);
    }
  };

  const onScroll = (e: Event) => {
    if (isFromViewportChange(board)) {
      setIsFromViewportChange(board, false);
    } else {
      const { scrollLeft, scrollTop } = e.target as HTMLElement;
      updateViewportByScrolling(board, scrollLeft, scrollTop);
    }
  };

  const onContextMenu = (e: MouseEvent) => e.preventDefault();

  const onWheel = (e: WheelEvent) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      const { deltaY } = e;
      const zoom = board.viewport.zoom;
      const sign = Math.sign(deltaY);
      const MAX_STEP = ZOOM_STEP * 100;
      const absDelta = Math.abs(deltaY);
      let delta = deltaY;
      if (absDelta > MAX_STEP) {
        delta = MAX_STEP * sign;
      }
      let newZoom = zoom - delta / 100;
      newZoom +=
        Math.log10(Math.max(1, zoom)) *
        -sign *
        Math.min(1, absDelta / 20);
      BoardTransforms.updateZoom(board, newZoom, PlaitBoard.getMovingPointInBoard(board));
    }
  };

  host.addEventListener('pointerdown', onPointerDown);
  host.addEventListener('dblclick', onDblClick);
  viewportEl.addEventListener('pointermove', onPointerMove);
  viewportEl.addEventListener('pointerleave', onPointerLeave);
  viewportEl.addEventListener('pointerup', onPointerUp);
  viewportEl.addEventListener('scroll', onScroll);
  viewportEl.addEventListener('contextmenu', onContextMenu);
  viewportEl.addEventListener('wheel', onWheel, { passive: false });

  window.addEventListener('pointermove', onGlobalPointerMove);
  window.addEventListener('pointerup', onGlobalPointerUp);
  window.addEventListener('keydown', onGlobalKeyDown);
  window.addEventListener('keyup', onGlobalKeyUp);
  window.addEventListener('copy', onCopy);

  resizeObserver = new ResizeObserver(() => {
    initializeViewportContainer(board);
    initializeViewBox(board);
    updateViewportOffset(board);
  });
  resizeObserver.observe(boardContainerRef.value);

  cleanups.push(() => {
    host.removeEventListener('pointerdown', onPointerDown);
    host.removeEventListener('dblclick', onDblClick);
    viewportEl.removeEventListener('pointermove', onPointerMove);
    viewportEl.removeEventListener('pointerleave', onPointerLeave);
    viewportEl.removeEventListener('pointerup', onPointerUp);
    viewportEl.removeEventListener('scroll', onScroll);
    viewportEl.removeEventListener('contextmenu', onContextMenu);
    viewportEl.removeEventListener('wheel', onWheel);

    window.removeEventListener('pointermove', onGlobalPointerMove);
    window.removeEventListener('pointerup', onGlobalPointerUp);
    window.removeEventListener('keydown', onGlobalKeyDown);
    window.removeEventListener('keyup', onGlobalKeyUp);
    window.removeEventListener('copy', onCopy);

    resizeObserver?.disconnect();

    BOARD_TO_CONTEXT.delete(board);
    BOARD_TO_AFTER_CHANGE.delete(board);
    BOARD_TO_ON_CHANGE.delete(board);
    BOARD_TO_ELEMENT_HOST.delete(board);
    IS_BOARD_ALIVE.delete(board);
    BOARD_TO_HOST.delete(board);
    BOARD_TO_ROUGH_SVG.delete(board);
    KEY_TO_ELEMENT_MAP.delete(board);
  });

  boardInstance.value = board;
  emit('created', board);
});

onBeforeUnmount(() => {
  cleanups.forEach((c) => c());
  cleanups = [];
  boardInstance.value = null;
});

defineExpose({
  getBoard: (): PlaitBoard | null => boardInstance.value as PlaitBoard | null,
});
</script>
