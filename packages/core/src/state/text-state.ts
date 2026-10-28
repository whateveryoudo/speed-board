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
} from '@plait/text-plugins';

export {
  TextTransforms,
  MarkTypes,
  FontSizes,
  getTextMarksByElement,
  PlaitMarkEditor,
  LinkEditor,
};

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

  return {
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

    if (isMindmapNode(element)) {
      const topic = element.data?.topic || { children: [{ text: '' }] };
      const children = topic.children || [{ text: '' }];
      const first = children[0] || { text: '' };
      const updated = { ...first };

      if (patch.text !== undefined) updated.text = patch.text;
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

      const newTopic = {
        ...topic,
        children: [updated, ...children.slice(1)],
      };
      if (patch.align !== undefined) newTopic.align = patch.align;
      const newData = {
        ...(element.data || {}),
        topic: newTopic,
      };
      Transforms.setNode(board, { data: newData } as any, path);
      return;
    }

    // 普通白板图形
    const currentText = element.text || { children: [{ text: '' }] };
    const currentChildren = currentText.children || [{ text: '' }];
    const firstChild = currentChildren[0] || { text: '' };

    const updatedChild = { ...firstChild };
    if (patch.text !== undefined) updatedChild.text = patch.text;
    if (patch.fontSize !== undefined) {
      updatedChild['font-size'] = patch.fontSize;
      updatedChild.fontSize = patch.fontSize;
    }
    if (patch.fill !== undefined) {
      updatedChild.color = patch.fill;
      updatedChild.fill = patch.fill;
    }
    if (patch.bold !== undefined) updatedChild.bold = patch.bold;
    if (patch.italic !== undefined) updatedChild.italic = patch.italic;
    if (patch.underline !== undefined) updatedChild.underlined = patch.underline;
    if (patch.strike !== undefined) updatedChild.strikethrough = patch.strike;

    const newText = {
      ...currentText,
      children: [updatedChild, ...currentChildren.slice(1)],
    };
    if (patch.align !== undefined) newText.align = patch.align;
    if (patch.verticalAlign !== undefined) newText.verticalAlign = patch.verticalAlign;

    const newProps: any = { text: newText };
    if (patch.verticalAlign !== undefined) newProps.verticalAlign = patch.verticalAlign;
    if (patch.link !== undefined) newProps.link = patch.link;

    Transforms.setNode(board, newProps as any, path);
  });
}
