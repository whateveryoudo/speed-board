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
      // 若父节点被折叠，不挂载 children，使 hierarchy 布局将父节点视作叶子节点
      if (!parentTree.collapsed) {
        parentTree.children = parentTree.children || []
        parentTree.children.push(currentTree)
      }
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

  // 1.1 节点可见性与收起状态同步：未在 layout.nodes 中的节点全部隐藏，已在其中的节点全部显示
  const visibleNodeIds = new Set(layout.nodes.map((n) => n.id))
  const { nodes: allNodes } = getMindmapElements(graph, rootData.mindmapId)
  for (const n of allNodes) {
    if (visibleNodeIds.has(n.id)) {
      n.show()
    } else {
      n.hide()
      if (graph.isSelected(n)) {
        graph.unselect(n)
      }
    }
  }

  // 2. 更新每个节点坐标与数据 (统一确保节点层级高于连线，节点压在线条上方)
  for (const nLayout of layout.nodes) {
    const node = graph.getCellById(nLayout.id) as Node
    if (!node) continue

    node.position(nLayout.x, nLayout.y)
    node.setZIndex(10)
    const currentData = (node.getData() || {}) as MindmapNodeData
    const nodeText = currentData.text || (currentData.isRoot ? '思维导图' : '分支主题')
    node.setAttrByPath('textWrap/html', nodeText)
    node.setData({
      ...currentData,
      side: nLayout.side,
      depth: nLayout.depth,
    })

    // 同步节点形状样式 (下划线 / 胶囊 / 卡片矩形 / 纯文本)
    const shapeStyle = currentData.shapeStyle || (currentData.isRoot ? 'rect' : 'none')
    const primaryColor = currentData.branch?.color || '#3b82f6'

    if (shapeStyle === 'underline') {
      node.setAttrByPath('body/fill', 'transparent')
      node.setAttrByPath('body/stroke', 'transparent')
      node.setAttrByPath('body/strokeWidth', 0)
      node.setAttrByPath('underline/display', 'block')
      node.setAttrByPath('underline/fill', primaryColor)
      node.setAttrByPath('underline/stroke', 'none')
    } else if (shapeStyle === 'capsule') {
      const rx = currentData.isRoot ? 21 : 16
      node.setAttrByPath('body/rx', rx)
      node.setAttrByPath('body/ry', rx)
      node.setAttrByPath('body/fill', currentData.fill || (currentData.isRoot ? '#f3f4f6' : '#ffffff'))
      node.setAttrByPath('body/stroke', currentData.stroke || primaryColor)
      node.setAttrByPath('body/strokeWidth', currentData.strokeWidth || 1.5)
      node.setAttrByPath('underline/display', 'none')
    } else if (shapeStyle === 'rect') {
      node.setAttrByPath('body/rx', currentData.isRoot ? 8 : 6)
      node.setAttrByPath('body/ry', currentData.isRoot ? 8 : 6)
      node.setAttrByPath('body/fill', currentData.fill || (currentData.isRoot ? '#f3f4f6' : '#ffffff'))
      node.setAttrByPath('body/stroke', currentData.stroke || (currentData.isRoot ? '#e5e7eb' : primaryColor))
      node.setAttrByPath('body/strokeWidth', currentData.strokeWidth || 1.5)
      node.setAttrByPath('underline/display', 'none')
    } else if (shapeStyle === 'none') {
      node.setAttrByPath('body/fill', 'transparent')
      node.setAttrByPath('body/stroke', 'transparent')
      node.setAttrByPath('body/strokeWidth', 0)
      node.setAttrByPath('underline/display', 'none')
    }

    // 同步节点内置控制手柄 (+ / 收起 / 折叠数字徽标)
    updateMindmapNodeHandle(graph, node)
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
    const strokeColor = edgeInfo.color || rootData.branch?.color || '#8b5cf6'
    let strokeWidth = edgeInfo.width ?? rootData.branch?.width ?? 3
    if (rootData.branch?.isTapered) {
      const targetNode = graph.getCellById(edgeInfo.target) as Node
      const targetData = (targetNode?.getData() || {}) as MindmapNodeData
      const depth = targetData.depth ?? 1
      strokeWidth = Math.max(1.5, strokeWidth - (depth - 1) * 0.75)
    }

    // 根据所属分支类型确定连线 connector (曲线 / 直角折线)
    const sourceNode = graph.getCellById(edgeInfo.source) as Node
    const sourceData = (sourceNode?.getData() || {}) as MindmapNodeData
    const branchType = sourceData.branch?.type || rootData.branch?.type || 'curve'
    const connectorName = branchType === 'straight' ? 'mindmap-straight' : 'mindmap-curve'

    let edge = existingEdgeMap.get(key)
    if (edge) {
      edge.setZIndex(1)
      edge.setConnector(connectorName)
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
        zIndex: 1,
        connector: {
          name: connectorName,
        },
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
    zIndex: 10,
    x,
    y,
    width: initWidth,
    height: 42,
    attrs: {
      textWrap: {
        html: initText,
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

  updateMindmapNodeHandle(graph, rootNode)

  graph.cleanSelection()
  graph.select(rootNode)
  graph.trigger('selection:changed', { selected: [rootNode] })
  return rootId
}

/**
 * 递归解除指定节点及其所有祖先节点的折叠状态，确保链路全部展开可见
 */
export function uncollapseAncestors(graph: Graph, nodeId: string): void {
  let curr = graph.getCellById(nodeId) as Node | null
  while (curr && isMindmapNode(curr)) {
    const d = curr.getData() as MindmapNodeData | undefined
    if (d?.collapsed) {
      curr.setData({
        ...d,
        collapsed: false,
      })
      graph.trigger('mindmap:collapse:change', { nodeId: curr.id, collapsed: false })
    }
    if (d?.parentId) {
      curr = graph.getCellById(d.parentId) as Node | null
    } else {
      break
    }
  }
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

  // 只要添加子分支，递归解除父节点及祖先节点的折叠状态，确保新子节点立即展开可见
  uncollapseAncestors(graph, parentNode.id)

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
      zIndex: 10,
      x: parentNode.getBBox().x + 120,
      y: parentNode.getBBox().y,
      width: childWidth,
      height: 32,
      attrs: {
        textWrap: {
          html: childText,
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
 * 更新脑图分支样式 (颜色、彩虹、粗细、类型、渐细)
 */
export function setMindmapBranchStyle(
  board: Board,
  nodeId: string,
  branchConfig: Partial<MindmapBranchConfig> & { resetColor?: boolean; resetWidth?: boolean }
): void {
  const graph = board.graph
  const node = graph.getCellById(nodeId) as Node
  if (!node || !isMindmapNode(node)) return

  const data = node.getData() as MindmapNodeData
  const rootNode = getMindmapRootNode(graph, data.mindmapId)
  if (!rootNode) return
  const rootData = rootNode.getData() as MindmapNodeData

  if (data.isRoot) {
    // 根节点：控制全图基准
    const newRootBranch = { ...data.branch, ...branchConfig }
    delete (newRootBranch as any).resetColor
    delete (newRootBranch as any).resetWidth
    node.setData({
      ...data,
      branch: newRootBranch,
    })

    const { nodes } = getMindmapElements(graph, data.mindmapId)
    const rootChildren = nodes.filter((n) => (n.getData() as MindmapNodeData)?.parentId === node.id)

    // 若切换了彩虹分支开关
    if (branchConfig.isRainbow !== undefined) {
      if (branchConfig.isRainbow) {
        // 恢复彩虹分支颜色
        rootChildren.forEach((child, idx) => {
          const rainbowColor = MINDMAP_RAINBOW_COLORS[idx % MINDMAP_RAINBOW_COLORS.length]
          const cData = child.getData() as MindmapNodeData
          child.setData({
            ...cData,
            branch: { ...(cData.branch || {}), color: rainbowColor },
          })
          // 向后代传递彩虹色
          const descendants = getMindmapDescendants(graph, child.id)
          for (const d of descendants) {
            const dData = d.getData() as MindmapNodeData
            d.setData({
              ...dData,
              branch: { ...(dData.branch || {}), color: rainbowColor },
            })
          }
        })
      } else {
        // 关闭彩虹分支：统一为根节点指定的分支颜色
        const uniformColor = branchConfig.color || newRootBranch.color || '#8b5cf6'
        for (const n of nodes) {
          if (!n.getData()?.isRoot) {
            const nd = n.getData() as MindmapNodeData
            n.setData({
              ...nd,
              branch: { ...(nd.branch || {}), color: uniformColor },
            })
          }
        }
      }
    } else if (branchConfig.color && newRootBranch.isRainbow === false) {
      // 在单色模式下修改了根节点分支颜色：全树同步
      for (const n of nodes) {
        if (!n.getData()?.isRoot) {
          const nd = n.getData() as MindmapNodeData
          n.setData({
            ...nd,
            branch: { ...(nd.branch || {}), color: branchConfig.color },
          })
        }
      }
    }

    // 分支类型 (曲线/直角) 全局树同步
    if (branchConfig.type) {
      for (const n of nodes) {
        if (!n.getData()?.isRoot) {
          const nd = n.getData() as MindmapNodeData
          n.setData({
            ...nd,
            branch: { ...(nd.branch || {}), type: branchConfig.type },
          })
        }
      }
    }
  } else {
    // 子节点：局部支线覆盖或恢复继承
    const currentBranch = { ...(data.branch || {}) }

    // 处理颜色覆盖与恢复继承
    if (branchConfig.resetColor) {
      // 恢复继承：查找父级或彩虹分支颜色
      let parentColor = '#8b5cf6'
      if (data.parentId) {
        const parentNode = graph.getCellById(data.parentId) as Node
        const pData = parentNode?.getData() as MindmapNodeData | undefined
        if (pData?.isRoot) {
          const { nodes } = getMindmapElements(graph, data.mindmapId)
          const rootChildren = nodes.filter((n) => (n.getData() as MindmapNodeData)?.parentId === pData.id)
          const idx = rootChildren.findIndex((n) => n.id === node.id)
          parentColor =
            rootData.branch?.isRainbow === false
              ? rootData.branch?.color || '#8b5cf6'
              : MINDMAP_RAINBOW_COLORS[Math.max(0, idx) % MINDMAP_RAINBOW_COLORS.length]
        } else {
          parentColor = pData?.branch?.color || '#8b5cf6'
        }
      }
      currentBranch.color = parentColor
    } else if (branchConfig.color) {
      currentBranch.color = branchConfig.color
    }

    // 处理粗细覆盖与恢复继承
    if (branchConfig.resetWidth) {
      delete currentBranch.width
    } else if (branchConfig.width !== undefined) {
      currentBranch.width = branchConfig.width
    }

    // 分支类型修改直接作用于全图根节点
    if (branchConfig.type) {
      rootNode.setData({
        ...rootData,
        branch: { ...(rootData.branch || {}), type: branchConfig.type },
      })
      const { nodes } = getMindmapElements(graph, data.mindmapId)
      for (const n of nodes) {
        const nd = n.getData() as MindmapNodeData
        n.setData({
          ...nd,
          branch: { ...(nd.branch || {}), type: branchConfig.type },
        })
      }
    }

    node.setData({
      ...data,
      branch: currentBranch,
    })

    // 局部颜色或粗细向下级递归传递
    if (branchConfig.color || branchConfig.resetColor || branchConfig.width !== undefined || branchConfig.resetWidth) {
      const descendants = getMindmapDescendants(graph, node.id)
      for (const d of descendants) {
        const dData = d.getData() as MindmapNodeData
        const dB = { ...(dData.branch || {}) }
        if (branchConfig.color || branchConfig.resetColor) {
          dB.color = currentBranch.color
        }
        if (branchConfig.width !== undefined) {
          dB.width = currentBranch.width
        } else if (branchConfig.resetWidth) {
          delete dB.width
        }
        d.setData({
          ...dData,
          branch: dB,
        })
      }
    }
  }

  updateMindmapLayout(board, data.mindmapId)
}

/**
 * 切换脑图节点的展开/折叠状态 (Root 节点不折叠，无子节点的叶子节点不折叠)
 */
export function toggleMindmapNodeCollapse(board: Board, nodeId: string): void {
  const graph = board.graph
  const node = graph.getCellById(nodeId) as Node
  if (!node || !isMindmapNode(node)) return

  const data = node.getData() as MindmapNodeData
  if (data.isRoot) return

  const children = getMindmapChildren(graph, nodeId)
  if (children.length === 0 && !data.collapsed) return

  // 根据子节点的实际可见性计算目标折叠状态：子节点若可见，则本次操作为收起(true)；若已隐藏，则本次操作为展开(false)
  const isCurrentlyCollapsed = children.length > 0 ? !children[0].isVisible() : !!data.collapsed
  const newCollapsed = !isCurrentlyCollapsed
  node.setData({
    ...data,
    collapsed: newCollapsed,
  })

  updateMindmapLayout(board, data.mindmapId)
  graph.trigger('mindmap:collapse:change', { nodeId, collapsed: newCollapsed })
}

/**
 * 明确指定设置脑图节点展开/折叠
 */
export function setMindmapNodeCollapse(board: Board, nodeId: string, collapsed: boolean): void {
  const graph = board.graph
  const node = graph.getCellById(nodeId) as Node
  if (!node || !isMindmapNode(node)) return

  const data = node.getData() as MindmapNodeData
  if (data.isRoot || data.collapsed === collapsed) return

  node.setData({
    ...data,
    collapsed,
  })

  updateMindmapLayout(board, data.mindmapId)
  graph.trigger('mindmap:collapse:change', { nodeId, collapsed })
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

  // 拖拽挂载后，确保新父级及祖先节点全部解除折叠展开
  uncollapseAncestors(graph, newParentId)

  // 刷新并重排布局
  updateMindmapLayout(board, draggedData.mindmapId)

  // 保持选中被拖动的节点
  graph.cleanSelection()
  graph.select(draggedNode)
  graph.trigger('selection:changed', { selected: [draggedNode] })

  return true
}

/**
 * 生成脑图节点内置控制手柄的 HTML 结构 (支持加号、收起/展开、折叠数字计数徽标)
 */
export function getMindmapNodeHandleHTML(graph: Graph, node: Node): string {
  const data = (node.getData() || {}) as MindmapNodeData
  const isRoot = !!data.isRoot
  const side = data.side === 'left' ? 'left' : 'right'
  const branchColor = isRoot ? '#8b5cf6' : data.branch?.color || '#8b5cf6'

  const children = graph.getNodes().filter((c) => {
    const cd = c.getData() as MindmapNodeData | undefined
    return cd?.type === 'mindmap-node' && cd.parentId === node.id
  })

  const hasChildren = children.length > 0
  const isCollapsed =
    hasChildren && !isRoot && children[0] && typeof children[0].isVisible === 'function'
      ? !children[0].isVisible()
      : false

  if (hasChildren && isCollapsed && !isRoot) {
    // 情况 A：折叠状态 -> 常驻显示折叠数字徽标，同时带有添加按钮
    return `
      <div class="mindmap-native-handle ${side} is-collapsed" data-node-id="${node.id}">
        <div class="branch-anchor-dot" style="background-color: ${branchColor}"></div>
        <div class="branch-stub-line ${side}" style="background-color: ${branchColor}"></div>
        <div class="branch-count-badge ${side}" style="background-color: ${branchColor}" data-action="toggle-collapse" title="点击展开分支">
          ${children.length}
        </div>
        <div class="branch-add-btn is-secondary ${side}" data-action="add-child" title="添加分支 (Enter)">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
          </svg>
        </div>
      </div>
    `.trim()
  }

  if (hasChildren && !isCollapsed && !isRoot) {
    // 情况 B：展开状态且有子节点 -> 显示收起按钮 (-) 与添加按钮 (+)
    return `
      <div class="mindmap-native-handle ${side} is-expanded" data-node-id="${node.id}">
        <div class="branch-anchor-dot" style="background-color: ${branchColor}"></div>
        <div class="branch-stub-line is-expanded-with-children ${side}" style="background-color: ${branchColor}"></div>
        <div class="branch-collapse-btn ${side}" style="background-color: ${branchColor}" data-action="toggle-collapse" title="收起分支">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
            <path fill-rule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 8Z" />
          </svg>
        </div>
        <div class="branch-add-btn is-secondary ${side}" data-action="add-child" title="添加分支 (Enter)">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
          </svg>
        </div>
      </div>
    `.trim()
  }

  // 情况 C：根节点或叶子节点 -> 显示添加按钮 (+)
  return `
    <div class="mindmap-native-handle ${side}" data-node-id="${node.id}">
      <div class="branch-anchor-dot" style="background-color: ${branchColor}"></div>
      <div class="branch-stub-line ${side}" style="background-color: ${branchColor}"></div>
      <div class="branch-add-btn ${side}" style="background-color: ${branchColor}" data-action="add-child" title="添加分支 (Enter)">
        <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
        </svg>
      </div>
    </div>
  `.trim()
}

/**
 * 刷新指定脑图节点的内置控制手柄与坐标
 */
export function updateMindmapNodeHandle(graph: Graph, node: Node): void {
  if (!isMindmapNode(node)) return
  const data = (node.getData() || {}) as MindmapNodeData
  const isLeft = data.side === 'left'

  node.setAttrByPath('handleGroup/refX', isLeft ? 0 : '100%')
  node.setAttrByPath('handleGroup/refY', '50%')
  node.setAttrByPath('handleFo/x', isLeft ? -80 : 0)
  node.setAttrByPath('handleFo/y', -12)
  node.setAttrByPath('handleFo/width', 80)
  node.setAttrByPath('handleFo/height', 24)
  node.setAttrByPath('handleFo/style/overflow', 'visible')

  const html = getMindmapNodeHandleHTML(graph, node)
  node.setAttrByPath('handleFo/html', html)
}

/**
 * 激活脑图节点原生内置 contenteditable 文本就地编辑 (0 像素抖动，1:1 对标语雀)
 */
export function activateMindmapNodeTextEdit(
  board: Board,
  node: Node,
  initialChar?: string
): void {
  const graph = board.graph
  const view = graph.findViewByCell(node)
  if (!view || !view.container) return

  const textEl = view.container.querySelector('.mindmap-node-text') as HTMLDivElement | null
  if (!textEl) return

  // 避免重复挂载监听
  if (textEl.getAttribute('contenteditable') === 'true') {
    return
  }

  textEl.setAttribute('contenteditable', 'true')
  textEl.style.userSelect = 'text'
  textEl.style.cursor = 'text'
  textEl.focus()

  if (initialChar) {
    textEl.innerText = initialChar
    const range = document.createRange()
    const sel = window.getSelection()
    range.selectNodeContents(textEl)
    range.collapse(false)
    sel?.removeAllRanges()
    sel?.addRange(range)
  } else {
    // 双击或新建时全选文字，敲键盘即可直接完全替换
    const range = document.createRange()
    const sel = window.getSelection()
    range.selectNodeContents(textEl)
    sel?.removeAllRanges()
    sel?.addRange(range)
  }

  let finished = false
  const commitEdit = () => {
    if (finished) return
    finished = true

    textEl.removeEventListener('keydown', onKeyDown)
    textEl.removeEventListener('blur', onBlur)

    textEl.removeAttribute('contenteditable')
    textEl.style.userSelect = 'none'
    textEl.style.cursor = 'default'

    const rawText = textEl.innerText.trim()
    const data = (node.getData() || {}) as MindmapNodeData
    const newText = rawText === '' ? (data.isRoot ? '思维导图' : '分支主题') : rawText

    textEl.innerText = newText
    node.setData({
      ...data,
      text: newText,
    })

    const isRoot = !!data.isRoot
    const calcW = calculateMindmapNodeWidth(newText, isRoot)
    const lines = newText.split('\n')
    const baseHeight = isRoot ? 42 : 32
    const lineH = (isRoot ? 16 : 14) * 1.45
    const targetHeight = lines.length > 1 ? Math.round(lines.length * lineH + 14) : baseHeight

    node.setSize(calcW, targetHeight)
    updateMindmapLayout(board, data.mindmapId)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      commitEdit()
      return
    }

    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter 换行输入
        return
      }
      if (e.isComposing || (e as any).keyCode === 229) {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      commitEdit()
      // Enter 完成后直接新增同级兄弟节点 (1:1 语雀交互)
      addMindmapSibling(board, node.id)
      return
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      e.stopPropagation()
      commitEdit()
      // Tab 完成后直接新增子节点 (1:1 语雀交互)
      addMindmapChild(board, node.id)
      return
    }
  }

  const onBlur = () => {
    commitEdit()
  }

  textEl.addEventListener('keydown', onKeyDown)
  textEl.addEventListener('blur', onBlur)
}

