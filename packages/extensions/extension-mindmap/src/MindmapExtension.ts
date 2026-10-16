import { Extension } from '@speed-board/core'
import { registerMindmapNodes } from './nodes/registerMindmapNodes'
import { registerMindmapEdges } from './edges/registerMindmapEdges'
import {
  insertMindmap,
  addMindmapChild,
  addMindmapSibling,
  deleteMindmapBranch,
  setMindmapStructure,
  setMindmapBranchStyle,
  updateMindmapLayout,
  isMindmapNode,
} from './commands/mindmapCommands'
import type { MindmapExtensionOptions } from './types'

export class MindmapExtension extends Extension<any, MindmapExtensionOptions> {
  constructor(options?: MindmapExtensionOptions) {
    super({
      name: 'mindmap',
      version: '0.1.0',
      addOptions: () => ({
        defaultStructure: 'balanced',
        defaultBranchWidth: 3,
        defaultBranchType: 'curve',
        hgap: 45,
        vgap: 16,
        ...options,
      }),
      onInit: (board) => {
        registerMindmapNodes()
        registerMindmapEdges()

        // 监听节点拖动：如果是根节点拖动，整体同步所有子节点位移
        let draggingRootOrigin: { x: number; y: number } | null = null
        board.graph.on('node:move', ({ node }) => {
          if (isMindmapNode(node)) {
            const data = node.getData() as any
            if (data?.isRoot && !draggingRootOrigin) {
              draggingRootOrigin = node.getPosition()
            }
          }
        })

        // 监听节点缩放：右上角宽度调整手柄，锁定高度与 Y 坐标防止形变
        let resizingInitialY: number | null = null
        board.graph.on('node:resize', ({ node }) => {
          if (isMindmapNode(node)) {
            resizingInitialY = node.getPosition().y
          }
        })

        board.graph.on('node:resizing', ({ node }) => {
          if (isMindmapNode(node)) {
            const isRoot = (node.getData() as any)?.isRoot
            const targetHeight = isRoot ? 42 : 32
            const currentSize = node.getSize()
            const pos = node.getPosition()
            const shouldFixHeight = currentSize.height !== targetHeight
            const shouldFixY = resizingInitialY !== null && pos.y !== resizingInitialY
            if (shouldFixHeight || shouldFixY) {
              node.setSize({ width: Math.max(60, currentSize.width), height: targetHeight })
              if (resizingInitialY !== null) {
                node.setPosition(pos.x, resizingInitialY)
              }
            }
          }
        })

        board.graph.on('node:resized', ({ node }) => {
          resizingInitialY = null
          if (isMindmapNode(node)) {
            updateMindmapLayout(board, node.id)
          }
        })

        board.graph.on('node:moved', ({ node }) => {
          if (isMindmapNode(node)) {
            const data = node.getData() as any
            if (data?.isRoot) {
              updateMindmapLayout(board, node.id)
            }
          }
          draggingRootOrigin = null
        })
      },
      addCommands: (ctx) => ({
        insertMindmap: (options: any) => () => {
          insertMindmap(ctx.board, options)
          return true
        },
        addMindmapChild: (parentId?: string) => () => {
          addMindmapChild(ctx.board, parentId)
          return true
        },
        addMindmapSibling: (currentId?: string) => () => {
          addMindmapSibling(ctx.board, currentId)
          return true
        },
        deleteMindmapBranch: (targetId?: string) => () => {
          deleteMindmapBranch(ctx.board, targetId)
          return true
        },
        setMindmapStructure: (rootId: string, structure: any) => () => {
          setMindmapStructure(ctx.board, rootId, structure)
          return true
        },
        setMindmapBranchStyle: (nodeId: string, config: any) => () => {
          setMindmapBranchStyle(ctx.board, nodeId, config)
          return true
        },
        updateMindmapLayout: (rootOrChildId: string) => () => {
          updateMindmapLayout(ctx.board, rootOrChildId)
          return true
        },
      }),
      addKeyboardShortcuts: (ctx) => ({
        Tab: () => {
          const selected = ctx.board.getSelectedCells()
          if (selected.length === 1 && isMindmapNode(selected[0])) {
            addMindmapChild(ctx.board, selected[0].id)
            return true
          }
          return false
        },
        Enter: () => {
          const selected = ctx.board.getSelectedCells()
          if (selected.length === 1 && isMindmapNode(selected[0])) {
            const data = (selected[0] as any).getData() || {}
            if (data.isRoot || !data.parentId) {
              addMindmapChild(ctx.board, selected[0].id)
            } else {
              addMindmapSibling(ctx.board, selected[0].id)
            }
            return true
          }
          return false
        },
      }),
    })
  }
}
