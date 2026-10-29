import {
  Board,
  PlaitPointerType,
  addSelectedElement,
  clearSelectedElement,
  Transforms,
} from '@speed-board/core';
import type { SpeedMindElement } from './types';
import { createEmptyMindmap } from './model/createMindmap';
import { cloneTree, findNodeById, addSummaryNode } from './model/treeOps';
import { getSelectedMindNodeId, setSelectedMindNodeId } from './component/SpeedMindComponent';

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

    const branchShape = shape === 'polyline' ? 'polyline' : 'curve';
    board.syncNodeIndices();
    selected.forEach((el) => {
      const path = board.getElementPath(el);
      if (path) {
        Transforms.setNode(board.raw, { branchShape }, path);
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
        : shape === 'none' || shape === 'underline'
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
      board.emit('change', {});
    }
  };

  Board.addMindmapSummaryHandler = (board: Board) => {
    const selected = (board.selectedElements || []).filter(
      (el) => (el as any).type === 'mind'
    ) as SpeedMindElement[];
    if (selected.length === 0) return;

    const root = selected[0];
    const selectedNodeId = getSelectedMindNodeId(board.raw);
    if (!selectedNodeId) return;

    const res = addSummaryNode(root, [selectedNodeId], '概要');
    if (res) {
      board.syncNodeIndices();
      const path = board.getElementPath(root);
      if (path) {
        Transforms.setNode(board.raw, { children: res.clonedRoot.children }, path);
        setSelectedMindNodeId(board.raw, res.summaryNode.id);
        board.syncNodeIndices();
        board.emit('change', {});
      }
    }
  };

  Board.setMindmapMarkersHandler = (board: Board, markers: Record<string, any>) => {
    const selected = (board.selectedElements || []).filter(
      (el) => (el as any).type === 'mind'
    ) as SpeedMindElement[];
    if (selected.length === 0) return;

    const root = selected[0];
    const selectedNodeId = getSelectedMindNodeId(board.raw) || root.id;

    const clonedRoot = cloneTree(root);
    const node = findNodeById(clonedRoot, selectedNodeId);
    if (!node) return;

    if (!node.data) node.data = { topic: { children: [{ text: '' }] } };
    node.data.markers = {
      ...(node.data.markers || {}),
      ...markers,
    };

    board.syncNodeIndices();
    const path = board.getElementPath(root);
    if (path) {
      Transforms.setNode(
        board.raw,
        { data: clonedRoot.data, children: clonedRoot.children },
        path
      );
      board.syncNodeIndices();
      board.emit('change', {});
    }
  };
}

registerBoardMindmap();
