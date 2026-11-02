import { PlaitBoard, Transforms } from '@plait/core';
import type { TextManage } from '@plait/common';
import { Editor, Transforms as SlateTransforms } from 'slate';
import type { NodeLayoutBox } from '../types';
import { findMindRootAndPath, setNodeTopic } from '../model/treeOps';

export const MIND_NODE_TEXT_MANAGES = new WeakMap<PlaitBoard, Map<string, TextManage>>();

export function getMindNodeTextManage(board: PlaitBoard, nodeId: string): TextManage | null {
  const map =
    MIND_NODE_TEXT_MANAGES.get(board) ||
    MIND_NODE_TEXT_MANAGES.get((board as any).raw) ||
    (board as any).__mindNodeTextManages__ ||
    ((board as any).raw && (board as any).raw.__mindNodeTextManages__);
  return map?.get(nodeId) || null;
}

export interface EditMindNodeTopicOptions {
  /**
   * 直接键入时清空旧文本并写入输入字符；若为 true 则清空旧文本（供中文输入法起步）
   */
  clearAndInput?: string | boolean;
}

/**
 * 启动节点富文本编辑 (基于 Plait 原生 TextManage + Slate.js + contenteditable)
 * 彻底杜绝任何外部覆盖层、双层边框或输入法吞字
 */
export function editMindNodeTopic(
  board: PlaitBoard,
  nodeId: string,
  options?: EditMindNodeTopicOptions
): void {
  const tm = getMindNodeTextManage(board, nodeId);
  if (!tm) return;

  // 清除旧的选区偏移记录
  if (tm.editor) {
    delete (tm.editor as any).savedDomOffsets;
    delete (tm.editor as any).savedSelection;
  }

  const shouldClear = Boolean(options?.clearAndInput);
  const initialChar = typeof options?.clearAndInput === 'string' ? options.clearAndInput : '';

  // 1. 如果用户是直接键入字符触发的编辑，直接清空旧文本数据并初始化为输入字符
  if (shouldClear) {
    const cur = findMindRootAndPath(board, nodeId);
    if (cur) {
      setNodeTopic(cur.root, nodeId, initialChar);
    }
    const isRoot = Boolean(cur && cur.root.id === nodeId);
    const newTopicData = {
      children: [
        {
          text: initialChar,
          color: '#1f2937',
          fontSize: isRoot ? 16 : 14,
          fontWeight: isRoot ? 'bold' : 'normal',
        },
      ],
      align: 'center',
    };
    try {
      tm.updateText(newTopicData as any);
    } catch {}
  }

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

  if (shouldClear && tm.editor) {
    try {
      SlateTransforms.select(tm.editor, {
        anchor: Editor.start(tm.editor, []),
        focus: Editor.end(tm.editor, [])
      });
      if (initialChar) {
        SlateTransforms.insertText(tm.editor, initialChar);
      } else {
        SlateTransforms.delete(tm.editor);
      }
    } catch (e) {
      console.warn('[SpeedMind] failed to clear and input in Slate editor', e);
    }
  }

  if (shouldClear) {
    // 聚焦并将光标定位到末尾（跟随输入的字符，DOM 层面确保只显示新输入字符）
    const performFocusEnd = () => {
      const el = (tm.g?.querySelector?.('[contenteditable="true"]') ||
        document.querySelector(`[data-node-id="${nodeId}"] [contenteditable="true"]`)) as HTMLElement | null;
      if (el) {
        el.focus();
        if (initialChar && el.textContent !== initialChar) {
          el.textContent = initialChar;
        } else if (!initialChar && el.textContent) {
          el.textContent = '';
        }
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    };

    performFocusEnd();
    requestAnimationFrame(performFocusEnd);
    setTimeout(performFocusEnd, 0);
    setTimeout(performFocusEnd, 40);
  } else {
    // 立即并多周期执行全选内部文本（双击或快捷键编辑模式）
    const performSelectAll = () => {
      const el = (tm.g?.querySelector?.('[contenteditable="true"]') ||
        document.querySelector(`[data-node-id="${nodeId}"] [contenteditable="true"]`)) as HTMLElement | null;
      if (el) {
        el.focus();
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    };

    performSelectAll();
    requestAnimationFrame(performSelectAll);
    setTimeout(performSelectAll, 0);
    setTimeout(performSelectAll, 40);
    setTimeout(performSelectAll, 100);
  }
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
