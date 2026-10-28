import { Transforms, type PlaitBoard } from '../plait';

export function bringSelectedToFront(board: PlaitBoard): void {
  Transforms.moveToTop(board);
}

export function sendSelectedToBack(board: PlaitBoard): void {
  Transforms.moveToBottom(board);
}

export function bringSelectedForward(board: PlaitBoard): void {
  Transforms.moveUp(board);
}

export function sendSelectedBackward(board: PlaitBoard): void {
  Transforms.moveDown(board);
}

export function groupSelected(board: PlaitBoard): void {
  Transforms.addGroup(board);
}

export function ungroupSelected(board: PlaitBoard): void {
  Transforms.removeGroup(board);
}

export function toggleLockSelected(
  board: PlaitBoard,
  selectedElements: any[],
  getElementPath: (el: any) => any[] | null
): void {
  selectedElements.forEach((element) => {
    const path = getElementPath(element);
    if (path) {
      const isLocked = Boolean((element as any).locked);
      Transforms.setNode(board, { locked: !isLocked } as any, path);
    }
  });
}

export function duplicateSelected(board: PlaitBoard, selectedElements: any[]): void {
  if (selectedElements.length === 0) return;
  const clones = selectedElements.map((el) => {
    const clone = JSON.parse(JSON.stringify(el));
    if (clone.points && Array.isArray(clone.points)) {
      clone.points = clone.points.map((p: [number, number]) => [p[0] + 20, p[1] + 20]);
    }
    delete clone.id;
    return clone;
  });
  clones.forEach((clone) => {
    Transforms.insertNode(board, clone, [board.children.length]);
  });
}
