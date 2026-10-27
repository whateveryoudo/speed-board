import {
  PlaitBoard,
  type PlaitElement,
  PlaitPointerType,
  BoardTransforms,
  getSelectedElements,
  toHostPoint,
  toViewBoxPoint,
  BasicShapes,
  ArrowLineShape,
  BoardCreationMode,
  setCreationMode,
  deleteFragment,
  Transforms,
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

  // 快捷切换模式
  setTool(tool: 'select' | 'hand' | 'rect' | 'circle' | 'diamond' | 'elbow' | 'straight' | 'mind' | string) {
    switch (tool) {
      case 'select':
        this.setPointer(PlaitPointerType.selection);
        break;
      case 'hand':
        this.setPointer(PlaitPointerType.hand);
        break;
      case 'rect':
        this.setPointer(BasicShapes.rectangle);
        break;
      case 'circle':
        this.setPointer(BasicShapes.ellipse);
        break;
      case 'diamond':
        this.setPointer(BasicShapes.diamond);
        break;
      case 'elbow':
        this.setPointer(ArrowLineShape.elbow);
        break;
      case 'straight':
        this.setPointer(ArrowLineShape.straight);
        break;
      default:
        this.setPointer(tool);
    }
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

  deleteSelected() {
    deleteFragment(this.raw);
    this.emit('change', {});
  }

  // --- 属性修改 ---
  setShapeProperty(properties: Record<string, any>) {
    const selected = getSelectedElements(this.raw);
    selected.forEach((element) => {
      const path = PlaitBoard.findPath(this.raw, element);
      Transforms.setNode(this.raw, properties, path);
    });
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
