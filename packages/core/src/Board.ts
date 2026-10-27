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

export class Board {
  public raw: PlaitBoard;

  constructor(options: CreatePlaitBoardOptions = {}) {
    this.raw = createSpeedPlaitBoard(options);
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
  get zoom(): number {
    return this.raw.viewport.zoom;
  }

  setZoom(zoom: number) {
    BoardTransforms.updateZoom(this.raw, Math.min(Math.max(zoom, 0.1), 5));
  }

  zoomIn(step = 0.1) {
    this.setZoom(this.zoom + step);
  }

  zoomOut(step = 0.1) {
    this.setZoom(this.zoom - step);
  }

  zoomToFit() {
    BoardTransforms.fitViewport(this.raw);
  }

  resetZoom() {
    this.setZoom(1);
  }

  // --- 历史与撤销重做 ---
  undo() {
    this.raw.undo();
  }

  redo() {
    this.raw.redo();
  }

  get canUndo(): boolean {
    return (this.raw.history?.undos?.length || 0) > 0;
  }

  get canRedo(): boolean {
    return (this.raw.history?.redos?.length || 0) > 0;
  }

  // --- 选区与图元 ---
  get selectedElements(): PlaitElement[] {
    return getSelectedElements(this.raw);
  }

  deleteSelected() {
    deleteFragment(this.raw);
  }

  // --- 属性修改 ---
  setShapeProperty(properties: Record<string, any>) {
    const selected = getSelectedElements(this.raw);
    selected.forEach((element) => {
      const path = PlaitBoard.findPath(this.raw, element);
      Transforms.setNode(this.raw, properties, path);
    });
  }

  // --- 坐标换算 ---
  clientToBoard(x: number, y: number): [number, number] {
    return toViewBoxPoint(this.raw, [x, y]);
  }

  boardToClient(x: number, y: number): [number, number] {
    return toHostPoint(this.raw, x, y);
  }
}
