import { PlaitBoard, Transforms } from '@plait/core';
import type { TextManage } from '@plait/common';
import type { NodeLayoutBox } from '../types';
import { findMindRootAndPath } from '../model/treeOps';

export const MIND_NODE_TEXT_MANAGES = new WeakMap<PlaitBoard, Map<string, TextManage>>();

export function getMindNodeTextManage(board: PlaitBoard, nodeId: string): TextManage | null {
  return MIND_NODE_TEXT_MANAGES.get(board)?.get(nodeId) || null;
}

/**
 * 启动节点富文本编辑 (基于 Plait 原生 TextManage + Slate.js + contenteditable)
 * 彻底杜绝任何外部覆盖层、双层边框或输入法吞字
 */
export function editMindNodeTopic(board: PlaitBoard, nodeId: string): void {
  const tm = getMindNodeTextManage(board, nodeId);
  if (!tm) return;

  tm.edit(
    () => {
      // 退出编辑后的回调：触发变更并广播更新
      const cur = findMindRootAndPath(board, nodeId);
      if (cur) {
        Transforms.setNode(board, { data: cur.root.data, children: cur.root.children }, cur.path);
        ((board as any).boardWrapper || board)?.emit?.('change', {});
      }
    },
    (event: Event) => {
      // Enter 键提交保存退出编辑（Shift + Enter 换行）
      const kb = event as KeyboardEvent;
      return kb.key === 'Enter' && !kb.shiftKey;
    }
  );
}

export interface InlineEditorOptions {
  board: PlaitBoard;
  box: NodeLayoutBox;
  initialText?: string;
  firstChar?: string;
  onCommit?: (newText: string) => void;
  onCancel?: () => void;
}

/**
 * 兼容旧接口：启动节点编辑
 */
export function startInlineEditing(options: InlineEditorOptions): void {
  editMindNodeTopic(options.board, options.box.id);
}

/**
 * 关闭当前脑图节点的编辑态
 */
export function closeInlineEditing(board?: PlaitBoard): void {
  if (board) {
    const manages = MIND_NODE_TEXT_MANAGES.get(board);
    if (manages) {
      for (const tm of manages.values()) {
        if (tm.isEditing) {
          (tm as any).exitCallback?.();
        }
      }
    }
  }
  if (document.activeElement && (document.activeElement as HTMLElement).isContentEditable) {
    (document.activeElement as HTMLElement).blur();
  }
}

export function isInlineEditingActive(board?: PlaitBoard): boolean {
  if (board) {
    return PlaitBoard.hasBeenTextEditing(board);
  }
  return false;
}

export function getActiveEditingNodeId(): string | null {
  return null;
}
