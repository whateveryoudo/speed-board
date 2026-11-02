import type { Path, PlaitPlugin, Point } from '@plait/core';
import {
  PlaitBoard,
  SELECTION_BORDER_COLOR,
  SNAPPING_STROKE_WIDTH,
  drawCircle,
  toHostPoint,
  toViewBoxPoint,
  KEY_TO_ELEMENT_MAP,
  Transforms,
  distanceBetweenPointAndPoint,
  createG
} from '@plait/core';
import {
  ArrowLineShape,
  BasicShapes,
  PlaitArrowLine,
  PlaitDrawElement,
  getSelectedArrowLineElements,
  getSnappingShape,
  getHitConnection
} from '@plait/draw';
import {
  isDrawingMode,
  isResizing,
  withResize,
  type ResizeRef,
  type ResizeState,
  type WithResizeOptions
} from '@plait/common';

export enum LineResizeHandle {
  source = 'source',
  target = 'target',
  addHandle = 'addHandle'
}

// 1. 全局挂载 KEY_TO_ELEMENT_MAP Proxy，确保 Plait 底层 getElementById 随时能解析出 mind 虚拟图形节点
let isProxyInstalled = false;
export function installMindElementMapProxy() {
  if (isProxyInstalled) return;
  isProxyInstalled = true;

  const originalWeakMapGet = KEY_TO_ELEMENT_MAP.get.bind(KEY_TO_ELEMENT_MAP);
  KEY_TO_ELEMENT_MAP.get = function (b: PlaitBoard) {
    const map = originalWeakMapGet(b);
    if (map && !(map as any).__hasMindProxy__) {
      (map as any).__hasMindProxy__ = true;
      const originalMapGet = map.get.bind(map);
      map.get = function (key: string) {
        const val = originalMapGet(key);
        if (val) return val;
        if (typeof key === 'string' && key.includes(':')) {
          const colonIndex = key.indexOf(':');
          const rootId = key.substring(0, colonIndex);
          const nodeId = key.substring(colonIndex + 1);
          const box = (b as any).getMindNodeBox?.(rootId, nodeId);
          if (box) {
            return {
              id: key,
              type: 'geometry',
              shape: BasicShapes.roundRectangle,
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
    return map;
  };
}

installMindElementMapProxy();

/**
 * 绘制 100% 贴合脑图节点形状的磁吸反馈与 4 个落点桩子:
 * 1. 严格契合脑图当前形状 (圆角矩形、胶囊、下划线、无边框等)，0px 缝隙，与节点卡片完全重合贴合。
 * 2. 4 个落点桩子直接坐落于卡片上、右、下、左四边边沿。
 */
function drawMindNodeReaction(
  board: PlaitBoard,
  box: { x: number; y: number; width: number; height: number; element?: any },
  isSnapping: boolean,
  snapPoint?: Point
): SVGGElement {
  const g = createG();
  g.classList.add('speed-mind-connect-reaction');

  const element = box.element || {};
  const isRoot = Boolean(element.isRoot || (box as any).depth === 0);
  const shape = element.shape || 'roundRectangle';
  const isNone = shape === 'none';
  const isUnderline = shape === 'underline';
  const isCapsule = shape === 'capsule';

  // 1. 贴合节点形状的高亮边框 (0px 缝隙，与节点卡片完全重合贴合)
  const strokeG = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  if (isUnderline) {
    strokeG.setAttribute('x', String(box.x));
    strokeG.setAttribute('y', String(box.y + box.height - 3));
    strokeG.setAttribute('width', String(box.width));
    strokeG.setAttribute('height', '3');
    strokeG.setAttribute('rx', '1.5');
    strokeG.setAttribute('ry', '1.5');
  } else {
    strokeG.setAttribute('x', String(box.x));
    strokeG.setAttribute('y', String(box.y));
    strokeG.setAttribute('width', String(box.width));
    strokeG.setAttribute('height', String(box.height));
    const rx = isCapsule ? box.height / 2 : (isNone ? 4 : (isRoot ? 8 : 6));
    strokeG.setAttribute('rx', String(rx));
    strokeG.setAttribute('ry', String(rx));
  }
  strokeG.setAttribute('fill', 'none');
  strokeG.setAttribute('stroke', SELECTION_BORDER_COLOR);
  strokeG.setAttribute('stroke-width', '2');
  g.appendChild(strokeG);

  // 2. 4 个磁吸落点桩子 (直接定位于节点卡片上、右、下、左四边)
  const connectors = [
    [box.x + box.width / 2, box.y] as Point,
    [box.x + box.width, box.y + box.height / 2] as Point,
    [box.x + box.width / 2, box.y + box.height] as Point,
    [box.x, box.y + box.height / 2] as Point
  ];

  connectors.forEach((point) => {
    const circleG = drawCircle(PlaitBoard.getRoughSVG(board), point, 8, {
      stroke: SELECTION_BORDER_COLOR,
      strokeWidth: 1.5,
      fill: '#FFF',
      fillStyle: 'solid'
    });
    g.appendChild(circleG);
  });

  // 3. 吸附高亮圆点
  if (isSnapping && snapPoint) {
    const snapCircleG = drawCircle(PlaitBoard.getRoughSVG(board), snapPoint, 6, {
      stroke: SELECTION_BORDER_COLOR,
      strokeWidth: SNAPPING_STROKE_WIDTH,
      fill: SELECTION_BORDER_COLOR,
      fillStyle: 'solid'
    });
    g.appendChild(snapCircleG);
  }

  return g;
}

/**
 * 连线端点拉伸手柄判定增强插件:
 * 接入 Plait 标准 withResize 系统，宽容度为 12px，点击线头/线尾 100% 触发旋转、拉伸与形状调整，绝不退化为整线平移
 */
const withArrowLineResizeEnhance = (board: PlaitBoard) => {
  const options: WithResizeOptions<PlaitArrowLine, LineResizeHandle> = {
    key: 'mind-arrow-line-resize',
    canResize: () => {
      const selected = getSelectedArrowLineElements(board);
      return selected.length === 1;
    },
    hitTest: (point: Point) => {
      const selected = getSelectedArrowLineElements(board);
      if (selected.length !== 1) return null;
      const line = selected[0];
      const points = PlaitArrowLine.getPoints(board, line);
      const sourcePoint = points[0];
      const targetPoint = points[points.length - 1];

      const HANDLE_HIT_BUFFER = 12;
      const distTarget = distanceBetweenPointAndPoint(...point, ...targetPoint);
      if (distTarget <= HANDLE_HIT_BUFFER) {
        return {
          element: line,
          handle: LineResizeHandle.target,
          handleIndex: points.length - 1
        };
      }

      const distSource = distanceBetweenPointAndPoint(...point, ...sourcePoint);
      if (distSource <= HANDLE_HIT_BUFFER) {
        return {
          element: line,
          handle: LineResizeHandle.source,
          handleIndex: 0
        };
      }

      return null;
    },
    onResize: (resizeRef: ResizeRef<PlaitArrowLine, LineResizeHandle>, resizeState: ResizeState) => {
      const line = resizeRef.element;
      const handle = resizeRef.handle;
      const path = (resizeRef.path || PlaitBoard.findPath(board, line)) as Path;
      if (!path) return;

      const movingPoint = resizeState.endPoint;

      // 1. 优先检测是否吸附在脑图节点上
      const hit = (board as any).getMindHitNode?.(movingPoint, 25);
      let snapTarget: { boundId: string; connection: [number, number]; point: Point } | null = null;
      if (hit) {
        const { box } = hit;
        const connectors: { point: Point; connection: [number, number] }[] = [
          { point: [box.x + box.width / 2, box.y], connection: [0.5, 0] },
          { point: [box.x + box.width, box.y + box.height / 2], connection: [1, 0.5] },
          { point: [box.x + box.width / 2, box.y + box.height], connection: [0.5, 1] },
          { point: [box.x, box.y + box.height / 2], connection: [0, 0.5] }
        ];
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
          snapTarget = {
            boundId: `${hit.root.id}:${box.id}`,
            connection: nearest.connection,
            point: nearest.point
          };
        }
      }

      // 2. 检测是否吸附在普通图形图元上
      const hitShape = !snapTarget ? getSnappingShape(board, movingPoint) : null;

      const points = [...line.points];
      const source = { ...line.source };
      const target = { ...line.target };

      if (handle === LineResizeHandle.source) {
        if (snapTarget) {
          source.boundId = snapTarget.boundId;
          source.connection = snapTarget.connection;
          points[0] = snapTarget.point;
        } else if (hitShape) {
          source.boundId = hitShape.id;
          source.connection = getHitConnection(board, movingPoint, hitShape);
          points[0] = movingPoint;
        } else {
          source.boundId = undefined;
          source.connection = undefined;
          points[0] = movingPoint;
        }
      } else if (handle === LineResizeHandle.target) {
        if (snapTarget) {
          target.boundId = snapTarget.boundId;
          target.connection = snapTarget.connection;
          points[points.length - 1] = snapTarget.point;
        } else if (hitShape) {
          target.boundId = hitShape.id;
          target.connection = getHitConnection(board, movingPoint, hitShape);
          points[points.length - 1] = movingPoint;
        } else {
          target.boundId = undefined;
          target.connection = undefined;
          points[points.length - 1] = movingPoint;
        }
      }

      Transforms.setNode(board, { points, source, target } as any, path);
    }
  };

  withResize<PlaitArrowLine, LineResizeHandle>(board, options);
  return board;
};

/**
 * 脑图连线磁吸与端点拖拽拉伸增强插件
 */
export const withMindConnectEnhance: PlaitPlugin = (board: PlaitBoard) => {
  installMindElementMapProxy();
  board = withArrowLineResizeEnhance(board);

  const { pointerMove, pointerUp, globalPointerUp } = board;

  let boundShapeG: SVGGElement | null = null;
  let activeMindSnapRef: {
    boundId: string;
    connection: [number, number];
    point: Point;
  } | null = null;

  const linePointerKeys = ['straight', 'curve', 'elbow', ...Object.keys(ArrowLineShape)];

  board.pointerMove = (event: PointerEvent) => {
    boundShapeG?.remove();
    boundShapeG = null;

    if (PlaitBoard.isReadonly(board)) {
      pointerMove(event);
      return;
    }

    const isLinePointer = PlaitBoard.isInPointer(board, linePointerKeys);
    const movingPoint = toViewBoxPoint(board, toHostPoint(board, event.x, event.y));
    const isLineResizing = isResizing(board);

    if (isLinePointer || isLineResizing) {
      const hit = (board as any).getMindHitNode?.(movingPoint, 25);
      if (hit) {
        const { box } = hit;
        const connectors: { point: Point; connection: [number, number] }[] = [
          { point: [box.x + box.width / 2, box.y], connection: [0.5, 0] },
          { point: [box.x + box.width, box.y + box.height / 2], connection: [1, 0.5] },
          { point: [box.x + box.width / 2, box.y + box.height], connection: [0.5, 1] },
          { point: [box.x, box.y + box.height / 2], connection: [0, 0.5] }
        ];

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
          (movingPoint[0] >= box.x &&
            movingPoint[0] <= box.x + box.width &&
            movingPoint[1] >= box.y &&
            movingPoint[1] <= box.y + box.height);

        // 100% 贴合节点实际形状进行渲染
        boundShapeG = drawMindNodeReaction(board, box, isSnapped, nearest.point);
        PlaitBoard.getElementTopHost(board).append(boundShapeG);

        if (isSnapped) {
          activeMindSnapRef = {
            boundId: `${hit.root.id}:${box.id}`,
            connection: nearest.connection,
            point: nearest.point
          };
        } else {
          activeMindSnapRef = null;
        }
      } else {
        activeMindSnapRef = null;
      }
    } else {
      activeMindSnapRef = null;
    }

    pointerMove(event);
  };

  board.pointerUp = (event: PointerEvent) => {
    boundShapeG?.remove();
    boundShapeG = null;
    pointerUp(event);
  };

  board.globalPointerUp = (event: PointerEvent) => {
    boundShapeG?.remove();
    boundShapeG = null;

    const snapRef = activeMindSnapRef;
    activeMindSnapRef = null;

    const beforeLen = board.children.length;
    globalPointerUp(event);

    // 如果刚画好一条连线且终点吸附到了脑图节点落点
    const afterLen = board.children.length;
    if (afterLen > beforeLen && snapRef) {
      const createdLine = board.children[afterLen - 1];
      if (PlaitDrawElement.isArrowLine(createdLine)) {
        const path = [afterLen - 1];
        const points = [...createdLine.points];
        points[points.length - 1] = snapRef.point;
        Transforms.setNode(
          board,
          {
            target: {
              ...createdLine.target,
              boundId: snapRef.boundId,
              connection: snapRef.connection
            },
            points
          } as any,
          path
        );
      }
    }
  };

  return board;
};
