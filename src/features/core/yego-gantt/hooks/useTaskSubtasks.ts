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
    let active = true
    setLoading(true)
    void fetchTaskSubtasks(taskId, { signal: ac.signal })
      .then((rows) => {
        if (!active) return
        setItems(normalizeSubtaskDtoList(rows))
      })
      .catch(() => {
        if (!active) return
        setItems([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
      ac.abort()
    }
  }, [taskId])

  return { items, setItems, loading }
}
