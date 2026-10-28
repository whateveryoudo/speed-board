import {
  PlaitBoard,
  BoardTransforms,
  Transforms,
  ElementFlavour,
  type OnContextChanged,
  type PlaitPluginElementContext,
  PlaitPointerType,
  toHostPoint,
  toViewBoxPoint,
  getSelectedElements,
  clearSelectedElement,
  addSelectedElement,
  type PlaitPlugin,
  type PlaitElement,
} from '@plait/core';
import isHotkey from 'is-hotkey';
import type { SpeedMindElement, NodeLayoutBox } from '../types';
import { createEmptyMindmap } from '../model/createMindmap';
import {
  addChildNode,
  addSiblingNode,
  deleteNode,
  toggleCollapse,
} from '../model/treeOps';
import { computeMindLayout, type ComputedMindLayout } from '../layout/mindLayout';
import { renderBranchLinksSvg } from '../renderer/drawLinks';
import { renderNodeSvg } from '../renderer/drawNode';
import { renderNodeHandlesSvg } from '../renderer/drawHandles';
import { openMindmapInlineEditor } from '../renderer/inlineEditor';

const isEnterHotkey = isHotkey('enter');
const isTabHotkey = isHotkey('tab');
const isSpaceHotkey = isHotkey('space');
const isDeleteHotkey = isHotkey('delete');
const isBackspaceHotkey = isHotkey('backspace');

export const MINDMAP_ELEMENT_TYPE = 'mind';

export function isSpeedMind(element: any): element is SpeedMindElement {
  if (!element) return false;
  return (
    element.type === MINDMAP_ELEMENT_TYPE ||
    element.type === 'speed-mind' ||
    Boolean(element.isRoot && element.data?.topic)
  );
}

// 缓存布局结果，避免重复计算
const layoutCache = new WeakMap<SpeedMindElement, ComputedMindLayout>();

export function getMindLayout(element: SpeedMindElement): ComputedMindLayout {
  let cached = layoutCache.get(element);
  if (!cached) {
    cached = computeMindLayout(element);
    layoutCache.set(element, cached);
  }
  return cached;
}

export function clearMindLayoutCache(element: SpeedMindElement): void {
  layoutCache.delete(element);
}

/**
 * 原生 Plait 元素渲染组件：完美集成 Plait 生命周期、选区与渲染流水线
 */
export class SpeedMindComponent
  extends ElementFlavour<SpeedMindElement, PlaitBoard>
  implements OnContextChanged<SpeedMindElement, PlaitBoard>
{
  initialize(): void {
    super.initialize();
    this.renderMind();
  }

  onContextChanged(
    _value: PlaitPluginElementContext<SpeedMindElement, PlaitBoard>,
    _previous: PlaitPluginElementContext<SpeedMindElement, PlaitBoard>
  ): void {
    this.renderMind();
  }

  renderMind(): void {
    const g = this.getElementG();
    while (g.firstChild) {
      g.removeChild(g.firstChild);
    }

    clearMindLayoutCache(this.element);
    const layout = getMindLayout(this.element);

    // 1. 绘制连线
    const rootBox = layout.nodes[0];
    if (rootBox) {
      const linksG = renderBranchLinksSvg(rootBox, this.element);
      g.appendChild(linksG);
    }

    // 2. 绘制节点与手柄
    const isMindSelected = Boolean(this.selected);
    const selectedNodeId =
      this.element.selectedNodeId || (isMindSelected ? this.element.id : null);

    for (const box of layout.nodes) {
      const isNodeSelected = isMindSelected && selectedNodeId === box.id;
      const nodeG = renderNodeSvg(box, this.element, isNodeSelected);
      g.appendChild(nodeG);

      const handlesG = renderNodeHandlesSvg(box, this.element, isNodeSelected);
      if (handlesG) {
        g.appendChild(handlesG);
      }
    }
  }
}

export const withSpeedMind: PlaitPlugin = (board: PlaitBoard) => {
  const { drawElement, getRectangle, isHit, pointerDown, dblClick, keyDown } = board;

  const syncElementChange = (element: SpeedMindElement) => {
    clearMindLayoutCache(element);
    try {
      const path = PlaitBoard.findPath(board, element);
      if (path && path.length > 0) {
        Transforms.setNode(board, { ...element }, path);
      }
    } catch {
      // 容错
    }
    const wrapper = (board as any).boardWrapper;
    wrapper?.emit?.('change', {});
  };

  // 1. 接管思维导图元素渲染
  board.drawElement = (context: PlaitPluginElementContext) => {
    if (isSpeedMind(context.element)) {
      return SpeedMindComponent as any;
    }
    return drawElement(context);
  };

  // 2. 接管包围盒计算（绝不打印 mind element has not been mounted 报错）
  board.getRectangle = (element: PlaitElement) => {
    if (isSpeedMind(element)) {
      const layout = getMindLayout(element);
      // 如果指定了选中节点，返回该节点的包围盒供气泡定位
      if (element.selectedNodeId) {
        const nodeBox = layout.nodeMap.get(element.selectedNodeId);
        if (nodeBox) {
          return {
            x: nodeBox.x,
            y: nodeBox.y,
            width: nodeBox.width,
            height: nodeBox.height,
          };
        }
      }
      return {
        x: layout.bounds.x,
        y: layout.bounds.y,
        width: layout.bounds.width,
        height: layout.bounds.height,
      };
    }
    return getRectangle(element);
  };

  // 3. 命中检测
  board.isHit = (element: PlaitElement, point: [number, number]) => {
    if (isSpeedMind(element)) {
      const layout = getMindLayout(element);
      const [px, py] = point;
      for (const box of layout.nodes) {
        if (
          px >= box.x - 12 &&
          px <= box.x + box.width + 12 &&
          py >= box.y - 6 &&
          py <= box.y + box.height + 6
        ) {
          return true;
        }
      }
      return false;
    }
    return isHit(element, point);
  };

  // 4. 指针按下事件（支持工具栏创建、手柄点击、节点选中）
  board.pointerDown = (event: PointerEvent) => {
    // 4.1 点击画布新建思维导图
    const isMindTool =
      PlaitBoard.isPointer(board, 'mind') || PlaitBoard.isPointer(board, 'mindmap');
    if (!PlaitBoard.isReadonly(board) && isMindTool) {
      event.preventDefault();
      const point = toViewBoxPoint(board, toHostPoint(board, event.x, event.y));
      const newMind = createEmptyMindmap('思维导图', {
        points: [[point[0] - 55, point[1] - 21]],
      });

      Transforms.insertNode(board, newMind, [board.children.length]);
      BoardTransforms.updatePointerType(board, PlaitPointerType.selection);
      clearSelectedElement(board);
      addSelectedElement(board, newMind);
      newMind.selectedNodeId = newMind.id;

      const wrapper = (board as any).boardWrapper;
      wrapper?.setPointer?.(PlaitPointerType.selection);
      wrapper?.emit?.('change', {});
      wrapper?.emit?.('selection:change', { selected: [newMind] });
      return;
    }

    // 4.2 检查是否点击了节点的操作手柄 (toggle-collapse 或 add-child)
    const target = event.target as HTMLElement | SVGElement | null;
    const handleEl = target?.closest?.('[data-action]') as HTMLElement | null;
    if (handleEl) {
      const action = handleEl.getAttribute('data-action');
      const nodeId = handleEl.getAttribute('data-node-id');
      const selected = getSelectedElements(board).find(isSpeedMind);

      if (selected && nodeId) {
        event.preventDefault();
        event.stopPropagation();

        if (action === 'toggle-collapse') {
          toggleCollapse(selected, nodeId);
          syncElementChange(selected);
          return;
        }

        if (action === 'add-child') {
          const newChild = addChildNode(selected, nodeId);
          if (newChild) {
            selected.selectedNodeId = newChild.id;
            syncElementChange(selected);

            // 立即进入新节点编辑
            setTimeout(() => {
              const layout = getMindLayout(selected);
              const childBox = layout.nodeMap.get(newChild.id);
              if (childBox) {
                openMindmapInlineEditor(board, childBox, selected, () => {
                  syncElementChange(selected);
                });
              }
            }, 50);
          }
          return;
        }
      }
    }

    // 4.3 检查是否点击了某个导图节点
    const nodeEl = target?.closest?.('.speed-mindmap-node') as HTMLElement | null;
    if (nodeEl) {
      const nodeId = nodeEl.getAttribute('data-node-id');
      const mindElement = (board.children as PlaitElement[]).find(isSpeedMind);

      if (mindElement && nodeId) {
        mindElement.selectedNodeId = nodeId;
        clearSelectedElement(board);
        addSelectedElement(board, mindElement);
        (board as any).boardWrapper?.emit?.('selection:change', { selected: [mindElement] });
      }
    }

    pointerDown(event);
  };

  // 5. 双击节点进入内联编辑
  board.dblClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | SVGElement | null;
    const nodeEl = target?.closest?.('.speed-mindmap-node') as HTMLElement | null;
    if (nodeEl && !PlaitBoard.isReadonly(board)) {
      const nodeId = nodeEl.getAttribute('data-node-id');
      const mindElement = (board.children as PlaitElement[]).find(isSpeedMind);

      if (mindElement && nodeId) {
        event.preventDefault();
        event.stopPropagation();
        mindElement.selectedNodeId = nodeId;
        const layout = getMindLayout(mindElement);
        const box = layout.nodeMap.get(nodeId);
        if (box) {
          openMindmapInlineEditor(board, box, mindElement, () => {
            syncElementChange(mindElement);
          });
          return;
        }
      }
    }
    dblClick(event);
  };

  // 6. 快捷键状态机 (Enter 添加同级/子级, Tab 添加子级, Space 编辑, Delete 删除)
  board.keyDown = (event: KeyboardEvent) => {
    // 6.1 用户若正在打字，不拦截
    if ((board as any).isTyping || (event.target as HTMLElement)?.isContentEditable) {
      keyDown(event);
      return;
    }

    // 6.2 检查选中的思维导图
    const selected = getSelectedElements(board).find(isSpeedMind);
    if (selected && !PlaitBoard.isReadonly(board)) {
      const activeNodeId = selected.selectedNodeId || selected.id;

      // Enter 键：根节点添加子级；分支节点添加同级
      if (isEnterHotkey(event)) {
        event.preventDefault();
        const isRoot = activeNodeId === selected.id;
        const newNode = isRoot
          ? addChildNode(selected, activeNodeId)
          : addSiblingNode(selected, activeNodeId);

        if (newNode) {
          selected.selectedNodeId = newNode.id;
          syncElementChange(selected);

          setTimeout(() => {
            const layout = getMindLayout(selected);
            const box = layout.nodeMap.get(newNode.id);
            if (box) {
              openMindmapInlineEditor(board, box, selected, () => {
                syncElementChange(selected);
              });
            }
          }, 40);
        }
        return;
      }

      // Tab 键：添加子节点
      if (isTabHotkey(event)) {
        event.preventDefault();
        const newNode = addChildNode(selected, activeNodeId);
        if (newNode) {
          selected.selectedNodeId = newNode.id;
          syncElementChange(selected);

          setTimeout(() => {
            const layout = getMindLayout(selected);
            const box = layout.nodeMap.get(newNode.id);
            if (box) {
              openMindmapInlineEditor(board, box, selected, () => {
                syncElementChange(selected);
              });
            }
          }, 40);
        }
        return;
      }

      // Space 键：进入编辑
      if (isSpaceHotkey(event)) {
        event.preventDefault();
        const layout = getMindLayout(selected);
        const box = layout.nodeMap.get(activeNodeId);
        if (box) {
          openMindmapInlineEditor(board, box, selected, () => {
            syncElementChange(selected);
          });
        }
        return;
      }

      // Delete / Backspace 键：删除分支节点（根节点不可删除）
      if (isDeleteHotkey(event) || isBackspaceHotkey(event)) {
        if (activeNodeId !== selected.id) {
          event.preventDefault();
          const deleted = deleteNode(selected, activeNodeId);
          if (deleted) {
            selected.selectedNodeId = selected.id;
            syncElementChange(selected);
          }
          return;
        }
      }
    }

    keyDown(event);
  };

  return board;
};
