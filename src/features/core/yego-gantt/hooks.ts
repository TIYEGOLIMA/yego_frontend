/**
 * Hooks compartidos del módulo Yego Gantt
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { api } from '../../../services/core/api'
import type { TaskRow, SprintDto, SprintStatus, AreaTaskStatus } from './types'
import { normPriority, taskPoints, sprintCapacityPts, differenceInCalendarDays } from './utils'
import { fetchSprintsByProjects } from './ganttApi'

// ==================== HOOKS DE SPRINTS ====================

export interface SprintMetrics {
  mtasks: TaskRow[]
  totalTasks: number
  doneTasks: number
  inProgress: number
  blocked: number
  risk: number
  totalPts: number
  donePts: number
  capacityPts: number
  completion: number
  totalDays: number
  elapsed: number
  remaining: number
  burndown: { day: string; ideal: number; real: number | null }[]
}

/**
 * Calcula métricas de un sprint
 */
export function useSprintMetrics(sprint: SprintDto, tasks: TaskRow[]): SprintMetrics {
  return useMemo(() => {
    const mtasks = tasks.filter((t) => t.sprintId === sprint.id)
    const totalTasks = mtasks.length
    const doneTasks = mtasks.filter((t) => t.status === 'DONE').length
    const inProgress = mtasks.filter((t) => t.status === 'IN_PROGRESS').length
    const blocked = mtasks.filter((t) => t.status === 'BLOCKED').length
    const risk = mtasks.filter((t) => t.status === 'AT_RISK').length
    const totalPts = mtasks.reduce((a, t) => a + taskPoints(t.priority), 0)
    const donePts = mtasks
      .filter((t) => t.status === 'DONE')
      .reduce((a, t) => a + taskPoints(t.priority), 0)

    const start = new Date(sprint.startDate + 'T12:00:00')
    const end = new Date(sprint.endDate + 'T12:00:00')
    const now = new Date()
    const totalDays = Math.max(1, differenceInCalendarDays(end, start) + 1)
    const elapsedRaw = differenceInCalendarDays(now, start) + 1
    const elapsed = Math.max(0, Math.min(totalDays, elapsedRaw))
    const remaining = Math.max(0, differenceInCalendarDays(end, now))
    const completion = totalPts ? Math.round((donePts / totalPts) * 100) : 0
    const capacityPts = sprintCapacityPts(totalDays)

    const burndown = Array.from({ length: totalDays + 1 }, (_, i) => {
      const day = new Date(start)
      day.setDate(day.getDate() + i)
      const ideal = Math.max(0, Math.round(totalPts - (totalPts / totalDays) * i))
      let real: number | null = null
      if (i <= elapsed) {
        real = Math.max(0, totalPts - Math.round((donePts * i) / Math.max(1, elapsed)))
      }
      return {
        day: day.toLocaleDateString('es', { day: 'numeric', month: 'short' }),
        ideal,
        real,
      }
    })

    return {
      mtasks,
      totalTasks,
      doneTasks,
      inProgress,
      blocked,
      risk,
      totalPts,
      donePts,
      capacityPts,
      completion,
      totalDays,
      elapsed,
      remaining,
      burndown,
    }
  }, [sprint, tasks])
}

/**
 * Hook para operaciones de sprints
 */
export function useSprintOperations(onReload: () => void) {
  const [sprints, setSprints] = useState<Record<number, SprintDto[]>>({})
  const [sprintsLoading, setSprintsLoading] = useState(false)
  const sprintsQuietRef = useRef(false)
  const sprintsLoadLockRef = useRef<Promise<void> | null>(null)

  const loadSprints = useCallback(
    async (projects: { id: number }[]) => {
      if (sprintsLoadLockRef.current) {
        await sprintsLoadLockRef.current
        return
      }

      const run = (async () => {
        if (projects.length === 0) {
          setSprints({})
          sprintsQuietRef.current = false
          return
        }

        const quiet = sprintsQuietRef.current
        if (!quiet) setSprintsLoading(true)

        try {
          const map = await fetchSprintsByProjects(projects)

          setSprints(map)
          sprintsQuietRef.current = true
        } finally {
          if (!quiet) setSprintsLoading(false)
          sprintsLoadLockRef.current = null
        }
      })()

      sprintsLoadLockRef.current = run
      await run
    },
    []
  )

  const moveTaskToSprint = useCallback(
    async (taskId: number, sprintId: number) => {
      try {
        await api.put(`/yego-gantt/tasks/${taskId}`, { sprintId })
        await onReload()
      } catch {
        /* ignore */
      }
    },
    [onReload]
  )

  const setSprintStatus = useCallback(
    async (sprint: SprintDto, status: SprintStatus) => {
      try {
        await api.put(`/yego-gantt/sprints/${sprint.id}`, { status })
        onReload()
      } catch {
        /* ignore */
      }
    },
    [onReload]
  )

  return {
    sprints,
    sprintsLoading,
    loadSprints,
    moveTaskToSprint,
    setSprintStatus,
  }
}

// ==================== HOOKS DE TAREAS ====================

export interface UseTaskStatsResult {
  total: number
  done: number
  inProgress: number
  blocked: number
  atRisk: number
  pending: number
  overdue: number
  byPriority: Record<'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW', number>
}

/**
 * Calcula estadísticas de tareas
 */
export function useTaskStats(tasks: TaskRow[]): UseTaskStatsResult {
  return useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((t) => t.status === 'DONE').length
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length
    const blocked = tasks.filter((t) => t.status === 'BLOCKED').length
    const atRisk = tasks.filter((t) => t.status === 'AT_RISK').length
    const pending = tasks.filter((t) => t.status === 'PENDING').length

    const isOverdueFn = (endDate: string) =>
      new Date(endDate + 'T23:59:59') < new Date()
    const overdue = tasks.filter(
      (t) => t.status !== 'DONE' && isOverdueFn(t.endDate)
    ).length

    const byPriority = {
      URGENT: tasks.filter((t) => t.priority === 'URGENT').length,
      HIGH: tasks.filter((t) => t.priority === 'HIGH').length,
      MEDIUM: tasks.filter((t) => t.priority === 'MEDIUM' || t.priority == null).length,
      LOW: tasks.filter((t) => t.priority === 'LOW').length,
    }

    return {
      total,
      done,
      inProgress,
      blocked,
      atRisk,
      pending,
      overdue,
      byPriority,
    }
  }, [tasks])
}

/**
 * Calcula métricas de carga por miembro
 */
export function useMemberLoad(
  tasks: TaskRow[],
  names: Map<number, string> | undefined
): { id: number; label: string; pts: number; done: number }[] {
  return useMemo(() => {
    const map = new Map<number, { pts: number; done: number }>()

    for (const t of tasks) {
      const ids = t.assignedUserIds?.length
        ? t.assignedUserIds
        : t.assignedUserId != null
          ? [t.assignedUserId]
          : []
      const w = taskPoints(t.priority)

      for (const id of ids) {
        const cur = map.get(id) ?? { pts: 0, done: 0 }
        cur.pts += w
        if (t.status === 'DONE') cur.done += w
        map.set(id, cur)
      }
    }

    return Array.from(map.entries())
      .map(([id, v]) => ({
        id,
        label: names?.get(id) ?? `#${id}`,
        ...v,
      }))
      .sort((a, b) => b.pts - a.pts)
  }, [tasks, names])
}

// ==================== HOOKS DE FILTROS ====================

export function useTaskFiltering(tasks: TaskRow[], options: { areaFilter?: string; prioFilter?: string }) {
  return useMemo(() => {
    return tasks.filter((t) => {
      if (options.areaFilter && options.areaFilter !== 'all' && String(t.areaId) !== options.areaFilter) {
        return false
      }
      if (options.prioFilter && options.prioFilter !== 'all' && normPriority(t.priority) !== options.prioFilter) {
        return false
      }
      return true
    })
  }, [tasks, options.areaFilter, options.prioFilter])
}

// ==================== HOOKS DE DRAG & DROP ====================

export function useDragAndDrop<T extends string | number>(onDrop?: (id: T, target: string) => void | Promise<void>) {
  const [dragId, setDragId] = useState<T | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const dragSourceStatus = useRef<string | null>(null)

  const handleDragStart = useCallback((id: T, sourceStatus?: string) => {
    setDragId(id)
    dragSourceStatus.current = sourceStatus ?? null
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragId(null)
    setDropTarget(null)
    dragSourceStatus.current = null
  }, [])

  const handleDragOver = useCallback((e: DragEvent, target: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(target)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent, target: string) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const { clientX, clientY } = e
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      setDropTarget((prev) => (prev === target ? null : prev))
    }
  }, [])

  const handleDrop = useCallback(
    async (target: string) => {
      const id = dragId
      const sourceStatus = dragSourceStatus.current

      setDragId(null)
      setDropTarget(null)
      dragSourceStatus.current = null

      if (id == null || !onDrop || sourceStatus === target) return

      await onDrop(id, target)
    },
    [dragId, onDrop]
  )

  return {
    dragId,
    dropTarget,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  }
}

/**
 * Drag & drop del tablero Kanban (columnas por estado).
 */
export function useKanbanDrag() {
  const [dragTaskId, setDragTaskId] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<AreaTaskStatus | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const sourceStatusRef = useRef<AreaTaskStatus | null>(null)

  const handleDragStart = useCallback((t: TaskRow) => {
    setDragTaskId(t.id)
    sourceStatusRef.current = t.status
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragTaskId(null)
    setDropTarget(null)
    sourceStatusRef.current = null
  }, [])

  const handleDragOver = useCallback((e: DragEvent, target: AreaTaskStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(target)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent, target: AreaTaskStatus) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const { clientX, clientY } = e
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      setDropTarget((prev) => (prev === target ? null : prev))
    }
  }, [])

  const handleDrop = useCallback(
    async (
      target: AreaTaskStatus,
      onStatusChange: (taskId: number, status: AreaTaskStatus) => void | Promise<void>,
    ) => {
      const id = dragTaskId
      const source = sourceStatusRef.current
      setDragTaskId(null)
      setDropTarget(null)
      sourceStatusRef.current = null
      if (id == null || source === target) return
      setUpdatingId(id)
      try {
        await onStatusChange(id, target)
      } finally {
        setUpdatingId(null)
      }
    },
    [dragTaskId],
  )

  const isDropTarget = useCallback(
    (status: AreaTaskStatus) => dropTarget === status,
    [dropTarget],
  )

  return {
    dragTaskId,
    dropTarget,
    updatingId,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    isDropTarget,
  }
}

// ==================== HOOKS DE EXPANSION ====================

export function useExpansion<T extends number | string>(initial?: Iterable<T>) {
  const [expanded, setExpanded] = useState<Set<T>>(new Set(initial))

  const toggle = useCallback((id: T) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const isExpanded = useCallback((id: T) => expanded.has(id), [expanded])

  const expand = useCallback((id: T) => {
    setExpanded((prev) => new Set(prev).add(id))
  }, [])

  const collapse = useCallback((id: T) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setExpanded(new Set())
  }, [])

  return {
    expanded,
    toggle,
    isExpanded,
    expand,
    collapse,
    reset,
  }
}

// ==================== HOOKS DE FORMULARIOS ====================

interface FormErrors {
  [key: string]: string
}

export function useFormErrors() {
  const [errors, setErrors] = useState<FormErrors>({})

  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setErrors({})
  }, [])

  const setError = useCallback((field: string, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }))
  }, [])

  return {
    errors,
    setErrors,
    clearError,
    clearAll,
    setError,
  }
}

// ==================== HOOKS DE DIÁLOGOS ====================

export function useDialog<T = void>(options?: { onClose?: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState<T | null>(null)

  const open = useCallback((item?: T) => {
    if (item !== undefined) setData(item)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setData(null)
    options?.onClose?.()
  }, [options])

  return {
    isOpen,
    data,
    open,
    close,
  }
}
