import * as Y from 'yjs'
import type { Extension } from './extension/Extension'

export interface BoardOptions {
  container: HTMLElement
  ydoc?: Y.Doc
  extensions?: Extension[]
}

export class Board {
  public container: HTMLElement
  public ydoc: Y.Doc
  public yCells: Y.Map<any>
  public extensions: Map<string, Extension> = new Map()

  constructor(options: BoardOptions) {
    this.container = options.container
    this.ydoc = options.ydoc || new Y.Doc()
    this.yCells = this.ydoc.getMap('cells')

    if (options.extensions) {
      for (const ext of options.extensions) {
        this.registerExtension(ext)
      }
    }
  }

  registerExtension(extension: Extension) {
    extension.bind(this)
    this.extensions.set(extension.name, extension)
    extension.onInit?.()
  }

  destroy() {
    for (const ext of this.extensions.values()) {
      ext.onDestroy?.()
    }
    this.extensions.clear()
  }
}
