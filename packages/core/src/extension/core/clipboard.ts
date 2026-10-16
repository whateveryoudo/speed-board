import { Extension } from '../Extension'
import type { Board } from '../../Board'

export const ClipboardExtension = Extension.create({
  name: 'clipboard',
  priority: 90,

  addCommands({ board }: { board: Board }) {
    return {
      copy: () => {
        const cells = board.graph.getSelectedCells()
        if (cells.length > 0) {
          board.clipboardPlugin?.copy(cells)
        }
        return true
      },
      cut: () => {
        const cells = board.graph.getSelectedCells()
        if (cells.length > 0) {
          board.clipboardPlugin?.cut(cells)
        }
        return true
      },
      paste: () => {
        if (board.clipboardPlugin && !board.clipboardPlugin.isEmpty()) {
          const cells = board.clipboardPlugin.paste({ offset: 30 }, board.graph)
          if (cells && cells.length > 0) {
            board.graph.cleanSelection()
            board.graph.select(cells)
          }
        }
        return true
      },
    }
  },

  addKeyboardShortcuts({ board }: { board: Board }) {
    return {
      'mod+c': () => {
        board.commands.copy()
        return true
      },
      'mod+x': () => {
        board.commands.cut()
        return true
      },
      'mod+v': () => {
        board.commands.paste()
        return true
      },
    }
  },
})
