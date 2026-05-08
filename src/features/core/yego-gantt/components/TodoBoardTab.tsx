import { useMemo, useCallback, useRef, useState, type DragEvent } from 'react'
import {
  AlertOctagon,
  CalendarDays,
  CheckCircle2,
  Circle,
  CircleDot,
  Crown,
  Filter,
  Layers,
  ListChecks,
  ListTree,
  Loader2,
  Lock,
  Plus,
  UserRound,
  Users,
  Zap,
} from 'lucide-react'
import { WorkosTabLoading } from './WorkosLoading'
import type { TodoBoardTabProps, TaskRow, AreaTaskStatus, TaskPriority, TaskSubtaskDto } from '../types'
import { taskIsMine, taskIsMyPrivate, canUserMoveTaskOnBoard } from '../taskPrivacy'
import { PRIO_LABEL, norm } from '../utils'
import { useKanbanDrag } from '../hooks'
import { Avatar, ProgressBar } from './common'
import { cn } from '@/utils/cn'
import { useTimelineTasksSubtasks } from '../hooks/useTimelineTasksSubtasks'
import {
  sortSubtasksForDisplay,
  updateTaskSubtaskNormalized,
  weightedProgressPercentFromSubtasks,
} from '../lib/ganttSubtaskProgress'

/** Columna Kanban por estado propio persistido (`status`), sin acoplar al padre. */
function boardColumnForSubtask(sub: TaskSubtaskDto): AreaTaskStatus {
  return sub.status
}

/** Panel checklist rosa: cabecera + lista de subtareas con título (no solo cantidades). */
function BoardSubtasksBlock({
  rows,
  prefetchLoading,
  subtaskTotal,
}: {
  rows: TaskSubtaskDto[] | undefined
  prefetchLoading: boolean
  subtaskTotal: number
}) {
  if (subtaskTotal <= 0) return null

  const sorted = rows?.length ? sortSubtasksForDisplay(rows) : null
  const totalCount = sorted?.length ?? subtaskTotal
  const doneCount = sorted?.reduce((acc, s) => acc + (s.done ? 1 : 0), 0) ?? 0
  const subtasksDonePct =
    totalCount > 0 ? Math.min(100, Math.round((doneCount / totalCount) * 100)) : 0

  return (
    <div className="mt-2.5" onClick={(e) => e.stopPropagation()} role="presentation">
      <div
        className={cn(
          'rounded-xl border px-2.5 pt-2 pb-2 shadow-sm',
          'border-rose-200 bg-gradient-to-b from-rose-50 to-rose-50/70',
          'dark:border-rose-900/60 dark:from-rose-950/50 dark:to-rose-950/30',
        )}
      >
        <div className="flex items-center gap-2 border-b border-rose-200/60 pb-2 dark:border-rose-800/40">
          <ListChecks className="h-3.5 w-3.5 shrink-0 text-rose-700 dark:text-rose-300" aria-hidden />
          <span className="text-xs font-semibold tracking-tight text-rose-900 dark:text-rose-50">
            Subtareas
          </span>
          <span className="ml-auto text-xs font-bold tabular-nums text-rose-800 dark:text-rose-200">
            {doneCount}/{totalCount}
          </span>
        </div>

        {prefetchLoading && !(sorted?.length) ? (
          <>
            <p
              className="mt-2 text-[10px] font-semibold leading-snug text-rose-900 dark:text-rose-100"
              role="status"
              aria-live="polite"
            >
              Sincronizando con la API por proyecto… Los títulos se muestran al recibir cada respuesta.
            </p>
            <ul className="mt-2 space-y-2 p-0 m-0 list-none" aria-busy>
            {subtaskTotal > 0 ? (
              Array.from({ length: Math.min(subtaskTotal, 6) }).map((_, i) => (
                <li key={`sk-${i}`} className="flex gap-2">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-rose-200 dark:bg-rose-900/50" />
                  <span className="h-3 flex-1 animate-pulse rounded bg-rose-200/85 dark:bg-rose-900/45" />
                </li>
              ))
            ) : (
              <li className="text-[10px] font-medium text-rose-700/85 dark:text-rose-300/90 italic pt-2">
                Cargando subtareas…
              </li>
            )}
          </ul>
          </>
        ) : sorted?.length ? (
          <ul
            className="mt-2 max-h-[min(10rem,32vh)] list-none flex flex-col gap-1.5 overflow-y-auto overscroll-contain p-0 m-0 pr-0.5"
            aria-label="Lista de subtareas"
          >
            {sorted.map((s) => {
              const label = s.title?.trim() || `Subtarea #${s.id}`
              return (
                <li
                  key={s.id}
                  className="flex min-w-0 items-start gap-2 text-[11px] leading-snug text-rose-950/95 dark:text-rose-50/95"
                >
                  <span
                    className={cn(
                      'mt-0.5 shrink-0',
                      s.done ? 'text-rose-600 dark:text-rose-400' : 'text-rose-400/80 dark:text-rose-500/70',
                    )}
                  >
                    {s.done ? (
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <Circle className="h-3.5 w-3.5" aria-hidden />
                    )}
                  </span>
                  <span
                    className={cn(
                      'min-w-0 flex-1 font-medium [overflow-wrap:anywhere]',
                      s.done
                        ? 'text-rose-800/85 line-through decoration-rose-500/55 dark:text-rose-200/70'
                        : '',
                    )}
                  >
                    {label}
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-2 text-[10px] leading-snug text-rose-800/85 dark:text-rose-200/80">
            Hay {totalCount} subtareas. Pulsa la tarjeta del proyecto para abrirlas en detalle y editarlas.
          </p>
        )}

        {/* Progreso de completado dentro del mismo panel rosa (conteo hechas / total). */}
        <div
          className="mt-2.5 border-t border-rose-200/60 pt-2 dark:border-rose-800/45"
          aria-hidden={totalCount === 0}
        >
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-rose-200/80 dark:bg-rose-950/70 ring-1 ring-rose-200/90 ring-inset dark:ring-rose-800/50">
            <div
              className="h-full rounded-full bg-rose-500/95 transition-[width] duration-300 dark:bg-rose-400/95"
              style={{ width: `${subtasksDonePct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

type BoardScopeFilter = 'all' | 'mine' | 'private'
type BoardGranularityFilter = 'parent' | 'subtask'

function boardPriorityPillClass(p: TaskPriority): string {
  switch (p) {
    case 'LOW':
      return 'bg-neutral-100 text-neutral-600 border-neutral-200/90 dark:bg-neutral-800/70 dark:text-neutral-300 dark:border-neutral-600/80'
    case 'MEDIUM':
      return 'bg-sky-50 text-sky-700 border-sky-200/90 dark:bg-sky-950/45 dark:text-sky-300 dark:border-sky-800/50'
    case 'HIGH':
      return 'bg-amber-50 text-amber-800 border-amber-200/90 dark:bg-amber-950/35 dark:text-amber-300 dark:border-amber-800/45'
    case 'URGENT':
      return 'bg-red-50 text-red-700 border-red-200/90 dark:bg-red-950/35 dark:text-red-300 dark:border-red-800/45'
    default:
      return 'bg-neutral-100 text-neutral-600 border-neutral-200/90'
  }
}

const COLUMNS: {
  status: AreaTaskStatus
  title: string
  Icon: typeof Circle
  tone: string
}[] = [
  { status: 'PENDING', title: 'Pendiente', Icon: Circle, tone: 'text-muted-foreground border-border' },
  { status: 'IN_PROGRESS', title: 'En progreso', Icon: CircleDot, tone: 'text-amber-600 border-amber-500/30' },
  { status: 'BLOCKED', title: 'Bloqueada', Icon: AlertOctagon, tone: 'text-destructive border-destructive/30' },
  { status: 'DONE', title: 'Hecha', Icon: CheckCircle2, tone: 'text-emerald-600 border-emerald-500/30' },
]

/** Altura máx. por columna: cabecera Gantt + filtros + `main` padding (~15.5rem). Ajustar si cambia el layout global. */
const BOARD_COLUMN_MAX_HEIGHT_CLASS = 'max-h-[min(85dvh,calc(100dvh-15.5rem))]'

export function TodoBoardTab({
  tasks,
  loading,
  refreshing = false,
  manage,
  allCollaborators = [],
  onStatusChange,
  onAddTask,
  onOpenTask,
  currentUserId,
  showWorkspaceOnCards = false,
  workspaceNameById,
  onBoardSubtasksSynced,
}: TodoBoardTabProps) {
  const [boardFilter, setBoardFilter] = useState<BoardScopeFilter>('all')
  const [boardGranularity, setBoardGranularity] = useState<BoardGranularityFilter>('parent')
  /** `parentId:subtaskId` mientras arrastras en modo subtareas */
  const [dragSubKey, setDragSubKey] = useState<string | null>(null)
  const [subtaskDropColumn, setSubtaskDropColumn] = useState<AreaTaskStatus | null>(null)
  const [updatingSubKey, setUpdatingSubKey] = useState<string | null>(null)
  const dragSubSourceColRef = useRef<AreaTaskStatus | null>(null)

  const collabMap = useMemo(() => {
    const m = new Map<number, { nombreCompleto: string; rol: string }>()
    for (const c of allCollaborators) m.set(c.id, c)
    return m
  }, [allCollaborators])

  const getAssignees = useCallback(
    (t: TaskRow): { id: number; name: string }[] => {
      const ids = t.assignedUserIds?.length
        ? t.assignedUserIds
        : t.assignedUserId != null
          ? [t.assignedUserId]
          : []
      return ids.map((uid) => {
        const c = collabMap.get(uid)
        return { id: uid, name: c?.nombreCompleto || `#${uid}` }
      })
    },
    [collabMap]
  )

  const {
    dragTaskId,
    updatingId,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    isDropTarget,
  } = useKanbanDrag()

  const filterCounts = useMemo(() => {
    const all = tasks.length
    const mine =
      currentUserId != null ? tasks.filter((t) => taskIsMine(t, currentUserId)).length : 0
    const priv =
      currentUserId != null ? tasks.filter((t) => taskIsMyPrivate(t, currentUserId)).length : 0
    return { all, mine, priv }
  }, [tasks, currentUserId])

  const filteredTasks = useMemo(() => {
    if (boardFilter === 'all') return tasks
    if (boardFilter === 'mine') {
      if (currentUserId == null) return tasks
      return tasks.filter((t) => taskIsMine(t, currentUserId))
    }
    if (boardFilter === 'private') {
      if (currentUserId == null) return tasks
      return tasks.filter((t) => taskIsMyPrivate(t, currentUserId))
    }
    return tasks
  }, [tasks, boardFilter, currentUserId])

  const prefetchMode =
    boardGranularity === 'subtask' ? ('allParents' as const) : ('summaryOnly' as const)

  const { subtasksByParentId, subtasksPrefetchLoading, setSubtasksByParentId } =
    useTimelineTasksSubtasks(filteredTasks, prefetchMode)

  const subtaskBoardRows = useMemo(() => {
    if (boardGranularity !== 'subtask') return []
    const rows: { parent: TaskRow; sub: TaskSubtaskDto }[] = []
    for (const p of filteredTasks) {
      const subs = subtasksByParentId.get(p.id)
      if (!subs?.length) continue
      for (const sub of sortSubtasksForDisplay(subs)) {
        rows.push({ parent: p, sub })
      }
    }
    return rows
  }, [boardGranularity, filteredTasks, subtasksByParentId])

  const columnData = useMemo(
    () =>
      COLUMNS.map((col) =>
        boardGranularity === 'parent'
          ? { ...col, kind: 'parent' as const, tasks: filteredTasks.filter((t) => t.status === col.status) }
          : {
              ...col,
              kind: 'subtask' as const,
              subRows: subtaskBoardRows.filter(({ sub }) => boardColumnForSubtask(sub) === col.status),
            },
      ),
    [boardGranularity, filteredTasks, subtaskBoardRows],
  )

  const applySubBoardDrop = useCallback(
    async (parent: TaskRow, sub: TaskSubtaskDto, target: AreaTaskStatus) => {
      const cur = boardColumnForSubtask(sub)
      if (cur === target) return
      if (!onBoardSubtasksSynced) return

      const key = `${parent.id}:${sub.id}`
      setUpdatingSubKey(key)
      try {
        const next = await updateTaskSubtaskNormalized(parent.id, sub.id, { status: target })
        setSubtasksByParentId((prev) => {
          const m = new Map(prev)
          const curList = m.get(parent.id) ?? []
          const nl = sortSubtasksForDisplay(curList.map((x) => (x.id === next.id ? next : x)))
          m.set(parent.id, nl)
          onBoardSubtasksSynced(parent.id, nl)
          return m
        })
      } finally {
        setUpdatingSubKey(null)
      }
    },
    [onBoardSubtasksSynced, setSubtasksByParentId],
  )

  const endSubDrag = useCallback(() => {
    setDragSubKey(null)
    dragSubSourceColRef.current = null
    setSubtaskDropColumn(null)
  }, [])

  const handleColumnDragOver = useCallback(
    (e: DragEvent, col: AreaTaskStatus) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (boardGranularity === 'subtask' && dragSubKey) {
        setSubtaskDropColumn(col)
        return
      }
      handleDragOver(e, col)
    },
    [boardGranularity, dragSubKey, handleDragOver],
  )

  const handleColumnDragLeave = useCallback(
    (e: DragEvent, col: AreaTaskStatus) => {
      if (boardGranularity === 'subtask' && dragSubKey) {
        const rect = e.currentTarget.getBoundingClientRect()
        const { clientX, clientY } = e
        if (
          clientX < rect.left ||
          clientX > rect.right ||
          clientY < rect.top ||
          clientY > rect.bottom
        ) {
          setSubtaskDropColumn((prev) => (prev === col ? null : prev))
        }
        return
      }
      handleDragLeave(e, col)
    },
    [boardGranularity, dragSubKey, handleDragLeave],
  )

  const handleColumnDrop = useCallback(
    async (target: AreaTaskStatus) => {
      if (boardGranularity === 'subtask' && dragSubKey) {
        const parts = dragSubKey.split(':')
        const pid = Number(parts[0])
        const sid = Number(parts[1])
        const sourceCol = dragSubSourceColRef.current
        endSubDrag()
        if (!Number.isFinite(pid) || !Number.isFinite(sid)) return
        if (sourceCol === target) return
        const parent = filteredTasks.find((x) => x.id === pid)
        if (!parent) return
        const list = subtasksByParentId.get(pid)
        const sub = list?.find((x) => x.id === sid)
        if (!sub) return
        await applySubBoardDrop(parent, sub, target)
        return
      }
      if (boardGranularity === 'parent' && onStatusChange) {
        await handleDrop(target, onStatusChange)
      }
    },
    [
      boardGranularity,
      dragSubKey,
      endSubDrag,
      filteredTasks,
      subtasksByParentId,
      applySubBoardDrop,
      handleDrop,
      onStatusChange,
    ],
  )

  const subtaskFilterCount = subtaskBoardRows.length

  if (loading && tasks.length === 0) {
    return <WorkosTabLoading srLabel="Cargando tablero…" />
  }

  const scopePill = (active: boolean) =>
    cn(
      'ml-0.5 min-w-[1.2rem] rounded-full px-1 py-px text-[10px] font-bold tabular-nums leading-none',
      active ? 'bg-orange-700/90 text-white' : 'bg-muted text-foreground dark:bg-muted/80',
    )

  const granPill = (active: boolean) =>
    cn(
      'ml-0.5 min-w-[1.35rem] rounded-full px-1 py-px text-[10px] font-bold tabular-nums leading-none',
      active ? 'bg-sky-800/90 text-white dark:bg-sky-600' : 'bg-muted text-foreground dark:bg-muted/80',
    )

  return (
    <div
      className={cn(
        'flex flex-col flex-1 min-h-0 w-full space-y-4 relative',
        refreshing ? 'opacity-[0.97]' : '',
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 shrink-0">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0">
          <Filter className="h-3 w-3 opacity-80" aria-hidden />
          Filtrar
        </span>
        <button
          type="button"
          onClick={() => setBoardFilter('all')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all border',
            boardFilter === 'all'
              ? 'border-orange-500 bg-orange-500 text-white shadow-sm hover:bg-orange-600'
              : 'border-border/70 bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground',
          )}
        >
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span>Todas</span>
          <span className={scopePill(boardFilter === 'all')}>{filterCounts.all}</span>
        </button>
        <button
          type="button"
          disabled={currentUserId == null}
          onClick={() => currentUserId != null && setBoardFilter('mine')}
          title={currentUserId == null ? 'Inicia sesión para filtrar tus tareas' : undefined}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all border disabled:opacity-45 disabled:pointer-events-none',
            boardFilter === 'mine'
              ? 'border-orange-500 bg-orange-500 text-white shadow-sm hover:bg-orange-600'
              : 'border-border/70 bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground',
          )}
        >
          <UserRound className="h-3.5 w-3.5 shrink-0" />
          <span>Mis tareas</span>
          <span className={scopePill(boardFilter === 'mine')}>{filterCounts.mine}</span>
        </button>
        <button
          type="button"
          onClick={() => setBoardFilter('private')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all border',
            boardFilter === 'private'
              ? 'border-orange-500 bg-orange-500 text-white shadow-sm hover:bg-orange-600'
              : 'border-border/70 bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground',
          )}
        >
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span>Privadas</span>
          <span className={scopePill(boardFilter === 'private')}>{filterCounts.priv}</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 shrink-0 pb-1 border-b border-border/40">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0">
          <Layers className="h-3 w-3 opacity-80" aria-hidden />
          Agrupar
        </span>
        <button
          type="button"
          onClick={() => setBoardGranularity('parent')}
          title="Tarjetas = proyectos por estado Kanban del proyecto. Lista de subtareas y progreso se rellenan con GET /tasks/{id}/subtasks por cada proyecto visible con subtareas. Clic en tarjeta: detalle con todas las subtareas."
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all border',
            boardGranularity === 'parent'
              ? 'border-sky-600 bg-sky-600 text-white shadow-sm hover:bg-sky-700 dark:border-sky-500 dark:bg-sky-600'
              : 'border-border/70 bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground',
          )}
        >
          <ListChecks className="h-3.5 w-3.5 shrink-0" />
          <span>Proyecto (padre)</span>
          <span className={granPill(boardGranularity === 'parent')}>{filteredTasks.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setBoardGranularity('subtask')}
          title="Una tarjeta por subtarea agrupada por su propio estado. Los datos llegan proyecto a proyecto desde la API hasta completar todas las subtareas visibles. Clic: detalle enfocado solo en esa subtarea."
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all border',
            boardGranularity === 'subtask'
              ? 'border-sky-600 bg-sky-600 text-white shadow-sm hover:bg-sky-700 dark:border-sky-500 dark:bg-sky-600'
              : 'border-border/70 bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground',
          )}
        >
          <ListTree className="h-3.5 w-3.5 shrink-0" />
          <span>Subtareas</span>
          <span className={granPill(boardGranularity === 'subtask')}>
            {boardGranularity === 'subtask'
              ? subtaskFilterCount
              : filteredTasks.reduce((acc, p) => acc + Math.max(0, p.subtaskTotal ?? 0), 0)}
          </span>
        </button>
      </div>

      {(refreshing || subtasksPrefetchLoading) && (
        <div
          className="shrink-0 rounded-lg border border-primary/25 bg-primary/5 dark:bg-primary/10 px-3 py-2.5 flex gap-2.5 items-start"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary mt-px" aria-hidden />
          <div className="min-w-0 text-[11px] leading-snug text-foreground/90 space-y-1">
            {refreshing ? (
              <p className="font-semibold">
                Lista del tablero: actualizar desde el servidor (resumen de proyectos)…
              </p>
            ) : null}
            {subtasksPrefetchLoading ? (
              <p>
                Subtareas:{' '}
                {boardGranularity === 'subtask'
                  ? 'cargando filas proyecto a proyecto; los números en cada columna se definen cuando la API ha devuelto las subtareas de todos los proyectos visibles.'
                  : 'consultando cada proyecto con subtareas; el bloque rosado de subtareas aparece cuando responda la lista de ese proyecto.'}
              </p>
            ) : null}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 min-h-0">
        {columnData.map((col) => {
          const Icon = col.Icon
          const count =
            col.kind === 'parent' ? col.tasks.length : col.subRows.length
          const isOver =
            boardGranularity === 'subtask' && dragSubKey
              ? subtaskDropColumn === col.status
              : isDropTarget(col.status)
          return (
            <div
              key={col.status}
              onDragOver={(e) => handleColumnDragOver(e, col.status)}
              onDragLeave={(e) => handleColumnDragLeave(e, col.status)}
              onDrop={() => void handleColumnDrop(col.status)}
              className={cn(
                'flex flex-col rounded-xl border border-border/80 bg-card workos-shadow-soft transition-all min-h-0 overflow-hidden',
                BOARD_COLUMN_MAX_HEIGHT_CLASS,
                isOver ? 'ring-2 ring-primary/25 border-primary/40' : '',
              )}
            >
              <div
                className={`flex shrink-0 items-center gap-2 px-3 py-2.5 border-b border-border/60 ${col.tone} border-t-[3px] rounded-t-xl bg-muted/30`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-sm font-semibold text-foreground">{col.title}</span>
                <span
                  className="ml-auto text-xs font-semibold tabular-nums rounded-full bg-background border px-2 py-0.5"
                  title={
                    boardGranularity === 'subtask' && subtasksPrefetchLoading
                      ? 'Conteo provisional: se cierra cuando la API haya cargado todas las subtareas visibles.'
                      : undefined
                  }
                >
                  {boardGranularity === 'subtask' && subtasksPrefetchLoading ? '…' : count}
                  {boardGranularity === 'subtask' && subtasksPrefetchLoading ? (
                    <span className="sr-only"> conteo incompleto, sincronizando con el servidor</span>
                  ) : null}
                </span>
              </div>
              <div className="flex-1 min-h-0 p-2 space-y-2 overflow-y-auto overscroll-contain scroll-smooth touch-pan-y">
                {col.kind === 'parent' ? (
                  col.tasks.length === 0 ? (
                    <div className="w-full text-center text-xs text-muted-foreground py-6 px-2">
                      Sin proyectos
                    </div>
                  ) : (
                    col.tasks.map((t) => {
                      const pr = norm(t.priority)
                      const isUpdating = updatingId === t.id
                      const assignees = getAssignees(t)
                      const prefetched = subtasksByParentId.get(t.id)
                      const hasDetailedSubs = Boolean(prefetched && prefetched.length > 0)
                      const prefetchedSorted = hasDetailedSubs
                        ? sortSubtasksForDisplay(prefetched!)
                        : []
                      const progressDisplay = hasDetailedSubs
                        ? weightedProgressPercentFromSubtasks(prefetched!)
                        : Math.min(100, Math.max(0, Math.round(Number(t.progressPercent) || 0)))
                      const totalDisplay = hasDetailedSubs ? prefetched!.length : (t.subtaskTotal ?? 0)

                      return (
                        <div
                          key={t.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`Proyecto: ${(t.title || '').trim() || `Tarea ${t.id}`}. Columna del proyecto: ${col.title}. Abre el detalle con todas las subtareas.`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              onOpenTask?.(t)
                            }
                          }}
                          onClick={() => onOpenTask?.(t)}
                          draggable={
                            boardGranularity === 'parent' &&
                            canUserMoveTaskOnBoard(t, currentUserId, manage) &&
                            !isUpdating
                          }
                          onDragStart={(e) => {
                            e.stopPropagation()
                            handleDragStart(t)
                          }}
                          onDragEnd={handleDragEnd}
                          className={`group rounded-lg border border-border/80 bg-card p-3 workos-shadow-soft hover:shadow-md cursor-pointer transition animate-workos-fade-in ${
                            dragTaskId === t.id ? 'opacity-50' : ''
                          } ${isUpdating ? 'pointer-events-none opacity-60' : ''}`}
                          aria-busy={isUpdating}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            {t.areaName ? (
                              <span
                                className="inline-flex max-w-[62%] items-center gap-1.5 truncate rounded-full border border-rose-200/90 bg-gradient-to-r from-rose-50 to-rose-100/85 px-2 py-0.5 text-[10px] font-semibold text-rose-900 shadow-sm dark:border-rose-900/55 dark:from-rose-950/50 dark:to-rose-950/35 dark:text-rose-100"
                                title={t.areaName}
                              >
                                <span
                                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500 shadow-[0_0_0_1px_rgba(255,255,255,.6)] dark:bg-rose-400"
                                  aria-hidden
                                />
                                <span className="truncate">{t.areaName}</span>
                              </span>
                            ) : (
                              <span className="min-w-[1px] shrink" aria-hidden />
                            )}
                            <span
                              className={`ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${boardPriorityPillClass(pr)}`}
                            >
                              {norm(t.priority) === 'URGENT' ? (
                                <Zap className="h-3 w-3 shrink-0" aria-hidden />
                              ) : null}
                              {PRIO_LABEL[pr]}
                            </span>
                          </div>
                          {showWorkspaceOnCards && t.workspaceId != null && workspaceNameById && (
                            <div className="mt-1.5">
                              <span
                                className="inline-flex max-w-full items-center rounded-md border border-blue-200/80 bg-blue-50/90 px-2 py-0.5 text-[10px] font-semibold text-blue-800 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-200 truncate"
                                title={
                                  workspaceNameById.get(t.workspaceId) ?? `Espacio ${t.workspaceId}`
                                }
                              >
                                {workspaceNameById.get(t.workspaceId) ??
                                  `Espacio #${t.workspaceId}`}
                              </span>
                            </div>
                          )}
                          <div className="mt-2 flex items-start justify-between gap-2">
                            <span className="min-w-0 flex-1 font-medium text-sm text-foreground leading-tight">
                              {t.title}
                            </span>
                          </div>
                          {t.description && (
                            <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                              {t.description}
                            </div>
                          )}
                          {(t.subtaskTotal ?? 0) > 0 && !hasDetailedSubs && (
                            <BoardSubtasksBlock
                              rows={prefetched}
                              prefetchLoading={subtasksPrefetchLoading}
                              subtaskTotal={totalDisplay}
                            />
                          )}
                          {hasDetailedSubs ? (
                            <BoardSubtasksBlock
                              rows={prefetchedSorted}
                              prefetchLoading={false}
                              subtaskTotal={prefetchedSorted.length}
                            />
                          ) : null}
                          <div className="mt-3 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Progreso
                                {(t.subtaskTotal ?? 0) > 0 && prefetched?.length ? (
                                  <span className="sr-only">
                                    ponderado desde subtareas cargadas
                                  </span>
                                ) : null}
                              </span>
                              <span className="text-sm font-bold tabular-nums text-foreground">
                                {progressDisplay}%
                              </span>
                            </div>
                            <div className="rounded-full border border-border/60 bg-muted/90 p-0.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.07)] dark:bg-muted/60">
                              <ProgressBar
                                value={progressDisplay}
                                size="lg"
                                variant="primary"
                                className="!bg-transparent"
                              />
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-between gap-2">
                            {assignees.length ? (
                              <div className="flex min-w-0 items-center gap-1.5">
                                <div className="relative inline-flex shrink-0" title={assignees[0].name}>
                                  <Crown
                                    className="pointer-events-none absolute -top-2 left-[58%] z-10 h-3 w-3 -translate-x-1/2 text-amber-500 drop-shadow-sm dark:text-amber-400"
                                    aria-hidden
                                  />
                                  <Avatar
                                    name={assignees[0].name}
                                    size="sm"
                                    variant="owner"
                                    title={assignees[0].name}
                                  />
                                </div>
                                {assignees.length > 1 ? (
                                  <div className="flex items-center -space-x-1.5 pl-0.5">
                                    {assignees.slice(1).map((a) => (
                                      <Avatar key={a.id} name={a.name} size="xs" title={a.name} />
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-[10px] italic text-muted-foreground">
                                Sin asignar
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                              <CalendarDays className="h-3 w-3" />
                              {t.endDate}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )
                ) : col.subRows.length === 0 ? (
                  <div
                    className="w-full text-center text-xs text-muted-foreground py-6 px-2"
                    role="status"
                    aria-live={subtasksPrefetchLoading ? 'polite' : undefined}
                  >
                    {subtasksPrefetchLoading
                      ? 'Sincronizando con el servidor; aún no hay subtareas visibles en esta columna.'
                      : 'Sin subtareas'}
                  </div>
                ) : (
                  col.subRows.map(({ parent, sub }) => {
                    const pr = norm(parent.priority)
                    const key = `${parent.id}:${sub.id}`
                    const isUpdatingRow = updatingSubKey === key
                    const draggable =
                      canUserMoveTaskOnBoard(parent, currentUserId, manage) &&
                      !!onBoardSubtasksSynced &&
                      !isUpdatingRow
                    const subAssign =
                      sub.assignedUserId != null
                        ? collabMap.get(sub.assignedUserId)?.nombreCompleto ?? `#${sub.assignedUserId}`
                        : null
                    const parentAssignees = getAssignees(parent)
                    return (
                      <div
                        key={key}
                        role="button"
                        tabIndex={0}
                        aria-label={`Subtarea ${(sub.title || '').trim() || `#${sub.id}`}. Columna de la subtarea: ${col.title}. Proyecto: ${(parent.title || '').trim() || `#${parent.id}`}. Abre el detalle mostrando solo esta subtarea.`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onOpenTask?.(parent, { focusSubtaskId: sub.id })
                          }
                        }}
                        onClick={() => onOpenTask?.(parent, { focusSubtaskId: sub.id })}
                        draggable={draggable}
                        onDragStart={(e) => {
                          e.stopPropagation()
                          setDragSubKey(key)
                          dragSubSourceColRef.current = boardColumnForSubtask(sub)
                          setSubtaskDropColumn(boardColumnForSubtask(sub))
                        }}
                        onDragEnd={endSubDrag}
                        className={cn(
                          'group rounded-lg border border-border/80 bg-card p-2.5 workos-shadow-soft hover:shadow-md cursor-pointer transition animate-workos-fade-in border-l-[3px] border-l-primary/35',
                          dragSubKey === key ? 'opacity-50' : '',
                          isUpdatingRow ? 'pointer-events-none opacity-60' : '',
                        )}
                        aria-busy={isUpdatingRow}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <span className="min-w-0 flex-1 text-[13px] font-semibold text-foreground leading-snug">
                            {sub.title?.trim() || `Subtarea #${sub.id}`}
                          </span>
                          <span
                            className={`inline-flex shrink-0 items-center rounded-full border px-1.5 py-px text-[10px] font-medium ${boardPriorityPillClass(pr)}`}
                          >
                            {PRIO_LABEL[pr]}
                          </span>
                        </div>
                        <div className="mt-1.5 rounded-md bg-muted/25 dark:bg-muted/15 px-1.5 py-1 border border-border/40">
                          <p className="text-[10px] text-muted-foreground truncate" title={parent.title}>
                            <span className="font-semibold text-foreground/80">Proyecto:</span> {parent.title}
                          </p>
                        </div>
                        {showWorkspaceOnCards && parent.workspaceId != null && workspaceNameById && (
                          <div className="mt-1">
                            <span className="inline-flex max-w-full truncate rounded px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground border border-border/50 bg-background/80">
                              {workspaceNameById.get(parent.workspaceId) ??
                                `#${parent.workspaceId}`}
                            </span>
                          </div>
                        )}
                        <div className="mt-2 flex items-center justify-between gap-1.5 flex-wrap">
                          {subAssign ? (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[10rem] inline-flex items-center gap-1">
                              <UserRound className="h-3 w-3 shrink-0 opacity-75" aria-hidden />
                              {subAssign}
                            </span>
                          ) : parentAssignees.length > 0 ? (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[10rem]" title={`Responsable del proyecto: ${parentAssignees[0].name}`}>
                              Proyecto: {parentAssignees[0].name}
                            </span>
                          ) : (
                            <span className="text-[10px] italic text-muted-foreground">Sin responsable subtarea</span>
                          )}
                          {sub.dueDate ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground tabular-nums ml-auto shrink-0">
                              <CalendarDays className="h-3 w-3" />
                              {String(sub.dueDate).slice(0, 10)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/70 ml-auto">
                              Sin fecha límite
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              {onAddTask && boardGranularity === 'parent' ? (
                <div className="mt-auto shrink-0 border-t border-border/60 p-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddTask(col.status)
                    }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-orange-500/55 bg-background py-2.5 text-xs font-medium text-orange-600 transition hover:border-orange-600 hover:bg-orange-500/5 hover:text-orange-700 dark:text-orange-400 dark:hover:bg-orange-500/10 dark:hover:text-orange-300"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Añadir tarea
                  </button>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
