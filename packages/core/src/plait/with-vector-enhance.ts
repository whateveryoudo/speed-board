import {
  ACTIVE_STROKE_WIDTH,
  BoardTransforms,
  OnContextChanged,
  PlaitBoard,
  PlaitPluginElementContext,
  PlaitPointerType,
  Point,
  RectangleClient,
  Transforms,
  addSelectedElement,
  clearSelectedElement,
  createG,
  distanceBetweenPointAndPoint,
  getSelectedElements,
  isSelectionMoving,
  toHostPoint,
  toViewBoxPoint,
} from '@plait/core';
import {
  ResizeHandle,
  ResizeRef,
  ResizeState,
  WithResizeOptions,
  createActiveGenerator,
  isDrawingMode,
  withResize,
  getRectangleResizeHandleRefs,
  RESIZE_HANDLE_DIAMETER,
} from '@plait/common';
import {
  DefaultLineStyle,
  LINE_HIT_GEOMETRY_BUFFER,
  PlaitDrawElement,
  PlaitVectorLine,
  VectorLineComponent,
  VectorLinePointerType,
  VectorLineShape,
  createVectorLineElement,
  getLineMemorizedLatest,
  getVectorLinePointers,
  getVectorLinePoints,
  isClosedPoints,
  vectorLineCreating,
} from '@plait/draw';

/**
 * 闭合多边形与矢量折线渲染组件
 * - 闭合多边形：选中时展示矩形包围盒选区边框（4角手柄），边线上不显示任何顶点或中点标记
 * - 开放折线：选中时展示折线各顶点控制点
 */
export class SpeedVectorLineComponent
  extends VectorLineComponent
  implements OnContextChanged<PlaitVectorLine, PlaitBoard>
{
  closedActiveGenerator: any = null;

  initializeGenerator() {
    super.initializeGenerator();

    this.getRef().updateActiveSection = () => {
      const isClosed = isClosedPoints(this.element.points);
      if (isClosed) {
        if (!this.closedActiveGenerator) {
          this.closedActiveGenerator = createActiveGenerator(this.board, {
            getStrokeWidth: () => ACTIVE_STROKE_WIDTH,
            getStrokeOpacity: () => {
              const selectedElements = getSelectedElements(this.board);
              return selectedElements.length === 1 && !isSelectionMoving(this.board)
                ? 1
                : 0.5;
            },
            getRectangle: (element: PlaitVectorLine) => {
              return RectangleClient.getRectangleByPoints(element.points);
            },
            hasResizeHandle: () => true,
          });
        }
        // 销毁折线顶点控制点，替换为标准矩形包围盒
        this.activeGenerator?.destroy();
        this.closedActiveGenerator.processDrawing(
          this.element,
          PlaitBoard.getActiveHost(this.board),
          {
            selected: this.selected,
          }
        );
      } else {
        this.closedActiveGenerator?.destroy();
        const linePoints = getVectorLinePoints(this.board, this.element) || this.element.points;
        this.activeGenerator.processDrawing(
          this.element,
          PlaitBoard.getActiveHost(this.board),
          {
            selected: this.selected,
            linePoints,
          }
        );
      }
    };
  }

  initialize(): void {
    super.initialize();
    this.getRef().updateActiveSection?.();
  }

  onContextChanged(
    value: PlaitPluginElementContext<PlaitVectorLine, PlaitBoard>,
    previous: PlaitPluginElementContext<PlaitVectorLine, PlaitBoard>
  ) {
    super.onContextChanged(value, previous);
    this.getRef().updateActiveSection?.();
  }

  destroy(): void {
    super.destroy();
    this.closedActiveGenerator?.destroy();
  }
}

/**
 * 闭合多边形支持 4 角矩形框缩放变形
 */
export const withClosedPolygonResize = (board: PlaitBoard) => {
  const options: WithResizeOptions<PlaitVectorLine, ResizeHandle> = {
    key: 'closed-polygon-resize',
    canResize: () => {
      const selected = getSelectedElements(board);
      return (
        selected.length === 1 &&
        PlaitDrawElement.isVectorLine(selected[0]) &&
        isClosedPoints(selected[0].points)
      );
    },
    hitTest: (point: Point) => {
      const selected = getSelectedElements(board);
      if (selected.length !== 1 || !PlaitDrawElement.isVectorLine(selected[0])) {
        return null;
      }
      const el = selected[0] as PlaitVectorLine;
      if (!isClosedPoints(el.points)) return null;

      const rect = RectangleClient.getRectangleByPoints(el.points);
      const handleRefs = getRectangleResizeHandleRefs(rect, RESIZE_HANDLE_DIAMETER);
      const hit = handleRefs.find((r) =>
        RectangleClient.isHit(
          RectangleClient.getRectangleByPoints([point, point]),
          r.rectangle
        )
      );
      if (hit) {
        return {
          element: el,
          rectangle: rect,
          handle: hit.handle,
          cursorClass: hit.cursorClass,
        };
      }
      return null;
    },
    onResize: (
      resizeRef: ResizeRef<PlaitVectorLine, ResizeHandle>,
      resizeState: ResizeState
    ) => {
      const element = resizeRef.element;
      const oldRect = resizeRef.rectangle!;
      const handle = resizeRef.handle;
      const endPoint = resizeState.endPoint;

      const isLeft = handle.includes('left');
      const isRight = handle.includes('right');
      const isTop = handle.includes('top');
      const isBottom = handle.includes('bottom');

      let x1 = oldRect.x;
      let y1 = oldRect.y;
      let x2 = oldRect.x + oldRect.width;
      let y2 = oldRect.y + oldRect.height;

      if (isLeft) x1 = Math.min(endPoint[0], x2 - 10);
      if (isRight) x2 = Math.max(endPoint[0], x1 + 10);
      if (isTop) y1 = Math.min(endPoint[1], y2 - 10);
      if (isBottom) y2 = Math.max(endPoint[1], y1 + 10);

      const newWidth = Math.max(x2 - x1, 10);
      const newHeight = Math.max(y2 - y1, 10);

      const points: Point[] = element.points.map((p) => {
        const normX = oldRect.width > 0 ? (p[0] - oldRect.x) / oldRect.width : 0;
        const normY = oldRect.height > 0 ? (p[1] - oldRect.y) / oldRect.height : 0;
        return [x1 + normX * newWidth, y1 + normY * newHeight];
      });

      const path =
        (board as any).getElementPath?.(element) || [
          board.children.indexOf(element),
        ];
      Transforms.setNode(board, { points }, path);
    },
  };

  withResize<PlaitVectorLine, ResizeHandle>(board, options);
  return board;
};

export const withVectorEnhance = (board: PlaitBoard) => {
  const { drawElement, pointerDown, pointerMove, dblClick, globalKeyDown } = board;

  // 1. 替换 VectorLineComponent，为闭合多边形提供纯净矩形选中框
  board.drawElement = (context: PlaitPluginElementContext) => {
    if (PlaitDrawElement.isVectorLine(context.element)) {
      return SpeedVectorLineComponent;
    }
    return drawElement(context);
  };

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

  return withClosedPolygonResize(board);
};
