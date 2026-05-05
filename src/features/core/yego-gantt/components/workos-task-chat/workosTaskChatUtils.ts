import type { WorkosTaskMessageType } from '../../workosTaskMessagesApi'

export const THREAD_TASK = '__task__'

export function formatChatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function bubbleClassForMessageType(t: WorkosTaskMessageType): string {
  switch (t) {
    case 'SYSTEM':
      return 'border-amber-200/80 bg-amber-50/70 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100'
    case 'RESOLUTION':
      return 'border-emerald-200/80 bg-emerald-50/70 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-100'
    default:
      return 'border-neutral-200 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100'
  }
}

export function messageSenderLabel(authorName: string | undefined, messageType: WorkosTaskMessageType): string {
  if (messageType === 'SYSTEM') return 'Sistema'
  if (messageType === 'RESOLUTION') return 'Resolución'
  return authorName?.trim() || 'Usuario'
}

export function briefMessagePreview(content: string, max = 160): string {
  const t = content.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max).trim()}…`
}

export function parseThreadSubtaskId(threadKey: string): number | null {
  return threadKey === THREAD_TASK ? null : Number(threadKey)
}
