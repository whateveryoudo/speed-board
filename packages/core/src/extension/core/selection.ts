import { Extension } from '../Extension'
import type { Board } from '../../Board'

export const SelectionExtension = Extension.create({
  name: 'selection',
  priority: 80,

  addCommands({ board }: { board: Board }) {
    return {
      deleteSelected: () => {
        board.deleteSelected()
        return true
      },
      duplicateSelected: (offset?: number) => {
        board.duplicateSelected(offset)
        return true
      },
      alignSelectedNodes: (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
        board.alignSelectedNodes(type)
        return true
      },
      distributeSelectedNodes: (type: 'horizontal' | 'vertical') => {
        board.distributeSelectedNodes(type)
        return true
      },
      bringSelectedToFront: () => {
        board.bringSelectedToFront()
        return true
      },
      sendSelectedToBack: () => {
        board.sendSelectedToBack()
        return true
      },
      bringSelectedForward: () => {
        board.bringSelectedForward()
        return true
      },
      sendSelectedBackward: () => {
        board.sendSelectedBackward()
        return true
      },
      groupSelected: () => {
        return board.groupSelected() !== null
      },
      ungroupSelected: () => {
        board.ungroupSelected()
        return true
      },
      toggleLockSelected: () => {
        return board.toggleLockSelected()
      },
      centerContent: () => {
        board.centerContent()
        return true
      },
      zoom: (factor: number) => {
        board.zoom(factor)
        return true
      },
      zoomTo: (factor: number) => {
        board.zoomTo(factor)
        return true
      },
    }
  },

  addKeyboardShortcuts({ board }: { board: Board }) {
    return {
      'backspace': () => {
        board.deleteSelected()
        return true
      },
      'delete': () => {
        board.deleteSelected()
        return true
      },
      'mod+d': () => {
        board.duplicateSelected()
        return true
      },
      'mod+g': () => {
        board.groupSelected()
        return true
      },
      'mod+shift+g': () => {
        board.ungroupSelected()
        return true
      },
    }
  },
})
