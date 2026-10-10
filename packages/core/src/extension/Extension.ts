import type { Board } from '../Board'

export interface ExtensionOptions {
  [key: string]: any
}

export abstract class Extension<Options extends ExtensionOptions = ExtensionOptions> {
  name: string = 'extension'
  board!: Board
  options: Options

  constructor(options: Partial<Options> = {}) {
    this.options = { ...this.defaultOptions, ...options } as Options
  }

  get defaultOptions(): Partial<Options> {
    return {}
  }

  bind(board: Board) {
    this.board = board
  }

  onInit?(): void
  onDestroy?(): void
}
