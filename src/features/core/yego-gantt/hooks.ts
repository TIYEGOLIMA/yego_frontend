/**
 * Hooks compartidos del módulo Yego Gantt
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import type { AreaTaskStatus, TaskRow } from './types'

export interface UseTaskStatsResult {
  total: number
  done: number
  inProgress: number
  blocked: number
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
      pending,
      overdue,
      byPriority,
    }
  }, [tasks])
}

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
    setDragId,
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
