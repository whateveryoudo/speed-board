import {
  PlaitBoard,
  type PlaitElement,
  PlaitPointerType,
  BoardTransforms,
  getSelectedElements,
  toHostPoint,
  toViewBoxPoint,
  BoardCreationMode,
  setCreationMode,
  deleteFragment,
  Transforms,
  AlignTransform,
  addSelectedElement,
  clearSelectedElement,
  NODE_TO_INDEX,
  NODE_TO_PARENT,
  getRectangleByElements,
  toHostPointFromViewBoxPoint,
  toScreenPointFromHostPoint,
  RectangleClient,
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
    (b as any).boardWrapper = this;
  }

  constructor(options: CreatePlaitBoardOptions = {}) {
    this.raw = createSpeedPlaitBoard(options);
    (this.raw as any).boardWrapper = this;
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
      setCreationMode(this.raw, BoardCreationMode.dnd);
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
      case 'comment-2':
      case 'roundComment':
        return BasicShapes.roundComment;
      case 'hexagon':
        return BasicShapes.hexagon;
      case 'pentagon':
      case 'polygon':
        return BasicShapes.pentagon;
      case 'octagon':
        return BasicShapes.octagon;
      case 'arrow-1':
      case 'leftArrow':
        return BasicShapes.leftArrow;
      case 'arrow-2':
      case 'rightArrow':
        return BasicShapes.rightArrow;
      case 'arrow-3':
      case 'twoWayArrow':
        return BasicShapes.twoWayArrow;
      case 'pentagon-arrow':
      case 'pentagonArrow':
        return BasicShapes.pentagonArrow;
      case 'process-arrow':
      case 'processArrow':
        return BasicShapes.processArrow;
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
        this.setPointer('text');
        break;
      case 'mind':
      case 'mindmap':
        this.setPointer('mind');
        break;
      case 'pencil':
      case 'nibPen':
        this.setPointer('nibPen');
        break;
      case 'marker':
      case 'feltTipPen':
        this.setPointer('feltTipPen');
        break;
      case 'eraser':
        this.setPointer('eraser');
        break;
      case 'straight':
        this.setPointer('straight');
        break;
      case 'curve':
        this.setPointer('curve');
        break;
      case 'elbow':
        this.setPointer('elbow');
        break;
      default:
        this.setPointer(this.mapShapeToPointer(tool));
    }
  }

  // 扩展插件静态注册处理器
  static insertShapeHandler?: (board: Board, shape: string, options?: any, point?: [number, number]) => any;
  static insertLineHandler?: (board: Board, shape?: string, options?: any, point?: [number, number]) => any;
  static insertTextHandler?: (board: Board, text?: string, point?: [number, number]) => any;
  static insertImageHandler?: (board: Board, image: any, point?: [number, number]) => any;

  // 获取当前视口中心坐标 (用于默认就地插入)
  getViewportCenterPoint(): [number, number] {
    const container = PlaitBoard.getBoardContainer(this.raw);
    const width = container?.clientWidth || 800;
    const height = container?.clientHeight || 600;
    return toViewBoxPoint(this.raw, [width / 2, height / 2]);
  }

  // --- 直接插入图元 API ---
  insertText(text = '文本', point?: [number, number]) {
    if (Board.insertTextHandler) {
      return Board.insertTextHandler(this, text, point);
    }
  }

  insertMindmap(topic = '思维导图', point?: [number, number]) {
    const center = point || this.getViewportCenterPoint();
    const emptyMind: PlaitElement = {
      id: `mind-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'mind',
      points: [[center[0] - 55, center[1] - 21]],
      isRoot: true,
      shape: 'roundRectangle',
      fill: '#2563eb',
      strokeColor: '#2563eb',
      strokeWidth: 2,
      data: {
        topic: {
          children: [{ text: topic, color: '#ffffff', fontSize: 16, fontWeight: '500' }],
          align: 'center',
        },
      },
      children: [],
    } as any;

    Transforms.insertNode(this.raw, emptyMind, [this.raw.children.length]);
    this.setPointer(PlaitPointerType.selection);
    this.select([emptyMind]);
    this.emit('change', {});

    return emptyMind;
  }

  setMindmapLayout(layout: string) {
    const layoutMap: Record<string, string> = {
      balanced: 'standard',
      standard: 'standard',
      right: 'right',
      left: 'left',
      'org-down': 'downward',
      downward: 'downward',
      'tree-right': 'rightBottomIndented',
      'tree-left': 'leftBottomIndented',
      'timeline-up': 'upward',
      upward: 'upward',
    };
    const targetLayout = layoutMap[layout] || layout;
    const selected = (this.selectedElements || []).find((el) => this.isMindmapNode(el));
    if (selected) {
      selected.layout = targetLayout;
      const path = this.getElementPath(selected);
      if (path) {
        Transforms.setNode(this.raw, { layout: targetLayout }, path);
      }
      this.emit('change', {});
    }
  }

  setMindmapBranchShape(shape: string) {
    const branchShape = shape === 'curve' || shape === 'bight' ? 'curve' : 'polyline';
    const selected = (this.selectedElements || []).find((el) => this.isMindmapNode(el));
    if (selected) {
      selected.branchShape = branchShape as any;
      const path = this.getElementPath(selected);
      if (path) {
        Transforms.setNode(this.raw, { branchShape }, path);
      }
      this.emit('change', {});
    }
  }

  setMindmapShape(shape: string) {
    const plaitShape = shape === 'none' || shape === 'underline' ? 'underline' : 'roundRectangle';
    const selected = (this.selectedElements || []).find((el) => this.isMindmapNode(el));
    if (selected) {
      selected.shape = plaitShape as any;
      const path = this.getElementPath(selected);
      if (path) {
        Transforms.setNode(this.raw, { shape: plaitShape }, path);
      }
      this.emit('change', {});
    }
  }

  addMindmapSummary() {
    const selected = (this.selectedElements || []).filter((el) => this.isMindmapNode(el));
    if (selected.length === 0) return;
    this.syncNodeIndices();
    this.emit('change', {});
  }

  setMindmapMarkers(markers: Record<string, any>) {
    const selected = (this.selectedElements || []).filter((el) => MindElement.isMindElement(this.raw, el));
    if (selected.length === 0) return;

    const emojis: Array<{ symbolId: string; name: string; id: string }> = [];
    if (typeof markers.priority === 'number' && markers.priority >= 1 && markers.priority <= 7) {
      emojis.push({
        symbolId: `marker-priority-${markers.priority}`,
        name: `priority-${markers.priority}`,
        id: `marker-priority-${markers.priority}`,
      });
    }
    if (typeof markers.progress === 'number' && markers.progress >= 0 && markers.progress <= 6) {
      emojis.push({
        symbolId: `marker-progress-${markers.progress}`,
        name: `progress-${markers.progress}`,
        id: `marker-progress-${markers.progress}`,
      });
    }
    if (markers.flag) {
      const flagKey = markers.flag.startsWith('flag-') ? markers.flag : `flag-${markers.flag}`;
      emojis.push({
        symbolId: `marker-${flagKey}`,
        name: flagKey,
        id: `marker-${flagKey}`,
      });
    }

    this.syncNodeIndices();
    selected.forEach((element) => {
      const path = this.getElementPath(element);
      if (path) {
        const currentData = (element as any).data || {};
        Transforms.setNode(
          this.raw,
          {
            data: {
              ...currentData,
              markers: { ...markers },
              emojis: emojis.length > 0 ? emojis : undefined,
            },
          },
          path
        );
      }
    });
    this.syncNodeIndices();
    this.emit('change', {});
  }

  insertShape(shape: string, options: any = {}, point?: [number, number]) {
    if (Board.insertShapeHandler) {
      return Board.insertShapeHandler(this, shape, options, point);
    }
  }

  insertLine(shape = 'straight', options: any = {}, point?: [number, number]) {
    if (Board.insertLineHandler) {
      return Board.insertLineHandler(this, shape, options, point);
    }
  }

  insertImage(image: { url: string; width: number; height: number; name?: string }, point?: [number, number]) {
    if (Board.insertImageHandler) {
      return Board.insertImageHandler(this, image, point);
    }
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
    if (element.type === 'vector-line' || element.type === 'freehand') return false;
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

  isTextEditing = (): boolean => {
    return PlaitBoard.hasBeenTextEditing(this.raw);
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
    const child = textNode.children?.[0] || textNode;
    return {
      text: typeof child.text === 'string' ? child.text : (typeof textNode.text === 'string' ? textNode.text : ''),
      link: selected.data?.link || selected.link || child.url || child.link || '',
      fontSize: child['font-size'] || child.fontSize || 14,
      fill: child.color || child.fill || textNode.color || textNode.fill || '#262626',
      bold: Boolean(child.bold || textNode.bold),
      italic: Boolean(child.italic || textNode.italic),
      strike: Boolean(child.strikethrough || child.strike || textNode.strike),
      underline: Boolean(child.underlined || child.underline || textNode.underline),
      align: textNode.align || child.align || 'left',
      verticalAlign: textNode.verticalAlign || child.verticalAlign || 'middle',
    };
  }

  setSelectedTextData(patch: Partial<NodeTextState>) {
    const selected = this.selectedElements;
    selected.forEach((element: any) => {
      const path = this.getElementPath(element);
      if (!path) return;

      const currentText = element.text || { children: [{ text: '' }] };
      const currentChildren = currentText.children || [{ text: '' }];
      const firstChild = currentChildren[0] || { text: '' };

      const updatedChild = { ...firstChild };
      if (patch.text !== undefined) {
        updatedChild.text = patch.text;
      }
      if (patch.fontSize !== undefined) {
        updatedChild['font-size'] = patch.fontSize;
        updatedChild.fontSize = patch.fontSize;
      }
      if (patch.fill !== undefined) {
        updatedChild.color = patch.fill;
        updatedChild.fill = patch.fill;
      }
      if (patch.bold !== undefined) updatedChild.bold = patch.bold;
      if (patch.italic !== undefined) updatedChild.italic = patch.italic;
      if (patch.underline !== undefined) updatedChild.underlined = patch.underline;
      if (patch.strike !== undefined) updatedChild.strikethrough = patch.strike;

      const newText = {
        ...currentText,
        children: [updatedChild, ...currentChildren.slice(1)],
      };
      if (patch.align !== undefined) {
        newText.align = patch.align;
      }
      if (patch.verticalAlign !== undefined) {
        newText.verticalAlign = patch.verticalAlign;
      }

      const newProps: any = { text: newText };
      if (patch.verticalAlign !== undefined) {
        newProps.verticalAlign = patch.verticalAlign;
      }
      if (patch.link !== undefined) {
        newProps.link = patch.link;
        if (element.data) {
          newProps.data = { ...element.data, link: patch.link };
        }
      }

      Transforms.setNode(this.raw, newProps as any, path);
    });

    this.syncNodeIndices();
    this.emit('change', {});
    this.emit('selection:change', { selected: this.selectedElements });
  }

  updateSelectedTextStyle(patch: any) {
    this.setSelectedTextData(patch);
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
    const props = { ...properties };
    if (props.stroke && !props.strokeColor) {
      props.strokeColor = props.stroke;
    }
    if (props.strokeColor && !props.stroke) {
      props.stroke = props.strokeColor;
    }
    this.syncNodeIndices();
    const selected = getSelectedElements(this.raw);
    const hasMind = selected.some((el) => MindElement.isMindElement(this.raw, el));
    if (props.shape && !hasMind) {
      props.shape = this.mapShapeToPointer(props.shape);
    }
    selected.forEach((element) => {
      const path = this.getElementPath(element);
      if (path) {
        if (MindElement.isMindElement(this.raw, element)) {
          const mindProps = { ...props };
          if (props.stroke || props.strokeColor) {
            mindProps.strokeColor = props.stroke || props.strokeColor;
            mindProps.branchColor = props.stroke || props.strokeColor;
          }
          Transforms.setNode(this.raw, mindProps, path);
        } else {
          Transforms.setNode(this.raw, props, path);
        }
      }
    });
    this.syncNodeIndices();
    this.emit('change', {});
    this.emit('selection:change', { selected: getSelectedElements(this.raw) });
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
    if (first.type === 'vector-line') {
      const pts = first.points || [];
      const isClosed = pts.length > 2 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1];
      selectedType = isClosed ? 'vector' : 'line';
    } else if (this.isLineNode(first) || first.shape === 'straight' || first.shape === 'elbow' || first.shape === 'curve') {
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

    if (this.isMindmapNode(cell)) {
      return {
        fill: cell.fill || (cell.isRoot ? '#2563eb' : '#ffffff'),
        stroke: cell.strokeColor || cell.branchColor || cell.stroke || '#374151',
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
    const shapeId = typeof targetShape === 'string' ? targetShape : targetShape?.id;
    if (!shapeId) return;

    const plaitShape = this.mapShapeToPointer(shapeId);
    if (!plaitShape) return;

    this.setShapeProperty({
      shape: plaitShape,
    });
  }

  destroy() {
    this.eventListeners.clear();
  }
}
