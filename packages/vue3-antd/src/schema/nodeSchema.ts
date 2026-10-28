export type QuickToolbarItem =
  | 'shape-switch' // 图形切换 (19个基础图形)
  | 'fill'         // 填充颜色
  | 'stroke'       // 边框/描边 (粗细、颜色、虚实)
  | 'text'         // 文本排版 (B/I/S/U、字号、颜色、对齐)
  | 'link'         // 链接
  | 'opacity'      // 不透明度
  | 'line-type'    // 折线 / 直线 / 曲线
  | 'line-reverse' // 线条反转方向
  | 'arrow-head'   // 端点箭头 (起始 / 结束)
  | 'line-text'    // 线条文字插入
  | 'font-size'    // 独立字号 (纯文本节点)
  | 'text-color'   // 独立文本颜色 (纯文本节点)
  | 'align-h'      // 水平对齐 (纯文本节点)
  | 'align-v'      // 垂直对齐 (纯文本节点)
  | 'bold'         // 粗体切换 (纯文本节点)
  | 'align'        // 多选对齐
  | 'distribute'   // 多选分布
  | 'arrange'      // 多选对齐与分布 (1:1 语雀白板二级气泡)
  | 'group'        // 成组 / 解组
  | 'open-panel'   // 打开/聚焦右侧深度设置面板 (🎛)
  | 'mindmap-layout'
  | 'mindmap-branch'
  | 'mindmap-shape'
  | 'mindmap-marker'
  | 'mindmap-summary'

export type PanelTabKey = 'style' | 'text' | 'arrange'

export type PanelSectionKey =
  | 'shape-preview'   // 形状类型预览
  | 'fill'            // 填充颜色
  | 'stroke'          // 边框 / 描边
  | 'opacity'         // 不透明度滑块
  | 'line-style'      // 线条专用样式 (路由、线型、箭头)
  | 'typography'      // 字体样式 (B/I/S/U, 字号, 颜色)
  | 'align'           // 文本水平垂直对齐
  | 'link'            // 链接
  | 'arrange-align'   // 图元多选对齐与分布
  | 'arrange-layer'   // 图层上下层叠
  | 'arrange-group'   // 成组、锁定、副本
  | 'mindmap-layout'  // 思维导图结构布局
  | 'mindmap-node'    // 思维导图节点形状与边框
  | 'mindmap-branch'  // 思维导图分支与彩虹设置

export interface NodeSchema {
  type: string
  label: string
  /** 节点上方的浮动快捷条配置 (1:1 语雀就近快捷栏) */
  quickToolbar: QuickToolbarItem[]
  /** 右侧深度设置面板配置 (Schema 驱动) */
  panel: {
    tabs: PanelTabKey[]
    sections: {
      style?: PanelSectionKey[]
      text?: PanelSectionKey[]
      arrange?: PanelSectionKey[]
    }
  }
}

/** 1. 基础几何图形 (Shape) */
export const shapeSchema: NodeSchema = {
  type: 'shape',
  label: '图形',
  quickToolbar: ['fill', 'stroke', 'text', 'open-panel'],
  panel: {
    tabs: ['style', 'text', 'arrange'],
    sections: {
      style: ['shape-preview', 'fill', 'stroke', 'opacity'],
      text: ['typography', 'align', 'link'],
      arrange: ['arrange-align', 'arrange-layer', 'arrange-group'],
    },
  },
}

/** 2. 图片图元 (Image) —— 1:1 对齐语雀：样式 Tab 仅有【不透明度】 */
export const imageSchema: NodeSchema = {
  type: 'image',
  label: '图片',
  quickToolbar: ['opacity', 'link', 'open-panel'],
  panel: {
    tabs: ['style', 'text', 'arrange'],
    sections: {
      style: ['opacity'], // 🌟 仅不透明度！
      text: ['typography', 'link'],
      arrange: ['arrange-align', 'arrange-layer', 'arrange-group'],
    },
  },
}

/** 3. 自由连线 / 线条 (Line / Edge) —— 支持头尾箭头、线型、线条文字 */
export const lineSchema: NodeSchema = {
  type: 'line',
  label: '线条',
  quickToolbar: ['line-type', 'stroke', 'arrow-head', 'open-panel'],
  panel: {
    tabs: ['style', 'text', 'arrange'],
    sections: {
      style: ['line-style', 'stroke', 'opacity'],
      text: ['typography', 'link'],
      arrange: ['arrange-layer'],
    },
  },
}

/** 4. 闭合矢量图形 (Vector Polygon) */
export const vectorSchema: NodeSchema = {
  type: 'vector',
  label: '矢量图',
  quickToolbar: ['fill', 'stroke', 'open-panel'],
  panel: {
    tabs: ['style', 'arrange'],
    sections: {
      style: ['fill', 'stroke', 'opacity'],
      arrange: ['arrange-align', 'arrange-layer', 'arrange-group'],
    },
  },
}

/** 5. 纯文本节点 (Text) */
export const textSchema: NodeSchema = {
  type: 'text',
  label: '文本',
  quickToolbar: ['font-size', 'text-color', 'bold', 'align-h', 'open-panel'],
  panel: {
    tabs: ['text', 'arrange'],
    sections: {
      text: ['typography', 'align', 'link'],
      arrange: ['arrange-align', 'arrange-layer', 'arrange-group'],
    },
  },
}

/** 6. 多选组合状态 (Multiple Selection) */
export const multipleSchema: NodeSchema = {
  type: 'multiple',
  label: '多选',
  quickToolbar: ['arrange', 'group', 'open-panel'],
  panel: {
    tabs: ['arrange'],
    sections: {
      arrange: ['arrange-align', 'arrange-layer', 'arrange-group'],
    },
  },
}

/** 7. 组合成组状态 (Group Node) —— 成组后不需要排列，仅提供取消成组 */
export const groupSchema: NodeSchema = {
  type: 'group',
  label: '组合',
  quickToolbar: ['group', 'open-panel'],
  panel: {
    tabs: ['arrange'],
    sections: {
      arrange: ['arrange-layer', 'arrange-group'],
    },
  },
}

/** 8. 思维导图中心主题根节点 (Mindmap Root) —— 支持结构布局，不支持概要 */
export const mindmapRootSchema: NodeSchema = {
  type: 'mindmap-root',
  label: '思维导图 (中心主题)',
  quickToolbar: [
    'mindmap-layout',
    'fill',
    'stroke',
    'text',
    'open-panel',
  ],
  panel: {
    tabs: ['style', 'text', 'arrange'],
    sections: {
      style: ['mindmap-layout', 'mindmap-node', 'mindmap-branch'],
      text: ['typography', 'align', 'link'],
      arrange: ['arrange-layer', 'arrange-group'],
    },
  },
}

/** 9. 思维导图分支节点 (Mindmap Branch Node) —— 支持概要操作，不支持全局结构布局 */
export const mindmapNodeSchema: NodeSchema = {
  type: 'mindmap-node',
  label: '思维导图 (分支主题)',
  quickToolbar: [
    'mindmap-layout',
    'fill',
    'stroke',
    'text',
    'open-panel',
  ],
  panel: {
    tabs: ['style', 'text', 'arrange'],
    sections: {
      style: ['mindmap-node', 'mindmap-branch'],
      text: ['typography', 'align', 'link'],
      arrange: ['arrange-layer', 'arrange-group'],
    },
  },
}

/** 10. 思维导图概要节点 (Mindmap Summary Node) —— 不支持分支/结构/再次嵌套概要 */
export const mindmapSummarySchema: NodeSchema = {
  type: 'mindmap-summary',
  label: '思维导图 (概要主题)',
  quickToolbar: [
    'fill',
    'stroke',
    'text',
    'open-panel',
  ],
  panel: {
    tabs: ['style', 'text', 'arrange'],
    sections: {
      style: ['mindmap-node'],
      text: ['typography', 'align', 'link'],
      arrange: ['arrange-layer', 'arrange-group'],
    },
  },
}

/** 兼容旧版单一 mindmap key */
export const mindmapSchema: NodeSchema = mindmapNodeSchema

export const schemaRegistry: Record<string, NodeSchema> = {
  shape: shapeSchema,
  image: imageSchema,
  line: lineSchema,
  vector: vectorSchema,
  text: textSchema,
  multiple: multipleSchema,
  group: groupSchema,
  mindmap: mindmapSchema,
  'mindmap-root': mindmapRootSchema,
  'mindmap-node': mindmapNodeSchema,
  'mindmap-summary': mindmapSummarySchema,
}

/** 获取指定元素对应的 Schema */
export function getNodeSchema(type: string): NodeSchema {
  return schemaRegistry[type] || shapeSchema
}
