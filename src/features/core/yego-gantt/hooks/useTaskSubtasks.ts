import { useEffect, useState } from 'react'
import { fetchTaskSubtasks } from '../ganttApi'
import type { TaskSubtaskDto } from '../types'
import { normalizeSubtaskDtoList } from '../lib/ganttSubtaskProgress'

/** Subtareas de una tarea padre para panel timeline / vistas que las cargan aparte. */
export function useTaskSubtasks(taskId: number | null) {
  const [items, setItems] = useState<TaskSubtaskDto[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (taskId == null) {
      setItems([])
      setLoading(false)
      return
    }
    const ac = new AbortController()
    setLoading(true)
    void fetchTaskSubtasks(taskId, { signal: ac.signal })
      .then((rows) => {
        if (!ac.signal.aborted) setItems(normalizeSubtaskDtoList(rows))
      })
      .catch(() => {
        if (ac.signal.aborted) return
        setItems([])
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false)
      })
    return () => ac.abort()
  }, [taskId])

  return { items, setItems, loading }
}
