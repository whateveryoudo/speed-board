<template>
  <teleport to="body">
    <!-- 右键菜单遮罩层 (点击任意区域关闭菜单) -->
    <div
      v-if="props.visible"
      class="speed-board-context-menu-mask"
      @mousedown="onMaskMouseDown"
      @contextmenu.prevent="onMaskMouseDown"
    />

    <!-- 右键菜单主体容器 -->
    <div
      v-if="props.visible"
      ref="menuRef"
      class="speed-board-context-menu"
      :style="menuStyle"
      @mousedown.stop
      @contextmenu.prevent
    >
      <template v-for="(item, idx) in menuItems" :key="item.key || idx">
        <!-- 分割线 -->
        <div v-if="item.type === 'divider'" class="context-menu-divider" />

        <!-- 菜单条目 -->
        <div
          v-else
          :ref="(el) => setItemRef(item.key, el)"
          class="context-menu-item"
          :class="{
            'is-disabled': item.disabled,
            'has-submenu': Boolean(item.children?.length),
          }"
          @mouseenter="onItemMouseEnter(item.key, Boolean(item.children?.length))"
          @mouseleave="onItemMouseLeave(item.key)"
          @click="onItemClick(item)"
        >
          <span class="item-label">{{ item.label }}</span>

          <div class="item-right-meta">
            <span v-if="item.shortcut" class="item-shortcut">{{ item.shortcut }}</span>
            <svg
              v-if="item.children?.length"
              class="item-arrow"
              viewBox="0 0 24 24"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>

          <!-- 子菜单 (Submenu) -->
          <div
            v-if="item.children?.length && activeSubmenu === item.key && !item.disabled"
            ref="submenuRef"
            class="context-submenu"
            :style="submenuStyle"
          >
            <template v-for="(subItem, subIdx) in item.children" :key="subItem.key || subIdx">
              <div v-if="subItem.type === 'divider'" class="context-menu-divider" />
              <div
                v-else
                class="context-menu-item"
                :class="{ 'is-disabled': subItem.disabled }"
                @click.stop="onItemClick(subItem)"
              >
                <span class="item-label">{{ subItem.label }}</span>
                <span v-if="subItem.shortcut" class="item-shortcut">{{ subItem.shortcut }}</span>
              </div>
            </template>
          </div>
        </div>
      </template>
    </div>

    <!-- 隐藏的文件上传 input (用于插入节点图片) -->
    <input
      ref="imageInputRef"
      type="file"
      accept="image/*"
      style="display: none"
      @change="onImageFileChange"
    />

    <!-- 插入/编辑链接弹窗 -->
    <a-modal
      v-model:open="linkModalVisible"
      title="插入链接"
      :width="420"
      ok-text="确认"
      cancel-text="取消"
      @ok="confirmInsertLink"
    >
      <div style="padding: 12px 0">
        <a-input
          v-model:value="linkInputUrl"
          placeholder="请输入 URL 链接 (如 https://...)"
          allow-clear
          autofocus
          @press-enter="confirmInsertLink"
        />
      </div>
    </a-modal>

    <!-- 插入/编辑备注弹窗 -->
    <a-modal
      v-model:open="noteModalVisible"
      title="编辑备注"
      :width="460"
      ok-text="确认"
      cancel-text="取消"
      @ok="confirmInsertNote"
    >
      <div style="padding: 12px 0">
        <a-textarea
          v-model:value="noteInputText"
          placeholder="请输入节点备注信息..."
          :rows="4"
          allow-clear
          autofocus
        />
      </div>
    </a-modal>
  </teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { message } from 'ant-design-vue';
import {
  computePosition,
  offset as floatingOffset,
  flip as floatingFlip,
  shift as floatingShift,
  type VirtualElement,
} from '@floating-ui/dom';
import {
  type Board,
  Transforms,
  CoreTransforms,
  getSelectedElements,
  toImage,
  downloadImage,
} from '@speed-board/core';
import {
  addChildNode,
  addSiblingNode,
  addParentNode,
  deleteNode,
  toggleCollapse,
  findMindRootAndPath,
  findNodeById,
  editMindNodeTopic,
  updateNodeData,
  copyNodeAsText,
  copyNodeAsMarkdown,
  cloneTreeWithNewIds,
  type SpeedMindElement,
} from '@speed-board/extension-mindmap';
import {
  setBoardClipboard,
  getBoardClipboard,
  hasBoardClipboard,
} from '../utils/boardClipboard';

interface MenuItem {
  key?: string;
  label?: string;
  shortcut?: string;
  type?: 'divider' | 'item';
  disabled?: boolean;
  children?: MenuItem[];
  action?: () => void;
}

const props = defineProps<{
  board: Board | null;
  visible: boolean;
  position: { x: number; y: number };
  targetType: 'mindmap' | 'element' | 'blank';
  targetData?: any;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const menuRef = ref<HTMLDivElement | null>(null);
const imageInputRef = ref<HTMLInputElement | null>(null);
const activeSubmenu = ref<string | null>(null);

// 链接 Modal 状态
const linkModalVisible = ref(false);
const linkInputUrl = ref('');

// 备注 Modal 状态
const noteModalVisible = ref(false);
const noteInputText = ref('');

// 主菜单位置状态与样式（基于 @floating-ui/dom 精准计算与防溢出保护）
const menuPosition = ref<{ x: number; y: number }>({
  x: props.position.x,
  y: props.position.y,
});

const menuStyle = computed(() => ({
  left: `${menuPosition.value.x}px`,
  top: `${menuPosition.value.y}px`,
}));

// 二级子菜单定位元素与样式管理
const itemRefs = new Map<string, HTMLElement>();
const submenuRef = ref<HTMLDivElement | null>(null);
const submenuStyle = ref<Record<string, string>>({
  position: 'fixed',
  visibility: 'hidden',
});

const setItemRef = (key: string | undefined, el: any) => {
  if (key && el) {
    itemRefs.set(key, el as HTMLElement);
  } else if (key) {
    itemRefs.delete(key);
  }
};

const updateMainMenuPosition = async () => {
  if (!props.visible) return;
  await nextTick();
  if (!menuRef.value) return;

  const virtualEl: VirtualElement = {
    getBoundingClientRect() {
      return {
        x: props.position.x,
        y: props.position.y,
        top: props.position.y,
        left: props.position.x,
        bottom: props.position.y,
        right: props.position.x,
        width: 0,
        height: 0,
      };
    },
  };

  try {
    const { x, y } = await computePosition(virtualEl, menuRef.value, {
      placement: 'bottom-start',
      strategy: 'fixed',
      middleware: [
        floatingFlip({
          fallbackPlacements: ['top-start', 'bottom-end', 'top-end'],
        }),
        floatingShift({
          padding: 8,
        }),
      ],
    });

    menuPosition.value = { x: Math.round(x), y: Math.round(y) };
  } catch (err) {
    console.error('Failed to compute context menu position', err);
  }
};

const updateSubmenuPosition = async (key: string) => {
  const parentItemEl = itemRefs.get(key);
  if (!parentItemEl) return;
  await nextTick();
  if (!submenuRef.value) return;

  try {
    const { x, y } = await computePosition(parentItemEl, submenuRef.value, {
      placement: 'right-start',
      strategy: 'fixed',
      middleware: [
        floatingOffset({ mainAxis: 2, crossAxis: -4 }),
        floatingFlip({
          fallbackPlacements: ['left-start', 'right-end', 'left-end'],
        }),
        floatingShift({
          padding: 8,
        }),
      ],
    });

    submenuStyle.value = {
      position: 'fixed',
      left: `${Math.round(x)}px`,
      top: `${Math.round(y)}px`,
      margin: '0',
      visibility: 'visible',
    };
  } catch (err) {
    console.error('Failed to compute submenu position', err);
  }
};

// 监听菜单打开或坐标变化，动态计算自适应位置
watch(
  () => [props.visible, props.position.x, props.position.y],
  ([vis]) => {
    if (vis) {
      // 快速初始定位，防止第一帧跳变闪烁
      const menuWidth = 175;
      const menuHeight = props.targetType === 'mindmap' ? 360 : 250;
      const initialX = Math.min(props.position.x, window.innerWidth - menuWidth - 8);
      const initialY = Math.min(props.position.y, window.innerHeight - menuHeight - 8);
      menuPosition.value = {
        x: Math.max(8, initialX),
        y: Math.max(8, initialY),
      };
      updateMainMenuPosition();
    } else {
      activeSubmenu.value = null;
      submenuStyle.value = {
        position: 'fixed',
        visibility: 'hidden',
      };
    }
  },
  { immediate: true }
);

// 画布滚动、窗口缩放时立即收起右键菜单（对标语雀标准）
const handleClose = () => {
  emit('close');
};

watch(
  () => props.board,
  (b, oldB) => {
    if (oldB) {
      oldB.off('viewport:scroll', handleClose);
    }
    if (b) {
      b.on('viewport:scroll', handleClose);
    }
  },
  { immediate: true }
);

onMounted(() => {
  window.addEventListener('resize', handleClose);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleClose);
  if (props.board) {
    props.board.off('viewport:scroll', handleClose);
  }
});

// 获取当前选中节点/元素相关信息
const selectedMindNode = computed<SpeedMindElement | null>(() => {
  if (props.targetType !== 'mindmap' || !props.targetData?.nodeId || !props.targetData?.root) {
    return null;
  }
  return findNodeById(props.targetData.root, props.targetData.nodeId);
});

const isMindRoot = computed(() => {
  if (!selectedMindNode.value || !props.targetData?.root) return false;
  return selectedMindNode.value.id === props.targetData.root.id;
});

const isMindCollapsed = computed(() => {
  return Boolean(selectedMindNode.value?.isCollapsed);
});

const mindHasChildren = computed(() => {
  return Boolean(selectedMindNode.value?.children && selectedMindNode.value.children.length > 0);
});

// 构建菜单配置项
const menuItems = computed<MenuItem[]>(() => {
  const hasClipboard = hasBoardClipboard();

  // 1. 思维导图节点右键菜单 (对标截图 2)
  if (props.targetType === 'mindmap') {
    return [
      {
        key: 'insert',
        label: '插入',
        children: [
          {
            key: 'insert-child',
            label: '子级',
            shortcut: 'Tab',
            action: handleInsertChild,
          },
          {
            key: 'insert-parent',
            label: '父级',
            shortcut: 'Shift+Tab',
            disabled: isMindRoot.value,
            action: handleInsertParent,
          },
          {
            key: 'insert-sibling',
            label: '同级',
            shortcut: 'Enter',
            action: handleInsertSibling,
          },
          { type: 'divider' },
          {
            key: 'insert-link',
            label: '链接',
            shortcut: '⌘+K',
            action: handleOpenLinkModal,
          },
          {
            key: 'insert-image',
            label: '图片',
            action: handleTriggerImageUpload,
          },
          {
            key: 'insert-note',
            label: '备注',
            action: handleOpenNoteModal,
          },
        ],
      },
      {
        key: 'toggle-collapse',
        label: isMindCollapsed.value ? '展开' : '折叠',
        shortcut: '⌘+/',
        disabled: !mindHasChildren.value,
        action: handleToggleCollapse,
      },
      { type: 'divider' },
      {
        key: 'cut',
        label: '剪切',
        shortcut: '⌘+X',
        disabled: isMindRoot.value,
        action: handleCut,
      },
      {
        key: 'copy',
        label: '复制',
        shortcut: '⌘+C',
        action: handleCopy,
      },
      {
        key: 'copy-as',
        label: '复制为其它格式',
        children: [
          {
            key: 'copy-as-text',
            label: '纯文本',
            action: handleCopyAsText,
          },
          {
            key: 'copy-as-markdown',
            label: 'Markdown',
            action: handleCopyAsMarkdown,
          },
        ],
      },
      {
        key: 'paste',
        label: '粘贴',
        shortcut: '⌘+V',
        disabled: !hasClipboard,
        action: handlePaste,
      },
      { type: 'divider' },
      {
        key: 'save-image',
        label: '另存为图片',
        action: handleSaveAsImage,
      },
      {
        key: 'delete',
        label: '删除',
        shortcut: 'Delete',
        action: handleDelete,
      },
    ];
  }

  // 2. 常规图形节点右键菜单 (对标截图 1，素材库先不做)
  if (props.targetType === 'element') {
    return [
      {
        key: 'cut',
        label: '剪切',
        shortcut: '⌘+X',
        action: handleCut,
      },
      {
        key: 'copy',
        label: '复制',
        shortcut: '⌘+C',
        action: handleCopy,
      },
      {
        key: 'paste',
        label: '粘贴',
        shortcut: '⌘+V',
        disabled: !hasClipboard,
        action: handlePaste,
      },
      { type: 'divider' },
      {
        key: 'save-image',
        label: '另存为图片',
        action: handleSaveAsImage,
      },
      {
        key: 'layer',
        label: '层级',
        children: [
          {
            key: 'layer-top',
            label: '置顶',
            shortcut: '⌘+]',
            action: () => props.board?.bringSelectedToFront(),
          },
          {
            key: 'layer-bottom',
            label: '置底',
            shortcut: '⌘+[',
            action: () => props.board?.sendSelectedToBack(),
          },
          {
            key: 'layer-up',
            label: '上移一层',
            shortcut: '⌘+Option+]',
            action: () => props.board?.bringSelectedForward(),
          },
          {
            key: 'layer-down',
            label: '下移一层',
            shortcut: '⌘+Option+[',
            action: () => props.board?.sendSelectedBackward(),
          },
        ],
      },
      { type: 'divider' },
      {
        key: 'delete',
        label: '删除',
        shortcut: 'Delete',
        action: handleDelete,
      },
    ];
  }

  // 3. 画板空白区域右键菜单
  return [
    {
      key: 'paste',
      label: '粘贴',
      shortcut: '⌘+V',
      disabled: !hasClipboard,
      action: handlePaste,
    },
    {
      key: 'save-image-all',
      label: '另存为图片',
      action: handleSaveAsImage,
    },
  ];
});

// --- 交互与事件处理 ---
const onMaskMouseDown = () => {
  emit('close');
};

const onItemMouseEnter = (key?: string, hasChildren?: boolean) => {
  if (key) {
    activeSubmenu.value = key;
    if (hasChildren) {
      submenuStyle.value = {
        position: 'fixed',
        visibility: 'hidden',
      };
      updateSubmenuPosition(key);
    }
  }
};

const onItemMouseLeave = (key?: string) => {
  // 保持顺滑移动，不立即关闭
};

const onItemClick = (item: MenuItem) => {
  if (item.disabled) return;
  if (item.action) {
    item.action();
    emit('close');
  }
};

// --- 思维导图操作 ---
function handleInsertChild() {
  if (!props.board || !props.targetData?.nodeId) return;
  const rawBoard = props.board.raw;
  const nodeId = props.targetData.nodeId;
  const info = findMindRootAndPath(rawBoard, nodeId);
  if (!info) return;

  const res = addChildNode(info.root, nodeId, '分支主题');
  if (res) {
    Transforms.setNode(rawBoard, { children: res.clonedRoot.children }, info.path);
    setTimeout(() => editMindNodeTopic(rawBoard, res.newChild.id), 30);
  }
}

function handleInsertParent() {
  if (!props.board || !props.targetData?.nodeId || isMindRoot.value) return;
  const rawBoard = props.board.raw;
  const nodeId = props.targetData.nodeId;
  const info = findMindRootAndPath(rawBoard, nodeId);
  if (!info) return;

  const res = addParentNode(info.root, nodeId, '父主题');
  if (res) {
    Transforms.setNode(rawBoard, { children: res.clonedRoot.children }, info.path);
    setTimeout(() => editMindNodeTopic(rawBoard, res.newParent.id), 30);
  }
}

function handleInsertSibling() {
  if (!props.board || !props.targetData?.nodeId) return;
  const rawBoard = props.board.raw;
  const nodeId = props.targetData.nodeId;
  const info = findMindRootAndPath(rawBoard, nodeId);
  if (!info) return;

  const res = isMindRoot.value
    ? addChildNode(info.root, nodeId, '分支主题')
    : addSiblingNode(info.root, nodeId, '分支主题');

  if (res) {
    const newId = (res as any).newChild?.id || (res as any).newSibling?.id;
    Transforms.setNode(rawBoard, { children: res.clonedRoot.children }, info.path);
    if (newId) {
      setTimeout(() => editMindNodeTopic(rawBoard, newId), 30);
    }
  }
}

function handleToggleCollapse() {
  if (!props.board || !props.targetData?.nodeId) return;
  const rawBoard = props.board.raw;
  const nodeId = props.targetData.nodeId;
  const info = findMindRootAndPath(rawBoard, nodeId);
  if (!info) return;

  const res = toggleCollapse(info.root, nodeId);
  if (res) {
    Transforms.setNode(rawBoard, { children: res.clonedRoot.children }, info.path);
  }
}

// 链接处理
function handleOpenLinkModal() {
  linkInputUrl.value = selectedMindNode.value?.data?.link || '';
  linkModalVisible.value = true;
}

function confirmInsertLink() {
  if (!props.board || !props.targetData?.nodeId) return;
  const rawBoard = props.board.raw;
  const nodeId = props.targetData.nodeId;
  const info = findMindRootAndPath(rawBoard, nodeId);
  if (!info) return;

  const url = linkInputUrl.value.trim();
  const updatedRoot = updateNodeData(info.root, nodeId, { link: url || undefined });
  Transforms.setNode(
    rawBoard,
    { children: updatedRoot.children, data: updatedRoot.data },
    info.path
  );
  linkModalVisible.value = false;
  message.success(url ? '已设置链接' : '已清除链接');
}

// 图片处理
function handleTriggerImageUpload() {
  imageInputRef.value?.click();
}

function onImageFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result as string;
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth || 120;
      let h = img.naturalHeight || 80;
      const MAX_W = 180;
      const MAX_H = 120;
      const ratio = Math.min(MAX_W / w, MAX_H / h, 1);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);

      if (!props.board || !props.targetData?.nodeId) return;
      const rawBoard = props.board.raw;
      const nodeId = props.targetData.nodeId;
      const info = findMindRootAndPath(rawBoard, nodeId);
      if (!info) return;

      const updatedRoot = updateNodeData(info.root, nodeId, {
        image: { url: dataUrl, width: w, height: h },
      });
      Transforms.setNode(
        rawBoard,
        { children: updatedRoot.children, data: updatedRoot.data },
        info.path
      );
      message.success('已插入图片');
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
  (e.target as HTMLInputElement).value = '';
}

// 备注处理
function handleOpenNoteModal() {
  noteInputText.value = selectedMindNode.value?.data?.note || '';
  noteModalVisible.value = true;
}

function confirmInsertNote() {
  if (!props.board || !props.targetData?.nodeId) return;
  const rawBoard = props.board.raw;
  const nodeId = props.targetData.nodeId;
  const info = findMindRootAndPath(rawBoard, nodeId);
  if (!info) return;

  const text = noteInputText.value.trim();
  const updatedRoot = updateNodeData(info.root, nodeId, { note: text || undefined });
  Transforms.setNode(
    rawBoard,
    { children: updatedRoot.children, data: updatedRoot.data },
    info.path
  );
  noteModalVisible.value = false;
  message.success(text ? '已保存备注' : '已清除备注');
}

// --- 剪切 / 复制 / 粘贴 / 导出 ---
function handleCopy() {
  if (props.targetType === 'mindmap' && selectedMindNode.value) {
    setBoardClipboard({
      type: 'mindmap',
      mindNode: selectedMindNode.value,
    });
    message.success('已复制节点');
    return;
  }

  if (props.board && props.targetType === 'element') {
    const selected = getSelectedElements(props.board.raw);
    if (selected.length > 0) {
      setBoardClipboard({
        type: 'elements',
        elements: JSON.parse(JSON.stringify(selected)),
      });
      message.success('已复制图形');
    }
  }
}

function handleCut() {
  handleCopy();
  handleDelete();
}

function handleCopyAsText() {
  if (!selectedMindNode.value) return;
  const text = copyNodeAsText(selectedMindNode.value);
  navigator.clipboard.writeText(text).then(() => {
    message.success('已复制为纯文本');
  });
}

function handleCopyAsMarkdown() {
  if (!selectedMindNode.value) return;
  const md = copyNodeAsMarkdown(selectedMindNode.value);
  navigator.clipboard.writeText(md).then(() => {
    message.success('已复制为 Markdown');
  });
}

function handlePaste() {
  const clip = getBoardClipboard();
  if (!clip || !props.board) return;
  const rawBoard = props.board.raw;

  // 1. 如果在思维导图节点上粘贴
  if (props.targetType === 'mindmap' && props.targetData?.nodeId && clip.mindNode) {
    const nodeId = props.targetData.nodeId;
    const info = findMindRootAndPath(rawBoard, nodeId);
    if (!info) return;

    const clonedBranch = cloneTreeWithNewIds(clip.mindNode);
    const parentNode = findNodeById(info.root, nodeId);
    if (!parentNode) return;

    if (!parentNode.children) parentNode.children = [];
    parentNode.children.push(clonedBranch);

    Transforms.setNode(rawBoard, { children: info.root.children }, info.path);
    message.success('已粘贴子节点');
    return;
  }

  // 2. 在画布上或常规图元粘贴
  if (clip.elements && clip.elements.length > 0) {
    const clones = clip.elements.map((el) => {
      const clone = JSON.parse(JSON.stringify(el));
      delete clone.id;
      if (Array.isArray(clone.points)) {
        clone.points = clone.points.map((p: [number, number]) => [p[0] + 30, p[1] + 30]);
      }
      return clone;
    });

    clones.forEach((clone) => {
      Transforms.insertNode(rawBoard, clone, [rawBoard.children.length]);
    });
    message.success('已粘贴图形');
  }
}

async function handleSaveAsImage() {
  if (!props.board) return;
  const rawBoard = props.board.raw;

  try {
    const selected = getSelectedElements(rawBoard);
    const dataUrl = await toImage(rawBoard, {
      elements: selected.length > 0 ? selected : undefined,
      padding: 20,
    });

    if (dataUrl) {
      downloadImage(dataUrl, 'speed-board-export.png');
      message.success('已导出为图片');
    } else {
      message.warning('导出图片失败');
    }
  } catch (e) {
    console.error('[Export Image Error]', e);
    message.error('导出失败，请重试');
  }
}

function handleDelete() {
  if (!props.board) return;
  const rawBoard = props.board.raw;

  if (props.targetType === 'mindmap' && props.targetData?.nodeId) {
    const nodeId = props.targetData.nodeId;
    const info = findMindRootAndPath(rawBoard, nodeId);
    if (!info) return;

    if (isMindRoot.value) {
      // 根节点删除：移除整棵思维导图
      CoreTransforms.removeElements(rawBoard, [info.root]);
      message.info('已删除思维导图');
      return;
    }

    const res = deleteNode(info.root, nodeId);
    if (res.deleted) {
      Transforms.setNode(rawBoard, { children: res.clonedRoot.children }, info.path);
      message.info('已删除节点');
    }
    return;
  }

  // 常规图形删除
  props.board.deleteSelected();
}
</script>

<style scoped>
.speed-board-context-menu-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1040;
  background: transparent;
}

.speed-board-context-menu {
  position: fixed;
  z-index: 1050;
  min-width: 170px;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06);
  padding: 4px 0;
  user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  animation: contextMenuFadeIn 0.12s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes contextMenuFadeIn {
  from {
    opacity: 0;
    transform: scale(0.97);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.context-menu-divider {
  height: 1px;
  background-color: #f3f4f6;
  margin: 4px 0;
}

.context-menu-item {
  position: relative;
  height: 32px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #1f2937;
  cursor: pointer;
  transition: background-color 0.1s ease;
}

.context-menu-item:hover:not(.is-disabled) {
  background-color: #f3f4f6;
}

.context-menu-item.is-disabled {
  color: #d1d5db;
  cursor: not-allowed;
}

.item-label {
  flex: 1;
  text-align: left;
  white-space: nowrap;
}

.item-right-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 16px;
}

.item-shortcut {
  font-size: 12px;
  color: #9ca3af;
  white-space: nowrap;
}

.item-arrow {
  color: #9ca3af;
}

/* 子菜单样式 (定位通过 @floating-ui/dom 动态控制) */
.context-submenu {
  min-width: 150px;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06);
  padding: 4px 0;
  z-index: 1060;
  user-select: none;
  animation: contextMenuFadeIn 0.12s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
