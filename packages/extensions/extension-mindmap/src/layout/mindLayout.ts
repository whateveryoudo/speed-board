import { GlobalLayout, MindLayoutType } from '@plait/layouts';
import type {
  SpeedMindElement,
  NodeLayoutBox,
  ComputedMindLayout,
  BranchLinkInfo,
  SummaryLayoutInfo,
} from '../types';
import { getNodeTopicText, findParentNode } from '../model/treeOps';
import { calculateMindmapNodeWidth } from '@speed-board/shared';

const DEFAULT_H_GAP = 42;
const DEFAULT_V_GAP = 14;

/**
 * 测量节点宽高 (对标 X6 经典尺寸与间距)
 */
export function estimateNodeDimensions(
  node: SpeedMindElement,
  isRoot: boolean
): { width: number; height: number } {
  const text = getNodeTopicText(node) || (isRoot ? '思维导图' : '分支主题');
  const markersCount =
    node.data?.markers && typeof node.data.markers === 'object'
      ? Object.keys(node.data.markers).length
      : 0;

  let width = calculateMindmapNodeWidth(text, isRoot, markersCount);
  let height = isRoot ? 42 : 32;

  // 如果节点包含图片，增加图片尺寸与卡片高度
  if (node.data?.image?.url) {
    const imgW = node.data.image.width || 120;
    const imgH = node.data.image.height || 80;
    width = Math.max(width, imgW + (isRoot ? 24 : 16));
    height = height + imgH + 8;
  }

  // 用户手动拖拽拉伸的节点自定义宽度
  const manualW = node.manualWidth || node.data?.manualWidth;
  if (typeof manualW === 'number' && manualW > 0) {
    width = Math.max(width, manualW);
  }

  return { width, height };
}

/**
 * 映射布局模式到 Plait MindLayoutType
 */
function mapToMindLayoutType(layout?: string): MindLayoutType {
  switch (layout) {
    case 'standard':
    case 'balanced':
    case 'timeline-h':
      return MindLayoutType.standard;
    case 'left':
    case 'bracket-left':
      return MindLayoutType.left;
    case 'downward':
    case 'org-down':
    case 'timeline-v':
      return MindLayoutType.downward;
    case 'upward':
    case 'timeline-up':
    case 'org-up':
      return MindLayoutType.upward;
    case 'tree-right':
    case 'right-bottom-indented':
      return MindLayoutType.rightBottomIndented;
    case 'tree-left':
    case 'left-bottom-indented':
      return MindLayoutType.leftBottomIndented;
    case 'tree-right-top':
    case 'right-top-indented':
      return MindLayoutType.rightTopIndented;
    case 'tree-left-top':
    case 'left-top-indented':
      return MindLayoutType.leftTopIndented;
    case 'right':
    case 'fishbone':
    case 'bracket-right':
    default:
      return MindLayoutType.right;
  }
}

/**
 * 生成平滑贝塞尔曲线路径 (对标 X6 mindmap-curve)
 */
export function buildBezierBranchPath(
  source: [number, number],
  target: [number, number]
): string {
  const [sx, sy] = source;
  const [tx, ty] = target;
  if (Math.abs(ty - sy) < 4) {
    return `M ${sx} ${sy} L ${tx} ${ty}`;
  }
  const dx = Math.max(Math.abs(tx - sx) * 0.5, 16);
  const factor = tx >= sx ? 1 : -1;
  const cx1 = sx + dx * factor;
  const cy1 = sy;
  const cx2 = tx - dx * factor;
  const cy2 = ty;
  return `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`;
}

/**
 * 生成纵向平滑贝塞尔曲线路径 (用于组织架构图向下/向上布局)
 */
export function buildVerticalBezierBranchPath(
  source: [number, number],
  target: [number, number]
): string {
  const [sx, sy] = source;
  const [tx, ty] = target;
  if (Math.abs(tx - sx) < 4) {
    return `M ${sx} ${sy} L ${tx} ${ty}`;
  }
  const dy = Math.max(Math.abs(ty - sy) * 0.5, 16);
  const factor = ty >= sy ? 1 : -1;
  const cy1 = sy + dy * factor;
  const cx1 = sx;
  const cy2 = ty - dy * factor;
  const cx2 = tx;
  return `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`;
}

/**
 * 生成折线分支路径 (对标 X6 mindmap-straight)
 */
export function buildStraightBranchPath(
  source: [number, number],
  target: [number, number],
  trunkX?: number
): string {
  const [sx, sy] = source;
  const [tx, ty] = target;
  const dy = ty - sy;
  if (Math.abs(dy) < 2) {
    return `M ${sx} ${sy} L ${tx} ${ty}`;
  }
  const midX = trunkX !== undefined ? trunkX : (sx + tx) / 2;
  return `M ${sx} ${sy} L ${midX} ${sy} L ${midX} ${ty} L ${tx} ${ty}`;
}

/**
 * 生成纵向折线分支路径 (用于组织架构图向下/向上直角连线)
 */
export function buildVerticalStraightBranchPath(
  source: [number, number],
  target: [number, number],
  trunkY?: number
): string {
  const [sx, sy] = source;
  const [tx, ty] = target;
  const midY = trunkY !== undefined ? trunkY : (sy + ty) / 2;
  return `M ${sx} ${sy} L ${sx} ${midY} L ${tx} ${midY} L ${tx} ${ty}`;
}

/**
 * 生成缩进树状图分支路径 (用于树状图向右/向左 L 形平滑转折连线)
 */
export function buildIndentedBranchPath(
  source: [number, number],
  target: [number, number],
  isLeft = false
): string {
  const [sx, sy] = source;
  const [tx, ty] = target;
  const radius = Math.min(6, Math.abs(ty - sy) / 2, Math.abs(tx - sx) / 2);
  if (radius <= 1) {
    return `M ${sx} ${sy} L ${sx} ${ty} L ${tx} ${ty}`;
  }
  const turnY = ty >= sy ? ty - radius : ty + radius;
  const endX = isLeft ? sx - radius : sx + radius;
  return `M ${sx} ${sy} L ${sx} ${turnY} Q ${sx} ${ty} ${endX} ${ty} L ${tx} ${ty}`;
}

/**
 * 生成概要大括号路径 (1:1 对标 Plait Mind / XMind 原生平滑圆弧大括号)
 */
export function buildSummaryBracketPath(
  topY: number,
  bottomY: number,
  bracketX: number,
  tipX: number,
  targetPoint: [number, number],
  isLeft: boolean
): string {
  const midY = (topY + bottomY) / 2;
  return [
    `M ${bracketX} ${topY}`,
    `Q ${tipX} ${topY} ${tipX} ${midY}`,
    `Q ${tipX} ${bottomY} ${bracketX} ${bottomY}`,
    `M ${tipX} ${midY}`,
    `L ${targetPoint[0]} ${targetPoint[1]}`,
  ].join(' ');
}

/**
 * 递归清洗思维导图树，剥离概要节点，以便 GlobalLayout 引擎纯净地计算常规分支层级与垂直布局
 */
function cleanTreeForLayout(node: SpeedMindElement): SpeedMindElement {
  const cleanChildren = (node.children || [])
    .filter((c) => !c.isSummary && !c.data?.isSummary)
    .map((c) => cleanTreeForLayout(c));
  const rawL = node.layout || node.data?.structure || (node as any).structure;
  return {
    ...node,
    layout: rawL ? (mapToMindLayoutType(rawL) as any) : undefined,
    children: cleanChildren,
  };
}

/**
 * 收集树中所有的概要节点
 */
function collectSummaryElements(node: SpeedMindElement, result: SpeedMindElement[] = []): SpeedMindElement[] {
  if (node.children) {
    for (const child of node.children) {
      if (child.isSummary || child.data?.isSummary) {
        result.push(child);
      }
      collectSummaryElements(child, result);
    }
  }
  return result;
}

/**
 * 利用 @plait/layouts 计算脑图布局
 */
export function computeMindLayout(rootElement: SpeedMindElement): ComputedMindLayout {
  const rootPoint = rootElement.points?.[0] || [400, 300];
  const rawLayout =
    rootElement.layout || rootElement.data?.structure || (rootElement as any).structure;
  const mindLayoutType = mapToMindLayoutType(rawLayout);

  const summaryElements = collectSummaryElements(rootElement);
  const cleanRoot = cleanTreeForLayout(rootElement);

  // 1. 标准平衡布局：计算左右子节点配比 (基于无概要的纯净标准节点树)
  let rightNodeCount =
    typeof rootElement.rightNodeCount === 'number'
      ? rootElement.rightNodeCount
      : Math.ceil((cleanRoot.children?.length || 0) / 2);

  if (mindLayoutType === MindLayoutType.standard) {
    if (
      typeof rootElement.rightNodeCount !== 'number' ||
      rootElement.rightNodeCount >= (cleanRoot.children?.length || 0) ||
      rootElement.rightNodeCount <= 0
    ) {
      rightNodeCount = Math.ceil((cleanRoot.children?.length || 0) / 2);
    }
  } else if (
    mindLayoutType === MindLayoutType.left ||
    mindLayoutType === MindLayoutType.leftBottomIndented ||
    mindLayoutType === MindLayoutType.leftTopIndented
  ) {
    rightNodeCount = 0;
  } else {
    rightNodeCount = cleanRoot.children?.length || 0;
  }

  const treeData = {
    ...cleanRoot,
    rightNodeCount,
  };

  // 2. 调用 GlobalLayout 纯数学引擎
  const layoutRoot = GlobalLayout.layout(
    treeData as any,
    {
      getHeight: (node: any) =>
        estimateNodeDimensions(node, Boolean(node.isRoot || node.id === rootElement.id)).height,
      getWidth: (node: any) =>
        estimateNodeDimensions(node, Boolean(node.isRoot || node.id === rootElement.id)).width,
      getHorizontalGap: () => DEFAULT_H_GAP,
      getVerticalGap: () => DEFAULT_V_GAP,
      getVerticalConnectingPosition: () => undefined as any,
      getExtendHeight: () => 0,
      getIndentedCrossLevelGap: () => 20,
    },
    mindLayoutType
  );

  // 3. 计算对齐画板 points[0] 的绝对坐标偏移
  const offsetX = layoutRoot.x + layoutRoot.hGap;
  const offsetY = layoutRoot.y + layoutRoot.vGap;
  const rootX = rootPoint[0];
  const rootY = rootPoint[1];

  const nodeMap = new Map<string, NodeLayoutBox>();
  const parentMap = new Map<string, NodeLayoutBox>();
  const childrenMap = new Map<string, NodeLayoutBox[]>();

  // 4. 第一遍遍历：构造所有节点的基础包围盒
  layoutRoot.eachNode((n: any) => {
    const actualX = n.x + n.hGap - offsetX + rootX;
    const actualY = n.y + n.vGap - offsetY + rootY;
    const actualW = n.width - 2 * n.hGap;
    const actualH = n.height - 2 * n.vGap;

    const box: NodeLayoutBox = {
      id: n.origin.id,
      x: actualX,
      y: actualY,
      width: actualW,
      height: actualH,
      depth: n.depth,
      left: Boolean(n.left),
      up: Boolean(n.up),
      element: n.origin,
      children: [],
    };

    nodeMap.set(box.id, box);
    childrenMap.set(box.id, []);
  });

  // 5. 第二遍：建立父子引用关系
  layoutRoot.eachNode((n: any) => {
    const box = nodeMap.get(n.origin.id);
    if (!box) return;

    if (n.parent) {
      const parentBox = nodeMap.get(n.parent.origin.id);
      if (parentBox) {
        box.parent = parentBox;
        parentMap.set(box.id, parentBox);
        childrenMap.get(parentBox.id)?.push(box);
      }
    }
  });

  // 把 children 挂载回 box
  nodeMap.forEach((box) => {
    box.children = childrenMap.get(box.id) || [];
  });

  const rootBox = nodeMap.get(rootElement.id)!;

  // 6. 构造分支连线列表
  const links: BranchLinkInfo[] = [];
  const summaries: SummaryLayoutInfo[] = [];

  nodeMap.forEach((box) => {
    // 如果节点被折叠，不为其子节点生成连线
    if (box.element.isCollapsed) return;

    // 分离出同侧常规子节点，计算共享垂直干线 trunkX
    const regularChildren = box.children.filter(
      (c) => !(c.element.data?.isSummary && c.element.data?.summaryFor)
    );
    const rightChildren = regularChildren.filter((c) => !c.left);
    const leftChildren = regularChildren.filter((c) => c.left);

    let rightTrunkX: number | undefined;
    if (rightChildren.length > 0) {
      const minChildX = Math.min(...rightChildren.map((c) => c.x));
      rightTrunkX = (box.x + box.width + minChildX) / 2;
    }

    let leftTrunkX: number | undefined;
    if (leftChildren.length > 0) {
      const maxChildX = Math.max(...leftChildren.map((c) => c.x + c.width));
      leftTrunkX = (box.x + maxChildX) / 2;
    }

    const isVerticalLayout =
      mindLayoutType === MindLayoutType.downward || mindLayoutType === MindLayoutType.upward;
    const isIndented =
      mindLayoutType === MindLayoutType.rightBottomIndented ||
      mindLayoutType === MindLayoutType.leftBottomIndented ||
      mindLayoutType === MindLayoutType.rightTopIndented ||
      mindLayoutType === MindLayoutType.leftTopIndented;

    let commonTrunkY: number | undefined;
    if (isVerticalLayout && regularChildren.length > 0) {
      if (mindLayoutType === MindLayoutType.downward) {
        const minChildY = Math.min(...regularChildren.map((c) => c.y));
        commonTrunkY = (box.y + box.height + minChildY) / 2;
      } else {
        const maxChildY = Math.max(...regularChildren.map((c) => c.y + c.height));
        commonTrunkY = (box.y + maxChildY) / 2;
      }
    }

    // 6.1 构造常规分支连线
    regularChildren.forEach((childBox) => {
      let from: [number, number];
      let to: [number, number];
      let trunkX: number | undefined;
      let trunkY: number | undefined;

      if (isIndented) {
        const isLeft = childBox.left;
        const startX = isLeft
          ? box.x + box.width - Math.min(20, box.width / 2)
          : box.x + Math.min(20, box.width / 2);
        const startY = box.y + box.height;
        const endX = isLeft ? childBox.x + childBox.width : childBox.x;
        const endY = childBox.y + childBox.height / 2;

        from = [startX, startY];
        to = [endX, endY];
      } else if (isVerticalLayout) {
        if (mindLayoutType === MindLayoutType.downward) {
          from = [box.x + box.width / 2, box.y + box.height];
          to = [childBox.x + childBox.width / 2, childBox.y];
        } else {
          from = [box.x + box.width / 2, box.y];
          to = [childBox.x + childBox.width / 2, childBox.y + childBox.height];
        }
        trunkY = commonTrunkY;
      } else {
        const isLeft = childBox.left;
        from = isLeft
          ? [box.x, box.y + box.height / 2]
          : [box.x + box.width, box.y + box.height / 2];

        to = isLeft
          ? [childBox.x + childBox.width, childBox.y + childBox.height / 2]
          : [childBox.x, childBox.y + childBox.height / 2];

        trunkX = isLeft ? leftTrunkX : rightTrunkX;
      }

      const rawShape =
        childBox.element.branchShape ||
        box.element.branchShape ||
        (rootElement as any).branchShape ||
        'curve';
      const branchShape = (rawShape === 'polyline' || rawShape === 'straight' ? 'polyline' : 'curve') as 'curve' | 'polyline';

      links.push({
        from,
        to,
        color: childBox.element.branchColor || '#2563eb',
        width: childBox.element.branchWidth || 2,
        shape: branchShape,
        sourceBox: box,
        targetBox: childBox,
        trunkX,
        trunkY,
        isVertical: isVerticalLayout,
        isIndented,
      });
    });
  });

  // 递归收集子树中所有展开的布局节点包围盒 (用于概要整体外扩避让)
  const getSubtreeBoxes = (box: NodeLayoutBox): NodeLayoutBox[] => {
    const list: NodeLayoutBox[] = [box];
    if (box.element.isCollapsed) return list;
    for (const child of box.children) {
      list.push(...getSubtreeBoxes(child));
    }
    return list;
  };

  // 6.2 独立计算概要节点位置及大括号曲线 (不受树引擎常规兄弟间距干扰，贴合被包裹分支群右侧居中)
  summaryElements.forEach((sEl) => {
    const coveredIds = sEl.data?.summaryFor || [];
    const coveredBoxes = coveredIds
      .map((id) => nodeMap.get(id))
      .filter((b): b is NodeLayoutBox => Boolean(b));

    if (coveredBoxes.length === 0) return;

    // 获取所有被覆盖节点及其展开的所有后代子节点的整体集合
    const allDescendantBoxes = coveredBoxes.flatMap((b) => getSubtreeBoxes(b));

    // 当前分支父节点 (例如 1121 -> [222, 333] 中的 1121，概要框选同时包裹当前分支父节点与所有被包含分支)
    const parentInfo = findParentNode(rootElement, coveredBoxes[0].id);
    const parentBox = parentInfo && !parentInfo.parent.isRoot ? nodeMap.get(parentInfo.parent.id) : null;
    const enclosedBoxes = parentBox ? [parentBox, ...allDescendantBoxes] : allDescendantBoxes;

    const minDescX = Math.min(...enclosedBoxes.map((b) => b.x));
    const maxDescX = Math.max(...enclosedBoxes.map((b) => b.x + b.width));
    const minDescY = Math.min(...enclosedBoxes.map((b) => b.y));
    const maxDescY = Math.max(...enclosedBoxes.map((b) => b.y + b.height));

    const outlineOffset = 6;
    const rangeRect = {
      x: minDescX - outlineOffset,
      y: minDescY - outlineOffset,
      width: maxDescX - minDescX + outlineOffset * 2,
      height: maxDescY - minDescY + outlineOffset * 2,
    };

    const topY = minDescY + 4;
    const bottomY = maxDescY - 4;
    const isLeft = coveredBoxes[0].left;

    const bracketW = 16;
    let bracketX: number;
    let tipX: number;

    if (isLeft) {
      const minLeft = Math.min(...allDescendantBoxes.map((b) => b.x));
      bracketX = minLeft - 14;
      tipX = bracketX - bracketW;
    } else {
      const maxRight = Math.max(...allDescendantBoxes.map((b) => b.x + b.width));
      bracketX = maxRight + 14;
      tipX = bracketX + bracketW;
    }

    const midY = (topY + bottomY) / 2;
    const sDim = estimateNodeDimensions(sEl, false);
    const sWidth = sDim.width;
    const sHeight = sDim.height;

    const nodeX = isLeft ? tipX - 10 - sWidth : tipX + 10;
    const nodeY = midY - sHeight / 2;

    const targetPoint: [number, number] = isLeft
      ? [nodeX + sWidth, midY]
      : [nodeX, midY];

    const bracketPath = buildSummaryBracketPath(
      topY,
      bottomY,
      bracketX,
      tipX,
      targetPoint,
      isLeft
    );

    const summaryBox: NodeLayoutBox = {
      id: sEl.id,
      x: nodeX,
      y: nodeY,
      width: sWidth,
      height: sHeight,
      depth: (coveredBoxes[0].depth || 1) + 1,
      left: isLeft,
      up: false,
      element: sEl,
      children: [],
    };

    nodeMap.set(summaryBox.id, summaryBox);

    summaries.push({
      id: sEl.id,
      bracketPath,
      summaryBox,
      coveredBoxes,
      element: sEl,
      rangeRect,
    });
  });

  // 7. 计算整棵导图外包围矩形
  let minX = Number.MAX_VALUE;
  let minY = Number.MAX_VALUE;
  let maxX = Number.MIN_VALUE;
  let maxY = Number.MIN_VALUE;

  nodeMap.forEach((box) => {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  });

  summaries.forEach((s) => {
    minX = Math.min(minX, s.summaryBox.x);
    minY = Math.min(minY, s.summaryBox.y);
    maxX = Math.max(maxX, s.summaryBox.x + s.summaryBox.width);
    maxY = Math.max(maxY, s.summaryBox.y + s.summaryBox.height);
  });

  const boundingRect = {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };

  return {
    rootBox,
    nodeMap,
    links,
    summaries,
    boundingRect,
  };
}
