import type { Node } from '@antv/x6'
import type { Board, AddShapeOptions } from '../Board'
import { measureTextWidth } from '@speed-board/shared'
import { getShapePortsConfig } from '../nodes/shapePorts'

/**
 * 添加通用基础图形
 */
export function addShape(board: Board, options: AddShapeOptions): Node {
  const center = board.getViewportCenter()
  const x = options.x ?? (center.x - (options.width ?? 100) / 2)
  const y = options.y ?? (center.y - (options.height ?? 60) / 2)

  let node: Node

  switch (options.shape) {
    case 'circle':
      node = board.graph.addNode({
        shape: 'circle',
        x,
        y,
        width: options.width ?? 80,
        height: options.height ?? 80,
        ports: getShapePortsConfig('circle'),
        attrs: {
          body: {
            fill: options.fill ?? '#ffffff',
            stroke: options.stroke ?? '#4b5563',
            strokeWidth: options.strokeWidth ?? 1.5,
          },
          label: {
            text: options.text ?? '',
            fontSize: 14,
            fill: '#1f2937',
          },
        },
        data: {
          type: 'shape',
          shapeId: 'circle',
          fill: options.fill ?? '#ffffff',
          stroke: options.stroke ?? '#4b5563',
          strokeWidth: options.strokeWidth ?? 1.5,
        },
      })
      break

    case 'diamond':
      node = board.graph.addNode({
        shape: 'polygon',
        x,
        y,
        width: options.width ?? 100,
        height: options.height ?? 80,
        points: '0,40 50,0 100,40 50,80',
        ports: getShapePortsConfig('diamond'),
        attrs: {
          body: {
            fill: options.fill ?? '#ffffff',
            stroke: options.stroke ?? '#4b5563',
            strokeWidth: options.strokeWidth ?? 1.5,
          },
          label: {
            text: options.text ?? '',
            fontSize: 14,
            fill: '#1f2937',
          },
        },
        data: {
          type: 'shape',
          shapeId: 'diamond',
          fill: options.fill ?? '#ffffff',
          stroke: options.stroke ?? '#4b5563',
          strokeWidth: options.strokeWidth ?? 1.5,
        },
      })
      break

    case 'text': {
      const textVal = options.text || '文本'
      const fs = options.fontSize || 14
      const font = `${fs}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
      const measuredW = measureTextWidth(textVal, font)
      const w = options.width ?? Math.max(36, Math.round(measuredW + 8))
      const h = options.height ?? 28
      node = board.graph.addNode({
        shape: 'speed-text-node',
        x,
        y,
        width: w,
        height: h,
        attrs: {
          textWrap: {
            html: textVal,
            style: {
              fontSize: `${fs}px`,
              color: options.fill || '#262626',
            },
          },
          label: {
            text: textVal,
            fontSize: fs,
            fill: options.fill || '#262626',
            textAnchor: 'middle',
            textVerticalAnchor: 'middle',
            refX: '50%',
            refY: '50%',
          },
        },
        data: {
          type: 'text',
          text: options.text || '文本',
          link: options.link || '',
          fontSize: options.fontSize || 14,
          fill: options.fill || '#262626',
          bold: false,
          italic: false,
          strike: false,
          underline: false,
          align: 'center',
          verticalAlign: 'middle',
        },
      })
      break
    }

    case 'sticky':
      node = board.graph.addNode({
        shape: 'speed-sticky-node',
        x,
        y,
        width: options.width ?? 120,
        height: options.height ?? 120,
        attrs: {
          body: {
            fill: options.fill ?? '#fef3c7',
            stroke: options.stroke ?? '#f59e0b',
          },
          label: {
            text: options.text || '便签内容',
          },
        },
      })
      break

    case 'icon':
      node = board.graph.addNode({
        shape: 'speed-icon-node',
        x,
        y,
        width: options.width ?? 64,
        height: options.height ?? 64,
        attrs: {
          iconGroup: {
            html: options.svg || '',
          },
          label: {
            text: options.iconName || '',
          },
        },
      })
      break

    case 'shape':
      node = board.graph.addNode({
        shape: 'speed-shape-node',
        x,
        y,
        width: options.width ?? 100,
        height: options.height ?? 80,
        ports: getShapePortsConfig(options.shapeId || 'rect'),
        attrs: {
          shapeBody: {
            html: options.svgContent || options.svg || '',
            opacity: options.opacity ?? 1,
            viewBox: options.viewBox || '6 6 20 20',
            preserveAspectRatio: 'none',
          },
          textWrap: {
            html: options.text || '',
            style: {
              textAlign: options.align || 'center',
              fontSize: `${options.fontSize ?? 14}px`,
              color: options.textColor ?? '#1f2937',
            },
          },
          label: {
            text: options.text ?? '',
            fontSize: options.fontSize ?? 14,
            fill: options.textColor ?? '#1f2937',
            textAnchor: 'middle',
            textVerticalAnchor: 'middle',
            refX: '50%',
            refY: '50%',
          },
        },
        data: {
          type: 'shape',
          shapeId: options.shapeId || 'rect',
          shapeName: options.shapeName || options.shapeId || '矩形',
          svgContent: options.svgContent || options.svg || '',
          viewBox: options.viewBox || '6 6 20 20',
          fill: options.fill ?? '#ffffff',
          stroke: options.stroke ?? '#374151',
          strokeWidth: options.strokeWidth ?? 2,
          strokeDasharray: options.strokeDasharray ?? 'none',
          opacity: options.opacity ?? 1,
          text: options.text ?? '',
          fontSize: options.fontSize ?? 14,
          textColor: options.textColor ?? '#1f2937',
          bold: false,
          italic: false,
          strike: false,
          underline: false,
          align: 'center',
          verticalAlign: 'middle',
        },
      })
      break

    case 'rect':
    default:
      node = board.graph.addNode({
        shape: 'rect',
        x,
        y,
        width: options.width ?? 120,
        height: options.height ?? 60,
        ports: getShapePortsConfig('rect'),
        attrs: {
          body: {
            fill: options.fill ?? '#ffffff',
            stroke: options.stroke ?? '#4b5563',
            strokeWidth: options.strokeWidth ?? 1.5,
            rx: 6,
            ry: 6,
          },
          label: {
            text: options.text ?? '',
            fontSize: 14,
            fill: '#1f2937',
            textAnchor: 'middle',
            textVerticalAnchor: 'middle',
            refX: '50%',
            refY: '50%',
          },
        },
        data: {
          type: 'shape',
          shapeId: 'rect',
          fill: options.fill ?? '#ffffff',
          stroke: options.stroke ?? '#4b5563',
          strokeWidth: options.strokeWidth ?? 1.5,
          text: options.text ?? '',
          align: 'center',
          verticalAlign: 'middle',
        },
      })
      break
  }

  board.graph.cleanSelection()
  board.graph.select(node)
  return node
}

/**
 * 插入 Iconfont / SVG 矢量图标
 */
export function addSvgIcon(
  board: Board,
  options: { svg: string; name?: string; width?: number; height?: number; x?: number; y?: number }
): Node {
  const width = options.width ?? 64
  const height = options.height ?? 64
  const center = board.getViewportCenter()
  const x = options.x ?? (center.x - width / 2)
  const y = options.y ?? (center.y - height / 2)

  const viewBoxMatch = options.svg.match(/viewBox="([^"]+)"/i)
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24'
  const bodyMatch = options.svg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i)
  const svgBody = bodyMatch ? bodyMatch[1] : options.svg

  const node = board.graph.addNode({
    shape: 'speed-shape-node',
    x,
    y,
    width,
    height,
    attrs: {
      bg: {
        fill: 'transparent',
        stroke: 'transparent',
        strokeWidth: 0,
      },
      shapeBody: {
        html: svgBody,
        viewBox,
        fill: '#333333',
        color: '#333333',
        preserveAspectRatio: 'xMidYMid meet',
      },
      label: {
        text: '',
      },
    },
    data: {
      type: 'icon',
      iconName: options.name || '',
      svg: options.svg,
      viewBox,
    },
  })

  board.graph.cleanSelection()
  board.graph.select(node)
  return node
}

/**
 * 插入全量矢量图形库中的图形节点
 */
export function addVectorShape(
  board: Board,
  options: {
    shapeId: string
    shapeName?: string
    svgContent: string
    viewBox?: string
    x?: number
    y?: number
    width?: number
    height?: number
    fill?: string
    stroke?: string
    strokeWidth?: number
    strokeDasharray?: string
    opacity?: number
    text?: string
  }
): Node {
  return board.addShape({
    shape: 'shape' as any,
    shapeId: options.shapeId,
    shapeName: options.shapeName,
    svgContent: options.svgContent,
    viewBox: options.viewBox,
    x: options.x,
    y: options.y,
    width: options.width ?? 100,
    height: options.height ?? 80,
    fill: options.fill ?? '#ffffff',
    stroke: options.stroke ?? '#374151',
    strokeWidth: options.strokeWidth ?? 2,
    strokeDasharray: options.strokeDasharray ?? 'none',
    opacity: options.opacity ?? 1,
    text: options.text ?? '',
  })
}

/**
 * 更新指定矢量图形节点属性
 */
export function updateShapeNode(
  board: Board,
  nodeOrId: Node | string,
  options: {
    svgContent?: string
    viewBox?: string
    tightViewBox?: string
    shapeId?: string
    shapeName?: string
    fill?: string
    stroke?: string
    strokeWidth?: number
    strokeDasharray?: string
    opacity?: number
    text?: string
    fontSize?: number
    textColor?: string
    bold?: boolean
    italic?: boolean
    strike?: boolean
    underline?: boolean
    align?: 'left' | 'center' | 'right' | 'justify'
    verticalAlign?: 'top' | 'middle' | 'bottom'
  }
) {
  let node = typeof nodeOrId === 'string' ? (board.graph.getCellById(nodeOrId) as Node) : nodeOrId
  if (!node || !node.isNode()) return

  const viewBox = options.viewBox || options.tightViewBox
  const data = node.getData() || {}
  const newData = { ...data, ...options }
  if (viewBox) {
    newData.viewBox = viewBox
  }

  if (node.shape !== 'speed-shape-node' && options.svgContent) {
    const pos = node.getPosition()
    const size = node.getSize()
    const zIndex = node.getZIndex()
    const isSelected = board.graph.isSelected(node)
    const incomingEdges = board.graph.getIncomingEdges(node) || []
    const outgoingEdges = board.graph.getOutgoingEdges(node) || []

    const newNode = board.graph.addNode({
      shape: 'speed-shape-node',
      x: pos.x,
      y: pos.y,
      width: size.width,
      height: size.height,
      zIndex,
      ports: getShapePortsConfig(options.shapeId || data.shapeId || 'rect'),
      attrs: {
        shapeBody: {
          html: options.svgContent,
          viewBox: viewBox || '6 6 20 20',
          preserveAspectRatio: 'none',
        },
        textFo: {
          x: 8,
          y: 8,
          refWidth: '100%',
          refWidth2: -16,
          refHeight: '100%',
          refHeight2: -16,
          style: {
            overflow: 'hidden',
          },
        },
        textWrap: {
          class: 'speed-node-text',
          html: options.text ?? data.text ?? '',
          style: {
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: options.align ?? data.align ?? 'center',
            fontSize: `${options.fontSize ?? data.fontSize ?? 14}px`,
            color: options.textColor ?? data.textColor ?? '#1f2937',
            outline: 'none',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            userSelect: 'none',
            cursor: 'default',
          },
        },
        label: {
          text: options.text ?? data.text ?? '',
          fontSize: options.fontSize ?? data.fontSize ?? 14,
          fill: options.textColor ?? data.textColor ?? '#1f2937',
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          refX: '50%',
          refY: '50%',
        },
      },
      data: {
        type: 'shape',
        ...newData,
      },
    })

    for (const edge of incomingEdges) {
      edge.setTarget(newNode)
    }
    for (const edge of outgoingEdges) {
      edge.setSource(newNode)
    }

    board.graph.removeCell(node)
    if (isSelected) {
      board.graph.select(newNode)
    }
    board.graph.trigger('cell:change:data', { cell: newNode, current: newData, previous: data })
    board.graph.trigger('node:change:data', { cell: newNode, node: newNode, current: newData, previous: data })
    return newNode
  }

  node.setData(newData)

  if (options.svgContent !== undefined) {
    node.setAttrByPath('shapeBody/html', options.svgContent)
    node.setAttrByPath('shapeBody/preserveAspectRatio', 'none')
  }
  if (viewBox !== undefined) {
    node.setAttrByPath('shapeBody/viewBox', viewBox)
    node.setAttrByPath('shapeBody/preserveAspectRatio', 'none')
  }
  if (options.opacity !== undefined) {
    node.setAttrByPath('shapeBody/opacity', options.opacity)
  }

  if (options.text !== undefined) {
    node.setAttrByPath('textWrap/html', options.text)
    node.setAttrByPath('label/text', options.text)
  }
  if (options.fontSize !== undefined) {
    node.setAttrByPath('textWrap/style/fontSize', `${options.fontSize}px`)
    node.setAttrByPath('label/fontSize', options.fontSize)
  }
  if (options.textColor !== undefined) {
    node.setAttrByPath('textWrap/style/color', options.textColor)
    node.setAttrByPath('label/fill', options.textColor)
  }
  if (options.bold !== undefined) {
    node.setAttrByPath('textWrap/style/fontWeight', options.bold ? 'bold' : 'normal')
    node.setAttrByPath('label/fontWeight', options.bold ? 'bold' : 'normal')
  }
  if (options.italic !== undefined) {
    node.setAttrByPath('textWrap/style/fontStyle', options.italic ? 'italic' : 'normal')
    node.setAttrByPath('label/fontStyle', options.italic ? 'italic' : 'normal')
  }
  if (options.underline !== undefined || options.strike !== undefined) {
    const decs: string[] = []
    const underline = options.underline !== undefined ? options.underline : !!data.underline
    const strike = options.strike !== undefined ? options.strike : !!data.strike
    if (underline) decs.push('underline')
    if (strike) decs.push('line-through')
    node.setAttrByPath('label/textDecoration', decs.length ? decs.join(' ') : 'none')
  }
  if (options.align !== undefined) {
    const anchor = options.align === 'left' ? 'start' : options.align === 'right' ? 'end' : options.align === 'justify' ? 'start' : 'middle'
    node.setAttrByPath('label/textAnchor', anchor)
    if (options.align === 'left' || options.align === 'justify') {
      node.removeAttrByPath('label/refDx')
      node.setAttrByPath('label/refX', 12)
    } else if (options.align === 'right') {
      node.removeAttrByPath('label/refX')
      node.setAttrByPath('label/refDx', -12)
    } else {
      node.removeAttrByPath('label/refDx')
      node.setAttrByPath('label/refX', '50%')
    }
  }
  if (options.verticalAlign !== undefined) {
    const vAnchor = options.verticalAlign === 'top' ? 'top' : options.verticalAlign === 'bottom' ? 'bottom' : 'middle'
    node.setAttrByPath('label/textVerticalAnchor', vAnchor)
    if (options.verticalAlign === 'top') {
      node.removeAttrByPath('label/refDy')
      node.setAttrByPath('label/refY', 12)
    } else if (options.verticalAlign === 'bottom') {
      node.removeAttrByPath('label/refY')
      node.setAttrByPath('label/refDy', -12)
    } else {
      node.removeAttrByPath('label/refDy')
      node.setAttrByPath('label/refY', '50%')
    }
  }

  const view = board.graph.findViewByCell(node)
  if (view) {
    view.render()
  }
  board.graph.trigger('cell:change:data', { cell: node, current: newData, previous: data })
  board.graph.trigger('node:change:data', { cell: node, node, current: newData, previous: data })
}

/**
 * 获取指定图形节点数据
 */
export function getShapeNodeData(board: Board, cell?: any) {
  if (!cell) {
    const selected = board.graph.getSelectedCells()
    if (!selected.length) return null
    cell = selected[0]
  }
  if (!cell || !cell.isNode()) return null
  return cell.getData() || null
}

/**
 * 判断图元是否为矢量图形节点
 */
export function isShapeNode(board: Board, cell?: any): boolean {
  if (!cell) {
    const selected = board.graph.getSelectedCells()
    if (!selected.length) return false
    cell = selected[0]
  }
  if (!cell || !cell.isNode()) return false
  return (
    cell.shape === 'speed-shape-node' ||
    cell.getData()?.type === 'shape' ||
    cell.shape === 'rect' ||
    cell.shape === 'circle' ||
    cell.shape === 'polygon' ||
    cell.shape === 'speed-vector-polygon' ||
    cell.shape === 'speed-icon-node' ||
    cell.getData()?.type === 'icon'
  )
}

/**
 * 更新选中图元的边框/填充/透明度样式
 */
export function updateSelectedStyle(
  board: Board,
  style: {
    fill?: string
    stroke?: string
    strokeWidth?: number
    strokeDasharray?: string
    opacity?: number
  }
) {
  const selectedCells = board.graph.getSelectedCells()
  if (!selectedCells || selectedCells.length === 0) return

  for (const cell of selectedCells) {
    if (!cell.isNode()) continue

    if (style.fill !== undefined) {
      cell.setAttrByPath('body/fill', style.fill)
    }
    if (style.stroke !== undefined) {
      cell.setAttrByPath('body/stroke', style.stroke)
    }
    if (style.strokeWidth !== undefined) {
      cell.setAttrByPath('body/strokeWidth', style.strokeWidth)
      cell.setAttrByPath('body/stroke-width', style.strokeWidth)
    }
    if (style.strokeDasharray !== undefined) {
      cell.setAttrByPath('body/strokeDasharray', style.strokeDasharray)
      cell.setAttrByPath('body/stroke-dasharray', style.strokeDasharray)
    }
    if (style.opacity !== undefined) {
      cell.setAttrByPath('body/opacity', style.opacity)
      cell.setAttrByPath('body/fillOpacity', style.opacity)
      cell.setAttrByPath('body/strokeOpacity', style.opacity)
    }

    const data = cell.getData() || {}
    cell.setData({
      ...data,
      ...style,
    })
  }
}

/**
 * 获取当前首个选中图元的样式
 */
export function getSelectedStyle(board: Board): {
  fill?: string
  stroke?: string
  strokeWidth?: number
  strokeDasharray?: string
  opacity?: number
} | null {
  const selectedCells = board.graph.getSelectedCells()
  if (!selectedCells || selectedCells.length === 0) return null
  const cell = selectedCells[0]
  if (!cell.isNode()) return null

  const attrs = cell.getAttrs()?.body || {}
  const data = cell.getData() || {}

  return {
    fill: (data.fill as string) || (attrs.fill as string) || '#ffffff',
    stroke: (data.stroke as string) || (attrs.stroke as string) || '#333333',
    strokeWidth: Number(data.strokeWidth ?? attrs.strokeWidth ?? attrs['stroke-width'] ?? 2),
    strokeDasharray: (data.strokeDasharray as string) || (attrs.strokeDasharray as string) || (attrs['stroke-dasharray'] as string) || 'none',
    opacity: Number(data.opacity !== undefined ? data.opacity : attrs.opacity !== undefined ? attrs.opacity : 1),
  }
}
