// Re-export all shape models and definitions from @speed-board/shared
export * from '@speed-board/shared'

export const RECENT_SHAPES_STORAGE_KEY = 'SPEED_BOARD_RECENT_SHAPES'
export const DEFAULT_RECENT_SHAPE_IDS = [
  'rect',
  'rounded-rect',
  'circle',
  'diamond',
  'process-arrow',
  'star',
]

export function getRecentShapeIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SHAPES_STORAGE_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.slice(0, 6)
      }
    }
  } catch {}
  return [...DEFAULT_RECENT_SHAPE_IDS]
}

export function recordRecentShape(shapeId: string): void {
  try {
    const current = getRecentShapeIds().filter((id) => id !== shapeId)
    current.unshift(shapeId)
    localStorage.setItem(RECENT_SHAPES_STORAGE_KEY, JSON.stringify(current.slice(0, 6)))
  } catch {}
}

