import type { Dispatch, SetStateAction } from 'react'
import type {
  AreaTaskStatus,
  Kpis,
  TaskRow,
  TaskSubtaskChecklistItem,
  TaskSubtaskDto,
} from '../types'
import { updateTaskSubtask } from '../ganttApi'

const SUBTASK_AREA_STATUSES: readonly AreaTaskStatus[] = ['PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED']

function coerceSubtaskKanbanStatus(raw: TaskSubtaskDto & { status?: unknown }): AreaTaskStatus {
  const s = raw.status
  if (typeof s === 'string' && SUBTASK_AREA_STATUSES.includes(s as AreaTaskStatus)) {
    return s as AreaTaskStatus
  }
  return raw.done ? 'DONE' : 'PENDING'
}

function normalizeChecklist(raw: unknown): TaskSubtaskChecklistItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const o = item as Record<string, unknown>
      const text = typeof o.text === 'string' ? o.text.trim() : ''
      if (!text) return null
      const id = typeof o.id === 'string' && o.id.trim() !== '' ? o.id.trim() : undefined
      return {
        ...(id !== undefined ? { id } : {}),
        text,
        done: Boolean(o.done),
      } as TaskSubtaskChecklistItem
    })
    .filter((x): x is TaskSubtaskChecklistItem => x !== null)
}

export function normalizeSubtaskDto(raw: TaskSubtaskDto): TaskSubtaskDto {
  const w = raw.weight as string | number | undefined
  const status = coerceSubtaskKanbanStatus(raw)
  const done = status === 'DONE'
  return {
    ...raw,
    weight: typeof w === 'string' ? w : String(w ?? '1'),
    status,
    done,
    assignedUserId: raw.assignedUserId ?? null,
    dueDate: raw.dueDate ?? null,
    description: raw.description ?? null,
    objectives: raw.objectives != null && String(raw.objectives).trim() !== '' ? String(raw.objectives) : null,
    checklist: normalizeChecklist(raw.checklist),
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

/**
 * Misma prioridad que el backend (`AreaTaskSubtaskRepository#findByParentTaskIdOrderBySortOrderAscIdAsc`):
 * `sortOrder` persistente por tarea padre, desempate `id`. Así las posiciones guardadas coinciden con la vista.
 */
export function compareSubtasksForDisplay(a: TaskSubtaskDto, b: TaskSubtaskDto): number {
  const oa = a.sortOrder ?? 0
  const ob = b.sortOrder ?? 0
  if (oa !== ob) return oa - ob
  return a.id - b.id
}

export function sortSubtasksForDisplay(rows: readonly TaskSubtaskDto[]): TaskSubtaskDto[] {
  return [...rows].sort(compareSubtasksForDisplay)
}

export function normalizeSubtaskDtoList(rows: unknown): TaskSubtaskDto[] {
  if (!Array.isArray(rows)) return []
  const list = rows.map((row) => normalizeSubtaskDto(row as TaskSubtaskDto))
  return sortSubtasksForDisplay(list)
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

/**
 * Solo cuenta ítems con texto no vacío. Si no hay ninguno no fuerza `done` (`undefined`).
 * Si hay ítems y todos están marcados → `true`; si falta uno → `false`.
 */
export function derivedSubtaskDoneFromChecklist<T extends { text?: string | null; done?: boolean | null }>(
  checklist: readonly T[] | null | undefined,
): boolean | undefined {
  const meaningful = (checklist ?? []).filter((c) => String(c.text ?? '').trim().length > 0)
  if (meaningful.length === 0) return undefined
  return meaningful.every((c) => Boolean(c.done))
}

/**
 * Lista checklist para PATCH: solo ítems con texto (misma regla sanitizada que el modal). Todos los ítems
 * llevan `done` uniforme cuando el usuario marca/desmarca hecha la subtarea.
 */
export function checklistPayloadWithUniformDone(
  checklist: NonNullable<TaskSubtaskDto['checklist']> | null | undefined,
  allDone: boolean,
): TaskSubtaskChecklistItem[] {
  if (checklist == null || checklist.length === 0) return []
  return checklist
    .map((c) => {
      const rawId = typeof c?.id === 'string' ? c.id.trim() : ''
      const id = rawId !== '' ? rawId.slice(0, 64) : undefined
      const text = (c?.text ?? '').trim()
      return {
        ...(id !== undefined ? { id } : {}),
        text,
        done: allDone,
      } satisfies TaskSubtaskChecklistItem
    })
    .filter((c) => c.text.length > 0)
}

/** Body PATCH al usar el checkbox hecha de subtarea: alinea checklist con el estado elegido en el servidor. */
export function bodyForSubtaskDoneToggleCommit(
  sub: Pick<TaskSubtaskDto, 'checklist'>,
  doneNext: boolean,
): { done: boolean; checklist?: TaskSubtaskChecklistItem[] } {
  const checklist = checklistPayloadWithUniformDone(sub.checklist, doneNext)
  if (checklist.length === 0) return { done: doneNext }
  return { done: doneNext, checklist }
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
