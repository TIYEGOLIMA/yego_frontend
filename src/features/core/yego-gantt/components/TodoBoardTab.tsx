import { useCallback, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  Pencil,
  Trash2,
} from 'lucide-react'
import type { ColaboradorDto } from '../yego-gantt.module'

type AreaTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED' | 'AT_RISK'
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

interface TaskRow {
  id: number
  areaId: number
  areaName?: string | null
  title: string
  description?: string | null
  startDate: string
  endDate: string
  status: AreaTaskStatus
  priority?: TaskPriority | null
  progressPercent: number
  assignedUserId?: number | null
  assignedUserIds?: number[]
}

const PRIO_LABEL: Record<TaskPriority, string> = { LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', URGENT: 'Urgente' }
const PRIO_BADGE: Record<TaskPriority, string> = {
  LOW: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  MEDIUM: 'bg-red-500/10 text-red-700 dark:text-red-300',
  HIGH: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
  URGENT: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
}

const PRIO_BORDER: Record<TaskPriority, string> = {
  LOW: 'border-l-slate-400/40',
  MEDIUM: 'border-l-red-500/50',
  HIGH: 'border-l-amber-500/50',
  URGENT: 'border-l-rose-600/60',
}

const AREA_CHIP: string[] = [
  'bg-red-500/10 text-red-700 dark:text-red-300',
  'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  'bg-pink-500/10 text-pink-700 dark:text-pink-300',
]

function areaChipClass(areaId: number): string {
  return AREA_CHIP[areaId % AREA_CHIP.length]
}

function norm(p?: TaskPriority | null): TaskPriority {
  return p === 'LOW' || p === 'MEDIUM' || p === 'HIGH' || p === 'URGENT' ? p : 'MEDIUM'
}

interface Column {
  status: AreaTaskStatus
  title: string
  icon: typeof Circle
  gradient: string
}

const COLUMNS: Column[] = [
  { status: 'PENDING', title: 'Pendiente', icon: AlertCircle, gradient: 'from-red-500/15 to-red-500/5' },
  { status: 'IN_PROGRESS', title: 'En progreso', icon: Clock, gradient: 'from-amber-500/15 to-amber-500/5' },
  { status: 'AT_RISK', title: 'En riesgo', icon: Eye, gradient: 'from-yellow-500/15 to-yellow-500/5' },
  { status: 'BLOCKED', title: 'Bloqueada', icon: Circle, gradient: 'from-zinc-500/15 to-zinc-500/5' },
  { status: 'DONE', title: 'Completado', icon: CheckCircle2, gradient: 'from-emerald-500/15 to-emerald-500/5' },
]

function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export interface TodoBoardTabProps {
  tasks: TaskRow[]
  loading: boolean
  manage: boolean
  allCollaborators?: ColaboradorDto[]
  onEdit: (t: TaskRow) => void
  onDelete: (t: TaskRow) => void
  onStatusChange?: (taskId: number, newStatus: AreaTaskStatus) => Promise<void>
}

export function TodoBoardTab({ tasks, loading, manage, allCollaborators = [], onEdit, onDelete, onStatusChange }: TodoBoardTabProps) {
  const [dragTaskId, setDragTaskId] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<AreaTaskStatus | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const dragSourceStatus = useRef<AreaTaskStatus | null>(null)

  const collabMap = useMemo(() => {
    const m = new Map<number, ColaboradorDto>()
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
    [collabMap],
  )

  const columnData = useMemo(
    () =>
      COLUMNS.map((col) => ({
        ...col,
        tasks: tasks.filter((t) => t.status === col.status),
      })),
    [tasks],
  )

  const handleDragStart = useCallback((task: TaskRow) => {
    setDragTaskId(task.id)
    dragSourceStatus.current = task.status
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragTaskId(null)
    setDropTarget(null)
    dragSourceStatus.current = null
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, colStatus: AreaTaskStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(colStatus)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent, colStatus: AreaTaskStatus) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const { clientX, clientY } = e
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      setDropTarget((prev) => (prev === colStatus ? null : prev))
    }
  }, [])

  const handleDrop = useCallback(async (colStatus: AreaTaskStatus) => {
    const taskId = dragTaskId
    const sourceStatus = dragSourceStatus.current
    setDragTaskId(null)
    setDropTarget(null)
    dragSourceStatus.current = null

    if (taskId == null || !onStatusChange || sourceStatus === colStatus) return

    setUpdatingId(taskId)
    try {
      await onStatusChange(taskId, colStatus)
    } finally {
      setUpdatingId(null)
    }
  }, [dragTaskId, onStatusChange])

  if (loading) return <p className="text-sm text-muted-foreground p-6">Cargando tablero…</p>

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-5">
      <div className="flex gap-3" style={{ minWidth: COLUMNS.length * 280 }}>
        {columnData.map((col, colIdx) => {
          const Icon = col.icon
          const isOver = dropTarget === col.status && dragSourceStatus.current !== col.status
          return (
            <div
              key={col.status}
              style={{ animationDelay: `${colIdx * 0.07}s` }}
              className={`flex-1 min-w-[260px] flex flex-col rounded-xl border overflow-hidden transition-all duration-300 gantt-fade-in ${
                isOver
                  ? 'ring-2 ring-red-500/40 border-red-500/50 shadow-lg shadow-red-500/10 scale-[1.01]'
                  : dragTaskId != null
                    ? 'ring-1 ring-red-500/10 border-border/60 shadow-md'
                    : 'border-border/60 shadow-sm'
              }`}
              onDragOver={(e) => handleDragOver(e, col.status)}
              onDragLeave={(e) => handleDragLeave(e, col.status)}
              onDrop={() => handleDrop(col.status)}
            >
              {/* column header */}
              <div className={`px-4 py-3 bg-gradient-to-b ${col.gradient} border-b border-border/40 transition-colors ${isOver ? 'brightness-110' : ''}`}>
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">{col.title}</span>
                  <span className="ml-auto text-[10px] tabular-nums px-2 py-0.5 rounded-full bg-background/80 text-muted-foreground border border-border/50 font-medium">
                    {col.tasks.length}
                  </span>
                </div>
              </div>

              {/* cards */}
              <div className={`flex-1 p-2 space-y-2 min-h-[200px] transition-colors duration-200 ${isOver ? 'bg-red-500/[0.03]' : 'bg-gradient-to-b from-background/60 to-muted/20'}`}>
                {col.tasks.map((t, tIdx) => {
                  const pr = norm(t.priority)
                  const isUpdating = updatingId === t.id
                  return (
                    <div
                      key={t.id}
                      draggable={manage && !isUpdating}
                      onDragStart={() => handleDragStart(t)}
                      onDragEnd={handleDragEnd}
                      style={{ animationDelay: `${tIdx * 0.05}s` }}
                      className={`group rounded-xl border border-border/80 bg-card hover:bg-card/90 p-3 transition-all duration-200 hover:shadow-lg hover:shadow-red-500/[0.04] hover:-translate-y-0.5 border-l-[3px] gantt-scale-in ${manage && !isUpdating ? 'cursor-grab active:cursor-grabbing' : ''} ${PRIO_BORDER[pr]} ${
                        dragTaskId === t.id ? 'opacity-40 scale-95 rotate-1' : ''
                      } ${isUpdating ? 'opacity-60 animate-pulse pointer-events-none' : ''}`}
                    >
                      {/* top: area + priority */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium ${areaChipClass(t.areaId)}`}>
                          {t.areaName || `Área ${t.areaId}`}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md ml-auto font-medium ${PRIO_BADGE[pr]}`}>
                          {PRIO_LABEL[pr]}
                        </span>
                      </div>

                      {/* title */}
                      <h4 className="text-xs font-medium text-foreground leading-snug mb-1.5">{t.title}</h4>

                      {/* description */}
                      {t.description && (
                        <p className="text-[10px] text-muted-foreground leading-relaxed mb-2 line-clamp-2">{t.description}</p>
                      )}

                      {/* progress bar */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-red-500 gantt-progress-fill"
                            style={{ width: `${t.progressPercent}%` }}
                          />
                        </div>
                        <span className="text-[10px] tabular-nums text-muted-foreground">{t.progressPercent}%</span>
                      </div>

                      {/* footer */}
                      <div className="flex items-center gap-1.5 mt-1">
                        {(() => {
                          const assignees = getAssignees(t)
                          return assignees.length > 0 ? (
                            <div className="flex items-center -space-x-1.5">
                              {assignees.map((a) => (
                                <div
                                  key={a.id}
                                  className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 border-2 border-white dark:border-neutral-800 flex items-center justify-center text-[7px] font-bold text-red-600 dark:text-red-400"
                                  title={a.name}
                                >
                                  {avatarInitials(a.name)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/50 italic">Sin asignar</span>
                          )
                        })()}

                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 ml-auto mr-1 shrink-0">
                          <Calendar className="w-2.5 h-2.5" />
                          {t.endDate}
                        </span>

                        {manage && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => onEdit(t)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(t)}
                              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {col.tasks.length === 0 && (
                  <div className={`flex items-center justify-center py-10 rounded-lg border-2 border-dashed transition-colors ${isOver ? 'border-red-500/30 bg-red-500/[0.04]' : 'border-transparent'}`}>
                    <p className="text-[11px] text-muted-foreground/40">{isOver ? 'Soltar aquí' : 'Sin tareas'}</p>
                  </div>
                )}

                {col.tasks.length > 0 && isOver && (
                  <div className="flex items-center justify-center py-3 rounded-lg border-2 border-dashed border-red-500/30 bg-red-500/[0.04] transition-all gantt-fade-in">
                    <p className="text-[11px] text-red-500/60 font-medium">Soltar aquí</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
