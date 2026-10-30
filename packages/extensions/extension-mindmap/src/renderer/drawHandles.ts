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

  const isLeft = !isRoot && box.left;
  const hasCollapseBtn = !isRoot && hasChildren && !isCollapsed;

  // 2.1 折叠按钮：位于 + 按钮的左边 (更贴近节点卡片边缘)，与 + 按钮同等尺寸 (r = 7.5)，使用 < 箭头指示向父级折叠
  if (hasCollapseBtn) {
    const collapseG = document.createElementNS(SVG_NS, 'g');
    collapseG.setAttribute('class', 'speed-mind-collapse-handle');
    collapseG.setAttribute('data-action', 'collapse');
    collapseG.setAttribute('data-node-id', box.id);
    collapseG.style.cursor = 'pointer';

    const colOffset = 9;
    const colCx = isLeft ? box.x - colOffset : box.x + box.width + colOffset;
    const colCy = box.y + box.height / 2;

    const colCircle = document.createElementNS(SVG_NS, 'circle');
    colCircle.setAttribute('cx', String(colCx));
    colCircle.setAttribute('cy', String(colCy));
    colCircle.setAttribute('r', '7.5');
    colCircle.setAttribute('fill', '#ffffff');
    colCircle.setAttribute('stroke', '#94a3b8');
    colCircle.setAttribute('stroke-width', '1.2');

    // < 折叠箭头 (右向布局指向左 <，左向布局指向右 >)
    const arrowPath = document.createElementNS(SVG_NS, 'path');
    const d = isLeft
      ? `M ${colCx - 1.5} ${colCy - 3.5} L ${colCx + 1.5} ${colCy} L ${colCx - 1.5} ${colCy + 3.5}`
      : `M ${colCx + 1.5} ${colCy - 3.5} L ${colCx - 1.5} ${colCy} L ${colCx + 1.5} ${colCy + 3.5}`;

    arrowPath.setAttribute('d', d);
    arrowPath.setAttribute('fill', 'none');
    arrowPath.setAttribute('stroke', '#64748b');
    arrowPath.setAttribute('stroke-width', '1.4');
    arrowPath.setAttribute('stroke-linecap', 'round');
    arrowPath.setAttribute('stroke-linejoin', 'round');
    arrowPath.setAttribute('pointer-events', 'none');

    collapseG.appendChild(colCircle);
    collapseG.appendChild(arrowPath);

    collapseG.addEventListener('mouseenter', () => {
      colCircle.setAttribute('stroke', '#2563eb');
      colCircle.setAttribute('fill', '#eff6ff');
      arrowPath.setAttribute('stroke', '#2563eb');
    });
    collapseG.addEventListener('mouseleave', () => {
      colCircle.setAttribute('stroke', '#94a3b8');
      colCircle.setAttribute('fill', '#ffffff');
      arrowPath.setAttribute('stroke', '#64748b');
    });

    handleContainer.appendChild(collapseG);
  }

  // 2.2 外侧 `+` 按钮 (尺寸同等 r = 7.5，若有折叠按钮则放其右侧间距 3px，若无则贴紧节点)
  const plusOffset = hasCollapseBtn ? 27 : 9;
  const plusCx = isLeft ? box.x - plusOffset : box.x + box.width + plusOffset;
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
  crossPath.setAttribute('stroke-width', '1.4');
  crossPath.setAttribute('stroke-linecap', 'round');
  crossPath.setAttribute('pointer-events', 'none');

  plusG.appendChild(circle);
  plusG.appendChild(crossPath);

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
}
