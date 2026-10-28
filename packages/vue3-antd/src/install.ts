import type { App, Component } from 'vue'
import {
  ensureSpeedComponents,
  isSpeedComponentsInstalled,
} from 'speed-components-ui/components'
import 'speed-components-ui/dist/style.css'
import SpeedBoard from './components/SpeedBoard.vue'
import SpeedMindmap from './components/SpeedMindmap.vue'
import LeftToolbar from './components/LeftToolbar.vue'
import TopToolbar from './components/TopToolbar.vue'
import IconfontPopover from './components/IconfontPopover.vue'

export interface SpeedBoardUiInstallOptions {
  registerGlobal?: boolean
  /** 外部业务 iconfont 链接，用于 s-iconfont / SIconFont */
  iconfontUrl?: string | string[]
  themeConfig?: Record<string, any>
}

const components: Record<string, Component> = {
  SpeedBoard,
  SpeedMindmap,
  LeftToolbar,
  TopToolbar,
  IconfontPopover,
}

export function installSpeedBoardUi(
  app: App,
  options?: SpeedBoardUiInstallOptions
): void {
  const registerGlobal = options?.registerGlobal !== false
  if (registerGlobal) {
    Object.entries(components).forEach(([name, comp]) => {
      if (!app.component(name)) {
        app.component(name, comp)
      }
    })
  }

  const defaultIconfontUrl = '//at.alicdn.com/t/c/font_3786040_k69q5351cel.js'
  const iconfontUrl = options?.iconfontUrl
    ? Array.isArray(options.iconfontUrl)
      ? options.iconfontUrl
      : [options.iconfontUrl]
    : [defaultIconfontUrl]

  if (isSpeedComponentsInstalled(app)) {
    ensureSpeedComponents(app, {
      iconfontUrl,
      themeConfig: options?.themeConfig,
    })
    return
  }

  ensureSpeedComponents(app, {
    iconfontUrl,
    themeConfig: options?.themeConfig,
  })
}

const plugin = {
  install: installSpeedBoardUi,
  version: '0.1.0',
}

export default plugin
