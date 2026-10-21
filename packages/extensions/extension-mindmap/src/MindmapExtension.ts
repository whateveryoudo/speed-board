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
  toggleMindmapNodeCollapse,
  setMindmapNodeCollapse,
  isMindmapNode,
  updateMindmapNodeHandle,
  activateMindmapNodeTextEdit,
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

        // 监听脑图节点内置控制手柄的原生 DOM 点击事件 (+ / 收起 / 展开)
        board.graph.on('node:click', ({ e, cell }) => {
          const target = e.target as HTMLElement | null
          if (!target) return

          const actionEl = target.closest('[data-action]') as HTMLElement | null
          if (!actionEl) return

          const action = actionEl.getAttribute('data-action')
          if (action === 'add-child') {
            e.stopPropagation()
            addMindmapChild(board, cell.id)
            return
          }
          if (action === 'toggle-collapse') {
            e.stopPropagation()
            toggleMindmapNodeCollapse(board, cell.id)
            board.graph.cleanSelection()
            board.graph.select(cell)
            return
          }
        })

        // 脑图节点双击或触发编辑时，激活原生内置 contenteditable 就地打字 (0 像素抖动)
        board.graph.on('node:dblclick', ({ node }) => {
          if (isMindmapNode(node)) {
            activateMindmapNodeTextEdit(board, node)
          }
        })

        board.graph.on('node:start-edit', ({ node, initialChar }: any) => {
          if (isMindmapNode(node)) {
            activateMindmapNodeTextEdit(board, node, initialChar)
          }
        })

        // 选区变化时正向同步脑图节点选中状态样式与手柄 HTML
        board.graph.on('selection:changed', ({ selected, unselected }) => {
          if (selected) {
            for (const cell of selected) {
              if (cell.isNode() && isMindmapNode(cell)) {
                const view = board.graph.findViewByCell(cell)
                if (view?.container) {
                  view.container.classList.add('is-mindmap-selected')
                }
                updateMindmapNodeHandle(board.graph, cell)
              }
            }
          }
          if (unselected) {
            for (const cell of unselected) {
              if (cell.isNode() && isMindmapNode(cell)) {
                const view = board.graph.findViewByCell(cell)
                if (view?.container) {
                  view.container.classList.remove('is-mindmap-selected')
                }
                updateMindmapNodeHandle(board.graph, cell)
              }
            }
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
        moveMindmapNode: (opts: any, targetId?: string, position?: any) => () => {
          if (typeof opts === 'object' && opts && opts.draggedId) {
            return moveMindmapNode(ctx.board, opts.draggedId, opts.targetId, opts.position)
          }
          return moveMindmapNode(ctx.board, opts, targetId!, position!)
        },
        setMindmapStructure: (rootId?: any, structure?: any) => () => {
          if (rootId) setMindmapStructure(ctx.board, rootId, structure)
          return true
        },
        setMindmapBranchStyle: (nodeId?: any, config?: any) => () => {
          if (nodeId) setMindmapBranchStyle(ctx.board, nodeId, config)
          return true
        },
        updateMindmapLayout: (rootOrChildId?: any) => () => {
          if (rootOrChildId) updateMindmapLayout(ctx.board, rootOrChildId)
          return true
        },
        toggleMindmapNodeCollapse: (nodeId?: any) => () => {
          if (nodeId) toggleMindmapNodeCollapse(ctx.board, nodeId)
          return true
        },
        setMindmapNodeCollapse: (nodeId?: any, collapsed?: any) => () => {
          if (nodeId) setMindmapNodeCollapse(ctx.board, nodeId, !!collapsed)
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
