import type { ColaboradorDto, TaskSubtaskDto } from '../../types'
import type { GanttTaskItem } from '../../ganttModel'
import { parseYmd, startOfDay } from '../../utils'

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const

/** Fecha tipo `yyyy-MM-dd` o ISO parcial → «d mes» (timeline / panel lateral). */
export function formatTimelineShortDate(iso: string): string {
  const d = new Date(`${iso.trim().slice(0, 10)}T00:00:00`)
  const day = d.getDate()
  return `${day} ${MONTHS_SHORT[d.getMonth()] ?? '?'}`
}

/** Nombre del responsable de subtarea para pies de fila (timeline / modales compactos). */
export function subtaskResponsibleLabel(
  userId: number | null | undefined,
  collaboratorNames?: Map<number, string>,
): string | null {
  if (userId == null) return null
  return collaboratorNames?.get(userId) ?? `#${userId}`
}

export function ganttSubtaskCountHint(task: Pick<GanttTaskItem, 'subtaskTotal' | 'subtaskDone'>): string {
  const total = task.subtaskTotal ?? 0
  if (total <= 0) return ''
  return ` · Subtareas ${task.subtaskDone ?? 0}/${task.subtaskTotal}`
}

export function timelinePrincipalDisplayName(
  task: GanttTaskItem,
  collaborators: ColaboradorDto[],
  collaboratorNames?: Map<number, string>,
): string {
  if (task.principalUserId == null) return ''
  const match = collaborators.find((c) => c.id === task.principalUserId)
  return (
    match?.nombreCompleto ?? collaboratorNames?.get(task.principalUserId) ?? `Usuario #${task.principalUserId}`
  )
}

/** Fecha límite más tardía entre subtareas (`yyyy-MM-DD` o null). */
export function maxSubtaskDueYmd(subs: TaskSubtaskDto[] | undefined): string | null {
  if (!subs?.length) return null
  let bestTs = Number.NEGATIVE_INFINITY
  let bestYmd: string | null = null
  for (const s of subs) {
    const raw = s.dueDate?.trim()
    if (!raw) continue
    try {
      const parsed = parseYmd(raw)
      if (parsed == null) continue
      const ts = startOfDay(parsed).getTime()
      if (ts > bestTs) {
        bestTs = ts
        bestYmd = raw.length >= 10 ? raw.slice(0, 10) : raw
      }
    } catch {
      /* fecha inválida */
    }
  }
  return bestYmd
}

export function timelineParentRowTooltip(title: string, maxDueLabel: string | null, subtaskHint: string): string {
  const tail = subtaskHint.replace(/^\s*·\s*/, '')
  const parts = [title, maxDueLabel ? `Última fecha (subtareas): ${maxDueLabel}` : '', tail].filter(Boolean)
  return parts.join(' · ')
}
