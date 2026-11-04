import {
  PlaitBoard,
  type PlaitPluginElementContext,
  type Point,
  type Selection,
  RectangleClient,
  BoardTransforms,
  PlaitPointerType,
  Transforms,
  addSelectedElement,
  clearSelectedElement,
  getSelectedElements,
  toHostPoint,
  toViewBoxPoint,
  distanceBetweenPointAndPoint,
} from '@plait/core';
import type { SpeedMindElement, NodeLayoutBox } from './types';
import { createEmptyMindmap } from './model/createMindmap';
import {
  addChildNode,
  addSiblingNode,
  addParentNode,
  deleteNode,
  findNodeById,
  findParentNode,
  getNodeTopicText,
  setNodeTopicText,
  toggleCollapse,
  cloneTree,
} from './model/treeOps';
import { computeMindLayout } from './layout/mindLayout';
import {
  SpeedMindComponent,
  MIND_LAYOUT_CACHE,
  getSelectedMindNodeId,
  setSelectedMindNodeId,
  getHoverMindNodeId,
  setHoverMindNodeId,
  notifyMindHandlesUpdate,
} from './component/SpeedMindComponent';
import {
  editMindNodeTopic,
  closeInlineEditing,
} from './renderer/inlineEditor';
import { generateSummaryRangePath } from './renderer/drawHandles';
import { MindNodeDnDController } from './interaction/MindNodeDnDController';
import './registerBoardMindmap';

export const withSpeedMind = <T extends PlaitBoard = PlaitBoard>(board: T): T => {
  const {
    drawElement,
    pointerDown,
    pointerMove,
    pointerUp,
    globalPointerUp,
    globalPointerMove,
    dblClick,
    keyDown,
    globalKeyDown,
    getRectangle,
    isHit,
    isRectangleHit,
    isMovable,
  } = board;

  const dndController = new MindNodeDnDController(board);

  let lastPointerDownTime = 0;
  let lastPointerDownNodeId: string | null = null;
  let activePointerDownRootId: string | null = null;
  let activePointerDownNodeId: string | null = null;
  let isResizingSummary = false;

  // 1. 允许思维导图整树在画布上直接拖拽平移 (子节点拖拽由 dndController 接管)
  board.isMovable = (element: any): boolean => {
    if (element.type === 'mind') {
      if (dndController.hasDragCandidate || dndController.isActiveDragging) {
        return false;
      }
      return true;
    }
    return isMovable ? isMovable(element) : false;
  };

  // 2. 注册思维导图图形渲染组件
  board.drawElement = (context: PlaitPluginElementContext) => {
    if (context.element.type === 'mind') {
      return SpeedMindComponent;
    }
    return drawElement(context);
  };

  // 外部通用几何探测协议 (供白板自由连线等扩展无硬依赖调用)
  (board as any).getMindHitNode = (
    point: Point,
    buffer = 15
  ): { root: SpeedMindElement; box: NodeLayoutBox } | null => {
    const mindElements = board.children.filter((el) => (el as any).type === 'mind') as SpeedMindElement[];
    for (const mindEl of mindElements) {
      const layout = MIND_LAYOUT_CACHE.get(mindEl) || computeMindLayout(mindEl);
      for (const box of layout.nodeMap.values()) {
        if (
          point[0] >= box.x - buffer &&
          point[0] <= box.x + box.width + buffer &&
          point[1] >= box.y - buffer &&
          point[1] <= box.y + box.height + buffer
        ) {
          return { root: mindEl, box };
        }
      }
    }
    return null;
  };

  (board as any).getMindNodeBox = (
    rootId: string,
    nodeId: string
  ): NodeLayoutBox | null => {
    const root = board.children.find((el: any) => el.id === rootId && el.type === 'mind') as SpeedMindElement | undefined;
    if (!root) return null;
    const layout = MIND_LAYOUT_CACHE.get(root) || computeMindLayout(root);
    return layout.nodeMap.get(nodeId) || null;
  };

  // 辅助函数：根据 nodeId 定位其所属的脑图根元素及索引 Path
  const findMindRootAndPath = (
    nodeId: string
  ): { root: SpeedMindElement; path: [number] } | null => {
    for (let i = 0; i < board.children.length; i++) {
      const child = board.children[i] as any;
      if (child && child.type === 'mind') {
        const found = findNodeById(child, nodeId);
        if (found) {
          return { root: child, path: [i] };
        }
      }
    }
    return null;
  };

  // 2. 测量与包围盒计算：节点选中时精准返回该节点的卡片 BoundingBox，让浮动气泡工具栏精准悬浮在节点上方！
  board.getRectangle = (element: any): RectangleClient => {
    if (element.type === 'mind') {
      const layout =
        MIND_LAYOUT_CACHE.get(element) || computeMindLayout(element);
      const selectedNodeId = getSelectedMindNodeId(board);

      if (selectedNodeId) {
        const box = layout.nodeMap.get(selectedNodeId);
        if (box) {
          return {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
          };
        }
      }
      return layout.rootBox || { x: element.x || 0, y: element.y || 0, width: 100, height: 40 };
    }
    return getRectangle(element) || { x: 0, y: 0, width: 0, height: 0 };
  };

  // 3. 点击命中测试：支持点击节点卡片与连线
  board.isHit = (element: any, point: Point): boolean => {
    if (element.type === 'mind') {
      const layout =
        MIND_LAYOUT_CACHE.get(element) || computeMindLayout(element);

      // 先快速命中全图 BoundingBox (外扩 10px)
      const b = layout.boundingRect;
      if (
        point[0] < b.x - 10 ||
        point[0] > b.x + b.width + 10 ||
        point[1] < b.y - 10 ||
        point[1] > b.y + b.height + 10
      ) {
        return false;
      }

      // 遍历所有节点卡片进行命中检测
      for (const box of layout.nodeMap.values()) {
        if (
          point[0] >= box.x &&
          point[0] <= box.x + box.width &&
          point[1] >= box.y &&
          point[1] <= box.y + box.height
        ) {
          return true;
        }
      }

      // 未点中卡片本体，不视为命中（避免点击空白或连线间隙时误中导图根元素）
      return false;
    }
    return isHit(element, point);
  };

  board.isRectangleHit = (element: any, range: Selection): boolean => {
    if (element.type === 'mind') {
      const layout =
        MIND_LAYOUT_CACHE.get(element) || computeMindLayout(element);
      const b = layout.boundingRect;
      const selection = RectangleClient.getRectangleByPoints([range.anchor, range.focus]);
      const hit =
        selection.x <= b.x + b.width &&
        selection.x + selection.width >= b.x &&
        selection.y <= b.y + b.height &&
        selection.y + selection.height >= b.y;
      return hit;
    }
    return isRectangleHit(element, range);
  };

  let resizingNodeWidthState: {
    nodeId: string;
    root: SpeedMindElement;
    isLeft: boolean;
    startMouseX: number;
    initialWidth: number;
    currentWidth: number;
  } | null = null;

  // 4. 指针按下交互 (创建脑图、点击节点、点击加号/折叠手柄)
  board.pointerDown = (event: PointerEvent) => {
    // 4.1 工具栏为思维导图：点击画布插入新的思维导图根节点
    const currentPointer = (board as any).pointer;
    if (currentPointer === 'mind' || currentPointer === 'mindmap') {
      const hostPoint = toHostPoint(board, event.x, event.y);
      const viewBoxPoint = toViewBoxPoint(board, hostPoint);

      const emptyMind = createEmptyMindmap('中心主题', {
        points: [[viewBoxPoint[0] - 40, viewBoxPoint[1] - 18]],
      });

      const insertIndex = board.children.length;
      Transforms.insertNode(board, emptyMind, [insertIndex]);
      BoardTransforms.updatePointerType(board, PlaitPointerType.selection);

      clearSelectedElement(board);
      addSelectedElement(board, emptyMind);
      setSelectedMindNodeId(board, emptyMind.id);

      const wrapper = (board as any).boardWrapper;
      wrapper?.emit?.('selection:change', { selected: [emptyMind] });

      event.stopPropagation();
      return;
    }

    // 4.1 如果处于文本编辑状态：
    if (PlaitBoard.hasBeenTextEditing(board)) {
      const isInsideActiveEditor = Boolean(
        (event.target as HTMLElement | null)?.closest?.('[contenteditable="true"]')
      );
      if (isInsideActiveEditor) {
        // 在当前编辑的文本框内点击：放行以调整光标位置
        pointerDown(event);
        return;
      }
      // 在当前编辑文本框外部点击（如直接点击另一个脑图节点、操作手柄或画板空白）：
      // 立即结束前一个节点的编辑态，让后续逻辑顺利处理目标节点的选中！
      closeInlineEditing(board);
    }

    const target = event.target as HTMLElement | SVGElement | null;

    // 4.1.5 点击节点上的标记 (Marker) -> 广播 marker 点击事件以弹出快捷选择器
    const compPath = event.composedPath ? (event.composedPath() as Element[]) : [];
    const markerEl =
      (compPath.find((el) => el instanceof Element && el.classList?.contains('speed-mind-marker-item')) as HTMLElement | SVGElement | null) ||
      (target?.closest?.('.speed-mind-marker-item') as HTMLElement | SVGElement | null);
    if (markerEl) {
      const category = markerEl.getAttribute('data-category');
      const value = markerEl.getAttribute('data-value');
      const nodeId = markerEl.getAttribute('data-node-id');
      if (category && nodeId) {
        const info = findMindRootAndPath(nodeId);
        if (info) {
          setSelectedMindNodeId(board, nodeId);
          const curSelected = getSelectedElements(board);
          if (curSelected.length !== 1 || curSelected[0] !== info.root) {
            clearSelectedElement(board);
            addSelectedElement(board, info.root);
          }
          const wrapper = (board as any).boardWrapper;
          wrapper?.emit?.('selection:change', { selected: [info.root] });
        }
        const wrapper = (board as any).boardWrapper;
        wrapper?.emit?.('mindmap:marker:click', {
          nodeId,
          category,
          value,
          targetEl: markerEl,
        });
        event.stopPropagation();
        return;
      }
    }

    // 4.2 点击外延操作手柄 (+ 按钮 / 折叠展开 / 概要范围拉伸 / 节点宽度拉伸)
    const handleEl = (
      compPath.find((el) => el instanceof Element && el.hasAttribute?.('data-action')) ||
      target?.closest?.('[data-action]')
    ) as HTMLElement | SVGElement | null;
    if (handleEl) {
      const action = handleEl.getAttribute('data-action');
      const nodeId = handleEl.getAttribute('data-node-id');
      const summaryId = handleEl.getAttribute('data-summary-id');

      // 4.2.1 概要范围药丸调节手柄
      if (action === 'summary-resize-top' || action === 'summary-resize-bottom') {
        const targetSummaryId = summaryId || nodeId;
        if (targetSummaryId) {
          const info = findMindRootAndPath(targetSummaryId);
          if (info) {
            const { root } = info;
            const summaryNode = findNodeById(root, targetSummaryId);
            const currentFor: string[] = summaryNode?.data?.summaryFor || summaryNode?.summaryFor || [];
            const parentInfo = currentFor.length > 0
              ? findParentNode(root, currentFor[0])
              : findParentNode(root, targetSummaryId);

            if (parentInfo && summaryNode) {
              const { parent } = parentInfo;
              const candidateSiblings = (parent.children || []).filter(
                (c) => !c.isSummary && !c.data?.isSummary
              );

              const layout = MIND_LAYOUT_CACHE.get(root) || computeMindLayout(root);
              candidateSiblings.sort((a, b) => {
                const boxA = layout.nodeMap.get(a.id);
                const boxB = layout.nodeMap.get(b.id);
                return (boxA ? boxA.y : 0) - (boxB ? boxB.y : 0);
              });

              const indices = currentFor
                .map((id) => candidateSiblings.findIndex((c) => c.id === id))
                .filter((idx) => idx !== -1)
                .sort((a, b) => a - b);

              const startIndex = indices.length > 0 ? indices[0] : 0;
              const endIndex = indices.length > 0 ? indices[indices.length - 1] : candidateSiblings.length - 1;

              if (candidateSiblings.length > 0) {
                // 确保概要节点和脑图根保持选中状态
                setSelectedMindNodeId(board, targetSummaryId);
                const curSelected = getSelectedElements(board);
                if (curSelected.length !== 1 || curSelected[0] !== root) {
                  clearSelectedElement(board);
                  addSelectedElement(board, root);
                }

                // 获取 DOM 元素以便平滑实时拉伸
                const container = (board as any).container || PlaitBoard.getBoardContainer(board);
                const summaryG = (handleEl.closest('.speed-mind-summary-range-group') ||
                  container?.querySelector?.('.speed-mind-summary-range-group') ||
                  document.querySelector('.speed-mind-summary-range-group')) as SVGGElement | null;
                const borderPath = (summaryG?.querySelector('.speed-mind-summary-range-path') ||
                  document.querySelector('.speed-mind-summary-range-path')) as SVGPathElement | null;
                const topHandleG = (summaryG?.querySelector('.summary-resize-top') ||
                  document.querySelector('.summary-resize-top')) as SVGGElement | null;
                const bottomHandleG = (summaryG?.querySelector('.summary-resize-bottom') ||
                  document.querySelector('.summary-resize-bottom')) as SVGGElement | null;

                const activeSummary = layout.summaries?.find((s) => s.id === targetSummaryId);
                const rangeRect = activeSummary?.rangeRect || {
                  x: 0,
                  y: 0,
                  width: 100,
                  height: 100,
                };

                const initialX1 = rangeRect.x;
                const initialWidth = rangeRect.width;
                const initialY1 = rangeRect.y;
                const initialY2 = rangeRect.y + rangeRect.height;

                const startClientX = event.clientX ?? (event as any).x;
                const startClientY = event.clientY ?? (event as any).y;
                const isTopHandle = action === 'summary-resize-top';
                const zoom = board.viewport?.zoom || 1;

                let liveCurrentY1 = initialY1;
                let liveCurrentY2 = initialY2;

                // 开启全局拖拽独占状态，锁定光标与手柄 DOM 渲染
                isResizingSummary = true;
                (board as any).isResizingSummary = true;
                document.body.style.cursor = 'ns-resize';

                const onWindowPointerMove = (moveEvt: PointerEvent) => {
                  moveEvt.preventDefault();
                  moveEvt.stopPropagation();
                  const clientX = moveEvt.clientX ?? (moveEvt as any).x;
                  const clientY = moveEvt.clientY ?? (moveEvt as any).y;
                  if (typeof clientX !== 'number' || typeof clientY !== 'number') return;
                  const deltaY = (clientY - startClientY) / zoom;

                  if (isTopHandle) {
                    liveCurrentY1 = Math.min(initialY2 - 20, initialY1 + deltaY);
                    const actualShift = liveCurrentY1 - initialY1;
                    if (borderPath) {
                      borderPath.setAttribute(
                        'd',
                        generateSummaryRangePath(initialX1, liveCurrentY1, initialWidth, initialY2 - liveCurrentY1)
                      );
                    }
                    if (topHandleG) {
                      topHandleG.setAttribute('transform', `translate(0, ${actualShift})`);
                    }
                  } else {
                    liveCurrentY2 = Math.max(initialY1 + 20, initialY2 + deltaY);
                    const actualShift = liveCurrentY2 - initialY2;
                    if (borderPath) {
                      borderPath.setAttribute(
                        'd',
                        generateSummaryRangePath(initialX1, initialY1, initialWidth, liveCurrentY2 - initialY1)
                      );
                    }
                    if (bottomHandleG) {
                      bottomHandleG.setAttribute('transform', `translate(0, ${actualShift})`);
                    }
                  }
                };

                const onWindowPointerUp = (upEvt: PointerEvent) => {
                  window.removeEventListener('pointermove', onWindowPointerMove, true);
                  window.removeEventListener('pointerup', onWindowPointerUp, true);
                  isResizingSummary = false;
                  (board as any).isResizingSummary = false;
                  document.body.style.cursor = '';
                  topHandleG?.removeAttribute('transform');
                  bottomHandleG?.removeAttribute('transform');
                  upEvt.preventDefault();
                  upEvt.stopPropagation();

                  // 计算最终覆盖的子节点
                  const finalMetric = candidateSiblings.map((sibling, idx) => {
                    const b = layout.nodeMap.get(sibling.id);
                    const cy = b ? b.y + b.height / 2 : 0;
                    return { idx, id: sibling.id, cy };
                  });

                  let finalStartIndex = startIndex;
                  let finalEndIndex = endIndex;

                  if (isTopHandle) {
                    let bestIdx = endIndex;
                    let bestDist = Infinity;
                    for (let i = 0; i <= endIndex; i++) {
                      const dist = Math.abs(finalMetric[i].cy - liveCurrentY1);
                      if (dist < bestDist) {
                        bestDist = dist;
                        bestIdx = i;
                      }
                    }
                    finalStartIndex = bestIdx;
                  } else {
                    let bestIdx = startIndex;
                    let bestDist = Infinity;
                    for (let i = startIndex; i < finalMetric.length; i++) {
                      const dist = Math.abs(finalMetric[i].cy - liveCurrentY2);
                      if (dist < bestDist) {
                        bestDist = dist;
                        bestIdx = i;
                      }
                    }
                    finalEndIndex = bestIdx;
                  }

                  if (finalStartIndex > finalEndIndex) {
                    finalStartIndex = finalEndIndex;
                  }

                  const newSummaryFor = candidateSiblings
                    .slice(finalStartIndex, finalEndIndex + 1)
                    .map((c) => c.id);

                  if (newSummaryFor.length > 0) {
                    const clonedRoot = cloneTree(root);
                    const clonedSummary = findNodeById(clonedRoot, targetSummaryId);
                    if (clonedSummary) {
                      clonedSummary.summaryFor = newSummaryFor;
                      clonedSummary.data = {
                        ...(clonedSummary.data || {}),
                        summaryFor: newSummaryFor,
                      };
                    }

                    const rootPath = PlaitBoard.findPath(board, root);
                    Transforms.setNode(board, { children: clonedRoot.children } as any, rootPath);

                    const comp = Array.from(SpeedMindComponent.instances).find(
                      (c) => c.element === root || c.element.id === root.id
                    );
                    if (comp) {
                      comp.renderMindmap();
                    }
                  }
                };

                window.addEventListener('pointermove', onWindowPointerMove, true);
                window.addEventListener('pointerup', onWindowPointerUp, true);

                event.preventDefault();
                event.stopPropagation();
                return;
              }
            }
          }
        }
      }

      // 4.2.2 节点宽度拉伸条手柄
      if (action === 'resize-node-width' && nodeId) {
        const info = findMindRootAndPath(nodeId);
        if (info) {
          const { root } = info;
          const targetNode = findNodeById(root, nodeId);
          if (targetNode) {
            const layout = MIND_LAYOUT_CACHE.get(root) || computeMindLayout(root);
            const box = layout.nodeMap.get(nodeId);
            const currentWidth = box ? box.width : 100;
            const startViewPoint = toViewBoxPoint(board, toHostPoint(board, event.x, event.y));
            resizingNodeWidthState = {
              nodeId,
              root,
              isLeft: Boolean(box?.left),
              startMouseX: startViewPoint[0],
              initialWidth: currentWidth,
              currentWidth,
            };
            event.preventDefault();
            event.stopPropagation();
            return;
          }
        }
      }

      if (nodeId) {
        const info = findMindRootAndPath(nodeId);
        if (info) {
          const { root, path } = info;

          if (action === 'add-child') {
            const addRes = addChildNode(root, nodeId, '分支主题');
            if (addRes) {
              Transforms.setNode(
                board,
                { children: addRes.clonedRoot.children },
                path
              );
              setSelectedMindNodeId(board, addRes.newChild.id);

              // 自动拉起新节点就地输入
              setTimeout(() => {
                editMindNodeTopic(board, addRes.newChild.id);
              }, 30);
            }
            event.stopPropagation();
            return;
          }

          if (action === 'collapse' || action === 'expand') {
            const colRes = toggleCollapse(root, nodeId);
            if (colRes) {
              Transforms.setNode(
                board,
                { children: colRes.clonedRoot.children },
                path
              );
            }
            event.stopPropagation();
            return;
          }
        }
      }
    }

    // 4.25 如果当前已选中连线且点击落在端点手柄 16px 范围内：放行给连线手柄拉伸，绝不误切选中脑图节点！
    const currentSelected = getSelectedElements(board);
    if (currentSelected.length > 0) {
      const selectedLine = currentSelected.find((el: any) => el.type === 'line' || (el.points && el.source && el.target));
      if (selectedLine && (selectedLine as any).points) {
        const linePts = (selectedLine as any).points as Point[];
        const clientX = event.clientX ?? (event as any).x;
        const clientY = event.clientY ?? (event as any).y;
        const point = toViewBoxPoint(board, toHostPoint(board, clientX, clientY));
        const checkPoints: Point[] = [linePts[0], linePts[linePts.length - 1]];

        const targetBound = (selectedLine as any).target?.boundId;
        const targetConn = (selectedLine as any).target?.connection;
        if (targetBound && targetConn && typeof targetBound === 'string' && targetBound.includes(':')) {
          const colonIdx = targetBound.indexOf(':');
          const rootId = targetBound.substring(0, colonIdx);
          const nodeId = targetBound.substring(colonIdx + 1);
          const box = (board as any).getMindNodeBox?.(rootId, nodeId);
          if (box) {
            checkPoints.push([box.x + box.width * targetConn[0], box.y + box.height * targetConn[1]]);
          }
        }

        const sourceBound = (selectedLine as any).source?.boundId;
        const sourceConn = (selectedLine as any).source?.connection;
        if (sourceBound && sourceConn && typeof sourceBound === 'string' && sourceBound.includes(':')) {
          const colonIdx = sourceBound.indexOf(':');
          const rootId = sourceBound.substring(0, colonIdx);
          const nodeId = sourceBound.substring(colonIdx + 1);
          const box = (board as any).getMindNodeBox?.(rootId, nodeId);
          if (box) {
            checkPoints.push([box.x + box.width * sourceConn[0], box.y + box.height * sourceConn[1]]);
          }
        }

        if (checkPoints.some((pt) => distanceBetweenPointAndPoint(...point, ...pt) <= 16)) {
          pointerDown(event);
          return;
        }
      }
    }

    // 4.3 点击节点卡片：选中该特定节点，通知选区变更
    let clickedNodeId: string | null = null;
    let clickedRoot: SpeedMindElement | null = null;

    const nodeEl =
      (compPath.find((el) => el instanceof Element && el.classList?.contains('speed-mind-node-g')) as HTMLElement | SVGElement | null) ||
      (target?.closest?.('.speed-mind-node-g') as HTMLElement | SVGElement | null);
    if (nodeEl) {
      clickedNodeId = nodeEl.getAttribute('data-node-id');
      if (clickedNodeId) {
        const info = findMindRootAndPath(clickedNodeId);
        if (info) {
          clickedRoot = info.root;
        }
      }
    }

    // 几何兜底：防止 SVG foreignObject / 边界未匹配到 DOM class
    if (!clickedNodeId) {
      const clientX = event.clientX ?? (event as any).x;
      const clientY = event.clientY ?? (event as any).y;
      const point = toViewBoxPoint(board, toHostPoint(board, clientX, clientY));
      const mindElements = board.children.filter((el) => (el as any).type === 'mind') as SpeedMindElement[];
      for (const mindEl of mindElements) {
        const layout = MIND_LAYOUT_CACHE.get(mindEl) || computeMindLayout(mindEl);
        for (const box of layout.nodeMap.values()) {
          if (
            point[0] >= box.x &&
            point[0] <= box.x + box.width &&
            point[1] >= box.y &&
            point[1] <= box.y + box.height
          ) {
            clickedNodeId = box.id;
            clickedRoot = mindEl;
            break;
          }
        }
        if (clickedNodeId) break;
      }
    }

    if (clickedNodeId && clickedRoot) {
      activePointerDownRootId = clickedRoot.id;
      activePointerDownNodeId = clickedNodeId;
      const now = Date.now();
      const isDblClick =
        clickedNodeId === lastPointerDownNodeId && now - lastPointerDownTime < 400;
      lastPointerDownTime = now;
      lastPointerDownNodeId = clickedNodeId;

      setSelectedMindNodeId(board, clickedNodeId);
      const curSelected = getSelectedElements(board);
      if (curSelected.length !== 1 || curSelected[0] !== clickedRoot) {
        clearSelectedElement(board);
        addSelectedElement(board, clickedRoot);
      }

      const wrapper = (board as any).boardWrapper;
      wrapper?.emit?.('selection:change', { selected: [clickedRoot] });

      if (isDblClick) {
        // 双击手势命中：立即启动就地编辑并全选文本
        editMindNodeTopic(board, clickedNodeId);
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    } else {
      activePointerDownRootId = null;
      activePointerDownNodeId = null;
      lastPointerDownNodeId = null;
      lastPointerDownTime = 0;
      // 点击了非脑图节点卡片区域：
      // 立即重置脑图内部选中节点 ID，并同步清空脑图根元素选区
      if (getSelectedMindNodeId(board)) {
        setSelectedMindNodeId(board, null);
      }
      const curSelected = getSelectedElements(board);
      const isMindSelected = curSelected.some(
        (el: any) => el && (el.type === 'mind' || el.children)
      );
      if (isMindSelected) {
        clearSelectedElement(board);
        const wrapper = (board as any).boardWrapper;
        wrapper?.emit?.('selection:change', { selected: [] });
      }
    }

    // 尝试启动子节点拖拽检测
    dndController.onPointerDown(event);

    pointerDown(event);
  };

  // 5. 悬浮监听与子节点拖拽联动 (支持 hover 悬浮及移动到边上即显示 + 和 < 操作手柄)
  board.pointerMove = (event: PointerEvent) => {
    // 概要范围拖拽调节中：独占指针事件，严禁触发 hover 刷新导致 handles DOM 被清空
    if (isResizingSummary) {
      return;
    }

    // 5.0.2 节点宽度拉伸拖拽处理
    if (resizingNodeWidthState) {
      const { nodeId, root, isLeft, startMouseX, initialWidth } = resizingNodeWidthState;
      const viewPoint = toViewBoxPoint(board, toHostPoint(board, event.x, event.y));
      const deltaX = viewPoint[0] - startMouseX;
      const newWidth = Math.max(60, Math.round(initialWidth + (isLeft ? -deltaX : deltaX)));
      resizingNodeWidthState.currentWidth = newWidth;
      const targetNode = findNodeById(root, nodeId);
      if (targetNode) {
        try {
          targetNode.manualWidth = newWidth;
          if (targetNode.data) targetNode.data.manualWidth = newWidth;
        } catch {
          // 忽略冻结对象的只读赋值异常，在 pointerUp 时会通过 cloneTree 安全提交
        }
        const comp = Array.from(SpeedMindComponent.instances).find(
          (c) => c.element === root || c.element.id === root.id
        );
        if (comp) {
          comp.renderMindmap();
        }
      }
      return;
    }

    if (dndController.onPointerMove(event)) {
      return;
    }

    const target = event.target as HTMLElement | SVGElement | null;
    const compPath = event.composedPath ? (event.composedPath() as Element[]) : [];

    // 检查是否悬浮在操作手柄区（+、<、延伸线、桥接区）
    const isOverHandle = compPath.some(
      (el) =>
        el instanceof Element &&
        (el.classList?.contains('speed-mind-handles-layer') ||
          el.classList?.contains('speed-mind-add-handle') ||
          el.classList?.contains('speed-mind-collapse-handle') ||
          el.classList?.contains('speed-mind-handle-bridge'))
    );

    // 检查是否悬浮在某个脑图节点卡片上 (DOM 命中判定)
    const nodeEl =
      (compPath.find((el) => el instanceof Element && el.classList?.contains('speed-mind-node-g')) as HTMLElement | SVGElement | null) ||
      (target?.closest?.('.speed-mind-node-g') as HTMLElement | SVGElement | null);

    let activeHoverNodeId: string | null = nodeEl?.getAttribute('data-node-id') || null;

    // 若 DOM 未直接命中卡片且未在手柄上，补充基于画板几何坐标的边缘外延区域探测 (覆盖节点四周及移动到边上 45px 的操作热区)
    if (!activeHoverNodeId && !isOverHandle) {
      const clientX = event.clientX ?? (event as any).x;
      const clientY = event.clientY ?? (event as any).y;
      if (typeof clientX === 'number' && typeof clientY === 'number') {
        const point = toViewBoxPoint(board, toHostPoint(board, clientX, clientY));
        const px = point[0];
        const py = point[1];
        const mindElements = board.children.filter((el) => (el as any).type === 'mind') as SpeedMindElement[];

        for (const mindEl of mindElements) {
          const layout = MIND_LAYOUT_CACHE.get(mindEl) || computeMindLayout(mindEl);
          for (const box of layout.nodeMap.values()) {
            const isLeft = box.left;
            // 外延 45px 包含操作手柄区域，以及上下四周各 6px 的边缘容差
            const minX = isLeft ? box.x - 45 : box.x - 6;
            const maxX = isLeft ? box.x + box.width + 6 : box.x + box.width + 45;
            const minY = box.y - 6;
            const maxY = box.y + box.height + 6;

            if (px >= minX && px <= maxX && py >= minY && py <= maxY) {
              activeHoverNodeId = box.id;
              break;
            }
          }
          if (activeHoverNodeId) break;
        }
      }
    }

    if (activeHoverNodeId) {
      const currentHover = getHoverMindNodeId(board);
      if (activeHoverNodeId !== currentHover) {
        setHoverMindNodeId(board, activeHoverNodeId);
        notifyMindHandlesUpdate(board, activeHoverNodeId);
      }
    } else if (!isOverHandle) {
      const currentHover = getHoverMindNodeId(board);
      if (currentHover !== null) {
        setHoverMindNodeId(board, null);
        notifyMindHandlesUpdate(board, null);
      }
    }

    pointerMove(event);
  };

  // 5.1 释放判定：确保整树拖拽后选中状态不丢失及概要/节点宽度调整提交
  board.pointerUp = (event: PointerEvent) => {
    if (resizingNodeWidthState) {
      const { root, nodeId, currentWidth } = resizingNodeWidthState;
      resizingNodeWidthState = null;
      const clonedRoot = cloneTree(root);
      const targetNode = findNodeById(clonedRoot, nodeId);
      if (targetNode) {
        targetNode.manualWidth = currentWidth;
        if (!targetNode.data) targetNode.data = {} as any;
        targetNode.data.manualWidth = currentWidth;
      }
      const rootPath = PlaitBoard.findPath(board, root);
      Transforms.setNode(board, { children: clonedRoot.children } as any, rootPath);
      return;
    }

    const isMoving = PlaitBoard.getBoardContainer(board).classList.contains('element-moving');
    pointerUp(event);

    if (isMoving && activePointerDownRootId) {
      const freshRoot = board.children.find((c: any) => c.id === activePointerDownRootId) as SpeedMindElement | undefined;
      if (freshRoot) {
        setSelectedMindNodeId(board, activePointerDownNodeId || freshRoot.id);
        const curSelected = getSelectedElements(board);
        if (curSelected.length !== 1 || curSelected[0] !== freshRoot) {
          clearSelectedElement(board);
          addSelectedElement(board, freshRoot);
        }
        const wrapper = (board as any).boardWrapper;
        wrapper?.emit?.('selection:change', { selected: [freshRoot] });
      }
    }
  };

  // 5.2 全局抬起：子节点拖拽释放判定与整树拖拽完成兜底
  board.globalPointerUp = (event: PointerEvent) => {
    if (resizingNodeWidthState) {
      const { root, nodeId, currentWidth } = resizingNodeWidthState;
      resizingNodeWidthState = null;
      const clonedRoot = cloneTree(root);
      const targetNode = findNodeById(clonedRoot, nodeId);
      if (targetNode) {
        targetNode.manualWidth = currentWidth;
        if (!targetNode.data) targetNode.data = {} as any;
        targetNode.data.manualWidth = currentWidth;
      }
      const rootPath = PlaitBoard.findPath(board, root);
      Transforms.setNode(board, { children: clonedRoot.children } as any, rootPath);
      return;
    }

    const isMoving = PlaitBoard.getBoardContainer(board).classList.contains('element-moving');
    if (dndController.onGlobalPointerUp(event)) {
      return;
    }
    globalPointerUp(event);

    if (isMoving && activePointerDownRootId) {
      const freshRoot = board.children.find((c: any) => c.id === activePointerDownRootId) as SpeedMindElement | undefined;
      if (freshRoot) {
        setSelectedMindNodeId(board, activePointerDownNodeId || freshRoot.id);
        const curSelected = getSelectedElements(board);
        if (curSelected.length !== 1 || curSelected[0] !== freshRoot) {
          clearSelectedElement(board);
          addSelectedElement(board, freshRoot);
        }
        const wrapper = (board as any).boardWrapper;
        wrapper?.emit?.('selection:change', { selected: [freshRoot] });
      }
    }
    activePointerDownRootId = null;
    activePointerDownNodeId = null;
  };

  // 5.3 全局移动监听：确保拖拽调节手柄时在整个窗口平滑流畅响应
  board.globalPointerMove = (event: PointerEvent) => {
    if (resizingNodeWidthState) {
      board.pointerMove(event);
      return;
    }
    globalPointerMove(event);
  };

  // 6. 双击节点启动就地编辑 (优先坐标几何碰撞判定，对齐画板文本节点处理逻辑)
  board.dblClick = (event: MouseEvent) => {
    event.preventDefault();
    if (PlaitBoard.isReadonly(board)) {
      return;
    }

    const clientX = event.clientX ?? (event as any).x;
    const clientY = event.clientY ?? (event as any).y;
    const point = toViewBoxPoint(board, toHostPoint(board, clientX, clientY));
    const mindElements = board.children.filter((el) => (el as any).type === 'mind') as SpeedMindElement[];

    for (const mindEl of mindElements) {
      const layout = MIND_LAYOUT_CACHE.get(mindEl) || computeMindLayout(mindEl);
      for (const box of layout.nodeMap.values()) {
        if (
          point[0] >= box.x &&
          point[0] <= box.x + box.width &&
          point[1] >= box.y &&
          point[1] <= box.y + box.height
        ) {
          clearSelectedElement(board);
          addSelectedElement(board, mindEl);
          setSelectedMindNodeId(board, box.id);

          const wrapper = (board as any).boardWrapper;
          wrapper?.emit?.('selection:change', { selected: [mindEl] });

          editMindNodeTopic(board, box.id);
          event.stopPropagation();
          return;
        }
      }
    }

    // 兜底：DOM target closest / composedPath 判定
    const compPath = event.composedPath ? (event.composedPath() as Element[]) : [];
    const target = event.target as HTMLElement | SVGElement | null;
    const nodeEl =
      (compPath.find((el) => el instanceof Element && el.classList?.contains('speed-mind-node-g')) as HTMLElement | SVGElement | null) ||
      (target?.closest?.('.speed-mind-node-g') as HTMLElement | SVGElement | null);
    if (nodeEl) {
      const nodeId = nodeEl.getAttribute('data-node-id');
      if (nodeId) {
        const info = findMindRootAndPath(nodeId);
        if (info) {
          clearSelectedElement(board);
          addSelectedElement(board, info.root);
          const wrapper = (board as any).boardWrapper;
          wrapper?.emit?.('selection:change', { selected: [info.root] });
        }
        setSelectedMindNodeId(board, nodeId);
        editMindNodeTopic(board, nodeId);
        event.stopPropagation();
        return;
      }
    }
    dblClick(event);
  };

  // 7. 快捷键支持 (Enter 同级/子级, Tab 子级, Space 编辑, Delete 删除)
  board.globalKeyDown = (event: KeyboardEvent) => {
    if (PlaitBoard.hasBeenTextEditing(board)) {
      globalKeyDown(event);
      return;
    }

    const selectedMindNodeId = getSelectedMindNodeId(board);
    const selectedElements = getSelectedElements(board);
    const mindElement = selectedElements.find((el) => (el as any).type === 'mind') as
      | SpeedMindElement
      | undefined;

    if (mindElement && selectedMindNodeId) {
      const info = findMindRootAndPath(selectedMindNodeId);
      if (info) {
        const { root, path } = info;
        const isRootNode = Boolean(root.id === selectedMindNodeId);

        // 7.0 用户直接键入字符：立即就地清空旧内容并写入字符 (光标跟随其后)
        const isPrintableKey =
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey &&
          event.key.length === 1 &&
          event.key !== ' ' &&
          event.code !== 'Space';

        const isImeStart = event.key === 'Process' || event.keyCode === 229;

        if (isPrintableKey) {
          event.preventDefault();
          event.stopPropagation();
          editMindNodeTopic(board, selectedMindNodeId, { clearAndInput: event.key });
          return;
        }

        if (isImeStart) {
          editMindNodeTopic(board, selectedMindNodeId, { clearAndInput: true });
          return;
        }

        // 7.1 Enter: 根节点添加子级，子级添加同级
        if (event.key === 'Enter') {
          event.preventDefault();
          event.stopPropagation();

          const result = isRootNode
            ? addChildNode(root, selectedMindNodeId, '分支主题')
            : addSiblingNode(root, selectedMindNodeId, '分支主题');

          if (result) {
            const newCreated = (result as any).newChild || (result as any).newSibling;
            Transforms.setNode(
              board,
              { children: result.clonedRoot.children },
              path
            );
            setSelectedMindNodeId(board, newCreated.id);

            setTimeout(() => {
              editMindNodeTopic(board, newCreated.id);
            }, 30);
          }
          return;
        }

        // 7.2 Tab: 统一添加子级 / Shift+Tab: 添加父级
        if (event.key === 'Tab') {
          event.preventDefault();
          event.stopPropagation();

          if (event.shiftKey) {
            if (!isRootNode) {
              const parentRes = addParentNode(root, selectedMindNodeId, '父主题');
              if (parentRes) {
                Transforms.setNode(
                  board,
                  { children: parentRes.clonedRoot.children },
                  path
                );
                setSelectedMindNodeId(board, parentRes.newParent.id);

                setTimeout(() => {
                  editMindNodeTopic(board, parentRes.newParent.id);
                }, 30);
              }
            }
            return;
          }

          const addRes = addChildNode(root, selectedMindNodeId, '分支主题');
          if (addRes) {
            Transforms.setNode(
              board,
              { children: addRes.clonedRoot.children },
              path
            );
            setSelectedMindNodeId(board, addRes.newChild.id);

            setTimeout(() => {
              editMindNodeTopic(board, addRes.newChild.id);
            }, 30);
          }
          return;
        }

        // 7.3 Space: 激活编辑当前选中节点
        if (event.key === ' ' || event.code === 'Space') {
          event.preventDefault();
          event.stopPropagation();
          editMindNodeTopic(board, selectedMindNodeId);
          return;
        }

        // 7.4 Delete / Backspace: 删除非根节点
        if (event.key === 'Delete' || event.key === 'Backspace') {
          if (!isRootNode) {
            event.preventDefault();
            event.stopPropagation();

            const parentInfo = findParentNode(root, selectedMindNodeId);
            const delRes = deleteNode(root, selectedMindNodeId);
            if (delRes.deleted) {
              Transforms.setNode(
                board,
                { children: delRes.clonedRoot.children },
                path
              );
              if (parentInfo) {
                setSelectedMindNodeId(board, parentInfo.parent.id);
              }
            }
            return;
          }
        }
      }
    }

    globalKeyDown(event);
  };

  return board;
};

export const withMindKit = withSpeedMind;
