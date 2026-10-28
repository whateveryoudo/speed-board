export interface ArrowheadPreset {
  id: string;
  name: string;
  iconSvg: string;
  getMarkerConfig?: (color?: string, strokeWidth?: number) => any;
}

export const ARROWHEAD_PRESETS: ArrowheadPreset[] = [
  {
    id: 'none',
    name: '无端点',
    iconSvg: '<line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="2"/>',
  },
  {
    id: 'classic-arrow',
    name: '普通箭头',
    iconSvg: '<line x1="2" y1="12" x2="18" y2="12" stroke="currentColor" stroke-width="2"/><polyline points="12 6 18 12 12 18" fill="none" stroke="currentColor" stroke-width="2"/>',
  },
  {
    id: 'block',
    name: '实心三角',
    iconSvg: '<line x1="2" y1="12" x2="14" y2="12" stroke="currentColor" stroke-width="2"/><polygon points="14 7 22 12 14 17" fill="currentColor"/>',
  },
  {
    id: 'hollow-triangle',
    name: '空心三角',
    iconSvg: '<line x1="2" y1="12" x2="14" y2="12" stroke="currentColor" stroke-width="2"/><polygon points="14 7 22 12 14 17" fill="#ffffff" stroke="currentColor" stroke-width="1.8"/>',
  },
  {
    id: 'diamond',
    name: '实心菱形',
    iconSvg: '<line x1="2" y1="12" x2="12" y2="12" stroke="currentColor" stroke-width="2"/><polygon points="16 7 21 12 16 17 11 12" fill="currentColor"/>',
  },
  {
    id: 'hollow-diamond',
    name: '空心菱形',
    iconSvg: '<line x1="2" y1="12" x2="12" y2="12" stroke="currentColor" stroke-width="2"/><polygon points="16 7 21 12 16 17 11 12" fill="#ffffff" stroke="currentColor" stroke-width="1.8"/>',
  },
  {
    id: 'circle',
    name: '实心圆点',
    iconSvg: '<line x1="2" y1="12" x2="14" y2="12" stroke="currentColor" stroke-width="2"/><circle cx="17" cy="12" r="4" fill="currentColor"/>',
  },
  {
    id: 'hollow-circle',
    name: '空心圆点',
    iconSvg: '<line x1="2" y1="12" x2="14" y2="12" stroke="currentColor" stroke-width="2"/><circle cx="17" cy="12" r="4" fill="#ffffff" stroke="currentColor" stroke-width="1.8"/>',
  },
  {
    id: 'cross',
    name: '十字端点',
    iconSvg: '<line x1="2" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2"/><line x1="16" y1="7" x2="16" y2="17" stroke="currentColor" stroke-width="2"/>',
  },
];
