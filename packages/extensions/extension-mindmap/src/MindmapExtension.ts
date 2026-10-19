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
  moveMindmapNode,
  isMindmapNode,
} from './commands/mindmapCommands'
import { MindmapDragController } from './interaction/MindmapDragController'
import type { MindmapExtensionOptions } from './types'

export class MindmapExtension extends Extension<any, MindmapExtensionOptions> {
  private dragController?: MindmapDragController

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

        // 挂载现代化脑图拖拽控制器 (整树平移、子树 Ghost、悬停嵌套、同级插队、空白回弹)
        this.dragController = new MindmapDragController(board)

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
      },
      onDestroy: () => {
        this.dragController?.destroy()
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
        moveMindmapNode: (draggedId: string, targetId: string, position: 'child' | 'before' | 'after') => () => {
          return moveMindmapNode(ctx.board, draggedId, targetId, position)
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
