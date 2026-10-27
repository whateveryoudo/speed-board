import {
  distanceBetweenPointAndPoint,
  getPointBetween,
  getViewportOrigination,
  PlaitBoard,
  Point,
} from '@plait/core';

interface PointerRecord {
  pointerId: number;
  lastPoint: Point;
  currentPoint: Point;
  hasMoved: boolean;
}

export const TOUCH_RECORDS = new WeakMap<PlaitBoard, PointerRecord[]>();

export const isTwoFingerMode = (board: PlaitBoard) => {
  const pointerRecords = TOUCH_RECORDS.get(board);
  return pointerRecords?.length === 2;
};

export const withPinchZoom = (board: PlaitBoard) => {
  const { touchStart, touchMove } = board;

  let pointerRecords: PointerRecord[] = [];

  board.touchStart = (event: TouchEvent) => {
    pointerRecords = Array.from(event.touches).map((touch) => ({
      pointerId: touch.identifier,
      lastPoint: [touch.clientX, touch.clientY],
      currentPoint: [touch.clientX, touch.clientY],
      hasMoved: false,
    }));
    TOUCH_RECORDS.set(board, pointerRecords);
    touchStart(event);
  };

  board.touchMove = (event: TouchEvent) => {
    Array.from(event.changedTouches).forEach((touch) => {
      const record = pointerRecords.find((r) => r.pointerId === touch.identifier);
      if (record) {
        record.lastPoint = record.currentPoint;
        record.currentPoint = [touch.clientX, touch.clientY];
        record.hasMoved = true;
      }
    });

    if (pointerRecords.length === 2) {
      event.preventDefault();
    }

    if (pointerRecords.length === 2 && pointerRecords.every((r) => r.hasMoved)) {
      const [p1, p2] = pointerRecords;
      const pinchCenter = getPointBetween(...p1.lastPoint, ...p2.lastPoint) as Point;
      const newPinchCenter = getPointBetween(...p1.currentPoint, ...p2.currentPoint) as Point;
      const dx = newPinchCenter[0] - pinchCenter[0];
      const dy = newPinchCenter[1] - pinchCenter[1];

      const boardContainerRect = PlaitBoard.getBoardContainer(board).getBoundingClientRect();
      const halfOfWidth = boardContainerRect.width / 2;
      const halfOfHeight = boardContainerRect.height / 2;
      const zoom = board.viewport.zoom;
      const origination = getViewportOrigination(board);
      const centerX = origination![0] + halfOfWidth / zoom - dx / zoom;
      const centerY = origination![1] + halfOfHeight / zoom - dy / zoom;
      const newOrigination = [
        centerX - boardContainerRect.width / 2 / zoom,
        centerY - boardContainerRect.height / 2 / zoom,
      ] as Point;

      const lastDistance = distanceBetweenPointAndPoint(...p1.lastPoint, ...p2.lastPoint);
      const currentDistance = distanceBetweenPointAndPoint(...p1.currentPoint, ...p2.currentPoint);
      const scale = currentDistance / lastDistance;

      const v1 = [p1.currentPoint[0] - p1.lastPoint[0], p1.currentPoint[1] - p1.lastPoint[1]] as Point;
      const v2 = [p2.currentPoint[0] - p2.lastPoint[0], p2.currentPoint[1] - p2.lastPoint[1]] as Point;
      const dotProduct = v1[0] * v2[0] + v1[1] * v2[1];
      const v1Magnitude = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]);
      const v2Magnitude = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1]);
      const cosTheta = dotProduct / (v1Magnitude * v2Magnitude || 1);

      if (cosTheta > 0.8) {
        board.viewport.origination = newOrigination;
      } else if (cosTheta < -0.7) {
        const newZoom = Math.min(Math.max(zoom * scale, 0.1), 5);
        board.viewport.zoom = newZoom;
      }
    }

    touchMove(event);
  };

  return board;
};
