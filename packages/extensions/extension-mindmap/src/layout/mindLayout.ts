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

  const width = calculateMindmapNodeWidth(text, isRoot, markersCount);
  const height = isRoot ? 42 : 32;

  return { width, height };
}

/**
 * 映射布局模式到 Plait MindLayoutType
 */
function mapToMindLayoutType(layout?: string): MindLayoutType {
  switch (layout) {
    case 'right':
      return MindLayoutType.right;
    case 'left':
      return MindLayoutType.left;
    case 'downward':
      return MindLayoutType.downward;
    case 'upward':
      return MindLayoutType.upward;
    case 'standard':
    default:
      return MindLayoutType.standard;
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
  target: [number, number]
): string {
  const [sx, sy] = source;
  const [tx, ty] = target;
  const dy = ty - sy;
  if (Math.abs(dy) < 4) {
    return `M ${sx} ${sy} L ${tx} ${ty}`;
  }
  const factor = tx >= sx ? 1 : -1;
  const signY = dy > 0 ? 1 : -1;
  const midX = sx + Math.min(24, Math.abs(tx - sx) * 0.5) * factor;
  const r = Math.min(6, Math.abs(dy) * 0.5, Math.abs(tx - sx) * 0.5);

  return [
    `M ${sx} ${sy}`,
    `L ${midX - r * factor} ${sy}`,
    `Q ${midX} ${sy} ${midX} ${sy + r * signY}`,
    `L ${midX} ${ty - r * signY}`,
    `Q ${midX} ${ty} ${midX + r * factor} ${ty}`,
    `L ${tx} ${ty}`,
  ].join(' ');
}

/**
 * 生成概要大括号路径 (对标 X6 mindmap-summary-bracket)
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
  const r = Math.min(8, Math.max(3, h / 4));

  if (isLeft) {
    return [
      `M ${bracketX} ${topY}`,
      `Q ${bracketX - r} ${topY} ${bracketX - r} ${topY + r}`,
      `L ${bracketX - r} ${midY - r}`,
      `Q ${bracketX - r} ${midY} ${tipX} ${midY}`,
      `Q ${bracketX - r} ${midY} ${bracketX - r} ${midY + r}`,
      `L ${bracketX - r} ${bottomY - r}`,
      `Q ${bracketX - r} ${bottomY} ${bracketX} ${bottomY}`,
      `M ${tipX} ${midY}`,
      `L ${targetPoint[0]} ${targetPoint[1]}`,
    ].join(' ');
  }

  return [
    `M ${bracketX} ${topY}`,
    `Q ${bracketX + r} ${topY} ${bracketX + r} ${topY + r}`,
    `L ${bracketX + r} ${midY - r}`,
    `Q ${bracketX + r} ${midY} ${tipX} ${midY}`,
    `Q ${bracketX + r} ${midY} ${bracketX + r} ${midY + r}`,
    `L ${bracketX + r} ${bottomY - r}`,
    `Q ${bracketX + r} ${bottomY} ${bracketX} ${bottomY}`,
    `M ${tipX} ${midY}`,
    `L ${targetPoint[0]} ${targetPoint[1]}`,
  ].join(' ');
}

/**
 * 利用 @plait/layouts 计算脑图布局
 */
export function computeMindLayout(rootElement: SpeedMindElement): ComputedMindLayout {
  const rootPoint = rootElement.points?.[0] || [400, 300];
  const mindLayoutType = mapToMindLayoutType(rootElement.layout);

  // 1. 标准平衡布局：计算左右子节点配比
  const rightNodeCount =
    typeof rootElement.rightNodeCount === 'number'
      ? rootElement.rightNodeCount
      : Math.ceil((rootElement.children?.length || 0) / 2);

  const treeData = {
    ...rootElement,
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
      getVerticalConnectingPosition: () => 'middle' as any,
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

    box.children.forEach((childBox) => {
      // 区分概要节点
      if (childBox.element.data?.isSummary && childBox.element.data?.summaryFor) {
        const coveredIds = childBox.element.data.summaryFor;
        const coveredBoxes = coveredIds
          .map((id) => nodeMap.get(id))
          .filter((b): b is NodeLayoutBox => Boolean(b));

        if (coveredBoxes.length > 0) {
          const topY = Math.min(...coveredBoxes.map((b) => b.y));
          const bottomY = Math.max(...coveredBoxes.map((b) => b.y + b.height));
          const isLeft = childBox.left;

          const bracketX = isLeft
            ? Math.min(...coveredBoxes.map((b) => b.x)) - 8
            : Math.max(...coveredBoxes.map((b) => b.x + b.width)) + 8;

          const tipX = isLeft ? bracketX - 14 : bracketX + 14;
          const targetPoint: [number, number] = isLeft
            ? [childBox.x + childBox.width, childBox.y + childBox.height / 2]
            : [childBox.x, childBox.y + childBox.height / 2];

          const bracketPath = buildSummaryBracketPath(
            topY,
            bottomY,
            bracketX,
            tipX,
            targetPoint,
            isLeft
          );

          summaries.push({
            id: childBox.id,
            bracketPath,
            summaryBox: childBox,
            coveredBoxes,
            element: childBox.element,
          });
          return;
        }
      }

      // 常规分支连线
      const isLeft = childBox.left;
      const from: [number, number] = isLeft
        ? [box.x, box.y + box.height / 2]
        : [box.x + box.width, box.y + box.height / 2];

      const to: [number, number] = isLeft
        ? [childBox.x + childBox.width, childBox.y + childBox.height / 2]
        : [childBox.x, childBox.y + childBox.height / 2];

      const branchShape = (childBox.element.branchShape ||
        box.element.branchShape ||
        'curve') as 'curve' | 'polyline';

      links.push({
        from,
        to,
        color: childBox.element.branchColor || '#2563eb',
        width: childBox.element.branchWidth || 2,
        shape: branchShape,
        sourceBox: box,
        targetBox: childBox,
      });
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
