import {
  Board,
  PlaitPointerType,
  addSelectedElement,
  clearSelectedElement,
  Transforms,
} from '@speed-board/core';
import type { SpeedMindElement } from './types';
import { createEmptyMindmap } from './model/createMindmap';
import {
  cloneTree,
  findNodeById,
  findParentNode,
  addSummaryNode,
  deleteNode,
  findMindRootAndPath,
} from './model/treeOps';
import { getSelectedMindNodeId, setSelectedMindNodeId } from './component/SpeedMindComponent';
import { editMindNodeTopic } from './renderer/inlineEditor';

export function registerBoardMindmap(): void {
  Board.insertMindmapHandler = (
    board: Board,
    topic = '思维导图',
    point?: [number, number]
  ) => {
    const center = point || board.getViewportCenterPoint();
    const emptyMind = createEmptyMindmap(topic, {
      points: [center],
    });

    board.syncNodeIndices();
    Transforms.insertNode(board.raw, emptyMind, [board.raw.children.length]);
    board.syncNodeIndices();

    board.setPointer(PlaitPointerType.selection);
    clearSelectedElement(board.raw);
    addSelectedElement(board.raw, emptyMind);
    setSelectedMindNodeId(board.raw, emptyMind.id);

    board.emit('change', {});
    board.emit('selection:change', { selected: [emptyMind] });
    return emptyMind;
  };

  Board.setMindmapLayoutHandler = (board: Board, layout: string) => {
    const selected = (board.selectedElements || []).filter(
      (el) => (el as any).type === 'mind'
    ) as SpeedMindElement[];
    if (selected.length === 0) return;

    board.syncNodeIndices();
    selected.forEach((el) => {
      const path = board.getElementPath(el);
      if (path) {
        Transforms.setNode(board.raw, { layout }, path);
        board.syncNodeIndices();
        const updatedRoot = board.raw.children[path[0]] as SpeedMindElement;
        if (updatedRoot) {
          clearSelectedElement(board.raw);
          addSelectedElement(board.raw, updatedRoot);
          board.emit('selection:change', { selected: [updatedRoot] });
        }
      }
    });
    board.syncNodeIndices();
    board.emit('change', {});
  };

  Board.setMindmapBranchShapeHandler = (board: Board, shape: string) => {
    const selected = (board.selectedElements || []).filter(
      (el) => (el as any).type === 'mind'
    ) as SpeedMindElement[];
    if (selected.length === 0) return;

    const branchShape = shape === 'polyline' || shape === 'straight' ? 'polyline' : 'curve';
    const selectedNodeId = getSelectedMindNodeId(board.raw);

    board.syncNodeIndices();
    selected.forEach((el) => {
      const clonedRoot = cloneTree(el);
      // 同时设置根节点自身的 branchShape，保证根节点状态与整树默认值一致
      clonedRoot.branchShape = branchShape;

      // 如果选中了具体子节点，支持针对子节点及其后代递归切换，或直接更新根节点
      if (selectedNodeId && selectedNodeId !== clonedRoot.id) {
        const targetNode = findNodeById(clonedRoot, selectedNodeId);
        if (targetNode) {
          const updateSubtree = (n: SpeedMindElement) => {
            n.branchShape = branchShape;
            n.children?.forEach(updateSubtree);
          };
          updateSubtree(targetNode);
        }
      } else {
        // 选中根节点：更新整棵树所有分支的连线类型
        const updateAll = (n: SpeedMindElement) => {
          n.branchShape = branchShape;
          n.children?.forEach(updateAll);
        };
        updateAll(clonedRoot);
      }

      const path = board.getElementPath(el);
      if (path) {
        Transforms.setNode(board.raw, clonedRoot, path);
        board.syncNodeIndices();
        const updatedRoot = board.raw.children[path[0]] as SpeedMindElement;
        if (updatedRoot) {
          clearSelectedElement(board.raw);
          addSelectedElement(board.raw, updatedRoot);
          if (selectedNodeId) {
            setSelectedMindNodeId(board.raw, selectedNodeId);
          }
          board.emit('selection:change', { selected: [updatedRoot] });
        }
      }
    });
    board.syncNodeIndices();
    board.emit('change', {});
  };

  Board.setMindmapShapeHandler = (board: Board, shape: string) => {
    const selected = (board.selectedElements || []).filter(
      (el) => (el as any).type === 'mind'
    ) as SpeedMindElement[];
    if (selected.length === 0) return;

    const nodeShape =
      shape === 'capsule'
        ? 'capsule'
        : shape === 'none'
        ? 'none'
        : shape === 'underline'
        ? 'underline'
        : 'roundRectangle';

    const root = selected[0];
    const selectedNodeId = getSelectedMindNodeId(board.raw);

    const clonedRoot = cloneTree(root);
    if (selectedNodeId && selectedNodeId !== clonedRoot.id) {
      const node = findNodeById(clonedRoot, selectedNodeId);
      if (node) {
        node.shape = nodeShape as any;
      }
    } else {
      clonedRoot.shape = nodeShape as any;
    }

    board.syncNodeIndices();
    const path = board.getElementPath(root);
    if (path) {
      Transforms.setNode(board.raw, clonedRoot, path);
      board.syncNodeIndices();
      const updatedRoot = board.raw.children[path[0]] as SpeedMindElement;
      if (updatedRoot) {
        clearSelectedElement(board.raw);
        addSelectedElement(board.raw, updatedRoot);
        if (selectedNodeId) {
          setSelectedMindNodeId(board.raw, selectedNodeId);
        }
        board.emit('selection:change', { selected: [updatedRoot] });
      }
      board.emit('change', {});
    }
  };

  Board.setMindmapNodePropertyHandler = (board: Board, properties: Record<string, any>) => {
    const selected = (board.selectedElements || []).filter(
      (el) => (el as any).type === 'mind'
    ) as SpeedMindElement[];
    if (selected.length === 0) return;

    const root = selected[0];
    const selectedNodeId = getSelectedMindNodeId(board.raw);

    const clonedRoot = cloneTree(root);
    if (selectedNodeId && selectedNodeId !== clonedRoot.id) {
      const node = findNodeById(clonedRoot, selectedNodeId);
      if (node) {
        Object.assign(node, properties);
      }
    } else {
      Object.assign(clonedRoot, properties);
    }

    board.syncNodeIndices();
    const path = board.getElementPath(root);
    if (path) {
      Transforms.setNode(board.raw, clonedRoot, path);
      board.syncNodeIndices();
      const updatedRoot = board.raw.children[path[0]] as SpeedMindElement;
      if (updatedRoot) {
        clearSelectedElement(board.raw);
        addSelectedElement(board.raw, updatedRoot);
        if (selectedNodeId) {
          setSelectedMindNodeId(board.raw, selectedNodeId);
        }
        board.emit('selection:change', { selected: [updatedRoot] });
      }
      board.emit('change', {});
    }
  };

  Board.setMindmapBranchPropertyHandler = (board: Board, properties: Record<string, any>) => {
    const selected = (board.selectedElements || []).filter(
      (el) => (el as any).type === 'mind'
    ) as SpeedMindElement[];
    if (selected.length === 0) return;

    const root = selected[0];
    const selectedNodeId = getSelectedMindNodeId(board.raw);

    const clonedRoot = cloneTree(root);
    if (selectedNodeId && selectedNodeId !== clonedRoot.id) {
      const node = findNodeById(clonedRoot, selectedNodeId);
      if (node) {
        Object.assign(node, properties);
      }
    } else {
      Object.assign(clonedRoot, properties);
    }

    board.syncNodeIndices();
    const path = board.getElementPath(root);
    if (path) {
      Transforms.setNode(board.raw, clonedRoot, path);
      board.syncNodeIndices();
      const updatedRoot = board.raw.children[path[0]] as SpeedMindElement;
      if (updatedRoot) {
        clearSelectedElement(board.raw);
        addSelectedElement(board.raw, updatedRoot);
        if (selectedNodeId) {
          setSelectedMindNodeId(board.raw, selectedNodeId);
        }
        board.emit('selection:change', { selected: [updatedRoot] });
      }
      board.emit('change', {});
    }
  };

  Board.addMindmapSummaryHandler = (board: Board) => {
    const selected = (board.selectedElements || []).filter(
      (el) => (el as any).type === 'mind'
    ) as SpeedMindElement[];
    if (selected.length === 0) return;

    const root = selected[0];
    const selectedNodeId = getSelectedMindNodeId(board.raw) || root.id;
    if (!selectedNodeId) return;

    const targetNode = findNodeById(root, selectedNodeId);
    if (!targetNode) return;
    if (targetNode.isSummary || targetNode.data?.isSummary) return;

    // 确定被包裹的节点 ID 集合
    let childIds: string[] = [];
    const hasChildren = Boolean(
      targetNode.children &&
      targetNode.children.some((c: any) => !c.data?.isSummary && !c.isSummary)
    );

    if (hasChildren) {
      const normalChildren = targetNode.children.filter(
        (c: any) => !c.data?.isSummary && !c.isSummary
      );
      // 若为平衡双侧布局的根节点，根据布局侧向挑选同侧子集
      if (targetNode.isRoot || targetNode.id === root.id) {
        const rootLayout = root.layout || 'right';
        if (rootLayout === 'standard' || rootLayout === 'balanced') {
          const rightCount =
            typeof root.rightNodeCount === 'number'
              ? root.rightNodeCount
              : Math.ceil(normalChildren.length / 2);
          childIds = normalChildren.slice(0, rightCount).map((c: any) => c.id);
        } else {
          childIds = normalChildren.map((c: any) => c.id);
        }
      } else {
        childIds = normalChildren.map((c: any) => c.id);
      }
    } else if (!targetNode.isRoot && targetNode.id !== root.id) {
      // 叶子节点：对自身生成概要
      childIds = [targetNode.id];
    }

    if (childIds.length === 0) return;

    // 检查是否已有概要节点覆盖这一组目标
    const parentInfo = findParentNode(root, childIds[0]);
    if (!parentInfo) return;
    const parent = parentInfo.parent;
    const existingSummary = (parent.children || []).find(
      (c) =>
        (c.isSummary || c.data?.isSummary) &&
        Array.isArray(c.data?.summaryFor) &&
        c.data.summaryFor.length === childIds.length &&
        c.data.summaryFor.every((id: string) => childIds.includes(id))
    );

    if (existingSummary) {
      setSelectedMindNodeId(board.raw, existingSummary.id);
      board.emit('selection:change', { selected: [root] });
      board.emit('change', {});
      setTimeout(() => {
        editMindNodeTopic(board.raw, existingSummary.id);
      }, 30);
      return;
    }

    // 创建新概要节点
    const res = addSummaryNode(root, childIds, '概要');
    if (res) {
      board.syncNodeIndices();
      const path = board.getElementPath(root);
      if (path) {
        Transforms.setNode(board.raw, { children: res.clonedRoot.children }, path);
        board.syncNodeIndices();
        const updatedRoot = board.raw.children[path[0]] as SpeedMindElement;
        if (updatedRoot) {
          clearSelectedElement(board.raw);
          addSelectedElement(board.raw, updatedRoot);
          setSelectedMindNodeId(board.raw, res.summaryNode.id);
          board.emit('selection:change', { selected: [updatedRoot] });
        }
        board.emit('change', {});

        // 立即拉起概要节点的就地文本编辑
        setTimeout(() => {
          editMindNodeTopic(board.raw, res.summaryNode.id);
        }, 50);
      }
    }
  };

  Board.deleteMindmapSummaryHandler = (board: Board) => {
    const selected = (board.selectedElements || []).filter(
      (el) => (el as any).type === 'mind'
    ) as SpeedMindElement[];
    if (selected.length === 0) return;

    const root = selected[0];
    const selectedNodeId = getSelectedMindNodeId(board.raw);
    if (!selectedNodeId) return;

    const targetNode = findNodeById(root, selectedNodeId);
    if (!targetNode) return;

    let summaryIdToDelete: string | null = null;
    let fallbackFocusId: string = root.id;

    if (targetNode.isSummary || targetNode.data?.isSummary) {
      summaryIdToDelete = targetNode.id;
      const pInfo = findParentNode(root, targetNode.id);
      if (pInfo) fallbackFocusId = pInfo.parent.id;
    } else {
      const pInfo = findParentNode(root, targetNode.id);
      const parent = pInfo?.parent || targetNode;
      const found = (parent.children || []).find(
        (c) =>
          (c.isSummary || c.data?.isSummary) &&
          Array.isArray(c.data?.summaryFor) &&
          c.data.summaryFor.includes(targetNode.id)
      );
      if (found) {
        summaryIdToDelete = found.id;
        fallbackFocusId = targetNode.id;
      }
    }

    if (summaryIdToDelete) {
      const delRes = deleteNode(root, summaryIdToDelete);
      if (delRes.deleted) {
        board.syncNodeIndices();
        const path = board.getElementPath(root);
        if (path) {
          Transforms.setNode(board.raw, { children: delRes.clonedRoot.children }, path);
          board.syncNodeIndices();
          const updatedRoot = board.raw.children[path[0]] as SpeedMindElement;
          if (updatedRoot) {
            clearSelectedElement(board.raw);
            addSelectedElement(board.raw, updatedRoot);
            setSelectedMindNodeId(board.raw, fallbackFocusId);
            board.emit('selection:change', { selected: [updatedRoot] });
          }
          board.emit('change', {});
        }
      }
    }
  };

  Board.setMindmapMarkersHandler = (
    board: Board,
    markers: Record<string, any>,
    targetNodeId?: string
  ) => {
    let root: SpeedMindElement | null = null;
    let path: any = null;
    let selectedNodeId: string | null = targetNodeId || null;

    if (targetNodeId) {
      const info = findMindRootAndPath(board.raw, targetNodeId);
      if (info) {
        root = info.root;
        path = info.path;
      }
    }

    if (!root) {
      const selected = (board.selectedElements || []).filter(
        (el) => (el as any).type === 'mind'
      ) as SpeedMindElement[];
      if (selected.length === 0) return;

      root = selected[0];
      selectedNodeId = getSelectedMindNodeId(board.raw) || root.id;
      path = board.getElementPath(root);
    }

    if (!root) return;

    const clonedRoot = cloneTree(root);
    const node = findNodeById(clonedRoot, selectedNodeId || root.id);
    if (!node) return;

    if (!node.data) node.data = { topic: { children: [{ text: '' }] } };
    const updatedMarkers: any = { ...(node.data.markers || {}) };
    Object.keys(markers).forEach((k) => {
      if (markers[k] === null || markers[k] === undefined) {
        delete updatedMarkers[k];
      } else {
        updatedMarkers[k] = markers[k];
      }
    });
    node.data.markers = Object.keys(updatedMarkers).length > 0 ? updatedMarkers : undefined;

    board.syncNodeIndices();
    if (path) {
      Transforms.setNode(
        board.raw,
        { data: clonedRoot.data, children: clonedRoot.children },
        path
      );
      board.syncNodeIndices();
      const updatedRoot = board.raw.children[path[0]] as SpeedMindElement;
      if (updatedRoot) {
        clearSelectedElement(board.raw);
        addSelectedElement(board.raw, updatedRoot);
        if (selectedNodeId) {
          setSelectedMindNodeId(board.raw, selectedNodeId);
        }
        board.emit('selection:change', { selected: [updatedRoot] });
      }
      board.emit('change', {});
    }
  };
}

registerBoardMindmap();
