import { inject, ref, computed, provide, type Ref, type WritableComputedRef, type InjectionKey } from 'vue'

export interface ToolbarPopoverContext {
  activePopoverKey: Ref<string | null>
  openPopover: (key: string) => void
  closePopover: (key?: string) => void
  getPopupContainer: (node?: HTMLElement) => HTMLElement
}

export const defaultGetPopupContainer = (node?: HTMLElement): HTMLElement => {
  return (node?.closest?.('.speed-board') as HTMLElement) || (node?.closest?.('.speed-board-canvas-wrapper') as HTMLElement) || document.body;
};

export const TOOLBAR_POPOVER_KEY: InjectionKey<ToolbarPopoverContext> = Symbol('TOOLBAR_POPOVER_KEY')

export function useToolbarPopoverHost(customGetPopupContainer?: (node?: HTMLElement) => HTMLElement) {
  const activePopoverKey = ref<string | null>(null)

  const openPopover = (key: string) => {
    activePopoverKey.value = key
  }

  const closePopover = (key?: string) => {
    if (!key || activePopoverKey.value === key) {
      activePopoverKey.value = null
    }
  }

  const getPopupContainer = customGetPopupContainer || defaultGetPopupContainer

  provide(TOOLBAR_POPOVER_KEY, {
    activePopoverKey,
    openPopover,
    closePopover,
    getPopupContainer,
  })

  return {
    activePopoverKey,
    openPopover,
    closePopover,
    getPopupContainer,
  }
}

export function useToolbarPopover(key: string): {
  isOpen: WritableComputedRef<boolean>
  close: () => void
  getPopupContainer: (node?: HTMLElement) => HTMLElement
} {
  const context = inject<ToolbarPopoverContext | null>(TOOLBAR_POPOVER_KEY, null)
  const localIsOpen = ref(false)

  const isOpen = computed<boolean>({
    get() {
      if (context) {
        return context.activePopoverKey.value === key
      }
      return localIsOpen.value
    },
    set(val: boolean) {
      if (context) {
        if (val) {
          context.openPopover(key)
        } else {
          context.closePopover(key)
        }
      } else {
        localIsOpen.value = val
      }
    },
  })

  const close = () => {
    if (context) {
      context.closePopover(key)
    } else {
      localIsOpen.value = false
    }
  }

  const getPopupContainer = context?.getPopupContainer || defaultGetPopupContainer

  return {
    isOpen,
    close,
    getPopupContainer,
  }
}
