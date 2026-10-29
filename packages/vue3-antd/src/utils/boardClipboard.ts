import type { PlaitElement } from '@speed-board/core';
import type { SpeedMindElement } from '@speed-board/extension-mindmap';

export interface BoardClipboardData {
  type: 'mindmap' | 'elements';
  mindNode?: SpeedMindElement;
  elements?: PlaitElement[];
  text?: string;
}

let memoryClipboard: BoardClipboardData | null = null;

export function setBoardClipboard(data: BoardClipboardData) {
  memoryClipboard = data;
}

export function getBoardClipboard(): BoardClipboardData | null {
  return memoryClipboard;
}

export function hasBoardClipboard(): boolean {
  return memoryClipboard !== null;
}
