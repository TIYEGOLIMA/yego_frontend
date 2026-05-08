import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Flame,
  Inbox,
  Pencil,
  Play,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  Users,
  Loader2,
} from 'lucide-react'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { WorkosTabLoading } from './WorkosLoading'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { api } from '../../../../services/core/api'
import type { SprintsTabProps, TaskRow, SprintDto, SprintStatus } from '../types'
import { fetchSprintsByWorkspaces } from '../ganttApi'
import {
  differenceInCalendarDays,
  fmtShort,
  SPRINT_STATUS_LABEL,
  normPriority,
  taskPoints,
  sprintCapacityPts,
  sprintEndDateReached,
} from '../utils'
import { useDragAndDrop, useExpansion, useDialog } from '../hooks'
import {
  ProgressBar,
  SummaryCard,
  StatCard,
  EmptyState,
  StatusBadge,
  PriorityBadge,
  Avatar,
} from './common'

type SprintViewTab = 'active' | 'planning' | 'backlog' | 'completed'

interface SprintMetrics {
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

function computeSprintMetrics(sprint: SprintDto, tasks: TaskRow[]): SprintMetrics {
  const mtasks = tasks.filter((t) => t.sprintId === sprint.id)
  const totalTasks = mtasks.length
  const doneTasks = mtasks.filter((t) => t.status === 'DONE').length
  const inProgress = mtasks.filter((t) => t.status === 'IN_PROGRESS').length
  const blocked = mtasks.filter((t) => t.status === 'BLOCKED').length
  const risk = 0
  const totalPts = mtasks.reduce((a, t) => a + taskPoints(t.priority), 0)
  const donePts = mtasks.filter((t) => t.status === 'DONE').reduce((a, t) => a + taskPoints(t.priority), 0)
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
}

function computeMemberLoad(mtasks: TaskRow[], names: Map<number, string> | undefined) {
  const map = new Map<number, { pts: number; done: number }>()
  for (const t of mtasks) {
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
}

interface SprintTaskCardProps {
  task: TaskRow
  onDragStart: () => void
  onAdd?: () => void
  showAdd?: boolean
  collaboratorNames?: Map<number, string>
  workspaceName?: string | null
}

function SprintTaskCard({ task, onDragStart, onAdd, showAdd, collaboratorNames, workspaceName }: SprintTaskCardProps) {
  const p = normPriority(task.priority)
  const assigneeIds = task.assignedUserIds?.length
    ? task.assignedUserIds
    : task.assignedUserId != null
      ? [task.assignedUserId]
      : []
  const firstId = assigneeIds[0]
  const firstLabel = firstId != null ? collaboratorNames?.get(firstId) ?? `#${firstId}` : null
  const footerLabel = workspaceName || null

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group rounded-lg border border-[#e5e7eb] bg-white p-2.5 workos-shadow-soft hover:shadow-md cursor-grab active:cursor-grabbing transition dark:border-border/60 dark:bg-card"
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold tabular-nums text-muted-foreground shrink-0">#{task.id}</span>
        <span className="text-xs font-semibold text-foreground flex-1 truncate leading-snug">{task.title}</span>
        <PriorityBadge priority={p} size="sm" />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {footerLabel && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md border border-border/60 bg-muted/30 text-muted-foreground truncate max-w-[130px]">
              {footerLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {firstLabel && (
            <Avatar name={firstLabel} size="xs" title={firstLabel} />
          )}
          {showAdd && onAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="rounded p-0.5 hover:bg-primary-500/12 text-primary-600 dark:text-primary-400 opacity-0 group-hover:opacity-100 transition"
              title="Añadir al sprint"
            >
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground tabular-nums">{task.progressPercent}%</span>
        {task.progressPercent > 0 && <ProgressBar value={task.progressPercent} className="flex-1" size="sm" />}
      </div>
    </div>
  )
}

export function SprintsTab({
  tasks,
  workspaces,
  manage,
  canDeleteSprints,
  loading,
  refreshing = false,
  onSprintsPayload,
  refreshTasksAndKpis,
  onTaskStatusChange,
  onOpenCreateTask,
  onEditTask,
  collaboratorNames,
}: SprintsTabProps) {
  const [sprints, setSprints] = useState<Record<number, SprintDto[]>>({})
  const [sprintsLoading, setSprintsLoading] = useState(false)
  const [sprintsListBusy, setSprintsListBusy] = useState(false)
  const [sprintsActionError, setSprintsActionError] = useState<string | null>(null)
  const sprintsQuietRef = useRef(false)
  const sprintsLoadLockRef = useRef<Promise<void> | null>(null)
  const workspaceIdsKey = useMemo(
    () =>
      workspaces
        .map((p) => p.id)
        .sort((a, b) => a - b)
        .join(','),
    [workspaces],
  )

  const [tab, setTab] = useState<SprintViewTab>('active')
  const { expanded: openPlanningIds, toggle: togglePlanning } = useExpansion()
  const { dragId, setDragId } = useDragAndDrop<number>()
  const { isOpen: dialogOpen, open: openDialog, close: closeDialog, data: editingSprint } = useDialog<SprintDto>()

  const [form, setForm] = useState({
    workspaceId: '',
    name: '',
    goal: '',
    startDate: '',
    endDate: '',
    status: 'PLANNED' as SprintStatus,
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [prioFilter, setPrioFilter] = useState('all')

  useEffect(() => {
    sprintsQuietRef.current = false
  }, [workspaceIdsKey])

  const loadSprints = useCallback(
    async (opts?: { newSprintButtonBusy?: boolean }) => {
      if (sprintsLoadLockRef.current) {
        await sprintsLoadLockRef.current
        return
      }
      const run = (async () => {
        if (workspaces.length === 0) {
          setSprints({})
          sprintsQuietRef.current = false
          onSprintsPayload({})
          return
        }
        if (opts?.newSprintButtonBusy) setSprintsListBusy(true)
        const quiet = sprintsQuietRef.current
        if (!quiet) setSprintsLoading(true)
        try {
          const map = await fetchSprintsByWorkspaces(workspaces)
          setSprints(map)
          onSprintsPayload(map)
          sprintsQuietRef.current = true
        } finally {
          if (!quiet) setSprintsLoading(false)
          if (opts?.newSprintButtonBusy) setSprintsListBusy(false)
          sprintsLoadLockRef.current = null
        }
      })()
      sprintsLoadLockRef.current = run
      await run
    },
    [workspaces, onSprintsPayload],
  )

  useEffect(() => {
    void loadSprints()
  }, [loadSprints])

  const allSprints = useMemo(() => Object.values(sprints).flat(), [sprints])

  const active = useMemo(() => allSprints.filter((s) => s.status === 'ACTIVE'), [allSprints])
  const planning = useMemo(() => allSprints.filter((s) => s.status === 'PLANNED'), [allSprints])
  const completed = useMemo(() => allSprints.filter((s) => s.status === 'COMPLETED'), [allSprints])

  const backlogTasks = useMemo(
    () => tasks.filter((t) => !t.sprintId && t.status !== 'DONE'),
    [tasks],
  )

  const firstActive = active[0]
  let daysLeftActive = 0
  if (firstActive?.endDate) {
    try {
      daysLeftActive = differenceInCalendarDays(new Date(firstActive.endDate + 'T12:00:00'), new Date())
    } catch {
      // ignore
    }
  }

  const avgVelocityPts = useMemo(() => {
    if (!completed.length) return 0
    const velocities = completed.map((s) =>
      tasks
        .filter((t) => t.sprintId === s.id && t.status === 'DONE')
        .reduce((a, t) => a + taskPoints(t.priority), 0),
    )
    return Math.round(velocities.reduce((a, b) => a + b, 0) / velocities.length)
  }, [completed, tasks])

  const backlogPts = useMemo(() => backlogTasks.reduce((a, t) => a + taskPoints(t.priority), 0), [backlogTasks])

  const velocityData = useMemo(() => {
    return completed
      .slice()
      .reverse()
      .map((s) => {
        const ts = tasks.filter((t) => t.sprintId === s.id)
        return {
          name: s.name.split('·')[0].trim(),
          planificado: ts.reduce((a, t) => a + taskPoints(t.priority), 0),
          completado: ts.filter((t) => t.status === 'DONE').reduce((a, t) => a + taskPoints(t.priority), 0),
        }
      })
  }, [completed, tasks])

  const workspaceNameById = useMemo(() => {
    const m = new Map<number, string>()
    workspaces.forEach((p) => m.set(p.id, p.name))
    return m
  }, [workspaces])

  const moveTaskToSprint = async (taskId: number, sprintId: number) => {
    try {
      await api.put(`/yego-gantt/tasks/${taskId}`, { sprintId })
      await refreshTasksAndKpis()
      await loadSprints({ newSprintButtonBusy: true })
    } catch {
      // ignore
    }
  }

  const setSprintStatus = async (sprint: SprintDto, status: SprintStatus) => {
    if (status === 'COMPLETED' && !sprintEndDateReached(sprint.endDate)) {
      setSprintsActionError('No se puede cerrar el sprint antes de su fecha de fin')
      return
    }
    setSprintsActionError(null)
    try {
      await api.put(`/yego-gantt/sprints/${sprint.id}`, { status })
      await loadSprints({ newSprintButtonBusy: true })
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String(
              (e as { response?: { data?: { message?: string } } }).response?.data?.message ||
                'No se pudo actualizar el sprint',
            )
          : 'No se pudo actualizar el sprint'
      setSprintsActionError(msg)
    }
  }

  const openCreate = (workspaceId?: number) => {
    setSaveError(null)
    setForm({
      workspaceId: workspaceId?.toString() || workspaces[0]?.id?.toString() || '',
      name: '',
      goal: '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      status: 'PLANNED',
    })
    openDialog()
  }

  const openEdit = (s: SprintDto) => {
    setSaveError(null)
    setForm({
      workspaceId: String(s.workspaceId),
      name: s.name,
      goal: s.goal || '',
      startDate: s.startDate,
      endDate: s.endDate,
      status: s.status,
    })
    openDialog()
  }

  const saveSprint = async () => {
    setSaving(true)
    setSaveError(null)
    if (form.status === 'COMPLETED' && !sprintEndDateReached(form.endDate)) {
      setSaveError('No se puede cerrar el sprint antes de su fecha de fin')
      setSaving(false)
      return
    }
    try {
      const payload = {
        workspaceId: Number(form.workspaceId),
        name: form.name.trim(),
        goal: form.goal || null,
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
      }
      if (editingSprint) {
        await api.put(`/yego-gantt/sprints/${editingSprint.id}`, payload)
      } else {
        await api.post('/yego-gantt/sprints', payload)
      }
      closeDialog()
      await loadSprints({ newSprintButtonBusy: true })
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String(
              (e as { response?: { data?: { message?: string } } }).response?.data?.message || 'No se pudo guardar',
            )
          : 'No se pudo guardar'
      setSaveError(msg)
    } finally {
      setSaving(false)
    }
  }

  const deleteSprint = async (id: number) => {
    if (!canDeleteSprints) return
    if (!confirm('¿Eliminar este sprint?')) return
    setSprintsActionError(null)
    try {
      await api.delete(`/yego-gantt/sprints/${id}`)
      await refreshTasksAndKpis()
      await loadSprints({ newSprintButtonBusy: true })
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String(
              (e as { response?: { data?: { message?: string } } }).response?.data?.message ||
                'No se pudo eliminar el sprint',
            )
          : 'No se pudo eliminar el sprint'
      setSprintsActionError(msg)
    }
  }

  const sprintBootstrap = workspaces.length > 0 && sprintsLoading && Object.keys(sprints).length === 0
  if ((loading && tasks.length === 0) || sprintBootstrap) {
    return <WorkosTabLoading srLabel="Cargando sprints…" />
  }

  const tabs: { id: SprintViewTab; label: string; count: number; Icon: typeof Flame }[] = [
    { id: 'active', label: 'Activo', count: active.length, Icon: Flame },
    { id: 'planning', label: 'Planning', count: planning.length, Icon: Target },
    { id: 'backlog', label: 'Backlog', count: backlogTasks.length, Icon: Inbox },
    { id: 'completed', label: 'Completados', count: completed.length, Icon: Trophy },
  ]

  const sprintsNonCompleted = allSprints.filter((s) => s.status !== 'COMPLETED' && s.status !== 'CANCELLED')

  const filteredBacklog = backlogTasks.filter((t) => {
    if (prioFilter !== 'all' && normPriority(t.priority) !== prioFilter) return false
    return true
  })

  const chartGrid = 'var(--workos-chart-grid, #e5e7eb)'
  const chartAxis = 'var(--workos-chart-axis, #737373)'
  const chartTooltipBg = 'var(--workos-chart-tooltip-bg, #ffffff)'
  const chartTooltipBorder = 'var(--workos-chart-tooltip-border, #e5e5e5)'
  const chartIdealStroke = 'var(--workos-chart-ideal-stroke, #64748b)'
  const chartBarMuted = 'var(--workos-chart-bar-muted, #a3a3a3)'

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto space-y-4 relative pb-4 bg-[#f9fafb] dark:bg-transparent">
      {sprintsActionError && (
        <div
          className="rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm px-3 py-2 shrink-0"
          role="alert"
        >
          {sprintsActionError}
          <button
            type="button"
            className="ml-2 text-xs underline underline-offset-2"
            onClick={() => setSprintsActionError(null)}
          >
            Cerrar
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        <SummaryCard
          tone="primary"
          Icon={Flame}
          label="Sprint activo"
          value={firstActive?.name ?? 'Ninguno'}
          sub={firstActive ? `${Math.max(0, daysLeftActive)} días restantes` : 'Inicia uno desde planning'}
        />
        <SummaryCard
          tone="info"
          Icon={Target}
          label="En planificación"
          value={planning.length}
          sub={planning.length ? 'Listos para iniciar' : 'Sin sprints planeados'}
        />
        <SummaryCard
          tone="warning"
          Icon={Inbox}
          label="Backlog"
          value={backlogTasks.length}
          sub={`${backlogPts} pts sin asignar`}
        />
        <SummaryCard
          tone="success"
          Icon={TrendingUp}
          label="Velocity promedio"
          value={`${avgVelocityPts} pts`}
          sub={`${completed.length} sprint(s) completados`}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e5e7eb] bg-white p-1.5 workos-shadow-soft dark:border-border/80 dark:bg-card">
        <div className="flex items-center gap-1 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                tab === t.id
                  ? 'workos-gantt-tab-active workos-shadow-soft'
                  : 'text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <t.Icon className="h-3.5 w-3.5" />
              {t.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                  tab === t.id ? 'bg-white/20' : 'bg-muted-foreground/10'
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
        {manage && (
          <Button
            size="sm"
            onClick={() => openCreate()}
            disabled={sprintsListBusy}
            className="gap-1.5 rounded-lg workos-gantt-btn-primary border-0 h-9"
          >
            {sprintsListBusy ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                Cargando sprints…
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Nuevo sprint
              </>
            )}
          </Button>
        )}
      </div>

      {tab === 'active' && (
        <div className="space-y-4">
          {active.length === 0 ? (
            <EmptyState
              Icon={Flame}
              title="No hay sprint activo"
              description="Crea o promueve un sprint en planning para empezar."
              action={() => setTab('planning')}
              actionLabel="Ir a planning"
            />
          ) : (
            active.map((sprint) => {
              const m = computeSprintMetrics(sprint, tasks)
              const load = computeMemberLoad(m.mtasks, collaboratorNames)
              const timePct = Math.round((m.elapsed / m.totalDays) * 100)
              const riskPct = m.totalPts ? Math.round(((m.blocked + m.risk) / Math.max(1, m.totalTasks)) * 100) : 0
              const overCapacity = m.totalPts > m.capacityPts
              const capProgress = Math.min(100, Math.round((m.totalPts / Math.max(1, m.capacityPts)) * 100))

              return (
                <div
                  key={sprint.id}
                  className="rounded-xl border border-[#e5e7eb] workos-gantt-gradient-sprint-panel workos-shadow-soft overflow-hidden dark:border-border/80"
                >
                  <div className="px-5 py-4 border-b border-[#e5e7eb] bg-white dark:border-border/40 dark:bg-card/60">
                    <div className="flex items-start gap-4 flex-wrap">
                      <div className="h-12 w-12 rounded-xl workos-gantt-gradient-icon flex items-center justify-center text-white workos-shadow-soft shrink-0">
                        <Flame className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-display font-bold text-lg text-foreground truncate">{sprint.name}</h2>
                          <span className="rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 workos-animate-pulse-soft" />
                            Activo
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                          {sprint.goal || <em>Sin objetivo definido</em>}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <CalendarRange className="h-3.5 w-3.5" />
                            {fmtShort(sprint.startDate)} → {fmtShort(sprint.endDate)}
                          </span>
                          <span>·</span>
                          <span>{m.totalDays} días total</span>
                          <span>·</span>
                          <span className="text-foreground font-semibold">{m.remaining} días restantes</span>
                        </div>
                      </div>
                      {manage && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(sprint)}
                            className="gap-1 rounded-lg border-primary-500 text-primary-600 dark:text-primary-400 bg-white hover:bg-primary-50 dark:hover:bg-primary-950/30"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            disabled={!sprintEndDateReached(sprint.endDate)}
                            title={
                              !sprintEndDateReached(sprint.endDate)
                                ? 'Solo puedes cerrar el sprint a partir de su fecha de fin'
                                : undefined
                            }
                            onClick={() => setSprintStatus(sprint, 'COMPLETED')}
                            className="gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white border-0 disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Cerrar sprint
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <StatCard
                        label="Progreso"
                        value={`${m.completion}%`}
                        sub={`${m.donePts}/${m.totalPts} pts`}
                        progress={m.completion}
                        barVariant={m.completion === 0 ? 'red' : 'primary'}
                      />
                      <StatCard
                        label="Capacidad"
                        value={`${m.totalPts}/${m.capacityPts}`}
                        sub={overCapacity ? 'Sobreasignado' : 'Dentro de capacidad'}
                        progress={capProgress}
                        barVariant={overCapacity ? 'amber' : 'sky'}
                      />
                      <StatCard
                        label="Tiempo"
                        value={`${timePct}%`}
                        sub={`Día ${m.elapsed} de ${m.totalDays}`}
                        progress={timePct}
                        barVariant="sky"
                      />
                      <StatCard
                        label="Riesgos"
                        value={m.blocked + m.risk}
                        sub={`${m.blocked} bloq · ${m.risk} riesgo`}
                        progress={riskPct}
                        barVariant={m.blocked + m.risk > 0 ? 'red' : 'primary'}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-b border-[#e5e7eb] dark:border-border/40">
                    <div className="lg:col-span-2 p-4 border-r border-[#e5e7eb] bg-white dark:border-border/40 dark:bg-card/40">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                          <h3 className="text-sm font-semibold font-display">Burndown</h3>
                        </div>
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <span className="h-2 w-3 border-t-2 border-dashed border-muted-foreground" />
                            Ideal
                          </span>
                          <span className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400">
                            <span className="h-2 w-3 rounded-sm workos-progress-fill" />
                            Real
                          </span>
                        </div>
                      </div>
                      <div className="h-44 w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={m.burndown} margin={{ top: 8, right: 8, left: -8, bottom: 4 }}>
                            <defs>
                              <linearGradient id={`bd-${sprint.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#EF0000" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="#EF0000" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} horizontal vertical />
                            <XAxis
                              dataKey="day"
                              stroke={chartAxis}
                              fontSize={10}
                              tickLine={{ stroke: chartAxis }}
                              axisLine={{ stroke: chartGrid }}
                            />
                            <YAxis
                              stroke={chartAxis}
                              fontSize={10}
                              tickLine={{ stroke: chartAxis }}
                              axisLine={{ stroke: chartGrid }}
                              width={32}
                            />
                            <Tooltip
                              contentStyle={{
                                background: chartTooltipBg,
                                border: `1px solid ${chartTooltipBorder}`,
                                borderRadius: 8,
                                fontSize: 12,
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="real"
                              name="Real"
                              stroke="#EF0000"
                              fill={`url(#bd-${sprint.id})`}
                              strokeWidth={2}
                              connectNulls={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="ideal"
                              name="Ideal"
                              stroke={chartIdealStroke}
                              strokeWidth={1.5}
                              strokeDasharray="6 4"
                              dot={false}
                              connectNulls
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="p-4 bg-white dark:bg-card/40">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="h-4 w-4 text-sky-600" />
                        <h3 className="text-sm font-semibold font-display">Carga por persona</h3>
                      </div>
                      {load.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Sin asignaciones</p>
                      ) : (
                        <div className="space-y-2 max-h-44 overflow-auto pr-1">
                          {load.map((row) => (
                            <div key={row.id} className="flex items-center gap-2">
                              <Avatar name={row.label} size="sm" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-medium truncate">{row.label}</span>
                                  <span className="tabular-nums text-muted-foreground">
                                    <span className="text-foreground font-semibold">{row.done}</span>/{row.pts} pts
                                  </span>
                                </div>
                                <ProgressBar value={row.pts ? (row.done / row.pts) * 100 : 0} size="sm" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-[#fafafa] dark:bg-card/30">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <Activity className="h-4 w-4 text-foreground" />
                      <h3 className="text-sm font-semibold font-display">Tareas del sprint</h3>
                      <span className="text-xs text-muted-foreground">· {m.mtasks.length} tareas</span>
                      {manage && onOpenCreateTask && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-auto gap-1 rounded-lg border-primary-500 text-primary-600 dark:text-primary-400 bg-white hover:bg-primary-50 dark:hover:bg-primary-950/30"
                          onClick={() => onOpenCreateTask({ sprintId: sprint.id, workspaceId: sprint.workspaceId })}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Añadir
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {(['PENDING', 'IN_PROGRESS', 'BLOCKED', 'DONE'] as const).map((st) => {
                        const items = m.mtasks.filter((t) => t.status === st)
                        return (
                          <div
                            key={st}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => {
                              if (dragId != null && onTaskStatusChange) {
                                onTaskStatusChange(dragId, st)
                                setDragId(null)
                              }
                            }}
                            className="rounded-lg border border-[#e5e7eb] bg-white p-2 min-h-[120px] dark:border-border/60 dark:bg-card/60"
                          >
                            <div className="flex items-center justify-between mb-2 px-1">
                              <StatusBadge status={st} size="sm" />
                              <span className="text-[10px] tabular-nums text-muted-foreground">{items.length}</span>
                            </div>
                            <div className="space-y-1.5">
                              {items.map((t) => (
                                <SprintTaskCard
                                  key={t.id}
                                  task={t}
                                  onDragStart={() => setDragId(t.id)}
                                  collaboratorNames={collaboratorNames}
                                  workspaceName={t.workspaceId != null ? workspaceNameById.get(t.workspaceId) : null}
                                />
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {tab === 'planning' && (
        <div className="space-y-4">
          {planning.length === 0 ? (
            <EmptyState
              Icon={Target}
              title="No hay sprints en planning"
              description="Crea uno y planifica tu próximo ciclo."
              action={manage ? () => openCreate() : undefined}
              actionLabel={manage ? 'Crear sprint' : undefined}
            />
          ) : (
            planning.map((sprint) => {
              const m = computeSprintMetrics(sprint, tasks)
              const isOpen = openPlanningIds.has(sprint.id)
              return (
                <div key={sprint.id} className="rounded-xl border border-[#e5e7eb] bg-white workos-shadow-soft overflow-hidden dark:border-border/80 dark:bg-card">
                  <button
                    type="button"
                    onClick={() => togglePlanning(sprint.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f9fafb] transition text-left dark:hover:bg-muted/30"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="h-10 w-10 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
                      <Target className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-semibold">{sprint.name}</span>
                        <span className="rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          Planning
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {sprint.goal || <em>Sin objetivo</em>}
                      </div>
                    </div>
                    <div className="hidden md:flex items-center gap-4 text-xs shrink-0">
                      <span className="text-muted-foreground">
                        <CalendarRange className="inline h-3 w-3 mr-1" />
                        {fmtShort(sprint.startDate)} → {fmtShort(sprint.endDate)}
                      </span>
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground">Carga</div>
                        <div className="font-semibold tabular-nums">
                          {m.totalPts}/{m.capacityPts} pts
                        </div>
                      </div>
                      <div className="w-24">
                        <ProgressBar
                          value={Math.min(100, Math.round((m.totalPts / Math.max(1, m.capacityPts)) * 100))}
                          variant={m.totalPts > m.capacityPts ? 'amber' : 'primary'}
                          size="sm"
                        />
                      </div>
                    </div>
                    {manage && (
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm" onClick={() => openEdit(sprint)} className="gap-1 rounded-lg">
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setSprintStatus(sprint, 'ACTIVE')}
                          className="gap-1 rounded-lg workos-gantt-btn-primary border-0"
                        >
                          <Play className="h-3.5 w-3.5" />
                          Iniciar
                        </Button>
                        {canDeleteSprints && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteSprint(sprint.id)}
                            title="Eliminar sprint"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </button>

                  {isOpen && (
                    <div className="border-t border-[#e5e7eb] bg-[#fafafa] p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 dark:border-border/40 dark:bg-muted/20">
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (dragId != null) {
                            void moveTaskToSprint(dragId, sprint.id)
                            setDragId(null)
                          }
                        }}
                        className="rounded-lg border-2 border-dashed border-primary-500/35 bg-white p-3 dark:bg-card"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                            <h4 className="text-sm font-semibold">En este sprint</h4>
                            <span className="text-[10px] text-muted-foreground tabular-nums">{m.mtasks.length} tareas</span>
                          </div>
                          {manage && onOpenCreateTask && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onOpenCreateTask({ sprintId: sprint.id, workspaceId: sprint.workspaceId })}
                              className="h-7 gap-1 text-xs"
                            >
                              <Plus className="h-3 w-3" />
                              Nueva
                            </Button>
                          )}
                        </div>
                        {m.mtasks.length === 0 ? (
                          <div className="py-8 text-center text-xs text-muted-foreground italic">
                            Arrastra tareas del backlog aquí →
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-80 overflow-auto">
                            {m.mtasks.map((t) => (
                              <SprintTaskCard
                                key={t.id}
                                task={t}
                                onDragStart={() => setDragId(t.id)}
                                collaboratorNames={collaboratorNames}
                                workspaceName={t.workspaceId != null ? workspaceNameById.get(t.workspaceId) : null}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="rounded-lg border border-[#e5e7eb] bg-white p-3 dark:border-border/60 dark:bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Inbox className="h-4 w-4 text-muted-foreground" />
                            <h4 className="text-sm font-semibold">Backlog disponible</h4>
                            <span className="text-[10px] text-muted-foreground tabular-nums">{backlogTasks.length} tareas</span>
                          </div>
                        </div>
                        {backlogTasks.length === 0 ? (
                          <div className="py-8 text-center text-xs text-muted-foreground italic">Backlog vacío</div>
                        ) : (
                          <div className="space-y-1.5 max-h-80 overflow-auto">
                            {backlogTasks.map((t) => (
                              <SprintTaskCard
                                key={t.id}
                                task={t}
                                onDragStart={() => setDragId(t.id)}
                                showAdd
                                onAdd={() => void moveTaskToSprint(t.id, sprint.id)}
                                collaboratorNames={collaboratorNames}
                                workspaceName={t.workspaceId != null ? workspaceNameById.get(t.workspaceId) : null}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {tab === 'backlog' && (
        <div className="rounded-xl border border-[#e5e7eb] bg-white workos-shadow-soft dark:border-border/80 dark:bg-card">
          <div className="px-4 py-3 border-b border-[#e5e7eb] flex flex-wrap items-center gap-3 dark:border-border/40">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Inbox className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-semibold">Backlog</h3>
              <p className="text-xs text-muted-foreground">
                {filteredBacklog.length} tareas ·{' '}
                {filteredBacklog.reduce((a, t) => a + taskPoints(t.priority), 0)} pts · progreso medio{' '}
                {filteredBacklog.length
                  ? Math.round(
                      filteredBacklog.reduce((a, t) => a + t.progressPercent, 0) / filteredBacklog.length,
                    )
                  : 0}
                %
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              <Select value={prioFilter} onValueChange={setPrioFilter}>
                <SelectTrigger className="h-8 w-[140px] rounded-lg">
                  <SelectValue placeholder="Prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="URGENT">Urgente</SelectItem>
                  <SelectItem value="HIGH">Alta</SelectItem>
                  <SelectItem value="MEDIUM">Media</SelectItem>
                  <SelectItem value="LOW">Baja</SelectItem>
                </SelectContent>
              </Select>
              {manage && onOpenCreateTask && (
                <Button
                  size="sm"
                  onClick={() => onOpenCreateTask({})}
                  className="gap-1.5 rounded-lg workos-gantt-btn-primary border-0"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo proyecto
                </Button>
              )}
            </div>
          </div>
          {filteredBacklog.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Backlog vacío. ¡Buen trabajo!</div>
          ) : (
            <div className="divide-y divide-border/40">
              {filteredBacklog.map((t) => {
                const p = normPriority(t.priority)
                return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 cursor-grab active:cursor-grabbing transition"
                  >
                    <PriorityBadge priority={p} size="sm" />
                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => onEditTask?.(t)}
                        className="font-medium text-sm text-foreground hover:text-primary-600 dark:hover:text-primary-400 text-left truncate block w-full"
                      >
                        {t.title}
                      </button>
                      {t.description && <div className="text-xs text-muted-foreground truncate">{t.description}</div>}
                    </div>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold tabular-nums shrink-0">
                      {t.progressPercent}%
                    </span>
                    <Select
                      onValueChange={(v) => {
                        if (v && v !== '-') void moveTaskToSprint(t.id, Number(v))
                      }}
                    >
                      <SelectTrigger className="h-7 w-[160px] text-xs rounded-lg">
                        <SelectValue placeholder="Mover a sprint…" />
                      </SelectTrigger>
                      <SelectContent>
                        {sprintsNonCompleted.length === 0 ? (
                          <SelectItem value="-" disabled>
                            No hay sprints
                          </SelectItem>
                        ) : (
                          sprintsNonCompleted.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'completed' && (
        <div className="space-y-4">
          {velocityData.length > 1 && (
            <div className="rounded-xl border border-[#e5e7eb] bg-white p-4 workos-shadow-soft dark:border-border/80 dark:bg-card">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <h3 className="font-display font-semibold">Rendimiento por sprint (pts)</h3>
              </div>
              <div className="h-48 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={velocityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} horizontal vertical />
                    <XAxis dataKey="name" stroke={chartAxis} fontSize={12} tickLine={{ stroke: chartAxis }} axisLine={{ stroke: chartGrid }} />
                    <YAxis stroke={chartAxis} fontSize={12} tickLine={{ stroke: chartAxis }} axisLine={{ stroke: chartGrid }} />
                    <Tooltip
                      contentStyle={{
                        background: chartTooltipBg,
                        border: `1px solid ${chartTooltipBorder}`,
                        borderRadius: 8,
                      }}
                    />
                    <Legend />
                    <Bar dataKey="planificado" name="Planificado (pts)" fill={chartBarMuted} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="completado" name="Completado (pts)" fill="#EF0000" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {completed.length === 0 ? (
            <EmptyState
              Icon={Trophy}
              title="Aún sin sprints completados"
              description="Cuando cierres un sprint aparecerá aquí el resumen."
            />
          ) : (
            completed.map((sprint) => {
              const m = computeSprintMetrics(sprint, tasks)
              const doneN = m.mtasks.filter((t) => t.status === 'DONE').length
              return (
                <div key={sprint.id} className="rounded-xl border border-[#e5e7eb] bg-white p-4 workos-shadow-soft dark:border-border/80 dark:bg-card">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-semibold">{sprint.name}</span>
                        <span className="rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          Completado
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {fmtShort(sprint.startDate)} → {fmtShort(sprint.endDate)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Cierre</div>
                      <div className="font-display text-2xl font-bold text-emerald-600 tabular-nums">
                        {doneN}
                        <span className="text-sm text-muted-foreground"> / {m.mtasks.length} tareas</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                    <div className="rounded-lg bg-muted/30 px-3 py-2">
                      <div className="text-muted-foreground">Tareas hechas</div>
                      <div className="font-semibold">
                        {doneN} / {m.mtasks.length}
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted/30 px-3 py-2">
                      <div className="text-muted-foreground">Cumplimiento</div>
                      <div className="font-semibold">{m.completion}%</div>
                    </div>
                    <div className="rounded-lg bg-muted/30 px-3 py-2">
                      <div className="text-muted-foreground">Duración</div>
                      <div className="font-semibold">{m.totalDays} días</div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Sprint Dialog */}
      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editingSprint ? 'Editar sprint' : 'Nuevo sprint'}
            </DialogTitle>
            <DialogDescription>Define el ciclo de trabajo y su objetivo.</DialogDescription>
          </DialogHeader>
          {saveError && (
            <p className="text-sm text-destructive border border-destructive/30 rounded-md px-2 py-1.5 bg-destructive/5">
              {saveError}
            </p>
          )}
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Espacio de trabajo</Label>
              <Select
                value={form.workspaceId}
                onValueChange={(v) => setForm((f) => ({ ...f, workspaceId: v }))}
                disabled={!!editingSprint}
              >
                <SelectTrigger className="h-9 rounded-lg">
                  <SelectValue placeholder="Selecciona proyecto" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Sprint 1 — MVP"
                className="h-9 rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Objetivo (sprint goal)</Label>
              <Textarea
                value={form.goal}
                onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
                placeholder="¿Qué resultado clave queremos lograr?"
                className="min-h-[80px] rounded-lg resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Inicio</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="h-9 rounded-lg text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Fin</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="h-9 rounded-lg text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Estado</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as SprintStatus }))}>
                <SelectTrigger className="h-9 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as SprintStatus[]).map((k) => {
                    const completedLocked =
                      k === 'COMPLETED' && form.status !== 'COMPLETED' && !sprintEndDateReached(form.endDate)
                    return (
                      <SelectItem key={k} value={k} disabled={completedLocked}>
                        {SPRINT_STATUS_LABEL[k]}
                        {completedLocked ? ' — desde fecha fin' : ''}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeDialog} className="rounded-lg">
              Cancelar
            </Button>
            <Button
              disabled={!form.name.trim() || !form.workspaceId || saving}
              onClick={saveSprint}
              className="rounded-lg workos-gantt-btn-primary border-0"
            >
              {saving ? 'Guardando…' : editingSprint ? 'Guardar' : 'Crear sprint'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
