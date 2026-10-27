import { ref, watchEffect, type Ref } from 'vue'
import { cloneDeep, isEqual } from 'lodash-es'
import type { Board, Cell } from '@speed-board/core'
import { resolveBoard, type BoardSource } from './useBoardEvent'

type MapFn<T, R> = (arg: T) => R

function mapSelf<T>(d: T): T {
  return d
}

/**
 * 通用响应式图元属性 Hook (对标 speed-editor 的 useAttributes)
 * 自动监听画板图元选中、属性变更、自定义数据更新，并转换为标准的 Vue Ref。
 *
 * @param source Board 实例或响应式源 (Board | Ref<Board> | () => Board)
 * @param attributeOrGetter 属性名 (如 'fill'、'stroke'、'shapeId'、'opacity') 或自定义取值函数
 * @param defaultValue 缺省默认值
 * @param map 映射转换函数
 */
export function useCellAttributes<T, R = T>(
  source: BoardSource,
  attributeOrGetter: string | ((cell: Cell, board: Board) => T),
  defaultValue?: T,
  map?: (arg: T) => R
): Ref<R> {
  const mapFn = (map || mapSelf) as MapFn<T, R>
  const valueRef = ref<R>((defaultValue !== undefined ? mapFn(defaultValue) : undefined) as R)
  let prevValueCache = cloneDeep(valueRef.value)

  watchEffect((onCleanup) => {
    const board = resolveBoard(source)
    if (!board) {
      if (defaultValue !== undefined) {
        valueRef.value = mapFn(defaultValue)
      }
      return
    }

    const extractValue = (): T => {
      const selected = board.selectedElements
      if (!selected || selected.length === 0) {
        return defaultValue as T
      }
      const cell = selected[0] as any

      if (typeof attributeOrGetter === 'function') {
        return (attributeOrGetter as any)(cell, board)
      }

      const attrName = attributeOrGetter
      if (cell && attrName in cell && cell[attrName] !== undefined && cell[attrName] !== null) {
        return cell[attrName] as T
      }
      if (cell?.data && attrName in cell.data && cell.data[attrName] !== undefined) {
        return cell.data[attrName] as T
      }

      return defaultValue !== undefined ? defaultValue : (cell?.[attrName] as T)
    }

    const listener = () => {
      const rawVal = extractValue()
      const nextVal = mapFn(rawVal)
      if (isEqual(prevValueCache, nextVal)) {
        return
      }
      valueRef.value = nextVal
      prevValueCache = cloneDeep(nextVal)
    }

    // 立即执行一次初始化提取
    listener()

    // 监听与选区和图元数据相关的全套画板事件
    const events = [
      'selection:change',
      'change',
      'history:change',
      'history:undo',
      'history:redo',
    ]

    for (const ev of events) {
      board.on(ev, listener)
    }

    onCleanup(() => {
      for (const ev of events) {
        board.off(ev, listener)
      }
    })
  })

  return valueRef as unknown as Ref<R>
}

/** 别名导出，对齐 editor 命名规范 */
export const useAttributes = useCellAttributes
