import {
  Board,
  PlaitBoard,
  PlaitPointerType,
  Transforms,
  toViewBoxPoint,
} from '@speed-board/core';
import {
  createDefaultGeometry,
  createArrowLineElement,
  createTextElement,
  getDefaultGeometryPoints,
  DrawTransforms,
  ArrowLineShape,
} from '@plait/draw';

export function registerBoardDraw(): void {
  // 注入图形插入能力
  Board.insertShapeHandler = (
    board: Board,
    shape: string,
    options: any = {},
    point?: [number, number]
  ) => {
    const center = point || board.getViewportCenterPoint();
    const pointer = board.mapShapeToPointer(shape);
    const points = getDefaultGeometryPoints(pointer as any, center);
    const geometry = createDefaultGeometry(board.raw, points, pointer as any);
    if (options.fill) geometry.fill = options.fill;
    if (options.stroke) geometry.stroke = options.stroke;
    if (options.strokeWidth) geometry.strokeWidth = options.strokeWidth;

    Transforms.insertNode(board.raw, geometry, [board.raw.children.length]);
    board.setPointer(PlaitPointerType.selection);
    board.select([geometry]);
    board.emit('change', {});
    return geometry;
  };

  // 注入连线插入能力
  Board.insertLineHandler = (
    board: Board,
    shape = 'straight',
    options: any = {},
    point?: [number, number]
  ) => {
    const center = point || board.getViewportCenterPoint();
    const len = 140;
    const points: [number, number][] = [
      [center[0] - len / 2, center[1]],
      [center[0] + len / 2, center[1]],
    ];
    let arrowShape = ArrowLineShape.straight;
    if (shape === 'curve') arrowShape = ArrowLineShape.curve;
    else if (shape === 'elbow') arrowShape = ArrowLineShape.elbow;

    const arrowLine = createArrowLineElement(board.raw, points as any, arrowShape);
    if (options.stroke) arrowLine.strokeColor = options.stroke;
    if (options.strokeWidth) arrowLine.strokeWidth = options.strokeWidth;

    Transforms.insertNode(board.raw, arrowLine, [board.raw.children.length]);
    board.setPointer(PlaitPointerType.selection);
    board.select([arrowLine]);
    board.emit('change', {});
    return arrowLine;
  };

  // 注入文本插入能力
  Board.insertTextHandler = (
    board: Board,
    text = '文本',
    point?: [number, number]
  ) => {
    const center = point || board.getViewportCenterPoint();
    const width = 120;
    const height = 36;
    const points: [number, number][] = [
      [center[0] - width / 2, center[1] - height / 2],
      [center[0] + width / 2, center[1] + height / 2],
    ];
    const textElement = createTextElement(board.raw, points as any, text);
    Transforms.insertNode(board.raw, textElement, [board.raw.children.length]);
    board.setPointer(PlaitPointerType.selection);
    board.select([textElement]);
    board.emit('change', {});
    return textElement;
  };

  // 注入图片插入能力
  Board.insertImageHandler = (
    board: Board,
    image: { url: string; width: number; height: number; name?: string },
    point?: [number, number]
  ) => {
    const center = point || board.getViewportCenterPoint();
    const maxWidth = 400;
    const width = image.width > maxWidth ? maxWidth : image.width || 200;
    const height = image.height ? (width / (image.width || 200)) * image.height : 150;
    const startPoint: [number, number] = [center[0] - width / 2, center[1] - height / 2];

    DrawTransforms.insertImage(board.raw, { url: image.url, width, height }, startPoint);
    board.setPointer(PlaitPointerType.selection);
    board.emit('change', {});
    return { ...image, width, height };
  };
}

// 模块加载时自动注册
registerBoardDraw();
