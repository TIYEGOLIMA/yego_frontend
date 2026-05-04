import type {
  AreaTaskStatus,
  MeetingMinuteStatus,
  MeetingMinuteType,
  WorkosMeetingItemStatus,
  WorkosMeetingItemType,
} from '../../types'
import { STATUS_LABEL } from '../../utils'

/** Aviso vista parcial del acta (ítems filtrados en API). */
export const RESTRICTED_ACTA_VIEW_NOTICE =
  'Vista restringida: solo ves los puntos donde figuras como responsable o que corresponden a tu área. Los KPI y la tabla reflejan únicamente esos ítems.'

export const MEETING_STATUS_LABEL: Record<MeetingMinuteStatus, string> = {
  ABIERTA: 'Abierta',
  EN_SEGUIMIENTO: 'En seguimiento',
  CERRADA: 'Cerrada',
  CANCELADA: 'Cancelada',
}

export const MEETING_TYPE_LABEL: Record<MeetingMinuteType, string> = {
  COMITE: 'Comité',
  SEGUIMIENTO: 'Seguimiento',
  OPERATIVA: 'Operativa',
  ESTRATEGICA: 'Estratégica',
  OTRO: 'Otro',
}

export const ITEM_TYPE_LABEL: Record<WorkosMeetingItemType, string> = {
  ACCION: 'Acción',
  DECISION: 'Decisión',
  RIESGO: 'Riesgo',
  SEGUIMIENTO: 'Seguimiento',
  INFORMACION: 'Información',
}

export const ITEM_STATUS_LABEL: Record<WorkosMeetingItemStatus, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROGRESO: 'En progreso',
  BLOQUEADA: 'Bloqueada',
  COMPLETADA: 'Completada',
  CANCELADA: 'Cancelada',
}

export const ITEM_STATUSES: WorkosMeetingItemStatus[] = [
  'PENDIENTE',
  'EN_PROGRESO',
  'BLOQUEADA',
  'COMPLETADA',
  'CANCELADA',
]

export function formatListRowDate(iso: string): { day: string; rest: string } {
  const d = new Date(iso + (iso.length <= 10 ? 'T12:00:00' : ''))
  const day = d.toLocaleDateString('es', { day: '2-digit' })
  const rest = d.toLocaleDateString('es', { month: 'short', year: 'numeric' })
  return { day, rest }
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso + (iso.length <= 10 ? 'T12:00:00' : ''))
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function meetingStatusBadgeClass(s: MeetingMinuteStatus): string {
  switch (s) {
    case 'ABIERTA':
      return 'bg-sky-500/12 text-sky-800 dark:text-sky-200 border-sky-500/20'
    case 'EN_SEGUIMIENTO':
      return 'bg-amber-500/12 text-amber-900 dark:text-amber-100 border-amber-500/25'
    case 'CERRADA':
      return 'bg-emerald-500/12 text-emerald-800 dark:text-emerald-200 border-emerald-500/20'
    case 'CANCELADA':
      return 'bg-muted text-muted-foreground border-border/80'
    default:
      return 'bg-muted text-muted-foreground border-border/80'
  }
}

export function taskStatusLabel(status: AreaTaskStatus | string | null | undefined): string {
  if (status == null || status === '') return ''
  const k = String(status)
  return k in STATUS_LABEL ? STATUS_LABEL[k as AreaTaskStatus] : k
}

export function itemTypeBadgeClass(t: WorkosMeetingItemType): string {
  switch (t) {
    case 'DECISION':
      return 'bg-violet-500/12 text-violet-800 dark:text-violet-200 border-violet-500/25'
    case 'ACCION':
      return 'bg-sky-500/12 text-sky-800 dark:text-sky-200 border-sky-500/20'
    case 'RIESGO':
      return 'bg-amber-500/12 text-amber-900 dark:text-amber-100 border-amber-500/25'
    case 'SEGUIMIENTO':
      return 'bg-teal-500/12 text-teal-800 dark:text-teal-200 border-teal-500/20'
    case 'INFORMACION':
      return 'bg-slate-500/12 text-slate-700 dark:text-slate-300 border-slate-500/25'
    default:
      return 'bg-muted text-muted-foreground border-border/80'
  }
}

export function itemStatusBadgeClass(s: WorkosMeetingItemStatus): string {
  switch (s) {
    case 'PENDIENTE':
      return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20'
    case 'EN_PROGRESO':
      return 'bg-sky-500/12 text-sky-800 dark:text-sky-200 border-sky-500/20'
    case 'BLOQUEADA':
      return 'bg-destructive/10 text-destructive border-destructive/25'
    case 'COMPLETADA':
      return 'bg-emerald-500/12 text-emerald-800 dark:text-emerald-200 border-emerald-500/25'
    case 'CANCELADA':
      return 'bg-muted text-muted-foreground border-border/80'
    default:
      return 'bg-muted text-muted-foreground border-border/80'
  }
}
