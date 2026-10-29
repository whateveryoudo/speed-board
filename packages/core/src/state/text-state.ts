import { Transforms, type PlaitBoard } from '../plait';
import type { NodeTextState } from '../types';
import { isMindmapNode } from './selection-info';
import {
  TextTransforms,
  MarkTypes,
  FontSizes,
  getTextMarksByElement,
  PlaitMarkEditor,
  LinkEditor,
  withMark,
} from '@plait/text-plugins';
import { getTextEditorsByElement, getTextManages } from '@plait/common';
import { Editor, Range, Transforms as SlateTransforms } from 'slate';

export {
  withMark,
  TextTransforms,
  MarkTypes,
  FontSizes,
  getTextMarksByElement,
  PlaitMarkEditor,
  LinkEditor,
};

export interface SlateSpanRenderOptions {
  defaultFontSize?: number;
  defaultColor?: string;
  defaultFontWeight?: string;
  zoom?: number;
  className?: string;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 统一渲染 Slate 富文本 Spans 为 HTML 字符串 (支持字号、加粗、颜色、斜体、删除线等多 Span 混排)
 */
export function renderSlateSpansHtml(
  childrenOrNode: any[] | any,
  options: SlateSpanRenderOptions = {}
): string {
  const children = Array.isArray(childrenOrNode) ? childrenOrNode : childrenOrNode?.children;
  if (!children || !Array.isArray(children) || children.length === 0) return '&ZeroWidthSpace;';
  const zoom = options.zoom || 1;
  const defaultSize = options.defaultFontSize || 14;
  const defaultColor = options.defaultColor || 'inherit';
  const defaultWeight = options.defaultFontWeight || 'normal';
  const className = options.className || 'slate-span';

  const rendered = children
    .map((c: any) => {
      const spanText = c.text ?? '';
      if (!spanText) return '';
      const rawFs = c['font-size'] ? parseFloat(c['font-size']) : (c.fontSize || defaultSize);
      const fs = Math.round(rawFs * zoom);
      const fw = c.bold ? '600' : (c.fontWeight || defaultWeight);
      const fst = c.italic ? 'italic' : 'normal';
      let td = 'none';
      if (c.underlined && c.strike) td = 'underline line-through';
      else if (c.underlined) td = 'underline';
      else if (c.strike) td = 'line-through';
      const clr = c.color || defaultColor;

      const spanStyles: string[] = [
        `font-size: ${fs}px`,
        `font-weight: ${fw}`,
        `vertical-align: baseline`,
        `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Noto Sans', sans-serif`,
      ];
      if (fst !== 'normal') spanStyles.push(`font-style: ${fst}`);
      if (td !== 'none') spanStyles.push(`text-decoration: ${td}`);
      if (clr !== 'inherit') spanStyles.push(`color: ${clr}`);

      return `<span class="${className}" style="${spanStyles.join('; ')}">${escapeHtml(spanText)}</span>`;
    })
    .join('');

  return rendered || '&ZeroWidthSpace;';
}

/**
 * 统一测量 Slate 富文本 Spans 的预估宽度与最大字号
 */
export function measureSlateSpansSize(
  childrenOrNode: any[] | any,
  defaultFontSize = 14
): { width: number; maxFontSize: number } {
  const children = Array.isArray(childrenOrNode) ? childrenOrNode : childrenOrNode?.children;
  if (!Array.isArray(children) || children.length === 0) {
    return { width: 0, maxFontSize: defaultFontSize };
  }
  let estimatedWidth = 0;
  let maxFontSize = defaultFontSize;

  for (const span of children) {
    const text = span.text || '';
    const fs = span['font-size'] ? parseFloat(span['font-size']) : (span.fontSize || defaultFontSize);
    maxFontSize = Math.max(maxFontSize, fs);
    let charUnits = 0;
    for (let i = 0; i < text.length; i++) {
      charUnits += text.charCodeAt(i) > 255 ? 1.8 : 1.0;
    }
    estimatedWidth += Math.ceil(charUnits * (fs * 0.55));
  }

  return { width: estimatedWidth, maxFontSize };
}

export function getElementTextObject(element: any): any {
  if (!element) return { children: [{ text: '' }] };
  if (element.data?.topic) return element.data.topic;
  if (element.topic) return element.topic;
  return element.text || { children: [{ text: '' }] };
}

export function getNodeTextState(selectedElements: any[] = []): NodeTextState {
  const defaultState: NodeTextState = {
    text: '',
    link: '',
    fontSize: 14,
    fill: '#262626',
    bold: false,
    italic: false,
    strike: false,
    underline: false,
    align: 'left',
    verticalAlign: 'middle',
  };

  if (selectedElements.length === 0) return defaultState;

  const selected = selectedElements[0];
  const isMind = isMindmapNode(selected);
  const textObj = getElementTextObject(selected);
  const child = textObj.children?.[0] || textObj;

  let partialState: Partial<NodeTextState> = {};
  try {
    const editors = getTextEditorsByElement(selected);
    const editor = editors?.[0];
    const currentSelection = (editor as any)?.savedSelection || editor?.selection;
    const hasExpandedSelection = currentSelection && !Range.isCollapsed(currentSelection);

    if (editor && hasExpandedSelection) {
      editor.selection = currentSelection;
      const isBold = PlaitMarkEditor.isMarkActive(editor, MarkTypes.bold);
      const isItalic = PlaitMarkEditor.isMarkActive(editor, MarkTypes.italic);
      const isUnderline = PlaitMarkEditor.isMarkActive(editor, MarkTypes.underline);
      const isStrike = PlaitMarkEditor.isMarkActive(editor, MarkTypes.strike);
      const marks = (PlaitMarkEditor.getMarks(editor) as any) || {};

      let selectedText = '';
      try {
        selectedText = Editor.string(editor, currentSelection);
      } catch (e) {
        // ignore
      }

      partialState = {
        text: selectedText,
        bold: Boolean(isBold),
        italic: Boolean(isItalic),
        underline: Boolean(isUnderline),
        strike: Boolean(isStrike),
        ...(marks[MarkTypes.color] ? { fill: marks[MarkTypes.color] } : {}),
        ...(marks[MarkTypes.fontSize] ? { fontSize: Number(marks[MarkTypes.fontSize]) } : {}),
      };
    }
  } catch (e) {
    // ignore
  }

  const baseState: NodeTextState = {
    text: typeof child.text === 'string' ? child.text : (typeof textObj.text === 'string' ? textObj.text : ''),
    link: selected.data?.link || selected.link || child.url || child.link || '',
    fontSize: child['font-size'] || child.fontSize || (isMind ? (selected.isRoot ? 16 : 14) : 14),
    fill: child.color || child.fill || textObj.color || textObj.fill || (isMind && selected.isRoot ? '#ffffff' : '#262626'),
    bold: Boolean(child.bold || textObj.bold || (isMind && selected.isRoot)),
    italic: Boolean(child.italic || textObj.italic),
    strike: Boolean(child.strikethrough || child.strike || textObj.strike),
    underline: Boolean(child.underlined || child.underline || textObj.underline),
    align: textObj.align || child.align || (isMind ? 'center' : 'left'),
    verticalAlign: textObj.verticalAlign || child.verticalAlign || 'middle',
  };

  return {
    ...baseState,
    ...partialState,
  };
}

export function patchNodeText(
  board: PlaitBoard,
  selectedElements: any[],
  patch: Partial<NodeTextState>,
  getElementPath: (el: any) => any[] | null
): void {
  selectedElements.forEach((element) => {
    const path = getElementPath(element);
    if (!path) return;

    let handledByEditor = false;

    try {
      const editors = getTextEditorsByElement(element);
      const editor = editors?.[0];
      const currentSelection = (editor as any)?.savedSelection || editor?.selection;
      const hasExpandedSelection = currentSelection && !Range.isCollapsed(currentSelection);

      if (editor) {
        if (hasExpandedSelection) {
          // 局部富文本格式化：仅应用于选中文本片段
          editor.selection = currentSelection;
          if (patch.bold !== undefined) {
            if (patch.bold) Editor.addMark(editor, MarkTypes.bold, true);
            else Editor.removeMark(editor, MarkTypes.bold);
          }
          if (patch.italic !== undefined) {
            if (patch.italic) Editor.addMark(editor, MarkTypes.italic, true);
            else Editor.removeMark(editor, MarkTypes.italic);
          }
          if (patch.underline !== undefined) {
            if (patch.underline) Editor.addMark(editor, MarkTypes.underline, true);
            else Editor.removeMark(editor, MarkTypes.underline);
          }
          if (patch.strike !== undefined) {
            if (patch.strike) Editor.addMark(editor, MarkTypes.strike, true);
            else Editor.removeMark(editor, MarkTypes.strike);
          }
          if (patch.fill !== undefined) {
            PlaitMarkEditor.setColorMark(editor, patch.fill);
          }
          if (patch.fontSize !== undefined) {
            PlaitMarkEditor.setFontSizeMark(editor, patch.fontSize as any);
          }
          if (patch.text !== undefined) {
            Editor.insertText(editor, patch.text);
          }
          (editor as any).savedSelection = editor.selection;
        } else {
          // 全量格式化：未选中文本（光标折叠或仅选中节点），改变该节点的所有文本
          SlateTransforms.select(editor, [0]);
          if (patch.bold !== undefined) {
            if (patch.bold) Editor.addMark(editor, MarkTypes.bold, true);
            else Editor.removeMark(editor, MarkTypes.bold);
          }
          if (patch.italic !== undefined) {
            if (patch.italic) Editor.addMark(editor, MarkTypes.italic, true);
            else Editor.removeMark(editor, MarkTypes.italic);
          }
          if (patch.underline !== undefined) {
            if (patch.underline) Editor.addMark(editor, MarkTypes.underline, true);
            else Editor.removeMark(editor, MarkTypes.underline);
          }
          if (patch.strike !== undefined) {
            if (patch.strike) Editor.addMark(editor, MarkTypes.strike, true);
            else Editor.removeMark(editor, MarkTypes.strike);
          }
          if (patch.fill !== undefined) {
            PlaitMarkEditor.setColorMark(editor, patch.fill);
          }
          if (patch.fontSize !== undefined) {
            PlaitMarkEditor.setFontSizeMark(editor, patch.fontSize as any);
          }
          (editor as any).savedSelection = null;
        }

        const newChildren = (editor.children?.[0] as any)?.children || [{ text: '' }];

        if (isMindmapNode(element)) {
          const topic = element.data?.topic || { children: [{ text: '' }] };
          const newTopic = {
            ...topic,
            children: newChildren,
          };
          if (patch.align !== undefined) newTopic.align = patch.align;
          const newData = {
            ...(element.data || {}),
            topic: newTopic,
          };
          Transforms.setNode(board, { data: newData } as any, path);
        } else {
          const currentText = element.text || { children: [{ text: '' }] };
          const newText = {
            ...currentText,
            children: newChildren,
          };
          if (patch.align !== undefined) newText.align = patch.align;
          if (patch.verticalAlign !== undefined) newText.verticalAlign = patch.verticalAlign;

          const newProps: any = { text: newText };
          if (patch.verticalAlign !== undefined) newProps.verticalAlign = patch.verticalAlign;
          if (patch.link !== undefined) newProps.link = patch.link;
          Transforms.setNode(board, newProps as any, path);
        }

        const textManages = getTextManages(element);
        textManages.forEach((manage) => {
          manage.textComponentRef?.update?.({ text: editor.children[0] as any });
        });

        handledByEditor = true;
      }
    } catch (e) {
      handledByEditor = false;
    }

    if (handledByEditor) return;

    // Fallback: 无 editor（如服务端 Node.js 环境或组件未挂载前）
    if (isMindmapNode(element)) {
      const topic = element.data?.topic || { children: [{ text: '' }] };
      const children = topic.children || [{ text: '' }];
      const updatedChildren = children.map((child: any, idx: number) => {
        const updated = { ...child };
        if (patch.text !== undefined && idx === 0) updated.text = patch.text;
        if (patch.fontSize !== undefined) {
          updated['font-size'] = patch.fontSize;
          updated.fontSize = patch.fontSize;
        }
        if (patch.fill !== undefined) {
          updated.color = patch.fill;
          updated.fill = patch.fill;
        }
        if (patch.bold !== undefined) updated.bold = patch.bold;
        if (patch.italic !== undefined) updated.italic = patch.italic;
        if (patch.underline !== undefined) updated.underlined = patch.underline;
        if (patch.strike !== undefined) updated.strikethrough = patch.strike;
        return updated;
      });

      const newTopic = {
        ...topic,
        children: updatedChildren,
      };
      if (patch.align !== undefined) newTopic.align = patch.align;
      const newData = {
        ...(element.data || {}),
        topic: newTopic,
      };
      Transforms.setNode(board, { data: newData } as any, path);
      return;
    }

    // 普通白板图形 (Fallback)
    const currentText = element.text || { children: [{ text: '' }] };
    const currentChildren = currentText.children || [{ text: '' }];
    const updatedChildren = currentChildren.map((child: any, idx: number) => {
      const updated = { ...child };
      if (patch.text !== undefined && idx === 0) updated.text = patch.text;
      if (patch.fontSize !== undefined) {
        updated['font-size'] = patch.fontSize;
        updated.fontSize = patch.fontSize;
      }
      if (patch.fill !== undefined) {
        updated.color = patch.fill;
        updated.fill = patch.fill;
      }
      if (patch.bold !== undefined) updated.bold = patch.bold;
      if (patch.italic !== undefined) updated.italic = patch.italic;
      if (patch.underline !== undefined) updated.underlined = patch.underline;
      if (patch.strike !== undefined) updated.strikethrough = patch.strike;
      return updated;
    });

    const newText = {
      ...currentText,
      children: updatedChildren,
    };
    if (patch.align !== undefined) newText.align = patch.align;
    if (patch.verticalAlign !== undefined) newText.verticalAlign = patch.verticalAlign;

    const newProps: any = { text: newText };
    if (patch.verticalAlign !== undefined) newProps.verticalAlign = patch.verticalAlign;
    if (patch.link !== undefined) newProps.link = patch.link;

    Transforms.setNode(board, newProps as any, path);
  });
}
