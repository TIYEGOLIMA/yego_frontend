/**
 * Utilidades compartidas del módulo Yego Gantt
 * Centraliza funciones y constantes para evitar duplicación
 */

import type {
  AreaTaskStatus,
  TaskPriority,
  GanttVisualStatus,
  GanttVisualPriority,
} from './types'

// ==================== CONSTANTES DE MAPEO ====================

/** Etiquetas unificadas: Pendiente / Hecha / Bloqueada (y en curso). */
export const STATUS_LABEL: Record<AreaTaskStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En curso',
  DONE: 'Hecha',
  BLOCKED: 'Bloqueada',
}

export const TASK_STATUS_LABEL: Record<AreaTaskStatus, string> = STATUS_LABEL

export const TASK_STATUS_COLOR: Record<AreaTaskStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  DONE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  BLOCKED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

export const STATUS_BG: Record<AreaTaskStatus, string> = {
  PENDING: 'bg-red-500 text-white',
  IN_PROGRESS: 'bg-amber-500 text-white',
  DONE: 'bg-emerald-500 text-white',
  BLOCKED: 'bg-zinc-400 text-white',
}

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

export const PRIO_LABEL: Record<TaskPriority, string> = PRIORITY_LABEL

export const PRIO_COLOR: Record<TaskPriority, string> = {
  LOW: 'text-emerald-600',
  MEDIUM: 'text-foreground',
  HIGH: 'text-amber-600',
  URGENT: 'text-red-600',
}

export const PRIO_BADGE: Record<TaskPriority, string> = {
  LOW: 'bg-muted text-muted-foreground border-border',
  MEDIUM: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
  HIGH: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20',
  URGENT: 'bg-destructive/10 text-destructive border-destructive/20',
}

export const PRIORITY_BADGE: Record<TaskPriority, string> = {
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  LOW: 'bg-slate-100 text-slate-600',
}

export const SPRINT_STATUS_LABEL: Record<'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED', string> = {
  PLANNED: 'Planificado',
  ACTIVE: 'Activo',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
}

/** Hoy (calendario local) es el día de fin o posterior (`yyyy-mm-dd`). Requisito para marcar sprint como completado. */
export function sprintEndDateReached(endDateYmd: string): boolean {
  const parts = endDateYmd.split('-').map((x) => Number(x))
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return false
  const [y, mo, d] = parts
  const endDay = new Date(y, mo - 1, d)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return today.getTime() >= endDay.getTime()
}

// ==================== COLORES DE TAGS ====================

export const TAG_COLORS = [
  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
]

/** @deprecated alias histórico para chips de área; preferir `TAG_COLORS` / `areaPillClass`. */
export const AREA_PILL_STYLES = TAG_COLORS

// ==================== FUNCIONES UTILITARIAS ====================

/**
 * Normaliza una prioridad, devolviendo siempre un valor válido de TaskPriority
 */
export function normPriority(p?: TaskPriority | null): TaskPriority {
  if (p === 'LOW' || p === 'MEDIUM' || p === 'HIGH' || p === 'URGENT') return p
  return 'MEDIUM'
}

// Alias para compatibilidad con código existente
export const norm = normPriority

/**
 * Genera iniciales a partir de un nombre completo
 * Ej: "Juan Pérez" -> "JP"
 */
export function avatarInitials(name: string): string {
  const t = name.trim()
  if (/^#?\d+$/.test(t)) return '?'
  if (/^usuario\b/i.test(t)) return '?'
  const parts = t.split(/\s+/).filter((p) => /^[\p{L}]/u.test(p))
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  const rawParts = t.split(/\s+/)
  if (rawParts.length >= 2) return (rawParts[0][0] + rawParts[1][0]).toUpperCase()
  return t.slice(0, 2).toUpperCase() || '?'
}

/**
 * Devuelve un color de tag estable por índice o hash del texto.
 */
export function tagColor(tag: string | undefined | null, idx: number): string {
  if (!tag) return TAG_COLORS[0]
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0
  return TAG_COLORS[(h + idx) % TAG_COLORS.length]
}

export function isOverdue(endYmd: string): boolean {
  const end = parseYmd(endYmd)
  if (!end) return false
  const today = startOfDay(new Date())
  return end < today
}

export function differenceInCalendarDays(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((ua - ub) / 86400000)
}

export function fmtShort(isoYmd: string): string {
  try {
    const d = new Date(isoYmd + 'T12:00:00')
    return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
  } catch {
    return isoYmd
  }
}

export function initialsFromLabel(label: string): string {
  return avatarInitials(label)
}

export function taskPoints(priority?: TaskPriority | null): number {
  switch (priority) {
    case 'URGENT':
      return 5
    case 'HIGH':
      return 3
    case 'MEDIUM':
      return 2
    case 'LOW':
      return 1
    default:
      return 2
  }
}

export function sprintCapacityPts(days: number): number {
  return Math.max(1, days) * 4
}

export function areaBarFill(progressPct: number): string {
  const p = Math.max(0, Math.min(100, progressPct))
  if (p >= 85) return 'bg-emerald-500'
  if (p >= 50) return 'bg-amber-500'
  if (p >= 25) return 'bg-sky-500'
  return 'bg-slate-400'
}

/** Color sólido (hex) para barras del timeline Gantt (`style.backgroundColor`). */
export function timelineTaskBarColor(progressPct: number, status: GanttVisualStatus): string {
  if (status === 'completed') return '#16a34a'
  if (status === 'blocked') return '#dc2626'
  const p = Math.max(0, Math.min(100, progressPct))
  if (p >= 85) return '#10b981'
  if (p >= 50) return '#f59e0b'
  if (p >= 25) return '#0ea5e9'
  return '#94a3b8'
}

export function areaLabelColor(progressPct: number): string {
  const p = Math.max(0, Math.min(100, progressPct))
  if (p >= 85) return 'text-emerald-700 dark:text-emerald-300'
  if (p >= 50) return 'text-amber-800 dark:text-amber-300'
  return 'text-foreground'
}

export function areaPillClass(areaId: number): string {
  const palette = [
    'border-sky-200 bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-800/50',
    'border-violet-200 bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200 dark:border-violet-800/50',
    'border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800/50',
    'border-teal-200 bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200 dark:border-teal-800/50',
  ]
  return palette[Math.abs(areaId) % palette.length]
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const day = Number(m[3])
  return new Date(y, mo, day)
}

export function daysBetween(startYmd: string, endYmd: string): number {
  const a = parseYmd(startYmd)
  const b = parseYmd(endYmd)
  if (!a || !b) return 0
  return differenceInCalendarDays(b, a) + 1
}

export function formatSpanishDayHeader(d: Date): string {
  return d.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })
}

export type TimelineDayDensity = 'comfortable' | 'compact' | 'minimal'

export function timelineDayDensity(totalDays: number): TimelineDayDensity {
  if (totalDays <= 45) return 'comfortable'
  if (totalDays <= 120) return 'compact'
  return 'minimal'
}

/** Fecha del día `dayIndex` dentro del rango con ancla `anchor` (inicio local 00:00). */
export function dateAtTimelineIndex(anchor: Date, dayIndex: number): Date {
  const d = new Date(anchor)
  d.setDate(d.getDate() + dayIndex)
  d.setHours(0, 0, 0, 0)
  return d
}

export function formatTimelineDayCell(
  anchor: Date,
  dayIndex: number,
  density: TimelineDayDensity,
): { weekday: string; label: string; title: string } {
  const d = dateAtTimelineIndex(anchor, dayIndex)
  const title = d.toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  if (density === 'minimal') {
    return { weekday: '', label: String(d.getDate()), title }
  }
  const weekday = d
    .toLocaleDateString('es', { weekday: 'short' })
    .replace(/\.$/, '')
  const label = d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
  return { weekday, label, title }
}

/** Si `dayOffset` está definido, evalúa el fin de semana en `anchor + dayOffset` (cabecera/celdas del timeline). */
export function isWeekendDay(d: Date, dayOffset?: number): boolean {
  const date = dayOffset == null ? d : dateAtTimelineIndex(d, dayOffset)
  const day = date.getDay()
  return day === 0 || day === 6
}

export function mapVisualStatus(status: AreaTaskStatus): GanttVisualStatus {
  switch (status) {
    case 'DONE':
      return 'completed'
    case 'BLOCKED':
      return 'blocked'
    case 'IN_PROGRESS':
    case 'PENDING':
    default:
      return 'on-track'
  }
}

export function mapVisualPriority(priority?: TaskPriority | null): GanttVisualPriority {
  switch (priority) {
    case 'URGENT':
      return 'critical'
    case 'HIGH':
      return 'high'
    case 'LOW':
      return 'low'
    case 'MEDIUM':
    default:
      return 'medium'
  }
}

/** Duración inclusiva entre dos fechas ISO (mínimo 1 día). */
export function computeDurationDays(start: string, end: string): number {
  const a = new Date(start)
  const b = new Date(end)
  const ms = b.getTime() - a.getTime()
  return Math.max(1, Math.round(ms / 86400000) + 1)
}

export function workosHeatColorForStatus(status: GanttVisualStatus): string {
  if (status === 'completed') return '#16a34a'
  if (status === 'blocked') return '#dc2626'
  return '#ca8a04'
}
