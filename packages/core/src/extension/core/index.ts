import { HistoryExtension } from './history'
import { ClipboardExtension } from './clipboard'
import { SelectionExtension } from './selection'
import { ShapeExtension } from './shape'

export * from './history'
export * from './clipboard'
export * from './selection'
export * from './shape'

export function getDefaultExtensions() {
  return [
    HistoryExtension,
    ClipboardExtension,
    SelectionExtension,
    ShapeExtension,
  ]
}
