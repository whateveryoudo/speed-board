import type { BranchLinkInfo, SummaryLayoutInfo } from '../types';
import { buildBezierBranchPath, buildStraightBranchPath } from '../layout/mindLayout';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * 绘制思维导图所有分支连接线 (平滑贝塞尔曲线或折线)
 */
export function renderBranchLinksSvg(
  container: SVGGElement,
  links: BranchLinkInfo[]
): void {
  // 清理已有连线
  container.innerHTML = '';

  links.forEach((link) => {
    const pathEl = document.createElementNS(SVG_NS, 'path');
    const pathD =
      link.shape === 'polyline'
        ? buildStraightBranchPath(link.from, link.to, link.trunkX)
        : buildBezierBranchPath(link.from, link.to);

    pathEl.setAttribute('d', pathD);
    pathEl.setAttribute('fill', 'none');
    pathEl.setAttribute('stroke', link.color);
    pathEl.setAttribute('stroke-width', String(link.width));
    pathEl.setAttribute('stroke-linecap', link.shape === 'polyline' ? 'square' : 'round');
    pathEl.setAttribute('stroke-linejoin', link.shape === 'polyline' ? 'miter' : 'round');
    pathEl.setAttribute('class', 'speed-mind-branch-link');
    pathEl.style.pointerEvents = 'none';

    container.appendChild(pathEl);
  });
}

/**
 * 绘制思维导图概要大括号
 */
export function renderSummaryBracketsSvg(
  container: SVGGElement,
  summaries: SummaryLayoutInfo[]
): void {
  summaries.forEach((summary) => {
    const pathEl = document.createElementNS(SVG_NS, 'path');
    pathEl.setAttribute('d', summary.bracketPath);
    pathEl.setAttribute('fill', 'none');
    pathEl.setAttribute('stroke', summary.element.branchColor || '#6366f1');
    pathEl.setAttribute('stroke-width', '2');
    pathEl.setAttribute('stroke-linecap', 'round');
    pathEl.setAttribute('stroke-linejoin', 'round');
    pathEl.setAttribute('class', 'speed-mind-summary-bracket');
    pathEl.style.pointerEvents = 'none';

    container.appendChild(pathEl);
  });
}
