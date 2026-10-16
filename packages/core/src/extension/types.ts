import type { Board } from '../Board'

/** Command function: props -> any | (ctx) => any */
export type CommandFn = (props?: any) => any

export interface CommandContext {
  board: Board
  chain: () => CommandChain
}

export interface CommandChain {
  run(): Promise<void> | void
  can(): boolean
  [key: string]: any
}

export type KeyboardShortcutHandler = () => boolean

export interface ExtensionCommandContext {
  board: Board
}
