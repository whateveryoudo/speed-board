import type { Board } from '../Board'
import type {
  CommandFn,
  ExtensionCommandContext,
  KeyboardShortcutHandler,
} from './types'

export interface ExtensionOptions {
  [key: string]: any
}

export interface ExtensionConfig<S = any, O extends ExtensionOptions = ExtensionOptions> {
  name: string
  version?: string
  dependencies?: string[]
  priority?: number

  onInit?: (this: Extension<S, O>, board: Board) => void
  onDestroy?: (this: Extension<S, O>) => void

  addCommands?: (this: Extension<S, O>, ctx: ExtensionCommandContext) => Record<string, CommandFn>
  addKeyboardShortcuts?: (
    this: Extension<S, O>,
    ctx: ExtensionCommandContext
  ) => Record<string, KeyboardShortcutHandler>

  addStorage?: () => S
  addOptions?: () => O
  addExtensions?: () => Extension[]
}

/**
 * TipTap / speed-sheet 风格扩展基类
 */
export class Extension<S = any, O extends ExtensionOptions = ExtensionOptions> {
  public name: string
  public version: string
  public dependencies: string[]
  public priority: number
  public options: O
  public storage: S = {} as S
  public board!: Board

  private config?: ExtensionConfig<S, O>
  private parentExtension: Extension | null = null

  constructor(config?: ExtensionConfig<S, O> | Partial<O>) {
    if (config && 'name' in config && typeof config.name === 'string') {
      const cfg = config as ExtensionConfig<S, O>
      this.name = cfg.name
      this.version = cfg.version ?? '0.1.0'
      this.dependencies = cfg.dependencies ?? []
      this.priority = cfg.priority ?? 0
      this.config = cfg
      this.options = (cfg.addOptions ? cfg.addOptions() : {}) as O
    } else {
      this.name = 'extension'
      this.version = '0.1.0'
      this.dependencies = []
      this.priority = 0
      this.options = { ...this.defaultOptions, ...(config as Partial<O>) } as O
    }
  }

  get defaultOptions(): Partial<O> {
    return {}
  }

  static create<S = any, O extends ExtensionOptions = ExtensionOptions>(
    config: ExtensionConfig<S, O>
  ): Extension<S, O> {
    return new Extension<S, O>(config)
  }

  extend<S2 = S, O2 extends ExtensionOptions = O>(
    overrides: Partial<ExtensionConfig<S2, O2>>
  ): Extension<S2, O2> {
    const baseConfig = this.config || {
      name: this.name,
      version: this.version,
      dependencies: this.dependencies,
      priority: this.priority,
    }

    const merged = {
      ...baseConfig,
      ...overrides,
      name: overrides.name ?? this.name,
      dependencies: [...new Set([...this.dependencies, ...(overrides.dependencies ?? [])])],
    } as ExtensionConfig<S2, O2>

    const child = new Extension<S2, O2>(merged)
    child.parentExtension = this
    return child
  }

  configure(options: Partial<O>): Extension<S, O> {
    const existingOptions = this.config?.addOptions ? this.config.addOptions() : this.options
    return this.extend({
      addOptions: () => ({
        ...existingOptions,
        ...options,
      }),
    })
  }

  bind(board: Board): void {
    this.board = board
    this.init(board)
  }

  init(board: Board): void {
    this.board = board
    if (this.config?.addOptions) {
      this.options = this.config.addOptions()
    }
    if (this.config?.addStorage) {
      this.storage = this.config.addStorage()
    }
    if (this.config?.onInit) {
      this.config.onInit.call(this, board)
    }
    this.onInit?.()
  }

  onInit?(): void
  onDestroy?(): void

  destroy(): void {
    if (this.config?.onDestroy) {
      this.config.onDestroy.call(this)
    }
    this.onDestroy?.()
  }

  getCommands(board: Board): Record<string, CommandFn> {
    if (this.config?.addCommands) {
      return this.config.addCommands.call(this, { board })
    }
    return {}
  }

  getKeyboardShortcuts(board: Board): Record<string, KeyboardShortcutHandler> {
    if (this.config?.addKeyboardShortcuts) {
      return this.config.addKeyboardShortcuts.call(this, { board })
    }
    return {}
  }

  getExtensions(): Extension[] {
    if (this.config?.addExtensions) {
      return this.config.addExtensions()
    }
    return []
  }

  get parent(): Extension | null {
    return this.parentExtension
  }
}

export * from './types'
