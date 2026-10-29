import {
  Board,
  PlaitPointerType,
  addSelectedElement,
  clearSelectedElement,
  Transforms,
} from '@speed-board/core';
import {
  createEmptyMind,
  MindTransforms,
  MindElement,
  MindElementShape,
  BranchShape,
} from '@plait/mind';
import { MindLayoutType } from '@plait/layouts';

export function registerBoardMindmap(): void {
  Board.insertMindmapHandler = (
    board: Board,
    topic = '思维导图',
    point?: [number, number]
  ) => {
    const center = point || board.getViewportCenterPoint();
    const emptyMind = createEmptyMind(board.raw, center);
    if (topic && emptyMind.data?.topic?.children?.[0]) {
      (emptyMind.data.topic.children[0] as any).text = topic;
    }
    if (emptyMind.data?.topic) {
      (emptyMind.data.topic as any).align = 'center';
    }
    emptyMind.shape = MindElementShape.roundRectangle;
    emptyMind.fill = '#2563eb';
    emptyMind.strokeColor = '#2563eb';
    if (emptyMind.data?.topic?.children?.[0]) {
      (emptyMind.data.topic.children[0] as any).color = '#ffffff';
    }

    MindTransforms.insertMind(board.raw as any, emptyMind);
    board.setPointer(PlaitPointerType.selection);
    clearSelectedElement(board.raw);
    addSelectedElement(board.raw, emptyMind);
    board.emit('change', {});
    return emptyMind;
  };

  Board.setMindmapLayoutHandler = (board: Board, layout: string) => {
    const layoutMap: Record<string, MindLayoutType> = {
      balanced: MindLayoutType.standard,
      standard: MindLayoutType.standard,
      right: MindLayoutType.right,
      left: MindLayoutType.left,
      'org-down': MindLayoutType.downward,
      downward: MindLayoutType.downward,
      'tree-right': MindLayoutType.rightBottomIndented,
      'tree-left': MindLayoutType.leftBottomIndented,
      'timeline-up': MindLayoutType.upward,
      upward: MindLayoutType.upward,
    };
    const targetLayout = layoutMap[layout] || (layout as MindLayoutType);
    board.syncNodeIndices();
    MindTransforms.setLayout(board.raw, targetLayout);
    board.syncNodeIndices();
    board.emit('change', {});
  };

  Board.setMindmapBranchShapeHandler = (board: Board, shape: string) => {
    const branchShape =
      shape === 'curve' || shape === 'bight' ? BranchShape.bight : BranchShape.polyline;
    board.syncNodeIndices();
    MindTransforms.setBranchShape(board.raw, branchShape);
    board.syncNodeIndices();
    board.emit('change', {});
  };

  Board.setMindmapShapeHandler = (board: Board, shape: string) => {
    const plaitShape =
      shape === 'none' || shape === 'underline'
        ? MindElementShape.underline
        : MindElementShape.roundRectangle;
    board.syncNodeIndices();
    MindTransforms.setShape(board.raw, plaitShape);
    board.syncNodeIndices();
    board.emit('change', {});
  };

  Board.addMindmapSummaryHandler = (board: Board) => {
    const selected = (board.selectedElements || []).filter((el) =>
      MindElement.isMindElement(board.raw, el)
    );
    if (selected.length === 0) return;
    board.syncNodeIndices();
    MindTransforms.insertAbstract(board.raw, selected as MindElement[]);
    board.syncNodeIndices();
    board.emit('change', {});
  };

  Board.setMindmapMarkersHandler = (board: Board, markers: Record<string, any>) => {
    const selected = (board.selectedElements || []).filter((el) =>
      MindElement.isMindElement(board.raw, el)
    );
    if (selected.length === 0) return;

    board.syncNodeIndices();
    selected.forEach((element) => {
      const path = board.getElementPath(element);
      if (path) {
        const currentData = (element as any).data || {};
        Transforms.setNode(
          board.raw,
          {
            data: {
              ...currentData,
              markers: {
                ...(currentData.markers || {}),
                ...markers,
              },
            },
          },
          path
        );
      }
    });
    board.syncNodeIndices();
    board.emit('change', {});
  };
}

registerBoardMindmap();
