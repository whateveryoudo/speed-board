import type { PlaitPlugin, Point } from '@plait/core';
import {
  PlaitBoard,
  SELECTION_BORDER_COLOR,
  SNAPPING_STROKE_WIDTH,
  drawCircle,
  toHostPoint,
  toViewBoxPoint,
  toHostPointFromViewBoxPoint,
  toScreenPointFromHostPoint,
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
  getSelectedArrowLineElements
} from '@plait/draw';
import { isDrawingMode, isResizingByCondition, isResizing } from '@plait/common';

export enum LineResizeHandle {
  source = 'source',
  target = 'target',
  addHandle = 'addHandle'
}

function defineReadonlyEventProperty(event: Event, propertyName: string, value: any) {
  Object.defineProperty(event, propertyName, { get: () => value, configurable: true });
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
 * 1. 严格契合脑图当前形状 (圆角矩形、胶囊、下划线、无边框等)，绝无空隙或自创违和外框。
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
 * 脑图连线磁吸与端点拖拽拉伸增强:
 * 1. 解决“点击线头无法调整方向”：将线头/线尾手柄的判定宽容度提高至 15px，并将坐标精确校准至手柄中心，
 *    100% 触发 Plait 原生 withResize 拉伸旋转，彻底杜绝被误判为整线平移。
 * 2. 磁吸反馈贴合：100% 动态贴合脑图节点当前实际形状 (圆角矩形/胶囊/下划线等)，0 缝隙，浮现 4 个原生落点桩子。
 */
export const withMindConnectEnhance: PlaitPlugin = (board: PlaitBoard) => {
  installMindElementMapProxy();
  const { pointerDown, pointerMove, pointerUp, globalPointerUp } = board;

  let boundShapeG: SVGGElement | null = null;
  let activeMindSnapRef: {
    boundId: string;
    connection: [number, number];
    point: Point;
  } | null = null;

  let activeResizingArrowLine: PlaitArrowLine | null = null;
  let activeResizingHandleKey: 'source' | 'target' | null = null;

  const linePointerKeys = ['straight', 'curve', 'elbow', ...Object.keys(ArrowLineShape)];

  // A. 点击线头手柄判定增强：防止 4.5px 微小偏差被底层误判为整条线平移
  board.pointerDown = (event: PointerEvent) => {
    const selectedLines = getSelectedArrowLineElements(board);
    const isLinePointer = PlaitBoard.isInPointer(board, linePointerKeys);

    if (selectedLines.length === 1 && !isLinePointer && (event.button === 0 || event.button === undefined)) {
      const line = selectedLines[0];
      const points = PlaitArrowLine.getPoints(board, line);
      const clickPoint = toViewBoxPoint(board, toHostPoint(board, event.x, event.y));

      const sourcePoint = points[0];
      const targetPoint = points[points.length - 1];

      const distSource = distanceBetweenPointAndPoint(...clickPoint, ...sourcePoint);
      const distTarget = distanceBetweenPointAndPoint(...clickPoint, ...targetPoint);

      const HANDLE_BUFFER = 15;
      let hitHandlePoint: Point | null = null;
      if (distTarget <= HANDLE_BUFFER) {
        hitHandlePoint = targetPoint;
        activeResizingArrowLine = line;
        activeResizingHandleKey = 'target';
      } else if (distSource <= HANDLE_BUFFER) {
        hitHandlePoint = sourcePoint;
        activeResizingArrowLine = line;
        activeResizingHandleKey = 'source';
      } else {
        activeResizingArrowLine = null;
        activeResizingHandleKey = null;
      }

      if (hitHandlePoint) {
        // 精确校准 event 坐标直达手柄中心，触发 withResize
        const hostPoint = toHostPointFromViewBoxPoint(board, hitHandlePoint);
        const screenPoint = toScreenPointFromHostPoint(board, hostPoint);
        const screenX = screenPoint[0];
        const screenY = screenPoint[1];

        const fakeEvent = new PointerEvent(event.type, {
          bubbles: event.bubbles,
          cancelable: event.cancelable,
          composed: event.composed,
          clientX: screenX,
          clientY: screenY,
          pointerId: event.pointerId,
          pointerType: event.pointerType,
          isPrimary: event.isPrimary,
          button: event.button,
          buttons: event.buttons
        });
        defineReadonlyEventProperty(fakeEvent, 'x', screenX);
        defineReadonlyEventProperty(fakeEvent, 'y', screenY);

        pointerDown(fakeEvent);
        return;
      }
    }

    activeResizingArrowLine = null;
    activeResizingHandleKey = null;
    pointerDown(event);
  };

  board.pointerMove = (event: PointerEvent) => {
    boundShapeG?.remove();
    boundShapeG = null;

    if (PlaitBoard.isReadonly(board)) {
      pointerMove(event);
      return;
    }

    const isLinePointer = PlaitBoard.isInPointer(board, linePointerKeys);
    const movingPoint = toViewBoxPoint(board, toHostPoint(board, event.x, event.y));
    const isLineResizing = isResizingByCondition<PlaitArrowLine, LineResizeHandle>(board, (resizeRef) => {
      const { element, handle } = resizeRef;
      const isSourceOrTarget = handle === LineResizeHandle.target || handle === LineResizeHandle.source;
      return PlaitDrawElement.isArrowLine(element) && isSourceOrTarget;
    });

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

    // 当拖拽拉伸线头完成释放时，如果吸附在脑图节点上，完成绑定；如果落入空白区域，完成解绑
    if (activeResizingArrowLine && activeResizingHandleKey) {
      const line = activeResizingArrowLine;
      const handleKey = activeResizingHandleKey;
      const path = PlaitBoard.findPath(board, line);

      if (path) {
        if (activeMindSnapRef) {
          const newHandle = {
            ...line[handleKey],
            boundId: activeMindSnapRef.boundId,
            connection: activeMindSnapRef.connection
          };
          const newPoints = [...line.points];
          if (handleKey === 'source') {
            newPoints[0] = activeMindSnapRef.point;
          } else {
            newPoints[newPoints.length - 1] = activeMindSnapRef.point;
          }
          Transforms.setNode(board, { [handleKey]: newHandle, points: newPoints } as any, path);
        } else {
          // 拖离原吸附节点落入空白：解绑 boundId
          if (line[handleKey]?.boundId) {
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
      }
    }

    activeResizingArrowLine = null;
    activeResizingHandleKey = null;
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
