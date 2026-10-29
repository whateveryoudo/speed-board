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
  addSelectedElement,
  clearSelectedElement,
  NODE_TO_INDEX,
  NODE_TO_PARENT,
} from './plait';
import { createSpeedPlaitBoard, type CreatePlaitBoardOptions } from './plait/board-factory';
import type { ShapeDefinition } from '@speed-board/shared';
import type {
  SelectedElementType,
  SelectionInfo,
  NodeStyleState,
  NodeTextState,
} from './types';
import {
  getSelectionInfo,
  isMindmapNode,
  isLineNode,
  isTextNode,
  isImageNode,
} from './state/selection-info';
import { getNodeStyleState, patchShapeProperty } from './state/style-state';
import { getNodeTextState, patchNodeText, getElementTextObject } from './state/text-state';
import {
  alignSelectedNodes,
  distributeSelectedNodes,
  type AlignType,
  type DistributeType,
} from './operations/align';
import {
  bringSelectedToFront,
  sendSelectedToBack,
  bringSelectedForward,
  sendSelectedBackward,
  groupSelected,
  ungroupSelected,
  toggleLockSelected,
  duplicateSelected,
} from './operations/layer';
import {
  getSelectedEdge,
  setLineType,
  getLineType,
  reverseLineDirection,
  setArrowMarker,
  toggleMarker,
  getLineText,
  setLineText,
} from './operations/line';

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
    const shapeMap: Record<string, string> = {
      // 基础图形 (Basic Shapes)
      rect: 'rectangle',
      rectangle: 'rectangle',
      'rounded-rect': 'roundRectangle',
      'round-rect': 'roundRectangle',
      roundRectangle: 'roundRectangle',
      circle: 'ellipse',
      ellipse: 'ellipse',
      diamond: 'diamond',
      triangle: 'triangle',
      parallelogram: 'parallelogram',
      trapezoid: 'trapezoid',
      cross: 'cross',
      star: 'star',
      comment: 'comment',
      'comment-2': 'roundComment',
      'round-comment': 'roundComment',
      roundComment: 'roundComment',
      'left-bracket': 'noteCurlyLeft',
      'right-bracket': 'noteCurlyRight',
      hexagon: 'hexagon',
      pentagon: 'pentagon',
      polygon: 'pentagon',
      octagon: 'octagon',
      'arrow-1': 'leftArrow',
      'left-arrow': 'leftArrow',
      leftArrow: 'leftArrow',
      'arrow-2': 'rightArrow',
      'right-arrow': 'rightArrow',
      rightArrow: 'rightArrow',
      'arrow-3': 'twoWayArrow',
      'two-way-arrow': 'twoWayArrow',
      twoWayArrow: 'twoWayArrow',
      'pentagon-arrow': 'pentagonArrow',
      pentagonArrow: 'pentagonArrow',
      'process-arrow': 'processArrow',
      processArrow: 'processArrow',
      cloud: 'cloud',
      'swimlane-vertical': 'swimlaneVertical',
      swimlaneVertical: 'swimlaneVertical',
      'swimlane-horizontal': 'swimlaneHorizontal',
      swimlaneHorizontal: 'swimlaneHorizontal',

      // 流程图 (Flowchart Symbols)
      process: 'process',
      decision: 'decision',
      'start-end': 'terminal',
      terminal: 'terminal',
      subroutine: 'predefinedProcess',
      'predefined-process': 'predefinedProcess',
      predefinedProcess: 'predefinedProcess',
      document: 'document',
      'multi-document': 'multiDocument',
      multiDocument: 'multiDocument',
      'manual-input': 'manualInput',
      manualInput: 'manualInput',
      preparation: 'preparation',
      data: 'data',
      database: 'database',
      'hard-disk': 'hardDisk',
      hardDisk: 'hardDisk',
      'internal-storage': 'internalStorage',
      internalStorage: 'internalStorage',
      'paper-tape': 'storedData',
      'stored-data': 'storedData',
      storedData: 'storedData',
      'manual-loop': 'manualLoop',
      manualLoop: 'manualLoop',
      delay: 'delay',
      merge: 'merge',
      connector: 'connector',
      or: 'or',
      'summing-junction': 'summingJunction',
      summingJunction: 'summingJunction',
      display: 'display',
      'off-page': 'offPage',
      offPage: 'offPage',
      'loop-limit': 'preparation',
      card: 'manualInput',
      sort: 'decision',
      collate: 'merge',
      parallel: 'process',
      annotation: 'noteSquare',

      // Smart (DSL) 图元
      pyramid: 'triangle',
      'segmented pyramid': 'triangle',
      stage: 'process',
      architecture: 'rectangle',

      // UML 图元
      actor: 'actor',
      'use-case': 'useCase',
      useCase: 'useCase',
      package: 'package',
      frame: 'componentBox',
      constraint: 'note',
      note: 'note',
      class: 'class',
      'activity-class': 'activityClass',
      activityClass: 'activityClass',
      'simple-class': 'simpleClass',
      simpleClass: 'simpleClass',
      interface: 'interface',
      multiplicity: 'note',
      frequency: 'note',
      activation: 'activation',
      entity: 'useCase',
      control: 'useCase',
      boundary: 'useCase',
      deletion: 'deletion',
      state: 'roundRectangle',
      object: 'object',
      start: 'ellipse',
      finish: 'ellipse',
      'termination-pseudostate': 'cross',
      'history-pseudostate': 'ellipse',
      choice: 'diamond',
      activity: 'roundRectangle',
      'send-signal': 'processArrow',
      'receive-signal': 'processArrow',
      fork: 'rectangle',
      component: 'component',
      node: 'componentBox',

      // ER 图元
      'er-entity': 'rectangle',
      'weak-entity': 'rectangle',
      'derived-attribute': 'ellipse',
      attribute: 'ellipse',
      'multivalued-attribute': 'ellipse',
      relationship: 'diamond',
      'weak-relationship': 'diamond',
      generalization: 'triangle',
      'total-generalization': 'triangle',

      // 文本
      text: 'text',
    };
    return shapeMap[shape] || shape;
  }

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
  static insertMindmapHandler?: (board: Board, topic?: string, point?: [number, number]) => any;
  static setMindmapLayoutHandler?: (board: Board, layout: string) => void;
  static setMindmapBranchShapeHandler?: (board: Board, shape: string) => void;
  static setMindmapShapeHandler?: (board: Board, shape: string) => void;
  static addMindmapSummaryHandler?: (board: Board) => void;
  static setMindmapMarkersHandler?: (board: Board, markers: Record<string, any>) => void;

  getViewportCenterPoint(): [number, number] {
    const container = PlaitBoard.getBoardContainer(this.raw);
    const width = container?.clientWidth || 800;
    const height = container?.clientHeight || 600;
    return toViewBoxPoint(this.raw, [width / 2, height / 2]);
  }

  insertText(text = '文本', point?: [number, number]) {
    if (Board.insertTextHandler) {
      return Board.insertTextHandler(this, text, point);
    }
  }

  insertMindmap(topic = '思维导图', point?: [number, number]) {
    if (Board.insertMindmapHandler) {
      return Board.insertMindmapHandler(this, topic, point);
    }
  }

  setMindmapLayout(layout: string) {
    if (Board.setMindmapLayoutHandler) {
      Board.setMindmapLayoutHandler(this, layout);
    }
  }

  setMindmapBranchShape(shape: string) {
    if (Board.setMindmapBranchShapeHandler) {
      Board.setMindmapBranchShapeHandler(this, shape);
    }
  }

  setMindmapShape(shape: string) {
    if (Board.setMindmapShapeHandler) {
      Board.setMindmapShapeHandler(this, shape);
    }
  }

  addMindmapSummary() {
    if (Board.addMindmapSummaryHandler) {
      Board.addMindmapSummaryHandler(this);
    }
  }

  setMindmapMarkers(markers: Record<string, any>) {
    if (Board.setMindmapMarkersHandler) {
      Board.setMindmapMarkersHandler(this, markers);
    }
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
    return (
      element.type === 'geometry' ||
      (Boolean(element.shape) && element.shape !== 'text' && element.type !== 'arrow-line')
    );
  };

  isTextNode = isTextNode;
  isLineNode = isLineNode;
  isMindmapNode = isMindmapNode;
  isImageNode = isImageNode;

  isTextEditing = (): boolean => {
    return PlaitBoard.hasBeenTextEditing(this.raw);
  };

  public getElementPath(element: any): number[] | null {
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

  // --- 状态提取委托 (委托到 state/ 模块) ---
  get selectionInfo(): SelectionInfo {
    return this.getSelectionInfo();
  }

  getSelectionInfo(): SelectionInfo {
    return getSelectionInfo(this.selectedElements);
  }

  getNodeStyleState(): NodeStyleState {
    return getNodeStyleState(this.selectedElements);
  }

  getNodeTextState(): NodeTextState {
    return getNodeTextState(this.selectedElements);
  }

  getSelectedTextData(): any {
    return getNodeTextState(this.selectedElements);
  }

  setShapeProperty(properties: Record<string, any>) {
    this.syncNodeIndices();
    patchShapeProperty(this.raw, this.selectedElements, properties, (el) => this.getElementPath(el));
    this.syncNodeIndices();
    this.emit('change', {});
    this.emit('selection:change', { selected: this.selectedElements });
  }

  patchNodeStyle(patch: Partial<NodeStyleState>) {
    this.setShapeProperty(patch);
  }

  patchNodeText(patch: Partial<NodeTextState>) {
    this.syncNodeIndices();
    patchNodeText(this.raw, this.selectedElements, patch, (el) => this.getElementPath(el));
    this.syncNodeIndices();
    this.emit('change', {});
  }

  // --- 排列与对齐 (委托到 operations/align) ---
  alignSelectedNodes(type: AlignType) {
    this.syncNodeIndices();
    alignSelectedNodes(this.raw, type);
    this.syncNodeIndices();
    this.emit('change', {});
  }

  distributeSelectedNodes(type: DistributeType) {
    this.syncNodeIndices();
    distributeSelectedNodes(this.raw, type);
    this.syncNodeIndices();
    this.emit('change', {});
  }

  // --- 图层与组织 (委托到 operations/layer) ---
  bringSelectedToFront() {
    this.syncNodeIndices();
    bringSelectedToFront(this.raw);
    this.syncNodeIndices();
    this.emit('change', {});
  }

  sendSelectedToBack() {
    this.syncNodeIndices();
    sendSelectedToBack(this.raw);
    this.syncNodeIndices();
    this.emit('change', {});
  }

  bringSelectedForward() {
    this.syncNodeIndices();
    bringSelectedForward(this.raw);
    this.syncNodeIndices();
    this.emit('change', {});
  }

  sendSelectedBackward() {
    this.syncNodeIndices();
    sendSelectedBackward(this.raw);
    this.syncNodeIndices();
    this.emit('change', {});
  }

  groupSelected() {
    this.syncNodeIndices();
    groupSelected(this.raw);
    this.syncNodeIndices();
    this.emit('change', {});
  }

  ungroupSelected() {
    this.syncNodeIndices();
    ungroupSelected(this.raw);
    this.syncNodeIndices();
    this.emit('change', {});
  }

  toggleLockSelected() {
    toggleLockSelected(this.raw, this.selectedElements, (el) => this.getElementPath(el));
    this.syncNodeIndices();
    this.emit('change', {});
  }

  duplicateSelected() {
    duplicateSelected(this.raw, this.selectedElements);
    this.syncNodeIndices();
    this.emit('change', {});
  }

  // --- 连线与箭头 (委托到 operations/line) ---
  getSelectedEdge(): any | null {
    return getSelectedEdge(this.selectedElements);
  }

  setLineType(type: 'elbow' | 'straight' | 'curve') {
    setLineType((props) => this.setShapeProperty(props), type);
  }

  getLineType(): 'elbow' | 'straight' | 'curve' {
    return getLineType(this.selectedElements);
  }

  reverseLineDirection() {
    reverseLineDirection(this.selectedElements, (props) => this.setShapeProperty(props));
  }

  setArrowMarker(position: 'source' | 'target', markerId: string) {
    setArrowMarker(position, markerId, (props) => this.setShapeProperty(props));
  }

  toggleTargetMarker() {
    toggleMarker('target', this.selectedElements, (props) => this.setShapeProperty(props));
  }

  toggleSourceMarker() {
    toggleMarker('source', this.selectedElements, (props) => this.setShapeProperty(props));
  }

  getLineText(): string {
    return getLineText(this.selectedElements);
  }

  setLineText(text: string) {
    setLineText(text, (props) => this.setShapeProperty(props));
  }

  switchShape(targetShape: ShapeDefinition | string) {
    const shapeId = typeof targetShape === 'string' ? targetShape : targetShape?.id;
    if (!shapeId) return;
    const plaitShape = this.mapShapeToPointer(shapeId);
    if (!plaitShape) return;
    this.setShapeProperty({ shape: plaitShape });
  }

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
