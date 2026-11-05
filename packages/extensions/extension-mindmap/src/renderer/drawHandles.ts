import type { NodeLayoutBox, SummaryLayoutInfo } from '../types';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function generateSummaryRangePath(
  x1: number,
  y1: number,
  width: number,
  height: number
): string {
  const radius = 5;
  const handleLength = 20;
  const handleGap = 4;
  const handleSpace = handleLength + handleGap * 2; // 28px
  const handleSideLine = (width - handleSpace - radius * 2) / 2;
  const sideLine = height - radius * 2;

  if (handleSideLine >= 2 && sideLine >= 0) {
    return `M ${x1 + radius} ${y1}
      l ${handleSideLine} 0
      m ${handleSpace} 0
      l ${handleSideLine} 0
      a ${radius} ${radius} 0 0 1 ${radius} ${radius}
      l 0 ${sideLine}
      a ${radius} ${radius} 0 0 1 -${radius} ${radius}
      l -${handleSideLine} 0
      m -${handleSpace} 0
      l -${handleSideLine} 0
      a ${radius} ${radius} 0 0 1 -${radius} -${radius}
      l 0 -${sideLine}
      a ${radius} ${radius} 0 0 1 ${radius} -${radius}`;
  } else {
    return `M ${x1 + radius} ${y1}
      h ${Math.max(0, width - radius * 2)}
      a ${radius} ${radius} 0 0 1 ${radius} ${radius}
      v ${Math.max(0, sideLine)}
      a ${radius} ${radius} 0 0 1 -${radius} ${radius}
      h -${Math.max(0, width - radius * 2)}
      a ${radius} ${radius} 0 0 1 -${radius} -${radius}
      v -${Math.max(0, sideLine)}
      a ${radius} ${radius} 0 0 1 ${radius} -${radius}`;
  }
}

/**
 * 绘制概要节点的框选包围盒与上下两个拖拽调节手柄 (对标 Plait/Drawnix drawAbstractIncludedOutline)
 */
export function renderSummaryRangeHandlesSvg(
  handleContainer: SVGGElement,
  summary: SummaryLayoutInfo,
  isHovered: boolean,
  isSelected: boolean
): void {
  if (!summary.rangeRect) return;

  const { x: x1, y: y1, width, height } = summary.rangeRect;
  const x2 = x1 + width;
  const y2 = y1 + height;
  const handleLength = 20;

  const summaryG = document.createElementNS(SVG_NS, 'g');
  summaryG.setAttribute('class', 'speed-mind-summary-range-group');
  summaryG.setAttribute('pointer-events', 'none');

  // 1. 虚线/实线圆角外框 (在上下手柄位置预留 gap 空间，完全匹配 Plait 原版几何)
  const d = generateSummaryRangePath(x1, y1, width, height);

  const borderPath = document.createElementNS(SVG_NS, 'path');
  borderPath.setAttribute('class', 'speed-mind-summary-range-path');
  borderPath.setAttribute('d', d);
  borderPath.setAttribute('fill', 'rgba(102, 152, 255, 0.02)');
  borderPath.setAttribute('stroke', isSelected ? '#6698ff' : '#94a3b8');
  borderPath.setAttribute('stroke-width', '1.5');
  borderPath.setAttribute('stroke-linecap', 'round');
  borderPath.setAttribute('stroke-linejoin', 'round');
  borderPath.setAttribute('pointer-events', 'none');
  summaryG.appendChild(borderPath);

  // 2. 调节手柄 (上下各一个，药丸胶囊状，可拖动扩大或收缩被概要包含的分支范围)
  const topCx = x1 + width / 2;
  const topCy = y1;
  const bottomCx = topCx;
  const bottomCy = y2;

  const createPillHandle = (
    cx: number,
    cy: number,
    action: 'summary-resize-top' | 'summary-resize-bottom'
  ) => {
    const handleG = document.createElementNS(SVG_NS, 'g');
    handleG.setAttribute('class', `speed-mind-summary-handle ${action}`);
    handleG.setAttribute('data-action', action);
    handleG.setAttribute('data-summary-id', summary.id);
    handleG.setAttribute('pointer-events', 'all');
    handleG.style.cursor = 'ns-resize';

    // 隐形加宽感应区 (设置极低透明度颜色与 pointer-events 确保稳定截获指针交互)
    const hitRect = document.createElementNS(SVG_NS, 'rect');
    hitRect.setAttribute('class', 'speed-mind-summary-handle-hit');
    hitRect.setAttribute('x', String(cx - 20));
    hitRect.setAttribute('y', String(cy - 10));
    hitRect.setAttribute('width', '40');
    hitRect.setAttribute('height', '20');
    hitRect.setAttribute('fill', '#000000');
    hitRect.setAttribute('opacity', '0.001');
    hitRect.setAttribute('pointer-events', 'all');
    hitRect.setAttribute('data-action', action);
    hitRect.setAttribute('data-summary-id', summary.id);
    hitRect.style.cursor = 'ns-resize';

    // 实体药丸手柄
    const pill = document.createElementNS(SVG_NS, 'rect');
    pill.setAttribute('class', 'speed-mind-summary-handle-pill');
    pill.setAttribute('x', String(cx - handleLength / 2));
    pill.setAttribute('y', String(cy - 3));
    pill.setAttribute('width', String(handleLength));
    pill.setAttribute('height', '6');
    pill.setAttribute('rx', '3');
    pill.setAttribute('ry', '3');
    pill.setAttribute('fill', isSelected ? '#3b82f6' : '#94a3b8');
    pill.setAttribute('pointer-events', 'all');
    pill.setAttribute('data-action', action);
    pill.setAttribute('data-summary-id', summary.id);
    pill.style.cursor = 'ns-resize';

    handleG.appendChild(hitRect);
    handleG.appendChild(pill);

    handleG.addEventListener('mouseenter', () => {
      if (handleG.getAttribute('data-resizing') === 'true') return;
      pill.setAttribute('fill', '#2563eb');
      pill.setAttribute('height', '7');
      pill.setAttribute('y', String(cy - 3.5));
    });
    handleG.addEventListener('mouseleave', () => {
      if (handleG.getAttribute('data-resizing') === 'true') return;
      pill.setAttribute('fill', isSelected ? '#3b82f6' : '#94a3b8');
      pill.setAttribute('height', '6');
      pill.setAttribute('y', String(cy - 3));
    });

    return handleG;
  };

  summaryG.appendChild(createPillHandle(topCx, topCy, 'summary-resize-top'));
  summaryG.appendChild(createPillHandle(bottomCx, bottomCy, 'summary-resize-bottom'));

  handleContainer.appendChild(summaryG);
}

/**
 * 绘制节点外延式 `+` 新增子节点按钮、折叠/展开徽章及宽度拉伸条
 */
export function renderNodeHandlesSvg(
  handleContainer: SVGGElement,
  box: NodeLayoutBox,
  isHovered: boolean,
  isSelected: boolean
): void {
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
  const branchColor = box.element.branchColor || '#8b5cf6';
  const cy = box.y + box.height / 2;

  // 按钮中心与卡片边缘的间距 (无折叠按钮时 + 按钮延出 18px，有折叠按钮时折叠按钮延出 12px，+ 按钮延出 30px)
  const colOffset = 12;
  const plusOffset = hasCollapseBtn ? 30 : 18;

  const startX = isLeft ? box.x : box.x + box.width;
  const colCx = isLeft ? box.x - colOffset : box.x + box.width + colOffset;
  const plusCx = isLeft ? box.x - plusOffset : box.x + box.width + plusOffset;

  // 2.0 延伸连线及透明悬浮桥接区 (保证鼠标从卡片边缘滑动到手柄过程中不发生 hover 丢帧)
  const minBridgeX = Math.min(startX, plusCx - 10);
  const maxBridgeX = Math.max(startX, plusCx + 10);
  const bridgeRect = document.createElementNS(SVG_NS, 'rect');
  bridgeRect.setAttribute('x', String(minBridgeX));
  bridgeRect.setAttribute('y', String(cy - 16));
  bridgeRect.setAttribute('width', String(Math.max(20, maxBridgeX - minBridgeX)));
  bridgeRect.setAttribute('height', '32');
  bridgeRect.setAttribute('fill', 'transparent');
  bridgeRect.setAttribute('class', 'speed-mind-handle-bridge');
  bridgeRect.style.cursor = 'default';
  handleContainer.appendChild(bridgeRect);

  const stubLine = document.createElementNS(SVG_NS, 'line');
  stubLine.setAttribute('x1', String(startX));
  stubLine.setAttribute('y1', String(cy));
  stubLine.setAttribute('x2', String(plusCx));
  stubLine.setAttribute('y2', String(cy));
  stubLine.setAttribute('stroke', branchColor);
  stubLine.setAttribute('stroke-width', '2');
  stubLine.setAttribute('stroke-linecap', 'round');
  stubLine.setAttribute('pointer-events', 'none');
  handleContainer.appendChild(stubLine);

  // 2.1 折叠按钮：位于 + 按钮的左边 (更贴近节点卡片边缘)，与 + 按钮同等尺寸 (r = 7.5)，使用 < 箭头指示向父级折叠
  if (hasCollapseBtn) {
    const collapseG = document.createElementNS(SVG_NS, 'g');
    collapseG.setAttribute('class', 'speed-mind-collapse-handle');
    collapseG.setAttribute('data-action', 'collapse');
    collapseG.setAttribute('data-node-id', box.id);
    collapseG.style.cursor = 'pointer';

    const colCircle = document.createElementNS(SVG_NS, 'circle');
    colCircle.setAttribute('cx', String(colCx));
    colCircle.setAttribute('cy', String(cy));
    colCircle.setAttribute('r', '7.5');
    colCircle.setAttribute('fill', '#ffffff');
    colCircle.setAttribute('stroke', '#94a3b8');
    colCircle.setAttribute('stroke-width', '1.2');

    // < 折叠箭头 (右向布局指向左 <，左向布局指向右 >)
    const arrowPath = document.createElementNS(SVG_NS, 'path');
    const d = isLeft
      ? `M ${colCx - 1.5} ${cy - 3.5} L ${colCx + 1.5} ${cy} L ${colCx - 1.5} ${cy + 3.5}`
      : `M ${colCx + 1.5} ${cy - 3.5} L ${colCx - 1.5} ${cy} L ${colCx + 1.5} ${cy + 3.5}`;

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

  // 2.2 外侧 `+` 按钮 (尺寸同等 r = 7.5，若有折叠按钮则放其右侧间距 3px，若无则延边出来)
  const plusG = document.createElementNS(SVG_NS, 'g');
  plusG.setAttribute('class', 'speed-mind-add-handle');
  plusG.setAttribute('data-action', 'add-child');
  plusG.setAttribute('data-node-id', box.id);
  plusG.style.cursor = 'pointer';

  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('cx', String(plusCx));
  circle.setAttribute('cy', String(cy));
  circle.setAttribute('r', '7.5');
  circle.setAttribute('fill', '#ffffff');
  circle.setAttribute('stroke', '#94a3b8');
  circle.setAttribute('stroke-width', '1.2');

  // 十字加号线
  const crossPath = document.createElementNS(SVG_NS, 'path');
  crossPath.setAttribute(
    'd',
    `M ${plusCx - 4} ${cy} L ${plusCx + 4} ${cy} M ${plusCx} ${cy - 4} L ${plusCx} ${cy + 4}`
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

  // 2.3 节点宽度拉伸感应区 (纯隐形感应，移上去显示 ew-resize 光标，不渲染实体遮挡视觉)
  if (isSelected && !box.element.isSummary && !box.element.data?.isSummary) {
    const resizeG = document.createElementNS(SVG_NS, 'g');
    resizeG.setAttribute('class', 'speed-mind-node-resize-handle');
    resizeG.setAttribute('data-action', 'resize-node-width');
    resizeG.setAttribute('data-node-id', box.id);
    resizeG.setAttribute('pointer-events', 'all');
    resizeG.style.cursor = 'ew-resize';

    const resizeX = isLeft ? box.x - 4 : box.x + box.width - 4;
    const resizeY = box.y;
    const resizeH = box.height;

    // 隐形感应条：设置极低透明度颜色以截获指针，同时视觉完全隐形
    const hitArea = document.createElementNS(SVG_NS, 'rect');
    hitArea.setAttribute('x', String(resizeX));
    hitArea.setAttribute('y', String(resizeY));
    hitArea.setAttribute('width', '10');
    hitArea.setAttribute('height', String(resizeH));
    hitArea.setAttribute('fill', '#000000');
    hitArea.setAttribute('opacity', '0.001');
    hitArea.setAttribute('pointer-events', 'all');
    hitArea.setAttribute('data-action', 'resize-node-width');
    hitArea.setAttribute('data-node-id', box.id);
    hitArea.style.cursor = 'ew-resize';

    resizeG.appendChild(hitArea);
    handleContainer.appendChild(resizeG);
  }
}
