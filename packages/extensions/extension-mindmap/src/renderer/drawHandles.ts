import type { NodeLayoutBox, SpeedMindElement } from '../types';

const BUTTON_DIAMETER = 15;
const BUTTON_RADIUS = BUTTON_DIAMETER / 2;

export function renderNodeHandlesSvg(
  box: NodeLayoutBox,
  rootElement: SpeedMindElement,
  isSelected: boolean
): SVGGElement | null {
  const elem = box.element;
  const hasChildren = Boolean(elem.children && elem.children.length > 0);
  const isCollapsed = Boolean(elem.isCollapsed);

  // 只有在节点有子节点、或节点被选中、或被折叠时才渲染操作按钮
  if (!hasChildren && !isSelected && !isCollapsed) {
    return null;
  }

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'speed-mindmap-handles');
  g.setAttribute('data-node-id', box.id);

  const isLeft = box.left;
  const color = elem.branchColor || elem.strokeColor || rootElement.branchColor || '#2563eb';
  const centerY = box.y + box.height / 2;

  // 1. 折叠/展开按钮（当有子节点或已被折叠时显示）
  if (hasChildren || isCollapsed) {
    const collapseX = isLeft ? box.x - BUTTON_RADIUS - 4 : box.x + box.width + BUTTON_RADIUS + 4;
    const collapseG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    collapseG.setAttribute('class', 'mindmap-collapse-handle');
    collapseG.setAttribute('data-action', 'toggle-collapse');
    collapseG.setAttribute('data-node-id', box.id);
    collapseG.style.cursor = 'pointer';

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', `${collapseX}`);
    circle.setAttribute('cy', `${centerY}`);
    circle.setAttribute('r', `${BUTTON_RADIUS}`);
    circle.setAttribute('fill', color);
    circle.setAttribute('stroke', color);
    circle.setAttribute('stroke-width', '1');

    collapseG.appendChild(circle);

    if (isCollapsed) {
      // 显示折叠状态下的子节点个数
      const count = elem.children?.length || 0;
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', `${collapseX}`);
      text.setAttribute('y', `${centerY + 3.5}`);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#ffffff');
      text.setAttribute('font-size', '10');
      text.setAttribute('font-weight', 'bold');
      text.style.pointerEvents = 'none';
      text.textContent = `${count}`;
      collapseG.appendChild(text);
    } else {
      // 展开状态：显示指向父节点方向的紧凑内指箭头 (<)
      const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = isLeft
        ? `M ${collapseX - 1.6} ${centerY - 3.2} L ${collapseX + 2.0} ${centerY} L ${collapseX - 1.6} ${centerY + 3.2}` // 指向右侧父节点
        : `M ${collapseX + 1.6} ${centerY - 3.2} L ${collapseX - 2.0} ${centerY} L ${collapseX + 1.6} ${centerY + 3.2}`; // 指向左侧父节点

      arrowPath.setAttribute('d', d);
      arrowPath.setAttribute('fill', 'none');
      arrowPath.setAttribute('stroke', '#ffffff');
      arrowPath.setAttribute('stroke-width', '1.6');
      arrowPath.setAttribute('stroke-linecap', 'round');
      arrowPath.setAttribute('stroke-linejoin', 'round');
      arrowPath.style.pointerEvents = 'none';

      collapseG.appendChild(arrowPath);
    }

    g.appendChild(collapseG);
  }

  // 2. 添加子节点按钮（+）
  if (isSelected && !isCollapsed) {
    const offset = hasChildren ? BUTTON_DIAMETER + 6 : 4;
    const addX = isLeft
      ? box.x - BUTTON_RADIUS - offset
      : box.x + box.width + BUTTON_RADIUS + offset;

    const addG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    addG.setAttribute('class', 'mindmap-add-handle');
    addG.setAttribute('data-action', 'add-child');
    addG.setAttribute('data-node-id', box.id);
    addG.style.cursor = 'pointer';

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', `${addX}`);
    circle.setAttribute('cy', `${centerY}`);
    circle.setAttribute('r', `${BUTTON_RADIUS}`);
    circle.setAttribute('fill', color);
    circle.setAttribute('stroke', 'transparent');

    const plusPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const half = 3.2;
    const d = `M ${addX - half} ${centerY} L ${addX + half} ${centerY} M ${addX} ${centerY - half} L ${addX} ${centerY + half}`;
    plusPath.setAttribute('d', d);
    plusPath.setAttribute('fill', 'none');
    plusPath.setAttribute('stroke', '#ffffff');
    plusPath.setAttribute('stroke-width', '1.6');
    plusPath.setAttribute('stroke-linecap', 'round');
    plusPath.style.pointerEvents = 'none';

    addG.appendChild(circle);
    addG.appendChild(plusPath);
    g.appendChild(addG);
  }

  return g;
}
