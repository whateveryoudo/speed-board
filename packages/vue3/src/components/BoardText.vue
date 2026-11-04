<template>
  <div class="plait-text-wrapper" :style="wrapperStyle">
    <!-- 1. 查看态 (readonly: true) -> 纯静态轻量 VNode 渲染，0 实例开销 -->
    <div
      v-if="isReadonly"
      class="plait-text-container slate-editable-container"
      :style="textStyle"
    >
      <template v-for="(span, idx) in spans" :key="idx">
        <a
          v-if="span.link || span.url"
          :href="isReadonly ? (span.link || span.url) : undefined"
          :target="isReadonly ? '_blank' : undefined"
          rel="noopener noreferrer"
          class="slate-span slate-link"
          :style="getSpanStyle(span, true)"
          @click="handleLinkClick($event, span.link || span.url)"
        >{{ span.text }}</a>
        <span
          v-else
          class="slate-span"
          :style="getSpanStyle(span, false)"
        >{{ span.text }}</span>
      </template>
    </div>

    <!-- 2. 编辑态 (readonly: false) -> contenteditable 激活，带精准选区与输入处理 -->
    <div
      v-else
      ref="editableRef"
      class="plait-text-container slate-editable-container"
      contenteditable="true"
      :style="editableTextStyle"
      spellcheck="false"
      autocorrect="off"
      autocapitalize="off"
      @input="handleInput"
      @compositionstart="handleCompositionStart"
      @compositionend="handleCompositionEnd"
      @keydown="handleKeyDown"
      @mouseup="handleMouseUp"
      @keyup="handleKeyUp"
      @focus="handleFocus"
      @blur="handleBlur"
    >
      <template v-for="(span, idx) in spans" :key="idx">
        <a
          v-if="span.link || span.url"
          :href="isReadonly ? (span.link || span.url) : undefined"
          :target="isReadonly ? '_blank' : undefined"
          rel="noopener noreferrer"
          class="slate-span slate-link"
          :style="getSpanStyle(span, true)"
          @click="handleLinkClick($event, span.link || span.url)"
        >{{ span.text }}</a>
        <span
          v-else
          class="slate-span"
          :style="getSpanStyle(span, false)"
        >{{ span.text }}</span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
  type CSSProperties,
} from 'vue';
import { createEditor, Editor } from 'slate';
import { withMark, PlaitMarkEditor, MarkTypes } from '@plait/text-plugins';
import {
  getDomCharOffsets,
  setDomCharSelection,
  offsetToSlatePoint,
  slatePointToOffset,
} from '@speed-board/core';

export interface BoardTextProps {
  text: any;
  readonly?: boolean;
  board?: any;
  textPlugins?: any[];
  isMind?: boolean;
  isRoot?: boolean;
  verticalAlign?: string;
  onChange?: (data: { newText: any; operations: any[] }) => void;
  onComposition?: (event: CompositionEvent) => void;
  afterInit?: (editor: any) => void;
}

const props = withDefaults(defineProps<BoardTextProps>(), {
  readonly: true,
});

const editableRef = ref<HTMLElement | null>(null);
const isReadonly = computed(() => props.readonly !== false);

// 1. 初始化轻量无头 Slate Editor
let editor = withMark(createEditor());
if (props.textPlugins) {
  props.textPlugins.forEach((p: any) => {
    editor = p(editor);
  });
}
editor.children = [props.text || { children: [{ text: '' }] }];
props.afterInit?.(editor);

// 2. 响应式解析 Spans
const spans = computed<any[]>(() => {
  const children = props.text?.children;
  if (Array.isArray(children) && children.length > 0) {
    return children;
  }
  return [{ text: '' }];
});

// 3. 基础样式与对齐
const baseFontSize = computed<number>(() => {
  const firstChild = spans.value[0] || {};
  const rawFs = firstChild['font-size']
    ? parseFloat(firstChild['font-size'])
    : firstChild.fontSize
    ? parseFloat(firstChild.fontSize)
    : 14;
  return Number.isNaN(rawFs) ? 14 : rawFs;
});

const lineHeight = computed<number>(() => Math.round(baseFontSize.value * 1.25));

const defaultColor = computed<string>(() => {
  return spans.value[0]?.color || '#333333';
});

const defaultWeight = computed<string>(() => {
  const isMindRoot = Boolean(props.isMind && props.isRoot);
  return props.text?.fontWeight || (isMindRoot ? '600' : 'normal');
});

const textAlign = computed<string>(() => {
  return props.text?.align || (props.isMind ? 'center' : 'left');
});

const wrapperStyle = computed<CSSProperties>(() => {
  const vAlign =
    props.text?.verticalAlign ||
    (props as any).verticalAlign ||
    'middle';
  const flexJustifyY =
    vAlign === 'middle' || vAlign === 'center'
      ? 'center'
      : vAlign === 'bottom'
      ? 'flex-end'
      : 'flex-start';

  return {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: flexJustifyY,
    boxSizing: 'border-box',
    fontSize: `${baseFontSize.value}px`,
    lineHeight: `${lineHeight.value}px`,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Noto Sans', sans-serif",
    userSelect: isReadonly.value ? 'none' : 'auto',
  };
});

const textStyle = computed<CSSProperties>(() => {
  return {
    display: 'block',
    width: '100%',
    textAlign: textAlign.value as any,
    color: defaultColor.value,
    fontSize: `${baseFontSize.value}px`,
    lineHeight: `${lineHeight.value}px`,
    fontFamily: 'inherit',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    overflowWrap: 'break-word',
    outline: 'none',
    boxSizing: 'border-box',
  };
});

const editableTextStyle = computed<CSSProperties>(() => {
  return {
    ...textStyle.value,
    minWidth: '20px',
    minHeight: `${lineHeight.value}px`,
    caretColor: 'auto',
  };
});

// 计算每一个 span 的具体样式 (Bold, Italic, Strike, Underline, FontSize, Color, Link)
function getSpanStyle(span: any, isLink = false): CSSProperties {
  const isUrl = isLink || Boolean(span.link || span.url);
  const rawFs = span['font-size']
    ? parseFloat(span['font-size'])
    : span.fontSize
    ? parseFloat(span.fontSize)
    : baseFontSize.value;
  const fs = Math.round(Number.isNaN(rawFs) ? baseFontSize.value : rawFs);
  const fw = span.bold ? '600' : span.bold === false ? 'normal' : (span.fontWeight || defaultWeight.value);
  const fst = span.italic ? 'italic' : 'normal';

  const isUnderline = Boolean(span.underlined || span.underline || isUrl);
  const isStrike = Boolean(span.strike || span.strikethrough);
  let td = 'none';
  if (isUnderline && isStrike) td = 'underline line-through';
  else if (isUnderline) td = 'underline';
  else if (isStrike) td = 'line-through';

  const clr = span.color || (isUrl ? '#1677ff' : defaultColor.value);

  return {
    fontSize: `${fs}px`,
    fontWeight: fw,
    fontStyle: fst,
    textDecoration: td,
    color: clr,
    cursor: isUrl ? 'pointer' : 'inherit',
    verticalAlign: 'baseline',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Noto Sans', sans-serif",
  };
}

function handleLinkClick(e: MouseEvent, _url?: string) {
  if (!isReadonly.value) {
    // 编辑态下阻止默认页面跳转，让用户可以正常将光标定位到链接文字内部进行编辑
    e.preventDefault();
    e.stopPropagation();
  } else {
    // 查看态下正常允许打开链接
    e.stopPropagation();
  }
}

// 4. 编辑态选区与事件处理
let typingTimer: any = null;
let isTrailingDoubleClickMouseUp = false;
let hasClearedDefault = false;

function syncSelection() {
  if (!editableRef.value || isReadonly.value) return;
  const offsets = getDomCharOffsets(editableRef.value);
  if (offsets) {
    const p1 = offsetToSlatePoint(editor, offsets.start);
    const p2 = offsetToSlatePoint(editor, offsets.end);
    const slateRange = {
      anchor: offsets.isBackward ? p2 : p1,
      focus: offsets.isBackward ? p1 : p2,
    };
    editor.selection = slateRange;
    (editor as any).savedSelection = slateRange;
    (editor as any).savedDomOffsets = offsets;

    const wrapper = props.board?.boardWrapper;
    wrapper?.emit?.('selection:change');
  }
}

function selectAll() {
  if (!editableRef.value) return;
  editableRef.value.focus();
  const range = document.createRange();
  range.selectNodeContents(editableRef.value);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);

  const textLen = (editableRef.value.textContent || '').length;
  const lastIndex = Math.max(0, spans.value.length - 1);
  const lastLen = (spans.value[lastIndex]?.text || '').length;
  const fullRange = {
    anchor: { path: [0, 0], offset: 0 },
    focus: { path: [0, lastIndex], offset: lastLen },
  };
  editor.selection = fullRange;
  (editor as any).savedSelection = fullRange;
  (editor as any).savedDomOffsets = {
    start: 0,
    end: textLen,
    isBackward: false,
  };
  const wrapper = props.board?.boardWrapper;
  wrapper?.emit?.('selection:change');
}

function parseEditableToSpans(): any[] {
  if (!editableRef.value) return [{ text: '' }];
  const parsedSpans: any[] = [];

  function walk(node: Node, currentMark: Record<string, any>) {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent || '';
      if (t.length > 0) {
        parsedSpans.push({ ...currentMark, text: t });
      }
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.tagName === 'BR') {
        parsedSpans.push({ ...currentMark, text: '\n' });
        return;
      }
      const newMark = { ...currentMark };
      if (el.style.fontWeight === '600' || el.style.fontWeight === 'bold' || el.tagName === 'B' || el.tagName === 'STRONG') {
        newMark.bold = true;
      }
      if (el.style.fontStyle === 'italic' || el.tagName === 'I' || el.tagName === 'EM') {
        newMark.italic = true;
      }
      if (el.style.textDecoration?.includes('underline') || el.tagName === 'U') {
        newMark.underlined = true;
        newMark.underline = true;
      }
      if (el.style.textDecoration?.includes('line-through') || el.tagName === 'S' || el.tagName === 'STRIKE') {
        newMark.strike = true;
        newMark.strikethrough = true;
      }
      if (el.style.color && el.style.color !== 'inherit') {
        newMark.color = el.style.color;
      }
      if (el.style.fontSize) {
        newMark['font-size'] = parseFloat(el.style.fontSize);
        newMark.fontSize = parseFloat(el.style.fontSize);
      }
      if (el.tagName === 'A') {
        newMark.link = el.getAttribute('href') || '';
      }
      for (let i = 0; i < el.childNodes.length; i++) {
        walk(el.childNodes[i], newMark);
      }
    }
  }

  for (let i = 0; i < editableRef.value.childNodes.length; i++) {
    walk(editableRef.value.childNodes[i], {
      color: defaultColor.value,
      'font-size': baseFontSize.value,
    });
  }

  if (parsedSpans.length === 0) {
    parsedSpans.push({ text: '', color: defaultColor.value, 'font-size': baseFontSize.value });
  }

  // 合并相同样式的连续 span
  const merged: any[] = [];
  for (const s of parsedSpans) {
    if (merged.length === 0) {
      merged.push({ ...s });
      continue;
    }
    const prev = merged[merged.length - 1];
    const isSame =
      Boolean(prev.bold) === Boolean(s.bold) &&
      Boolean(prev.italic) === Boolean(s.italic) &&
      Boolean(prev.underlined || prev.underline) === Boolean(s.underlined || s.underline) &&
      Boolean(prev.strike || prev.strikethrough) === Boolean(s.strike || s.strikethrough) &&
      (prev.color || '') === (s.color || '') &&
      (prev.link || '') === (s.link || '') &&
      (prev['font-size'] || '') === (s['font-size'] || '');
    if (isSame) {
      prev.text = (prev.text || '') + (s.text || '');
    } else {
      merged.push({ ...s });
    }
  }
  return merged;
}

function notifyTyping() {
  const wrapper = props.board?.boardWrapper;
  if (wrapper) {
    wrapper.isTyping = true;
    wrapper.emit?.('selection:change');
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      wrapper.isTyping = false;
      wrapper.emit?.('selection:change');
    }, 600);
  }
}

function handleInput() {
  notifyTyping();
  const mergedSpans = parseEditableToSpans();
  const newText = {
    ...props.text,
    children: mergedSpans,
  };
  editor.children = [newText];
  syncSelection();

  props.onChange?.({
    newText,
    operations: [
      {
        type: 'insert_text',
        path: [0, 0],
        offset: 0,
        text: mergedSpans.map((s: any) => s.text || '').join(''),
      } as any,
    ],
  });
}

function handleCompositionStart(e: CompositionEvent) {
  props.onComposition?.(e);
  notifyTyping();
}

function handleCompositionEnd(e: CompositionEvent) {
  props.onComposition?.(e);
  handleInput();
}

function handleMouseUp() {
  if (isTrailingDoubleClickMouseUp) {
    isTrailingDoubleClickMouseUp = false;
    selectAll();
    return;
  }
  syncSelection();
}

function handleKeyUp() {
  syncSelection();
}

function handleFocus() {
  const wrapper = props.board?.boardWrapper;
  if (wrapper) {
    wrapper.isTyping = false;
    wrapper.emit?.('selection:change');
  }
}

function handleBlur(e: FocusEvent) {
  clearTimeout(typingTimer);
  const isToolbarImmediate =
    Boolean(document.querySelector('.plait-board-attached:hover')) ||
    Boolean(document.querySelector('.quick-bubble-popover:hover')) ||
    Boolean(document.querySelector('.ant-popover:hover')) ||
    Boolean((e.relatedTarget as HTMLElement)?.closest?.('.plait-board-attached, .quick-bubble-popover, .ant-popover')) ||
    Boolean((document.activeElement as HTMLElement)?.closest?.('.plait-board-attached, .quick-bubble-popover, .ant-popover'));

  if (isToolbarImmediate) {
    // 焦点转移到浮动工具栏或 Popover，绝不退出编辑状态
    return;
  }

  // 延迟判定，确保工具栏按钮与拾色器 click 事件优先响应并保留局部选区
  setTimeout(() => {
    const isStillInToolbar =
      Boolean(document.querySelector('.plait-board-attached:hover')) ||
      Boolean(document.querySelector('.quick-bubble-popover:hover')) ||
      Boolean(document.querySelector('.ant-popover:hover')) ||
      Boolean((document.activeElement as HTMLElement)?.closest?.('.plait-board-attached, .quick-bubble-popover, .ant-popover'));
    if (isStillInToolbar) return;

    const wrapper = props.board?.boardWrapper;
    if (wrapper) {
      wrapper.isTyping = false;
      wrapper.emit?.('text:editing', false);
      wrapper.emit?.('selection:change');
    }
  }, 150);
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    editableRef.value?.blur();
    e.stopPropagation();
    return;
  }

  const isCtrlOrMeta = e.metaKey || e.ctrlKey;
  if (isCtrlOrMeta) {
    const k = e.key.toLowerCase();
    const wrapper = props.board?.boardWrapper;
    if (k === 'b') {
      e.preventDefault();
      e.stopPropagation();
      syncSelection();
      const isBold = PlaitMarkEditor.isMarkActive(editor, MarkTypes.bold);
      wrapper?.patchNodeText?.({ bold: !isBold });
      return;
    }
    if (k === 'i') {
      e.preventDefault();
      e.stopPropagation();
      syncSelection();
      const isItalic = PlaitMarkEditor.isMarkActive(editor, MarkTypes.italic);
      wrapper?.patchNodeText?.({ italic: !isItalic });
      return;
    }
    if (k === 'u') {
      e.preventDefault();
      e.stopPropagation();
      syncSelection();
      const isUnderline = PlaitMarkEditor.isMarkActive(editor, MarkTypes.underline);
      wrapper?.patchNodeText?.({ underline: !isUnderline });
      return;
    }
  }

  // 默认占位符 "文本" 的自动清空：初次按键自动清空
  if (!hasClearedDefault && editableRef.value) {
    const currentStr = editableRef.value.textContent?.trim();
    if (currentStr === '文本') {
      if (
        (e.ctrlKey || e.metaKey || e.altKey || e.key.length > 1) &&
        e.key !== 'Backspace' &&
        e.key !== 'Delete'
      ) {
        return;
      }
      hasClearedDefault = true;
      editableRef.value.textContent = '';
      const range = document.createRange();
      range.selectNodeContents(editableRef.value);
      range.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }
}

// 5. 状态切换与生命周期
const onDocSelectionChange = () => {
  if (isReadonly.value || !editableRef.value) return;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (editableRef.value.contains(range.startContainer) && editableRef.value.contains(range.endContainer)) {
    syncSelection();
  }
};

watch(
  () => props.readonly,
  (newVal, oldVal) => {
    (editor as any).isEditing = newVal === false;
    if (newVal === false) {
      // 进入编辑状态
      nextTick(() => {
        if (!editableRef.value) return;
        editableRef.value.focus();

        const pendingChar = (props.board as any)?._pendingInputChar;
        if (pendingChar) {
          delete (props.board as any)._pendingInputChar;
          hasClearedDefault = true;
          isTrailingDoubleClickMouseUp = false;

          const baseSpan = {
            ...(spans.value[0] || {}),
            text: pendingChar,
          };
          const newText = {
            ...props.text,
            children: [baseSpan],
          };
          editor.children = [newText];
          editableRef.value.textContent = pendingChar;

          const endPoint = { path: [0, 0], offset: pendingChar.length };
          const slateRange = { anchor: endPoint, focus: endPoint };
          editor.selection = slateRange;
          (editor as any).savedSelection = slateRange;
          (editor as any).savedDomOffsets = {
            start: pendingChar.length,
            end: pendingChar.length,
            isBackward: false,
          };

          const range = document.createRange();
          range.selectNodeContents(editableRef.value);
          range.collapse(false);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);

          props.onChange?.({
            newText,
            operations: [
              {
                type: 'insert_text',
                path: [0, 0],
                offset: 0,
                text: pendingChar,
              } as any,
            ],
          });
        } else if ((editor as any).savedDomOffsets) {
          isTrailingDoubleClickMouseUp = false;
          const { start, end, isBackward } = (editor as any).savedDomOffsets;
          setDomCharSelection(editableRef.value, start, end, isBackward);
        } else {
          isTrailingDoubleClickMouseUp = true;
          setTimeout(() => {
            isTrailingDoubleClickMouseUp = false;
          }, 300);
          selectAll();
          requestAnimationFrame(selectAll);
        }
      });
      document.addEventListener('selectionchange', onDocSelectionChange);
    } else {
      // 退出编辑状态
      document.removeEventListener('selectionchange', onDocSelectionChange);
      delete (editor as any).savedDomOffsets;
      delete (editor as any).savedSelection;
      editor.selection = null;
    }
  },
  { immediate: true }
);

// 外部属性/样式变更时，更新 Slate editor 数据并恢复选区
watch(
  () => props.text,
  (newText) => {
    if (newText) {
      editor.children = [newText];
      if (!isReadonly.value && editableRef.value) {
        nextTick(() => {
          if (!editableRef.value) return;
          if ((editor as any).savedDomOffsets) {
            const { start, end, isBackward } = (editor as any).savedDomOffsets;
            setDomCharSelection(editableRef.value, start, end, isBackward);
          }
        });
      }
    }
  },
  { deep: true }
);

onMounted(() => {
  if (!isReadonly.value) {
    document.addEventListener('selectionchange', onDocSelectionChange);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', onDocSelectionChange);
  clearTimeout(typingTimer);
  if (!isReadonly.value) {
    const wrapper = props.board?.boardWrapper;
    wrapper?.emit?.('text:editing', false);
    wrapper?.emit?.('selection:change');
  }
});

defineExpose({
  editor,
  editableRef,
  syncSelection,
  selectAll,
});
</script>
