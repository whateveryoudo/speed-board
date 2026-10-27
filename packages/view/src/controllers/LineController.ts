import type { Board } from '@speed-board/core';
import { ARROWHEAD_PRESETS } from '../constants/arrowheads';

export class LineController {
  public static readonly arrowheadPresets = ARROWHEAD_PRESETS;

  public static getSelectedEdge(board: Board | null): any | null {
    if (!board) return null;
    const cell = board.selectedElements?.find(
      (c: any) =>
        c.shape === 'elbow' ||
        c.shape === 'straight' ||
        c.shape === 'curve' ||
        c.type === 'arrow-line' ||
        board.isLineNode(c)
    );
    return cell || null;
  }

  public static setLineType(board: Board, type: 'elbow' | 'straight' | 'curve') {
    board.setShapeProperty({ shape: type });
  }

  public static getLineType(board: Board | null): 'elbow' | 'straight' | 'curve' {
    const edge = this.getSelectedEdge(board);
    if (!edge) return 'straight';
    return edge.shape || 'straight';
  }

  public static reverseLineDirection(board: Board) {
    const edge = this.getSelectedEdge(board);
    if (!edge || !edge.points) return;

    const points = [...edge.points].reverse();
    const sourceMarker = edge.targetMarker || 'none';
    const targetMarker = edge.sourceMarker || 'none';

    board.setShapeProperty({ points, sourceMarker, targetMarker });
  }

  public static setArrowMarker(
    board: Board,
    position: 'source' | 'target',
    markerId: string
  ) {
    let mark = 'none';
    if (markerId === 'classic-arrow') mark = 'arrow';
    else if (markerId === 'block') mark = 'solid-triangle';
    else if (markerId === 'hollow-triangle') mark = 'hollow-triangle';
    else if (markerId !== 'none') mark = 'arrow';

    const key = position === 'source' ? 'sourceMarker' : 'targetMarker';
    board.setShapeProperty({ [key]: mark });
  }

  public static getLineText(board: Board | null): string {
    const edge = this.getSelectedEdge(board);
    if (!edge) return '';
    return edge.texts?.[0]?.text || '';
  }

  public static setLineText(board: Board, text: string) {
    board.setShapeProperty({ texts: text ? [{ text }] : [] });
  }
}
