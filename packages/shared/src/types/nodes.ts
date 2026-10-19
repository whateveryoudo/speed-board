import type { Point } from './geometry'

export interface ShapeNodeData {
  shapeId?: string
  shapeName?: string
  text?: string
  fill?: string
  stroke?: string
  strokeWidth?: number
  strokeDasharray?: string
  opacity?: number
  fontSize?: number
  fontColor?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  align?: 'left' | 'center' | 'right' | 'justify'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  [key: string]: any
}

export interface TextNodeData {
  text?: string
  fontSize?: number
  fontColor?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  align?: 'left' | 'center' | 'right' | 'justify'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  [key: string]: any
}

export interface VectorNodeData {
  type: 'vector-polygon'
  points: Point[]
  fill?: string
  stroke?: string
  strokeWidth?: number
  strokeDasharray?: string
  opacity?: number
  [key: string]: any
}

export interface ImageNodeData {
  url: string
  name?: string
  status?: 'uploading' | 'success' | 'error'
  fileId?: string
  [key: string]: any
}

export interface IconNodeData {
  svg: string
  name?: string
  color?: string
  [key: string]: any
}

export type MindmapStructure = 'balanced' | 'right' | 'left'
export type MindmapShapeStyle = 'underline' | 'capsule' | 'rect' | 'none'
export type MindmapBranchType = 'curve' | 'straight' | 'rounded'

export interface MindmapBranchConfig {
  color?: string
  width?: number
  type?: MindmapBranchType
  isRainbow?: boolean
  isTapered?: boolean
}

export interface MindmapMarkers {
  priority?: number
  progress?: number
  flag?: string
}

export interface MindmapNodeData {
  type: 'mindmap-node'
  mindmapId: string
  parentId?: string
  isRoot?: boolean
  depth: number
  order?: number
  side?: 'left' | 'right'
  collapsed?: boolean
  text?: string
  structure?: MindmapStructure
  shapeStyle?: MindmapShapeStyle
  manualSize?: { width: number; height: number }
  branch?: MindmapBranchConfig
  markers?: MindmapMarkers
  fill?: string
  stroke?: string
  strokeWidth?: number
  fontSize?: number
  fontColor?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  [key: string]: any
}
