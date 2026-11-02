import type { PlaitElement, PlaitPlugin, Point } from '@plait/core';
import {
  PlaitBoard,
  createG,
  drawCircle,
  drawRoundRectangle,
  distanceBetweenPointAndPoint,
  toHostPoint,
  toViewBoxPoint,
  getSelectedElements,
  Transforms,
  KEY_TO_ELEMENT_MAP
} from '@plait/core';
import {
  ArrowLineShape,
  PlaitArrowLine,
  PlaitDrawElement,
  getSelectedArrowLineElements
} from '@plait/draw';
import { isDrawingMode, isResizing } from '@plait/common';

export interface MindConnectorRef {
  point: Point;
  connection: [number, number];
  direction: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * 计算脑图节点卡片的 4 个标准磁吸落点桩子 (上、右、下、左)
 */
export function getMindNodeConnectors(box: {
  x: number;
  y: number;
  width: number;
  height: number;
}): MindConnectorRef[] {
  return [
    { point: [box.x + box.width / 2, box.y], connection: [0.5, 0], direction: 'top' },
    { point: [box.x + box.width, box.y + box.height / 2], connection: [1, 0.5], direction: 'right' },
    { point: [box.x + box.width / 2, box.y + box.height], connection: [0.5, 1], direction: 'bottom' },
    { point: [box.x, box.y + box.height / 2], connection: [0, 0.5], direction: 'left' }
  ];
}

/**
 * 渲染脑图节点卡片的磁吸线框与 4 个落点桩子 (1:1 对标 Plait 形状节点反馈)
 */
function renderMindNodeReaction(
  board: PlaitBoard,
  box: { x: number; y: number; width: number; height: number },
  connectors: MindConnectorRef[],
  nearestConnector: MindConnectorRef | null
): SVGGElement {
  const g = createG();
  g.classList.add('mind-node-connect-reaction');

  // 1. 节点卡片高亮线框
  const rectG = drawRoundRectangle(
    PlaitBoard.getRoughSVG(board),
    box.x - 2,
    box.y - 2,
    box.x + box.width + 2,
    box.y + box.height + 2,
    {
      stroke: '#1e88e5',
      strokeWidth: 1.5,
      fill: 'rgba(30, 136, 229, 0.08)',
      fillStyle: 'solid'
    },
    true,
    6
  );
  g.appendChild(rectG);

  // 2. 4 个磁吸落点桩子 (白色圆 + 蓝色边框，直径 8px)
  for (const c of connectors) {
    const circleG = drawCircle(PlaitBoard.getRoughSVG(board), c.point, 8, {
      stroke: '#1e88e5',
      strokeWidth: 1.5,
      fill: '#FFFFFF',
      fillStyle: 'solid'
    });
    g.appendChild(circleG);
  }

  // 3. 激活吸附时的实心蓝色指示圆点 (直径 6px)
  if (nearestConnector) {
    const snapCircleG = drawCircle(PlaitBoard.getRoughSVG(board), nearestConnector.point, 6, {
      stroke: '#1e88e5',
      strokeWidth: 1.5,
      fill: '#1e88e5',
      fillStyle: 'solid'
    });
    g.appendChild(snapCircleG);
  }

  return g;
}

/**
 * 为白板绘图扩展注入脑图节点连线与落点磁吸增强:
 * 1. 动态挂载虚拟元素 Proxy：让 Plait 底层连线系统 (直线、曲线、折线) 可以无缝通过 `${rootId}:${nodeId}` 读取节点坐标。
 * 2. 画线/拉线靠近脑图卡片时，浮现 4 个落点桩子并磁吸吸附。
 * 3. 增强连线端点拖拽手柄命中范围 (14px 宽容度)，彻底根除点击端点手柄被误判为平移整条线的问题。
 */
export const withMindConnectEnhance: PlaitPlugin = (board: PlaitBoard) => {
  const { pointerDown, pointerMove, pointerUp, globalPointerUp } = board;

  // 1. 安装虚拟元素代理 (无缝桥接 Plait 的 getElementById)
  const setupMindElementMapProxy = () => {
    const map =
      KEY_TO_ELEMENT_MAP.get(board) ||
      KEY_TO_ELEMENT_MAP.get((board as any).raw) ||
      (board as any).__elementMap__;
    if (map && !(map as any).__hasMindProxy__) {
      (map as any).__hasMindProxy__ = true;
      const originalGet = map.get.bind(map);
      map.get = function (key: string) {
        const hit = originalGet(key);
        if (hit) return hit;
        if (typeof key === 'string' && key.includes(':')) {
          const colonIndex = key.indexOf(':');
          const rootId = key.substring(0, colonIndex);
          const nodeId = key.substring(colonIndex + 1);
          const box = (board as any).getMindNodeBox?.(rootId, nodeId);
          if (box) {
            return {
              id: key,
              type: 'geometry',
              shape: 'round-rectangle',
              points: [
                [box.x, box.y],
                [box.x + box.width, box.y + box.height]
              ]
            } as any;
          }
        }
        return undefined;
      };
    }
  };

  setupMindElementMapProxy();

  let reactionG: SVGGElement | null = null;
  let currentSnappedRef: {
    rootId: string;
    nodeId: string;
    point: Point;
    connection: [number, number];
  } | null = null;

  let drawingSourceMindRef: {
    rootId: string;
    nodeId: string;
    point: Point;
    connection: [number, number];
  } | null = null;

  let activeResizingLine: PlaitArrowLine | null = null;
  let activeResizingHandle: 'source' | 'target' | null = null;

  const linePointerKeys = ['straight', 'curve', 'elbow', ...Object.keys(ArrowLineShape)];

  board.pointerDown = (event: PointerEvent) => {
    setupMindElementMapProxy();
    const movingPoint = toViewBoxPoint(board, toHostPoint(board, event.x, event.y));

    // A. 连线绘制起步：检测是否从脑图节点落点起笔
    const isLinePointer = PlaitBoard.isInPointer(board, linePointerKeys);
    if (isLinePointer && isDrawingMode(board)) {
      const hit = (board as any).getMindHitNode?.(movingPoint, 25);
      if (hit) {
        const connectors = getMindNodeConnectors(hit.box);
        let nearest = connectors[0];
        let minDist = Infinity;
        for (const c of connectors) {
          const dist = distanceBetweenPointAndPoint(...movingPoint, ...c.point);
          if (dist < minDist) {
            minDist = dist;
            nearest = c;
          }
        }
        if (minDist <= 25) {
          drawingSourceMindRef = {
            rootId: hit.root.id,
            nodeId: hit.box.id,
            point: nearest.point,
            connection: nearest.connection
          };
        } else {
          drawingSourceMindRef = null;
        }
      } else {
        drawingSourceMindRef = null;
      }
    }

    // B. 端点拉伸手柄宽容度增强 (解决 "无法拉伸了？变成平移了")
    // 当选中单条连线时，如果点击落在起点或终点手柄 14px 范围内，校准 event 坐标直达手柄中心
    const selectedLines = getSelectedArrowLineElements(board);
    if (selectedLines.length === 1 && !isLinePointer) {
      const line = selectedLines[0];
      const points = PlaitArrowLine.getPoints(board, line);
      const sourcePt = points[0];
      const targetPt = points[points.length - 1];

      const distSource = distanceBetweenPointAndPoint(...movingPoint, ...sourcePt);
      const distTarget = distanceBetweenPointAndPoint(...movingPoint, ...targetPt);

      const HANDLE_HIT_BUFFER = 14;
      if (distSource <= HANDLE_HIT_BUFFER) {
        activeResizingLine = line;
        activeResizingHandle = 'source';
      } else if (distTarget <= HANDLE_HIT_BUFFER) {
        activeResizingLine = line;
        activeResizingHandle = 'target';
      } else {
        activeResizingLine = null;
        activeResizingHandle = null;
      }
    } else {
      activeResizingLine = null;
      activeResizingHandle = null;
    }

    pointerDown(event);
  };

  board.pointerMove = (event: PointerEvent) => {
    setupMindElementMapProxy();
    reactionG?.remove();
    reactionG = null;

    const movingPoint = toViewBoxPoint(board, toHostPoint(board, event.x, event.y));
    const isLinePointer = PlaitBoard.isInPointer(board, linePointerKeys);
    const isResizingLine = Boolean(activeResizingLine && isResizing(board));

    // 仅在正在画线或拖拽连线手柄时显示落点桩子
    if ((isLinePointer && isDrawingMode(board)) || isResizingLine) {
      const hit = (board as any).getMindHitNode?.(movingPoint, 25);
      if (hit) {
        const connectors = getMindNodeConnectors(hit.box);
        let nearest = connectors[0];
        let minDist = Infinity;
        for (const c of connectors) {
          const dist = distanceBetweenPointAndPoint(...movingPoint, ...c.point);
          if (dist < minDist) {
            minDist = dist;
            nearest = c;
          }
        }

        const isSnapped =
          minDist <= 25 ||
          (movingPoint[0] >= hit.box.x &&
            movingPoint[0] <= hit.box.x + hit.box.width &&
            movingPoint[1] >= hit.box.y &&
            movingPoint[1] <= hit.box.y + hit.box.height);

        reactionG = renderMindNodeReaction(board, hit.box, connectors, isSnapped ? nearest : null);
        PlaitBoard.getElementTopHost(board).append(reactionG);

        if (isSnapped) {
          currentSnappedRef = {
            rootId: hit.root.id,
            nodeId: hit.box.id,
            point: nearest.point,
            connection: nearest.connection
          };
        } else {
          currentSnappedRef = null;
        }
      } else {
        currentSnappedRef = null;
      }
    } else {
      currentSnappedRef = null;
    }

    pointerMove(event);
  };

  board.pointerUp = (event: PointerEvent) => {
    reactionG?.remove();
    reactionG = null;

    // 如果正在拖拽手柄并释放
    if (activeResizingLine && activeResizingHandle) {
      const line = activeResizingLine;
      const handleKey = activeResizingHandle;
      const path = PlaitBoard.findPath(board, line);

      if (currentSnappedRef && path) {
        const boundId = `${currentSnappedRef.rootId}:${currentSnappedRef.nodeId}`;
        const newHandle = {
          ...line[handleKey],
          boundId,
          connection: currentSnappedRef.connection
        };
        const newPoints = [...line.points];
        if (handleKey === 'source') {
          newPoints[0] = currentSnappedRef.point;
        } else {
          newPoints[newPoints.length - 1] = currentSnappedRef.point;
        }
        Transforms.setNode(board, { [handleKey]: newHandle, points: newPoints } as any, path);
      } else if (!currentSnappedRef && path) {
        // 拖拽落入空白画布：解绑
        const movingPoint = toViewBoxPoint(board, toHostPoint(board, event.x, event.y));
        const newHandle = {
          ...line[handleKey],
          boundId: undefined,
          connection: undefined
        };
        const newPoints = [...line.points];
        if (handleKey === 'source') {
          newPoints[0] = movingPoint;
        } else {
          newPoints[newPoints.length - 1] = movingPoint;
        }
        Transforms.setNode(board, { [handleKey]: newHandle, points: newPoints } as any, path);
      }
    }

    activeResizingLine = null;
    activeResizingHandle = null;
    pointerUp(event);
  };

  board.globalPointerUp = (event: PointerEvent) => {
    reactionG?.remove();
    reactionG = null;

    // 当画线完成插入节点时，如果吸附了脑图，立即完成 boundId 绑定
    const beforeCount = board.children.length;
    globalPointerUp(event);

    const afterCount = board.children.length;
    if (afterCount > 0 && (drawingSourceMindRef || currentSnappedRef)) {
      const lastElement = board.children[afterCount - 1];
      if (PlaitDrawElement.isArrowLine(lastElement)) {
        const path = [afterCount - 1];
        const updatePayload: Partial<PlaitArrowLine> = {};
        const points = [...lastElement.points];

        if (drawingSourceMindRef) {
          updatePayload.source = {
            ...lastElement.source,
            boundId: `${drawingSourceMindRef.rootId}:${drawingSourceMindRef.nodeId}`,
            connection: drawingSourceMindRef.connection
          };
          points[0] = drawingSourceMindRef.point;
        }

        if (currentSnappedRef) {
          updatePayload.target = {
            ...lastElement.target,
            boundId: `${currentSnappedRef.rootId}:${currentSnappedRef.nodeId}`,
            connection: currentSnappedRef.connection
          };
          points[points.length - 1] = currentSnappedRef.point;
        }

        updatePayload.points = points;
        Transforms.setNode(board, updatePayload as any, path);
      }
    }

    drawingSourceMindRef = null;
    currentSnappedRef = null;
    activeResizingLine = null;
    activeResizingHandle = null;
  };

  return board;
};
