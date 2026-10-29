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
} from '@plait/core';
import type { SpeedMindElement, NodeLayoutBox } from './types';
import { createEmptyMindmap } from './model/createMindmap';
import {
  addChildNode,
  addSiblingNode,
  deleteNode,
  findNodeById,
  findParentNode,
  getNodeTopicText,
  setNodeTopicText,
  toggleCollapse,
} from './model/treeOps';
import { computeMindLayout } from './layout/mindLayout';
import {
  SpeedMindComponent,
  MIND_LAYOUT_CACHE,
  getSelectedMindNodeId,
  setSelectedMindNodeId,
  setHoverMindNodeId,
} from './component/SpeedMindComponent';
import {
  editMindNodeTopic,
} from './renderer/inlineEditor';
import { MindNodeDnDController } from './interaction/MindNodeDnDController';
import './registerBoardMindmap';

export const withSpeedMind = <T extends PlaitBoard = PlaitBoard>(board: T): T => {
  const {
    drawElement,
    pointerDown,
    pointerMove,
    globalPointerUp,
    dblClick,
    keyDown,
    globalKeyDown,
    getRectangle,
    isHit,
    isRectangleHit,
    isMovable,
  } = board;

  const dndController = new MindNodeDnDController(board);

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
      return layout.boundingRect;
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

      return true;
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

    if (PlaitBoard.hasBeenTextEditing(board)) {
      pointerDown(event);
      return;
    }

    const target = event.target as HTMLElement | SVGElement | null;

    // 4.2 点击外延操作手柄 (+ 按钮 / 折叠展开)
    const handleEl = target?.closest?.('[data-action]') as HTMLElement | SVGElement | null;
    if (handleEl) {
      const action = handleEl.getAttribute('data-action');
      const nodeId = handleEl.getAttribute('data-node-id');

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

    // 4.3 点击节点卡片：选中该特定节点，通知选区变更
    const nodeEl = target?.closest?.('.speed-mind-node-g') as HTMLElement | SVGElement | null;
    if (nodeEl) {
      const nodeId = nodeEl.getAttribute('data-node-id');
      if (nodeId) {
        const info = findMindRootAndPath(nodeId);
        if (info) {
          const { root } = info;
          clearSelectedElement(board);
          addSelectedElement(board, root);
          setSelectedMindNodeId(board, nodeId);

          const wrapper = (board as any).boardWrapper;
          wrapper?.emit?.('selection:change', { selected: [root] });
          (board as any).apply({ type: 'set_selection' } as any);
        }
      }
    }

    // 尝试启动子节点拖拽检测
    dndController.onPointerDown(event);

    pointerDown(event);
  };

  // 5. 悬浮监听与子节点拖拽联动
  board.pointerMove = (event: PointerEvent) => {
    if (dndController.onPointerMove(event)) {
      return;
    }

    const target = event.target as HTMLElement | SVGElement | null;
    const nodeEl = target?.closest?.('.speed-mind-node-g') as HTMLElement | SVGElement | null;
    if (nodeEl) {
      const nodeId = nodeEl.getAttribute('data-node-id');
      setHoverMindNodeId(board, nodeId);
    } else {
      setHoverMindNodeId(board, null);
    }
    pointerMove(event);
  };

  // 5.1 全局抬起：子节点拖拽释放判定
  board.globalPointerUp = (event: PointerEvent) => {
    if (dndController.onGlobalPointerUp(event)) {
      return;
    }
    globalPointerUp(event);
  };

  // 6. 双击节点启动就地编辑
  board.dblClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | SVGElement | null;
    const nodeEl = target?.closest?.('.speed-mind-node-g') as HTMLElement | SVGElement | null;
    if (nodeEl) {
      const nodeId = nodeEl.getAttribute('data-node-id');
      if (nodeId) {
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

        // 7.0 用户直接键入字符：立即就地启动编辑 (1:1 对标 Text/Shape 图形节点输入体验)
        const isPrintableKey =
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey &&
          event.key.length === 1 &&
          event.key !== ' ' &&
          event.code !== 'Space';

        if (isPrintableKey) {
          event.preventDefault();
          event.stopPropagation();
          editMindNodeTopic(board, selectedMindNodeId);
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

        // 7.2 Tab: 统一添加子级
        if (event.key === 'Tab') {
          event.preventDefault();
          event.stopPropagation();

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
