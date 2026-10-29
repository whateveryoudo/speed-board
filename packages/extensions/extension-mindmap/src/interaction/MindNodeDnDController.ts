import {
  PlaitBoard,
  toHostPoint,
  toViewBoxPoint,
  createG,
  Transforms,
} from '@plait/core';
import type { SpeedMindElement, NodeLayoutBox } from '../types';
import { computeMindLayout, buildBezierBranchPath, buildStraightBranchPath } from '../layout/mindLayout';
import { moveNode, getNodeTopicText, findNodeById, findMindRootAndPath } from '../model/treeOps';
import { setSelectedMindNodeId } from '../component/SpeedMindComponent';

const SVG_NS = 'http://www.w3.org/2000/svg';
const DRAG_THRESHOLD = 5;

export interface DropSlot {
  type: 'sibling' | 'child';
  parentId: string;
  targetIndex?: number;
  indicatorX: number;
  indicatorY: number;
  parentBox?: NodeLayoutBox;
  targetBox?: NodeLayoutBox;
}

/**
 * 脑图节点拖拽重排序与嵌套控制器 (对齐 Plait Mind 原生交互规范)
 * 1. 拖拽子节点：原节点原位淡化，半透明 Ghost 跟随光标
 * 2. 同级插槽：兄弟节点间隙显示蓝色胶囊指示块 (width: 32, height: 12) 与虚线引导曲线
 * 3. 嵌套插槽：悬停于目标节点时高亮其虚线轮廓，右侧浮现子分支占位卡片
 * 4. 释放瞬间：执行 moveNode 重新计算树结构，平滑吸附更新
 */
export class MindNodeDnDController {
  private board: PlaitBoard;
  private isDragging = false;
  private startPoint: [number, number] | null = null;
  private draggedNodeId: string | null = null;
  private draggedRoot: SpeedMindElement | null = null;
  private draggedPath: number[] | null = null;
  private draggedBox: NodeLayoutBox | null = null;

  private overlayG: SVGGElement | null = null;
  private ghostG: SVGGElement | null = null;
  private dropIndicatorG: SVGGElement | null = null;
  private activeDropSlot: DropSlot | null = null;
  private draggedNodeDom: HTMLElement | SVGElement | null = null;

  constructor(board: PlaitBoard) {
    this.board = board;
  }

  public get isActiveDragging(): boolean {
    return this.isDragging;
  }

  public get hasDragCandidate(): boolean {
    return Boolean(this.startPoint && this.draggedNodeId);
  }

  public onPointerDown(event: PointerEvent): boolean {
    const target = event.target as HTMLElement | SVGElement | null;
    const nodeEl = target?.closest?.('.speed-mind-node-g') as HTMLElement | SVGElement | null;
    if (!nodeEl) return false;

    // 忽略按钮点击 (+, -, 展开等)
    if (target?.closest?.('.speed-mind-add-handle, .speed-mind-collapse-badge, .speed-mind-collapse-btn')) {
      return false;
    }

    const nodeId = nodeEl.getAttribute('data-node-id');
    if (!nodeId) return false;

    const info = findMindRootAndPath(this.board, nodeId);
    if (!info) return false;

    // 根节点由 board.isMovable 负责全图拖拽，DnD 控制器只负责子节点的拓扑排序与嵌套
    if (info.root.id === nodeId) {
      return false;
    }

    const layout = computeMindLayout(info.root);
    const box = layout.nodeMap.get(nodeId);
    if (!box || box.depth === 0) return false;

    const hostPoint = toHostPoint(this.board, event.x, event.y);
    const viewBoxPoint = toViewBoxPoint(this.board, hostPoint);

    this.startPoint = viewBoxPoint;
    this.draggedNodeId = nodeId;
    this.draggedRoot = info.root;
    this.draggedPath = info.path;
    this.draggedBox = box;
    this.draggedNodeDom = nodeEl;
    this.isDragging = false;

    return false;
  }

  public onPointerMove(event: PointerEvent): boolean {
    if (!this.startPoint || !this.draggedNodeId || !this.draggedRoot || !this.draggedBox) {
      return false;
    }

    const hostPoint = toHostPoint(this.board, event.x, event.y);
    const currentPoint = toViewBoxPoint(this.board, hostPoint);
    const dx = currentPoint[0] - this.startPoint[0];
    const dy = currentPoint[1] - this.startPoint[1];
    const dist = Math.hypot(dx, dy);

    if (!this.isDragging) {
      if (dist < DRAG_THRESHOLD) {
        return false;
      }
      this.isDragging = true;
      this.initOverlay();
      if (this.draggedNodeDom) {
        this.draggedNodeDom.style.opacity = '0.35';
      }
    }

    this.updateGhost(currentPoint[0], currentPoint[1]);
    this.detectAndRenderDropSlot(currentPoint[0], currentPoint[1]);

    return true;
  }

  public onGlobalPointerUp(_event: PointerEvent): boolean {
    if (!this.isDragging && !this.startPoint) {
      this.reset();
      return false;
    }

    const wasDragging = this.isDragging;
    const dropSlot = this.activeDropSlot;
    const draggedId = this.draggedNodeId;
    const root = this.draggedRoot;
    const path = this.draggedPath;

    this.reset();

    if (wasDragging && dropSlot && draggedId && root && path) {
      // 执行节点重排序或嵌套
      let updatedRoot: SpeedMindElement | null = null;

      if (dropSlot.type === 'sibling') {
        updatedRoot = moveNode(root, draggedId, dropSlot.parentId, dropSlot.targetIndex);
      } else if (dropSlot.type === 'child') {
        updatedRoot = moveNode(root, draggedId, dropSlot.parentId);
      }

      if (updatedRoot) {
        (this.board as any).syncNodeIndices?.();
        Transforms.setNode(
          this.board,
          { children: updatedRoot.children },
          path
        );
        (this.board as any).syncNodeIndices?.();
        setSelectedMindNodeId(this.board, draggedId);
        ((this.board as any).boardWrapper || (this.board as any))?.emit?.('change', {});
      }
      return true;
    }

    return false;
  }

  private initOverlay(): void {
    if (this.overlayG && this.overlayG.isConnected) return;

    const host = PlaitBoard.getHost(this.board);
    this.overlayG = createG();
    this.overlayG.setAttribute('class', 'speed-mind-dnd-overlay');
    this.overlayG.style.pointerEvents = 'none';

    this.dropIndicatorG = createG();
    this.overlayG.appendChild(this.dropIndicatorG);

    this.ghostG = createG();
    this.overlayG.appendChild(this.ghostG);

    host.appendChild(this.overlayG);
  }

  private updateGhost(cursorX: number, cursorY: number): void {
    if (!this.ghostG || !this.draggedBox) return;

    this.ghostG.innerHTML = '';
    const box = this.draggedBox;
    const ghostW = Math.max(70, box.width);
    const ghostH = Math.max(30, box.height);

    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('transform', `translate(${cursorX - ghostW / 2}, ${cursorY - ghostH / 2})`);

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('width', String(ghostW));
    rect.setAttribute('height', String(ghostH));
    rect.setAttribute('rx', '6');
    rect.setAttribute('ry', '6');
    rect.setAttribute('fill', '#ffffff');
    rect.setAttribute('fill-opacity', '0.88');
    rect.setAttribute('stroke', '#3b82f6');
    rect.setAttribute('stroke-width', '1.5');
    rect.setAttribute('stroke-dasharray', '4 3');
    rect.style.filter = 'drop-shadow(0 4px 12px rgba(59, 130, 246, 0.35))';

    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', String(ghostW / 2));
    text.setAttribute('y', String(ghostH / 2 + 4.5));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#1f2937');
    text.setAttribute('font-size', '13');
    text.setAttribute('font-weight', '500');
    text.textContent = getNodeTopicText(box.element) || '分支主题';

    g.appendChild(rect);
    g.appendChild(text);
    this.ghostG.appendChild(g);
  }

  /**
   * 探测最佳释放插槽并渲染对齐 Plait Mind 的高品质蓝色指示胶囊
   */
  private detectAndRenderDropSlot(cursorX: number, cursorY: number): void {
    if (!this.dropIndicatorG || !this.draggedRoot || !this.draggedNodeId) return;

    this.dropIndicatorG.innerHTML = '';
    this.activeDropSlot = null;

    const layout = computeMindLayout(this.draggedRoot);
    const draggedId = this.draggedNodeId;

    // 收集所有不可作为目标的子孙节点 ID (防止循环嵌套)
    const descendantIds = new Set<string>();
    const collectDescendants = (node: SpeedMindElement) => {
      descendantIds.add(node.id);
      if (node.children) {
        node.children.forEach(collectDescendants);
      }
    };
    const draggedSubtree = findNodeById(this.draggedRoot, draggedId);
    if (draggedSubtree) {
      collectDescendants(draggedSubtree);
    }

    // 1. 优先探测是否直接悬停于某节点内部 (插入节点成为子级)
    for (const [nodeId, box] of layout.nodeMap) {
      if (descendantIds.has(nodeId)) continue;

      if (
        cursorX >= box.x &&
        cursorX <= box.x + box.width &&
        cursorY >= box.y &&
        cursorY <= box.y + box.height
      ) {
        // 命中节点卡片本体 -> 插入成为其子节点
        this.activeDropSlot = {
          type: 'child',
          parentId: nodeId,
          indicatorX: box.x + box.width + 30,
          indicatorY: box.y + box.height / 2,
          targetBox: box,
        };
        this.renderChildSlot(this.activeDropSlot);
        return;
      }
    }

    // 2. 探测同级插槽 (兄弟节点上下插入与换序)
    let bestSiblingSlot: DropSlot | null = null;
    let minDistance = Infinity;

    // 遍历所有有子节点的父级
    const checkParentChildren = (parent: SpeedMindElement) => {
      if (!parent.children || parent.children.length === 0) return;
      if (descendantIds.has(parent.id)) return;

      const parentBox = layout.nodeMap.get(parent.id);
      if (!parentBox) return;

      // 获取该父级下的有效兄弟节点盒模型
      const siblingBoxes: { box: NodeLayoutBox; originalIndex: number }[] = [];
      parent.children.forEach((child, idx) => {
        if (child.id === draggedId) return; // 忽略正在被拖拽的自身
        const cBox = layout.nodeMap.get(child.id);
        if (cBox) {
          siblingBoxes.push({ box: cBox, originalIndex: idx });
        }
      });

      if (siblingBoxes.length === 0) return;

      siblingBoxes.sort((a, b) => a.box.y - b.box.y);

      for (let i = 0; i <= siblingBoxes.length; i++) {
        let slotY = 0;
        let targetIndex = 0;
        const refBox = i === 0 ? siblingBoxes[0].box : siblingBoxes[i - 1].box;

        if (i === 0) {
          // 最上面第一个兄弟上方
          const first = siblingBoxes[0].box;
          slotY = first.y - 12;
          targetIndex = 0;
        } else if (i === siblingBoxes.length) {
          // 最下面最后一个兄弟下方
          const last = siblingBoxes[siblingBoxes.length - 1].box;
          slotY = last.y + last.height + 12;
          targetIndex = parent.children.length;
        } else {
          // 两个兄弟节点中间
          const prev = siblingBoxes[i - 1].box;
          const next = siblingBoxes[i].box;
          slotY = (prev.y + prev.height + next.y) / 2;
          targetIndex = siblingBoxes[i].originalIndex;
        }

        const slotX = refBox.x;
        const xDist = Math.abs(cursorX - (slotX + 16));
        const yDist = Math.abs(cursorY - slotY);

        // 插槽吸附有效判定范围
        if (cursorX >= slotX - 50 && cursorX <= slotX + refBox.width + 60 && yDist <= 32) {
          const totalDist = Math.hypot(xDist, yDist);
          if (totalDist < minDistance) {
            minDistance = totalDist;
            bestSiblingSlot = {
              type: 'sibling',
              parentId: parent.id,
              targetIndex,
              indicatorX: slotX,
              indicatorY: slotY,
              parentBox,
            };
          }
        }
      }

      parent.children.forEach(checkParentChildren);
    };

    checkParentChildren(this.draggedRoot);

    if (bestSiblingSlot) {
      this.activeDropSlot = bestSiblingSlot;
      this.renderSiblingSlot(bestSiblingSlot);
    }
  }

  /**
   * 渲染同级排序插槽：1:1 完美复刻 Plait Mind 经典蓝色实心胶囊块 (width: 32, height: 12) 与分支曲线
   */
  private renderSiblingSlot(slot: DropSlot): void {
    if (!this.dropIndicatorG) return;

    const pillW = 32;
    const pillH = 12;
    const pillX = slot.indicatorX;
    const pillY = slot.indicatorY - pillH / 2;

    // 1. 引导曲线 (从父级节点中心连向蓝色胶囊)
    if (slot.parentBox) {
      const pBox = slot.parentBox;
      const startPoint: [number, number] = [pBox.x + pBox.width, pBox.y + pBox.height / 2];
      const endPoint: [number, number] = [pillX, slot.indicatorY];
      const branchD = buildBezierBranchPath(startPoint, endPoint);

      const branchPath = document.createElementNS(SVG_NS, 'path');
      branchPath.setAttribute('d', branchD);
      branchPath.setAttribute('fill', 'none');
      branchPath.setAttribute('stroke', '#3b82f6');
      branchPath.setAttribute('stroke-width', '2');
      branchPath.setAttribute('stroke-dasharray', '4 3');
      branchPath.setAttribute('stroke-linecap', 'round');
      this.dropIndicatorG.appendChild(branchPath);
    }

    // 2. 经典蓝色实心胶囊块 (Plait 原生质感)
    const pill = document.createElementNS(SVG_NS, 'rect');
    pill.setAttribute('x', String(pillX));
    pill.setAttribute('y', String(pillY));
    pill.setAttribute('width', String(pillW));
    pill.setAttribute('height', String(pillH));
    pill.setAttribute('rx', '6');
    pill.setAttribute('ry', '6');
    pill.setAttribute('fill', '#3b82f6');
    pill.setAttribute('stroke', '#2563eb');
    pill.setAttribute('stroke-width', '1');
    pill.style.filter = 'drop-shadow(0 2px 6px rgba(59, 130, 246, 0.4))';

    this.dropIndicatorG.appendChild(pill);
  }

  /**
   * 渲染插入子级插槽：目标节点虚线框高亮 + 右侧占位卡片与分支连线
   */
  private renderChildSlot(slot: DropSlot): void {
    if (!this.dropIndicatorG || !slot.targetBox) return;

    const tBox = slot.targetBox;

    // 1. 目标节点高亮光晕
    const pad = 4;
    const highlight = document.createElementNS(SVG_NS, 'rect');
    highlight.setAttribute('x', String(tBox.x - pad));
    highlight.setAttribute('y', String(tBox.y - pad));
    highlight.setAttribute('width', String(tBox.width + pad * 2));
    highlight.setAttribute('height', String(tBox.height + pad * 2));
    highlight.setAttribute('rx', '8');
    highlight.setAttribute('ry', '8');
    highlight.setAttribute('fill', 'rgba(59, 130, 246, 0.12)');
    highlight.setAttribute('stroke', '#3b82f6');
    highlight.setAttribute('stroke-width', '2');
    highlight.setAttribute('stroke-dasharray', '4 3');
    this.dropIndicatorG.appendChild(highlight);

    // 2. 右侧占位卡片
    const placeW = 60;
    const placeH = 26;
    const placeX = tBox.x + tBox.width + 36;
    const placeY = tBox.y + (tBox.height - placeH) / 2;

    const branchD = buildBezierBranchPath(
      [tBox.x + tBox.width, tBox.y + tBox.height / 2],
      [placeX, placeY + placeH / 2]
    );

    const branch = document.createElementNS(SVG_NS, 'path');
    branch.setAttribute('d', branchD);
    branch.setAttribute('fill', 'none');
    branch.setAttribute('stroke', '#3b82f6');
    branch.setAttribute('stroke-width', '2');
    branch.setAttribute('stroke-dasharray', '4 3');
    this.dropIndicatorG.appendChild(branch);

    const placeCard = document.createElementNS(SVG_NS, 'rect');
    placeCard.setAttribute('x', String(placeX));
    placeCard.setAttribute('y', String(placeY));
    placeCard.setAttribute('width', String(placeW));
    placeCard.setAttribute('height', String(placeH));
    placeCard.setAttribute('rx', '6');
    placeCard.setAttribute('ry', '6');
    placeCard.setAttribute('fill', 'rgba(59, 130, 246, 0.1)');
    placeCard.setAttribute('stroke', '#3b82f6');
    placeCard.setAttribute('stroke-width', '1.5');
    placeCard.setAttribute('stroke-dasharray', '3 3');
    this.dropIndicatorG.appendChild(placeCard);
  }

  private reset(): void {
    if (this.draggedNodeDom) {
      this.draggedNodeDom.style.opacity = '1';
      this.draggedNodeDom = null;
    }
    this.overlayG?.remove();
    this.overlayG = null;
    this.ghostG = null;
    this.dropIndicatorG = null;
    this.startPoint = null;
    this.draggedNodeId = null;
    this.draggedRoot = null;
    this.draggedPath = null;
    this.draggedBox = null;
    this.activeDropSlot = null;
    this.isDragging = false;
  }
}
