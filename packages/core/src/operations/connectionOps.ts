import type { Node, Edge } from '@antv/x6'
import type { Board } from '../Board'

/**
 * 显示或隐藏指定图形节点的连接桩（Ports），并呈现柔和浅蓝触碰高亮与桩点高亮 (1:1 语雀交互)
 */
export function showNodePorts(
  board: Board,
  node: Node | string | null,
  visible: boolean,
  activePortId?: string,
  highlightBody: boolean = false
) {
  if (!node) return
  const cell = typeof node === 'string' ? board.graph.getCellById(node) : node
  if (!cell || !cell.isNode()) return
  const isShape = board.isShapeNode(cell)
  const isMind = cell.getData()?.type === 'mindmap-node'
  if (!isShape && !isMind) return

  const view = board.graph.findViewByCell(cell)
  if (view && view.container) {
    const size = cell.size() || { width: 0, height: 0 }
    const rx = isMind ? (cell.getData()?.isRoot ? '8' : '6') : '4'

    const getSelector = (name: string): SVGRectElement | null => {
      const s = (view as any).selectors?.[name]
      if (s) return (Array.isArray(s) ? s[0] : s) as SVGRectElement
      return (view.container.querySelector(`[data-selector="${name}"]`) ||
        view.container.querySelector(`.x6-node-${name}`)) as SVGRectElement | null
    }

    if (highlightBody) {
      const bgEl = getSelector('bg')
      const bodyEl = getSelector('body') || (view.container.querySelector('rect') as SVGRectElement | null)

      if (bgEl) {
        if (visible) {
          if (size.width > 0 && size.height > 0) {
            bgEl.setAttribute('width', `${size.width}`)
            bgEl.setAttribute('height', `${size.height}`)
            bgEl.setAttribute('x', '0')
            bgEl.setAttribute('y', '0')
          }
          bgEl.setAttribute('fill', 'rgba(59, 130, 246, 0.08)')
          bgEl.setAttribute('stroke', '#3b82f6')
          bgEl.setAttribute('stroke-width', '1.5')
          bgEl.setAttribute('rx', rx)
          bgEl.setAttribute('ry', rx)
        } else {
          bgEl.setAttribute('fill', 'transparent')
          bgEl.setAttribute('stroke', 'transparent')
          bgEl.setAttribute('stroke-width', '0')
        }
      }

      // 将触碰高亮同步施加在其可视主体 body 矩形上，确保 100% 呈现边框和浅蓝填充
      if (bodyEl && (isMind || !bgEl)) {
        if (visible) {
          if (!bodyEl.dataset.origFill) {
            bodyEl.dataset.origFill = bodyEl.getAttribute('fill') || 'transparent'
            bodyEl.dataset.origStroke = bodyEl.getAttribute('stroke') || 'transparent'
            bodyEl.dataset.origStrokeWidth = bodyEl.getAttribute('stroke-width') || '0'
            bodyEl.dataset.origRx = bodyEl.getAttribute('rx') || '0'
          }
          bodyEl.setAttribute('fill', 'rgba(59, 130, 246, 0.08)')
          bodyEl.setAttribute('stroke', '#3b82f6')
          bodyEl.setAttribute('stroke-width', '1.5')
          bodyEl.setAttribute('rx', rx)
          bodyEl.setAttribute('ry', rx)
        } else {
          if (bodyEl.dataset.origFill !== undefined) {
            bodyEl.setAttribute('fill', bodyEl.dataset.origFill)
            bodyEl.setAttribute('stroke', bodyEl.dataset.origStroke || 'transparent')
            bodyEl.setAttribute('stroke-width', bodyEl.dataset.origStrokeWidth || '0')
            bodyEl.setAttribute('rx', bodyEl.dataset.origRx || '0')
            bodyEl.setAttribute('ry', bodyEl.dataset.origRx || '0')
            delete bodyEl.dataset.origFill
            delete bodyEl.dataset.origStroke
            delete bodyEl.dataset.origStrokeWidth
            delete bodyEl.dataset.origRx
          } else {
            bodyEl.setAttribute('fill', 'transparent')
            bodyEl.setAttribute('stroke', 'transparent')
            bodyEl.setAttribute('stroke-width', '0')
          }
        }
      }
    }

    const ports = view.container.querySelectorAll<SVGGElement>('.x6-port')
    ports.forEach((p) => {
      const circle = p.querySelector<SVGCircleElement>('circle')
      if (!circle) return
      if (!visible) {
        circle.style.opacity = '0'
        circle.style.pointerEvents = 'none'
      } else {
        circle.style.opacity = '1'
        circle.style.pointerEvents = 'auto'
        circle.style.cursor = 'crosshair'
        const portId =
          p.getAttribute('data-port') ||
          p.getAttribute('port') ||
          circle.getAttribute('port') ||
          circle.getAttribute('data-port')
        if (activePortId && portId === activePortId) {
          circle.setAttribute('r', '5')
          circle.setAttribute('fill', '#2563eb')
          circle.setAttribute('stroke', '#2563eb')
          circle.setAttribute('stroke-width', '1')
        } else {
          circle.setAttribute('r', '4')
          circle.setAttribute('fill', '#ffffff')
          circle.setAttribute('stroke', '#3b82f6')
          circle.setAttribute('stroke-width', '1.5')
        }
      }
    })
  }
}

/**
 * 隐藏画布上所有图形节点的连接桩
 */
export function hideAllPorts(board: Board) {
  const nodes = board.graph.getNodes()
  nodes.forEach((node) => {
    showNodePorts(board, node, false)
  })
}

/**
 * 批量切换所有图形节点的真实连接桩（Ports）显示状态
 */
export function toggleAllPortsVisibility(board: Board, visible: boolean) {
  if (!visible) {
    hideAllPorts(board)
  } else {
    const nodes = board.graph.getNodes()
    nodes.forEach((node) => {
      if (board.isShapeNode(node)) {
        showNodePorts(board, node, true)
      }
    })
  }
}

/**
 * 自动连接两个节点端口 (支持曼哈顿正交折线 + 箭头)
 */
export function connectNodes(
  board: Board,
  options: {
    source: Node | string
    target: Node | string
    sourcePort?: string
    targetPort?: string
    stroke?: string
    strokeWidth?: number
  }
): Edge {
  const edge = board.graph.addEdge({
    shape: 'edge',
    source: {
      cell: typeof options.source === 'string' ? options.source : options.source.id,
      port: options.sourcePort || 'right',
    },
    target: {
      cell: typeof options.target === 'string' ? options.target : options.target.id,
      port: options.targetPort || 'left',
    },
    attrs: {
      line: {
        stroke: options.stroke || '#93c5fd',
        strokeWidth: options.strokeWidth || 2,
        targetMarker: {
          name: 'block',
          width: 9,
          height: 6,
          offset: 0,
        },
      },
    },
    router: {
      name: 'manhattan',
      args: {
        padding: 10,
      },
    },
    connector: {
      name: 'rounded',
      args: {
        radius: 8,
      },
    },
  })
  return edge
}

/**
 * 添加独立连线/箭头 (支持箭头线、直线、正交折线、曲线)
 */
export function addLine(
  board: Board,
  options: {
    type?: 'arrow' | 'straight' | 'elbow' | 'curve'
    source?: { x: number; y: number } | { cell: string; port?: string; anchor?: any; connectionPoint?: any }
    target?: { x: number; y: number } | { cell: string; port?: string; anchor?: any; connectionPoint?: any }
    stroke?: string
    strokeWidth?: number
    strokeDasharray?: string
  } = {}
): Edge {
  const center = board.getViewportCenter()
  const source = options.source || { x: Math.round(center.x - 70), y: Math.round(center.y) }
  const target = options.target || { x: Math.round(center.x + 70), y: Math.round(center.y) }
  const type = options.type || 'straight'

  const attrs: any = {
    line: {
      stroke: options.stroke || '#374151',
      strokeWidth: options.strokeWidth || 2,
      strokeDasharray: options.strokeDasharray && options.strokeDasharray !== 'none' ? options.strokeDasharray : undefined,
      targetMarker: {
        name: 'block',
        width: 9,
        height: 6,
        offset: 0,
      },
    },
  }

  const edgeConfig: any = {
    shape: 'edge',
    source,
    target,
    attrs,
    connectionPoint: 'anchor',
  }

  if (type === 'elbow') {
    edgeConfig.router = {
      name: 'manhattan',
      args: { padding: 10 },
    }
    edgeConfig.connector = {
      name: 'rounded',
      args: { radius: 8 },
    }
  } else if (type === 'curve') {
    edgeConfig.router = {
      name: 'normal',
    }
    edgeConfig.connector = {
      name: 'smooth',
    }
  } else {
    edgeConfig.router = {
      name: 'normal',
    }
    edgeConfig.connector = {
      name: 'normal',
    }
  }

  const edge = board.graph.addEdge(edgeConfig)
  board.graph.cleanSelection()
  board.graph.select(edge)
  return edge
}
