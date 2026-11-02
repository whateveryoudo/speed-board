import type { PlaitPlugin, Point } from '@plait/core';
import {
  PlaitBoard,
  SELECTION_BORDER_COLOR,
  SNAPPING_STROKE_WIDTH,
  drawCircle,
  toHostPoint,
  toViewBoxPoint,
  KEY_TO_ELEMENT_MAP,
  Transforms
} from '@plait/core';
import {
  ArrowLineShape,
  BasicShapes,
  PlaitArrowLine,
  PlaitDrawElement,
  PlaitShapeElement,
  drawBoundReaction,
  getSnappingRef
} from '@plait/draw';
import { isResizingByCondition } from '@plait/common';

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
 * 脑图连线磁吸与落点桩子增强 (100% 对齐 Plait 原生图形连线与吸附机制):
 * 1. 动态虚拟元素映射：让 Plait 底层无缝通过 `${rootId}:${nodeId}` 读取节点卡片坐标，连线手柄拉伸绝对不会被误判为整线平移。
 * 2. 磁吸落点桩子：1:1 调用 Plait 原生 drawBoundReaction 绘制 4 个标准落点桩子，绝不自创多余的外层框。
 */
export const withMindConnectEnhance: PlaitPlugin = (board: PlaitBoard) => {
  installMindElementMapProxy();
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
    const isLineResizing = isResizingByCondition<PlaitArrowLine, LineResizeHandle>(board, (resizeRef) => {
      const { element, handle } = resizeRef;
      const isSourceOrTarget = handle === LineResizeHandle.target || handle === LineResizeHandle.source;
      return PlaitDrawElement.isArrowLine(element) && isSourceOrTarget;
    });

    if (isLinePointer || isLineResizing) {
      const hit = (board as any).getMindHitNode?.(movingPoint, 25);
      if (hit) {
        const hitMindShape: PlaitShapeElement = {
          id: `${hit.root.id}:${hit.box.id}`,
          type: 'geometry',
          shape: BasicShapes.roundRectangle,
          points: [
            [hit.box.x, hit.box.y],
            [hit.box.x + hit.box.width, hit.box.y + hit.box.height]
          ]
        } as any;

        const ref = getSnappingRef(board, hitMindShape, movingPoint);
        const isSnapping = ref.isHitEdge || ref.isHitConnector;

        // 1:1 对标 Plait 原生图形连线反馈：hasMask 为 false，不额外画框；hasConnector 为 true，仅显示 4 个磁吸落点桩子
        boundShapeG = drawBoundReaction(board, hitMindShape, { hasMask: false, hasConnector: true });
        if (isSnapping) {
          const circleG = drawCircle(PlaitBoard.getRoughSVG(board), ref.connectorPoint || ref.edgePoint, 6, {
            stroke: SELECTION_BORDER_COLOR,
            strokeWidth: SNAPPING_STROKE_WIDTH,
            fill: SELECTION_BORDER_COLOR,
            fillStyle: 'solid'
          });
          boundShapeG.appendChild(circleG);

          const rectangle = {
            x: hit.box.x,
            y: hit.box.y,
            width: hit.box.width,
            height: hit.box.height
          };
          const pt = ref.connectorPoint || ref.edgePoint;
          const connection: [number, number] = [
            (pt[0] - rectangle.x) / rectangle.width,
            (pt[1] - rectangle.y) / rectangle.height
          ];

          activeMindSnapRef = {
            boundId: hitMindShape.id,
            connection,
            point: pt
          };
        } else {
          activeMindSnapRef = null;
        }

        PlaitBoard.getElementTopHost(board).append(boundShapeG);
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
