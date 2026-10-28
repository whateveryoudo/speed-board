import type { PlaitBoard } from '../plait';
import { isLineNode } from '../state/selection-info';

export function getSelectedEdge(selectedElements: any[] = []): any | null {
  const cell = selectedElements.find(
    (c: any) =>
      c.shape === 'elbow' ||
      c.shape === 'straight' ||
      c.shape === 'curve' ||
      c.type === 'arrow-line' ||
      isLineNode(c)
  );
  return cell || null;
}

export function setLineType(
  setShapeProperty: (props: Record<string, any>) => void,
  type: 'elbow' | 'straight' | 'curve'
): void {
  setShapeProperty({ shape: type });
}

export function getLineType(selectedElements: any[] = []): 'elbow' | 'straight' | 'curve' {
  const edge = getSelectedEdge(selectedElements);
  if (!edge) return 'straight';
  return edge.shape || 'straight';
}

export function reverseLineDirection(
  selectedElements: any[],
  setShapeProperty: (props: Record<string, any>) => void
): void {
  const edge = getSelectedEdge(selectedElements);
  if (!edge || !edge.points) return;

  const points = [...edge.points].reverse();
  const sourceMarker = edge.targetMarker || 'none';
  const targetMarker = edge.sourceMarker || 'none';

  setShapeProperty({ points, sourceMarker, targetMarker });
}

export function setArrowMarker(
  position: 'source' | 'target',
  markerId: string,
  setShapeProperty: (props: Record<string, any>) => void
): void {
  let mark = 'none';
  if (markerId === 'classic-arrow') mark = 'arrow';
  else if (markerId === 'block') mark = 'solid-triangle';
  else if (markerId === 'hollow-triangle') mark = 'hollow-triangle';
  else if (markerId !== 'none') mark = 'arrow';

  const key = position === 'source' ? 'sourceMarker' : 'targetMarker';
  setShapeProperty({ [key]: mark });
}

export function toggleMarker(
  position: 'source' | 'target',
  selectedElements: any[],
  setShapeProperty: (props: Record<string, any>) => void
): void {
  const selected = selectedElements[0] as any;
  const key = position === 'source' ? 'sourceMarker' : 'targetMarker';
  const current = selected?.[key] || 'none';
  const next = current === 'arrow' ? 'none' : 'arrow';
  setShapeProperty({ [key]: next });
}

export function getLineText(selectedElements: any[] = []): string {
  const edge = getSelectedEdge(selectedElements);
  if (!edge) return '';
  return edge.texts?.[0]?.text || '';
}

export function setLineText(
  text: string,
  setShapeProperty: (props: Record<string, any>) => void
): void {
  setShapeProperty({ texts: text ? [{ text }] : [] });
}
