import { registerCustomAttrs } from './registerAttrs'
import { registerVectorNode } from './vectorNode'
import { registerTextNode } from './textNode'
import { registerFreehandNode } from './freehandNode'
import { registerIconNode } from './iconNode'
import { registerImageNode } from './imageNode'
import { registerShapeNode } from './shapeNode'

export * from './registerAttrs'
export * from './vectorNode'
export * from './textNode'
export * from './freehandNode'
export * from './iconNode'
export * from './imageNode'
export * from './shapeNode'
export * from './shapePorts'

/**
 * 统一注册 speed-board 画板自定义 X6 节点集合与增强属性处理器
 */
export function registerAllNodes(): void {
  registerCustomAttrs()
  registerVectorNode()
  registerTextNode()
  registerFreehandNode()
  registerIconNode()
  registerImageNode()
  registerShapeNode()
}
