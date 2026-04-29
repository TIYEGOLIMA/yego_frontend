/** Modelo de vista para Gantt estilo Pulse/Lovable, derivado del API Integral. */

import type {
  TaskRowLike,
  GanttTaskItem,
  GanttTeamItem,
  TimelineRange,
} from './types'
import {
  startOfDay,
  parseYmd,
  differenceInCalendarDays,
  mapVisualStatus,
  mapVisualPriority,
  areaBarFill,
  areaLabelColor,
  timelineTaskBarColor,
} from './utils'

export type {
  TaskRowLike,
  GanttTaskItem,
  GanttTeamItem,
  TimelineRange,
}

export { mapVisualStatus, mapVisualPriority, areaBarFill, areaLabelColor, timelineTaskBarColor }

/** Ancho mínimo por día (px): cabe "sáb" + "25 abr" en dos líneas sin recortar con puntos suspensivos. */
export const DAY_WIDTH = 46

export function buildTimelineRange(tasks: TaskRowLike[]): TimelineRange {
  const pad = 2
  const minDays = 7
  if (tasks.length === 0) {
    const anchor = startOfDay(new Date())
    anchor.setDate(anchor.getDate() - pad)
    return { anchor, totalDays: minDays }
  }
  let min: Date | null = parseYmd(tasks[0].startDate)
  let max: Date | null = parseYmd(tasks[0].endDate)
  for (const t of tasks) {
    const a = parseYmd(t.startDate)
    const b = parseYmd(t.endDate)
    if (a && (!min || a < min)) min = a
    if (b && (!max || b > max)) max = b
  }
  if (!min || !max) {
    const anchor = startOfDay(new Date())
    anchor.setDate(anchor.getDate() - pad)
    return { anchor, totalDays: minDays }
  }
  const anchor = startOfDay(min)
  anchor.setDate(anchor.getDate() - pad)
  const endPadded = startOfDay(max)
  endPadded.setDate(endPadded.getDate() + pad)
  let totalDays = differenceInCalendarDays(endPadded, anchor) + 1
  if (totalDays < minDays) totalDays = minDays
  return { anchor, totalDays }
}

export function taskRowToGanttItem(
  t: TaskRowLike,
  range: TimelineRange,
  workspaceLabel?: string | null,
): GanttTaskItem {
  const principalUserId =
    t.assignedUserIds != null && t.assignedUserIds.length > 0
      ? t.assignedUserIds[0]
      : t.assignedUserId != null
        ? t.assignedUserId
        : undefined
  const assigneeStr = principalUserId != null ? String(principalUserId) : undefined

  const s = parseYmd(t.startDate)
  const e = parseYmd(t.endDate)
  if (!s || !e) {
    return {
      id: String(t.id),
      name: t.title,
      startDay: 0,
      duration: 1,
      progress: t.progressPercent ?? 0,
      status: mapVisualStatus(t.status),
      priority: mapVisualPriority(t.priority),
      assignee: assigneeStr,
      principalUserId,
      description: t.description ?? undefined,
      sourceId: t.id,
      areaId: t.areaId,
      workspaceLabel: workspaceLabel ?? undefined,
    }
  }
  let startDay = differenceInCalendarDays(startOfDay(s), startOfDay(range.anchor))
  if (startDay < 0) startDay = 0
  if (startDay >= range.totalDays) startDay = range.totalDays - 1
  let duration = differenceInCalendarDays(startOfDay(e), startOfDay(s)) + 1
  if (duration < 1) duration = 1
  if (startDay + duration > range.totalDays) {
    duration = range.totalDays - startDay
  }
  if (duration < 1) duration = 1

  return {
    id: String(t.id),
    name: t.title,
    startDay,
    duration,
    progress: t.progressPercent ?? 0,
    status: mapVisualStatus(t.status),
    priority: mapVisualPriority(t.priority),
    assignee: assigneeStr,
    principalUserId,
    description: t.description ?? undefined,
    sourceId: t.id,
    areaId: t.areaId,
    workspaceLabel: workspaceLabel ?? undefined,
  }
}

/** Desplaza el inicio del rango visible (navegación semanal). */
export function shiftTimelineRange(range: TimelineRange, deltaDays: number): TimelineRange {
  const a = new Date(range.anchor)
  a.setDate(a.getDate() + deltaDays)
  a.setHours(0, 0, 0, 0)
  return { anchor: a, totalDays: range.totalDays }
}

/** Celda de cabecera / grid: es el día calendario de hoy. */
export function isTodayAtIndex(anchor: Date, dayIndex: number): boolean {
  const d = new Date(anchor)
  d.setDate(d.getDate() + dayIndex)
  d.setHours(0, 0, 0, 0)
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  return d.getTime() === t.getTime()
}

export function buildTeamsFromTasks(
  tasks: TaskRowLike[],
  range: TimelineRange,
  opts?: { workspaceNameById?: Map<number, string>; showProjectNameOnTasks?: boolean },
): GanttTeamItem[] {
  const wsMap = opts?.workspaceNameById
  const showProj = opts?.showProjectNameOnTasks === true && wsMap != null
  const labelFor = (tr: TaskRowLike): string | null | undefined => {
    if (!showProj || tr.workspaceId == null) return undefined
    return wsMap.get(tr.workspaceId) ?? undefined
  }
  const byArea = new Map<number, TaskRowLike[]>()
  for (const t of tasks) {
    if (!byArea.has(t.areaId)) byArea.set(t.areaId, [])
    byArea.get(t.areaId)!.push(t)
  }
  const entries = [...byArea.entries()].sort((a, b) => {
    const na = a[1][0]?.areaName || `Área ${a[0]}`
    const nb = b[1][0]?.areaName || `Área ${b[0]}`
    return na.localeCompare(nb)
  })
  return entries.map(([areaId, list]) => {
    const cap = Math.min(100, 35 + list.length * 12)
    return {
      id: String(areaId),
      name: list[0]?.areaName?.trim() || `Área ${areaId}`,
      capacity: cap,
      tasks: list.map((tr) => taskRowToGanttItem(tr, range, labelFor(tr))),
    }
  })
}

/**
 * Tareas solapadas por día del timeline [0 .. totalDays-1] (base del heatmap por celda).
 */
export function computePerDayTaskLoad(tasks: GanttTaskItem[], totalDays: number): number[] {
  const arr = new Array<number>(totalDays).fill(0)
  for (const t of tasks) {
    const start = Math.max(0, t.startDay)
    const end = Math.min(totalDays, t.startDay + t.duration)
    for (let d = start; d < end; d++) {
      arr[d]++
    }
  }
  return arr
}

/**
 * Ruta crítica por equipo sin grafo de dependencias en API:
 * - Prioridad urgente, bloqueada o en riesgo siempre destacan.
 * - Si no hay ninguna, las que terminan el último día de fin del equipo (empujan la fecha).
 */
export function computeCriticalPathTaskIds(tasks: GanttTaskItem[]): Set<string> {
  const ids = new Set<string>()
  if (tasks.length === 0) return ids

  for (const t of tasks) {
    if (t.priority === "critical" || t.status === "blocked") {
      ids.add(t.id)
    }
  }
  if (ids.size > 0) return ids

  const nonCompleted = tasks.filter((t) => t.status !== "completed")
  const pool = nonCompleted.length > 0 ? nonCompleted : tasks
  const maxEnd = pool.reduce((m, t) => Math.max(m, t.startDay + t.duration), 0)

  for (const t of pool) {
    if (t.startDay + t.duration === maxEnd) ids.add(t.id)
  }

  if (ids.size === 0) {
    tasks.forEach((t) => ids.add(t.id))
  }
  return ids
}

export function getTodayOffsetDays(range: TimelineRange): number {
  const today = startOfDay(new Date())
  const anchor = startOfDay(range.anchor)
  return differenceInCalendarDays(today, anchor)
}

export { timelineDayDensity, formatTimelineDayCell, isWeekendDay, formatSpanishDayHeader } from './utils'
