import { mindmap } from '@antv/hierarchy'
import type { MindmapTreeNode, MindmapExtensionOptions } from '../types'
import type { MindmapStructure } from '@speed-board/shared'

export interface CalculatedMindmapLayout {
  nodes: Array<{
    id: string
    x: number
    y: number
    width: number
    height: number
    side: 'left' | 'right'
    depth: number
    data: any
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    side: 'left' | 'right'
    color?: string
    width?: number
  }>
}

function sanitizeTree(node: MindmapTreeNode): MindmapTreeNode {
  const children = (node.children || []).filter(Boolean).map(sanitizeTree)
  return {
    ...node,
    children: children.length > 0 ? children : undefined,
  }
}

/**
 * 基于 @antv/hierarchy 的思维导图布局计算器
 * @param rootTree 树形结构数据
 * @param originX 根节点锚定 X 世界坐标
 * @param originY 根节点锚定 Y 世界坐标
 * @param structure 布局结构 ('balanced' | 'right' | 'left')
 * @param options 间距与配置项
 */
export function calculateMindmapLayout(
  rootTree: MindmapTreeNode,
  originX: number,
  originY: number,
  structure: MindmapStructure = 'balanced',
  options?: MindmapExtensionOptions
): CalculatedMindmapLayout {
  const direction = structure === 'right' ? 'LR' : structure === 'left' ? 'RL' : 'H'
  const hgap = options?.hgap ?? 50
  const vgap = options?.vgap ?? 24

  const cleanTree = sanitizeTree(rootTree)
  const hierarchyResult = mindmap(cleanTree, {
    direction,
    getWidth: (d: any) => d.width || 80,
    getHeight: (d: any) => d.height || 32,
    getHGap: () => hgap,
    getVGap: () => vgap,
    getSide: (d: any) => d.side,
  })

  const offsetX = originX - hierarchyResult.x
  const offsetY = originY - hierarchyResult.y

  const nodes: CalculatedMindmapLayout['nodes'] = []
  const edges: CalculatedMindmapLayout['edges'] = []

  function traverse(node: any, parentNode?: any) {
    const x = Math.round(node.x + offsetX)
    const y = Math.round(node.y + offsetY)
    const width = node.data.width || node.width || 80
    const height = node.data.height || node.height || 32
    const side: 'left' | 'right' = node.side || (x < originX ? 'left' : 'right')

    nodes.push({
      id: node.data.id || node.id,
      x,
      y,
      width,
      height,
      side,
      depth: node.depth ?? 0,
      data: node.data.data,
    })

    if (parentNode) {
      edges.push({
        id: `edge-${parentNode.id}-${node.id}`,
        source: parentNode.data.id || parentNode.id,
        target: node.data.id || node.id,
        side,
        color: node.data.data?.branch?.color,
        width: node.data.data?.branch?.width,
      })
    }

    if (node.children && node.children.length > 0 && !node.data.collapsed) {
      for (const child of node.children) {
        traverse(child, node)
      }
    }
  }

  traverse(hierarchyResult)

  return { nodes, edges }
}
