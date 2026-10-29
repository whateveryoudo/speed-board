import type { NodeLayoutBox } from '../types';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * 绘制节点外延式 `+` 新增子节点按钮及折叠/展开徽章
 */
export function renderNodeHandlesSvg(
  handleContainer: SVGGElement,
  box: NodeLayoutBox,
  isHovered: boolean,
  isSelected: boolean
): void {
  handleContainer.innerHTML = '';

  const hasChildren = Boolean(box.element.children && box.element.children.length > 0);
  const isCollapsed = Boolean(box.element.isCollapsed);
  const isRoot = Boolean(box.element.isRoot || box.depth === 0);

  // 1. 折叠状态徽章 (若已折叠，常驻显示子节点数量与展开箭头)
  if (hasChildren && isCollapsed) {
    const badgeG = document.createElementNS(SVG_NS, 'g');
    badgeG.setAttribute('class', 'speed-mind-collapse-badge');
    badgeG.setAttribute('data-action', 'expand');
    badgeG.setAttribute('data-node-id', box.id);
    badgeG.style.cursor = 'pointer';

    const childCount = box.element.children.length;
    const isLeft = box.left;
    const badgeX = isLeft ? box.x - 18 : box.x + box.width + 4;
    const badgeY = box.y + box.height / 2 - 8;

    const bgRect = document.createElementNS(SVG_NS, 'rect');
    bgRect.setAttribute('x', String(badgeX));
    bgRect.setAttribute('y', String(badgeY));
    bgRect.setAttribute('width', '16');
    bgRect.setAttribute('height', '16');
    bgRect.setAttribute('rx', '8');
    bgRect.setAttribute('ry', '8');
    bgRect.setAttribute('fill', box.element.branchColor || '#2563eb');

    const txt = document.createElementNS(SVG_NS, 'text');
    txt.setAttribute('x', String(badgeX + 8));
    txt.setAttribute('y', String(badgeY + 11.5));
    txt.setAttribute('fill', '#ffffff');
    txt.setAttribute('font-size', '10');
    txt.setAttribute('font-weight', 'bold');
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('pointer-events', 'none');
    txt.textContent = String(childCount);

    badgeG.appendChild(bgRect);
    badgeG.appendChild(txt);
    handleContainer.appendChild(badgeG);
    return;
  }

  // 2. 只有在 Hover 或 Selected 时显示操作加号按钮与折叠按钮
  if (!isHovered && !isSelected) {
    return;
  }

  // 2.1 外侧 `+` 按钮 (对标 X6，优雅挂载于节点外缘 8px 处，绝不压在连线上)
  const isLeft = !isRoot && box.left;
  const plusCx = isLeft ? box.x - 10 : box.x + box.width + 10;
  const plusCy = box.y + box.height / 2;

  const plusG = document.createElementNS(SVG_NS, 'g');
  plusG.setAttribute('class', 'speed-mind-add-handle');
  plusG.setAttribute('data-action', 'add-child');
  plusG.setAttribute('data-node-id', box.id);
  plusG.style.cursor = 'pointer';

  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('cx', String(plusCx));
  circle.setAttribute('cy', String(plusCy));
  circle.setAttribute('r', '7.5');
  circle.setAttribute('fill', '#ffffff');
  circle.setAttribute('stroke', '#94a3b8');
  circle.setAttribute('stroke-width', '1.2');

  // 十字加号线
  const crossPath = document.createElementNS(SVG_NS, 'path');
  crossPath.setAttribute(
    'd',
    `M ${plusCx - 4} ${plusCy} L ${plusCx + 4} ${plusCy} M ${plusCx} ${plusCy - 4} L ${plusCx} ${plusCy + 4}`
  );
  crossPath.setAttribute('stroke', '#64748b');
  crossPath.setAttribute('stroke-width', '1.5');
  crossPath.setAttribute('stroke-linecap', 'round');
  crossPath.setAttribute('pointer-events', 'none');

  plusG.appendChild(circle);
  plusG.appendChild(crossPath);

  // Hover 高亮交互
  plusG.addEventListener('mouseenter', () => {
    circle.setAttribute('stroke', '#2563eb');
    circle.setAttribute('fill', '#eff6ff');
    crossPath.setAttribute('stroke', '#2563eb');
  });
  plusG.addEventListener('mouseleave', () => {
    circle.setAttribute('stroke', '#94a3b8');
    circle.setAttribute('fill', '#ffffff');
    crossPath.setAttribute('stroke', '#64748b');
  });

  handleContainer.appendChild(plusG);

  // 2.2 若非根节点且拥有子节点，在展开状态提供收起按钮
  if (!isRoot && hasChildren && !isCollapsed) {
    const collapseG = document.createElementNS(SVG_NS, 'g');
    collapseG.setAttribute('class', 'speed-mind-collapse-handle');
    collapseG.setAttribute('data-action', 'collapse');
    collapseG.setAttribute('data-node-id', box.id);
    collapseG.style.cursor = 'pointer';

    const colCx = isLeft ? box.x - 26 : box.x + box.width + 26;
    const colCy = box.y + box.height / 2;

    const colCircle = document.createElementNS(SVG_NS, 'circle');
    colCircle.setAttribute('cx', String(colCx));
    colCircle.setAttribute('cy', String(colCy));
    colCircle.setAttribute('r', '6');
    colCircle.setAttribute('fill', '#ffffff');
    colCircle.setAttribute('stroke', '#cbd5e1');
    colCircle.setAttribute('stroke-width', '1');

    // 减号线
    const minusPath = document.createElementNS(SVG_NS, 'path');
    minusPath.setAttribute('d', `M ${colCx - 3} ${colCy} L ${colCx + 3} ${colCy}`);
    minusPath.setAttribute('stroke', '#94a3b8');
    minusPath.setAttribute('stroke-width', '1.2');
    minusPath.setAttribute('stroke-linecap', 'round');
    minusPath.setAttribute('pointer-events', 'none');

    collapseG.appendChild(colCircle);
    collapseG.appendChild(minusPath);

    collapseG.addEventListener('mouseenter', () => {
      colCircle.setAttribute('stroke', '#ef4444');
      colCircle.setAttribute('fill', '#fef2f2');
      minusPath.setAttribute('stroke', '#ef4444');
    });
    collapseG.addEventListener('mouseleave', () => {
      colCircle.setAttribute('stroke', '#cbd5e1');
      colCircle.setAttribute('fill', '#ffffff');
      minusPath.setAttribute('stroke', '#94a3b8');
    });

    handleContainer.appendChild(collapseG);
  }
}
