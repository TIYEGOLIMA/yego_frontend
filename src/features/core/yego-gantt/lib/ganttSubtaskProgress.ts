import type { Dispatch, SetStateAction } from 'react'
import type { Kpis, TaskRow, TaskSubtaskDto } from '../types'
import { updateTaskSubtask } from '../ganttApi'

export function normalizeSubtaskDto(raw: TaskSubtaskDto): TaskSubtaskDto {
  const w = raw.weight as string | number | undefined
  return {
    ...raw,
    weight: typeof w === 'string' ? w : String(w ?? '1'),
    assignedUserId: raw.assignedUserId ?? null,
    dueDate: raw.dueDate ?? null,
    description: raw.description ?? null,
    createdByUserId: raw.createdByUserId ?? null,
    areaId: raw.areaId ?? null,
    workspaceId: raw.workspaceId ?? null,
  }
}

/**
 * Misma regla que el backend: si hay al menos un `dueDate` en subtareas, la fin del padre
 * es max(inicio, máximo due); si no hay ninguna fecha límite, se conserva la fin actual.
 */
export function parentEndDateFromSubtasks(
  startYmd: string,
  currentEndYmd: string,
  list: Pick<TaskSubtaskDto, 'dueDate'>[],
): string {
  const dues: string[] = []
  for (const s of list) {
    const d = s.dueDate
    if (d == null) continue
    const dn = String(d).trim().slice(0, 10)
    if (dn !== '' && /^\d{4}-\d{2}-\d{2}$/.test(dn)) dues.push(dn)
  }
  if (dues.length === 0) return currentEndYmd
  const maxDue = dues.reduce((a, b) => (a >= b ? a : b))
  return maxDue < startYmd ? startYmd : maxDue
}

export function normalizeSubtaskDtoList(rows: unknown): TaskSubtaskDto[] {
  if (!Array.isArray(rows)) return []
  return rows.map((row) => normalizeSubtaskDto(row as TaskSubtaskDto))
}

export async function updateTaskSubtaskNormalized(
  taskId: number,
  subtaskId: number,
  body: Parameters<typeof updateTaskSubtask>[2],
): Promise<TaskSubtaskDto> {
  return normalizeSubtaskDto(await updateTaskSubtask(taskId, subtaskId, body))
}

/** Misma lógica que el agregado ponderado del backend (`computeWeightedProgressPercent`). */
export function weightedProgressPercentFromSubtasks(list: TaskSubtaskDto[]): number {
  let sumW = 0
  let sumDoneW = 0
  for (const s of list) {
    const raw = Number(s.weight)
    const w = Number.isFinite(raw) && raw > 0 ? raw : 1
    sumW += w
    if (s.done) sumDoneW += w
  }
  if (sumW <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((sumDoneW / sumW) * 100)))
}

/** Tras mutar subtareas en el modal: barra de progreso + contadores en la grilla sin esperar `GET /summary`. */
export function patchGanttParentFromSubtasks(
  parentId: number,
  list: TaskSubtaskDto[],
  setTasks: Dispatch<SetStateAction<TaskRow[]>>,
  setKpis: Dispatch<SetStateAction<Kpis | null>>,
): void {
  const pct = weightedProgressPercentFromSubtasks(list)
  const doneN = list.reduce((n, s) => n + (s.done ? 1 : 0), 0)
  const totalN = list.length
  setTasks((pt) => {
    const nt = pt.map((t) =>
      t.id === parentId
        ? {
            ...t,
            progressPercent: pct,
            subtaskDone: doneN,
            subtaskTotal: totalN,
            endDate: parentEndDateFromSubtasks(t.startDate, t.endDate, list),
          }
        : t,
    )
    const avg = nt.reduce((sum, t) => sum + (t.progressPercent ?? 0), 0) / Math.max(1, nt.length)
    setKpis((k) => (k ? { ...k, progresoPromedioPct: Math.round(avg * 10) / 10 } : k))
    return nt
  })
}
