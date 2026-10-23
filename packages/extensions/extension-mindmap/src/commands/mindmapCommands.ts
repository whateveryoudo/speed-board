import type { Graph, Node, Edge } from '@antv/x6'
import type { Board } from '@speed-board/core'
import {
  MINDMAP_RAINBOW_COLORS,
  calculateMindmapNodeWidth,
  ensureMarkerSprite,
  renderNodeMarkersHtml,
  countNodeMarkers,
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
    // 概要节点不参与主体层级树计算
    if (data.isSummary) continue

    const bbox = n.getBBox()
    const text = data.text || (data.isRoot ? '思维导图' : '分支主题')
    const hasManualSize = !!data.manualSize
    const markersCount = countNodeMarkers(data.markers)
    const nodeWidth = hasManualSize
      ? (typeof data.manualSize === 'object' && data.manualSize.width ? data.manualSize.width : bbox.width)
      : calculateMindmapNodeWidth(text, !!data.isRoot, markersCount)
    const nodeHeight = hasManualSize
      ? (typeof data.manualSize === 'object' && data.manualSize.height ? data.manualSize.height : (data.isRoot ? 42 : 32))
      : (data.isRoot ? 42 : 32)
    nodeMap.set(n.id, {
      id: n.id,
      text,
      width: nodeWidth,
      height: nodeHeight,
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
    if (data.isSummary) continue

    const parentId = data.parentId
    if (parentId && nodeMap.has(parentId)) {
      const parentTree = nodeMap.get(parentId)!
      const currentTree = nodeMap.get(n.id)
      // 若父节点被折叠，不挂载 children，使 hierarchy 布局将父节点视作叶子节点
      if (currentTree && !parentTree.collapsed) {
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

  ensureMarkerSprite()

  const rootData = rootNode.getData() as MindmapNodeData
  const structure = rootData.structure || 'balanced'
  const originBBox = rootNode.getBBox()

  // 1. 构建树并计算坐标
  const tree = buildMindmapTree(graph, rootNode)
  const layout = calculateMindmapLayout(tree, originBBox.x, originBBox.y, structure)

  // 1.1 节点可见性与收起状态同步：未在 layout.nodes 中的节点全部隐藏，已在其中的节点全部显示
  // 注意：概要节点不属于 layout.nodes，在第 4 步独立处理，此处绝不隐藏
  const visibleNodeIds = new Set(layout.nodes.map((n) => n.id))
  const { nodes: allNodes } = getMindmapElements(graph, rootData.mindmapId)
  for (const n of allNodes) {
    const d = n.getData() as MindmapNodeData | undefined
    if (d?.isSummary) continue

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
    node.setSize(nLayout.width, nLayout.height)
    node.setZIndex(10)
    const currentData = (node.getData() || {}) as MindmapNodeData
    const nodeText = currentData.text || (currentData.isRoot ? '思维导图' : '分支主题')
    node.setAttrByPath('textWrap/html', nodeText)

    // 同步标记图标
    const markersHtml = renderNodeMarkersHtml(currentData.markers)
    if (markersHtml) {
      node.setAttrByPath('markersWrap/html', markersHtml)
      node.setAttrByPath('markersWrap/style/display', 'inline-flex')
    } else {
      node.setAttrByPath('markersWrap/html', '')
      node.setAttrByPath('markersWrap/style/display', 'none')
    }

    if (currentData.manualSize) {
      node.setAttrByPath('textWrap/style/whiteSpace', 'pre-wrap')
      node.setAttrByPath('textWrap/style/wordBreak', 'break-all')
    } else {
      node.setAttrByPath('textWrap/style/whiteSpace', 'pre')
      node.setAttrByPath('textWrap/style/wordBreak', 'normal')
    }
    node.setData({
      ...currentData,
      side: nLayout.side,
      depth: nLayout.depth,
    })

    // 同步节点形状样式 (下划线 / 胶囊 / 卡片矩形 / 纯文本，默认统一为 rect 卡片矩形)
    const shapeStyle = currentData.shapeStyle || 'rect'
    const primaryColor = currentData.branch?.color || '#3b82f6'

    const ensurePort = (portId: 'left' | 'right', dy: number) => {
      if (node.hasPort?.(portId)) {
        node.setPortProp?.(portId, 'args', { dy })
      } else {
        node.addPort?.({
          id: portId,
          group: portId,
          args: { dy },
        })
      }
    }

    if (shapeStyle === 'underline') {
      node.setAttrByPath('body/fill', 'transparent')
      node.setAttrByPath('body/stroke', 'transparent')
      node.setAttrByPath('body/strokeWidth', 0)
      node.setAttrByPath('underline/display', 'block')
      node.setAttrByPath('underline/fill', primaryColor)
      node.setAttrByPath('underline/stroke', 'none')
      ensurePort('left', 13)
      ensurePort('right', 13)
    } else if (shapeStyle === 'none') {
      node.setAttrByPath('body/fill', 'transparent')
      node.setAttrByPath('body/stroke', 'transparent')
      node.setAttrByPath('body/strokeWidth', 0)
      node.setAttrByPath('underline/display', 'none')
      ensurePort('left', 0)
      ensurePort('right', 0)
    } else if (shapeStyle === 'capsule') {
      const rx = currentData.isRoot ? 21 : 16
      node.setAttrByPath('body/rx', rx)
      node.setAttrByPath('body/ry', rx)
      node.setAttrByPath('body/fill', currentData.fill || (currentData.isRoot ? '#f3f4f6' : '#ffffff'))
      node.setAttrByPath('body/stroke', currentData.stroke || primaryColor)
      node.setAttrByPath('body/strokeWidth', currentData.strokeWidth || 1.5)
      node.setAttrByPath('underline/display', 'none')
      ensurePort('left', 0)
      ensurePort('right', 0)
    } else if (shapeStyle === 'rect') {
      node.setAttrByPath('body/rx', currentData.isRoot ? 8 : 6)
      node.setAttrByPath('body/ry', currentData.isRoot ? 8 : 6)
      node.setAttrByPath('body/fill', currentData.fill || (currentData.isRoot ? '#f3f4f6' : '#ffffff'))
      node.setAttrByPath('body/stroke', currentData.stroke || (currentData.isRoot ? '#e5e7eb' : primaryColor))
      node.setAttrByPath('body/strokeWidth', currentData.strokeWidth || 1.5)
      node.setAttrByPath('underline/display', 'none')
      ensurePort('left', 0)
      ensurePort('right', 0)
    }

    // 同步节点内置控制手柄 (+ / 收起 / 折叠数字徽标)
    updateMindmapNodeHandle(graph, node)
  }

  // 3. 重建或更新分支连线 (平滑贝塞尔)
  const { edges: existingEdges } = getMindmapElements(graph, rootData.mindmapId)
  const existingEdgeMap = new Map<string, Edge>()
  for (const edge of existingEdges) {
    if (edge.getData()?.isSummaryEdge) continue
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
      })
      edge.setTarget({
        cell: edgeInfo.target,
        port: targetPort,
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
        },
        target: {
          cell: edgeInfo.target,
          port: targetPort,
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

  // 清除多余分支边 (排除概要大括号连线)
  for (const edge of existingEdges) {
    if (edge.getData()?.isSummaryEdge) continue
    const key = `${edge.getSourceCellId()}->${edge.getTargetCellId()}`
    if (!activeEdgeKeys.has(key)) {
      edge.remove()
    }
  }

  // 4. 更新概要节点与大括号连线布局
  const summaryNodes = allNodes.filter((n) => {
    const d = n.getData() as MindmapNodeData | undefined
    return d?.type === 'mindmap-node' && d?.isSummary && d?.summaryForId
  })

  for (const sNode of summaryNodes) {
    const sData = sNode.getData() as MindmapNodeData
    const parentNode = graph.getCellById(sData.summaryForId!) as Node | undefined
    const sEdge = getMindmapSummaryEdge(graph, sData.summaryForId!)

    if (!parentNode || !parentNode.isVisible()) {
      sNode.hide()
      if (sEdge) sEdge.hide()
      continue
    }

    sNode.show()
    const parentBBox = parentNode.getBBox()
    const isParentCollapsed = !!parentNode.getData()?.collapsed
    const directChildren = getMindmapChildren(graph, parentNode.id).filter((c) => c.isVisible())

    const side = (parentNode.getData() as MindmapNodeData)?.side || 'right'
    const isLeft = side === 'left'

    let topY: number
    let bottomY: number
    let bracketX: number
    let tipX: number

    const bracketW = 16

    if (!isParentCollapsed && directChildren.length > 0) {
      // 展开状态：包裹所有可见直接子节点
      const bboxes = directChildren.map((c) => c.getBBox())
      topY = Math.min(...bboxes.map((b) => b.y)) + 4
      bottomY = Math.max(...bboxes.map((b) => b.y + b.height)) - 4
      if (isLeft) {
        const minLeft = Math.min(...bboxes.map((b) => b.x))
        bracketX = minLeft - 14
        tipX = bracketX - bracketW
      } else {
        const maxRight = Math.max(...bboxes.map((b) => b.x + b.width))
        bracketX = maxRight + 14
        tipX = bracketX + bracketW
      }
    } else {
      // 折叠状态 或 无直接子节点：包裹父节点自身（位于收起手柄之后）
      topY = parentBBox.y + 4
      bottomY = parentBBox.y + parentBBox.height - 4
      if (isLeft) {
        bracketX = parentBBox.x - 26
        tipX = bracketX - bracketW
      } else {
        bracketX = parentBBox.x + parentBBox.width + 26
        tipX = bracketX + bracketW
      }
    }

    const midY = (topY + bottomY) / 2
    const sText = sData.text || '概要'
    const sMarkersCount = countNodeMarkers(sData.markers)
    const sWidth = calculateMindmapNodeWidth(sText, false, sMarkersCount)
    const sHeight = 32

    const nodeX = isLeft ? tipX - 8 - sWidth : tipX + 8
    sNode.position(nodeX, midY - sHeight / 2)
    sNode.setSize(sWidth, sHeight)
    sNode.setZIndex(10)
    sNode.setAttrByPath('textWrap/html', sText)

    sNode.setData({
      ...sData,
      side,
    })

    const sMarkersHtml = renderNodeMarkersHtml(sData.markers)
    if (sMarkersHtml) {
      sNode.setAttrByPath('markersWrap/html', sMarkersHtml)
      sNode.setAttrByPath('markersWrap/style/display', 'inline-flex')
    } else {
      sNode.setAttrByPath('markersWrap/html', '')
      sNode.setAttrByPath('markersWrap/style/display', 'none')
    }

    // 同步概要节点形状样式 (下划线 / 胶囊 / 卡片矩形 / 纯文本)
    const sShapeStyle = sData.shapeStyle || 'rect'
    const sPrimaryColor = '#8b5cf6'
    if (sShapeStyle === 'underline') {
      sNode.setAttrByPath('body/fill', 'transparent')
      sNode.setAttrByPath('body/stroke', 'transparent')
      sNode.setAttrByPath('body/strokeWidth', 0)
      sNode.setAttrByPath('underline/display', 'block')
      sNode.setAttrByPath('underline/fill', sPrimaryColor)
      sNode.setAttrByPath('underline/stroke', 'none')
    } else if (sShapeStyle === 'none') {
      sNode.setAttrByPath('body/fill', 'transparent')
      sNode.setAttrByPath('body/stroke', 'transparent')
      sNode.setAttrByPath('body/strokeWidth', 0)
      sNode.setAttrByPath('underline/display', 'none')
    } else if (sShapeStyle === 'capsule') {
      sNode.setAttrByPath('body/rx', 16)
      sNode.setAttrByPath('body/ry', 16)
      sNode.setAttrByPath('body/fill', sData.fill || '#ffffff')
      sNode.setAttrByPath('body/stroke', sData.stroke || sPrimaryColor)
      sNode.setAttrByPath('body/strokeWidth', sData.strokeWidth || 1.5)
      sNode.setAttrByPath('underline/display', 'none')
    } else {
      sNode.setAttrByPath('body/rx', 6)
      sNode.setAttrByPath('body/ry', 6)
      sNode.setAttrByPath('body/fill', sData.fill || '#ffffff')
      sNode.setAttrByPath('body/stroke', sData.stroke || sPrimaryColor)
      sNode.setAttrByPath('body/strokeWidth', sData.strokeWidth || 1.5)
      sNode.setAttrByPath('underline/display', 'none')
    }

    // 确保概要节点连接端口存在
    const targetPort = isLeft ? 'right' : 'left'
    if (!sNode.hasPort?.(targetPort)) {
      sNode.addPort?.({ id: targetPort, group: targetPort, args: { dy: 0 } })
    }

    if (sEdge) {
      sEdge.show()
      sEdge.setTarget({ cell: sNode.id, port: targetPort })
      sEdge.setConnector({
        name: 'mindmap-summary-bracket',
        args: {
          side,
          topY,
          bottomY,
          bracketX,
          tipX,
          midY,
        },
      })
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
      shapeStyle: 'rect',
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

  setTimeout(() => {
    graph.trigger('node:start-edit', { node: rootNode })
  }, 30)

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
        label: {
          text: childText,
        },
        underline: {
          display: 'none',
        },
        body: {
          refWidth: '100%',
          refHeight: '100%',
          rx: 6,
          ry: 6,
          fill: '#ffffff',
          stroke: branchColor,
          strokeWidth: 1.5,
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
        shapeStyle: 'rect',
        branch: {
          color: branchColor,
          width: 3,
          type: 'curve',
        },
      } as MindmapNodeData,
    })

  updateMindmapLayout(board, mindmapId)
  setTimeout(() => {
    graph.cleanSelection()
    graph.select(childNode)
    graph.trigger('selection:changed', { selected: [childNode] })
    graph.trigger('node:start-edit', { node: childNode })
  }, 20)
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

  // 如果是概要节点，直接删除概要节点与对应大括号连线
  if (data.isSummary && data.summaryForId) {
    const sEdge = getMindmapSummaryEdge(graph, data.summaryForId)
    if (sEdge) sEdge.remove()
    targetNode.remove()
    updateMindmapLayout(board, mindmapId)
    return
  }

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
        if (d.isSummary && d.summaryForId && toDelete.has(d.summaryForId)) {
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

  for (const e of edges) {
    const eData = e.getData() as any
    if (eData?.isSummaryEdge && eData.summaryForId && toDelete.has(eData.summaryForId)) {
      e.remove()
    }
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
 * 获取指定思维导图节点的直接子节点列表 (排除概要节点)
 */
export function getMindmapChildren(graph: Graph, parentId: string): Node[] {
  return graph.getNodes().filter((n) => {
    const data = n.getData() as MindmapNodeData | undefined
    return data?.type === 'mindmap-node' && data.parentId === parentId && !data.isSummary
  })
}

/**
 * 获取指定节点的概要节点 (若有)
 */
export function getMindmapSummaryNode(graph: Graph, parentId: string): Node | null {
  return (
    graph.getNodes().find((n) => {
      const data = n.getData() as MindmapNodeData | undefined
      return data?.type === 'mindmap-node' && data.isSummary && data.summaryForId === parentId
    }) || null
  )
}

/**
 * 获取指定节点的概要大括号连线 (若有)
 */
export function getMindmapSummaryEdge(graph: Graph, parentId: string): Edge | null {
  return (
    graph.getEdges().find((e) => {
      const data = e.getData() as any
      return data?.isSummaryEdge && data.summaryForId === parentId
    }) || null
  )
}

/**
 * 为指定节点添加概要 (汇总其直接子集)
 */
export function addMindmapSummary(board: Board, parentNodeId?: string): Node | null {
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
  // root 根节点与概要节点自身均不允许创建概要
  if (parentData.isRoot || parentData.isSummary) return null

  // 若已存在概要节点，直接定位选中并激活编辑
  const existingSummary = getMindmapSummaryNode(graph, parentNode.id)
  if (existingSummary) {
    graph.resetSelection([existingSummary])
    activateMindmapNodeTextEdit(board, existingSummary)
    return existingSummary
  }

  // 若该节点尚无直接子节点，为其默认创建一个子分支以形成概要组合
  const directChildren = getMindmapChildren(graph, parentNode.id)
  if (directChildren.length === 0) {
    addMindmapChild(board, parentNode.id)
  }

  const summaryId = `summary-${parentNode.id}-${Date.now().toString(36)}`
  const summaryNode = graph.createNode({
    id: summaryId,
    shape: 'speed-mindmap-node',
    data: {
      type: 'mindmap-node',
      mindmapId: parentData.mindmapId,
      isSummary: true,
      summaryForId: parentNode.id,
      parentId: parentNode.id,
      depth: (parentData.depth ?? 0) + 2,
      side: parentData.side || 'right',
      text: '概要',
      shapeStyle: 'rect',
    },
  })
  graph.addNode(summaryNode)

  const edgeId = `summary-edge-${parentNode.id}`
  const summaryEdge = graph.createEdge({
    id: edgeId,
    shape: 'speed-mindmap-summary-edge',
    source: { cell: parentNode.id },
    target: { cell: summaryId, port: 'left' },
    data: {
      isSummaryEdge: true,
      summaryForId: parentNode.id,
    },
  })
  graph.addEdge(summaryEdge)

  updateMindmapLayout(board, parentData.mindmapId)

  // 立即选中新建的概要节点并进入就地编辑
  requestAnimationFrame(() => {
    graph.resetSelection([summaryNode])
    activateMindmapNodeTextEdit(board, summaryNode)
  })

  return summaryNode
}

/**
 * 删除指定节点的概要
 */
export function deleteMindmapSummary(board: Board, parentNodeId: string): void {
  const graph = board.graph
  const summaryNode = getMindmapSummaryNode(graph, parentNodeId)
  const summaryEdge = getMindmapSummaryEdge(graph, parentNodeId)
  if (summaryNode) summaryNode.remove()
  if (summaryEdge) summaryEdge.remove()

  const parentNode = graph.getCellById(parentNodeId) as Node | undefined
  const mindmapId = parentNode?.getData()?.mindmapId
  if (mindmapId) {
    updateMindmapLayout(board, mindmapId)
  }
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
    // 情况 A：折叠状态 -> 仅常驻显示折叠数字徽标（点击展开），隐藏添加按钮保持清爽
    return `
      <div class="mindmap-native-handle ${side} is-collapsed" data-node-id="${node.id}">
        <div class="branch-anchor-dot" style="background-color: ${branchColor}"></div>
        <div class="branch-stub-line ${side}" style="background-color: ${branchColor}"></div>
        <div class="branch-count-badge ${side}" style="background-color: ${branchColor}" data-action="toggle-collapse" title="点击展开分支">
          ${children.length}
        </div>
      </div>
    `.trim()
  }

  if (hasChildren && !isCollapsed && !isRoot) {
    // 情况 B：展开状态且有子节点 -> 显示收起按钮 (<) 与添加按钮 (+)
    return `
      <div class="mindmap-native-handle ${side} is-expanded" data-node-id="${node.id}">
        <div class="branch-anchor-dot" style="background-color: ${branchColor}"></div>
        <div class="branch-stub-line is-expanded-with-children ${side}" style="background-color: ${branchColor}"></div>
        <div class="branch-collapse-btn ${side}" style="background-color: ${branchColor}" data-action="toggle-collapse" title="收起分支">
          <svg
            width="10"
            height="10"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            style="transform: ${side === 'left' ? 'rotate(180deg)' : 'none'}"
          >
            <path d="M10 3.5L5.5 8l4.5 4.5" />
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

  if (isRoot && hasChildren) {
    // 根节点已有子分支时，不在此侧连线上叠放加号，保持主干连线清爽无遮挡
    return ''
  }

  // 情况 C：无子节点的根节点或叶子节点 -> 显示添加按钮 (+)
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

  const isUnderline = !data.isRoot && data.shapeStyle === 'underline'
  node.setAttrByPath('handleGroup/refX', isLeft ? 0 : '100%')
  if (isUnderline) {
    node.setAttrByPath('handleGroup/refY', '100%')
    node.setAttrByPath('handleGroup/refY2', -1.5)
  } else {
    node.setAttrByPath('handleGroup/refY', '50%')
    node.removeAttrByPath('handleGroup/refY2')
  }
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
  if (!view || !view.container) {
    requestAnimationFrame(() => {
      activateMindmapNodeTextEdit(board, node, initialChar)
    })
    return
  }

  const textEl = view.container.querySelector('.mindmap-node-text') as HTMLDivElement | null
  if (!textEl) {
    requestAnimationFrame(() => {
      activateMindmapNodeTextEdit(board, node, initialChar)
    })
    return
  }

  // 避免重复挂载监听
  if (textEl.getAttribute('data-editing') === 'true') {
    if (initialChar) {
      textEl.innerText = initialChar
      const range = document.createRange()
      const sel = window.getSelection()
      range.selectNodeContents(textEl)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
    return
  }
  textEl.setAttribute('data-editing', 'true')

  const setTransformEditing = (editing: boolean) => {
    const transformWidgets = board.container.querySelectorAll<HTMLElement>('.x6-widget-transform')
    transformWidgets.forEach((w) => {
      w.classList.toggle('is-text-editing', editing)
      const resizes = w.querySelectorAll<HTMLElement>('.x6-widget-transform-resize, .x6-widget-transform-rotate')
      resizes.forEach((r) => {
        r.style.display = editing ? 'none' : ''
      })
    })
    const speedBoard = board.container.closest('.speed-board')
    if (speedBoard) {
      speedBoard.classList.toggle('is-inline-editing', editing)
    }
  }
  setTransformEditing(true)
  graph.trigger('node:edit:start', { node })

  textEl.setAttribute('data-editing', 'true')
  textEl.setAttribute('contenteditable', 'true')
  textEl.setAttribute('tabindex', '-1')
  textEl.style.userSelect = 'text'
  textEl.style.cursor = 'text'
  textEl.style.outline = 'none'

  const initialData = (node.getData() || {}) as MindmapNodeData
  const hasManualSize = !!initialData.manualSize
  if (hasManualSize) {
    textEl.style.whiteSpace = 'pre-wrap'
    textEl.style.wordBreak = 'break-all'
  } else {
    textEl.style.whiteSpace = 'pre'
    textEl.style.wordBreak = 'normal'
  }

  const stopProp = (e: Event) => {
    e.stopPropagation()
    // 用户主动点击光标定位时，立即退出全量替换占位符状态，转为正常就地插入
    isFirstType = false
  }
  textEl.addEventListener('pointerdown', stopProp)
  textEl.addEventListener('mousedown', stopProp)
  textEl.addEventListener('mouseup', stopProp)
  textEl.addEventListener('click', stopProp)
  textEl.addEventListener('dblclick', stopProp)

  const defaultPlaceholder = initialData.isRoot ? '思维导图' : '分支主题'
  let isFirstType = !initialData.text || initialData.text === defaultPlaceholder

  // 严格校验是否处于【全选占位文字】态，仅在全量选中状态下输入才执行清空替换；若光标已折叠/定位则绝不清空
  const isAllPlaceholderSelected = () => {
    if (!isFirstType) return false
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false
    const selectedText = sel.toString().trim()
    return selectedText.length > 0 && selectedText === textEl.innerText.trim()
  }

  const onCompositionStart = () => {
    if (isAllPlaceholderSelected()) {
      textEl.innerText = ''
    }
    isFirstType = false
  }

  const onBeforeInput = (e: InputEvent) => {
    if (isAllPlaceholderSelected() && e.inputType === 'insertText') {
      textEl.innerText = ''
      isFirstType = false
    }
  }

  const onCompositionEnd = () => {
    onInput()
  }

  textEl.addEventListener('compositionstart', onCompositionStart)
  textEl.addEventListener('compositionend', onCompositionEnd)
  textEl.addEventListener('beforeinput', onBeforeInput as any)

  requestAnimationFrame(() => {
    textEl.focus()

    if (initialChar) {
      textEl.innerText = initialChar
      isFirstType = false
      const range = document.createRange()
      const sel = window.getSelection()
      range.selectNodeContents(textEl)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
      onInput()
    } else {
      // 默认全选占位文字，打字直接全量替换
      const range = document.createRange()
      const sel = window.getSelection()
      range.selectNodeContents(textEl)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  })

  let finished = false
  const onInput = () => {
    const rawText = textEl.innerText
    const currData = (node.getData() || {}) as MindmapNodeData
    const isRoot = !!currData.isRoot
    const manual = !!currData.manualSize

    if (manual) {
      textEl.style.whiteSpace = 'pre-wrap'
      textEl.style.wordBreak = 'break-all'
      const manualWidth = typeof currData.manualSize === 'object' && currData.manualSize.width
        ? currData.manualSize.width
        : node.size().width
      const scrollH = textEl.scrollHeight
      const baseHeight = isRoot ? 42 : 32
      const targetHeight = Math.max(baseHeight, scrollH + 8)
      node.setSize(manualWidth, targetHeight)
    } else {
      textEl.style.whiteSpace = 'pre'
      textEl.style.wordBreak = 'normal'
      const calcW = calculateMindmapNodeWidth(rawText || (isRoot ? '思维导图' : '分支主题'), isRoot, countNodeMarkers(currData.markers))
      const lines = rawText.split('\n')
      const baseHeight = isRoot ? 42 : 32
      const lineH = (isRoot ? 16 : 14) * 1.45
      const targetHeight = lines.length > 1 ? Math.round(lines.length * lineH + 14) : baseHeight
      node.setSize(calcW, targetHeight)
    }
    board.syncSelectionBoxesTransform()
  }

  const commitEdit = () => {
    if (finished) return
    finished = true

    textEl.removeEventListener('keydown', onKeyDown)
    textEl.removeEventListener('input', onInput)
    textEl.removeEventListener('blur', onBlur)
    textEl.removeEventListener('pointerdown', stopProp)
    textEl.removeEventListener('mousedown', stopProp)
    textEl.removeEventListener('mouseup', stopProp)
    textEl.removeEventListener('click', stopProp)
    textEl.removeEventListener('dblclick', stopProp)
    textEl.removeEventListener('compositionstart', onCompositionStart)
    textEl.removeEventListener('compositionend', onCompositionEnd)
    textEl.removeEventListener('beforeinput', onBeforeInput as any)

    textEl.removeAttribute('data-editing')
    textEl.setAttribute('contenteditable', 'false')
    textEl.style.userSelect = 'none'
    textEl.style.cursor = 'default'
    setTransformEditing(false)
    graph.trigger('node:edit:end', { node })

    const rawText = textEl.innerText.trim()
    const currData = (node.getData() || {}) as MindmapNodeData
    const newText = rawText === '' ? (currData.isRoot ? '思维导图' : '分支主题') : rawText

    textEl.innerText = newText
    node.setData({
      ...currData,
      text: newText,
    })

    const isRoot = !!currData.isRoot
    const manual = !!currData.manualSize
    if (manual) {
      const manualWidth = typeof currData.manualSize === 'object' && currData.manualSize.width
        ? currData.manualSize.width
        : node.size().width
      const scrollH = textEl.scrollHeight
      const baseHeight = isRoot ? 42 : 32
      const targetHeight = Math.max(baseHeight, scrollH + 8)
      node.setSize(manualWidth, targetHeight)
    } else {
      const calcW = calculateMindmapNodeWidth(newText, isRoot, countNodeMarkers(currData.markers))
      const lines = newText.split('\n')
      const baseHeight = isRoot ? 42 : 32
      const lineH = (isRoot ? 16 : 14) * 1.45
      const targetHeight = lines.length > 1 ? Math.round(lines.length * lineH + 14) : baseHeight
      node.setSize(calcW, targetHeight)
    }
    updateMindmapLayout(board, currData.mindmapId)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
      isFirstType = false
    }

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
      // 确认保存并退出编辑态，聚焦保持选中当前节点（按 Enter 新增同级分支仅在选中态触发，不在编辑打字中强行触发）
      graph.cleanSelection()
      graph.select(node)
      graph.trigger('selection:changed', { selected: [node] })
      return
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      e.stopPropagation()
      commitEdit()
      // 确认保存并退出编辑态，聚焦保持选中当前节点
      graph.cleanSelection()
      graph.select(node)
      graph.trigger('selection:changed', { selected: [node] })
      return
    }
  }

  const onBlur = () => {
    commitEdit()
  }

  textEl.addEventListener('keydown', onKeyDown)
  textEl.addEventListener('input', onInput)
  textEl.addEventListener('blur', onBlur)
}

