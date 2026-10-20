import type { Extension } from '../extension/Extension'
import type { CommandFn, CommandContext, CommandChain } from '../extension/types'
import type { Board } from '../Board'

/**
 * TipTap / speed-sheet 风格的命令调度器 (CommandManager)
 *
 * 示例用法：
 *   board.commands.undo()
 *   board.chain().deleteSelected().run()
 *   board.can().redo()
 */
export class CommandManager {
  private board: Board
  private _commands: Map<string, CommandFn> = new Map()

  constructor(board: Board) {
    this.board = board

    // 返回一个 Proxy，允许直接以属性函数方式调用命令：board.commands.undo()
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (typeof prop === 'string') {
          if (prop in target) {
            const val = Reflect.get(target, prop, receiver)
            if (typeof val === 'function') {
              return val.bind(target)
            }
            return val
          }
          if (target._commands.has(prop)) {
            return (...args: any[]) => target.execute(prop, ...args)
          }
        }
        return Reflect.get(target, prop, receiver)
      },
    })
  }

  registerExtension(ext: Extension): void {
    const commands = ext.getCommands(this.board)
    for (const [name, fn] of Object.entries(commands)) {
      if (this._commands.has(name)) {
        console.warn(`[@speed-board/core] Command "${name}" overridden by extension "${ext.name}"`)
      }
      this._commands.set(name, fn)
    }
  }

  unregisterExtension(ext: Extension): void {
    const commands = ext.getCommands(this.board)
    for (const name of Object.keys(commands)) {
      this._commands.delete(name)
    }
  }

  registerCommand(name: string, fn: CommandFn): void {
    this._commands.set(name, fn)
  }

  get(name: string): CommandFn | undefined {
    return this._commands.get(name)
  }

  has(name: string): boolean {
    return this._commands.has(name)
  }

  async execute(name: string, ...args: any[]): Promise<boolean> {
    const fn = this._commands.get(name)
    if (!fn) {
      console.warn(`[@speed-board/core] Unknown command: "${name}"`)
      return false
    }

    const ctx: CommandContext = {
      board: this.board,
      chain: () => this.chain(),
    }

    try {
      let result = fn(...args)
      if (typeof result === 'function') {
        result = result(ctx)
      }
      if (result instanceof Promise) {
        return await result
      }
      return Boolean(result)
    } catch (e) {
      console.error(`[@speed-board/core] Command "${name}" failed:`, e)
      return false
    }
  }

  chain(): CommandChain {
    return new ChainBuilder(this.board, this._commands) as unknown as CommandChain
  }

  can(): CommandChain {
    return new ChainBuilder(this.board, this._commands, true) as unknown as CommandChain
  }

  [key: string]: any
}

class ChainBuilder {
  private _board: Board
  private _commands: Map<string, CommandFn>
  private _queued: Array<{ name: string; props: any }> = []
  private _isDryRun: boolean

  constructor(board: Board, commands: Map<string, CommandFn>, isDryRun = false) {
    this._board = board
    this._commands = commands
    this._isDryRun = isDryRun

    return new Proxy(this, {
      get(target: any, prop: string | symbol, receiver: any) {
        if (prop === 'run' || prop === 'can') {
          return target[prop].bind(target)
        }
        if (typeof prop === 'string') {
          return (props?: any) => {
            target._queued.push({ name: prop, props })
            return receiver
          }
        }
        return Reflect.get(target, prop, receiver)
      },
    })
  }

  async run(): Promise<void> {
    if (this._isDryRun) return
    const ctx: CommandContext = {
      board: this._board,
      chain: () => this._board.chain(),
    }

    for (const { name, props } of this._queued) {
      const fn = this._commands.get(name)
      if (!fn) {
        console.warn(`[@speed-board/core] Unknown command: "${name}"`)
        continue
      }
      try {
        let result = fn(props)
        if (typeof result === 'function') {
          result = result(ctx)
        }
        if (result instanceof Promise) {
          await result
        }
      } catch (e) {
        console.error(`[@speed-board/core] Command "${name}" failed:`, e)
      }
    }
  }

  can(): boolean {
    return this._queued.every(({ name }) => this._commands.has(name))
  }
}
