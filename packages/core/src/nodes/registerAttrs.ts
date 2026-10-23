import { Graph, Dom } from '@antv/x6'

/**
 * 注册 speed-board 画板增强的 X6 基础 Attr 处理器
 * 核心解决痛点：
 * 1. 原生 X6 的 html attr 处理器在 node.setSize() 时会无条件调用 elem.innerHTML = `${html}`，
 *    导致就地编辑打字（contenteditable）时光标丢失、中文拼音 IME 中断崩溃。
 * 2. 原生 X6 对未识别的 contenteditable 属性会当成普通 DOM 属性在 updateAttrs 时重置为 'false'。
 * 3. 原生 X6 的 style attr 处理器会在 updateAttrs 时覆盖 userSelect/cursor 状态。
 *
 * 通过 Graph.registerAttr(..., true) 重写这三个核心属性，在元素处于编辑状态 (data-editing="true" 或 isContentEditable) 时，
 * 彻底保护正在编辑的 DOM 结构、光标位置与 IME 状态，使实时打字自适应 node.setSize 完美丝滑运作。
 */
export function registerCustomAttrs(): void {
  // 1. 注册增强型 html 属性处理器
  Graph.registerAttr(
    'html',
    {
      set(val, { elem }) {
        // 如果元素处于原生打字编辑中，绝对不能重写 innerHTML，保护光标和 IME 拼音缓冲区
        if (
          elem.getAttribute('data-editing') === 'true' ||
          elem.getAttribute('contenteditable') === 'true' ||
          (elem instanceof HTMLElement && elem.isContentEditable)
        ) {
          return
        }
        const str = val == null ? '' : `${val}`
        if (elem.innerHTML !== str) {
          elem.innerHTML = str
        }
      },
    },
    true
  )

  // 2. 注册 contenteditable 属性处理器
  Graph.registerAttr(
    'contenteditable',
    {
      set(val, { elem }) {
        // 如果元素处于原生打字编辑中，绝不重置为 'false'
        if (
          elem.getAttribute('data-editing') === 'true' ||
          (elem instanceof HTMLElement && elem.isContentEditable)
        ) {
          return
        }
        if (val != null) {
          elem.setAttribute('contenteditable', `${val}`)
        } else {
          elem.removeAttribute('contenteditable')
        }
      },
    },
    true
  )

  // 3. 注册增强型 style 属性处理器
  Graph.registerAttr(
    'style',
    {
      qualify(val: any) {
        return typeof val === 'object' && val !== null
      },
      set(styles: any, { elem }) {
        if (
          elem.getAttribute('data-editing') === 'true' ||
          (elem instanceof HTMLElement && elem.isContentEditable)
        ) {
          const merged = {
            ...(styles as Record<string, any>),
            userSelect: 'text',
            cursor: 'text',
          }
          Dom.css(elem, merged)
          return
        }
        Dom.css(elem, styles as Record<string, string | number>)
      },
    },
    true
  )
}

// 模块加载时自动执行注册
registerCustomAttrs()
