import { Extension } from '../Extension'
import type { Board, AddShapeOptions } from '../../Board'

export const ShapeExtension = Extension.create({
  name: 'shape',
  priority: 70,

  addCommands({ board }: { board: Board }) {
    return {
      addShape: (options: AddShapeOptions) => {
        return board.addShape(options)
      },
      addSvgIcon: (options: any) => {
        return board.addSvgIcon(options)
      },
      addImage: (options: any) => {
        return board.addImage(options)
      },
      updateShapeNode: (options: { node: any; [key: string]: any }) => {
        const { node, ...rest } = options
        return board.updateShapeNode(node, rest)
      },
      addLine: (options: any) => {
        return board.addLine(options)
      },
      connectNodes: (options: any) => {
        return board.connectNodes(options)
      },
      addFreehandPath: (options: any) => {
        return board.addFreehandPath(options)
      },
      addPolygonShape: (options: any) => {
        return board.addPolygonShape(options)
      },
    }
  },
})
