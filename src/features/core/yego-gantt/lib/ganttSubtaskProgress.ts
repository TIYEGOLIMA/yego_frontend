import type { Dispatch, SetStateAction } from 'react'
import type { TaskSubtaskDto } from '../ganttApi'
import type { Kpis, TaskRow } from '../types'

export function normalizeSubtaskDto(raw: TaskSubtaskDto): TaskSubtaskDto {
  const w = raw.weight as string | number | undefined
  return {
    ...raw,
    weight: typeof w === 'string' ? w : String(w ?? '1'),
  }
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
        ? { ...t, progressPercent: pct, subtaskDone: doneN, subtaskTotal: totalN }
        : t,
    )
    const avg = nt.reduce((sum, t) => sum + (t.progressPercent ?? 0), 0) / Math.max(1, nt.length)
    setKpis((k) => (k ? { ...k, progresoPromedioPct: Math.round(avg * 10) / 10 } : k))
    return nt
  })
}
