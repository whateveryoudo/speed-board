import { GlobalLayout, MindLayoutType } from '@plait/layouts';
import type {
  SpeedMindElement,
  NodeLayoutBox,
  ComputedMindLayout,
  BranchLinkInfo,
  SummaryLayoutInfo,
} from '../types';
import { getNodeTopicText } from '../model/treeOps';
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

  return { width, height };
}

/**
 * 映射布局模式到 Plait MindLayoutType
 */
function mapToMindLayoutType(layout?: string): MindLayoutType {
  switch (layout) {
    case 'standard':
    case 'balanced':
      return MindLayoutType.standard;
    case 'left':
      return MindLayoutType.left;
    case 'downward':
      return MindLayoutType.downward;
    case 'upward':
      return MindLayoutType.upward;
    case 'right':
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
  // 折点位置：支持指定同级共享干线 trunkX，保证所有子分支在同一直线上直角转折 (对标主流思维导图直角结构)
  const midX = trunkX !== undefined ? trunkX : (sx + tx) / 2;

  return `M ${sx} ${sy} L ${midX} ${sy} L ${midX} ${ty} L ${tx} ${ty}`;
}

/**
 * 生成概要方括号路径 (直角方括弧风格，对标语雀思维导图)
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
  const h = Math.abs(bottomY - topY);
  const r = Math.min(2, h / 4);

  if (isLeft) {
    if (r <= 0) {
      return [
        `M ${bracketX} ${topY}`,
        `L ${tipX} ${topY}`,
        `L ${tipX} ${bottomY}`,
        `L ${bracketX} ${bottomY}`,
        `M ${tipX} ${midY}`,
        `L ${targetPoint[0]} ${targetPoint[1]}`,
      ].join(' ');
    }
    return [
      `M ${bracketX} ${topY}`,
      `L ${tipX + r} ${topY}`,
      `Q ${tipX} ${topY} ${tipX} ${topY + r}`,
      `L ${tipX} ${bottomY - r}`,
      `Q ${tipX} ${bottomY} ${tipX + r} ${bottomY}`,
      `L ${bracketX} ${bottomY}`,
      `M ${tipX} ${midY}`,
      `L ${targetPoint[0]} ${targetPoint[1]}`,
    ].join(' ');
  }

  // 右侧布局 (语雀直角方括弧风格)
  if (r <= 0) {
    return [
      `M ${bracketX} ${topY}`,
      `L ${tipX} ${topY}`,
      `L ${tipX} ${bottomY}`,
      `L ${bracketX} ${bottomY}`,
      `M ${tipX} ${midY}`,
      `L ${targetPoint[0]} ${targetPoint[1]}`,
    ].join(' ');
  }
  return [
    `M ${bracketX} ${topY}`,
    `L ${tipX - r} ${topY}`,
    `Q ${tipX} ${topY} ${tipX} ${topY + r}`,
    `L ${tipX} ${bottomY - r}`,
    `Q ${tipX} ${bottomY} ${tipX - r} ${bottomY}`,
    `L ${bracketX} ${bottomY}`,
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
  return {
    ...node,
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
  const mindLayoutType = mapToMindLayoutType(rootElement.layout);

  const summaryElements = collectSummaryElements(rootElement);
  const cleanRoot = cleanTreeForLayout(rootElement);

  // 1. 标准平衡布局：计算左右子节点配比 (基于无概要的纯净标准节点树)
  const rightNodeCount =
    typeof rootElement.rightNodeCount === 'number'
      ? rootElement.rightNodeCount
      : Math.ceil((cleanRoot.children?.length || 0) / 2);

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

    // 6.1 构造常规分支连线
    regularChildren.forEach((childBox) => {
      const isLeft = childBox.left;
      const from: [number, number] = isLeft
        ? [box.x, box.y + box.height / 2]
        : [box.x + box.width, box.y + box.height / 2];

      const to: [number, number] = isLeft
        ? [childBox.x + childBox.width, childBox.y + childBox.height / 2]
        : [childBox.x, childBox.y + childBox.height / 2];

      const rawShape =
        childBox.element.branchShape ||
        box.element.branchShape ||
        (rootElement as any).branchShape ||
        'curve';
      const branchShape = (rawShape === 'polyline' || rawShape === 'straight' ? 'polyline' : 'curve') as 'curve' | 'polyline';

      const trunkX = isLeft ? leftTrunkX : rightTrunkX;

      links.push({
        from,
        to,
        color: childBox.element.branchColor || '#2563eb',
        width: childBox.element.branchWidth || 2,
        shape: branchShape,
        sourceBox: box,
        targetBox: childBox,
        trunkX,
      });
    });
  });

  // 6.2 独立计算概要节点位置及大括号曲线 (不受树引擎常规兄弟间距干扰，贴合被包裹分支群右侧居中)
  summaryElements.forEach((sEl) => {
    const coveredIds = sEl.data?.summaryFor || [];
    const coveredBoxes = coveredIds
      .map((id) => nodeMap.get(id))
      .filter((b): b is NodeLayoutBox => Boolean(b));

    if (coveredBoxes.length === 0) return;

    const topY = Math.min(...coveredBoxes.map((b) => b.y)) + 4;
    const bottomY = Math.max(...coveredBoxes.map((b) => b.y + b.height)) - 4;
    const isLeft = coveredBoxes[0].left;

    const bracketW = 16;
    let bracketX: number;
    let tipX: number;

    if (isLeft) {
      const minLeft = Math.min(...coveredBoxes.map((b) => b.x));
      bracketX = minLeft - 14;
      tipX = bracketX - bracketW;
    } else {
      const maxRight = Math.max(...coveredBoxes.map((b) => b.x + b.width));
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
