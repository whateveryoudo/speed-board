import type { NodeLayoutBox, SpeedMindElement } from '../types';
import { MARKER_SPRITE_ID, MARKER_SPRITE_SVG } from '@speed-board/shared';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * 确保全局 Markers SVG Sprite 已注入到 DOM 中
 */
export function ensureMarkerSpriteInjected(): void {
  if (typeof document === 'undefined') return;
  if (!document.getElementById(MARKER_SPRITE_ID)) {
    const div = document.createElement('div');
    div.id = MARKER_SPRITE_ID;
    div.innerHTML = MARKER_SPRITE_SVG;
    div.style.position = 'absolute';
    div.style.width = '0';
    div.style.height = '0';
    div.style.overflow = 'hidden';
    div.style.pointerEvents = 'none';
    document.body.appendChild(div);
  }
}

/**
 * 渲染单个节点的文字 HTML (支持 Slate 富文本跨度)
 */
export function renderNodeTopicHtml(node: SpeedMindElement, isRoot: boolean): string {
  const children = node.data?.topic?.children;
  const defaultColor = '#1f2937';
  const defaultFontSize = isRoot ? 16 : 14;
  const defaultFontWeight = isRoot ? 'bold' : 'normal';

  if (!children || children.length === 0) {
    const defaultText = isRoot ? '思维导图' : '分支主题';
    return `<span style="color: ${defaultColor}; font-size: ${defaultFontSize}px; font-weight: ${defaultFontWeight};">${defaultText}</span>`;
  }

  return children
    .map((span) => {
      const text = span.text || '';
      const color = span.color || defaultColor;
      const fontSize = span.fontSize || span['font-size'] || defaultFontSize;
      const fontWeight = span.bold || span.fontWeight === 'bold' ? 'bold' : defaultFontWeight;
      const fontStyle = span.italic ? 'italic' : 'normal';
      let textDecoration = 'none';
      if (span.underlined && span.strike) {
        textDecoration = 'underline line-through';
      } else if (span.underlined) {
        textDecoration = 'underline';
      } else if (span.strike) {
        textDecoration = 'line-through';
      }

      return `<span style="color: ${color}; font-size: ${fontSize}px; font-weight: ${fontWeight}; font-style: ${fontStyle}; text-decoration: ${textDecoration};">${escapeHtml(
        text
      )}</span>`;
    })
    .join('');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 渲染标记 (Markers) 的 HTML 片段
 */
export function renderNodeMarkersHtml(node: SpeedMindElement): string {
  const markers = node.data?.markers;
  if (!markers || typeof markers !== 'object') return '';

  const symbols: string[] = [];
  if (markers.priority) {
    symbols.push(`marker-priority-${markers.priority}`);
  }
  if (markers.progress !== undefined && markers.progress !== null) {
    symbols.push(`marker-progress-${markers.progress}`);
  }
  if (markers.flag) {
    symbols.push(`marker-flag-${markers.flag}`);
  }

  if (symbols.length === 0) return '';

  return symbols
    .map(
      (sym) =>
        `<svg style="width: 18px; height: 18px; flex-shrink: 0; margin-right: 3px; vertical-align: middle;" viewBox="0 0 22 22"><use href="#${sym}"></use></svg>`
    )
    .join('');
}

/**
 * 绘制单个脑图节点卡片 (Card 矩形 / 下划线 / 胶囊 + ForeignObject 文本与图标)
 * 纯粹单层边框，杜绝双层框！
 */
export function renderNodeCardSvg(
  nodeG: SVGGElement,
  box: NodeLayoutBox,
  isSelected: boolean
): void {
  ensureMarkerSpriteInjected();

  const element = box.element;
  const isRoot = Boolean(element.isRoot || box.depth === 0);
  const shape = element.shape || 'roundRectangle';
  const isUnderline = shape === 'underline' || (shape as string) === 'none';
  const isCapsule = shape === 'capsule';
  const branchColor = element.branchColor || '#8b5cf6';

  nodeG.innerHTML = '';
  nodeG.setAttribute('class', `speed-mind-node-g ${isRoot ? 'is-root' : 'is-child'} ${isSelected ? 'is-selected' : ''}`);
  nodeG.setAttribute('data-node-id', box.id);
  nodeG.style.cursor = 'pointer';

  // 1. 节点主体形状 (Body Rect / Underline) —— 单层边框
  if (isUnderline) {
    // 下划线样式：透明背景 + 底部粗色条
    const underlineRect = document.createElementNS(SVG_NS, 'rect');
    underlineRect.setAttribute('x', String(box.x));
    underlineRect.setAttribute('y', String(box.y + box.height - 3));
    underlineRect.setAttribute('width', String(box.width));
    underlineRect.setAttribute('height', '3');
    underlineRect.setAttribute('rx', '1.5');
    underlineRect.setAttribute('ry', '1.5');
    underlineRect.setAttribute('fill', isSelected ? '#3b82f6' : branchColor);
    underlineRect.setAttribute('class', 'speed-mind-node-underline');
    nodeG.appendChild(underlineRect);
  } else {
    // 矩形卡片或胶囊卡片
    const bodyRect = document.createElementNS(SVG_NS, 'rect');
    bodyRect.setAttribute('x', String(box.x));
    bodyRect.setAttribute('y', String(box.y));
    bodyRect.setAttribute('width', String(box.width));
    bodyRect.setAttribute('height', String(box.height));

    const rx = isCapsule ? box.height / 2 : (isRoot ? 8 : 6);
    bodyRect.setAttribute('rx', String(rx));
    bodyRect.setAttribute('ry', String(rx));

    if (isRoot) {
      bodyRect.setAttribute('fill', element.fill || '#f3f4f6');
      bodyRect.setAttribute(
        'stroke',
        isSelected ? '#3b82f6' : (element.strokeColor || '#e5e7eb')
      );
      bodyRect.setAttribute('stroke-width', isSelected ? '2' : String(element.strokeWidth || 1.5));
    } else {
      bodyRect.setAttribute('fill', element.fill || '#ffffff');
      bodyRect.setAttribute(
        'stroke',
        isSelected ? '#3b82f6' : (element.strokeColor || branchColor)
      );
      bodyRect.setAttribute('stroke-width', isSelected ? '2' : String(element.strokeWidth || 1.5));
    }

    if (isSelected) {
      bodyRect.style.filter = 'drop-shadow(0 2px 6px rgba(59, 130, 246, 0.25))';
    }

    bodyRect.setAttribute('class', 'speed-mind-node-body');
    nodeG.appendChild(bodyRect);
  }

  // 2. ForeignObject 渲染文字与标记
  const fo = document.createElementNS(SVG_NS, 'foreignObject');
  fo.setAttribute('x', String(box.x));
  fo.setAttribute('y', String(box.y));
  fo.setAttribute('width', String(box.width));
  fo.setAttribute('height', String(box.height));
  fo.style.overflow = 'visible';
  fo.style.pointerEvents = 'none';

  const markersHtml = renderNodeMarkersHtml(element);
  const topicHtml = renderNodeTopicHtml(element, isRoot);
  const paddingX = isRoot ? '14px' : '10px';

  fo.innerHTML = `
    <div xmlns="http://www.w3.org/1999/xhtml" class="mindmap-node-content" style="
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 ${paddingX};
      box-sizing: border-box;
      user-select: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
    ">
      ${markersHtml ? `<div style="display: flex; align-items: center; flex-shrink: 0;">${markersHtml}</div>` : ''}
      <div class="mindmap-node-text-wrap" style="
        display: flex;
        align-items: center;
        justify-content: center;
        white-space: pre;
        line-height: 1.4;
        text-align: center;
        overflow: hidden;
      ">${topicHtml}</div>
    </div>
  `;

  nodeG.appendChild(fo);
}
