import { useMemo, useState } from 'react'
import {
  Building2,
  Calendar,
  ChevronDown,
  ChevronRight,
  Crown,
  ListTodo,
  Pencil,
  Plus,
  Trash2,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

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
}

const STATUS_LABEL: Record<AreaTaskStatus, string> = {
  PENDING: 'Por Hacer',
  IN_PROGRESS: 'En Progreso',
  DONE: 'Hecha',
  BLOCKED: 'Bloqueada',
  AT_RISK: 'En riesgo',
}

const STATUS_CHIP: Record<AreaTaskStatus, string> = {
  PENDING: 'bg-red-500/15 text-red-700 dark:text-red-300',
  IN_PROGRESS: 'bg-amber-500/12 text-amber-700 dark:text-amber-300',
  DONE: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  BLOCKED: 'bg-zinc-500/12 text-zinc-700 dark:text-zinc-300',
  AT_RISK: 'bg-yellow-500/12 text-yellow-700 dark:text-yellow-300',
}

const PRIO_LABEL: Record<TaskPriority, string> = { LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', URGENT: 'Urgente' }
const PRIO_COLOR: Record<TaskPriority, string> = {
  LOW: 'text-muted-foreground/70',
  MEDIUM: 'text-red-600 dark:text-red-400',
  HIGH: 'text-amber-600',
  URGENT: 'text-rose-600',
}

function norm(p?: TaskPriority | null): TaskPriority {
  return p === 'LOW' || p === 'MEDIUM' || p === 'HIGH' || p === 'URGENT' ? p : 'MEDIUM'
}

function userInitials(userId: number): string {
  return `U${userId}`
}

interface AssignedUser {
  id: number
  initials: string
  taskCount: number
}

interface AreaGroup {
  areaId: number
  areaName: string
  description: string
  tasks: TaskRow[]
  done: number
  total: number
  progressPct: number
  assignedUsers: AssignedUser[]
}

export interface PortfolioTabProps {
  tasks: TaskRow[]
  loading: boolean
  manage: boolean
  onEdit: (t: TaskRow) => void
  onDelete: (t: TaskRow) => void
  onCreateTask: () => void
}

export function PortfolioTab({ tasks, loading, manage, onEdit, onDelete, onCreateTask }: PortfolioTabProps) {
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set())

  const groups = useMemo<AreaGroup[]>(() => {
    const m = new Map<number, TaskRow[]>()
    for (const t of tasks) {
      if (!m.has(t.areaId)) m.set(t.areaId, [])
      m.get(t.areaId)!.push(t)
    }
    return [...m.entries()]
      .sort(([, a], [, b]) => (a[0]?.areaName || '').localeCompare(b[0]?.areaName || ''))
      .map(([areaId, list]) => {
        const done = list.filter((t) => t.status === 'DONE').length
        const total = list.length
        const userMap = new Map<number, number>()
        for (const t of list) {
          if (t.assignedUserId != null) {
            userMap.set(t.assignedUserId, (userMap.get(t.assignedUserId) || 0) + 1)
          }
        }
        return {
          areaId,
          areaName: list[0]?.areaName?.trim() || `Área ${areaId}`,
          description: `${total} tarea(s) · ${userMap.size} miembro(s) asignado(s)`,
          tasks: list,
          done,
          total,
          progressPct: total > 0 ? Math.round((done / total) * 100) : 0,
          assignedUsers: [...userMap.entries()].map(([id, count]) => ({
            id,
            initials: userInitials(id),
            taskCount: count,
          })),
        }
      })
  }, [tasks])

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const totalAreas = groups.length
  const totalTasks = tasks.length
  const totalDone = tasks.filter((t) => t.status === 'DONE').length
  const totalUsers = useMemo(() => {
    const s = new Set<number>()
    for (const t of tasks) if (t.assignedUserId != null) s.add(t.assignedUserId)
    return s.size
  }, [tasks])

  if (loading) return <p className="text-sm text-muted-foreground p-6">Cargando cartera…</p>

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* stats strip */}
      <div className="px-5 py-3 border-b border-border/60 bg-muted/15 flex items-center gap-6 shrink-0">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-red-600 dark:text-red-400" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Áreas</span>
          <span className="text-sm font-bold tabular-nums">{totalAreas}</span>
        </div>
        <div className="w-px h-5 bg-border" />
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-violet-500" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Personal</span>
          <span className="text-sm font-bold tabular-nums">{totalUsers}</span>
        </div>
        <div className="w-px h-5 bg-border" />
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-amber-500" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Tareas</span>
          <span className="text-sm font-bold tabular-nums text-foreground">
            {totalDone}/{totalTasks}
          </span>
        </div>
        {manage && (
          <div className="ml-auto">
            <Button
              size="sm"
              onClick={onCreateTask}
              className="h-8 text-xs gap-1.5 bg-red-600 hover:bg-red-700 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva Área
            </Button>
          </div>
        )}
      </div>

      {/* area cards */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
        {groups.length === 0 && (
          <div className="text-center py-16">
            <Building2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No hay áreas con tareas.</p>
            {manage && (
              <Button size="sm" variant="outline" onClick={onCreateTask} className="mt-3 text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Crear primera área
              </Button>
            )}
          </div>
        )}
        {groups.map((g) => {
          const isOpen = expanded.has(g.areaId)
          return (
            <div
              key={g.areaId}
              className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Area header */}
              <div className="flex items-center gap-3 px-5 py-4">
                <button
                  type="button"
                  onClick={() => toggle(g.areaId)}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{g.areaName}</h3>
                  <p className="text-[11px] text-muted-foreground truncate">{g.description}</p>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2 mr-2 shrink-0">
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {g.done}/{g.total}
                  </span>
                  <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-500 transition-all"
                      style={{ width: `${g.progressPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums text-muted-foreground w-8">{g.progressPct}%</span>
                </div>

                {/* Leader badge */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-red-500/25 bg-red-500/5 text-[11px] text-red-700 dark:text-red-300 shrink-0">
                  <Crown className="w-3 h-3" />
                  Jefe de área
                </div>

                {/* Action buttons */}
                {manage && (
                  <div className="flex items-center gap-0.5 ml-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onCreateTask()
                      }}
                      className="p-1.5 rounded-md hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-600"
                      title="Agregar tarea"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title="Editar área"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                      title="Eliminar área"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Expanded: two-column layout like Lovable */}
              {isOpen && (
                <div className="px-5 pb-5 pt-1 border-t border-border/50">
                  <div className="grid grid-cols-3 gap-5">
                    {/* Left: Equipo del Área */}
                    <div>
                      <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 font-medium">
                        Equipo del Área
                      </h4>
                      <div className="space-y-1.5">
                        {g.assignedUsers.length > 0 ? (
                          g.assignedUsers.map((u, idx) => (
                            <div
                              key={u.id}
                              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors"
                            >
                              <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-semibold text-muted-foreground shrink-0">
                                {u.initials}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-xs text-foreground font-medium">Usuario #{u.id}</span>
                                <span className="text-[10px] text-muted-foreground ml-1.5">
                                  · {u.taskCount} tarea(s)
                                </span>
                              </div>
                              {idx === 0 && <Crown className="w-3 h-3 text-amber-500 shrink-0" />}
                            </div>
                          ))
                        ) : (
                          <p className="text-[11px] text-muted-foreground/60 italic px-2.5 py-3">
                            Sin miembros asignados
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Tareas del Área */}
                    <div className="col-span-2">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                          Tareas del Área
                        </h4>
                        {manage && (
                          <button
                            type="button"
                            onClick={onCreateTask}
                            className="text-[11px] text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 font-medium"
                          >
                            <Plus className="w-3 h-3" /> Nueva tarea
                          </button>
                        )}
                      </div>
                      <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                        {g.tasks.map((t) => {
                          const pr = norm(t.priority)
                          return (
                            <div
                              key={t.id}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors group cursor-pointer"
                              onClick={() => onEdit(t)}
                            >
                              {/* Status chip */}
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-md font-medium shrink-0 whitespace-nowrap ${STATUS_CHIP[t.status]}`}
                              >
                                {STATUS_LABEL[t.status]}
                              </span>

                              {/* Title */}
                              <span className="text-xs text-foreground flex-1 truncate">{t.title}</span>

                              {/* Dates */}
                              <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1 tabular-nums">
                                <Calendar className="w-3 h-3" />
                                {t.endDate.slice(5)}
                              </span>

                              {/* Assignee avatar */}
                              {t.assignedUserId != null && (
                                <div
                                  className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center text-[8px] font-bold text-muted-foreground shrink-0"
                                  title={`Usuario #${t.assignedUserId}`}
                                >
                                  {userInitials(t.assignedUserId)}
                                </div>
                              )}

                              {/* Priority */}
                              <span className={`text-[10px] font-medium shrink-0 ${PRIO_COLOR[pr]}`}>
                                {PRIO_LABEL[pr]}
                              </span>

                              {/* Delete on hover */}
                              {manage && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onDelete(t)
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all shrink-0"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )
                        })}
                        {g.tasks.length === 0 && (
                          <p className="text-[11px] text-muted-foreground/60 italic text-center py-6">
                            Sin tareas. Crea y asigna tareas a los miembros del área.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
