import type { Graph, Node, Edge } from '@antv/x6'
import type { Board } from '@speed-board/core'
import {
  MINDMAP_RAINBOW_COLORS,
  calculateMindmapNodeWidth,
  type MindmapNodeData,
  type MindmapStructure,
  type MindmapBranchConfig,
} from '@speed-board/shared'
import { calculateMindmapLayout } from '../layout/mindmapLayout'
import type { MindmapTreeNode, InsertMindmapOptions } from '../types'

/**
 * 校验节点是否为思维导图节点
 */
export function isMindmapNode(cell: any): boolean {
  if (!cell || !cell.isNode || !cell.isNode()) return false
  const data = cell.getData() as MindmapNodeData | undefined
  return data?.type === 'mindmap-node'
}

/**
 * 获取指定节点所属思维导图的根节点
 */
export function getMindmapRootNode(graph: Graph, nodeOrMindmapId: string): Node | null {
  const current = graph.getCellById(nodeOrMindmapId)
  if (current && current.isNode()) {
    const data = current.getData() as MindmapNodeData | undefined
    if (data?.type === 'mindmap-node') {
      if (data.isRoot) return current as Node
      const mId = data.mindmapId
      const root = graph.getNodes().find((n) => {
        const d = n.getData() as MindmapNodeData | undefined
        return d?.type === 'mindmap-node' && d?.mindmapId === mId && d?.isRoot
      })
      if (root) return root
    }
  }

  const rootByMindmapId = graph.getNodes().find((n) => {
    const d = n.getData() as MindmapNodeData | undefined
    return (
      d?.type === 'mindmap-node' &&
      (d?.mindmapId === nodeOrMindmapId || n.id === nodeOrMindmapId) &&
      d?.isRoot
    )
  })
  return rootByMindmapId || null
}

/**
 * 收集某棵思维导图下所有节点与边
 */
export function getMindmapElements(graph: Graph, mindmapId: string) {
  const nodes = graph.getNodes().filter((n) => {
    const d = n.getData() as MindmapNodeData | undefined
    return d?.type === 'mindmap-node' && d?.mindmapId === mindmapId
  })
  const nodeIds = new Set(nodes.map((n) => n.id))

  const edges = graph.getEdges().filter((e) => {
    const s = e.getSourceCellId()
    const t = e.getTargetCellId()
    return nodeIds.has(s) || nodeIds.has(t)
  })

  return { nodes, edges }
}

/**
 * 构建内存树形结构供布局计算
 */
export function buildMindmapTree(graph: Graph, rootNode: Node): MindmapTreeNode {
  const rootData = rootNode.getData() as MindmapNodeData
  const mindmapId = rootData.mindmapId
  const { nodes } = getMindmapElements(graph, mindmapId)

  const nodeMap = new Map<string, MindmapTreeNode>()

  for (const n of nodes) {
    const data = n.getData() as MindmapNodeData
    const bbox = n.getBBox()
    const text = data.text || '分支主题'
    const dynamicW = calculateMindmapNodeWidth(text, !!data.isRoot)
    const nodeWidth = bbox.width ? Math.max(bbox.width, dynamicW) : dynamicW
    nodeMap.set(n.id, {
      id: n.id,
      text,
      width: nodeWidth,
      height: data.isRoot ? 42 : 32,
      depth: data.depth ?? 0,
      side: data.side,
      collapsed: data.collapsed,
      data,
      children: [],
    })
  }

  // 挂载父子树
  for (const n of nodes) {
    const data = n.getData() as MindmapNodeData
    const parentId = data.parentId
    if (parentId && nodeMap.has(parentId)) {
      const parentTree = nodeMap.get(parentId)!
      const currentTree = nodeMap.get(n.id)!
      parentTree.children = parentTree.children || []
      parentTree.children.push(currentTree)
    }
  }

  // 对每个节点的 children 按照 order 稳定升序排序
  for (const item of nodeMap.values()) {
    if (item.children && item.children.length > 1) {
      item.children.sort((a, b) => {
        const orderA = a.data?.order ?? 0
        const orderB = b.data?.order ?? 0
        return orderA - orderB
      })
    }
  }

  return nodeMap.get(rootNode.id)!
}

/**
 * 刷新并重新布局指定思维导图
 */
export function updateMindmapLayout(board: Board, rootOrChildId: string): void {
  const graph = board.graph
  const rootNode = getMindmapRootNode(graph, rootOrChildId)
  if (!rootNode) return

  const rootData = rootNode.getData() as MindmapNodeData
  const structure = rootData.structure || 'balanced'
  const originBBox = rootNode.getBBox()

  // 1. 构建树并计算坐标
  const tree = buildMindmapTree(graph, rootNode)
  const layout = calculateMindmapLayout(tree, originBBox.x, originBBox.y, structure)

  // 2. 更新每个节点坐标与数据
  for (const nLayout of layout.nodes) {
    const node = graph.getCellById(nLayout.id) as Node
    if (!node) continue

    node.position(nLayout.x, nLayout.y)
    const currentData = (node.getData() || {}) as MindmapNodeData
    node.setData({
      ...currentData,
      side: nLayout.side,
      depth: nLayout.depth,
    })

    // 同步下划线显示：仅下划线风格显示，卡片/胶囊等卡片风格彻底隐藏，杜绝多余杂点残留
    if (!currentData.isRoot) {
      const shapeStyle = currentData.shapeStyle || 'none'
      if (shapeStyle === 'underline') {
        node.setAttrByPath('underline/display', 'block')
        if (currentData.branch?.color) {
          node.setAttrByPath('underline/fill', currentData.branch.color)
          node.setAttrByPath('underline/stroke', 'none')
        }
      } else {
        node.setAttrByPath('underline/display', 'none')
      }
    }
  }

  // 3. 重建或更新分支连线 (平滑贝塞尔)
  const { edges: existingEdges } = getMindmapElements(graph, rootData.mindmapId)
  const existingEdgeMap = new Map<string, Edge>()
  for (const edge of existingEdges) {
    existingEdgeMap.set(`${edge.getSourceCellId()}->${edge.getTargetCellId()}`, edge)
  }

  const activeEdgeKeys = new Set<string>()

  for (const edgeInfo of layout.edges) {
    const key = `${edgeInfo.source}->${edgeInfo.target}`
    activeEdgeKeys.add(key)

    const sourcePort = edgeInfo.side === 'right' ? 'right' : 'left'
    const targetPort = edgeInfo.side === 'right' ? 'left' : 'right'
    const strokeColor = edgeInfo.color || '#8b5cf6'
    const strokeWidth = edgeInfo.width ?? 3

    let edge = existingEdgeMap.get(key)
    if (edge) {
      edge.setSource({
        cell: edgeInfo.source,
        port: sourcePort,
        anchor: { name: 'center' },
        connectionPoint: { name: 'anchor' },
      })
      edge.setTarget({
        cell: edgeInfo.target,
        port: targetPort,
        anchor: { name: 'center' },
        connectionPoint: { name: 'anchor' },
      })
      edge.setAttrByPath('line/stroke', strokeColor)
      edge.setAttrByPath('line/strokeWidth', strokeWidth)
    } else {
      graph.addEdge({
        shape: 'speed-mindmap-edge',
        source: {
          cell: edgeInfo.source,
          port: sourcePort,
          anchor: { name: 'center' },
          connectionPoint: { name: 'anchor' },
        },
        target: {
          cell: edgeInfo.target,
          port: targetPort,
          anchor: { name: 'center' },
          connectionPoint: { name: 'anchor' },
        },
        attrs: {
          line: {
            stroke: strokeColor,
            strokeWidth,
          },
        },
      })
    }
  }

  // 清除多余边
  for (const edge of existingEdges) {
    const key = `${edge.getSourceCellId()}->${edge.getTargetCellId()}`
    if (!activeEdgeKeys.has(key)) {
      edge.remove()
    }
  }
}

/**
 * 插入新思维导图 (仅生成中心主题根节点，由用户点击右侧手柄或按 Enter 新增分支)
 */
export function insertMindmap(board: Board, options: InsertMindmapOptions): string {
  const graph = board.graph
  const rootId = `mindmap-${Date.now()}`
  const initText = options.text || '思维导图'
  const initWidth = calculateMindmapNodeWidth(initText, true)
  // 如果调用方已传入精确左上角坐标 (如 PlacementOverlay 计算的 targetX, targetY)，直接采用；
  // 若未传入则默认在当前视口中心居中放置
  const center = board.getViewportCenter()
  const x = options.x != null ? Math.round(options.x) : Math.round(center.x - initWidth / 2)
  const y = options.y != null ? Math.round(options.y) : Math.round(center.y - 21)

  // 1. 创建中心主题根节点
  const rootNode = graph.addNode({
    id: rootId,
    shape: 'speed-mindmap-root',
    x,
    y,
    width: initWidth,
    height: 42,
    attrs: {
      label: {
        text: initText,
      },
    },
    data: {
      type: 'mindmap-node',
      mindmapId: rootId,
      isRoot: true,
      depth: 0,
      structure: options.structure || 'right',
      text: options.text || '思维导图',
      branch: {
        isRainbow: true,
        width: 3,
        type: 'curve',
      },
    } as MindmapNodeData,
  })

  graph.cleanSelection()
  graph.select(rootNode)
  graph.trigger('selection:changed', { selected: [rootNode] })
  return rootId
}

/**
 * 为指定节点添加子级主题 (Tab / Enter 快捷键或点击右侧 + 手柄)
 */
export function addMindmapChild(board: Board, parentNodeId?: string): string | null {
  const graph = board.graph
  let targetId = parentNodeId
  if (!targetId) {
    const selected = graph.getSelectedCells()
    if (selected.length > 0 && isMindmapNode(selected[0])) {
      targetId = selected[0].id
    }
  }
  if (!targetId) return null

  const parentNode = graph.getCellById(targetId) as Node
  if (!parentNode) return null
  const parentData = parentNode.getData() as MindmapNodeData
  const mindmapId = parentData.mindmapId

  // 计算子节点颜色
  let branchColor = '#8b5cf6'
  if (parentData.isRoot) {
    // 根节点新增分支：分配下一个彩虹色
    const { nodes } = getMindmapElements(graph, mindmapId)
    const rootChildren = nodes.filter((n) => (n.getData() as MindmapNodeData)?.parentId === parentNode.id)
    branchColor = MINDMAP_RAINBOW_COLORS[rootChildren.length % MINDMAP_RAINBOW_COLORS.length]
  } else {
    // 继承父级分支颜色
    branchColor = parentData.branch?.color || '#8b5cf6'
  }

    const { nodes } = getMindmapElements(graph, mindmapId)
    const existingSiblings = nodes.filter((n) => (n.getData() as MindmapNodeData)?.parentId === parentNode.id)
    const maxOrder = existingSiblings.reduce(
      (max, n) => Math.max(max, (n.getData() as MindmapNodeData)?.order ?? 0),
      0
    )
    const nextOrder = existingSiblings.length === 0 ? 100 : maxOrder + 100

    const childId = `mindmap-node-${Date.now()}`
    const childText = '分支主题'
    const childWidth = calculateMindmapNodeWidth(childText, false)
    const childNode = graph.addNode({
      id: childId,
      shape: 'speed-mindmap-node',
      x: parentNode.getBBox().x + 120,
      y: parentNode.getBBox().y,
      width: childWidth,
      height: 32,
      attrs: {
        label: {
          text: childText,
        },
        underline: {
          display: 'none',
        },
      },
      data: {
        type: 'mindmap-node',
        mindmapId,
        parentId: parentNode.id,
        isRoot: false,
        depth: (parentData.depth ?? 0) + 1,
        order: nextOrder,
        text: childText,
        shapeStyle: 'none',
        branch: {
          color: branchColor,
          width: 3,
          type: 'curve',
        },
      } as MindmapNodeData,
    })

  updateMindmapLayout(board, mindmapId)
  graph.cleanSelection()
  graph.select(childNode)
  graph.trigger('selection:changed', { selected: [childNode] })
  graph.trigger('node:start-edit', { node: childNode })
  return childId
}

/**
 * 为指定节点添加同级兄弟主题 (Enter 快捷键)
 */
export function addMindmapSibling(board: Board, currentId?: string): string | null {
  const graph = board.graph
  let targetId = currentId
  if (!targetId) {
    const selected = graph.getSelectedCells()
    if (selected.length > 0 && isMindmapNode(selected[0])) {
      targetId = selected[0].id
    }
  }
  if (!targetId) return null

  const currentNode = graph.getCellById(targetId) as Node
  if (!currentNode) return null
  const currentData = currentNode.getData() as MindmapNodeData

  // 如果选中的是根节点，直接调用加子节点
  if (currentData.isRoot || !currentData.parentId) {
    return addMindmapChild(board, currentId)
  }

  return addMindmapChild(board, currentData.parentId)
}

/**
 * 删除脑图分支 (级联删除整棵子树)
 */
export function deleteMindmapBranch(board: Board, targetId?: string): void {
  const graph = board.graph
  let id = targetId
  if (!id) {
    const selected = graph.getSelectedCells()
    if (selected.length > 0 && isMindmapNode(selected[0])) {
      id = selected[0].id
    }
  }
  if (!id) return

  const targetNode = graph.getCellById(id) as Node
  if (!targetNode) return
  const data = targetNode.getData() as MindmapNodeData
  const mindmapId = data.mindmapId

  // 如果是根节点，删除整棵脑图
  if (data.isRoot) {
    const { nodes, edges } = getMindmapElements(graph, mindmapId)
    for (const e of edges) e.remove()
    for (const n of nodes) n.remove()
    return
  }

  // 递归收集所有子节点
  const { nodes, edges } = getMindmapElements(graph, mindmapId)
  const toDelete = new Set<string>([id])

  let foundNew = true
  while (foundNew) {
    foundNew = false
    for (const n of nodes) {
      if (!toDelete.has(n.id)) {
        const d = n.getData() as MindmapNodeData
        if (d.parentId && toDelete.has(d.parentId)) {
          toDelete.add(n.id)
          foundNew = true
        }
      }
    }
  }

  for (const nId of toDelete) {
    const n = graph.getCellById(nId)
    if (n) n.remove()
  }

  updateMindmapLayout(board, mindmapId)
}

/**
 * 切换思维导图布局结构 (平衡双向 / 单向向右 / 单向向左)
 */
export function setMindmapStructure(board: Board, rootOrChildId: string, structure: MindmapStructure): void {
  const rootNode = getMindmapRootNode(board.graph, rootOrChildId)
  if (!rootNode) return

  const currentData = rootNode.getData() as MindmapNodeData
  rootNode.setData({
    ...currentData,
    structure,
  })

  updateMindmapLayout(board, rootNode.id)
}

/**
 * 更新脑图分支样式 (颜色、彩虹、粗细)
 */
export function setMindmapBranchStyle(
  board: Board,
  nodeId: string,
  branchConfig: Partial<MindmapBranchConfig>
): void {
  const graph = board.graph
  const node = graph.getCellById(nodeId) as Node
  if (!node || !isMindmapNode(node)) return

  const data = node.getData() as MindmapNodeData
  const newBranch = { ...data.branch, ...branchConfig }
  node.setData({
    ...data,
    branch: newBranch,
  })

  updateMindmapLayout(board, data.mindmapId)
}

/**
 * 获取指定思维导图节点的直接子节点列表
 */
export function getMindmapChildren(graph: Graph, parentId: string): Node[] {
  return graph.getNodes().filter((n) => {
    const data = n.getData() as MindmapNodeData | undefined
    return data?.type === 'mindmap-node' && data.parentId === parentId
  })
}

/**
 * 递归获取指定思维导图节点的所有后代节点列表 (BFS)
 */
export function getMindmapDescendants(graph: Graph, nodeId: string): Node[] {
  const result: Node[] = []
  const queue: string[] = [nodeId]
  const visited = new Set<string>([nodeId])

  while (queue.length > 0) {
    const currentId = queue.shift()!
    const children = getMindmapChildren(graph, currentId)
    for (const child of children) {
      if (!visited.has(child.id)) {
        visited.add(child.id)
        result.push(child)
        queue.push(child.id)
      }
    }
  }

  return result
}

/**
 * 移动/重新挂载思维导图节点（嵌套为子节点、前插兄弟、后插兄弟）
 * 包含严密的防成环保护、兄弟排序重计算、分支颜色与深度级联更新
 */
export function moveMindmapNode(
  board: Board,
  draggedNodeId: string,
  targetNodeId: string,
  position: 'child' | 'before' | 'after'
): boolean {
  const graph = board.graph
  const draggedNode = graph.getCellById(draggedNodeId) as Node
  const targetNode = graph.getCellById(targetNodeId) as Node
  if (!draggedNode || !targetNode) return false

  const draggedData = draggedNode.getData() as MindmapNodeData
  const targetData = targetNode.getData() as MindmapNodeData
  if (!draggedData || !targetData) return false

  // 根节点不能被移动为其他节点的子节点或兄弟节点
  if (draggedData.isRoot) return false
  if (draggedNode.id === targetNode.id) return false

  const rootNode = getMindmapRootNode(graph, draggedData.mindmapId)
  if (!rootNode) return false

  // 防成环保护：目标节点绝对不能是拖拽节点自身或其后代节点
  const descendants = getMindmapDescendants(graph, draggedNode.id)
  const invalidIds = new Set([draggedNode.id, ...descendants.map((d) => d.id)])
  if (invalidIds.has(targetNode.id)) {
    return false
  }

  let newParentId: string
  if (position === 'child') {
    newParentId = targetNode.id
  } else {
    // 兄弟插入：父节点与 targetNode 一致
    if (targetData.isRoot || !targetData.parentId) {
      newParentId = targetNode.id
      position = 'child'
    } else {
      newParentId = targetData.parentId
    }
  }

  const newParentNode = graph.getCellById(newParentId) as Node
  if (!newParentNode) return false
  const newParentData = newParentNode.getData() as MindmapNodeData

  // 确定分支颜色与深度
  let branchColor = '#8b5cf6'
  if (newParentData.isRoot) {
    // 挂在根节点下作为一级分支，分配彩虹色
    const { nodes } = getMindmapElements(graph, draggedData.mindmapId)
    const rootChildren = nodes.filter(
      (n) => (n.getData() as MindmapNodeData)?.parentId === newParentNode.id && n.id !== draggedNode.id
    )
    branchColor = MINDMAP_RAINBOW_COLORS[rootChildren.length % MINDMAP_RAINBOW_COLORS.length]
  } else {
    // 继承父级分支颜色
    branchColor = newParentData.branch?.color || '#8b5cf6'
  }

  // 递归同步被拖拽子树的深度与颜色
  function updateSubtree(currNode: Node, depth: number, color: string) {
    const d = currNode.getData() as MindmapNodeData
    currNode.setData({
      ...d,
      depth,
      branch: {
        ...(d.branch || {}),
        color,
      },
    })
    if (!d.isRoot) {
      currNode.setAttrByPath('underline/fill', color)
      currNode.setAttrByPath('underline/stroke', 'none')
    }
    const children = getMindmapChildren(graph, currNode.id)
    for (const child of children) {
      updateSubtree(child, depth + 1, color)
    }
  }

  // 计算兄弟排序 (order)
  const siblings = getMindmapChildren(graph, newParentId).filter((n) => n.id !== draggedNode.id)
  // 按原 order 排序现有兄弟
  siblings.sort((a, b) => {
    const oA = (a.getData() as MindmapNodeData)?.order ?? 0
    const oB = (b.getData() as MindmapNodeData)?.order ?? 0
    return oA - oB
  })

  if (position === 'child') {
    siblings.push(draggedNode)
  } else if (position === 'before') {
    const idx = siblings.findIndex((n) => n.id === targetNode.id)
    if (idx !== -1) {
      siblings.splice(idx, 0, draggedNode)
    } else {
      siblings.push(draggedNode)
    }
  } else if (position === 'after') {
    const idx = siblings.findIndex((n) => n.id === targetNode.id)
    if (idx !== -1) {
      siblings.splice(idx + 1, 0, draggedNode)
    } else {
      siblings.push(draggedNode)
    }
  }

  // 重新分配连续递增的 order
  for (let i = 0; i < siblings.length; i++) {
    const sib = siblings[i]
    const sData = sib.getData() as MindmapNodeData
    sib.setData({
      ...sData,
      parentId: newParentId,
      order: (i + 1) * 100,
    })
  }

  // 更新拖拽节点及所有后代节点的深度与分支颜色
  updateSubtree(draggedNode, (newParentData.depth ?? 0) + 1, branchColor)

  // 刷新并重排布局
  updateMindmapLayout(board, draggedData.mindmapId)

  // 保持选中被拖动的节点
  graph.cleanSelection()
  graph.select(draggedNode)
  graph.trigger('selection:changed', { selected: [draggedNode] })

  return true
}

