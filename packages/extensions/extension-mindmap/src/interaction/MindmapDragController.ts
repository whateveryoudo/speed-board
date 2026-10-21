import type { Node } from '@antv/x6'
import type { Board } from '@speed-board/core'
import type { MindmapNodeData } from '@speed-board/shared'
import {
  isMindmapNode,
  getMindmapElements,
  getMindmapDescendants,
  moveMindmapNode,
  updateMindmapLayout,
  getMindmapRootNode,
} from '../commands/mindmapCommands'
import { MindmapDragIndicator, type PlaceholderType } from './MindmapDragIndicator'

export interface DropTargetInfo {
  targetId: string
  position: PlaceholderType
}

/**
 * 脑图节点拖拽与拓扑重组控制器 (Tree Reparenting & Reordering Controller)
 * 纯正的工业级现代交互模型 (Ghost Clone + 3类 Placeholder 占位投影)：
 * 1. 彻底禁用 X6 原生分支节点拖动，原节点留在树上纹丝不动，连线永不拉扯变形。
 * 2. 鼠标移动超阈值时生成轻量虚化 Clone 卡片跟随光标。
 * 3. 原节点原位淡化到 35% 透明度，清晰表达“从此处提起”。
 * 4. 实时在目标候选处展示 3 类清楚的 Placeholder 占位投影：
 *    - 【上方插队】：在目标上方显示虚线占位框
 *    - 【下方插队】：在目标下方显示虚线占位框
 *    - 【后面嵌套】：在目标右侧显示子分支虚线框 + 虚线连接贝塞尔曲线 + 目标高亮
 * 5. 松手释放：
 *    - 命中占位框：执行 moveMindmapNode，整树平滑展开吸附。
 *    - 释放于空白处：Ghost 消失，原节点恢复 100% 透明度，0 畸变 0 回弹破绽。
 * 6. 根节点拖拽：整树作为一个整体平移。
 */
export class MindmapDragController {
  private board: Board
  private indicator: MindmapDragIndicator

  // 根节点拖拽状态
  private isDraggingRoot = false
  private rootStartPos: { x: number; y: number } | null = null
  private rootSubtreeStartPositions = new Map<string, { x: number; y: number }>()

  // 分支节点 Ghost 拖拽状态
  private pendingDrag: {
    node: Node
    startClientX: number
    startClientY: number
  } | null = null
  private isDraggingBranch = false
  private draggedNode: Node | null = null
  private draggedBBox: { x: number; y: number; width: number; height: number } | null = null
  private candidateNodes: Node[] = []
  private currentDropTarget: DropTargetInfo | null = null

  // 全局事件监听清理句柄
  private activePointerMoveHandler: ((e: PointerEvent) => void) | null = null
  private activePointerUpHandler: ((e: PointerEvent) => void) | null = null

  constructor(board: Board) {
    this.board = board
    this.indicator = new MindmapDragIndicator(board.graph)
    this.bindEvents()
  }

  private setNodeOpacity(node: Node, opacity: number) {
    node.setAttrByPath('body/opacity', opacity)
    node.setAttrByPath('label/opacity', opacity)
    node.setAttrByPath('underline/opacity', opacity)
  }

  private bindEvents() {
    const graph = this.board.graph

    // ==========================================
    // 1. 根节点拖拽联动 (X6 nodeMovable = true)
    // ==========================================
    graph.on('node:move', ({ node }) => {
      if (!isMindmapNode(node)) return
      const data = node.getData() as MindmapNodeData | undefined
      if (!data || !data.isRoot) return

      this.isDraggingRoot = true
      this.rootStartPos = node.getPosition()
      this.rootSubtreeStartPositions.clear()

      const { nodes } = getMindmapElements(graph, data.mindmapId)
      for (const n of nodes) {
        this.rootSubtreeStartPositions.set(n.id, n.getPosition())
      }

      this.board.graph.trigger('mindmap:drag:start', { node })
    })

    graph.on('node:moving', ({ node }) => {
      if (!isMindmapNode(node)) return
      if (!this.isDraggingRoot || !this.rootStartPos) return

      const currentPos = node.getPosition()
      const dx = currentPos.x - this.rootStartPos.x
      const dy = currentPos.y - this.rootStartPos.y

      for (const [id, startPos] of this.rootSubtreeStartPositions) {
        if (id !== node.id) {
          const cell = graph.getCellById(id) as Node
          if (cell) cell.setPosition(startPos.x + dx, startPos.y + dy)
        }
      }
    })

    graph.on('node:moved', ({ node }) => {
      if (!isMindmapNode(node)) return
      if (!this.isDraggingRoot) return

      this.isDraggingRoot = false
      this.rootStartPos = null
      this.rootSubtreeStartPositions.clear()
      updateMindmapLayout(this.board, node.id)
      this.board.graph.trigger('mindmap:drag:end', { node })
    })

    // ==========================================
    // 2. 分支节点自定义 Ghost 拖拽 (nodeMovable = false)
    // ==========================================
    graph.on('node:mousedown', ({ e, node }) => {
      if (!isMindmapNode(node)) return
      const data = node.getData() as MindmapNodeData | undefined
      if (!data || data.isRoot) return

      const mouseEvent = (e as unknown) as MouseEvent
      if (mouseEvent.button !== 0) return

      this.pendingDrag = {
        node,
        startClientX: mouseEvent.clientX,
        startClientY: mouseEvent.clientY,
      }

      this.bindWindowDragEvents()
    })
  }

  private bindWindowDragEvents() {
    this.unbindWindowDragEvents()

    const onPointerMove = (e: PointerEvent) => {
      if (!this.pendingDrag) return

      const dist = Math.hypot(
        e.clientX - this.pendingDrag.startClientX,
        e.clientY - this.pendingDrag.startClientY
      )

      if (!this.isDraggingBranch) {
        // 拖动超 4px 激活拖拽模式
        if (dist > 4) {
          this.startBranchDrag(this.pendingDrag.node)
        } else {
          return
        }
      }

      if (this.isDraggingBranch && this.draggedNode && this.draggedBBox) {
        e.preventDefault()
        // 将客户端光标坐标转换为 X6 画布坐标
        const localPt = this.board.graph.clientToLocal(e.clientX, e.clientY)

        // 跟随更新 Ghost 位置
        this.indicator.updateGhostPosition(
          localPt.x,
          localPt.y,
          this.draggedBBox.width,
          this.draggedBBox.height
        )

        // 碰撞计算并更新 3 类 Placeholder
        this.updatePlaceholderAt(localPt.x, localPt.y)
      }
    }

    const onPointerUp = () => {
      this.finishBranchDrag()
      this.unbindWindowDragEvents()
    }

    this.activePointerMoveHandler = onPointerMove
    this.activePointerUpHandler = onPointerUp

    window.addEventListener('pointermove', onPointerMove, { capture: true })
    window.addEventListener('pointerup', onPointerUp, { capture: true })
    window.addEventListener('pointercancel', onPointerUp, { capture: true })
  }

  private unbindWindowDragEvents() {
    if (this.activePointerMoveHandler) {
      window.removeEventListener('pointermove', this.activePointerMoveHandler, { capture: true })
      this.activePointerMoveHandler = null
    }
    if (this.activePointerUpHandler) {
      window.removeEventListener('pointerup', this.activePointerUpHandler, { capture: true })
      window.removeEventListener('pointercancel', this.activePointerUpHandler, { capture: true })
      this.activePointerUpHandler = null
    }
  }

  private startBranchDrag(node: Node) {
    this.isDraggingBranch = true
    this.draggedNode = node
    this.draggedBBox = node.getBBox()
    this.currentDropTarget = null

    const data = node.getData() as MindmapNodeData

    // 1. 原节点原位淡化，提示“已被提起”，但坐标与连线原封不动！
    this.setNodeOpacity(node, 0.35)

    // 2. 初始化 Ghost 跟随体 (纯粹圆角卡片)
    this.indicator.initGhost(
      data.text || '分支主题',
      this.draggedBBox.width,
      this.draggedBBox.height
    )

    // 3. 收集合法目标节点 (排除被拖节点自身及所有后代节点，严格防环)
    const descendants = getMindmapDescendants(this.board.graph, node.id)
    const invalidIds = new Set([node.id, ...descendants.map((d) => d.id)])
    const { nodes } = getMindmapElements(this.board.graph, data.mindmapId)
    this.candidateNodes = nodes.filter((n) => !invalidIds.has(n.id))

    // 4. 派发全局拖拽开始事件，通知所有浮层 (Toolbar, BranchHandle, AnchorPorts) 立即隐藏避让
    this.board.graph.trigger('node:moving', { node })
    this.board.graph.trigger('mindmap:drag:start', { node })
  }

  private finishBranchDrag() {
    const node = this.draggedNode
    const dropTarget = this.currentDropTarget

    // 隐藏所有指示器
    this.indicator.hideAll()

    if (node) {
      // 恢复原节点透明度
      this.setNodeOpacity(node, 1)

      if (dropTarget) {
        // 成功命中 Placeholder 占位框：执行拓扑迁移
        moveMindmapNode(this.board, node.id, dropTarget.targetId, dropTarget.position)
      }
      // 如果落在空白处，原节点原本就没有发生任何位移，直接恢复正常，0 破绽！

      // 派发拖拽结束事件
      this.board.graph.trigger('node:moved', { node })
      this.board.graph.trigger('mindmap:drag:end', { node })
    }

    // 重置拖拽状态
    this.pendingDrag = null
    this.isDraggingBranch = false
    this.draggedNode = null
    this.draggedBBox = null
    this.candidateNodes = []
    this.currentDropTarget = null
  }

  /**
   * 核心几何判定：计算光标处于候选目标的【同级插槽】还是【嵌套为子分支】
   * 彻底解决缝隙处“停顿两个点位”与重叠跳跃问题：相邻兄弟间隙只映射唯一稳定的单插槽！
   */
  private updatePlaceholderAt(cursorX: number, cursorY: number): void {
    if (!this.draggedNode || !this.draggedBBox) return

    // 1. 优先判定嵌套为子分支 (Child)：候选节点右侧区域
    let childMatch: { target: Node; distance: number } | null = null

    for (const cand of this.candidateNodes) {
      const candBBox = cand.getBBox()
      const candData = cand.getData() as MindmapNodeData

      if (candData.isRoot) {
        const inH = cursorX >= candBBox.x - 20 && cursorX <= candBBox.x + candBBox.width + 120
        const inV = cursorY >= candBBox.y - 20 && cursorY <= candBBox.y + candBBox.height + 20
        if (inH && inV) {
          const dist = Math.hypot(
            cursorX - (candBBox.x + candBBox.width),
            cursorY - (candBBox.y + candBBox.height / 2)
          )
          if (!childMatch || dist < childMatch.distance) {
            childMatch = { target: cand, distance: dist }
          }
        }
      } else {
        // 分支节点：右侧 35% 内部及右侧外侧区域判定为嵌套为子节点
        const inH =
          cursorX >= candBBox.x + candBBox.width * 0.65 &&
          cursorX <= candBBox.x + candBBox.width + 120
        const inV = cursorY >= candBBox.y - 8 && cursorY <= candBBox.y + candBBox.height + 8
        if (inH && inV) {
          const dist = Math.hypot(
            cursorX - (candBBox.x + candBBox.width),
            cursorY - (candBBox.y + candBBox.height / 2)
          )
          if (!childMatch || dist < childMatch.distance) {
            childMatch = { target: cand, distance: dist }
          }
        }
      }
    }

    if (childMatch) {
      this.currentDropTarget = {
        targetId: childMatch.target.id,
        position: 'child',
      }
      const draggedData = this.draggedNode.getData() as MindmapNodeData
      const rootNode = getMindmapRootNode(this.board.graph, this.draggedNode.id)
      const rootData = rootNode?.getData() as MindmapNodeData | undefined
      const branchType: 'curve' | 'straight' =
        rootData?.branch?.type === 'straight' ? 'straight' : 'curve'

      this.indicator.showPlaceholder(
        'child',
        childMatch.target.getBBox(),
        childMatch.target.getBBox(),
        this.draggedBBox.width,
        this.draggedBBox.height,
        draggedData?.branch?.color || '#3b82f6',
        branchType
      )
      return
    }

    // 2. 同级插槽判定 (Sibling Insertion Slots)
    // 按 parentId 分组各组兄弟，计算无重叠无跳跃的单一几何插槽
    interface SiblingSlot {
      target: Node
      position: 'before' | 'after'
      slotY: number
      distance: number
    }

    const parentGroups = new Map<string, Node[]>()
    for (const cand of this.candidateNodes) {
      const candData = cand.getData() as MindmapNodeData
      if (!candData.isRoot && candData.parentId) {
        const group = parentGroups.get(candData.parentId) || []
        group.push(cand)
        parentGroups.set(candData.parentId, group)
      }
    }

    let bestSlot: SiblingSlot | null = null

    for (const [, siblings] of parentGroups) {
      // 按 Y 坐标从上至下排序
      siblings.sort((a, b) => a.getBBox().y - b.getBBox().y)

      for (let i = 0; i <= siblings.length; i++) {
        let slotY = 0
        let minY = 0
        let maxY = 0
        let targetNode: Node
        let position: 'before' | 'after'
        let refBBox: { x: number; y: number; width: number; height: number }

        if (i === 0) {
          // 第一个兄弟上方
          const first = siblings[0]
          const fBBox = first.getBBox()
          refBBox = fBBox
          slotY = fBBox.y - 8
          minY = fBBox.y - 30
          maxY = fBBox.y + fBBox.height * 0.4
          targetNode = first
          position = 'before'
        } else if (i === siblings.length) {
          // 最后一个兄弟下方
          const last = siblings[siblings.length - 1]
          const lBBox = last.getBBox()
          refBBox = lBBox
          slotY = lBBox.y + lBBox.height + 8
          minY = lBBox.y + lBBox.height * 0.6
          maxY = lBBox.y + lBBox.height + 30
          targetNode = last
          position = 'after'
        } else {
          // 两个相邻兄弟中间缝隙：唯一稳定单插槽
          const prev = siblings[i - 1]
          const curr = siblings[i]
          const pBBox = prev.getBBox()
          const cBBox = curr.getBBox()
          refBBox = pBBox
          slotY = (pBBox.y + pBBox.height + cBBox.y) / 2
          minY = pBBox.y + pBBox.height * 0.4
          maxY = cBBox.y + cBBox.height * 0.6
          targetNode = prev
          position = 'after'
        }

        const minX = refBBox.x - 50
        const maxX = refBBox.x + refBBox.width + 60

        if (cursorX >= minX && cursorX <= maxX && cursorY >= minY && cursorY <= maxY) {
          const dist = Math.hypot(cursorX - refBBox.x, cursorY - slotY)
          if (!bestSlot || dist < bestSlot.distance) {
            bestSlot = {
              target: targetNode,
              position,
              slotY,
              distance: dist,
            }
          }
        }
      }
    }

    if (bestSlot) {
      this.currentDropTarget = {
        targetId: bestSlot.target.id,
        position: bestSlot.position,
      }

      // 获取当前占位连线应该连接的父节点包围盒
      const candData = bestSlot.target.getData() as MindmapNodeData
      const parentId = candData.parentId || candData.mindmapId
      const parentNode = this.board.graph.getCellById(parentId) as Node | undefined
      const parentBBox = parentNode ? parentNode.getBBox() : null

      const draggedData = this.draggedNode.getData() as MindmapNodeData
      const rootNode = getMindmapRootNode(this.board.graph, this.draggedNode.id)
      const rootData = rootNode?.getData() as MindmapNodeData | undefined
      const branchType: 'curve' | 'straight' =
        rootData?.branch?.type === 'straight' ? 'straight' : 'curve'

      this.indicator.showPlaceholder(
        bestSlot.position,
        bestSlot.target.getBBox(),
        parentBBox,
        this.draggedBBox.width,
        this.draggedBBox.height,
        draggedData?.branch?.color || '#3b82f6',
        branchType,
        bestSlot.slotY
      )
    } else {
      this.currentDropTarget = null
      this.indicator.hidePlaceholder()
    }
  }

  public destroy(): void {
    this.unbindWindowDragEvents()
    this.indicator.destroy()
  }
}
