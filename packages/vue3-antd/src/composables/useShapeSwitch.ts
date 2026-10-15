import type { Board } from '@speed-board/core'
import {
  SHAPE_GROUPS,
  getShapeById,
  renderShapeCanvasSvg,
  getShapeTightViewBox,
  type ShapeDefinition,
} from '../data/shapeLibrary'

/** 浮动工具栏展示的高频基础图形 (20个矢量形状，含云朵与燕尾箭头) */
export const BASIC_SHAPES: ShapeDefinition[] = (
  SHAPE_GROUPS.find((g) => g.key === 'basic')?.shapes || []
).slice(0, 20)

/**
 * 选区图形原地切换 Hook
 */
export function useShapeSwitch(getBoard: () => Board | null) {
  /**
   * 原地无缝切换当前选中形状
   * 严格保持当前节点的几何中心坐标、尺寸、旋转角度及填充/描边样式
   */
  const switchShape = (targetShape: ShapeDefinition | string) => {
    const board = getBoard()
    if (!board) return

    const shapeDef =
      typeof targetShape === 'string' ? getShapeById(targetShape) : targetShape
    if (!shapeDef) return

    const selectedCells = board.graph.getSelectedCells()
    for (const cell of selectedCells) {
      if (!board.isShapeNode(cell)) continue

      const oldData = cell.getData() || {}
      const fill = oldData.fill || '#ffffff'
      const stroke = oldData.stroke || '#374151'
      const strokeWidth = oldData.strokeWidth ?? 2
      const strokeDasharray = oldData.strokeDasharray || 'none'
      const opacity = oldData.opacity ?? 1

      // 重新生成新形状的严格 SVG 字符串与 tight viewBox
      const svgContent = renderShapeCanvasSvg(shapeDef, {
        fill,
        stroke,
        strokeWidth,
        strokeDasharray,
      })
      const tightViewBox = getShapeTightViewBox(svgContent, shapeDef.id)

      board.updateShapeNode(cell as any, {
        shapeId: shapeDef.id,
        shapeName: shapeDef.name,
        fill,
        stroke,
        strokeWidth,
        strokeDasharray,
        opacity,
        svgContent,
        viewBox: tightViewBox,
        tightViewBox,
      })

      // 触发选择集变更通知，确保浮动工具栏和左侧面板即时同步
      board.graph.trigger('selection:changed', {
        selected: board.graph.getSelectedCells(),
      })
    }
  }

  return {
    basicShapes: BASIC_SHAPES,
    switchShape,
  }
}
