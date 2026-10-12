export interface BoardIconItem {
  id: string
  name: string
  category: string
  svg: string
}

export const DEFAULT_ICON_CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'people', label: '人物与用户' },
  { key: 'tech', label: 'IT与云架构' },
  { key: 'office', label: '办公与商务' },
  { key: 'flow', label: '流程与状态' },
]

export const DEFAULT_BOARD_ICONS: BoardIconItem[] = [
  // --- 人物与用户 (People) ---
  {
    id: 'user-single',
    name: '用户',
    category: 'people',
    svg: `<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  },
  {
    id: 'user-female',
    name: '女性用户',
    category: 'people',
    svg: `<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#ec4899" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 14c-4 0-7 2.5-7 5.5V21h14v-1.5c0-3-3-5.5-7-5.5z"/><circle cx="12" cy="7" r="4"/><path d="M9 11c0 1.5 1.5 2 3 2s3-.5 3-2"/></svg>`,
  },
  {
    id: 'user-group',
    name: '团队/多人',
    category: 'people',
    svg: `<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-3-3.87"/><path d="M9 21v-2a4 4 0 0 0-4-4H4a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><circle cx="17" cy="7" r="3"/></svg>`,
  },
  {
    id: 'user-admin',
    name: '管理员',
    category: 'people',
    svg: `<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m19 8 2 2-4 4-2-2z"/></svg>`,
  },

  // --- IT与云架构 (Tech & Cloud) ---
  {
    id: 'server',
    name: '服务器集群',
    category: 'tech',
    svg: `<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>`,
  },
  {
    id: 'database',
    name: '数据库',
    category: 'tech',
    svg: `<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>`,
  },
  {
    id: 'cloud',
    name: '云服务',
    category: 'tech',
    svg: `<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`,
  },
  {
    id: 'gateway',
    name: 'API网关',
    category: 'tech',
    svg: `<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/><path d="m14 13 3 3-3 3"/></svg>`,
  },
  {
    id: 'shield-security',
    name: '防火墙/安全',
    category: 'tech',
    svg: `<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>`,
  },

  // --- 办公与商务 (Office) ---
  {
    id: 'document',
    name: '文档资料',
    category: 'office',
    svg: `<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>`,
  },
  {
    id: 'chat',
    name: '沟通反馈',
    category: 'office',
    svg: `<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  },
  {
    id: 'mail',
    name: '邮件通知',
    category: 'office',
    svg: `<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#e11d48" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  },
  {
    id: 'calendar',
    name: '日程安排',
    category: 'office',
    svg: `<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
  },

  // --- 流程与状态 (Flow & Status) ---
  {
    id: 'check-circle',
    name: '完成状态',
    category: 'flow',
    svg: `<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`,
  },
  {
    id: 'alert-triangle',
    name: '异常警告',
    category: 'flow',
    svg: `<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`,
  },
  {
    id: 'settings',
    name: '配置节点',
    category: 'flow',
    svg: `<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
  },
]
