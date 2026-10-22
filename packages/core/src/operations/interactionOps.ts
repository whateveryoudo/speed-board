import type { Node, Edge } from '@antv/x6'
import type { Board } from '../Board'
import { findClosestPort } from './portSnapping'
import { activateNodeTextEdit } from './textOps'

/**
 * 画布核心交互控制器 (图元旋转度数徽标、连线两端箭头抓手手柄、端点拖拽磁吸、双击就地文本编辑)
 * 全部下沉至 Core 引擎，0 外部 UI 浮层，0 像素抖动
 */
export function initAllCanvasInteractions(board: Board): () => void {
  const cleanupFns: Array<() => void> = []

  // 1. 原生 In-Stage 旋转实时度数指示气泡
  let tempRotationBadge: SVGGElement | null = null

  const formatDegree = (angle: number): string => {
    let raw = Math.round(angle) % 360
    if (raw > 180) raw -= 360
    else if (raw <= -180) raw += 360
    return `${raw}°`
  }

  const updateRotationBadge = (node: Node) => {
    const stage = board.drawingController.getStage()
    if (!stage) return

    if (!tempRotationBadge) {
      tempRotationBadge = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      tempRotationBadge.setAttribute('class', 'speed-native-rotation-badge')
      tempRotationBadge.setAttribute('style', 'pointer-events: none;')
      stage.appendChild(tempRotationBadge)
    }

    const bbox = node.getBBox()
    const cx = bbox.x + bbox.width / 2
    const cy = bbox.y + bbox.height + 28
    const rectW = 38
    const rectH = 20
    const text = formatDegree(node.getAngle() || 0)

    tempRotationBadge.innerHTML = `
      <rect x="${(cx - rectW / 2).toFixed(1)}" y="${(cy - rectH / 2).toFixed(1)}" width="${rectW}" height="${rectH}" rx="4" ry="4" fill="rgba(30, 30, 30, 0.9)" />
      <text x="${cx.toFixed(1)}" y="${(cy + 4).toFixed(1)}" fill="#ffffff" font-size="12" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" text-anchor="middle" font-weight="500">${text}</text>
    `
  }

  const clearRotationBadge = () => {
    if (tempRotationBadge && tempRotationBadge.parentNode) {
      tempRotationBadge.parentNode.removeChild(tempRotationBadge)
      tempRotationBadge = null
    }
  }

  const onRotating = (args: any) => {
    const node = args?.node || args?.cell
    if (node && node.isNode && node.isNode()) {
      updateRotationBadge(node)
    }
  }

  board.graph.on('node:rotate', onRotating)
  board.graph.on('node:rotating', onRotating)
  board.graph.on('cell:change:angle', onRotating)
  board.graph.on('node:rotated', clearRotationBadge)

  cleanupFns.push(() => {
    board.graph.off('node:rotate', onRotating)
    board.graph.off('node:rotating', onRotating)
    board.graph.off('cell:change:angle', onRotating)
    board.graph.off('node:rotated', clearRotationBadge)
    clearRotationBadge()
  })

  // 2. 选中边挂载两端箭头手柄与单选图形展示连接桩
  let prevSelectedEdges: Edge[] = []
  let prevSelectedShapeNode: Node | null = null

  const onSelectionChanged = ({ selected }: any) => {
    const selectedNodes = (selected || []).filter((c: any) => c && c.isNode && c.isNode())
    const singleNode = selectedNodes.length === 1 && board.isShapeNode(selectedNodes[0]) ? selectedNodes[0] : null

    if (prevSelectedShapeNode !== singleNode) {
      if (prevSelectedShapeNode) {
        board.showNodePorts(prevSelectedShapeNode, false)
      }
      prevSelectedShapeNode = singleNode
      if (singleNode) {
        board.showNodePorts(singleNode, true)
      }
    } else if (singleNode) {
      board.showNodePorts(singleNode, true)
    }

    const isMulti = (selected || []).length > 1
    const currentSelectedEdges = isMulti
      ? []
      : (selected || []).filter(
          (c: any) => c && c.isEdge && c.isEdge() && c.getData()?.type !== 'mindmap-edge'
        )

    for (const edge of prevSelectedEdges) {
      if (!currentSelectedEdges.includes(edge)) {
        try {
          edge.removeTools()
        } catch {}
      }
    }

    for (const edge of currentSelectedEdges) {
      if (!prevSelectedEdges.includes(edge)) {
        try {
          const lineColor =
            edge.getAttrByPath('line/stroke') ||
            edge.getData()?.stroke ||
            '#374151'

          const hasTargetMarker = !!edge.getAttrByPath('line/targetMarker')
          const hasSourceMarker = !!edge.getAttrByPath('line/sourceMarker')

          edge.addTools([
            {
              name: 'source-arrowhead',
              args: {
                attrs: {
                  d: hasSourceMarker
                    ? 'M -8 0 A 4 4 0 1 0 0 0 A 4 4 0 1 0 -8 0 Z'
                    : 'M -4 0 A 4 4 0 1 0 4 0 A 4 4 0 1 0 -4 0 Z',
                  fill: '#ffffff',
                  stroke: lineColor,
                  'stroke-width': 1.5,
                  cursor: 'move',
                },
              },
            },
            {
              name: 'target-arrowhead',
              args: {
                attrs: {
                  d: hasTargetMarker
                    ? 'M 0 0 A 4 4 0 1 0 8 0 A 4 4 0 1 0 0 0 Z'
                    : 'M -4 0 A 4 4 0 1 0 4 0 A 4 4 0 1 0 -4 0 Z',
                  fill: '#ffffff',
                  stroke: lineColor,
                  'stroke-width': 1.5,
                  cursor: 'move',
                },
              },
            },
          ])
        } catch {}
      }
    }
    prevSelectedEdges = currentSelectedEdges
  }

  const onEdgeAttrsChanged = ({ edge }: any) => {
    try {
      if (board.graph.isSelected(edge)) {
        const lineColor =
          edge.getAttrByPath('line/stroke') ||
          edge.getData()?.stroke ||
          '#374151'
        const hasTargetMarker = !!edge.getAttrByPath('line/targetMarker')
        const hasSourceMarker = !!edge.getAttrByPath('line/sourceMarker')

        const toolItems = edge.getTools()?.items || []
        toolItems.forEach((tool: any) => {
          if (tool.name === 'source-arrowhead') {
            tool.setAttrs(
              {
                stroke: lineColor,
                d: hasSourceMarker
                  ? 'M -8 0 A 4 4 0 1 0 0 0 A 4 4 0 1 0 -8 0 Z'
                  : 'M -4 0 A 4 4 0 1 0 4 0 A 4 4 0 1 0 -4 0 Z',
              },
              tool.container
            )
          } else if (tool.name === 'target-arrowhead') {
            tool.setAttrs(
              {
                stroke: lineColor,
                d: hasTargetMarker
                  ? 'M 0 0 A 4 4 0 1 0 8 0 A 4 4 0 1 0 0 0 Z'
                  : 'M -4 0 A 4 4 0 1 0 4 0 A 4 4 0 1 0 -4 0 Z',
              },
              tool.container
            )
          }
        })
      }
    } catch {}
  }

  board.graph.on('selection:changed', onSelectionChanged)
  board.graph.on('edge:change:attrs', onEdgeAttrsChanged)

  cleanupFns.push(() => {
    board.graph.off('selection:changed', onSelectionChanged)
    board.graph.off('edge:change:attrs', onEdgeAttrsChanged)
  })

  // 3. 端点箭头抓手拖拽与磁吸连接交互
  let isDraggingArrowhead = false
  let currentDraggingEdge: any = null
  let currentDraggingType: 'source' | 'target' | null = null
  let lastArrowheadType: 'source' | 'target' | null = null
  let currentActiveSnapResult: any = null

  const onPointerDownCapture = (e: PointerEvent) => {
    const target = e.target as HTMLElement | SVGElement | null
    if (target?.closest?.('.x6-edge-tool-source-arrowhead')) {
      lastArrowheadType = 'source'
    } else if (target?.closest?.('.x6-edge-tool-target-arrowhead')) {
      lastArrowheadType = 'target'
    } else {
      lastArrowheadType = null
    }
  }

  board.container.addEventListener('pointerdown', onPointerDownCapture, true)

  const onBatchStart = ({ name }: any) => {
    if (name === 'move-arrowhead') {
      isDraggingArrowhead = true
      currentDraggingEdge = board.graph.getSelectedCells().find((c: any) => c && c.isEdge && c.isEdge())
      currentDraggingType = lastArrowheadType || 'target'
      currentActiveSnapResult = null
      board.container.classList.add('is-dragging-arrowhead')
    }
  }

  const onArrowheadPointerMove = (e: PointerEvent) => {
    if (!isDraggingArrowhead || !currentDraggingEdge) return

    const graph = board.graph
    const localPt = graph.clientToLocal(e.clientX, e.clientY)

    const portResult = findClosestPort(board, localPt, 35)

    const otherEndCellId =
      currentDraggingType === 'target'
        ? currentDraggingEdge.getSourceCellId?.()
        : currentDraggingEdge.getTargetCellId?.()
    const isSelfLoop = !!(otherEndCellId && portResult && otherEndCellId === portResult.node.id)

    if (portResult && !isSelfLoop && portResult.node.id !== currentDraggingEdge.id) {
      const activePortId = portResult.isCenterPort ? portResult.port : undefined
      board.showNodePorts(portResult.node, true, activePortId)
      currentActiveSnapResult = portResult

      if (currentDraggingType) {
        if (portResult.isCenterPort && portResult.port) {
          currentDraggingEdge.setTerminal(
            currentDraggingType,
            {
              cell: portResult.node.id,
              port: portResult.port,
            },
            {},
            { ui: true }
          )
        } else {
          currentDraggingEdge.setTerminal(
            currentDraggingType,
            {
              cell: portResult.node.id,
              anchor: {
                name: portResult.edge,
                args: {
                  dx:
                    portResult.edge === 'top' || portResult.edge === 'bottom'
                      ? portResult.delta
                      : 0,
                  dy:
                    portResult.edge === 'left' || portResult.edge === 'right'
                      ? portResult.delta
                      : 0,
                  rotate: true,
                },
              },
            },
            {},
            { ui: true }
          )
        }
      }
    } else {
      if (currentActiveSnapResult) {
        board.showNodePorts(currentActiveSnapResult.node, false)
        currentActiveSnapResult = null
      }
    }
  }

  const onArrowheadDragStop = () => {
    if (!isDraggingArrowhead) return

    const snapResult = currentActiveSnapResult
    const edge = currentDraggingEdge
    const type = currentDraggingType

    if (snapResult && edge && type) {
      if (snapResult.isCenterPort && snapResult.port) {
        edge.setTerminal(type, {
          cell: snapResult.node.id,
          port: snapResult.port,
        })
      } else {
        edge.setTerminal(type, {
          cell: snapResult.node.id,
          anchor: {
            name: snapResult.edge,
            args: {
              dx:
                snapResult.edge === 'top' || snapResult.edge === 'bottom'
                  ? snapResult.delta
                  : 0,
              dy:
                snapResult.edge === 'left' || snapResult.edge === 'right'
                  ? snapResult.delta
                  : 0,
              rotate: true,
            },
          },
        })
      }
    }

    isDraggingArrowhead = false
    currentDraggingEdge = null
    currentDraggingType = null
    currentActiveSnapResult = null
    lastArrowheadType = null
    board.container.classList.remove('is-dragging-arrowhead')
    board.hideAllPorts()
  }

  const onBatchStop = ({ name }: any) => {
    if (name === 'move-arrowhead') {
      onArrowheadDragStop()
    }
  }

  board.graph.on('batch:start', onBatchStart)
  board.graph.on('batch:stop', onBatchStop)
  window.addEventListener('pointermove', onArrowheadPointerMove)
  window.addEventListener('pointerup', onArrowheadDragStop)

  cleanupFns.push(() => {
    board.container.removeEventListener('pointerdown', onPointerDownCapture, true)
    board.graph.off('batch:start', onBatchStart)
    board.graph.off('batch:stop', onBatchStop)
    window.removeEventListener('pointermove', onArrowheadPointerMove)
    window.removeEventListener('pointerup', onArrowheadDragStop)
  })

  // 3. 点击连接桩弹出快捷连线面板与从连接桩拖拽拉线
  let portDownInfo: { node: any; port: string; clientX: number; clientY: number } | null = null
  let isPortDragging = false

  const onPortPointerDown = ({ node, port, e }: any) => {
    if (board.isShapeNode(node)) {
      portDownInfo = {
        node,
        port: typeof port === 'string' ? port.replace(/^port-/, '') : port,
        clientX: e.clientX,
        clientY: e.clientY,
      }
      isPortDragging = false
    }
  }

  const onPortGlobalPointerMove = (e: PointerEvent) => {
    if (!portDownInfo) return
    if (!isPortDragging) {
      const dx = Math.abs(e.clientX - portDownInfo.clientX)
      const dy = Math.abs(e.clientY - portDownInfo.clientY)
      if (dx > 3 || dy > 3) {
        isPortDragging = true
        board.drawingController.startLineFromPort(
          portDownInfo.node,
          portDownInfo.port,
          { clientX: e.clientX, clientY: e.clientY }
        )
      }
    }
  }

  const onPortGlobalPointerUp = () => {
    portDownInfo = null
    setTimeout(() => {
      isPortDragging = false
    }, 50)
  }

  const onPortClick = ({ node, port, e }: any) => {
    if (isPortDragging) return
    if (board.isShapeNode(node)) {
      e?.stopPropagation()
      board.onPortQuickConnect?.({
        node,
        port: typeof port === 'string' ? port.replace(/^port-/, '') : port,
        clientPos: { x: e.clientX, y: e.clientY },
      })
    }
  }

  board.graph.on('node:port:pointerdown', onPortPointerDown)
  board.graph.on('node:port:click', onPortClick)
  window.addEventListener('pointermove', onPortGlobalPointerMove)
  window.addEventListener('pointerup', onPortGlobalPointerUp)

  cleanupFns.push(() => {
    board.graph.off('node:port:pointerdown', onPortPointerDown)
    board.graph.off('node:port:click', onPortClick)
    window.removeEventListener('pointermove', onPortGlobalPointerMove)
    window.removeEventListener('pointerup', onPortGlobalPointerUp)
  })

  // 4. 双击与键盘就地文本编辑
  const onNodeDblClick = ({ node }: any) => {
    if (
      board.isTextNode(node) ||
      board.isShapeNode(node) ||
      node.getData()?.type === 'mindmap-node'
    ) {
      activateNodeTextEdit(board, node)
    }
  }

  board.graph.on('node:dblclick', onNodeDblClick)

  cleanupFns.push(() => {
    board.graph.off('node:dblclick', onNodeDblClick)
  })

  return () => {
    for (const fn of cleanupFns) {
      fn()
    }
  }
}
