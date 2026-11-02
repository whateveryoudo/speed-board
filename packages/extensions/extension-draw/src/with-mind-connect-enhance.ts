import type { Path, PlaitPlugin, Point, PlaitPluginElementContext } from '@plait/core';
import {
  PlaitBoard,
  SELECTION_BORDER_COLOR,
  SNAPPING_STROKE_WIDTH,
  SELECTION_RECTANGLE_CLASS_NAME,
  drawCircle,
  drawRectangle,
  toHostPoint,
  toViewBoxPoint,
  toActivePointFromViewBoxPoint,
  toActiveRectangleFromViewBoxRectangle,
  toHostPointFromViewBoxPoint,
  toScreenPointFromHostPoint,
  rotatePointsByElement,
  getSelectedElements,
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
  PlaitShapeElement,
  DrawTransforms,
  LineActiveGenerator,
  ArrowLineComponent,
  DefaultDrawActiveStyle,
  getMiddlePoints,
  getNextRenderPoints,
  isUpdatedHandleIndex,
  getHitShape,
  getHitConnection,
  getConnectionPoint
} from '@plait/draw';
import {
  isDrawingMode,
  isResizing,
  PRIMARY_COLOR,
  drawFillPrimaryHandle,
  drawPrimaryHandle
} from '@plait/common';

type PlaitLine = PlaitArrowLine | any;

function getHitPointIndex(points: Point[], movingPoint: Point): number {
  return points.findIndex((point) => distanceBetweenPointAndPoint(...point, ...movingPoint) <= 5);
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
 * 连线选中手柄生成器:
 * 严格保留交互规范：端点吸附/对齐到图形或脑图时（boundId 存在）渲染为实心圆点 (drawFillPrimaryHandle)；
 * 未对齐到任何元素时显示空心圆点 (drawPrimaryHandle)。
 */
export class SpeedLineActiveGenerator extends LineActiveGenerator {
  draw(element: PlaitLine, data: any): SVGGElement {
    const activeG = createG();
    const selectedElements = getSelectedElements(this.board);
    this.onlySelectedCurrentLine = selectedElements.length === 1;
    if (this.onlySelectedCurrentLine) {
      activeG.classList.add(SELECTION_RECTANGLE_CLASS_NAME);
      const points = PlaitDrawElement.isArrowLine(element) ? PlaitArrowLine.getPoints(this.board, element) : element.points;
      let updatePoints = [...points];
      let elbowNextRenderPoints: Point[] = [];
      if (element.shape === ArrowLineShape.elbow) {
        updatePoints = points.slice(0, 1).concat(points.slice(-1));
        elbowNextRenderPoints = getNextRenderPoints(this.board, element, data.linePoints);
      }
      const activePoints = updatePoints.map((point) => toActivePointFromViewBoxPoint(this.board, point));
      activePoints.forEach((point, index) => {
        const isArrow = PlaitDrawElement.isArrowLine(element);
        const isSource = index === 0;
        const isTarget = index === activePoints.length - 1;
        // 关键交互：端点对齐/绑定到图形或脑图节点时为实心圆点，未绑定时为空心圆点
        const isBound = isArrow && ((isSource && Boolean(element.source?.boundId)) || (isTarget && Boolean(element.target?.boundId)));
        const updateHandle = isBound
          ? drawFillPrimaryHandle(this.board, point)
          : drawPrimaryHandle(this.board, point);
        activeG.appendChild(updateHandle);
      });
      const middlePoints = getMiddlePoints(this.board, element);
      const activeMiddlePoints = middlePoints.map((point) => toActivePointFromViewBoxPoint(this.board, point));
      if (!PlaitBoard.hasBeenTextEditing(this.board)) {
        for (let i = 0; i < activeMiddlePoints.length; i++) {
          const point = activeMiddlePoints[i];
          if (element.shape === ArrowLineShape.elbow && elbowNextRenderPoints.length) {
            const handleIndex = getHitPointIndex(activeMiddlePoints, point);
            const isUpdateHandleIndex = isUpdatedHandleIndex(
              this.board,
              element,
              [...points],
              elbowNextRenderPoints,
              handleIndex
            );
            if (isUpdateHandleIndex) {
              const updateHandle = drawPrimaryHandle(this.board, point);
              activeG.appendChild(updateHandle);
              continue;
            }
          }
          const circle = drawFillPrimaryHandle(this.board, point);
          activeG.appendChild(circle);
        }
      }
    } else {
      const rectangle = this.board.getRectangle(element);
      if (rectangle) {
        const activeRectangle = toActiveRectangleFromViewBoxRectangle(this.board, rectangle);
        let opacity = '0.5';
        if (activeRectangle.height === 0 || activeRectangle.width === 0) {
          opacity = '0.8';
        }
        const strokeG = drawRectangle(this.board, activeRectangle, {
          stroke: PRIMARY_COLOR,
          strokeWidth: DefaultDrawActiveStyle.selectionStrokeWidth
        });
        strokeG.style.opacity = opacity;
        activeG.appendChild(strokeG);
      }
    }
    return activeG;
  }
}

/**
 * 连线组件扩展：搭载 SpeedLineActiveGenerator 确保吸附状态下端点始终呈现标准实心样式
 */
export class SpeedArrowLineComponent extends ArrowLineComponent {
  initializeGenerator() {
    super.initializeGenerator();
    this.activeGenerator = new SpeedLineActiveGenerator(this.board);
  }
}

/**
 * 拦截 DrawTransforms.resizeArrowLine:
 * 1. 通用几何图形：光标落在图形内部或边缘时，端点严格锁定于图形边框（通过 getConnectionPoint 与 rotatePointsByElement），绝不穿透内部！
 * 2. 脑图节点：光标落在脑图节点内部或 12px 范围时，端点严格定位于卡片 4 边落点，绝不穿透内部！
 * 3. 拖离到空白区域时干净解除 boundId 绑定。
 */
let isTransformsPatched = false;
export function patchDrawTransformsResizeArrowLine() {
  if (isTransformsPatched) return;
  isTransformsPatched = true;

  const originalResize = DrawTransforms.resizeArrowLine;
  DrawTransforms.resizeArrowLine = (
    board: PlaitBoard,
    options: Partial<PlaitArrowLine>,
    path: Path
  ) => {
    if (options.points && options.points.length >= 2) {
      const snapToTarget = (pt: Point) => {
        // 1. 通用几何图形：光标落入图形内部或边缘，端点严格定位于边框，绝不穿透到内部！
        const hitShape = getHitShape(board, pt);
        if (hitShape) {
          const conn = getHitConnection(board, pt, hitShape);
          const connPt = getConnectionPoint(hitShape, conn);
          const rotatedPt = rotatePointsByElement(connPt, hitShape) || connPt;
          return {
            point: rotatedPt,
            boundId: hitShape.id,
            connection: conn
          };
        }

        // 2. 脑图节点：光标落入脑图内部或 12px 范围，端点严格定位于卡片 4 边边沿，绝不穿透内部！
        const hit = (board as any).getMindHitNode?.(pt, 12);
        if (hit) {
          const { box, root } = hit;
          const connectors: { point: Point; connection: [number, number] }[] = [
            { point: [box.x + box.width / 2, box.y], connection: [0.5, 0] },
            { point: [box.x + box.width, box.y + box.height / 2], connection: [1, 0.5] },
            { point: [box.x + box.width / 2, box.y + box.height], connection: [0.5, 1] },
            { point: [box.x, box.y + box.height / 2], connection: [0, 0.5] }
          ];
          let nearest = connectors[0];
          let minDist = Infinity;
          for (const c of connectors) {
            const dist = distanceBetweenPointAndPoint(...pt, ...c.point);
            if (dist < minDist) {
              minDist = dist;
              nearest = c;
            }
          }

          const isInside =
            pt[0] >= box.x &&
            pt[0] <= box.x + box.width &&
            pt[1] >= box.y &&
            pt[1] <= box.y + box.height;

          if (minDist <= 12 || isInside) {
            return {
              boundId: `${root.id}:${box.id}`,
              connection: nearest.connection,
              point: nearest.point
            };
          }
        }

        return null;
      };

      if (options.target) {
        const lastIdx = options.points.length - 1;
        const snap = snapToTarget(options.points[lastIdx]);
        if (snap) {
          options.target = { ...options.target, boundId: snap.boundId, connection: snap.connection };
          options.points[lastIdx] = snap.point;
        } else {
          options.target = { ...options.target, boundId: undefined, connection: undefined };
        }
      }

      if (options.source) {
        const snap = snapToTarget(options.points[0]);
        if (snap) {
          options.source = { ...options.source, boundId: snap.boundId, connection: snap.connection };
          options.points[0] = snap.point;
        } else {
          options.source = { ...options.source, boundId: undefined, connection: undefined };
        }
      }
    }

    return originalResize(board, options, path);
  };
}

patchDrawTransformsResizeArrowLine();

/**
 * 绘制 100% 贴合脑图节点形状的磁吸反馈与 4 个落点桩子:
 * 1. 严格契合脑图当前形状 (圆角矩形、直角矩形、胶囊、下划线、无边框等)，0px 缝隙，与节点卡片完全重合贴合。
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
  const isRectangle = shape === 'rectangle';

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
    let rx = isRoot ? 8 : 6;
    if (isRectangle) {
      rx = 0;
    } else if (isCapsule) {
      rx = box.height / 2;
    } else if (isNone) {
      rx = 4;
    }
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
 * 脑图连线磁吸与反馈增强插件:
 * 1. 搭载 SpeedArrowLineComponent，实现对齐后端点呈现标准实心样式；
 * 2. 严防穿透：连线绘制与拖拽吸附时，光标落入图形或脑图内部时，端点强制锁定于边框，绝对不穿透到内部；
 * 3. 拖离时干净解绑并恢复为空白区域自由端点。
 */
export const withMindConnectEnhance: PlaitPlugin = (board: PlaitBoard) => {
  installMindElementMapProxy();
  patchDrawTransformsResizeArrowLine();

  const { drawElement, pointerMove, pointerUp, globalPointerUp } = board;

  board.drawElement = (context: PlaitPluginElementContext) => {
    if (PlaitDrawElement.isArrowLine(context.element)) {
      return SpeedArrowLineComponent;
    }
    return drawElement(context);
  };

  let mindBoundG: SVGGElement | null = null;
  let activeMindSnapRef: {
    boundId: string;
    connection: [number, number];
    point: Point;
  } | null = null;

  const linePointerKeys = ['straight', 'curve', 'elbow', ...Object.keys(ArrowLineShape)];

  board.pointerMove = (event: PointerEvent) => {
    mindBoundG?.remove();
    mindBoundG = null;

    if (PlaitBoard.isReadonly(board)) {
      pointerMove(event);
      return;
    }

    const isLinePointer = PlaitBoard.isInPointer(board, linePointerKeys);
    const movingPoint = toViewBoxPoint(board, toHostPoint(board, event.x, event.y));
    const isLineResizing = isResizing(board);
    const isLineDrawing = isDrawingMode(board) && isLinePointer;

    let effectiveEvent = event;

    // 当正在画线拖拽时，若光标落入通用图形内部，将事件坐标投射至边框落点，防止预览线和绘制结果穿透到图形内部
    if (isLineDrawing) {
      const hitShape = getHitShape(board, movingPoint);
      if (hitShape) {
        const conn = getHitConnection(board, movingPoint, hitShape);
        const connPt = getConnectionPoint(hitShape, conn);
        const borderPt = rotatePointsByElement(connPt, hitShape) || connPt;
        const hostPt = toHostPointFromViewBoxPoint(board, borderPt);
        const screenPt = toScreenPointFromHostPoint(board, hostPt);
        effectiveEvent = new PointerEvent(event.type, {
          bubbles: event.bubbles,
          cancelable: event.cancelable,
          composed: event.composed,
          clientX: screenPt[0],
          clientY: screenPt[1],
          pointerId: event.pointerId,
          pointerType: event.pointerType,
          isPrimary: event.isPrimary,
          button: event.button,
          buttons: event.buttons
        });
        Object.defineProperty(effectiveEvent, 'x', { get: () => screenPt[0], configurable: true });
        Object.defineProperty(effectiveEvent, 'y', { get: () => screenPt[1], configurable: true });
      }
    }

    if (isLinePointer || isLineResizing) {
      // 仅检测脑图节点 (12px 适度磁吸范围或卡片内部)
      const hit = (board as any).getMindHitNode?.(movingPoint, 12);
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

        const isInside =
          movingPoint[0] >= box.x &&
          movingPoint[0] <= box.x + box.width &&
          movingPoint[1] >= box.y &&
          movingPoint[1] <= box.y + box.height;

        const isSnapped = minDist <= 12 || isInside;

        mindBoundG = drawMindNodeReaction(board, box, isSnapped, nearest.point);
        PlaitBoard.getElementTopHost(board).append(mindBoundG);

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

    pointerMove(effectiveEvent);
  };

  board.pointerUp = (event: PointerEvent) => {
    mindBoundG?.remove();
    mindBoundG = null;
    pointerUp(event);
  };

  board.globalPointerUp = (event: PointerEvent) => {
    mindBoundG?.remove();
    mindBoundG = null;

    const snapRef = activeMindSnapRef;
    activeMindSnapRef = null;

    const beforeLen = board.children.length;
    globalPointerUp(event);

    const afterLen = board.children.length;
    if (afterLen > beforeLen) {
      const createdLine = board.children[afterLen - 1];
      if (PlaitDrawElement.isArrowLine(createdLine)) {
        const path = [afterLen - 1];
        const points = [...createdLine.points];
        const lastIdx = points.length - 1;
        const targetPt = points[lastIdx];

        // 1. 如果终点落入通用图形内部或边缘，强制吸附定位于边框，严防穿透内部
        const hitShape = getHitShape(board, targetPt);
        if (hitShape) {
          const conn = getHitConnection(board, targetPt, hitShape);
          const connPt = getConnectionPoint(hitShape, conn);
          const rotatedPt = rotatePointsByElement(connPt, hitShape) || connPt;
          points[lastIdx] = rotatedPt;
          Transforms.setNode(
            board,
            {
              target: {
                ...createdLine.target,
                boundId: hitShape.id,
                connection: conn
              },
              points
            } as any,
            path
          );
        } else if (snapRef) {
          // 2. 如果终点落入脑图节点
          points[lastIdx] = snapRef.point;
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
    }
  };

  return board;
};
