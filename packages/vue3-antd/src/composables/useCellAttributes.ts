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

    const graph = board.graph

    const extractValue = (): T => {
      const selected = graph.getSelectedCells()
      if (!selected || selected.length === 0) {
        return defaultValue as T
      }
      const cell = selected[0]

      if (typeof attributeOrGetter === 'function') {
        return attributeOrGetter(cell, board)
      }

      const attrName = attributeOrGetter
      const data = cell.getData() || {}
      if (attrName in data && data[attrName] !== undefined && data[attrName] !== null) {
        return data[attrName] as T
      }

      // 尝试从 attrs 读取 (如 body/fill, line/stroke 等)
      const directAttr = cell.getAttrByPath(attrName)
      if (directAttr !== undefined && directAttr !== null) {
        return directAttr as T
      }

      const bodyAttr = cell.getAttrByPath(`body/${attrName}`)
      if (bodyAttr !== undefined && bodyAttr !== null) {
        return bodyAttr as T
      }

      const lineAttr = cell.getAttrByPath(`line/${attrName}`)
      if (lineAttr !== undefined && lineAttr !== null) {
        return lineAttr as T
      }

      const shapeAttr = cell.getAttrByPath(`shapeBody/${attrName}`)
      if (shapeAttr !== undefined && shapeAttr !== null) {
        return shapeAttr as T
      }

      return (defaultValue !== undefined ? defaultValue : (data[attrName] as T))
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
      'cell:selected',
      'cell:unselected',
      'selection:changed',
      'cell:change:data',
      'node:change:data',
      'edge:change:data',
      'cell:change:attrs',
      'node:change:attrs',
      'edge:change:attrs',
      'history:change',
      'history:undo',
      'history:redo',
    ]

    for (const ev of events) {
      graph.on(ev, listener)
    }

    onCleanup(() => {
      for (const ev of events) {
        graph.off(ev, listener)
      }
    })
  })

  return valueRef as unknown as Ref<R>
}

/** 别名导出，对齐 editor 命名规范 */
export const useAttributes = useCellAttributes
