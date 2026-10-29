import {
  CommonElementFlavour,
  PlaitCommonElementRef,
} from '@plait/common';
import {
  createG,
  type OnContextChanged,
  type PlaitBoard,
  type PlaitPluginElementContext,
} from '@plait/core';
import type { NodeLayoutBox, SpeedMindElement } from '../types';
import { computeMindLayout } from '../layout/mindLayout';
import { renderBranchLinksSvg, renderSummaryBracketsSvg } from '../renderer/drawLinks';
import { renderNodeCardSvg } from '../renderer/drawNode';
import { renderNodeHandlesSvg } from '../renderer/drawHandles';

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

/**
 * 纯 SVG 自研脑图组件 (继承 Plait ElementFlavour)
 * 具备极简、高性能、Immer 不可变性安全、绝不产生 WeakMap 崩溃等特性
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

  constructor() {
    super(new PlaitCommonElementRef());
  }

  initialize(): void {
    super.initialize();
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

    // 3. 渲染所有节点卡片
    this.nodesG.innerHTML = '';
    const selectedNodeId = getSelectedMindNodeId(board);
    const hoverNodeId = getHoverMindNodeId(board);

    layout.nodeMap.forEach((box: NodeLayoutBox) => {
      const nodeG = createG();
      const isSelected = this.selected && (selectedNodeId === box.id || (!selectedNodeId && box.id === element.id));
      renderNodeCardSvg(nodeG, box, isSelected);
      this.nodesG!.appendChild(nodeG);
    });

    // 4. 渲染悬浮/激活操作手柄
    this.handlesG.innerHTML = '';
    const activeBox =
      (selectedNodeId && layout.nodeMap.get(selectedNodeId)) ||
      (hoverNodeId && layout.nodeMap.get(hoverNodeId));

    if (activeBox) {
      const isHovered = hoverNodeId === activeBox.id;
      const isSelected = selectedNodeId === activeBox.id;
      renderNodeHandlesSvg(this.handlesG, activeBox, isHovered, isSelected);
    }
  }

  destroy(): void {
    if (this.element) {
      MIND_LAYOUT_CACHE.delete(this.element);
    }
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
