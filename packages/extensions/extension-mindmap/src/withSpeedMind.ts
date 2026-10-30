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
  addParentNode,
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
  getHoverMindNodeId,
  setHoverMindNodeId,
  notifyMindHandlesUpdate,
} from './component/SpeedMindComponent';
import {
  editMindNodeTopic,
  closeInlineEditing,
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
          clearSelectedElement(board);
          addSelectedElement(board, info.root);
          setSelectedMindNodeId(board, nodeId);
          const wrapper = (board as any).boardWrapper;
          wrapper?.emit?.('selection:change', { selected: [info.root] });
          (board as any).apply({ type: 'set_selection' } as any);
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
    let clickedNodeId: string | null = null;
    let clickedRoot: SpeedMindElement | null = null;

    const nodeEl = target?.closest?.('.speed-mind-node-g') as HTMLElement | SVGElement | null;
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
      const point = toViewBoxPoint(board, toHostPoint(board, event.x, event.y));
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
      clearSelectedElement(board);
      addSelectedElement(board, clickedRoot);
      setSelectedMindNodeId(board, clickedNodeId);

      const wrapper = (board as any).boardWrapper;
      wrapper?.emit?.('selection:change', { selected: [clickedRoot] });
      (board as any).apply({ type: 'set_selection' } as any);
    } else {
      const isUIElement = Boolean(
        target?.closest?.(
          '.speed-floating-toolbar, .floating-bubble-toolbar, .speed-mindmap-settings-drawer, .speed-board-settings-panel, .style-settings-panel, .ant-drawer, .ant-popover, .ant-select-dropdown, .plait-board-attached, .speed-mind-add-handle, .speed-mind-collapse-badge, .speed-mind-collapse-btn, .mindmap-marker-quick-picker, .speed-mind-marker-item'
        )
      );
      if (!isUIElement) {
        // 仅在真实点击画布空白背景时清理当前选中态
        setSelectedMindNodeId(board, null);
        clearSelectedElement(board);
        const wrapper = (board as any).boardWrapper;
        wrapper?.emit?.('selection:change', { selected: [] });
      }
    }

    // 尝试启动子节点拖拽检测
    dndController.onPointerDown(event);

    pointerDown(event);
  };

  // 5. 悬浮监听与子节点拖拽联动 (支持 hover 悬浮即显示 + 和 < 操作手柄)
  board.pointerMove = (event: PointerEvent) => {
    if (dndController.onPointerMove(event)) {
      return;
    }

    const target = event.target as HTMLElement | SVGElement | null;
    const compPath = event.composedPath ? (event.composedPath() as Element[]) : [];

    // 检查是否悬浮在操作手柄区（+、<、延伸线）
    const isOverHandle = compPath.some(
      (el) =>
        el instanceof Element &&
        (el.classList?.contains('speed-mind-handles-layer') ||
          el.classList?.contains('speed-mind-add-handle') ||
          el.classList?.contains('speed-mind-collapse-handle'))
    );

    // 检查是否悬浮在某个脑图节点卡片上
    const nodeEl =
      (compPath.find((el) => el instanceof Element && el.classList?.contains('speed-mind-node-g')) as HTMLElement | SVGElement | null) ||
      (target?.closest?.('.speed-mind-node-g') as HTMLElement | SVGElement | null);

    if (nodeEl) {
      const nodeId = nodeEl.getAttribute('data-node-id');
      const currentHover = getHoverMindNodeId(board);
      if (nodeId && nodeId !== currentHover) {
        setHoverMindNodeId(board, nodeId);
        notifyMindHandlesUpdate(board, nodeId);
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

  // 5.1 全局抬起：子节点拖拽释放判定
  board.globalPointerUp = (event: PointerEvent) => {
    if (dndController.onGlobalPointerUp(event)) {
      return;
    }
    globalPointerUp(event);
  };

  // 6. 双击节点启动就地编辑 (优先坐标几何碰撞判定，同步设置画布选中态与全选文本)
  board.dblClick = (event: MouseEvent) => {
    const point = toViewBoxPoint(board, toHostPoint(board, event.x, event.y));
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
          (board as any).apply({ type: 'set_selection' } as any);

          editMindNodeTopic(board, box.id);
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }
    }

    // 兜底：DOM target closest 判定
    const target = event.target as HTMLElement | SVGElement | null;
    const nodeEl = target?.closest?.('.speed-mind-node-g') as HTMLElement | SVGElement | null;
    if (nodeEl) {
      const nodeId = nodeEl.getAttribute('data-node-id');
      if (nodeId) {
        const info = findMindRootAndPath(nodeId);
        if (info) {
          clearSelectedElement(board);
          addSelectedElement(board, info.root);
          const wrapper = (board as any).boardWrapper;
          wrapper?.emit?.('selection:change', { selected: [info.root] });
          (board as any).apply({ type: 'set_selection' } as any);
        }
        setSelectedMindNodeId(board, nodeId);
        editMindNodeTopic(board, nodeId);
        event.preventDefault();
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
