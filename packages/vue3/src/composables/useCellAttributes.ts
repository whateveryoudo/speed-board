import { ref, watchEffect, type Ref } from 'vue';
import type { Board } from '@speed-board/core';
import { resolveBoard, type BoardSource } from './useBoardEvent';

type MapFn<T, R> = (arg: T) => R;

function mapSelf<T>(d: T): T {
  return d;
}

/**
 * 通用响应式图元属性 Hook
 * 自动监听画板图元选中、属性变更、自定义数据更新，并转换为标准的 Vue Ref。
 */
export function useCellAttributes<T, R = T>(
  source: BoardSource,
  attributeOrGetter: string | ((cell: any, board: Board) => T),
  defaultValue?: T,
  map?: (arg: T) => R
): Ref<R> {
  const mapFn = (map || mapSelf) as MapFn<T, R>;
  const valueRef = ref<any>(defaultValue !== undefined ? mapFn(defaultValue) : undefined);

  watchEffect((onCleanup) => {
    const board = resolveBoard(source);
    if (!board) {
      if (defaultValue !== undefined) {
        valueRef.value = mapFn(defaultValue);
      }
      return;
    }

    const extractValue = (): T => {
      const selected = board.selectedElements;
      if (!selected || selected.length === 0) {
        return defaultValue as T;
      }
      const cell = selected[0] as any;

      if (typeof attributeOrGetter === 'function') {
        return (attributeOrGetter as any)(cell, board);
      }

      const attrName = attributeOrGetter;
      if (cell && attrName in cell && cell[attrName] !== undefined && cell[attrName] !== null) {
        return cell[attrName] as T;
      }
      if (cell?.data && attrName in cell.data && cell.data[attrName] !== undefined) {
        return cell.data[attrName] as T;
      }

      return defaultValue !== undefined ? defaultValue : (cell?.[attrName] as T);
    };

    const sync = () => {
      const nextVal = extractValue();
      const mapped = mapFn(nextVal);
      valueRef.value = mapped;
    };

    sync();

    const events = ['selection:change', 'change'];
    for (const ev of events) {
      board.on(ev, sync);
    }

    onCleanup(() => {
      for (const ev of events) {
        board.off(ev, sync);
      }
    });
  });

  return valueRef as Ref<R>;
}
