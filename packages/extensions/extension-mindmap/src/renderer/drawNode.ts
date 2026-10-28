import type { NodeLayoutBox, SpeedMindElement } from '../types';
import { getNodeTopicText } from '../model/treeOps';
import { renderSlateSpansHtml } from '@speed-board/core';

export function renderMarkerHtml(symbolId: string, size = 16): string {
  const cleanId = symbolId.startsWith('#') ? symbolId.slice(1) : symbolId;
  return `<svg width="${size}" height="${size}" viewBox="0 0 22 22" style="display:inline-block;vertical-align:middle;flex-shrink:0;margin-right:3px;user-select:none;pointer-events:none;"><use xlink:href="#${cleanId}" href="#${cleanId}"></use></svg>`;
}

export function renderNodeSvg(
  box: NodeLayoutBox,
  rootElement: SpeedMindElement,
  isSelected: boolean
): SVGGElement {
  const elem = box.element;
  const isRoot = Boolean(elem.isRoot || box.id === rootElement.id);
  const shape = elem.shape || (isRoot ? 'roundRectangle' : 'underline');

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', `speed-mindmap-node ${isRoot ? 'is-root' : 'is-child'} shape-${shape}`);
  g.setAttribute('data-node-id', box.id);
  g.style.cursor = 'pointer';

  // 1. 绘制背景或边框
  if (shape === 'roundRectangle' || shape === 'rect') {
    const rx = shape === 'roundRectangle' ? 6 : 0;
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', `${box.x}`);
    rect.setAttribute('y', `${box.y}`);
    rect.setAttribute('width', `${box.width}`);
    rect.setAttribute('height', `${box.height}`);
    rect.setAttribute('rx', `${rx}`);
    rect.setAttribute('ry', `${rx}`);

    const fill = elem.fill || (isRoot ? '#2563eb' : 'transparent');
    const stroke = elem.strokeColor || (isRoot ? '#2563eb' : '#374151');
    const strokeWidth = elem.strokeWidth ?? (isRoot ? 2 : 1.5);

    rect.setAttribute('fill', fill);
    rect.setAttribute('stroke', stroke);
    rect.setAttribute('stroke-width', `${strokeWidth}`);

    if (elem.strokeStyle === 'dashed') {
      rect.setAttribute('stroke-dasharray', '5 3');
    } else if (elem.strokeStyle === 'dotted') {
      rect.setAttribute('stroke-dasharray', '2 2');
    }

    g.appendChild(rect);
  } else if (shape === 'underline') {
    // 下划线
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', `${box.x}`);
    line.setAttribute('y1', `${box.y + box.height}`);
    line.setAttribute('x2', `${box.x + box.width}`);
    line.setAttribute('y2', `${box.y + box.height}`);

    const stroke = elem.strokeColor || elem.branchColor || '#2563eb';
    const strokeWidth = elem.strokeWidth ?? 2;
    line.setAttribute('stroke', stroke);
    line.setAttribute('stroke-width', `${strokeWidth}`);
    line.setAttribute('stroke-linecap', 'round');

    g.appendChild(line);
  }

  // 2. 选中高亮框
  if (isSelected) {
    const outline = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const padding = 3;
    outline.setAttribute('x', `${box.x - padding}`);
    outline.setAttribute('y', `${box.y - padding}`);
    outline.setAttribute('width', `${box.width + padding * 2}`);
    outline.setAttribute('height', `${box.height + padding * 2}`);
    outline.setAttribute('rx', '8');
    outline.setAttribute('ry', '8');
    outline.setAttribute('fill', 'none');
    outline.setAttribute('stroke', '#3b82f6');
    outline.setAttribute('stroke-width', '1.8');
    outline.setAttribute('stroke-dasharray', '4 3');
    outline.style.pointerEvents = 'none';
    g.appendChild(outline);
  }

  // 3. 节点内容：标记与文字（100% 垂直水平居中）
  const foreign = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
  foreign.setAttribute('x', `${box.x}`);
  foreign.setAttribute('y', `${box.y}`);
  foreign.setAttribute('width', `${box.width}`);
  foreign.setAttribute('height', `${box.height}`);
  foreign.style.overflow = 'visible';
  foreign.style.pointerEvents = 'none';

  const align = elem.data?.topic?.align || (isRoot ? 'center' : 'left');

  const topicChildren = elem.data?.topic?.children || [
    { text: getNodeTopicText(elem) || (isRoot ? '思维导图' : '分支主题') },
  ];

  const spansHtml = renderSlateSpansHtml(topicChildren, {
    defaultFontSize: isRoot ? 16 : 14,
    defaultColor: isRoot ? '#ffffff' : '#1f2937',
    defaultFontWeight: isRoot ? '600' : 'normal',
    className: 'speed-mind-span',
  });

  // 构建 markers HTML
  let markersHtml = '';
  const markers = elem.data?.markers;
  if (markers) {
    if (typeof markers.priority === 'number') {
      markersHtml += renderMarkerHtml(`mind-priority-${markers.priority}`);
    }
    if (typeof markers.progress === 'number') {
      markersHtml += renderMarkerHtml(`mind-progress-${markers.progress}`);
    }
    if (markers.flag) {
      markersHtml += renderMarkerHtml(`mind-flag-${markers.flag}`);
    }
  }
  const emojis = elem.data?.emojis;
  if (Array.isArray(emojis)) {
    for (const em of emojis) {
      const sym = em.symbolId || em.id || em.name;
      if (sym) {
        markersHtml += renderMarkerHtml(sym);
      }
    }
  }

  const justify =
    align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';

  const containerDiv = document.createElement('div');
  containerDiv.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: ${justify};
    width: 100%;
    height: 100%;
    padding: 0 10px;
    box-sizing: border-box;
    user-select: none;
    pointer-events: none;
    line-height: 1.2;
    overflow: hidden;
  `;

  containerDiv.innerHTML = `
    ${markersHtml}
    <div class="speed-mind-topic-wrapper" style="
      display: inline-flex;
      align-items: baseline;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    ">
      ${spansHtml}
    </div>
  `;

  foreign.appendChild(containerDiv);
  g.appendChild(foreign);

  return g;
}
