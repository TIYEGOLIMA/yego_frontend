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

export const STATUS_LABEL: Record<AreaTaskStatus, string> = {
  PENDING: 'Por Hacer',
  IN_PROGRESS: 'En Progreso',
  DONE: 'Hecho',
  BLOCKED: 'Bloqueada',
  AT_RISK: 'En riesgo',
}

export const TASK_STATUS_LABEL: Record<AreaTaskStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En curso',
  DONE: 'Hecha',
  BLOCKED: 'Bloqueada',
  AT_RISK: 'En riesgo',
}

export const TASK_STATUS_COLOR: Record<AreaTaskStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  DONE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  BLOCKED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  AT_RISK: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
}

export const STATUS_BG: Record<AreaTaskStatus, string> = {
  PENDING: 'bg-red-500 text-white',
  IN_PROGRESS: 'bg-amber-500 text-white',
  DONE: 'bg-emerald-500 text-white',
  BLOCKED: 'bg-zinc-400 text-white',
  AT_RISK: 'bg-gray-400 text-white',
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
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

/**
 * Determina el color de un tag basado en su nombre (hash consistente)
 */
export function tagColor(tag: string): string {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) | 0
  return TAG_COLORS[Math.abs(h) % TAG_COLORS.length]
}

/**
 * Verifica si una tarea está vencida (endDate < hoy)
 */
export function isOverdue(endDate: string): boolean {
  return new Date(endDate + 'T23:59:59') < new Date()
}

/**
 * Calcula la diferencia en días calendario entre dos fechas
 */
export function differenceInCalendarDays(left: Date, right: Date): number {
  const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return Math.round((sod(left) - sod(right)) / 86400000)
}

/**
 * Formatea una fecha ISO a formato corto (ej: "25 abr")
 */
export function fmtShort(isoDate: string): string {
  const d = new Date(isoDate + (isoDate.length <= 10 ? 'T12:00:00' : ''))
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

/**
 * Iniciales a partir de una etiqueta/label
 */
export function initialsFromLabel(label: string): string {
  const p = label.trim().split(/\s+/).filter(Boolean)
  if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase()
  if (p.length === 1 && p[0].length >= 2) return p[0].slice(0, 2).toUpperCase()
  return label.slice(0, 2).toUpperCase() || '·'
}

// ==================== MAPEO VISUAL ====================

/**
 * Mapea el estado de tarea a estado visual del Gantt
 */
export function mapVisualStatus(s: AreaTaskStatus): GanttVisualStatus {
  switch (s) {
    case 'DONE':
      return 'completed'
    case 'BLOCKED':
      return 'blocked'
    case 'AT_RISK':
      return 'at-risk'
    default:
      return 'on-track'
  }
}

/**
 * Mapea la prioridad de tarea a prioridad visual del Gantt
 */
export function mapVisualPriority(p?: TaskPriority | null): GanttVisualPriority {
  switch (p) {
    case 'LOW':
      return 'low'
    case 'HIGH':
      return 'high'
    case 'URGENT':
      return 'critical'
    default:
      return 'medium'
  }
}

// ==================== COLORES DE ÁREA ====================

/** Primero rojo Yego (#EF0000); resto distinguen equipos sin perder identidad Integral. */
const AREA_HEX = ['#EF0000', '#2563eb', '#ea580c', '#64748b', '#7c3aed', '#0d9488'] as const

/**
 * Obtiene el color de barra para un área específica
 */
export function areaBarFill(areaId: number, status: GanttVisualStatus): string {
  if (status === 'completed') return '#94a3b8'
  if (status === 'blocked') return '#991b1b'
  if (status === 'at-risk') return '#c2410c'
  return AREA_HEX[Math.abs(areaId) % AREA_HEX.length]
}

/**
 * Obtiene el color de etiqueta para un área específica
 */
export function areaLabelColor(areaId: number): string {
  return AREA_HEX[Math.abs(areaId) % AREA_HEX.length]
}

// ==================== ESTILOS DE PILL PARA ÁREAS ====================

export const AREA_PILL_STYLES = [
  'bg-orange-100 text-orange-900 border-orange-200',
  'bg-teal-100 text-teal-900 border-teal-200',
  'bg-violet-100 text-violet-900 border-violet-200',
  'bg-amber-100 text-amber-900 border-amber-200',
]

/**
 * Obtiene la clase CSS para un pill de área
 */
export function areaPillClass(areaId: number): string {
  return AREA_PILL_STYLES[Math.abs(areaId) % AREA_PILL_STYLES.length]
}

// ==================== FUNCIONES DE PESO/PUNTOS ====================

/**
 * Peso tipo "story points" por prioridad
 */
export function taskPoints(priority?: TaskPriority | null): number {
  switch (normPriority(priority)) {
    case 'URGENT':
      return 8
    case 'HIGH':
      return 5
    case 'MEDIUM':
      return 3
    case 'LOW':
      return 1
    default:
      return 3
  }
}

/**
 * Capacidad heurística por duración del sprint (~2.67 pts/día, mín. 24)
 */
export function sprintCapacityPts(totalDays: number): number {
  return Math.max(24, Math.round(totalDays * (8 / 3)))
}

// ==================== FECHAS ====================

/**
 * Obtiene el inicio del día (00:00:00)
 */
export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/**
 * Parsea una fecha en formato YMD (YYYY-MM-DD)
 */
export function parseYmd(s: string): Date {
  return startOfDay(new Date(s + 'T12:00:00'))
}

/**
 * Calcula los días entre dos fechas
 */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

/**
 * Formatea un encabezado de día en español
 */
export function formatSpanishDayHeader(d: Date): { weekday: string; label: string } {
  const weekday = d
    .toLocaleDateString('es', { weekday: 'short' })
    .replace(/\./g, '')
    .trim()
    .toLowerCase()
  const month = d
    .toLocaleDateString('es', { month: 'short' })
    .replace(/\./g, '')
    .trim()
    .toLowerCase()
  const label = `${d.getDate()} ${month}`
  return { weekday, label }
}

/**
 * Determina la densidad del timeline según el ancho de columna
 */
export function timelineDayDensity(dayWidth: number): 'comfortable' | 'compact' | 'minimal' {
  if (dayWidth >= 42) return 'comfortable'
  if (dayWidth >= 30) return 'compact'
  return 'minimal'
}

/**
 * Verifica si un día específico es fin de semana
 */
export function isWeekendDay(anchor: Date, dayIndex: number): boolean {
  const d = new Date(anchor)
  d.setDate(d.getDate() + dayIndex)
  const w = d.getDay()
  return w === 0 || w === 6
}

/**
 * Texto por celda del timeline según densidad (cabecera Gantt).
 */
export function formatTimelineDayCell(
  anchor: Date,
  dayIndex: number,
  density: 'comfortable' | 'compact' | 'minimal',
): { weekday: string; label: string; title: string } {
  const d = new Date(anchor)
  d.setDate(d.getDate() + dayIndex)
  d.setHours(0, 0, 0, 0)
  const { weekday, label } = formatSpanishDayHeader(d)
  const title = d.toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  if (density === 'minimal') {
    return { weekday: '', label, title }
  }
  if (density === 'compact') {
    return { weekday: weekday.slice(0, 3), label, title }
  }
  return { weekday, label, title }
}
