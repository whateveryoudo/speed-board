import type { SpeedMindElement } from '../types';
import { createChildNode, getBranchColorByIndex } from './createMindmap';

export function cloneTree(node: SpeedMindElement): SpeedMindElement {
  return JSON.parse(JSON.stringify(node));
}

export function findNodeById(
  root: SpeedMindElement,
  targetId: string
): SpeedMindElement | null {
  if (root.id === targetId) return root;
  if (!root.children || root.children.length === 0) return null;

  for (const child of root.children) {
    const found = findNodeById(child, targetId);
    if (found) return found;
  }
  return null;
}

export function findParentNode(
  root: SpeedMindElement,
  targetId: string
): { parent: SpeedMindElement; index: number } | null {
  if (!root.children || root.children.length === 0) return null;

  for (let i = 0; i < root.children.length; i++) {
    const child = root.children[i];
    if (child.id === targetId) {
      return { parent: root, index: i };
    }
    const found = findParentNode(child, targetId);
    if (found) return found;
  }
  return null;
}

export function getNodeTopicText(node: SpeedMindElement): string {
  const children = node.data?.topic?.children;
  if (!children || children.length === 0) return '';
  return children.map((c) => c.text || '').join('');
}

/**
 * 添加子节点 (纯不可变函数，返回克隆后的整棵树及新节点)
 */
export function addChildNode(
  root: SpeedMindElement,
  parentId: string,
  topic = '分支主题'
): { clonedRoot: SpeedMindElement; newChild: SpeedMindElement } | null {
  const clonedRoot = cloneTree(root);
  const parent = findNodeById(clonedRoot, parentId);
  if (!parent) return null;

  // 展开父节点
  if (parent.isCollapsed) {
    parent.isCollapsed = false;
  }

  // 样式继承与分配
  let branchColor = parent.branchColor || '#2563eb';
  if (parent.isRoot) {
    branchColor = getBranchColorByIndex(parent.children.length);
  }

  const newChild = createChildNode(topic, {
    branchColor,
    shape: parent.shape || 'roundRectangle',
    branchShape: parent.branchShape || 'curve',
  });

  if (!parent.children) {
    parent.children = [];
  }
  parent.children.push(newChild);

  return { clonedRoot, newChild };
}

/**
 * 添加同级节点 (纯不可变函数)
 */
export function addSiblingNode(
  root: SpeedMindElement,
  targetId: string,
  topic = '分支主题'
): { clonedRoot: SpeedMindElement; newSibling: SpeedMindElement } | null {
  if (root.id === targetId) {
    // 根节点按回车：相当于给根节点添加一级子节点！
    const res = addChildNode(root, targetId, topic);
    return res ? { clonedRoot: res.clonedRoot, newSibling: res.newChild } : null;
  }

  const clonedRoot = cloneTree(root);
  const parentInfo = findParentNode(clonedRoot, targetId);
  if (!parentInfo) return null;

  const { parent, index } = parentInfo;
  let branchColor = parent.branchColor || '#2563eb';
  if (parent.isRoot) {
    branchColor = getBranchColorByIndex(parent.children.length);
  }

  const newSibling = createChildNode(topic, {
    branchColor,
    shape: parent.shape || 'roundRectangle',
    branchShape: parent.branchShape || 'curve',
  });

  parent.children.splice(index + 1, 0, newSibling);

  return { clonedRoot, newSibling };
}

/**
 * 删除节点 (纯不可变函数)
 */
export function deleteNode(
  root: SpeedMindElement,
  targetId: string
): { clonedRoot: SpeedMindElement; deleted: boolean } {
  if (root.id === targetId) {
    return { clonedRoot: root, deleted: false };
  }

  const clonedRoot = cloneTree(root);
  const parentInfo = findParentNode(clonedRoot, targetId);
  if (!parentInfo) return { clonedRoot: root, deleted: false };

  parentInfo.parent.children.splice(parentInfo.index, 1);
  return { clonedRoot, deleted: true };
}

/**
 * 折叠/展开节点 (纯不可变函数)
 */
export function toggleCollapse(
  root: SpeedMindElement,
  targetId: string
): { clonedRoot: SpeedMindElement; isCollapsed: boolean } | null {
  const clonedRoot = cloneTree(root);
  const node = findNodeById(clonedRoot, targetId);
  if (!node || !node.children || node.children.length === 0) return null;

  node.isCollapsed = !node.isCollapsed;
  return { clonedRoot, isCollapsed: node.isCollapsed };
}

/**
 * 修改节点文字 (纯不可变函数)
 */
export function setNodeTopicText(
  root: SpeedMindElement,
  targetId: string,
  newText: string
): SpeedMindElement {
  const clonedRoot = cloneTree(root);
  const node = findNodeById(clonedRoot, targetId);
  if (!node) return root;

  if (!node.data) node.data = { topic: { children: [{ text: '' }] } };
  if (!node.data.topic) node.data.topic = { children: [{ text: '' }] };
  if (!node.data.topic.children || node.data.topic.children.length === 0) {
    node.data.topic.children = [{ text: newText }];
  } else {
    node.data.topic.children[0].text = newText;
  }

  return clonedRoot;
}

/**
 * 移动/重新父级化节点 (支持拖拽调整顺序与层级)
 */
export function moveNode(
  root: SpeedMindElement,
  sourceId: string,
  targetParentId: string,
  targetIndex?: number
): SpeedMindElement | null {
  if (sourceId === root.id || sourceId === targetParentId) return null;
  const clonedRoot = cloneTree(root);
  const sourceInfo = findParentNode(clonedRoot, sourceId);
  if (!sourceInfo) return null;

  const [removed] = sourceInfo.parent.children.splice(sourceInfo.index, 1);
  const targetParent = findNodeById(clonedRoot, targetParentId);
  if (!targetParent) return null;

  if (!targetParent.children) targetParent.children = [];
  if (
    typeof targetIndex === 'number' &&
    targetIndex >= 0 &&
    targetIndex <= targetParent.children.length
  ) {
    targetParent.children.splice(targetIndex, 0, removed);
  } else {
    targetParent.children.push(removed);
  }
  return clonedRoot;
}

/**
 * 添加概要节点 (大括号关联一组子节点)
 */
export function addSummaryNode(
  root: SpeedMindElement,
  nodeIds: string[],
  summaryText = '概要'
): { clonedRoot: SpeedMindElement; summaryNode: SpeedMindElement } | null {
  if (!nodeIds || nodeIds.length === 0) return null;

  const clonedRoot = cloneTree(root);
  // 找到第一个节点的父级
  const parentInfo = findParentNode(clonedRoot, nodeIds[0]);
  if (!parentInfo) return null;

  const { parent } = parentInfo;
  const summaryNode = createChildNode(summaryText, {
    branchColor: '#6366f1',
    shape: 'roundRectangle',
    isSummary: true,
    summaryFor: nodeIds,
  });

  if (!parent.children) parent.children = [];
  parent.children.push(summaryNode);

  return { clonedRoot, summaryNode };
}
