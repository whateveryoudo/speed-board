import type { SelectedElementType, SelectionInfo } from '../types';

export function isTextNode(element: any): boolean {
  if (!element) return false;
  return element.type === 'text' || element.shape === 'text';
}

export function isLineNode(element: any): boolean {
  if (!element) return false;
  if (element.type === 'vector-line' || element.type === 'freehand') return false;
  return (
    element.type === 'arrow-line' ||
    element.shape === 'straight' ||
    element.shape === 'curve' ||
    element.shape === 'elbow'
  );
}

export function isMindmapNode(element: any): boolean {
  if (!element) return false;
  return (
    element.type === 'mind' ||
    element.type === 'mind_child' ||
    element.type === 'mindmap' ||
    Boolean(element.isRoot) ||
    Boolean(element.data?.topic)
  );
}

export function isImageNode(element: any): boolean {
  if (!element) return false;
  return element.type === 'image' || element.shape === 'image';
}

export function getSelectionInfo(selectedElements: any[] = []): SelectionInfo {
  const count = selectedElements.length;

  if (count === 0) {
    return {
      selectedCells: [],
      selectedCount: 0,
      selectedCell: null,
      selectedType: 'none',
      selectedShapeId: '',
    };
  }

  const first = selectedElements[0];

  if (count > 1) {
    return {
      selectedCells: selectedElements,
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
    const isClosed =
      pts.length > 2 &&
      pts[0][0] === pts[pts.length - 1][0] &&
      pts[0][1] === pts[pts.length - 1][1];
    selectedType = isClosed ? 'vector' : 'line';
  } else if (
    isLineNode(first) ||
    first.shape === 'straight' ||
    first.shape === 'elbow' ||
    first.shape === 'curve'
  ) {
    selectedType = 'line';
  } else if (
    isMindmapNode(first) ||
    first.type === 'mind' ||
    first.isRoot ||
    first.children
  ) {
    if (first.isSummary) selectedType = 'mindmap-summary';
    else if (first.isRoot) selectedType = 'mindmap-root';
    else selectedType = 'mindmap-node';
  } else if (isImageNode(first) || type === 'image') {
    selectedType = 'image';
  } else if (isTextNode(first) || type === 'text') {
    selectedType = 'text';
  } else if (type === 'freehand' || type === 'vector') {
    selectedType = 'vector';
  } else {
    selectedType = 'shape';
    selectedShapeId = first.shape || 'rectangle';
  }

  return {
    selectedCells: selectedElements,
    selectedCount: count,
    selectedCell: first,
    selectedType,
    selectedShapeId,
  };
}
