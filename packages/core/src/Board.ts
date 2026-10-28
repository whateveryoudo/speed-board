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
  createArrowLineElement,
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
  getRectangleByElements,
  toHostPointFromViewBoxPoint,
  RectangleClient,
  VectorLinePointerType,
} from './plait';
import { createSpeedPlaitBoard, type CreatePlaitBoardOptions } from './plait/board-factory';
import {
  getShapeById,
  renderShapeCanvasSvg,
  getShapeTightViewBox,
  type ShapeDefinition,
} from '@speed-board/shared';
import type {
  SelectedElementType,
  SelectionInfo,
  FloatingToolbarPosition,
  FloatingToolbarProperties,
  NodeStyleState,
  NodeTextState,
} from './types';

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
  | 'mind'
  | 'vectorLine';

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

  // --- 子节点集合 ---
  get children(): PlaitElement[] {
    return this.raw.children;
  }

  // --- 手绘配置 ---
  public freehandOptions: {
    brushType?: 'pencil' | 'marker' | 'eraser';
    strokeColor?: string;
    strokeWidth?: number;
  } = {
    brushType: 'pencil',
    strokeColor: '#333333',
    strokeWidth: 2,
  };

  setFreehandOptions(options: {
    brushType?: 'pencil' | 'marker' | 'eraser';
    strokeColor?: string;
    strokeWidth?: number;
  }) {
    this.freehandOptions = { ...this.freehandOptions, ...options };
    (this.raw as any).freehandOptions = this.freehandOptions;
    this.emit('freehand:options-change', this.freehandOptions);
  }

  getFreehandOptions() {
    return this.freehandOptions;
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
    } else if (pointer === 'vector' || pointer === 'vectorLine' || pointer === VectorLinePointerType.vectorLine) {
      BoardTransforms.updatePointerType(this.raw, VectorLinePointerType.vectorLine);
      setCreationMode(this.raw, BoardCreationMode.drawing);
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

  setMindmapLayout(layout: string) {
    this.syncNodeIndices();
    MindTransforms.setLayout(this.raw, layout as any);
    this.syncNodeIndices();
    this.emit('change', {});
  }

  setMindmapShape(shape: string) {
    this.syncNodeIndices();
    MindTransforms.setShape(this.raw, shape as any);
    this.syncNodeIndices();
    this.emit('change', {});
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

  insertLine(
    points: [[number, number], [number, number]] = [
      [100, 100],
      [300, 300],
    ],
    shape: ArrowLineShape | string = ArrowLineShape.straight,
    options: any = {}
  ) {
    const arrowLine = createArrowLineElement(
      shape as any,
      points as any,
      options.source || { marker: options.sourceMarker || 'none' },
      options.target || { marker: options.targetMarker || 'arrow' },
      options.texts || []
    );
    if (options.stroke) (arrowLine as any).stroke = options.stroke;
    if (options.strokeWidth) (arrowLine as any).strokeWidth = options.strokeWidth;
    insertElement(this.raw, arrowLine);
    this.setPointer(PlaitPointerType.selection);
    this.emit('change', {});
    return arrowLine;
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

  selectElement(elements: PlaitElement | PlaitElement[]) {
    this.select(elements);
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

  // --- 选区分析与信息查询 ---
  get selectionInfo(): SelectionInfo {
    return this.getSelectionInfo();
  }

  getSelectionInfo(): SelectionInfo {
    const cells = (this.selectedElements || []) as any[];
    const count = cells.length;

    if (count === 0) {
      return {
        selectedCells: [],
        selectedCount: 0,
        selectedCell: null,
        selectedType: 'none',
        selectedShapeId: '',
      };
    }

    const first = cells[0];

    if (count > 1) {
      return {
        selectedCells: cells,
        selectedCount: count,
        selectedCell: first,
        selectedType: 'multiple',
        selectedShapeId: '',
      };
    }

    let selectedType: SelectedElementType = 'shape';
    let selectedShapeId = '';

    const type = first.type || first.shape || '';
    if (this.isLineNode(first) || first.shape === 'straight' || first.shape === 'elbow' || first.shape === 'curve' || first.type === 'vector-line') {
      selectedType = 'line';
    } else if (this.isMindmapNode(first) || first.type === 'mind' || first.isRoot || first.children) {
      if (first.isSummary) selectedType = 'mindmap-summary';
      else if (first.isRoot) selectedType = 'mindmap-root';
      else selectedType = 'mindmap-node';
    } else if (this.isImageNode(first) || type === 'image') {
      selectedType = 'image';
    } else if (this.isTextNode(first) || type === 'text') {
      selectedType = 'text';
    } else if (type === 'freehand' || type === 'vector') {
      selectedType = 'vector';
    } else {
      selectedType = 'shape';
      selectedShapeId = first.shape || 'rectangle';
    }

    return {
      selectedCells: cells,
      selectedCount: count,
      selectedCell: first,
      selectedType,
      selectedShapeId,
    };
  }

  // --- 悬浮工具栏计算 ---
  getFloatingToolbarPosition(): FloatingToolbarPosition | null {
    if (!this.raw) return null;
    const selected = this.selectedElements;
    if (!selected || selected.length === 0) return null;

    try {
      let rect: any = null;
      try {
        rect = getRectangleByElements(this.raw, selected, false);
      } catch {
        rect = null;
      }

      if (!rect) {
        const first = selected[0] as any;
        if (first && first.points && first.points.length > 0) {
          rect = RectangleClient.getRectangleByPoints(
            first.points.length === 1
              ? [first.points[0], [first.points[0][0] + 100, first.points[0][1] + 40]]
              : first.points
          );
        }
      }

      if (!rect) return null;

      const hostTopLeft = toHostPointFromViewBoxPoint(this.raw, [rect.x, rect.y]);
      const hostBottomRight = toHostPointFromViewBoxPoint(this.raw, [
        rect.x + rect.width,
        rect.y + rect.height,
      ]);
      const width = hostBottomRight[0] - hostTopLeft[0];

      return {
        left: hostTopLeft[0] + width / 2,
        top: hostTopLeft[1] - 12,
        width,
        height: hostBottomRight[1] - hostTopLeft[1],
      };
    } catch {
      return null;
    }
  }

  getFloatingToolbarProperties(): FloatingToolbarProperties {
    const defaultState: FloatingToolbarProperties = {
      visible: false,
      position: { left: 0, top: 0 },
      selectedType: 'none',
      hasFill: false,
      hasStroke: false,
      isLine: false,
      isMind: false,
      currentFill: '#ffffff',
      currentStrokeColor: '#374151',
      currentStrokeWidth: 2,
      currentStrokeStyle: 'solid',
      currentLineShape: 'elbow',
      sourceMarker: 'none',
      targetMarker: 'none',
    };

    const selectionInfo = this.getSelectionInfo();
    if (selectionInfo.selectedCount === 0 || !selectionInfo.selectedCell) {
      return defaultState;
    }

    const pos = this.getFloatingToolbarPosition();
    if (!pos) return defaultState;

    const cell = selectionInfo.selectedCell;
    const isLine =
      selectionInfo.selectedType === 'line' ||
      this.isLineNode(cell) ||
      cell.shape === 'straight' ||
      cell.shape === 'elbow' ||
      cell.shape === 'curve';
    const isMind =
      selectionInfo.selectedType.startsWith('mindmap') ||
      this.isMindmapNode(cell) ||
      Boolean(cell.data?.topic);
    const isImage = selectionInfo.selectedType === 'image';

    const hasFill = !isLine && !isImage;
    const hasStroke = !isImage;

    return {
      visible: true,
      position: pos,
      selectedType: selectionInfo.selectedType,
      hasFill,
      hasStroke,
      isLine,
      isMind,
      currentFill: cell.fill || '#ffffff',
      currentStrokeColor: cell.stroke || '#374151',
      currentStrokeWidth: cell.strokeWidth ?? 2,
      currentStrokeStyle: cell.strokeStyle || 'solid',
      currentLineShape: cell.shape || 'elbow',
      sourceMarker: cell.sourceMarker || 'none',
      targetMarker: cell.targetMarker || 'none',
    };
  }

  // --- 样式状态与更新 ---
  getNodeStyleState(): NodeStyleState {
    const defaultState: NodeStyleState = {
      fill: '#ffffff',
      stroke: '#374151',
      strokeWidth: 2,
      strokeDasharray: 'none',
      opacity: 1,
    };

    const cells = (this.selectedElements || []) as any[];
    if (cells.length === 0) return defaultState;

    const cell = cells[0];
    if (this.isLineNode(cell)) {
      return {
        fill: 'transparent',
        stroke: cell.stroke || '#374151',
        strokeWidth: cell.strokeWidth ?? 2,
        strokeDasharray: cell.strokeStyle || cell.strokeDasharray || 'none',
        opacity: cell.opacity ?? 1,
      };
    }

    return {
      fill: cell.fill || '#ffffff',
      stroke: cell.stroke || '#374151',
      strokeWidth: cell.strokeWidth ?? 2,
      strokeDasharray: cell.strokeStyle || cell.strokeDasharray || 'none',
      opacity: cell.opacity ?? 1,
    };
  }

  getNodeTextState(): NodeTextState {
    const defaultState: NodeTextState = {
      text: '',
      link: '',
      fontSize: 14,
      fill: '#262626',
      bold: false,
      italic: false,
      strike: false,
      underline: false,
      align: 'left',
      verticalAlign: 'middle',
    };

    const textData = this.getSelectedTextData();
    if (textData) {
      return { ...defaultState, ...textData };
    }
    return defaultState;
  }

  patchNodeStyle(patch: Partial<NodeStyleState>) {
    this.setShapeProperty(patch);
  }

  patchNodeText(patch: Partial<NodeTextState>) {
    this.setSelectedTextData(patch);
  }

  // --- 连线控制 ---
  getSelectedEdge(): any | null {
    const cell = this.selectedElements?.find(
      (c: any) =>
        c.shape === 'elbow' ||
        c.shape === 'straight' ||
        c.shape === 'curve' ||
        c.type === 'arrow-line' ||
        this.isLineNode(c)
    );
    return cell || null;
  }

  setLineType(type: 'elbow' | 'straight' | 'curve') {
    this.setShapeProperty({ shape: type });
  }

  getLineType(): 'elbow' | 'straight' | 'curve' {
    const edge = this.getSelectedEdge();
    if (!edge) return 'straight';
    return edge.shape || 'straight';
  }

  reverseLineDirection() {
    const edge = this.getSelectedEdge();
    if (!edge || !edge.points) return;

    const points = [...edge.points].reverse();
    const sourceMarker = edge.targetMarker || 'none';
    const targetMarker = edge.sourceMarker || 'none';

    this.setShapeProperty({ points, sourceMarker, targetMarker });
  }

  setArrowMarker(position: 'source' | 'target', markerId: string) {
    let mark = 'none';
    if (markerId === 'classic-arrow') mark = 'arrow';
    else if (markerId === 'block') mark = 'solid-triangle';
    else if (markerId === 'hollow-triangle') mark = 'hollow-triangle';
    else if (markerId !== 'none') mark = 'arrow';

    const key = position === 'source' ? 'sourceMarker' : 'targetMarker';
    this.setShapeProperty({ [key]: mark });
  }

  toggleTargetMarker() {
    const selected = this.selectedElements?.[0] as any;
    const current = selected?.targetMarker || 'none';
    const next = current === 'arrow' ? 'none' : 'arrow';
    this.setShapeProperty({ targetMarker: next });
  }

  toggleSourceMarker() {
    const selected = this.selectedElements?.[0] as any;
    const current = selected?.sourceMarker || 'none';
    const next = current === 'arrow' ? 'none' : 'arrow';
    this.setShapeProperty({ sourceMarker: next });
  }

  getLineText(): string {
    const edge = this.getSelectedEdge();
    if (!edge) return '';
    return edge.texts?.[0]?.text || '';
  }

  setLineText(text: string) {
    this.setShapeProperty({ texts: text ? [{ text }] : [] });
  }

  // --- 形状切换 ---
  switchShape(targetShape: ShapeDefinition | string) {
    const shapeDef =
      typeof targetShape === 'string' ? getShapeById(targetShape) : targetShape;
    if (!shapeDef) return;

    const selectedCells = this.selectedElements || [];
    for (const cell of selectedCells) {
      if (this.isShapeNode && !this.isShapeNode(cell)) continue;

      const oldData = (cell as any).getData ? (cell as any).getData() : (cell as any).data || cell;
      const fill = oldData.fill || '#ffffff';
      const stroke = oldData.stroke || '#374151';
      const strokeWidth = oldData.strokeWidth ?? 2;
      const strokeDasharray = oldData.strokeDasharray || 'none';
      const opacity = oldData.opacity ?? 1;

      this.setShapeProperty({
        shape: shapeDef.id,
        fill,
        stroke,
        strokeWidth,
        strokeDasharray,
        opacity,
      });

      this.emit('selection:change', {
        selected: this.selectedElements,
      });
    }
  }

  destroy() {
    this.eventListeners.clear();
  }
}
