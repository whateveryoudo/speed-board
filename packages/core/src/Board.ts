import {
  PlaitBoard,
  type PlaitElement,
  PlaitPointerType,
  BoardTransforms,
  getSelectedElements,
  toHostPoint,
  toViewBoxPoint,
  BasicShapes,
  FlowchartSymbols,
  ArrowLineShape,
  MindPointerType,
  MindTransforms,
  createEmptyMind,
  createTextElement,
  createDefaultGeometry,
  getDefaultGeometryPoints,
  insertElement,
  DrawTransforms,
  BoardCreationMode,
  setCreationMode,
  deleteFragment,
  Transforms,
  FreehandShape,
  AlignTransform,
  addSelectedElement,
  clearSelectedElement,
  NODE_TO_INDEX,
  NODE_TO_PARENT,
} from './plait';
import { createSpeedPlaitBoard, type CreatePlaitBoardOptions } from './plait/board-factory';

export type BoardPointer =
  | 'selection'
  | 'hand'
  | 'rectangle'
  | 'ellipse'
  | 'diamond'
  | 'roundRectangle'
  | 'triangle'
  | 'text'
  | 'straight'
  | 'elbow'
  | 'curve'
  | 'mind';

export function findClosestPort(node?: any, point?: any) {
  return null;
}

export class Board {
  public raw: PlaitBoard;
  private eventListeners = new Map<string, Set<Function>>();

  get plaitBoard(): PlaitBoard {
    return this.raw;
  }

  set plaitBoard(b: PlaitBoard) {
    this.raw = b;
  }

  constructor(options: CreatePlaitBoardOptions = {}) {
    this.raw = createSpeedPlaitBoard(options);
  }

  // --- 事件发射与侦听 ---
  on(event: string, fn: Function): this {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(fn);
    return this;
  }

  off(event: string, fn: Function): this {
    this.eventListeners.get(event)?.delete(fn);
    return this;
  }

  emit(event: string, ...args: any[]): void {
    this.eventListeners.get(event)?.forEach((fn) => {
      try {
        fn(...args);
      } catch (e) {
        console.error(`[Board Event Error: ${event}]`, e);
      }
    });
  }

  // --- 指针与绘制模式 ---
  get pointer(): string {
    return this.raw.pointer;
  }

  setPointer(pointer: BoardPointer | string) {
    if (pointer === 'selection' || pointer === PlaitPointerType.selection) {
      BoardTransforms.updatePointerType(this.raw, PlaitPointerType.selection);
    } else if (pointer === 'hand' || pointer === PlaitPointerType.hand) {
      BoardTransforms.updatePointerType(this.raw, PlaitPointerType.hand);
    } else {
      BoardTransforms.updatePointerType(this.raw, pointer as any);
      setCreationMode(this.raw, BoardCreationMode.drawing);
    }
    this.emit('pointer:change', pointer);
  }

  setHandMode(active: boolean) {
    this.setPointer(active ? PlaitPointerType.hand : PlaitPointerType.selection);
  }

  setDrawingMode(mode: string, options?: any) {
    this.setTool(mode);
  }

  mapShapeToPointer(shape: string): string {
    switch (shape) {
      case 'rect':
      case 'rectangle':
        return BasicShapes.rectangle;
      case 'circle':
      case 'ellipse':
        return BasicShapes.ellipse;
      case 'diamond':
        return BasicShapes.diamond;
      case 'round-rect':
      case 'roundRectangle':
        return BasicShapes.roundRectangle;
      case 'triangle':
        return BasicShapes.triangle;
      case 'parallelogram':
        return BasicShapes.parallelogram;
      case 'trapezoid':
        return BasicShapes.trapezoid;
      case 'star':
        return BasicShapes.star;
      case 'cloud':
        return BasicShapes.cloud;
      case 'cross':
        return BasicShapes.cross;
      case 'comment':
        return BasicShapes.comment;
      case 'hexagon':
        return BasicShapes.hexagon;
      case 'pentagon':
        return BasicShapes.pentagon;
      case 'octagon':
        return BasicShapes.octagon;
      case 'process':
        return FlowchartSymbols.process;
      case 'decision':
        return FlowchartSymbols.decision;
      default:
        return (BasicShapes as any)[shape] || shape;
    }
  }

  // 快捷切换模式
  setTool(tool: string, options?: any) {
    switch (tool) {
      case 'select':
        this.setPointer(PlaitPointerType.selection);
        break;
      case 'hand':
        this.setPointer(PlaitPointerType.hand);
        break;
      case 'text':
        this.setPointer(BasicShapes.text);
        break;
      case 'mind':
      case 'mindmap':
        this.setPointer(MindPointerType.mind);
        break;
      case 'pencil':
      case 'nibPen':
        this.setPointer(FreehandShape.nibPen);
        break;
      case 'marker':
      case 'feltTipPen':
        this.setPointer(FreehandShape.feltTipPen);
        break;
      case 'eraser':
        this.setPointer(FreehandShape.eraser);
        break;
      case 'straight':
        this.setPointer(ArrowLineShape.straight);
        break;
      case 'curve':
        this.setPointer(ArrowLineShape.curve);
        break;
      case 'elbow':
        this.setPointer(ArrowLineShape.elbow);
        break;
      default:
        this.setPointer(this.mapShapeToPointer(tool));
    }
  }

  // 获取当前视口中心坐标 (用于默认就地插入)
  getViewportCenterPoint(): [number, number] {
    const container = PlaitBoard.getBoardContainer(this.raw);
    const width = container?.clientWidth || 800;
    const height = container?.clientHeight || 600;
    return toViewBoxPoint(this.raw, [width / 2, height / 2]);
  }

  // --- 直接插入图元 API ---
  insertText(text = '文本', point?: [number, number]) {
    const center = point || this.getViewportCenterPoint();
    const width = 120;
    const height = 36;
    const points: [number, number][] = [
      [center[0] - width / 2, center[1] - height / 2],
      [center[0] + width / 2, center[1] + height / 2],
    ];
    const textElement = createTextElement(this.raw, points as any, text);
    insertElement(this.raw, textElement);
    this.setPointer(PlaitPointerType.selection);
    this.emit('change', {});
    return textElement;
  }

  insertMindmap(topic = '思维导图', point?: [number, number]) {
    const center = point || this.getViewportCenterPoint();
    const emptyMind = createEmptyMind(this.raw, center);
    if (topic && emptyMind.data?.topic?.children?.[0]) {
      emptyMind.data.topic.children[0].text = topic;
    }
    MindTransforms.insertMind(this.raw, emptyMind);
    this.setPointer(PlaitPointerType.selection);
    this.emit('change', {});
    return emptyMind;
  }

  insertShape(shape: string, options: any = {}, point?: [number, number]) {
    const center = point || this.getViewportCenterPoint();
    const pointer = this.mapShapeToPointer(shape);
    const points = getDefaultGeometryPoints(pointer as any, center);
    const geometry = createDefaultGeometry(this.raw, points, pointer as any);
    if (options.fill) geometry.fill = options.fill;
    if (options.stroke) geometry.stroke = options.stroke;
    if (options.strokeWidth) geometry.strokeWidth = options.strokeWidth;
    insertElement(this.raw, geometry);
    this.setPointer(PlaitPointerType.selection);
    this.emit('change', {});
    return geometry;
  }

  insertImage(image: { url: string; width: number; height: number; name?: string }, point?: [number, number]) {
    const center = point || this.getViewportCenterPoint();
    const maxWidth = 400;
    const width = image.width > maxWidth ? maxWidth : (image.width || 200);
    const height = image.height ? (width / (image.width || 200)) * image.height : 150;
    const startPoint: [number, number] = [center[0] - width / 2, center[1] - height / 2];
    DrawTransforms.insertImage(this.raw, { url: image.url, width, height }, startPoint);
    this.setPointer(PlaitPointerType.selection);
    this.emit('change', {});
    return { ...image, width, height };
  }

  // 兼容别名
  addImage(options: any) {
    const point: [number, number] | undefined =
      typeof options.x === 'number' && typeof options.y === 'number'
        ? [options.x, options.y]
        : undefined;
    return this.insertImage(options, point);
  }

  addShape(options: any) {
    const shape = options.shape || options.shapeId || 'rectangle';
    return this.insertShape(shape, options);
  }

  updateImageStatus(node: any, status: string, options?: any) {
    // 状态更新
    this.emit('change', {});
  }

  // --- 视口与缩放 ---
  getZoom(): number {
    return this.raw?.viewport?.zoom || 1;
  }

  setZoom(zoom: number) {
    BoardTransforms.updateZoom(this.raw, Math.min(Math.max(zoom, 0.1), 5));
    this.emit('scale', this.getZoom());
  }

  zoom(step?: number): number {
    if (step !== undefined) {
      this.setZoom(this.getZoom() + step);
    }
    return this.getZoom();
  }

  zoomTo(zoom: number) {
    this.setZoom(zoom);
  }

  zoomIn(step = 0.1) {
    this.setZoom(this.getZoom() + step);
  }

  zoomOut(step = 0.1) {
    this.setZoom(this.getZoom() - step);
  }

  zoomToFit() {
    BoardTransforms.fitViewport(this.raw);
    this.emit('scale', this.getZoom());
  }

  centerContent() {
    this.zoomToFit();
  }

  resetZoom() {
    this.setZoom(1);
  }

  // --- 历史与撤销重做 ---
  undo = () => {
    this.raw?.undo?.();
    this.emit('change', {});
    this.emit('history:change', {});
    this.emit('history:undo', {});
  };

  redo = () => {
    this.raw?.redo?.();
    this.emit('change', {});
    this.emit('history:change', {});
    this.emit('history:redo', {});
  };

  canUndo = (): boolean => {
    return (this.raw?.history?.undos?.length || 0) > 0;
  };

  canRedo = (): boolean => {
    return (this.raw?.history?.redos?.length || 0) > 0;
  };

  // --- 选区与图元 ---
  get selectedElements(): PlaitElement[] {
    return getSelectedElements(this.raw);
  }

  syncNodeIndices() {
    this.raw?.children?.forEach((child, index) => {
      NODE_TO_PARENT.set(child, this.raw);
      NODE_TO_INDEX.set(child, index);
    });
  }

  select(elements: PlaitElement | PlaitElement[]) {
    this.syncNodeIndices();
    clearSelectedElement(this.raw);
    addSelectedElement(this.raw, elements);
    this.emit('selection:change', { selected: this.selectedElements });
  }

  clearSelection() {
    clearSelectedElement(this.raw);
    this.emit('selection:change', { selected: [] });
  }

  deleteSelected() {
    deleteFragment(this.raw);
    this.emit('change', {});
  }

  isShapeNode = (element: any): boolean => {
    if (!element) return false;
    return element.type === 'geometry' || (Boolean(element.shape) && element.shape !== 'text' && element.type !== 'arrow-line');
  };

  isTextNode = (element: any): boolean => {
    if (!element) return false;
    return element.type === 'text' || element.shape === 'text';
  };

  isLineNode = (element: any): boolean => {
    if (!element) return false;
    return element.type === 'arrow-line' || element.shape === 'straight' || element.shape === 'curve' || element.shape === 'elbow';
  };

  isMindmapNode = (element: any): boolean => {
    if (!element) return false;
    return element.type === 'mind' || Boolean(element.isRoot) || Boolean(element.data?.topic);
  };

  isImageNode = (element: any): boolean => {
    if (!element) return false;
    return element.type === 'image' || element.shape === 'image';
  };

  getShapeNodeData(): any {
    const selected = this.selectedElements[0] as any;
    if (!selected) return null;
    return {
      fill: selected.fill || '#ffffff',
      stroke: selected.stroke || '#374151',
      strokeWidth: selected.strokeWidth ?? 2,
      strokeDasharray: selected.strokeStyle || selected.strokeDasharray || 'none',
      opacity: selected.opacity ?? 1,
      shapeId: selected.shape || 'rectangle',
    };
  }

  private getElementPath(element: any): number[] | null {
    this.syncNodeIndices();
    try {
      return PlaitBoard.findPath(this.raw, element);
    } catch {
      const index = this.raw.children.findIndex(
        (c: any) => c === element || (c.id && element.id && c.id === element.id)
      );
      if (index !== -1) {
        return [index];
      }
      return null;
    }
  }

  updateShapeNode(element: any, data: any) {
    const path = this.getElementPath(element);
    if (path) {
      Transforms.setNode(this.raw, data, path);
      this.syncNodeIndices();
      this.emit('change', {});
    }
  }

  getSelectedTextData(): any {
    const selected = this.selectedElements[0] as any;
    if (!selected) return null;
    const textNode = selected.text || selected;
    return {
      text: typeof textNode.text === 'string' ? textNode.text : '',
      fontSize: textNode.fontSize || 14,
      fill: textNode.color || textNode.fill || '#262626',
      bold: Boolean(textNode.bold),
      italic: Boolean(textNode.italic),
      strike: Boolean(textNode.strike),
      underline: Boolean(textNode.underline),
      align: textNode.align || 'left',
      verticalAlign: textNode.verticalAlign || 'middle',
    };
  }

  updateSelectedTextStyle(patch: any) {
    const selected = this.selectedElements;
    selected.forEach((element: any) => {
      const path = this.getElementPath(element);
      if (path) {
        if (element.text) {
          Transforms.setNode(this.raw, { text: { ...element.text, ...patch } } as any, path);
        } else {
          Transforms.setNode(this.raw, patch, path);
        }
      }
    });
    this.syncNodeIndices();
    this.emit('change', {});
  }

  // --- 排列与对齐 ---
  alignSelectedNodes(type: 'left' | 'center' | 'middle' | 'right' | 'top' | 'bottom') {
    this.syncNodeIndices();
    switch (type) {
      case 'left':
        AlignTransform.alignLeft(this.raw);
        break;
      case 'center':
        AlignTransform.alignHorizontalCenter(this.raw);
        break;
      case 'middle':
        AlignTransform.alignVerticalCenter(this.raw);
        break;
      case 'right':
        AlignTransform.alignRight(this.raw);
        break;
      case 'top':
        AlignTransform.alignTop(this.raw);
        break;
      case 'bottom':
        AlignTransform.alignBottom(this.raw);
        break;
    }
    this.syncNodeIndices();
    this.emit('change', {});
  }

  distributeSelectedNodes(type: 'horizontal' | 'vertical') {
    this.syncNodeIndices();
    if (type === 'horizontal') {
      AlignTransform.distributeHorizontal(this.raw);
    } else {
      AlignTransform.distributeVertical(this.raw);
    }
    this.syncNodeIndices();
    this.emit('change', {});
  }

  // --- 图层控制 ---
  bringSelectedToFront() {
    this.syncNodeIndices();
    Transforms.moveToTop(this.raw);
    this.syncNodeIndices();
    this.emit('change', {});
  }

  sendSelectedToBack() {
    this.syncNodeIndices();
    Transforms.moveToBottom(this.raw);
    this.syncNodeIndices();
    this.emit('change', {});
  }

  bringSelectedForward() {
    this.syncNodeIndices();
    Transforms.moveUp(this.raw);
    this.syncNodeIndices();
    this.emit('change', {});
  }

  sendSelectedBackward() {
    this.syncNodeIndices();
    Transforms.moveDown(this.raw);
    this.syncNodeIndices();
    this.emit('change', {});
  }

  // --- 成组与锁定 ---
  groupSelected() {
    this.syncNodeIndices();
    Transforms.addGroup(this.raw);
    this.syncNodeIndices();
    this.emit('change', {});
  }

  ungroupSelected() {
    this.syncNodeIndices();
    Transforms.removeGroup(this.raw);
    this.syncNodeIndices();
    this.emit('change', {});
  }

  toggleLockSelected() {
    const selected = this.selectedElements;
    selected.forEach((element) => {
      const path = this.getElementPath(element);
      if (path) {
        const isLocked = Boolean((element as any).locked);
        Transforms.setNode(this.raw, { locked: !isLocked } as any, path);
      }
    });
    this.syncNodeIndices();
    this.emit('change', {});
  }

  duplicateSelected() {
    const selected = this.selectedElements;
    if (selected.length === 0) return;
    const clones = selected.map((el) => {
      const clone = JSON.parse(JSON.stringify(el));
      if (clone.points && Array.isArray(clone.points)) {
        clone.points = clone.points.map((p: [number, number]) => [p[0] + 20, p[1] + 20]);
      }
      delete clone.id;
      return clone;
    });
    clones.forEach((clone) => {
      insertElement(this.raw, clone);
    });
    this.syncNodeIndices();
    this.emit('change', {});
  }

  // --- 属性修改 ---
  setShapeProperty(properties: Record<string, any>) {
    this.syncNodeIndices();
    const selected = getSelectedElements(this.raw);
    selected.forEach((element) => {
      const path = this.getElementPath(element);
      if (path) {
        Transforms.setNode(this.raw, properties, path);
        const newEl = this.raw.children[path[0]];
        if (newEl) {
          clearSelectedElement(this.raw);
          addSelectedElement(this.raw, newEl);
        }
      }
    });
    this.syncNodeIndices();
    this.emit('change', {});
  }

  // --- 坐标换算 ---
  clientToBoard(x: number, y: number): [number, number] {
    return toViewBoxPoint(this.raw, [x, y]);
  }

  boardToClient(x: number, y: number): [number, number] {
    return toHostPoint(this.raw, x, y);
  }

  destroy() {
    this.eventListeners.clear();
  }
}
