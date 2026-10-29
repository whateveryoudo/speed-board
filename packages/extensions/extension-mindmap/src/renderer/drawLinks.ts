import type { NodeLayoutBox, SpeedMindElement } from '../types';

export function renderBranchLinksSvg(
  rootBox: NodeLayoutBox,
  rootElement: SpeedMindElement
): SVGGElement {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'speed-mindmap-branches');

  function renderBranch(parent: NodeLayoutBox, child: NodeLayoutBox) {
    const isParentRoot = Boolean(parent.element.isRoot || parent.id === rootElement.id);
    const isUnderline = child.element.shape === 'underline';
    const isParentUnderline = !isParentRoot && parent.element.shape === 'underline';
    const isLeft = child.left;

    let startX: number;
    let startY: number;

    if (isParentRoot) {
      startX = isLeft ? parent.x : parent.x + parent.width;
      startY = parent.y + parent.height / 2;
    } else {
      startX = isLeft ? parent.x : parent.x + parent.width;
      startY = isParentUnderline ? parent.y + parent.height : parent.y + parent.height / 2;
    }

    let endX: number;
    let endY: number;

    if (isLeft) {
      endX = child.x + child.width;
      endY = isUnderline ? child.y + child.height : child.y + child.height / 2;
    } else {
      endX = child.x;
      endY = isUnderline ? child.y + child.height : child.y + child.height / 2;
    }

    const dx = Math.max(20, Math.abs(endX - startX));
    const factor = 0.45;
    const branchShape = child.element.branchShape || parent.element.branchShape || rootElement.branchShape || 'curve';

    let d: string;
    if (branchShape === 'polyline') {
      const midX = isLeft ? startX - dx * 0.5 : startX + dx * 0.5;
      d = `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`;
    } else {
      const c1x = isLeft ? startX - dx * factor : startX + dx * factor;
      const c1y = startY;
      const c2x = isLeft ? endX + dx * factor : endX - dx * factor;
      const c2y = endY;
      d = `M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`;
    }

    // 如果下划线形状，连线横穿下划线底部
    if (isUnderline) {
      if (isLeft) {
        d += ` L ${child.x} ${endY}`;
      } else {
        d += ` L ${child.x + child.width} ${endY}`;
      }
    }

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const color =
      child.element.branchColor ||
      parent.element.branchColor ||
      rootElement.branchColor ||
      '#2563eb';
    const width = child.element.branchWidth || rootElement.branchWidth || 2;

    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', `${width}`);
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('class', 'mindmap-branch-line');

    g.appendChild(path);

    // 递归绘制子节点的分支
    if (child.children && !child.element.isCollapsed) {
      for (const subChild of child.children) {
        renderBranch(child, subChild);
      }
    }
  }

  if (rootBox.children && !rootElement.isCollapsed) {
    for (const child of rootBox.children) {
      renderBranch(rootBox, child);
    }
  }

  return g;
}
