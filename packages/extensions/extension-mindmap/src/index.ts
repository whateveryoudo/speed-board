export class MindmapExtension {
  name = 'mindmap';
}

export function isMindmapNode(node: any): boolean {
  return false;
}

export function activateMindmapNodeTextEdit(board: any, node: any, initialChar?: string) {}

export function updateMindmapLayout(board: any, node: any) {}

export function addMindmapSummary(board: any, node: any) {}

export * from './types';
