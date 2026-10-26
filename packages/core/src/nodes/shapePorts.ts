/**
 * 根据不同的几何图形类型（矩形/菱形/三角形/圆/平行四边形等）
 * 动态计算生成贴合其【真实几何轮廓（SVG Path）】的连接桩配置 (1:1 语雀机制)
 * 彻底避免统一外接矩形外框导致的“镂空悬空”或“穿透插进肚子”
 */

export interface ShapePortItem {
  id: string
  group: 'shape-port'
  args: {
    x: string | number
    y: string | number
  }
}

export interface ShapePortsConfig {
  groups: {
    'shape-port': {
      position: {
        name: 'absolute'
      }
      attrs: {
        circle: {
          r: number
          magnet: boolean
          stroke: string
          strokeWidth: number
          fill: string
          style: Record<string, any>
        }
      }
    }
  }
  items: ShapePortItem[]
}

const defaultPortCircleAttrs = {
  r: 3.5,
  magnet: true,
  stroke: '#3b82f6',
  strokeWidth: 1.5,
  fill: '#ffffff',
  style: {
    cursor: 'crosshair',
    transition: 'opacity 0.15s ease, transform 0.15s ease, r 0.15s ease',
  },
}

export function getShapePortsConfig(shapeId: string = 'rect'): ShapePortsConfig {
  const groupConfig = {
    'shape-port': {
      position: {
        name: 'absolute' as const,
      },
      attrs: {
        circle: defaultPortCircleAttrs,
      },
    },
  }

  let items: ShapePortItem[] = []

  switch (shapeId) {
    case 'triangle':
      // 三角形 (3 个顶点 + 3 条边的中点 = 6 个真实贴合点，1:1 语雀)
      items = [
        { id: 'top', group: 'shape-port', args: { x: '50%', y: '0%' } },
        { id: 'bottom-left', group: 'shape-port', args: { x: '0%', y: '100%' } },
        { id: 'bottom-right', group: 'shape-port', args: { x: '100%', y: '100%' } },
        { id: 'bottom', group: 'shape-port', args: { x: '50%', y: '100%' } },
        { id: 'left', group: 'shape-port', args: { x: '25%', y: '50%' } },
        { id: 'right', group: 'shape-port', args: { x: '75%', y: '50%' } },
      ]
      break

    case 'diamond':
      // 菱形 (4 个尖角顶点 + 4 条斜边的中点 = 8 个真实贴合点，满足挂在斜边上的需求)
      items = [
        { id: 'top', group: 'shape-port', args: { x: '50%', y: '0%' } },
        { id: 'right', group: 'shape-port', args: { x: '100%', y: '50%' } },
        { id: 'bottom', group: 'shape-port', args: { x: '50%', y: '100%' } },
        { id: 'left', group: 'shape-port', args: { x: '0%', y: '50%' } },
        { id: 'top-right', group: 'shape-port', args: { x: '75%', y: '25%' } },
        { id: 'bottom-right', group: 'shape-port', args: { x: '75%', y: '75%' } },
        { id: 'bottom-left', group: 'shape-port', args: { x: '25%', y: '75%' } },
        { id: 'top-left', group: 'shape-port', args: { x: '25%', y: '25%' } },
      ]
      break

    case 'circle':
    case 'ellipse':
      // 圆形 / 椭圆 (8 个圆周特征切点)
      items = [
        { id: 'top', group: 'shape-port', args: { x: '50%', y: '0%' } },
        { id: 'right', group: 'shape-port', args: { x: '100%', y: '50%' } },
        { id: 'bottom', group: 'shape-port', args: { x: '50%', y: '100%' } },
        { id: 'left', group: 'shape-port', args: { x: '0%', y: '50%' } },
        { id: 'top-right', group: 'shape-port', args: { x: '85.35%', y: '14.65%' } },
        { id: 'bottom-right', group: 'shape-port', args: { x: '85.35%', y: '85.35%' } },
        { id: 'bottom-left', group: 'shape-port', args: { x: '14.65%', y: '85.35%' } },
        { id: 'top-left', group: 'shape-port', args: { x: '14.65%', y: '14.65%' } },
      ]
      break

    case 'parallelogram':
      // 平行四边形 (向右倾斜)
      items = [
        { id: 'top-left', group: 'shape-port', args: { x: '20%', y: '0%' } },
        { id: 'top', group: 'shape-port', args: { x: '60%', y: '0%' } },
        { id: 'top-right', group: 'shape-port', args: { x: '100%', y: '0%' } },
        { id: 'bottom-right', group: 'shape-port', args: { x: '80%', y: '100%' } },
        { id: 'bottom', group: 'shape-port', args: { x: '40%', y: '100%' } },
        { id: 'bottom-left', group: 'shape-port', args: { x: '0%', y: '100%' } },
        { id: 'left', group: 'shape-port', args: { x: '10%', y: '50%' } },
        { id: 'right', group: 'shape-port', args: { x: '90%', y: '50%' } },
      ]
      break

    case 'trapezoid':
      // 梯形
      items = [
        { id: 'top-left', group: 'shape-port', args: { x: '18%', y: '0%' } },
        { id: 'top', group: 'shape-port', args: { x: '50%', y: '0%' } },
        { id: 'top-right', group: 'shape-port', args: { x: '82%', y: '0%' } },
        { id: 'bottom-right', group: 'shape-port', args: { x: '100%', y: '100%' } },
        { id: 'bottom', group: 'shape-port', args: { x: '50%', y: '100%' } },
        { id: 'bottom-left', group: 'shape-port', args: { x: '0%', y: '100%' } },
        { id: 'left', group: 'shape-port', args: { x: '9%', y: '50%' } },
        { id: 'right', group: 'shape-port', args: { x: '91%', y: '50%' } },
      ]
      break

    case 'rect':
    case 'rounded-rect':
    default:
      // 矩形 / 默认 (4 边中点)
      items = [
        { id: 'top', group: 'shape-port', args: { x: '50%', y: '0%' } },
        { id: 'right', group: 'shape-port', args: { x: '100%', y: '50%' } },
        { id: 'bottom', group: 'shape-port', args: { x: '50%', y: '100%' } },
        { id: 'left', group: 'shape-port', args: { x: '0%', y: '50%' } },
      ]
      break
  }

  return {
    groups: groupConfig,
    items,
  }
}
