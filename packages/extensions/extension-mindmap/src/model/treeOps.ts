import type { SpeedMindElement } from '../types';
import { createChildNode, getBranchColorByIndex } from './createMindmap';

export function cloneTree(node: SpeedMindElement): SpeedMindElement {
  return JSON.parse(JSON.stringify(node));
}

export function cloneTreeWithNewIds(node: SpeedMindElement): SpeedMindElement {
  const cloned = cloneTree(node);
  function renewId(n: SpeedMindElement) {
    n.id = `mind-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    if (n.children && Array.isArray(n.children)) {
      n.children.forEach(renewId);
    }
  }
  renewId(cloned);
  return cloned;
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
 * 辅助函数：根据 nodeId 定位其所属的脑图根元素及索引 Path
 */
export function findMindRootAndPath(
  board: any,
  nodeId: string
): { root: SpeedMindElement; path: [number] } | null {
  if (!board?.children) return null;
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
}
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

  // 清理或更新引用了 targetId 的概要节点；若概要关联的目标节点被全部删除，则同步移除孤立概要节点
  const cleanSummaries = (node: SpeedMindElement) => {
    if (!node.children) return;
    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i];
      if (child.isSummary || child.data?.isSummary) {
        if (Array.isArray(child.data?.summaryFor)) {
          child.data.summaryFor = child.data.summaryFor.filter((id) => id !== targetId);
          if (child.data.summaryFor.length === 0) {
            node.children.splice(i, 1);
            continue;
          }
        }
      }
      cleanSummaries(child);
    }
  };
  cleanSummaries(clonedRoot);

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
 * 修改节点富文本对象 (纯不可变函数)
 */
export function setNodeTopic(
  root: SpeedMindElement,
  targetId: string,
  newTopic: any
): SpeedMindElement {
  const clonedRoot = cloneTree(root);
  const node = findNodeById(clonedRoot, targetId);
  if (!node) return root;

  if (!node.data) node.data = { topic: newTopic };
  else node.data.topic = newTopic;

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
  let insertIdx = typeof targetIndex === 'number' ? targetIndex : targetParent.children.length;
  if (
    sourceInfo.parent.id === targetParent.id &&
    typeof targetIndex === 'number' &&
    targetIndex > sourceInfo.index
  ) {
    insertIdx = Math.max(0, insertIdx - 1);
  }
  insertIdx = Math.max(0, Math.min(insertIdx, targetParent.children.length));
  targetParent.children.splice(insertIdx, 0, removed);

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
    branchColor: '#94a3b8',
    shape: 'roundRectangle',
    isSummary: true,
    summaryFor: nodeIds,
  });
  summaryNode.isSummary = true;

  if (!parent.children) parent.children = [];
  parent.children.push(summaryNode);

  return { clonedRoot, summaryNode };
}

/**
 * 添加父级节点 (在当前节点与其原父节点之间插入一个新的父节点)
 */
export function addParentNode(
  root: SpeedMindElement,
  targetId: string,
  topic = '父主题'
): { clonedRoot: SpeedMindElement; newParent: SpeedMindElement } | null {
  if (root.id === targetId) {
    // 根节点无法在其上方插入父级
    return null;
  }

  const clonedRoot = cloneTree(root);
  const parentInfo = findParentNode(clonedRoot, targetId);
  if (!parentInfo) return null;

  const { parent, index } = parentInfo;
  const currentTarget = parent.children[index];

  let branchColor = parent.branchColor || '#2563eb';
  if (parent.isRoot) {
    branchColor = getBranchColorByIndex(index);
  }

  const newParent = createChildNode(topic, {
    branchColor,
    shape: parent.shape || 'roundRectangle',
    branchShape: parent.branchShape || 'curve',
  });

  // 把当前节点作为新父节点的子节点
  newParent.children = [currentTarget];
  // 替换原位置
  parent.children.splice(index, 1, newParent);

  return { clonedRoot, newParent };
}

/**
 * 更新节点数据 (如图片、链接、备注等)
 */
export function updateNodeData(
  root: SpeedMindElement,
  targetId: string,
  dataUpdates: Partial<SpeedMindElement['data']>
): SpeedMindElement {
  const clonedRoot = cloneTree(root);
  const node = findNodeById(clonedRoot, targetId);
  if (!node) return root;

  node.data = {
    ...node.data,
    ...dataUpdates,
  };
  return clonedRoot;
}

/**
 * 递归导出节点及其子树为缩进纯文本
 */
export function copyNodeAsText(node: SpeedMindElement, depth = 0): string {
  const indent = '  '.repeat(depth);
  const text = getNodeTopicText(node) || (node.isRoot ? '思维导图' : '分支主题');
  let result = `${indent}${text}\n`;
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      result += copyNodeAsText(child, depth + 1);
    }
  }
  return result;
}

/**
 * 递归导出节点及其子树为标准 Markdown 结构
 */
export function copyNodeAsMarkdown(node: SpeedMindElement, depth = 0): string {
  const text = getNodeTopicText(node) || (node.isRoot ? '思维导图' : '分支主题');
  let line = '';
  if (depth === 0) {
    line = `# ${text}\n\n`;
  } else if (depth === 1) {
    line = `## ${text}\n\n`;
  } else if (depth === 2) {
    line = `### ${text}\n\n`;
  } else {
    const indent = '  '.repeat(Math.max(0, depth - 3));
    line = `${indent}- ${text}\n`;
  }
  let result = line;
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      result += copyNodeAsMarkdown(child, depth + 1);
    }
  }
  return result;
}
