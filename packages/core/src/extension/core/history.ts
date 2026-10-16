import { Extension } from '../Extension'
import type { Board } from '../../Board'

export const HistoryExtension = Extension.create({
  name: 'history',
  priority: 100,

  addCommands({ board }: { board: Board }) {
    return {
      undo: () => {
        board.historyPlugin?.undo()
        board.graph.trigger('history:change')
        return true
      },
      redo: () => {
        board.historyPlugin?.redo()
        board.graph.trigger('history:change')
        return true
      },
      canUndo: () => {
        return board.historyPlugin?.canUndo() ?? false
      },
      canRedo: () => {
        return board.historyPlugin?.canRedo() ?? false
      },
    }
  },

  addKeyboardShortcuts({ board }: { board: Board }) {
    return {
      'mod+z': () => {
        board.commands.undo()
        return true
      },
      'mod+shift+z': () => {
        board.commands.redo()
        return true
      },
      'mod+y': () => {
        board.commands.redo()
        return true
      },
    }
  },
})
