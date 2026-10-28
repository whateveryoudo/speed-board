import type { SpeedMindElement } from '../types';
import { createChildMindNode } from './createMindmap';

export function getNodeTopicText(node: SpeedMindElement): string {
  return (
    node?.data?.topic?.children?.map((c) => c.text).join('') ||
    (node as any)?.topic ||
    ''
  );
}

export function setNodeTopicText(node: SpeedMindElement, text: string): void {
  if (!node.data) {
    node.data = { topic: { children: [{ text }] } };
  } else if (!node.data.topic) {
    node.data.topic = { children: [{ text }] };
  } else if (!node.data.topic.children || node.data.topic.children.length === 0) {
    node.data.topic.children = [{ text }];
  } else {
    node.data.topic.children[0].text = text;
  }
}

export function findNodeById(
  root: SpeedMindElement,
  id: string
): SpeedMindElement | null {
  if (root.id === id) return root;
  if (!root.children) return null;
  for (const child of root.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}

export function findNodeAndParent(
  root: SpeedMindElement,
  targetId: string,
  parent: SpeedMindElement | null = null,
  index = -1
): { node: SpeedMindElement | null; parent: SpeedMindElement | null; index: number } {
  if (root.id === targetId) {
    return { node: root, parent, index };
  }
  if (root.children) {
    for (let i = 0; i < root.children.length; i++) {
      const res = findNodeAndParent(root.children[i], targetId, root, i);
      if (res.node) return res;
    }
  }
  return { node: null, parent: null, index: -1 };
}

export function findParentNode(
  root: SpeedMindElement,
  targetId: string
): SpeedMindElement | null {
  return findNodeAndParent(root, targetId).parent;
}

export function addChildNode(
  root: SpeedMindElement,
  parentId: string,
  nodeData?: Partial<SpeedMindElement>
): SpeedMindElement | null {
  const parent = findNodeById(root, parentId);
  if (!parent) return null;

  if (!parent.children) {
    parent.children = [];
  }

  // 如果父节点之前被收起了，自动展开
  if (parent.isCollapsed) {
    parent.isCollapsed = false;
  }

  const newChild = createChildMindNode(nodeData?.data?.topic?.children?.[0]?.text || '分支主题', {
    branchColor: parent.branchColor || root.branchColor,
    ...nodeData,
  });

  parent.children.push(newChild);

  // 如果是标准对称布局 (standard)，维护 rightNodeCount 左右平衡
  if (parent === root && (root.layout === 'standard' || !root.layout)) {
    const count = root.children.length;
    root.rightNodeCount = Math.ceil(count / 2);
  }

  return newChild;
}

export function addSiblingNode(
  root: SpeedMindElement,
  siblingId: string,
  nodeData?: Partial<SpeedMindElement>
): SpeedMindElement | null {
  const { node, parent, index } = findNodeAndParent(root, siblingId);
  if (!parent || !node) {
    // 根节点没有同级，直接为根节点添加子节点
    return addChildNode(root, siblingId, nodeData);
  }

  const newSibling = createChildMindNode(nodeData?.data?.topic?.children?.[0]?.text || '分支主题', {
    shape: node.shape,
    fill: node.fill,
    strokeColor: node.strokeColor,
    branchColor: node.branchColor || parent.branchColor,
    branchWidth: node.branchWidth,
    ...nodeData,
  });

  parent.children.splice(index + 1, 0, newSibling);

  if (parent === root && (root.layout === 'standard' || !root.layout)) {
    const count = root.children.length;
    root.rightNodeCount = Math.ceil(count / 2);
  }

  return newSibling;
}

export function deleteNode(root: SpeedMindElement, targetId: string): boolean {
  if (root.id === targetId) {
    // 根节点不可直接删除
    return false;
  }
  const { parent, index } = findNodeAndParent(root, targetId);
  if (!parent || index === -1) return false;

  parent.children.splice(index, 1);

  if (parent === root && (root.layout === 'standard' || !root.layout)) {
    const count = root.children.length;
    root.rightNodeCount = Math.ceil(count / 2);
  }

  return true;
}

export function toggleCollapse(root: SpeedMindElement, targetId: string): boolean {
  const node = findNodeById(root, targetId);
  if (!node || !node.children || node.children.length === 0) return false;
  node.isCollapsed = !node.isCollapsed;
  return true;
}
