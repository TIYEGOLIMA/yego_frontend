/** Modelo de vista para Gantt estilo Pulse/Lovable, derivado del API Integral. */

export const DAY_WIDTH = 28

export type GanttVisualStatus = "on-track" | "at-risk" | "blocked" | "completed"
export type GanttVisualPriority = "low" | "medium" | "high" | "critical"

export interface GanttTaskItem {
  id: string
  name: string
  startDay: number
  duration: number
  progress: number
  status: GanttVisualStatus
  priority: GanttVisualPriority
  assignee?: string
  description?: string
  sourceId: number
}

export interface GanttTeamItem {
  id: string
  name: string
  capacity: number
  tasks: GanttTaskItem[]
}

export interface TimelineRange {
  anchor: Date
  totalDays: number
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function parseYmd(s: string): Date {
  return startOfDay(new Date(s + "T12:00:00"))
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

export type AreaTaskStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "BLOCKED" | "AT_RISK"
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"

export interface TaskRowLike {
  id: number
  areaId: number
  areaName?: string | null
  title: string
  description?: string | null
  startDate: string
  endDate: string
  status: AreaTaskStatus
  priority?: TaskPriority | null
  progressPercent: number
  assignedUserId?: number | null
  assignedUserIds?: number[]
}

export function mapVisualStatus(s: AreaTaskStatus): GanttVisualStatus {
  switch (s) {
    case "DONE":
      return "completed"
    case "BLOCKED":
      return "blocked"
    case "AT_RISK":
      return "at-risk"
    default:
      return "on-track"
  }
}

export function mapVisualPriority(p?: TaskPriority | null): GanttVisualPriority {
  switch (p) {
    case "LOW":
      return "low"
    case "HIGH":
      return "high"
    case "URGENT":
      return "critical"
    default:
      return "medium"
  }
}

export function buildTimelineRange(tasks: TaskRowLike[]): TimelineRange {
  const pad = 7
  const minDays = 42
  if (tasks.length === 0) {
    const anchor = startOfDay(new Date())
    anchor.setDate(anchor.getDate() - pad)
    return { anchor, totalDays: minDays }
  }
  let min = parseYmd(tasks[0].startDate)
  let max = parseYmd(tasks[0].endDate)
  for (const t of tasks) {
    const a = parseYmd(t.startDate)
    const b = parseYmd(t.endDate)
    if (a < min) min = a
    if (b > max) max = b
  }
  const anchor = startOfDay(min)
  anchor.setDate(anchor.getDate() - pad)
  const endPadded = startOfDay(max)
  endPadded.setDate(endPadded.getDate() + pad)
  let totalDays = daysBetween(anchor, endPadded) + 1
  if (totalDays < minDays) totalDays = minDays
  return { anchor, totalDays }
}

export function taskRowToGanttItem(t: TaskRowLike, range: TimelineRange): GanttTaskItem {
  const s = parseYmd(t.startDate)
  const e = parseYmd(t.endDate)
  let startDay = daysBetween(range.anchor, s)
  if (startDay < 0) startDay = 0
  if (startDay >= range.totalDays) startDay = range.totalDays - 1
  let duration = daysBetween(s, e) + 1
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
    assignee: t.assignedUserId != null ? String(t.assignedUserId) : undefined,
    description: t.description ?? undefined,
    sourceId: t.id,
  }
}

export function buildTeamsFromTasks(tasks: TaskRowLike[], range: TimelineRange): GanttTeamItem[] {
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
      tasks: list.map((tr) => taskRowToGanttItem(tr, range)),
    }
  })
}

export function getTodayOffsetDays(range: TimelineRange): number {
  const today = startOfDay(new Date())
  return daysBetween(range.anchor, today)
}

export function formatTimelineDayLabel(anchor: Date, dayIndex: number): { weekday: string; label: string } {
  const d = new Date(anchor)
  d.setDate(d.getDate() + dayIndex)
  const weekday = d.toLocaleDateString("es-PE", { weekday: "short" })
  const label = d.toLocaleDateString("es-PE", { day: "numeric", month: "short" })
  return { weekday, label }
}

export function isWeekendDay(anchor: Date, dayIndex: number): boolean {
  const d = new Date(anchor)
  d.setDate(d.getDate() + dayIndex)
  const w = d.getDay()
  return w === 0 || w === 6
}
