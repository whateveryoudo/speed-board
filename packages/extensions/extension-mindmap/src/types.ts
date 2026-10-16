import type {
  MindmapNodeData,
  MindmapStructure,
  MindmapShapeStyle,
  MindmapBranchType,
  MindmapBranchConfig,
  MindmapMarkers,
} from '@speed-board/shared'

export interface MindmapExtensionOptions {
  defaultStructure?: MindmapStructure
  defaultBranchWidth?: number
  defaultBranchType?: MindmapBranchType
  rainbowColors?: readonly string[]
  hgap?: number
  vgap?: number
}

export interface MindmapTreeNode {
  id: string
  text: string
  width: number
  height: number
  side?: 'left' | 'right'
  collapsed?: boolean
  depth: number
  data: MindmapNodeData
  children?: MindmapTreeNode[]
}

export interface InsertMindmapOptions {
  x: number
  y: number
  text?: string
  structure?: MindmapStructure
}
