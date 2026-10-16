export interface Point {
  x: number
  y: number
}

export interface ScreenPoint {
  ox: number
  oy: number
  clientX: number
  clientY: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export type PortDirection = 'top' | 'right' | 'bottom' | 'left'

export interface AnchorPointData {
  x: number
  y: number
  ox: number
  oy: number
}

export interface AnchorPoints {
  top: AnchorPointData
  right: AnchorPointData
  bottom: AnchorPointData
  left: AnchorPointData
}
