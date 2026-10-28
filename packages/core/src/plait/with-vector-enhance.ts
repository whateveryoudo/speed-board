import {
  BoardTransforms,
  PlaitBoard,
  PlaitPointerType,
  Point,
  Transforms,
  addSelectedElement,
  clearSelectedElement,
  createG,
  distanceBetweenPointAndPoint,
  getSelectedElements,
  toHostPoint,
  toViewBoxPoint,
} from '@plait/core';
import { isDrawingMode } from '@plait/common';
import {
  DefaultLineStyle,
  LINE_HIT_GEOMETRY_BUFFER,
  PlaitVectorLine,
  VectorLinePointerType,
  VectorLineShape,
  createVectorLineElement,
  getLineMemorizedLatest,
  getVectorLinePointers,
  isClosedPoints,
  vectorLineCreating,
} from '@plait/draw';

export const withVectorEnhance = (board: PlaitBoard) => {
  const { pointerDown, pointerMove, dblClick, globalKeyDown } = board;

  let lineShapeG: SVGGElement | null = null;
  let waypointsG: SVGGElement | null = null;
  let temporaryElement: PlaitVectorLine | null = null;
  let drawPoints: Point[] = [];
  let isHoveringStart = false;

  const cleanupDrawing = () => {
    lineShapeG?.remove();
    lineShapeG = null;
    waypointsG?.remove();
    waypointsG = null;
    PlaitBoard.getBoardContainer(board)?.classList.remove('vector-line-closed');
    temporaryElement = null;
    drawPoints = [];
    isHoveringStart = false;
  };

  const createSvgCircle = (
    cx: number,
    cy: number,
    r: number,
    attrs: Record<string, string>
  ) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', `${cx}`);
    circle.setAttribute('cy', `${cy}`);
    circle.setAttribute('r', `${r}`);
    for (const [k, v] of Object.entries(attrs)) {
      circle.setAttribute(k, v);
    }
    return circle;
  };

  const renderWaypoints = (points: Point[], isSnapStart: boolean) => {
    waypointsG?.remove();
    waypointsG = createG();
    waypointsG.classList.add('speed-vector-waypoints');

    const total = points.length;
    if (total === 0) return;

    for (let i = 0; i < total; i++) {
      const pt = points[i];
      const isStart = i === 0;
      const isLatest = i === total - 1;

      if (isStart && isSnapStart && total > 1) {
        // 语雀风格：吸附首点时，呈现醒目的闭合候选圆环与高亮点
        const targetRing = createSvgCircle(pt[0], pt[1], 8, {
          fill: 'rgba(22, 119, 255, 0.18)',
          stroke: '#1677ff',
          'stroke-width': '1.5',
          'stroke-dasharray': '3 2',
          style: 'pointer-events: none;',
        });
        const targetDot = createSvgCircle(pt[0], pt[1], 4.5, {
          fill: '#1677ff',
          stroke: '#ffffff',
          'stroke-width': '2',
          style: 'pointer-events: none;',
        });
        waypointsG.appendChild(targetRing);
        waypointsG.appendChild(targetDot);
      } else if (isLatest && total > 1) {
        // 最新落点：当前激活态，蓝色高亮
        const activeDot = createSvgCircle(pt[0], pt[1], 4.5, {
          fill: '#69b1ff',
          stroke: '#1677ff',
          'stroke-width': '1.5',
          style: 'pointer-events: none;',
        });
        waypointsG.appendChild(activeDot);
      } else {
        // 普通落点：白底灰边圆点
        const normalDot = createSvgCircle(pt[0], pt[1], 3.5, {
          fill: '#ffffff',
          stroke: '#52525b',
          'stroke-width': '1.5',
          style: 'pointer-events: none;',
        });
        waypointsG.appendChild(normalDot);
      }
    }

    PlaitBoard.getElementTopHost(board).append(waypointsG);
  };

  const finishAndSelect = (isClosed: boolean) => {
    if (drawPoints.length < 2) {
      cleanupDrawing();
      return;
    }

    const finalPoints: Point[] = [...drawPoints];
    if (isClosed) {
      finalPoints.push([drawPoints[0][0], drawPoints[0][1]]);
    }

    const memorizedLatest = getLineMemorizedLatest();
    const element = createVectorLineElement(
      VectorLineShape.straight,
      finalPoints,
      {
        strokeWidth: memorizedLatest.strokeWidth || DefaultLineStyle.strokeWidth,
        strokeColor: memorizedLatest.strokeColor || '#374151',
        fill: isClosed ? (memorizedLatest.fill || 'transparent') : 'transparent',
        ...memorizedLatest,
      }
    );

    // 彻底清理临时绘制节点与指示器
    cleanupDrawing();

    // 1. 插入新节点
    Transforms.insertNode(board, element, [board.children.length]);

    // 2. 自动选中新创建的节点
    clearSelectedElement(board);
    addSelectedElement(board, element);

    // 3. 退出绘制模式，切回标准选择指针
    BoardTransforms.updatePointerType(board, PlaitPointerType.selection);

    // 4. 通知上层 Wrapper 触发事件，以立即唤起气泡工具栏及工具栏高亮
    const wrapper = (board as any).boardWrapper;
    if (wrapper) {
      wrapper.setPointer(PlaitPointerType.selection);
      wrapper.emit('selection:change', { selected: [element] });
    }

    // 5. 立即更新选区激活控制点
    const selectedElements = getSelectedElements(board);
    selectedElements.forEach((el) => {
      const elementRef =
        (PlaitBoard as any).getElementRef?.(el) || (el as any).elementRef;
      elementRef?.updateActiveSection?.();
    });
  };

  board.pointerDown = (event: PointerEvent) => {
    const penPointers = getVectorLinePointers();
    const isVectorLinePointer = PlaitBoard.isInPointer(board, penPointers);

    if (!PlaitBoard.isReadonly(board) && isVectorLinePointer && isDrawingMode(board)) {
      const point = toViewBoxPoint(board, toHostPoint(board, event.x, event.y));

      // 若已有至少2个点，且点击落在首点缓冲区内，则闭合多边形并完成
      if (drawPoints.length > 1) {
        const isClosed =
          distanceBetweenPointAndPoint(...point, ...drawPoints[0]) <= LINE_HIT_GEOMETRY_BUFFER;
        if (isClosed) {
          finishAndSelect(true);
          return;
        }
      }

      drawPoints.push(point);
      renderWaypoints(drawPoints, false);
      return;
    }

    pointerDown(event);
  };

  board.pointerMove = (event: PointerEvent) => {
    const penPointers = getVectorLinePointers();
    const isVectorLinePointer = PlaitBoard.isInPointer(board, penPointers);

    if (isVectorLinePointer && drawPoints.length > 0) {
      lineShapeG?.remove();
      lineShapeG = createG();

      let movingPoint = toViewBoxPoint(board, toHostPoint(board, event.x, event.y));
      const distance = distanceBetweenPointAndPoint(...movingPoint, ...drawPoints[0]);
      isHoveringStart = drawPoints.length > 1 && distance <= LINE_HIT_GEOMETRY_BUFFER;

      if (isHoveringStart) {
        movingPoint = [drawPoints[0][0], drawPoints[0][1]];
        PlaitBoard.getBoardContainer(board)?.classList.add('vector-line-closed');
      } else {
        PlaitBoard.getBoardContainer(board)?.classList.remove('vector-line-closed');
      }

      // 实时绘制临时折线路径
      temporaryElement = vectorLineCreating(
        board,
        VectorLineShape.straight,
        drawPoints,
        movingPoint,
        lineShapeG
      );

      // 实时更新落点指示器
      renderWaypoints(drawPoints, isHoveringStart);
      return;
    }

    pointerMove(event);
  };

  board.dblClick = (event: MouseEvent) => {
    const penPointers = getVectorLinePointers();
    const isVectorLinePointer = PlaitBoard.isInPointer(board, penPointers);

    if (!PlaitBoard.isReadonly(board) && isVectorLinePointer) {
      if (drawPoints.length >= 2) {
        event.preventDefault();
        event.stopPropagation();
        finishAndSelect(isHoveringStart);
        return;
      }
    }

    dblClick(event);
  };

  board.globalKeyDown = (event: KeyboardEvent) => {
    const penPointers = getVectorLinePointers();
    const isVectorLinePointer = PlaitBoard.isInPointer(board, penPointers);

    if (!PlaitBoard.isReadonly(board) && isVectorLinePointer) {
      // 1. Enter 键：代表完成绘制
      if (event.key === 'Enter') {
        if (drawPoints.length >= 2) {
          event.preventDefault();
          event.stopPropagation();
          finishAndSelect(isHoveringStart);
          return;
        }
      }

      // 2. Escape 键：取消当前绘制并退出模式
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        cleanupDrawing();
        BoardTransforms.updatePointerType(board, PlaitPointerType.selection);
        const wrapper = (board as any).boardWrapper;
        if (wrapper) {
          wrapper.setPointer(PlaitPointerType.selection);
        }
        return;
      }
    }

    globalKeyDown(event);
  };

  return board;
};
