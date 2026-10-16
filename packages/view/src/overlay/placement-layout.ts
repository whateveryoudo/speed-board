import type { Point } from '../types'

/**
 * 计算鼠标悬浮放置预览框相对画布视口的偏移坐标
 */
export function computePlacementPosition(
  clientX: number,
  clientY: number,
  canvasWrapper: HTMLElement | null | undefined,
  itemWidth = 100,
  itemHeight = 80
): Point | null {
  if (!canvasWrapper) return null
  const rect = canvasWrapper.getBoundingClientRect()
  return {
    x: clientX - rect.left - itemWidth / 2,
    y: clientY - rect.top - itemHeight / 2,
  }
}
