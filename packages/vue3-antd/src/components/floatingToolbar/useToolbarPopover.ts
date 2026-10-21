import { inject, ref, computed, provide, type Ref, type WritableComputedRef, type InjectionKey } from 'vue'

export interface ToolbarPopoverContext {
  activePopoverKey: Ref<string | null>
  openPopover: (key: string) => void
  closePopover: (key?: string) => void
}

export const TOOLBAR_POPOVER_KEY: InjectionKey<ToolbarPopoverContext> = Symbol('TOOLBAR_POPOVER_KEY')

export function useToolbarPopoverHost() {
  const activePopoverKey = ref<string | null>(null)

  const openPopover = (key: string) => {
    activePopoverKey.value = key
  }

  const closePopover = (key?: string) => {
    if (!key || activePopoverKey.value === key) {
      activePopoverKey.value = null
    }
  }

  provide(TOOLBAR_POPOVER_KEY, {
    activePopoverKey,
    openPopover,
    closePopover,
  })

  return {
    activePopoverKey,
    openPopover,
    closePopover,
  }
}

export function useToolbarPopover(key: string): {
  isOpen: WritableComputedRef<boolean>
  close: () => void
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

  return {
    isOpen,
    close,
  }
}
