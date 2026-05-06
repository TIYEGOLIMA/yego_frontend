import { useEffect, useMemo, useState } from 'react'
import { fetchTaskSubtasks } from '../ganttApi'
import type { TaskRowLike, TaskSubtaskDto } from '../types'
import { normalizeSubtaskDtoList } from '../lib/ganttSubtaskProgress'

/**
 * Carga subtareas de todas las tareas visibles con resumen > 0, para pintar filas en el timeline.
 */
export function useTimelineTasksSubtasks(tasks: TaskRowLike[]) {
  const parentIdsKey = useMemo(() => {
    const ids = tasks
      .filter((t) => (t.subtaskTotal ?? 0) > 0)
      .map((t) => t.id)
      .sort((a, b) => a - b)
    return ids.join(',')
  }, [tasks])

  const [subtasksByParentId, setSubtasksByParentId] = useState<Map<number, TaskSubtaskDto[]>>(() => new Map())

  useEffect(() => {
    if (!parentIdsKey) {
      setSubtasksByParentId(new Map())
      return
    }
    const ids = parentIdsKey.split(',').map((x) => Number(x)).filter((n) => Number.isFinite(n))
    if (ids.length === 0) {
      setSubtasksByParentId(new Map())
      return
    }
    const ac = new AbortController()
    void (async () => {
      const entries = await Promise.all(
        ids.map(async (id) => {
          try {
            const rows = await fetchTaskSubtasks(id, { signal: ac.signal })
            return [id, normalizeSubtaskDtoList(rows)] as const
          } catch {
            return [id, []] as const
          }
        }),
      )
      if (ac.signal.aborted) return
      const map = new Map<number, TaskSubtaskDto[]>()
      for (const [id, rows] of entries) {
        map.set(id, rows.length ? [...rows] : [])
      }
      setSubtasksByParentId(map)
    })()
    return () => ac.abort()
  }, [parentIdsKey])

  return { subtasksByParentId, setSubtasksByParentId }
}
