import {
  CommonElementFlavour,
  PlaitCommonElementRef,
  TextManage,
} from '@plait/common';
import {
  createG,
  Transforms,
  PlaitBoard,
  clearSelectedElement,
  addSelectedElement,
  type OnContextChanged,
  type PlaitPluginElementContext,
} from '@plait/core';
import type { NodeLayoutBox, SpeedMindElement } from '../types';
import { computeMindLayout } from '../layout/mindLayout';
import { renderBranchLinksSvg, renderSummaryBracketsSvg } from '../renderer/drawLinks';
import {
  renderNodeCardShape,
  updateNodeCardShape,
  getTopicRectangleByBox,
  getNodeTopicData,
} from '../renderer/drawNode';
import { renderNodeHandlesSvg } from '../renderer/drawHandles';
import { MIND_NODE_TEXT_MANAGES, editMindNodeTopic } from '../renderer/inlineEditor';
import { findMindRootAndPath, setNodeTopic } from '../model/treeOps';

export const MIND_LAYOUT_CACHE = new WeakMap<SpeedMindElement, ReturnType<typeof computeMindLayout>>();
export const MIND_SELECTED_NODE_ID = new WeakMap<PlaitBoard, string>();
export const MIND_HOVER_NODE_ID = new WeakMap<PlaitBoard, string | null>();

export function getSelectedMindNodeId(board: PlaitBoard): string | null {
  return MIND_SELECTED_NODE_ID.get(board) || null;
}

export function setSelectedMindNodeId(board: PlaitBoard, nodeId: string | null): void {
  if (nodeId) {
    MIND_SELECTED_NODE_ID.set(board, nodeId);
  } else {
    MIND_SELECTED_NODE_ID.delete(board);
  }
}

export function getHoverMindNodeId(board: PlaitBoard): string | null {
  return MIND_HOVER_NODE_ID.get(board) || null;
}

export function setHoverMindNodeId(board: PlaitBoard, nodeId: string | null): void {
  MIND_HOVER_NODE_ID.set(board, nodeId);
}

export function notifyMindHandlesUpdate(board: PlaitBoard, hoverNodeId: string | null): void {
  for (const comp of SpeedMindComponent.instances) {
    if (comp.board === board) {
      comp.updateHandles(hoverNodeId);
    }
  }
}

/**
 * 纯 SVG 自研脑图组件 (继承 Plait ElementFlavour)
 * 内置原生 TextManage + Slate 富文本渲染，与画板 Text/Shape 共享统一文本基础设施
 */
export class SpeedMindComponent
  extends CommonElementFlavour<SpeedMindElement, PlaitBoard>
  implements OnContextChanged<SpeedMindElement, PlaitBoard>
{
  /**
   * 关键覆盖：告诉 Plait 核心无需对其 children 递归启动 ListRender。
   * 本组件为自包含的一体化脑图渲染引擎，避免 Plait 重复为每个子节点实例化独立组件产生重影与错位！
   */
  override get hasChildren(): boolean {
    return false;
  }

  private linksG: SVGGElement | null = null;
  private summariesG: SVGGElement | null = null;
  private nodesG: SVGGElement | null = null;
  private handlesG: SVGGElement | null = null;

  private nodeGMap = new Map<string, SVGGElement>();
  private textManageMap = new Map<string, TextManage>();
  private lastTopicTextMap = new Map<string, string>();

  static instances = new Set<SpeedMindComponent>();

  constructor() {
    super(new PlaitCommonElementRef());
  }

  initialize(): void {
    super.initialize();
    SpeedMindComponent.instances.add(this);
    const containerG = this.getElementG();
    containerG.classList.add('speed-mind-root-container');

    // 1. 创建图层组：底层连线 -> 概要大括号 -> 节点卡片 -> 操作加号手柄
    this.linksG = createG();
    this.linksG.classList.add('speed-mind-links-layer');

    this.summariesG = createG();
    this.summariesG.classList.add('speed-mind-summaries-layer');

    this.nodesG = createG();
    this.nodesG.classList.add('speed-mind-nodes-layer');

    this.handlesG = createG();
    this.handlesG.classList.add('speed-mind-handles-layer');

    containerG.appendChild(this.linksG);
    containerG.appendChild(this.summariesG);
    containerG.appendChild(this.nodesG);
    containerG.appendChild(this.handlesG);

    this.renderMindmap();
  }

  onContextChanged(
    value: PlaitPluginElementContext<SpeedMindElement, PlaitBoard>,
    previous: PlaitPluginElementContext<SpeedMindElement, PlaitBoard>
  ): void {
    this.renderMindmap();
  }

  renderMindmap(): void {
    if (!this.linksG || !this.nodesG || !this.handlesG || !this.summariesG) {
      return;
    }

    const element = this.element;
    const board = this.board;

    // 1. 计算布局
    const layout = computeMindLayout(element);
    MIND_LAYOUT_CACHE.set(element, layout);

    // 2. 渲染分支连线与概要大括号
    renderBranchLinksSvg(this.linksG, layout.links);
    renderSummaryBracketsSvg(this.summariesG, layout.summaries);

    // 3. 渲染所有节点卡片 (复用 TextManage，保障正在编辑态的 DOM 节点不被销毁)
    const activeIds = new Set(layout.nodeMap.keys());
    for (const [id, tm] of this.textManageMap.entries()) {
      if (!activeIds.has(id)) {
        tm.destroy();
        this.textManageMap.delete(id);
        this.nodeGMap.get(id)?.remove();
        this.nodeGMap.delete(id);
      }
    }

    const selectedNodeId = getSelectedMindNodeId(board);
    const hoverNodeId = getHoverMindNodeId(board);

    layout.nodeMap.forEach((box: NodeLayoutBox) => {
      const isSelected =
        this.selected &&
        (selectedNodeId === box.id || (!selectedNodeId && box.id === element.id));

      let nodeG = this.nodeGMap.get(box.id);
      let textManage = this.textManageMap.get(box.id);

      if (!nodeG || !textManage) {
        nodeG = createG();
        nodeG.setAttribute(
          'class',
          `speed-mind-node-g ${box.element.isRoot ? 'is-root' : 'is-child'} ${isSelected ? 'is-selected' : ''}`
        );
        nodeG.setAttribute('data-node-id', box.id);
        nodeG.style.cursor = 'pointer';

        // 绑定节点卡片的原生双击就地编辑事件，直接捕获事件不丢帧
        const handleNodeDblClick = (e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          if (PlaitBoard.isReadonly(board)) return;
          clearSelectedElement(board);
          addSelectedElement(board, this.element);
          setSelectedMindNodeId(board, box.id);
          const wrapper = (board as any).boardWrapper;
          wrapper?.emit?.('selection:change', { selected: [this.element] });
          editMindNodeTopic(board, box.id);
        };
        nodeG.addEventListener('dblclick', handleNodeDblClick);

        renderNodeCardShape(nodeG, box, isSelected);

        textManage = new TextManage(board, {
          getRectangle: () => {
            const currentLayout =
              MIND_LAYOUT_CACHE.get(this.element) || computeMindLayout(this.element);
            const curBox = currentLayout.nodeMap.get(box.id) || box;
            return getTopicRectangleByBox(curBox);
          },
          onChange: (data) => {
            const cur = findMindRootAndPath(board, box.id);
            if (cur) {
              const updated = setNodeTopic(cur.root, box.id, data.newText);
              Transforms.setNode(
                board,
                { data: updated.data, children: updated.children },
                cur.path
              );
            }
          },
          getMaxWidth: () => 800,
        });

        const isRoot = Boolean(box.element.isRoot || box.depth === 0);
        const topicData = getNodeTopicData(box.element, isRoot);
        this.lastTopicTextMap.set(box.id, JSON.stringify(topicData));
        textManage.draw(topicData);

        this.textManageMap.set(box.id, textManage);
        this.nodeGMap.set(box.id, nodeG);

        nodeG.appendChild(textManage.g);

        // 确保 markers 图层永远置顶于 textManage 之上，保障点击事件不被文本区域遮挡
        const existingMarkers = nodeG.querySelector('.speed-mind-node-markers');
        if (existingMarkers) {
          nodeG.appendChild(existingMarkers);
        }

        this.nodesG!.appendChild(nodeG);
      } else {
        updateNodeCardShape(nodeG, box, isSelected);
        if (!textManage.isEditing) {
          const isRoot = Boolean(box.element.isRoot || box.depth === 0);
          const topicData = getNodeTopicData(box.element, isRoot);
          const serialized = JSON.stringify(topicData);
          if (this.lastTopicTextMap.get(box.id) !== serialized) {
            this.lastTopicTextMap.set(box.id, serialized);
            textManage.updateText(topicData);
          }
        }
        textManage.updateRectangle();

        // 确保 markers 图层永远置顶于 textManage 之上
        const existingMarkers = nodeG.querySelector('.speed-mind-node-markers');
        if (existingMarkers) {
          nodeG.appendChild(existingMarkers);
        }

        if (nodeG.parentElement !== this.nodesG) {
          this.nodesG!.appendChild(nodeG);
        }
      }
    });

    // 4. 将 textManageMap 注册到全局 WeakMap 供快捷键/事件触发 edit
    MIND_NODE_TEXT_MANAGES.set(board, this.textManageMap);
    (board as any).__mindNodeTextManages__ = this.textManageMap;
    if ((board as any).raw) {
      MIND_NODE_TEXT_MANAGES.set((board as any).raw, this.textManageMap);
      (board as any).raw.__mindNodeTextManages__ = this.textManageMap;
    }

    // 5. 初始化当前选中的 TextManage 到 Plait ElementRef，联动浮动格式工具栏
    const selectedTm = selectedNodeId ? this.textManageMap.get(selectedNodeId) : null;
    if (selectedTm) {
      this.getRef().initializeTextManage(selectedTm);
    } else {
      this.getRef().initializeTextManage(Array.from(this.textManageMap.values()));
    }

    // 6. 渲染悬浮/激活操作手柄
    this.updateHandles();
  }

  updateHandles(targetHoverNodeId?: string | null): void {
    if (!this.handlesG) return;
    const board = this.board;
    const selectedNodeId = getSelectedMindNodeId(board);
    const hoverNodeId =
      targetHoverNodeId !== undefined ? targetHoverNodeId : getHoverMindNodeId(board);
    const layout = MIND_LAYOUT_CACHE.get(this.element);
    if (!layout) return;

    // 优先显示当前鼠标悬浮的节点，无悬浮时如果本导图被选中则显示当前选中的节点
    const activeNodeId = hoverNodeId || (this.selected ? selectedNodeId : null);

    this.handlesG.innerHTML = '';
    if (activeNodeId) {
      const activeBox = layout.nodeMap.get(activeNodeId);
      if (activeBox) {
        const isHovered = hoverNodeId === activeBox.id;
        const isSelected = selectedNodeId === activeBox.id;
        renderNodeHandlesSvg(this.handlesG, activeBox, isHovered, isSelected);
      }
    }
  }

  destroy(): void {
    SpeedMindComponent.instances.delete(this);
    if (this.element) {
      MIND_LAYOUT_CACHE.delete(this.element);
    }
    for (const tm of this.textManageMap.values()) {
      tm.destroy();
    }
    this.textManageMap.clear();
    this.nodeGMap.clear();
    this.lastTopicTextMap.clear();
    MIND_NODE_TEXT_MANAGES.delete(this.board);

    this.linksG?.remove();
    this.summariesG?.remove();
    this.nodesG?.remove();
    this.handlesG?.remove();
    this.linksG = null;
    this.summariesG = null;
    this.nodesG = null;
    this.handlesG = null;
    super.destroy();
  }
}
