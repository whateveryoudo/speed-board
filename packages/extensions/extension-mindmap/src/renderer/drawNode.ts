import type { NodeLayoutBox, SpeedMindElement } from '../types';
import type { RectangleClient } from '@plait/core';
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
 * 获取用于 TextManage 渲染的 Slate 文本数据对象
 */
export function getNodeTopicData(node: SpeedMindElement, isRoot: boolean): any {
  if (
    node.data?.topic &&
    Array.isArray(node.data.topic.children) &&
    node.data.topic.children.length > 0
  ) {
    return {
      align: 'center',
      ...node.data.topic,
    };
  }
  const defaultText = isRoot ? '思维导图' : '分支主题';
  return {
    children: [
      {
        text: defaultText,
        color: '#1f2937',
        fontSize: isRoot ? 16 : 14,
        fontWeight: isRoot ? 'bold' : 'normal',
      },
    ],
    align: 'center',
  };
}

/**
 * 计算节点卡片内 Topic 文本的精确包围盒
 */
export function getTopicRectangleByBox(box: NodeLayoutBox): RectangleClient {
  const isRoot = Boolean(box.element.isRoot || box.depth === 0);
  const markers = box.element.data?.markers;
  let markerCount = 0;
  if (markers && typeof markers === 'object') {
    if (markers.priority) markerCount++;
    if (markers.progress !== undefined && markers.progress !== null) markerCount++;
    if (markers.flag) markerCount++;
  }
  const markerWidth = markerCount > 0 ? markerCount * 21 : 0;
  const paddingX = isRoot ? 12 : 8;

  const textX = box.x + (markerWidth > 0 ? paddingX + markerWidth : 0);
  const textWidth = Math.max(10, box.width - (markerWidth > 0 ? paddingX + markerWidth : 0));

  return {
    x: textX,
    y: box.y,
    width: textWidth,
    height: box.height,
  };
}

/**
 * 渲染标记 (Markers) 的 SVG 片段
 */
export function renderNodeMarkersSvg(
  container: SVGGElement,
  node: SpeedMindElement,
  box: NodeLayoutBox
): number {
  const existing = container.querySelector('.speed-mind-node-markers');
  existing?.remove();

  const markers = node.data?.markers;
  if (!markers || typeof markers !== 'object') return 0;

  const markerList: { category: string; value: any; sym: string }[] = [];
  if (markers.priority) {
    markerList.push({ category: 'priority', value: markers.priority, sym: `marker-priority-${markers.priority}` });
  }
  if (markers.progress !== undefined && markers.progress !== null) {
    markerList.push({ category: 'progress', value: markers.progress, sym: `marker-progress-${markers.progress}` });
  }
  if (markers.flag) {
    markerList.push({ category: 'flag', value: markers.flag, sym: `marker-flag-${markers.flag}` });
  }
  if (markerList.length === 0) return 0;

  const isRoot = Boolean(node.isRoot || box.depth === 0);
  const startX = box.x + (isRoot ? 12 : 8);
  const startY = box.y + (box.height - 18) / 2;

  const markersG = document.createElementNS(SVG_NS, 'g');
  markersG.setAttribute('class', 'speed-mind-node-markers');
  markersG.style.pointerEvents = 'auto';

  markerList.forEach((item, i) => {
    const iconG = document.createElementNS(SVG_NS, 'svg');
    iconG.setAttribute('x', String(startX + i * 21));
    iconG.setAttribute('y', String(startY));
    iconG.setAttribute('width', '18');
    iconG.setAttribute('height', '18');
    iconG.setAttribute('viewBox', '0 0 22 22');
    iconG.setAttribute('class', 'speed-mind-marker-item');
    iconG.setAttribute('data-category', item.category);
    iconG.setAttribute('data-value', String(item.value));
    iconG.setAttribute('data-node-id', box.id);
    iconG.style.cursor = 'pointer';

    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', `#${item.sym}`);
    iconG.appendChild(use);
    markersG.appendChild(iconG);
  });

  container.appendChild(markersG);
  return markerList.length * 21;
}

/**
 * 绘制单个脑图节点卡片形状 (Card 矩形 / 下划线 / 胶囊)
 */
export function renderNodeCardShape(
  nodeG: SVGGElement,
  box: NodeLayoutBox,
  isSelected: boolean
): void {
  ensureMarkerSpriteInjected();

  const element = box.element;
  const isRoot = Boolean(element.isRoot || box.depth === 0);
  const shape = element.shape || 'roundRectangle';
  const isNone = shape === 'none';
  const isUnderline = shape === 'underline';
  const isCapsule = shape === 'capsule';
  const branchColor = element.branchColor || '#8b5cf6';

  // 1. 节点主体形状 (Body Rect / Underline / None 纯文本)
  if (isNone) {
    const bodyRect = document.createElementNS(SVG_NS, 'rect');
    bodyRect.setAttribute('x', String(box.x));
    bodyRect.setAttribute('y', String(box.y));
    bodyRect.setAttribute('width', String(box.width));
    bodyRect.setAttribute('height', String(box.height));
    bodyRect.setAttribute('rx', '4');
    bodyRect.setAttribute('ry', '4');
    bodyRect.setAttribute('fill', 'transparent');
    bodyRect.setAttribute('stroke', isSelected ? '#3b82f6' : 'none');
    bodyRect.setAttribute('stroke-width', isSelected ? '1.5' : '0');
    if (isSelected) {
      bodyRect.setAttribute('stroke-dasharray', '3 3');
    }
    bodyRect.setAttribute('class', 'speed-mind-node-none speed-mind-node-shape');
    nodeG.appendChild(bodyRect);
  } else if (isUnderline) {
    const underlineRect = document.createElementNS(SVG_NS, 'rect');
    underlineRect.setAttribute('x', String(box.x));
    underlineRect.setAttribute('y', String(box.y + box.height - 3));
    underlineRect.setAttribute('width', String(box.width));
    underlineRect.setAttribute('height', '3');
    underlineRect.setAttribute('rx', '1.5');
    underlineRect.setAttribute('ry', '1.5');
    underlineRect.setAttribute('fill', isSelected ? '#3b82f6' : branchColor);
    underlineRect.setAttribute('stroke', 'none');
    underlineRect.setAttribute('class', 'speed-mind-node-underline speed-mind-node-shape');
    nodeG.appendChild(underlineRect);
  } else {
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
    } else {
      bodyRect.style.filter = '';
    }

    bodyRect.setAttribute('class', 'speed-mind-node-body speed-mind-node-shape');
    nodeG.appendChild(bodyRect);
  }

  // 2. 渲染标记 (Markers)
  renderNodeMarkersSvg(nodeG, element, box);
}

/**
 * 局部更新已有卡片形状，避免销毁正在编辑的 DOM 元素
 */
export function updateNodeCardShape(
  nodeG: SVGGElement,
  box: NodeLayoutBox,
  isSelected: boolean
): void {
  const element = box.element;
  const isRoot = Boolean(element.isRoot || box.depth === 0);
  const shape = element.shape || 'roundRectangle';
  const isNone = shape === 'none';
  const isUnderline = shape === 'underline';
  const isCapsule = shape === 'capsule';
  const branchColor = element.branchColor || '#8b5cf6';

  nodeG.setAttribute('class', `speed-mind-node-g ${isRoot ? 'is-root' : 'is-child'} ${isSelected ? 'is-selected' : ''}`);

  const shapeEl = nodeG.querySelector('.speed-mind-node-shape') as SVGRectElement | null;
  if (!shapeEl) {
    renderNodeCardShape(nodeG, box, isSelected);
    return;
  }

  if (isNone) {
    shapeEl.setAttribute('x', String(box.x));
    shapeEl.setAttribute('y', String(box.y));
    shapeEl.setAttribute('width', String(box.width));
    shapeEl.setAttribute('height', String(box.height));
    shapeEl.setAttribute('rx', '4');
    shapeEl.setAttribute('ry', '4');
    shapeEl.setAttribute('fill', 'transparent');
    shapeEl.setAttribute('stroke', isSelected ? '#3b82f6' : 'none');
    shapeEl.setAttribute('stroke-width', isSelected ? '1.5' : '0');
    if (isSelected) {
      shapeEl.setAttribute('stroke-dasharray', '3 3');
    } else {
      shapeEl.removeAttribute('stroke-dasharray');
    }
    shapeEl.style.filter = '';
  } else if (isUnderline) {
    shapeEl.setAttribute('x', String(box.x));
    shapeEl.setAttribute('y', String(box.y + box.height - 3));
    shapeEl.setAttribute('width', String(box.width));
    shapeEl.setAttribute('height', '3');
    shapeEl.setAttribute('rx', '1.5');
    shapeEl.setAttribute('ry', '1.5');
    shapeEl.setAttribute('fill', isSelected ? '#3b82f6' : branchColor);
    shapeEl.setAttribute('stroke', 'none');
    shapeEl.setAttribute('stroke-width', '0');
    shapeEl.removeAttribute('stroke-dasharray');
    shapeEl.style.filter = '';
  } else {
    shapeEl.setAttribute('x', String(box.x));
    shapeEl.setAttribute('y', String(box.y));
    shapeEl.setAttribute('width', String(box.width));
    shapeEl.setAttribute('height', String(box.height));
    shapeEl.removeAttribute('stroke-dasharray');

    const rx = isCapsule ? box.height / 2 : (isRoot ? 8 : 6);
    shapeEl.setAttribute('rx', String(rx));
    shapeEl.setAttribute('ry', String(rx));

    if (isRoot) {
      shapeEl.setAttribute('fill', element.fill || '#f3f4f6');
      shapeEl.setAttribute(
        'stroke',
        isSelected ? '#3b82f6' : (element.strokeColor || '#e5e7eb')
      );
      shapeEl.setAttribute('stroke-width', isSelected ? '2' : String(element.strokeWidth || 1.5));
    } else {
      shapeEl.setAttribute('fill', element.fill || '#ffffff');
      shapeEl.setAttribute(
        'stroke',
        isSelected ? '#3b82f6' : (element.strokeColor || branchColor)
      );
      shapeEl.setAttribute('stroke-width', isSelected ? '2' : String(element.strokeWidth || 1.5));
    }

    if (isSelected) {
      shapeEl.style.filter = 'drop-shadow(0 2px 6px rgba(59, 130, 246, 0.25))';
    } else {
      shapeEl.style.filter = '';
    }
  }

  // 更新标记
  renderNodeMarkersSvg(nodeG, element, box);
}

/**
 * 完整绘制单个节点卡片 (初次渲染或重建时使用)
 */
export function renderNodeCardSvg(
  nodeG: SVGGElement,
  box: NodeLayoutBox,
  isSelected: boolean
): void {
  nodeG.innerHTML = '';
  nodeG.setAttribute(
    'class',
    `speed-mind-node-g ${box.element.isRoot ? 'is-root' : 'is-child'} ${isSelected ? 'is-selected' : ''}`
  );
  nodeG.setAttribute('data-node-id', box.id);
  nodeG.style.cursor = 'pointer';
  renderNodeCardShape(nodeG, box, isSelected);
}
