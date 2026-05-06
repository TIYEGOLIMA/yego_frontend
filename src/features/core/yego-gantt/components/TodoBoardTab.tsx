import { useMemo, useCallback, useState } from 'react'
import {
  AlertOctagon,
  CalendarDays,
  CheckCircle2,
  Circle,
  CircleDot,
  Crown,
  Filter,
  ListChecks,
  Lock,
  Plus,
  UserRound,
  Users,
} from 'lucide-react'
import { WorkosTabLoading } from './WorkosLoading'
import type { TodoBoardTabProps, TaskRow, AreaTaskStatus, TaskPriority } from '../types'
import { taskIsMine, taskIsMyPrivate } from '../taskPrivacy'
import { PRIO_LABEL, norm } from '../utils'
import { useKanbanDrag } from '../hooks'
import { Avatar, ProgressBar } from './common'
import { cn } from '@/utils/cn'

type BoardScopeFilter = 'all' | 'mine' | 'private'

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
}: TodoBoardTabProps) {
  const [boardFilter, setBoardFilter] = useState<BoardScopeFilter>('all')
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

  const columnData = useMemo(
    () =>
      COLUMNS.map((col) => ({
        ...col,
        tasks: filteredTasks.filter((t) => t.status === col.status),
      })),
    [filteredTasks]
  )

  if (loading && tasks.length === 0) {
    return <WorkosTabLoading srLabel="Cargando tablero…" />
  }

  const scopePill = (active: boolean) =>
    cn(
      'ml-0.5 min-w-[1.2rem] rounded-full px-1 py-px text-[10px] font-bold tabular-nums leading-none',
      active ? 'bg-orange-700/90 text-white' : 'bg-muted text-foreground dark:bg-muted/80',
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 min-h-0">
        {columnData.map((col) => {
          const Icon = col.Icon
          const isOver = isDropTarget(col.status)
          return (
            <div
              key={col.status}
              onDragOver={(e) => handleDragOver(e, col.status)}
              onDragLeave={(e) => handleDragLeave(e, col.status)}
              onDrop={() => onStatusChange && handleDrop(col.status, onStatusChange)}
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
                <span className="ml-auto text-xs font-semibold tabular-nums rounded-full bg-background border px-2 py-0.5">
                  {col.tasks.length}
                </span>
              </div>
              <div className="flex-1 min-h-0 p-2 space-y-2 overflow-y-auto overscroll-contain scroll-smooth touch-pan-y">
                {col.tasks.length === 0 ? (
                  <div className="w-full text-center text-xs text-muted-foreground py-6 px-2">Sin tareas</div>
                ) : (
                  col.tasks.map((t) => {
                    const pr = norm(t.priority)
                    const isUpdating = updatingId === t.id
                    const assignees = getAssignees(t)
                    return (
                      <div
                        key={t.id}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onOpenTask?.(t)
                          }
                        }}
                        onClick={() => onOpenTask?.(t)}
                        draggable={manage && !isUpdating}
                        onDragStart={(e) => {
                          e.stopPropagation()
                          handleDragStart(t)
                        }}
                        onDragEnd={handleDragEnd}
                        className={`group rounded-lg border border-border/80 bg-card p-3 workos-shadow-soft hover:shadow-md cursor-pointer transition animate-workos-fade-in ${
                          dragTaskId === t.id ? 'opacity-50' : ''
                        } ${isUpdating ? 'pointer-events-none opacity-60' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="inline-flex items-center gap-1.5 min-w-0 max-w-[58%] rounded-full border border-emerald-200/80 bg-emerald-50 py-0.5 pl-2 pr-2.5 text-[11px] font-semibold text-emerald-700 shadow-sm dark:border-emerald-800/55 dark:bg-emerald-950/45 dark:text-emerald-300"
                            title={t.areaName || `Área ${t.areaId}`}
                          >
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400"
                              aria-hidden
                            />
                            <span className="truncate">{t.areaName || `Área ${t.areaId}`}</span>
                          </span>
                          <span
                            className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${boardPriorityPillClass(pr)}`}
                          >
                            {PRIO_LABEL[pr]}
                          </span>
                        </div>
                        {showWorkspaceOnCards && t.workspaceId != null && workspaceNameById && (
                          <div className="mt-1.5">
                            <span
                              className="inline-flex max-w-full items-center rounded-md border border-blue-200/80 bg-blue-50/90 px-2 py-0.5 text-[10px] font-semibold text-blue-800 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-200 truncate"
                              title={workspaceNameById.get(t.workspaceId) ?? `Espacio ${t.workspaceId}`}
                            >
                              {workspaceNameById.get(t.workspaceId) ?? `Espacio #${t.workspaceId}`}
                            </span>
                          </div>
                        )}
                        <div className="mt-2 flex items-start justify-between gap-2">
                          <span className="min-w-0 flex-1 font-medium text-sm text-foreground leading-tight">{t.title}</span>
                          {(t.subtaskTotal ?? 0) > 0 && (
                            <span
                              className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-border/70 bg-muted/45 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground"
                              title="Subtareas"
                            >
                              <ListChecks className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                              {(t.subtaskDone ?? 0)}/{(t.subtaskTotal ?? 0)}
                            </span>
                          )}
                        </div>
                        {t.description && (
                          <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{t.description}</div>
                        )}
                        <div className="mt-3 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Progreso
                            </span>
                            <span className="text-sm font-bold tabular-nums text-foreground">
                              {Math.min(100, Math.max(0, Math.round(Number(t.progressPercent) || 0)))}%
                            </span>
                          </div>
                          <div className="rounded-full border border-border/60 bg-muted/90 p-0.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.07)] dark:bg-muted/60">
                            <ProgressBar
                              value={t.progressPercent}
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
                            <span className="text-[10px] italic text-muted-foreground">Sin asignar</span>
                          )}
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            {t.endDate}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              {onAddTask ? (
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
