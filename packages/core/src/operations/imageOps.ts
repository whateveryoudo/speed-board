import type { Node } from '@antv/x6'
import type { Board } from '../Board'
import { renderImageProgressHtml, IMAGE_ERROR_PLACEHOLDER } from '../nodes/imageNode'

/**
 * 插入图片图元 (居中放置于当前画布视口)
 */
export function addImage(
  board: Board,
  options: {
    url: string
    id?: string
    name?: string
    width?: number
    height?: number
    x?: number
    y?: number
    status?: 'uploading' | 'success' | 'error'
    progress?: number
  }
): Node {
  const width = options.width ?? 320
  const height = options.height ?? 240
  const center = board.getViewportCenter()
  const x = options.x ?? Math.round(center.x - width / 2)
  const y = options.y ?? Math.round(center.y - height / 2)
  const status = options.status || 'success'
  const progress = options.progress ?? 0
  const isUploading = status === 'uploading'
  const isError = status === 'error'

  const node = board.graph.addNode({
    shape: 'speed-image-node',
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
      image: {
        'xlink:href': options.url,
        href: options.url,
        preserveAspectRatio: 'none',
      },
      progressFo: {
        style: {
          display: isUploading || isError ? 'block' : 'none',
          pointerEvents: 'none',
        },
      },
      progressContent: {
        html: isUploading
          ? renderImageProgressHtml(progress, false)
          : isError
            ? renderImageProgressHtml(100, true)
            : '',
      },
      label: {
        text: '',
      },
    },
    data: {
      type: 'image',
      fileId: options.id,
      fileName: options.name || 'image',
      url: options.url,
      status,
      progress,
    },
  })

  board.graph.cleanSelection()
  board.graph.select(node)
  return node
}

/**
 * 更新图片节点的上传状态 (uploading / success / error)
 */
export function updateImageStatus(
  board: Board,
  nodeOrId: Node | string,
  status: 'uploading' | 'success' | 'error',
  options?: {
    url?: string
    id?: string
    progress?: number
    errorMessage?: string
    retry?: () => void
  }
) {
  const node = typeof nodeOrId === 'string' ? (board.graph.getCellById(nodeOrId) as Node) : nodeOrId
  if (!node || !node.isNode()) return

  const currentData = node.getData() || {}
  const progress = Math.min(100, Math.max(0, options?.progress ?? (status === 'success' ? 100 : currentData.progress ?? 0)))
  const newData = {
    ...currentData,
    status,
    progress,
    ...(options?.url ? { url: options.url } : {}),
    ...(options?.id ? { fileId: options.id } : {}),
    ...(options?.retry ? { retry: options.retry } : {}),
    ...(options?.errorMessage ? { errorMessage: options.errorMessage } : {}),
  }
  node.setData(newData)

  if (options?.url) {
    node.setAttrByPath('image/xlink:href', options.url)
    node.setAttrByPath('image/href', options.url)
  }

  if (status === 'uploading') {
    node.setAttrByPath('progressFo/style/display', 'block')
    node.setAttrByPath('progressContent/html', renderImageProgressHtml(progress, false))
  } else if (status === 'success') {
    node.setAttrByPath('progressFo/style/display', 'none')
    node.setAttrByPath('progressContent/html', '')
  } else if (status === 'error') {
    node.setAttrByPath('progressFo/style/display', 'block')
    node.setAttrByPath('progressContent/html', renderImageProgressHtml(100, true))
    if (!options?.url) {
      node.setAttrByPath('image/xlink:href', IMAGE_ERROR_PLACEHOLDER)
      node.setAttrByPath('image/href', IMAGE_ERROR_PLACEHOLDER)
    }
  }
}
