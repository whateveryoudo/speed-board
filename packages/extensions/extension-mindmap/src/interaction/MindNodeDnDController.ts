import {
  PlaitBoard,
  toHostPoint,
  toViewBoxPoint,
  createG,
  Transforms,
} from '@plait/core';
import type { SpeedMindElement, NodeLayoutBox } from '../types';
import { computeMindLayout, buildBezierBranchPath, buildStraightBranchPath } from '../layout/mindLayout';
import { moveNode, getNodeTopicText, findNodeById, findMindRootAndPath, findParentNode } from '../model/treeOps';
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
   * 采用与 Plait Mind 原生 directionDetector / directionCorrector 一致的几何判定模型：
   * 1. 根节点 (Root)：没有父级与兄弟，拖到根节点周围只能作为子节点 (child)
   * 2. 非根子节点 (Subnode)：
   *    - 节点卡片右部 35% 或右侧延伸区 (cursorX > box.x + box.width * 0.65) -> 插入成为子节点 (child)
   *    - 节点卡片上半区 (cursorY < box.y + box.height * 0.5) -> 同级向前插入 (sibling before)
   *    - 节点卡片下半区 (cursorY >= box.y + box.height * 0.5) -> 同级向后插入 (sibling after)
   * 3. 自身及紧邻原位过滤：拖到自身原本的同级位置不触发插槽 (no-op)
   * 4. 子孙回路防护：禁止拖到自身子孙节点中
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

    const draggedParentInfo = findParentNode(this.draggedRoot, draggedId);

    let bestCandidate: DropSlot | null = null;
    let minDistance = Infinity;

    for (const [nodeId, box] of layout.nodeMap) {
      if (descendantIds.has(nodeId)) continue;

      const isRoot = Boolean(box.element.isRoot || box.depth === 0);

      // 卡片吸附有效外扩范围
      const padLeft = 30;
      const padRight = 80;
      const padY = 20;

      if (
        cursorX < box.x - padLeft ||
        cursorX > box.x + box.width + padRight ||
        cursorY < box.y - padY ||
        cursorY > box.y + box.height + padY
      ) {
        continue;
      }

      if (isRoot) {
        // 根节点：只能作为父级接收子节点 (对标 Plait Mind: Root 只允许 'right' 方向)
        const indicatorX = box.x + box.width + 36;
        const indicatorY = box.y + box.height / 2;
        const dist = Math.hypot(cursorX - indicatorX, cursorY - indicatorY);
        if (dist < minDistance) {
          minDistance = dist;
          bestCandidate = {
            type: 'child',
            parentId: nodeId,
            indicatorX,
            indicatorY,
            targetBox: box,
          };
        }
      } else {
        // 非根节点：获取该节点的父级及索引
        const parentInfo = findParentNode(this.draggedRoot, nodeId);
        if (!parentInfo) continue;

        const parentBox = layout.nodeMap.get(parentInfo.parent.id);
        const nodeIndex = parentInfo.index;

        // 判定光标相对于卡片的位置：
        // 1. 卡片内部中间 50% (0.25 <= relY <= 0.75) 或对齐卡片向右拖动 -> 判定为收纳为该节点的子节点 (in-parent)
        // 2. 卡片顶部 25% (或上边缘/上间隙) -> 判定为同级向前插入 (insert-before)
        // 3. 卡片底部 25% (或下边缘/下间隙) -> 判定为同级向后插入 (insert-after)
        // 注意：间隙区域 (cursorY 不在卡片高度范围内) 必须稳定判定为兄弟插入，严禁因靠右而误判为子级！
        const relY = (cursorY - box.y) / box.height;
        const isVerticallyInCard = cursorY >= box.y && cursorY <= box.y + box.height;
        const isRightDrag = isVerticallyInCard && cursorX > box.x + box.width * 0.7;
        const isMiddleCard = cursorX >= box.x && cursorX <= box.x + box.width && relY >= 0.25 && relY <= 0.75;

        if (isRightDrag || isMiddleCard) {
          const indicatorX = box.x + box.width + 36;
          const indicatorY = box.y + box.height / 2;
          const dist = Math.hypot(cursorX - (box.x + box.width / 2), cursorY - indicatorY);
          if (dist < minDistance) {
            minDistance = dist;
            bestCandidate = {
              type: 'child',
              parentId: nodeId,
              indicatorX,
              indicatorY,
              targetBox: box,
            };
          }
        } else {
          // 2. 顶部 25% (前插) 或 底部 25% (后插)
          const isTop = relY < 0.5;
          const targetIndex = isTop ? nodeIndex : nodeIndex + 1;

          // 过滤紧邻自身的无意义移动 (no-op)
          if (
            draggedParentInfo &&
            parentInfo.parent.id === draggedParentInfo.parent.id &&
            (targetIndex === draggedParentInfo.index || targetIndex === draggedParentInfo.index + 1)
          ) {
            continue;
          }

          // 计算胶囊指示器的精准 Y 轴居中坐标
          let slotY = isTop ? box.y - 12 : box.y + box.height + 12;
          let slotX = box.x;

          if (isTop && targetIndex > 0) {
            const prevChild = parentInfo.parent.children[targetIndex - 1];
            const prevBox = layout.nodeMap.get(prevChild.id);
            if (prevBox) {
              slotY = (prevBox.y + prevBox.height + box.y) / 2;
              slotX = Math.min(prevBox.x, box.x);
            }
          } else if (!isTop && targetIndex < parentInfo.parent.children.length) {
            const nextChild = parentInfo.parent.children[targetIndex];
            const nextBox = layout.nodeMap.get(nextChild.id);
            if (nextBox) {
              slotY = (box.y + box.height + nextBox.y) / 2;
              slotX = Math.min(box.x, nextBox.x);
            }
          }

          const dist = Math.hypot(cursorX - slotX, cursorY - slotY);
          if (dist < minDistance) {
            minDistance = dist;
            bestCandidate = {
              type: 'sibling',
              parentId: parentInfo.parent.id,
              targetIndex,
              indicatorX: slotX,
              indicatorY: slotY,
              parentBox,
            };
          }
        }
      }
    }

    if (bestCandidate) {
      this.activeDropSlot = bestCandidate;
      if (bestCandidate.type === 'sibling') {
        this.renderSiblingSlot(bestCandidate);
      } else if (bestCandidate.type === 'child') {
        this.renderChildSlot(bestCandidate);
      }
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
