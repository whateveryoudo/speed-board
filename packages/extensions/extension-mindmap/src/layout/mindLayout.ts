import { GlobalLayout, MindLayoutType } from '@plait/layouts';
import type { SpeedMindElement, NodeLayoutBox } from '../types';
import { getNodeTopicText } from '../model/treeOps';
import { measureSlateSpansSize } from '@speed-board/core';

export function calculateNodeSize(
  node: SpeedMindElement,
  isRoot: boolean
): { width: number; height: number } {
  if (node.width && node.height) {
    return { width: node.width, height: node.height };
  }

  const defaultFontSize = isRoot ? 16 : 14;
  const children = node.data?.topic?.children || [
    { text: getNodeTopicText(node) || (isRoot ? '思维导图' : '分支主题'), fontSize: defaultFontSize },
  ];

  const { width: estimatedTextWidth, maxFontSize } = measureSlateSpansSize(children, defaultFontSize);

  // 标记 (priority, progress, flag)
  const markers = node.data?.markers;
  let markerCount = 0;
  if (markers) {
    if (typeof markers.priority === 'number') markerCount++;
    if (typeof markers.progress === 'number') markerCount++;
    if (markers.flag) markerCount++;
  }
  const emojis = node.data?.emojis;
  if (Array.isArray(emojis)) {
    markerCount += emojis.length;
  }

  const markerWidth = markerCount * 22;
  const paddingX = isRoot ? 32 : 24;
  const minWidth = isRoot ? 110 : 70;
  const width = Math.max(minWidth, estimatedTextWidth + markerWidth + paddingX);
  const height = Math.max(isRoot ? 42 : 32, Math.round(maxFontSize * 1.5) + (isRoot ? 16 : 12));

  return { width, height };
}

function prepareLayoutTree(node: SpeedMindElement): any {
  if (node.isCollapsed) {
    return { ...node, children: [] };
  }
  return {
    ...node,
    children: (node.children || []).map(prepareLayoutTree),
  };
}

export interface ComputedMindLayout {
  nodes: NodeLayoutBox[];
  nodeMap: Map<string, NodeLayoutBox>;
  bounds: { x: number; y: number; width: number; height: number };
}

export function computeMindLayout(root: SpeedMindElement): ComputedMindLayout {
  const preparedRoot = prepareLayoutTree(root);
  const layoutType = (root.layout as MindLayoutType) || MindLayoutType.standard;

  const options = {
    getWidth: (origin: SpeedMindElement) => {
      const isRoot = origin.id === root.id || Boolean(origin.isRoot);
      return calculateNodeSize(origin, isRoot).width;
    },
    getHeight: (origin: SpeedMindElement) => {
      const isRoot = origin.id === root.id || Boolean(origin.isRoot);
      return calculateNodeSize(origin, isRoot).height;
    },
    getHorizontalGap: (origin: SpeedMindElement, parent?: SpeedMindElement) => {
      return origin.id === root.id ? 40 : 35;
    },
    getVerticalGap: (origin: SpeedMindElement, parent?: SpeedMindElement) => {
      return 12;
    },
    getHorizontalIndent: () => 0,
    getVerticalIndent: () => 0,
    getVerticalConnectingPosition: () => null,
  };

  const layoutResult = GlobalLayout.layout(preparedRoot, options as any, layoutType);

  // 目标位置偏移：根节点应该对齐到 root.points[0]
  const rootPoint = root.points?.[0] || [0, 0];
  const rootInnerX = layoutResult.x + layoutResult.hGap;
  const rootInnerY = layoutResult.y + layoutResult.vGap;
  const offsetX = rootPoint[0] - rootInnerX;
  const offsetY = rootPoint[1] - rootInnerY;

  const nodeMap = new Map<string, NodeLayoutBox>();
  const nodes: NodeLayoutBox[] = [];

  layoutResult.eachNode((item: any) => {
    const origin = item.origin as SpeedMindElement;
    const innerX = item.x + item.hGap + offsetX;
    const innerY = item.y + item.vGap + offsetY;
    const innerW = item.width - 2 * item.hGap;
    const innerH = item.height - 2 * item.vGap;

    const box: NodeLayoutBox = {
      id: origin.id,
      x: innerX,
      y: innerY,
      width: innerW,
      height: innerH,
      depth: item.depth,
      left: Boolean(item.left),
      up: Boolean(item.up),
      element: origin,
      children: [],
    };

    nodeMap.set(origin.id, box);
    nodes.push(box);
  });

  // 关联 parent 与 children 引用
  for (const box of nodes) {
    if (box.element.children && !box.element.isCollapsed) {
      for (const childElem of box.element.children) {
        const childBox = nodeMap.get(childElem.id);
        if (childBox) {
          childBox.parent = box;
          box.children.push(childBox);
        }
      }
    }
  }

  // 计算整体包围盒
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const box of nodes) {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }

  const bounds = {
    x: Number.isFinite(minX) ? minX : rootPoint[0],
    y: Number.isFinite(minY) ? minY : rootPoint[1],
    width: Number.isFinite(maxX - minX) ? maxX - minX : 120,
    height: Number.isFinite(maxY - minY) ? maxY - minY : 50,
  };

  return { nodes, nodeMap, bounds };
}
