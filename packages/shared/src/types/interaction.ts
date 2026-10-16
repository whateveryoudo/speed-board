import type { Point, ScreenPoint, PortDirection } from './geometry'

export type DrawingToolMode = 'select' | 'pencil' | 'marker' | 'eraser' | 'vector' | 'line' | 'hand'

export interface DrawConfig {
  mode: 'select' | 'pencil' | 'marker' | 'eraser' | 'vector' | 'line'
  lineType?: 'elbow' | 'straight' | 'curve'
  color: string
  width: number
  opacity: number
}

export interface PortSnapResult {
  node: any
  isCenterPort: boolean
  port?: PortDirection
  edge: PortDirection
  offset: number
  localPoint: Point
  screenPoint: ScreenPoint
  distance: number
}

export interface InlineEditorStyle {
  position: 'absolute'
  left: string
  top: string
  width: string
  height: string
  fontSize: string
  color: string
  fontWeight: string
  fontStyle: string
  textDecoration: string
  textAlign: 'left' | 'center' | 'right' | 'justify'
  paddingTop: string
  transform?: string
  transformOrigin?: string
  zIndex: number
  [key: string]: any
}

export interface PendingPlacementItem {
  type: 'text' | 'shape' | 'icon' | 'basic' | 'mindmap'
  width: number
  height: number
  textConfig?: Record<string, any>
  shapeConfig?: {
    shapeId: string
    shapeName?: string
    svgContent: string
    viewBox?: string
    fill?: string
    stroke?: string
    strokeWidth?: number
    strokeDasharray?: string
    opacity?: number
    text?: string
  }
  iconConfig?: {
    svg: string
    name?: string
  }
  basicConfig?: {
    shape: string
    text?: string
    fill?: string
    stroke?: string
  }
}
