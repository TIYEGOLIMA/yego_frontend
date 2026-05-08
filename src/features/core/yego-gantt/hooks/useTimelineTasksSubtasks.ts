import { useEffect, useMemo, useState } from 'react'
import { fetchTaskSubtasks } from '../ganttApi'
import type { TaskRowLike, TaskSubtaskDto } from '../types'
import { normalizeSubtaskDtoList } from '../lib/ganttSubtaskProgress'

export type TimelineSubtasksPrefetchMode = 'summaryOnly' | 'allParents'

/**
 * Carga subtareas de tareas visibles.
 * `summaryOnly`: solo padres con `subtaskTotal > 0` (timeline + board modo padre).
 * `allParents`: todos los IDs (board modo subtarea: listar todas las subtareas cargables).
 */
export function useTimelineTasksSubtasks(
  tasks: TaskRowLike[],
  prefetchMode: TimelineSubtasksPrefetchMode = 'summaryOnly',
) {
  const parentIdsKey = useMemo(() => {
    const source =
      prefetchMode === 'allParents'
        ? tasks
        : tasks.filter((t) => (t.subtaskTotal ?? 0) > 0)
    const ids = source.map((t) => t.id).sort((a, b) => a - b)
    return ids.join(',')
  }, [tasks, prefetchMode])

  const [subtasksByParentId, setSubtasksByParentId] = useState<Map<number, TaskSubtaskDto[]>>(() => new Map())
  const [subtasksPrefetchLoading, setSubtasksPrefetchLoading] = useState(false)

  useEffect(() => {
    if (!parentIdsKey) {
      setSubtasksByParentId(new Map())
      setSubtasksPrefetchLoading(false)
      return
    }
    const ids = parentIdsKey.split(',').map((x) => Number(x)).filter((n) => Number.isFinite(n))
    if (ids.length === 0) {
      setSubtasksByParentId(new Map())
      setSubtasksPrefetchLoading(false)
      return
    }
    const ac = new AbortController()
    let active = true
    setSubtasksPrefetchLoading(true)
    void (async () => {
      try {
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
        if (!active) return
        const map = new Map<number, TaskSubtaskDto[]>()
        for (const [id, rows] of entries) {
          map.set(id, rows.length ? [...rows] : [])
        }
        setSubtasksByParentId(map)
      } finally {
        if (active) setSubtasksPrefetchLoading(false)
      }
    })()
    return () => {
      active = false
      ac.abort()
    }
  }, [parentIdsKey])

  return { subtasksByParentId, setSubtasksByParentId, subtasksPrefetchLoading }
}
