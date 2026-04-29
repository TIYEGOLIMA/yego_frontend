import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { api } from '../../../services/core/api'
import { useAuthStore, type User } from '../../../store/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  AlertTriangle,
  Boxes,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleDot,
  Crown,
  Flame,
  GanttChartSquare,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  Loader2,
  Octagon,
  PencilLine,
  Plus,
  Route,
  Search,
  Trash2,
  Users,
} from 'lucide-react'
import './workos-gantt-shell.css'
import { GanttTimelineTab } from './components/gantt-timeline/GanttTimelineTab'
import { PulseStatsBar } from './components/gantt-timeline/PulseStatsBar'
import { TimelineVisibilityScope } from './components/TimelineVisibilityScope'
import { useIntegralNotificationsStore } from '../../../store/integral-notifications-store'
import type { IntegralNotification } from '../../../types/integral-notification'
import { buildTaskAlertNotifications } from './integralFeed'
import { PortfolioTab } from './components/PortfolioTab'
import { TodoBoardTab } from './components/TodoBoardTab'
import { DashboardTab } from './components/DashboardTab'
import { SprintsTab } from './components/SprintsTab'
import type {
  AreaTaskStatus,
  TaskPriority,
  TaskRow,
  AreaFull,
  ColaboradorDto,
  SprintDto,
  WorkspaceDto,
  Kpis,
} from './types'
import {
  areasStableKey,
  buildGanttTaskSavePayload,
  fetchAreaCollaboratorsMap,
  fetchGanttMasterData,
  fetchGanttTaskSummary,
  fetchSprintsByWorkspaces,
  createTaskSubtask,
  deleteTaskSubtask,
  fetchTaskSubtasks,
  updateTaskSubtask,
  parseGanttLoadError,
} from './ganttApi'
import type { TaskSubtaskDto } from './ganttApi'
import { projectIconByKey } from './projectIcons'
import {
  normPriority,
  STATUS_LABEL,
  PRIORITY_LABEL,
  taskPoints,
  tagColor,
  PRIO_BADGE,
  computeDurationDays,
} from './utils'
import {
  filterTasksForTimeline,
  tagsIndicatePrivate,
  tagsWithoutPrivateLabels,
  taskRowIsPrivate,
  taskIsMine,
  taskIsMyPrivate,
  type TimelineVisibilityFilter,
} from './taskPrivacy'
import { cn } from '@/utils/cn'
import { Avatar, ProgressBar } from './components/common'

/** Fechas del modal detalle (estilo sprint-master-pro: «26 abr 2026»). */
function formatDetailModalDate(iso: string): string {
  const d = new Date(iso + (iso.length <= 10 ? 'T12:00:00' : ''))
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

function normalizeSubtaskDto(raw: TaskSubtaskDto): TaskSubtaskDto {
  const w = raw.weight as string | number | undefined
  return {
    ...raw,
    weight: typeof w === 'string' ? w : String(w ?? '1'),
  }
}

/** Misma lógica que el agregado ponderado del backend (`computeWeightedProgressPercent`). */
function weightedProgressPercentFromSubtasks(list: TaskSubtaskDto[]): number {
  let sumW = 0
  let sumDoneW = 0
  for (const s of list) {
    const raw = Number(s.weight)
    const w = Number.isFinite(raw) && raw > 0 ? raw : 1
    sumW += w
    if (s.done) sumDoneW += w
  }
  if (sumW <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((sumDoneW / sumW) * 100)))
}

/** Tras mutar subtareas en el modal: barra de progreso + contadores en la grilla sin esperar `GET /summary`. */
function patchGanttParentFromSubtasks(
  parentId: number,
  list: TaskSubtaskDto[],
  setTasks: Dispatch<SetStateAction<TaskRow[]>>,
  setKpis: Dispatch<SetStateAction<Kpis | null>>,
): void {
  const pct = weightedProgressPercentFromSubtasks(list)
  const doneN = list.reduce((n, s) => n + (s.done ? 1 : 0), 0)
  const totalN = list.length
  setTasks((pt) => {
    const nt = pt.map((t) =>
      t.id === parentId
        ? { ...t, progressPercent: pct, subtaskDone: doneN, subtaskTotal: totalN }
        : t,
    )
    const avg = nt.reduce((sum, t) => sum + (t.progressPercent ?? 0), 0) / Math.max(1, nt.length)
    setKpis((k) => (k ? { ...k, progresoPromedioPct: Math.round(avg * 10) / 10 } : k))
    return nt
  })
}

/** Fecha local `yyyy-mm-dd` para `min` en `<input type="date">` y validación. */
function todayYmdLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Id de área/equipo del usuario para precargar tareas privadas (perfil vs lista Gantt).
 */
function resolveUserDefaultAreaId(user: User | null | undefined, areas: AreaFull[]): string {
  if (!user || areas.length === 0) return ''
  if (user.areaId != null) {
    const sid = String(user.areaId)
    if (areas.some((a) => String(a.id) === sid)) return sid
  }
  const matchLabel = (label: string | null | undefined): string => {
    const raw = (label || '').trim()
    if (!raw) return ''
    const parts = raw.split(',').map((p) => p.trim()).filter(Boolean)
    for (const part of parts) {
      const pl = part.toLowerCase()
      const hit = areas.find((a) => (a.name || '').trim().toLowerCase() === pl)
      if (hit) return String(hit.id)
    }
    return ''
  }
  const fromPrincipal = matchLabel(user.nombreArea)
  if (fromPrincipal) return fromPrincipal
  const fromSupervisor = matchLabel(user.nombreAreaSupervisor)
  if (fromSupervisor) return fromSupervisor
  if (areas.length === 1) return String(areas[0].id)
  return ''
}

const FORM_SUBTASK_CHECKBOX_CLASS =
  'h-3.5 w-3.5 shrink-0 rounded-[3px] border-2 border-primary-500 text-primary-600 accent-primary-600 focus:ring-2 focus:ring-primary-500/35 focus:ring-offset-0 disabled:opacity-50'

/** Foco: borde primary al enfocar. */
const TASK_MODAL_FOCUS =
  'focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus:border-primary-500 dark:focus:border-primary-400 focus-visible:border-primary-500 dark:focus-visible:border-primary-400'

/** Bloqueo de acciones de subtareas en el modal: alta vs. edición (checkbox, título, borrar). */
type SubtaskModalBusy = 'idle' | 'adding' | 'updating'

const DETAIL_STATUS_PILL: Record<
  AreaTaskStatus,
  { Icon: typeof Circle; label: string; cls: string }
> = {
  PENDING: { Icon: Circle, label: STATUS_LABEL.PENDING, cls: 'bg-muted/80 text-muted-foreground border-border' },
  IN_PROGRESS: { Icon: CircleDot, label: STATUS_LABEL.IN_PROGRESS, cls: 'bg-warning/10 text-warning border-warning/20' },
  DONE: { Icon: CheckCircle2, label: STATUS_LABEL.DONE, cls: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60' },
  BLOCKED: { Icon: Octagon, label: STATUS_LABEL.BLOCKED, cls: 'bg-red-50 text-red-800 border-red-200/80 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60' },
}

/** Meta bajo el título del detalle: misma altura en todas las pastillas. */
const DETAIL_TITLE_META_PILL =
  'inline-flex items-center justify-center gap-1.5 h-7 px-2.5 rounded-md border text-[11px] font-medium leading-none shrink-0'

/**
 * Todas las pestañas: admin/jefe, supervisores (rol o área) y supervisor lead.
 * El resto solo Timeline y Board.
 */
function ganttHasFullTabAccess(u: User | null | undefined): boolean {
  if (!u) return false
  const r = (u.role || '').toUpperCase().trim()
  const roleNorm = r.replace(/[\s-]+/g, '_')
  if (r === 'ADMIN' || r === 'SUPERADMIN') return true
  if (r === 'SUPERVISOR' || roleNorm === 'SUPERVISOR_LEAD') return true
  if (u.esJefe === true) return true
  if (u.esSupervisor === true) return true
  return false
}

/** Eliminar sprints en API: solo ADMIN / SUPERADMIN. */
function ganttIsPlatformAdmin(u: User | null | undefined): boolean {
  if (!u) return false
  const r = (u.role || '').toUpperCase().trim()
  return r === 'ADMIN' || r === 'SUPERADMIN'
}

export function YegoGanttModule() {
  const user = useAuthStore((s) => s.user)
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [areas, setAreas] = useState<AreaFull[]>([])
  const [workspaces, setWorkspaces] = useState<WorkspaceDto[]>([])
  const [sprintById, setSprintById] = useState<Map<number, SprintDto>>(() => new Map())
  /** `my_space` hasta cargar workspaces; con 1+ proyectos el efecto puede fijar un id concreto. */
  const [workspaceFilter, setWorkspaceFilter] = useState<string>('my_space')
  const [areaCollaborators, setAreaCollaborators] = useState<Map<number, ColaboradorDto[]>>(new Map())
  const [areaFilter, setAreaFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [ownerFilter, setOwnerFilter] = useState<string>('all')
  /** Filtro local del timeline (equipos / texto en cabecera del Gantt). */
  const [ganttTeamFilter, setGanttTeamFilter] = useState('')
  const [activeTab, setActiveTab] = useState<'gantt' | 'cartera' | 'board' | 'sprints' | 'dashboard'>(() =>
    ganttHasFullTabAccess(useAuthStore.getState().user) ? 'sprints' : 'gantt',
  )
  const [timelineVisibility, setTimelineVisibility] = useState<TimelineVisibilityFilter>('default')
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [showCriticalPath, setShowCriticalPath] = useState(false)
  const [timelinePanDays, setTimelinePanDays] = useState(0)
  const [pulseNotifications, setPulseNotifications] = useState<IntegralNotification[]>([])
  const notifSeqRef = useRef(0)
  const hasLoadedOnceRef = useRef(false)
  /** Secuencia compartida: invalida resultados viejos de `load()` y de `reloadTasksAndKpis` (evita que un `load` lento pise la lista tras crear/editar tarea). */
  const ganttFullLoadSeqRef = useRef(0)
  /** Invalidación entre varias llamadas concurrentes a `reloadTasksAndKpis`. */
  const tasksKpisSeqRef = useRef(0)
  /** Tras fetch exitoso; si difiere de areaKey, hay que cargar colaboradores otra vez. */
  const collabsFetchedForKeyRef = useRef<string>('')
  /** Una sola `load()` a la vez (Strict Mode monta el efecto dos veces en dev). */
  const loadInFlightRef = useRef<Promise<void> | null>(null)
  /** Último `workspaceFilter` con el que terminó un `load()` completo (para detectar cambio de espacio). */
  const prevWorkspaceFilterForLoadRef = useRef<string | null>(null)
  const [dismissedTaskIds, setDismissedTaskIds] = useState<number[]>([])

  const setIntegralItems = useIntegralNotificationsStore((s) => s.setItems)
  const registerIntegralHandlers = useIntegralNotificationsStore((s) => s.registerHandlers)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  /** Recarga por cambio de espacio de trabajo: mensaje claro arriba y sin pastilla en esquina. */
  const [workspaceSwitching, setWorkspaceSwitching] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TaskRow | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<TaskRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteAreaDialogOpen, setDeleteAreaDialogOpen] = useState(false)
  const [areaToDelete, setAreaToDelete] = useState<{ id: number; name: string } | null>(null)
  const [deletingArea, setDeletingArea] = useState(false)
  const [form, setForm] = useState({
    areaId: '',
    workspaceId: '' as string,
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'PENDING' as AreaTaskStatus,
    priority: 'MEDIUM' as TaskPriority,
    progressPercent: '0',
    assignedUserIds: [] as number[],
    tagsInput: '',
    sprintId: '',
    isPrivateTask: false,
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [taskFormSaving, setTaskFormSaving] = useState(false)
  const [subtasks, setSubtasks] = useState<TaskSubtaskDto[]>([])
  const [subtasksLoading, setSubtasksLoading] = useState(false)
  const [subtaskDraft, setSubtaskDraft] = useState({ title: '' })
  const [subtaskModalBusy, setSubtaskModalBusy] = useState<SubtaskModalBusy>('idle')
  /** Subtareas locales al crear tarea (se persisten tras POST). */
  const [pendingSubtasks, setPendingSubtasks] = useState<Array<{ tempId: string; title: string; done: boolean }>>([])
  const [taskDetailOpen, setTaskDetailOpen] = useState(false)
  const [detailTaskId, setDetailTaskId] = useState<number | null>(null)

  const manage = useMemo(() => ganttHasFullTabAccess(user), [user])

  const loadCollaborators = useCallback(async (areaList: AreaFull[], requestId: number) => {
    const map = await fetchAreaCollaboratorsMap(areaList)
    if (requestId !== ganttFullLoadSeqRef.current) return
    setAreaCollaborators(map)
  }, [])

  const reloadTasksAndKpis = useCallback(async () => {
    const requestId = ++tasksKpisSeqRef.current
    const fullSeq = ++ganttFullLoadSeqRef.current
    const { tasks: nextTasks, kpis: nextKpis } = await fetchGanttTaskSummary(
      areaFilter,
      priorityFilter,
      workspaceFilter,
      ownerFilter,
    )
    if (requestId !== tasksKpisSeqRef.current) return
    if (fullSeq !== ganttFullLoadSeqRef.current) return
    setTasks(nextTasks)
    setKpis(nextKpis)
  }, [areaFilter, priorityFilter, workspaceFilter, ownerFilter])

  /** Sincroniza sprints desde la pestaña Sprints sin `load()` completo. */
  const applySprintsPayloadFromTab = useCallback((byWs: Record<number, SprintDto[]>) => {
    const sprintMap = new Map<number, SprintDto>()
    for (const list of Object.values(byWs)) {
      for (const sp of list) {
        sprintMap.set(sp.id, sp)
      }
    }
    setSprintById(sprintMap)
  }, [])

  /** Tras mutar subtareas: aplaza `GET /summary` para no disparar 2s+ de red en cada clic (ej. checkboxes). */
  const subtaskSummaryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scheduleReloadTasksAndKpisAfterSubtasks = useCallback(() => {
    if (subtaskSummaryDebounceRef.current) clearTimeout(subtaskSummaryDebounceRef.current)
    subtaskSummaryDebounceRef.current = setTimeout(() => {
      subtaskSummaryDebounceRef.current = null
      void reloadTasksAndKpis()
    }, 1000)
  }, [reloadTasksAndKpis])

  useEffect(
    () => () => {
      if (subtaskSummaryDebounceRef.current) {
        clearTimeout(subtaskSummaryDebounceRef.current)
        subtaskSummaryDebounceRef.current = null
      }
    },
    [],
  )

  /** Al cerrar el modal, una sola recarga si había cambios de subtarea pendientes de refrescar. */
  useEffect(() => {
    if (dialogOpen) return
    const pending = subtaskSummaryDebounceRef.current
    if (pending) {
      clearTimeout(pending)
      subtaskSummaryDebounceRef.current = null
      void reloadTasksAndKpis()
    }
  }, [dialogOpen, reloadTasksAndKpis])

  /** Primera vez que hay varios workspaces: elegir un id por defecto si el usuario aún no eligió. */
  const workspaceFilterInitRef = useRef(false)

  const load = useCallback(async (opts?: { refreshCollaborators?: boolean }) => {
    if (loadInFlightRef.current) {
      await loadInFlightRef.current
      return
    }
    const requestId = ++ganttFullLoadSeqRef.current
    const run = (async () => {
      const isFirstLoad = !hasLoadedOnceRef.current
      const prevPf = prevWorkspaceFilterForLoadRef.current
      const isWorkspaceChangeRefresh =
        !isFirstLoad && prevPf !== null && prevPf !== workspaceFilter
      if (isWorkspaceChangeRefresh) {
        setWorkspaceSwitching(true)
      }
      if (isFirstLoad) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      setErr(null)
      try {
        const [{ tasks: nextTasks, kpis: nextKpis }, { areas: ar, workspaces: ws }] = await Promise.all([
          fetchGanttTaskSummary(areaFilter, priorityFilter, workspaceFilter, ownerFilter),
          fetchGanttMasterData(),
        ])
        if (requestId !== ganttFullLoadSeqRef.current) return
        setTasks(nextTasks)
        setKpis(nextKpis)
        setAreas(ar)
        setWorkspaces(ws)

        const sprintMap = new Map<number, SprintDto>()
        try {
          const byWs = await fetchSprintsByWorkspaces(ws)
          for (const list of Object.values(byWs)) {
            for (const sp of list) {
              sprintMap.set(sp.id, sp)
            }
          }
        } catch {
          /* resumen de tareas sigue válido sin sprints */
        }
        if (requestId !== ganttFullLoadSeqRef.current) return
        setSprintById(sprintMap)

        const areaKey = areasStableKey(ar)
        const forceCollabs = opts?.refreshCollaborators === true
        if (ar.length === 0) {
          collabsFetchedForKeyRef.current = ''
          setAreaCollaborators(new Map())
        } else if (forceCollabs || areaKey !== collabsFetchedForKeyRef.current) {
          await loadCollaborators(ar, requestId)
          if (requestId !== ganttFullLoadSeqRef.current) return
          collabsFetchedForKeyRef.current = areaKey
        }

        hasLoadedOnceRef.current = true
      } catch (e: unknown) {
        if (requestId !== ganttFullLoadSeqRef.current) return
        setErr(parseGanttLoadError(e))
      } finally {
        if (requestId === ganttFullLoadSeqRef.current) {
          setLoading(false)
          setRefreshing(false)
          setWorkspaceSwitching(false)
          prevWorkspaceFilterForLoadRef.current = workspaceFilter
        }
        loadInFlightRef.current = null
      }
    })()
    loadInFlightRef.current = run
    await run
  }, [areaFilter, priorityFilter, workspaceFilter, ownerFilter, loadCollaborators])

  const workspacePickerBusy = loading || workspaceSwitching

  const handleWorkspaceFilterChange = useCallback(
    (next: string) => {
      if (next === workspaceFilter) return
      if (workspacePickerBusy) return
      if (hasLoadedOnceRef.current) {
        setWorkspaceSwitching(true)
      }
      setWorkspaceFilter(next)
    },
    [workspaceFilter, workspacePickerBusy],
  )

  useEffect(() => {
    if (workspaces.length === 0) {
      workspaceFilterInitRef.current = false
      setWorkspaceFilter('my_space')
      return
    }
    if (workspaces.length === 1) {
      workspaceFilterInitRef.current = true
      setWorkspaceFilter(String(workspaces[0].id))
      return
    }
    if (!workspaceFilterInitRef.current) {
      workspaceFilterInitRef.current = true
      const sorted = [...workspaces].sort((a, b) => a.id - b.id)
      setWorkspaceFilter(String(sorted[0].id))
      return
    }
    setWorkspaceFilter((prev) => {
      const ids = new Set(workspaces.map((p) => String(p.id)))
      if (prev === 'my_space') return 'my_space'
      if (ids.has(prev)) return prev
      const sorted = [...workspaces].sort((a, b) => a.id - b.id)
      return String(sorted[0].id)
    })
  }, [workspaces])

  useEffect(() => {
    load()
  }, [load])

  useLayoutEffect(() => {
    if (workspaceFilter !== 'my_space') return
    setGanttTeamFilter('')
    setTimelineVisibility((v) => (v === 'default' ? 'all' : v))
  }, [workspaceFilter])

  const tasksForTimeline = useMemo(
    () => filterTasksForTimeline(tasks, timelineVisibility, user?.id ?? null),
    [tasks, timelineVisibility, user?.id],
  )

  const tasksWithoutPrivate = useMemo(
    () => tasks.filter((t) => !taskRowIsPrivate(t)),
    [tasks],
  )

  const tasksWithoutPrivateInWorkspaceScope = useMemo(
    () => tasks.filter((t) => !taskRowIsPrivate(t)),
    [tasks],
  )

  const timelineFilterCounts = useMemo(() => {
    const base = tasks
    const equipo = base.filter((t) => !taskRowIsPrivate(t)).length
    const all = base.length
    const mine = user?.id != null ? base.filter((t) => taskIsMine(t, user.id)).length : 0
    const priv = user?.id != null ? base.filter((t) => taskIsMyPrivate(t, user.id)).length : 0
    return { equipo, all, mine, priv }
  }, [tasks, user?.id])

  const sprintsForWorkspace = useMemo(() => {
    const wid = form.workspaceId ? Number(form.workspaceId) : NaN
    if (!Number.isFinite(wid)) return []
    return [...sprintById.values()]
      .filter((s) => s.workspaceId === wid)
      .sort((a, b) => a.id - b.id)
  }, [form.workspaceId, sprintById])

  const formSubtaskCount = editing ? subtasks.length : pendingSubtasks.length
  const formSubtaskDone = editing
    ? subtasks.filter((s) => s.done).length
    : pendingSubtasks.filter((s) => s.done).length
  const progressFromFormSubtasks =
    formSubtaskCount > 0 ? Math.floor((100 * formSubtaskDone) / formSubtaskCount) : null
  const displayProgressValue =
    progressFromFormSubtasks != null
      ? progressFromFormSubtasks
      : Math.min(100, Math.max(0, Number(form.progressPercent) || 0))

  const collaboratorsForArea = useCallback(
    (areaId: number): ColaboradorDto[] => areaCollaborators.get(areaId) || [],
    [areaCollaborators],
  )

  const allCollaborators = useMemo(() => {
    const seen = new Set<number>()
    const result: ColaboradorDto[] = []
    for (const list of areaCollaborators.values()) {
      for (const c of list) {
        if (!seen.has(c.id)) { seen.add(c.id); result.push(c) }
      }
    }
    return result
  }, [areaCollaborators])

  const workspaceNameById = useMemo(
    () => new Map(workspaces.map((w) => [w.id, w.name])),
    [workspaces],
  )

  const isMySpaceView = workspaceFilter === 'my_space'

  const workspacesInScope = useMemo(() => {
    if (workspaceFilter === 'my_space') return workspaces
    return workspaces.filter((p) => String(p.id) === workspaceFilter)
  }, [workspaces, workspaceFilter])

  const WorkspacePickerIcon = useMemo(() => {
    if (workspaceFilter === 'my_space') return Inbox
    const p = workspaces.find((x) => String(x.id) === workspaceFilter)
    return projectIconByKey(p?.iconKey)
  }, [workspaceFilter, workspaces])

  const workspacePickerLabel = useMemo(() => {
    if (workspaceFilter === 'my_space') return 'Mi espacio'
    if (workspaces.length === 0) return '—'
    return workspaces.find((p) => String(p.id) === workspaceFilter)?.name ?? 'Espacio de trabajo'
  }, [workspaceFilter, workspaces])

  const taskAlertNotifications = useMemo(
    () => buildTaskAlertNotifications(tasks, dismissedTaskIds),
    [tasks, dismissedTaskIds],
  )

  const allNotifications = useMemo(
    () => [...taskAlertNotifications, ...pulseNotifications].slice(0, 40),
    [taskAlertNotifications, pulseNotifications],
  )

  useEffect(() => {
    setDismissedTaskIds((d) => d.filter((id) => tasks.some((t) => t.id === id)))
  }, [tasks])

  const collaboratorNames = useMemo(() => {
    const m = new Map<number, string>()
    areaCollaborators.forEach((list) => {
      list.forEach((c) => m.set(c.id, c.nombreCompleto))
    })
    return m
  }, [areaCollaborators])

  useEffect(() => {
    if (!dialogOpen || !editing) {
      setSubtasks([])
      setSubtaskDraft({ title: '' })
      setSubtasksLoading(false)
      return
    }
    setSubtasksLoading(true)
    let cancelled = false
    void fetchTaskSubtasks(editing.id)
      .then((rows) => {
        if (!cancelled) setSubtasks(rows)
      })
      .catch(() => {
        if (!cancelled) setSubtasks([])
      })
      .finally(() => {
        if (!cancelled) setSubtasksLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [dialogOpen, editing])

  useEffect(() => {
    if (!editing || subtasks.length === 0) return
    const t = tasks.find((x) => x.id === editing.id)
    if (t != null) {
      setForm((f) => ({ ...f, progressPercent: String(t.progressPercent ?? 0) }))
    }
  }, [tasks, editing, subtasks.length])

  const openCreate = (
    presetAreaId?: number,
    presetWorkspaceId?: number,
    presetStatus?: AreaTaskStatus,
    presetSprintId?: number,
  ) => {
    setTaskFormSaving(false)
    setEditing(null)
    setForm({
      areaId: presetAreaId?.toString() || areas[0]?.id?.toString() || '',
      workspaceId:
        presetWorkspaceId != null
          ? String(presetWorkspaceId)
          : workspaceFilter !== 'my_space' && workspaces.some((w) => String(w.id) === workspaceFilter)
            ? workspaceFilter
            : '',
      sprintId: presetSprintId != null ? String(presetSprintId) : '',
      title: '',
      description: '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      status: presetStatus ?? 'PENDING',
      priority: 'MEDIUM',
      progressPercent: '0',
      assignedUserIds: [],
      tagsInput: '',
      isPrivateTask: workspaceFilter === 'my_space',
    })
    setFormErrors({})
    setPendingSubtasks([])
    setDialogOpen(true)
  }

  const openEdit = (t: TaskRow) => {
    setTaskFormSaving(false)
    setEditing(t)
    setPendingSubtasks([])
    const privateTask = Boolean(t.privateTask) || tagsIndicatePrivate(t.tags)
    const effectivePrivate = isMySpaceView || privateTask
    const rawIds = t.assignedUserIds?.length
      ? [...t.assignedUserIds]
      : t.assignedUserId != null
        ? [t.assignedUserId]
        : []
    const assignedIds = effectivePrivate ? (rawIds[0] != null ? [rawIds[0]] : []) : rawIds
    setForm({
      areaId: String(t.areaId),
      workspaceId: t.workspaceId != null ? String(t.workspaceId) : '',
      sprintId: effectivePrivate ? '' : t.sprintId != null ? String(t.sprintId) : '',
      title: t.title,
      description: t.description || '',
      startDate: t.startDate,
      endDate: t.endDate,
      status: t.status,
      priority: normPriority(t.priority),
      progressPercent: String(t.progressPercent ?? 0),
      assignedUserIds: assignedIds,
      tagsInput: tagsWithoutPrivateLabels(t.tags ?? []).join(', '),
      isPrivateTask: effectivePrivate,
    })
    setFormErrors({})
    setDialogOpen(true)
  }

  const validateForm = (): Record<string, string> => {
    const errors: Record<string, string> = {}
    if (!form.title.trim()) errors.title = 'El nombre es obligatorio'
    if (!form.areaId) errors.areaId = 'Selecciona un equipo'

    if (progressFromFormSubtasks == null) {
      const prog = Number(form.progressPercent)
      if (isNaN(prog) || prog < 0) errors.progressPercent = 'No puede ser negativo'
      if (prog > 100) errors.progressPercent = 'Máximo 100%'
    }

    const today = todayYmdLocal()
    if (!form.startDate) errors.startDate = 'Fecha inicio requerida'
    if (!form.endDate) errors.endDate = 'Fecha fin requerida'
    if (!editing && form.startDate && form.startDate < today) {
      errors.startDate = 'La fecha de inicio no puede ser anterior a hoy'
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      errors.endDate = 'La fecha de fin no puede ser anterior a la de inicio'
    }

    return errors
  }

  const saveTask = async () => {
    if (taskFormSaving) return
    const errors = validateForm()
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    const prog =
      progressFromFormSubtasks != null
        ? progressFromFormSubtasks
        : Math.min(100, Math.max(0, Number(form.progressPercent) || 0))
    const isMySpace = workspaceFilter === 'my_space'
    const effectivePrivate = isMySpace || form.isPrivateTask
    let parsedTags = form.tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    if (effectivePrivate) {
      const hasPriv = parsedTags.some((tag) => {
        const x = tag.toLowerCase()
        return x === 'privada' || x === 'privado' || x === 'private'
      })
      if (!hasPriv) parsedTags = [...parsedTags, 'privada']
    } else {
      parsedTags = parsedTags.filter((tag) => {
        const x = tag.toLowerCase()
        return x !== 'privada' && x !== 'privado' && x !== 'private'
      })
    }
    const formSnapshot = {
      areaId: form.areaId,
      workspaceId: form.workspaceId,
      sprintId: form.sprintId,
      title: form.title,
      description: form.description,
      startDate: form.startDate,
      endDate: form.endDate,
      status: form.status,
      priority: form.priority,
      isPrivateTask: effectivePrivate,
      assignedUserIds: form.assignedUserIds,
    }
    const payload = buildGanttTaskSavePayload(formSnapshot, prog, parsedTags)
    setTaskFormSaving(true)
    try {
      if (editing) {
        await api.put(`/yego-gantt/tasks/${editing.id}`, payload)
      } else {
        const res = await api.post<TaskRow>('/yego-gantt/tasks', payload)
        const newTaskId = res.data?.id
        if (newTaskId != null && pendingSubtasks.length > 0) {
          for (const row of pendingSubtasks) {
            const st = row.title.trim()
            if (!st) continue
            await createTaskSubtask(newTaskId, { title: st, weight: 1, done: row.done })
          }
        }
      }
      setFormErrors({})
      setPendingSubtasks([])
      setDialogOpen(false)
      await reloadTasksAndKpis()
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e
        ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'No se pudo guardar la tarea')
        : 'No se pudo guardar la tarea'
      setErr(msg)
    } finally {
      setTaskFormSaving(false)
    }
  }

  const removeTask = (t: TaskRow) => {
    setTaskToDelete(t)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return
    setDeleting(true)
    try {
      await api.delete(`/yego-gantt/tasks/${taskToDelete.id}`)
      setDeleteDialogOpen(false)
      if (detailTaskId === taskToDelete.id) {
        setTaskDetailOpen(false)
        setDetailTaskId(null)
      }
      setTaskToDelete(null)
      await reloadTasksAndKpis()
    } catch {
      setErr('No se pudo eliminar')
    } finally {
      setDeleting(false)
    }
  }

  const openTaskDetail = useCallback((t: TaskRow) => {
    setDetailTaskId(t.id)
    setTaskDetailOpen(true)
  }, [])

  const detailLiveTask = useMemo(
    () => (detailTaskId != null ? tasks.find((x) => x.id === detailTaskId) ?? null : null),
    [tasks, detailTaskId],
  )

  useEffect(() => {
    if (taskDetailOpen && detailTaskId != null && !tasks.some((t) => t.id === detailTaskId)) {
      setTaskDetailOpen(false)
      setDetailTaskId(null)
    }
  }, [tasks, taskDetailOpen, detailTaskId])

  const deleteArea = (areaId: number) => {
    const areaInfo = areas.find((a) => a.id === areaId)
    setAreaToDelete({ id: areaId, name: areaInfo?.name || `Área ${areaId}` })
    setDeleteAreaDialogOpen(true)
  }

  const confirmDeleteArea = async () => {
    if (areaToDelete == null) return
    setDeletingArea(true)
    try {
      await api.delete(`/areas/delete/${areaToDelete.id}`)
      setDeleteAreaDialogOpen(false)
      setAreaToDelete(null)
      await load()
    } catch {
      setErr('No se pudo eliminar el área')
    } finally {
      setDeletingArea(false)
    }
  }

  const changeTaskStatus = useCallback(async (taskId: number, newStatus: AreaTaskStatus) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t))
    try {
      await api.put(`/yego-gantt/tasks/${taskId}`, { status: newStatus })
      await reloadTasksAndKpis()
    } catch {
      setErr('No se pudo actualizar el estado')
      await reloadTasksAndKpis()
    }
  }, [reloadTasksAndKpis])

  const onTaskSelectNotify = useCallback((taskTitle: string) => {
    notifSeqRef.current += 1
    setPulseNotifications((prev) =>
      [
        {
          id: `n${notifSeqRef.current}`,
          type: 'info' as const,
          title: 'Tarea seleccionada',
          message: taskTitle,
          timestamp: new Date(),
          read: false,
        },
        ...prev,
      ].slice(0, 30),
    )
  }, [])

  const onNotificationRead = useCallback((id: string) => {
    if (id.startsWith('gantt-blocked-')) {
      const raw = id.replace(/^gantt-blocked-/, '')
      const tid = Number(raw)
      if (!Number.isNaN(tid)) {
        setDismissedTaskIds((prev) => (prev.includes(tid) ? prev : [...prev, tid]))
      }
    } else {
      setPulseNotifications((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)))
    }
  }, [])

  const clearIntegralFeedPulse = useCallback(() => {
    setPulseNotifications([])
    setDismissedTaskIds([])
  }, [])

  useEffect(() => {
    setIntegralItems(allNotifications)
    registerIntegralHandlers({
      markRead: onNotificationRead,
      clearAll: clearIntegralFeedPulse,
    })
    return () => {
      setIntegralItems([])
      registerIntegralHandlers(null)
    }
  }, [allNotifications, onNotificationRead, clearIntegralFeedPulse, setIntegralItems, registerIntegralHandlers])

  const currentAreaCollabs = useMemo(() => {
    const areaId = Number(form.areaId)
    if (!areaId) return []
    return areaCollaborators.get(areaId) || []
  }, [form.areaId, areaCollaborators])

  const setOwnerPrincipal = useCallback((userIdRaw: string) => {
    if (userIdRaw === 'none') {
      setForm((f) => ({ ...f, assignedUserIds: f.assignedUserIds.filter((_, i) => i > 0) }))
      return
    }
    const oid = Number(userIdRaw)
    setForm((f) => {
      const rest = f.assignedUserIds.filter((id, i) => i > 0 && id !== oid)
      return { ...f, assignedUserIds: [oid, ...rest] }
    })
  }, [])

  const toggleCollaborator = useCallback((userId: number) => {
    setForm((f) => {
      const owner = f.assignedUserIds[0]
      if (owner === userId) return f
      const rest = f.assignedUserIds.slice(1)
      const has = rest.includes(userId)
      const nextRest = has ? rest.filter((id) => id !== userId) : [...rest, userId]
      if (owner != null) return { ...f, assignedUserIds: [owner, ...nextRest] }
      return { ...f, assignedUserIds: nextRest }
    })
  }, [])

  const onTaskFormWorkspaceSelect = useCallback((v: string) => {
    const nextWs = v === 'none' ? '' : v
    setForm((f) => {
      let nextSprint = f.sprintId
      if (nextWs && nextSprint) {
        const sp = sprintById.get(Number(nextSprint))
        if (!sp || sp.workspaceId !== Number(nextWs)) nextSprint = ''
      } else if (!nextWs) nextSprint = ''
      return { ...f, workspaceId: nextWs, sprintId: nextSprint }
    })
  }, [sprintById])

  const commitSubtaskDraft = useCallback(async () => {
    const t = subtaskDraft.title.trim()
    if (!t || taskFormSaving || subtaskModalBusy !== 'idle') return
    if (editing) {
      setSubtaskModalBusy('adding')
      try {
        const createdRaw = await createTaskSubtask(editing.id, { title: t, weight: 1 })
        const row = normalizeSubtaskDto(createdRaw)
        setSubtaskDraft({ title: '' })
        setSubtasks((prev) =>
          [...prev, row].sort((a, b) =>
            a.sortOrder !== b.sortOrder ? a.sortOrder - b.sortOrder : a.id - b.id,
          ),
        )
        scheduleReloadTasksAndKpisAfterSubtasks()
      } catch {
        setErr('No se pudo crear la subtarea')
      } finally {
        setSubtaskModalBusy('idle')
      }
      return
    }
    const tempId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    setPendingSubtasks((s) => [...s, { tempId, title: t, done: false }])
    setSubtaskDraft({ title: '' })
  }, [subtaskDraft.title, taskFormSaving, subtaskModalBusy, editing, scheduleReloadTasksAndKpisAfterSubtasks])

  const collaboratorsSorted = useMemo(
    () => [...allCollaborators].sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, 'es')),
    [allCollaborators],
  )

  const TAB_CONFIG = useMemo(
    () =>
      [
        { id: 'gantt' as const, label: 'Timeline', Icon: GanttChartSquare },
        { id: 'cartera' as const, label: 'Portfolio', Icon: Boxes },
        { id: 'board' as const, label: 'Board', Icon: KanbanSquare },
        { id: 'sprints' as const, label: 'Sprints', Icon: Flame },
        { id: 'dashboard' as const, label: 'Dashboard', Icon: LayoutDashboard },
      ],
    [],
  )

  const visibleTabs = useMemo(() => {
    const base = manage ? TAB_CONFIG : TAB_CONFIG.filter((t) => t.id === 'gantt' || t.id === 'board')
    if (!isMySpaceView) return base
    return base.filter((t) => t.id === 'gantt' || t.id === 'board')
  }, [manage, TAB_CONFIG, isMySpaceView])

  useEffect(() => {
    if (!isMySpaceView) return
    if (activeTab === 'cartera' || activeTab === 'sprints' || activeTab === 'dashboard') {
      setActiveTab('gantt')
    }
  }, [isMySpaceView, activeTab])

  useEffect(() => {
    if (manage) return
    if (activeTab === 'gantt' || activeTab === 'board') return
    setActiveTab('gantt')
  }, [manage, activeTab])

  const taskFormWorkspaceTagsSection = useMemo(() => {
    const sideBySide = form.isPrivateTask && workspaces.length > 0
    const workspaceCol =
      workspaces.length > 0 ? (
        <div className={cn('space-y-1.5', sideBySide && 'min-w-0')}>
          <Label className="text-sm font-medium">Espacio de trabajo</Label>
          <Select
            value={form.workspaceId || 'none'}
            disabled={taskFormSaving}
            onValueChange={onTaskFormWorkspaceSelect}
          >
            <SelectTrigger className={cn('h-10 rounded-lg', TASK_MODAL_FOCUS)}>
              <SelectValue placeholder="Sin espacio de trabajo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin espacio de trabajo</SelectItem>
              {workspaces.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className={cn('space-y-1.5', sideBySide && 'min-w-0')}>
          <Label className="text-sm font-medium">Espacio de trabajo</Label>
          <div className="rounded-lg border border-dashed border-border/80 bg-muted/25 px-3 py-2 text-xs text-muted-foreground leading-snug">
            No hay espacios de trabajo en el sistema. La tarea quedará solo en el <strong className="text-foreground font-medium">equipo</strong> (sin proyecto). Podrás asignarla a un espacio cuando exista uno.
          </div>
        </div>
      )

    const tagsCol = (
      <div className={cn('space-y-1.5', sideBySide && 'min-w-0')}>
        <Label className="text-sm font-medium">Etiquetas</Label>
        <Input
          variant="plain"
          placeholder="ci-devops, seguridad, backend…"
          value={form.tagsInput}
          disabled={taskFormSaving}
          onChange={(e) => setForm((f) => ({ ...f, tagsInput: e.target.value }))}
          className={cn('h-10 rounded-lg border border-neutral-300 dark:border-neutral-600', TASK_MODAL_FOCUS)}
        />
      </div>
    )

    if (sideBySide) {
      return (
        <div className="grid grid-cols-2 gap-3">
          {workspaceCol}
          {tagsCol}
        </div>
      )
    }
    return (
      <>
        {workspaceCol}
        {tagsCol}
      </>
    )
  }, [
    form.isPrivateTask,
    form.workspaceId,
    form.tagsInput,
    taskFormSaving,
    workspaces,
    onTaskFormWorkspaceSelect,
  ])

  return (
    <div className="workos-gantt-shell workos-gantt-shell-bg min-h-[calc(100vh-4rem)] flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background shadow-sm dark:shadow-dark-sm">
        <div className="mx-auto max-w-[1680px] px-4 lg:px-6 py-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 shrink-0 rounded-xl workos-gantt-gradient-icon flex items-center justify-center text-white">
              <GanttChartSquare className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="font-display font-bold text-foreground leading-tight truncate">WorkOS</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider -mt-0.5 truncate">
                Project OS
              </div>
            </div>
          </div>
          <Select
            value={workspaceFilter}
            onValueChange={handleWorkspaceFilterChange}
            disabled={workspacePickerBusy}
          >
              <SelectTrigger
                title={
                  workspacePickerBusy ? 'Cargando… espera a poder cambiar de espacio' : undefined
                }
                className={cn(
                  'workos-project-picker-trigger',
                  // Quita el chevron por defecto del ui/select (usamos uno dentro del card)
                  '[&>svg]:hidden',
                  'h-auto min-h-0 py-1 pl-1.5 pr-2 gap-0 rounded-xl border border-neutral-200/90 dark:border-neutral-600/80',
                  'bg-white dark:bg-neutral-900/95 shadow-sm w-[min(12.5rem,calc(100vw-10rem))] max-w-[200px]',
                  'focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500/40',
                  'hover:border-neutral-300 dark:hover:border-neutral-500',
                )}
              >
                <span className="sr-only">
                  <SelectValue />
                </span>
                <div className="flex items-center gap-2 w-full min-w-0">
                  <div
                    className="h-8 w-8 shrink-0 rounded-lg bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white shadow-sm"
                    aria-hidden
                  >
                    <WorkspacePickerIcon className="h-4 w-4 stroke-[2]" />
                  </div>
                  <div className="flex-1 min-w-0 text-left leading-none">
                    <div className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Espacio de trabajo
                    </div>
                    <div className="text-[13px] font-semibold text-foreground truncate tracking-tight">
                      {workspacePickerLabel}
                    </div>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
                </div>
              </SelectTrigger>
              <SelectContent align="start" className="rounded-xl">
                <SelectItem value="my_space">
                  <span className="flex items-center gap-2">
                    <Inbox className="h-3.5 w-3.5 shrink-0 opacity-80" />
                    Mi espacio
                  </span>
                </SelectItem>
                {workspaces.map((p) => {
                  const ItemIcon = projectIconByKey(p.iconKey)
                  return (
                    <SelectItem key={p.id} value={String(p.id)}>
                      <span className="flex items-center gap-2">
                        <ItemIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                        {p.name}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          {activeTab === 'gantt' && !isMySpaceView && (
            <div className="flex-1 min-w-[200px] max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={ganttTeamFilter}
                onChange={(e) => setGanttTeamFilter(e.target.value)}
                placeholder="Filtrar equipos en timeline…"
                className="pl-9 h-9 text-sm rounded-lg bg-background border-border/80"
              />
            </div>
          )}
          {manage && (
            <Button
              type="button"
              onClick={() => openCreate()}
              className="gap-1.5 h-9 rounded-lg border-0 workos-gantt-btn-primary shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Nueva tarea
            </Button>
          )}
        </div>
        <div className="mx-auto max-w-[1680px] px-4 lg:px-6 pb-2 pt-1">
          <div className="flex flex-wrap items-center gap-1">
            {visibleTabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  activeTab === id
                    ? 'workos-gantt-tab-active'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1680px] px-4 lg:px-6 py-5 flex-1 flex flex-col min-h-0 bg-[#f9fafb] dark:bg-transparent">
        {err && (
          <div className="mb-3 rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2 border border-destructive/20">
            {err}
          </div>
        )}

        {refreshing && !workspaceSwitching && (
          <div
            className="h-0.5 w-full shrink-0 bg-primary/40 animate-pulse rounded-full mb-2"
            title="Actualizando datos…"
            aria-busy="true"
          />
        )}

        <div className="animate-fade-in flex-1 flex flex-col min-h-0 relative">
          {workspaceSwitching && (
            <div
              className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 rounded-lg bg-background/75 dark:bg-background/85 backdrop-blur-[3px] px-4"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <Loader2 className="h-9 w-9 shrink-0 animate-spin text-primary" aria-hidden />
              <span className="text-sm font-medium text-foreground text-center max-w-xs">
                Cargando espacio de trabajo…
              </span>
            </div>
          )}
          {activeTab === 'gantt' && (
            <div className="flex flex-col flex-1 min-h-0">
              <PulseStatsBar
                kpis={kpis}
                trailing={
                  <>
                    <button
                      type="button"
                      onClick={() => setShowHeatmap((v) => !v)}
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs rounded-lg border h-8 transition-all ${
                        showHeatmap
                          ? 'border-amber-400/80 bg-amber-500/15 text-amber-900 dark:text-amber-100 shadow-sm'
                          : 'border-[#e5e7eb] bg-white text-muted-foreground hover:text-foreground hover:bg-[#f9fafb] dark:border-border/80 dark:bg-card'
                      }`}
                    >
                      <Flame className="w-3.5 h-3.5 shrink-0" />
                      Heatmap
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCriticalPath((v) => !v)}
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs rounded-lg border h-8 transition-all ${
                        showCriticalPath
                          ? 'border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-400 shadow-sm'
                          : 'border-[#e5e7eb] bg-white text-muted-foreground hover:text-foreground hover:bg-[#f9fafb] dark:border-border/80 dark:bg-card'
                      }`}
                    >
                      <Route className="w-3.5 h-3.5 shrink-0" />
                      Ruta crítica
                    </button>
                  </>
                }
              />
              <TimelineVisibilityScope
                value={timelineVisibility}
                onChange={setTimelineVisibility}
                counts={timelineFilterCounts}
                currentUserId={user?.id}
                hideEquiposScope={isMySpaceView}
              />
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-muted-foreground shrink-0 leading-none">Área</span>
                  <Select value={areaFilter} onValueChange={setAreaFilter}>
                    <SelectTrigger className="h-7 w-[148px] sm:w-[158px] text-[11px] rounded-md border-border/70 bg-background px-2 shadow-none">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las visibles</SelectItem>
                      {areas.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-muted-foreground shrink-0 leading-none">Prioridad</span>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="h-7 w-[122px] sm:w-[132px] text-[11px] rounded-md border-border/70 bg-background px-2 shadow-none">
                      <SelectValue placeholder="Toda prioridad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toda prioridad</SelectItem>
                      {(Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((k) => (
                        <SelectItem key={k} value={k}>
                          {PRIORITY_LABEL[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-muted-foreground shrink-0 leading-none">Responsable</span>
                  <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                    <SelectTrigger className="h-7 w-[148px] sm:w-[168px] text-[11px] rounded-md border-border/70 bg-background px-2 shadow-none">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {collaboratorsSorted.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nombreCompleto}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="ml-auto flex items-center gap-1 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-md border-border/70 bg-background p-0 shadow-none"
                    onClick={() => setTimelinePanDays((d) => d - 7)}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-md border-border/70 bg-background px-2 text-[11px] shadow-none"
                    onClick={() => setTimelinePanDays(0)}
                  >
                    Hoy
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-md border-border/70 bg-background p-0 shadow-none"
                    onClick={() => setTimelinePanDays((d) => d + 7)}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                  <span className="ml-1 text-[11px] text-muted-foreground tabular-nums leading-none">
                    {tasksForTimeline.length} tareas en vista
                  </span>
                </div>
              </div>
              <div className="mt-2 flex-1 min-h-0 flex flex-col">
                <GanttTimelineTab
                  tasks={tasksForTimeline}
                  loading={loading}
                  refreshing={refreshing}
                  timelinePanDays={timelinePanDays}
                  filterText={isMySpaceView ? '' : ganttTeamFilter}
                  onFilterChange={setGanttTeamFilter}
                  manage={manage}
                  onEditTask={openEdit}
                  onDeleteTask={removeTask}
                  showHeatmap={showHeatmap}
                  showCriticalPath={showCriticalPath}
                  onTaskSelectNotify={onTaskSelectNotify}
                  collaboratorsForArea={collaboratorsForArea}
                  mySpaceShowProjectNames={isMySpaceView}
                  workspaceNameById={workspaceNameById}
                />
              </div>
            </div>
          )}

          {manage && activeTab === 'cartera' && (
            <PortfolioTab
              tasks={tasksWithoutPrivate}
              loading={loading}
              refreshing={refreshing}
              manage={manage}
              areas={areas}
              workspaces={workspacesInScope}
              collaboratorsForArea={collaboratorsForArea}
              onOpenTask={openTaskDetail}
              onEdit={openEdit}
              onDelete={removeTask}
              onCreateTask={openCreate}
              onDeleteArea={deleteArea}
              onReload={load}
            />
          )}

          {activeTab === 'board' && (
            <TodoBoardTab
              tasks={tasks}
              loading={loading}
              refreshing={refreshing}
              manage={manage}
              allCollaborators={allCollaborators}
              onOpenTask={openTaskDetail}
              onStatusChange={changeTaskStatus}
              onAddTask={(status) => openCreate(undefined, undefined, status)}
              currentUserId={user?.id ?? null}
              showWorkspaceOnCards={isMySpaceView}
              workspaceNameById={workspaceNameById}
            />
          )}

          {manage && activeTab === 'sprints' && (
            <SprintsTab
              tasks={tasksWithoutPrivateInWorkspaceScope}
              workspaces={workspacesInScope}
              manage={manage}
              canDeleteSprints={ganttIsPlatformAdmin(user)}
              loading={loading}
              refreshing={refreshing}
              onSprintsPayload={applySprintsPayloadFromTab}
              refreshTasksAndKpis={reloadTasksAndKpis}
              onTaskStatusChange={changeTaskStatus}
              onOpenCreateTask={
                manage ? (opts) => openCreate(undefined, opts?.workspaceId, undefined, opts?.sprintId) : undefined
              }
              onEditTask={openEdit}
              collaboratorNames={collaboratorNames}
            />
          )}

          {manage && activeTab === 'dashboard' && (
            <DashboardTab
              tasks={tasksWithoutPrivate}
              workspaces={workspacesInScope}
              loading={loading}
              refreshing={refreshing}
              onCreateTask={manage ? () => openCreate() : undefined}
            />
          )}
        </div>

        {/* Vista detalle tarea (read-only + subtareas) */}
        <Dialog
          open={taskDetailOpen}
          onOpenChange={(open) => {
            if (!open) {
              setTaskDetailOpen(false)
              setDetailTaskId(null)
            }
          }}
        >
          <DialogContent className="max-w-xl w-[calc(100vw-1.5rem)] max-h-[min(90vh,880px)] overflow-y-auto gap-0 sm:rounded-xl p-6">
            {detailLiveTask ? (
              <>
                <DialogHeader className="text-left space-y-0 pr-10">
                  <DialogTitle className="text-xl font-bold tracking-tight leading-snug">{detailLiveTask.title}</DialogTitle>
                  <div className="flex items-center gap-2 flex-wrap pt-1 text-foreground text-sm">
                    {(() => {
                      const st = DETAIL_STATUS_PILL[detailLiveTask.status]
                      const StIcon = st.Icon
                      return (
                        <span
                          className={cn(
                            DETAIL_TITLE_META_PILL,
                            'gap-1',
                            st.cls,
                          )}
                        >
                          <StIcon className="h-3.5 w-3.5 shrink-0" />
                          {st.label}
                        </span>
                      )
                    })()}
                    <span
                      className={cn(
                        DETAIL_TITLE_META_PILL,
                        PRIO_BADGE[normPriority(detailLiveTask.priority)],
                      )}
                    >
                      {PRIORITY_LABEL[normPriority(detailLiveTask.priority)]}
                    </span>
                    {detailLiveTask.tags?.[0] ? (
                      <span
                        className={cn(
                          DETAIL_TITLE_META_PILL,
                          tagColor(detailLiveTask.tags[0], 0),
                        )}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80 shrink-0" aria-hidden />
                        {detailLiveTask.tags[0]}
                      </span>
                    ) : detailLiveTask.areaName ? (
                      <span
                        className={cn(
                          DETAIL_TITLE_META_PILL,
                          'border-primary-200/80 bg-primary-50 text-primary-800 dark:bg-primary-950/40 dark:text-primary-200 dark:border-primary-800/50',
                        )}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-primary-500 shrink-0" aria-hidden />
                        {detailLiveTask.areaName}
                      </span>
                    ) : null}
                    {(() => {
                      const sp =
                        detailLiveTask.sprintId != null ? sprintById.get(detailLiveTask.sprintId) : undefined
                      if (!sp || taskRowIsPrivate(detailLiveTask)) return null
                      const goalPart = sp.goal?.trim() ? ` · ${sp.goal.trim()}` : ''
                      return (
                        <span
                          className={cn(
                            DETAIL_TITLE_META_PILL,
                            'max-w-[min(100%,18rem)] border-primary/25 bg-primary/5 text-primary dark:border-primary/30 dark:bg-primary/10 dark:text-primary-400',
                          )}
                        >
                          <Flame className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate min-w-0">
                            {sp.name}
                            {goalPart}
                          </span>
                        </span>
                      )
                    })()}
                    {!taskRowIsPrivate(detailLiveTask) && (
                      <span
                        className={cn(
                          DETAIL_TITLE_META_PILL,
                          'border-border bg-background text-muted-foreground gap-1',
                        )}
                      >
                        {taskPoints(detailLiveTask.priority)} pts
                      </span>
                    )}
                  </div>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                      Descripción
                    </div>
                    <p className="text-sm">
                      {detailLiveTask.description?.trim() ? (
                        <span className="text-foreground whitespace-pre-wrap">{detailLiveTask.description.trim()}</span>
                      ) : (
                        <span className="italic text-muted-foreground">Sin descripción</span>
                      )}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-2 gap-2">
                      <span className="text-muted-foreground inline-flex items-center gap-1 flex-wrap">
                        Progreso
                        {((detailLiveTask.subtaskTotal ?? 0) > 0) && (
                          <span className="italic font-normal">(auto desde subtareas)</span>
                        )}
                      </span>
                      <span className="font-semibold tabular-nums text-foreground shrink-0">
                        {Math.min(100, Math.max(0, Math.round(detailLiveTask.progressPercent ?? 0)))}%
                      </span>
                    </div>
                    <div className="w-full rounded-full border border-border/60 bg-muted/50 dark:bg-muted/40 p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)]">
                      <ProgressBar
                        value={detailLiveTask.progressPercent ?? 0}
                        size="md"
                        variant="primary"
                        className="!bg-transparent dark:!bg-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs rounded-lg border border-border/80 bg-muted/30 p-3 dark:bg-muted/20">
                    <div>
                      <div className="text-muted-foreground inline-flex items-center gap-1">
                        <CalendarRange className="h-3 w-3 shrink-0" />
                        Inicio
                      </div>
                      <div className="font-semibold mt-0.5 tabular-nums">
                        {formatDetailModalDate(detailLiveTask.startDate)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground inline-flex items-center gap-1">
                        <CalendarRange className="h-3 w-3 shrink-0" />
                        Fin
                      </div>
                      <div className="font-semibold mt-0.5 tabular-nums">
                        {formatDetailModalDate(detailLiveTask.endDate)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Duración</div>
                      <div className="font-semibold mt-0.5 tabular-nums">
                        {computeDurationDays(detailLiveTask.startDate, detailLiveTask.endDate)} día
                        {computeDurationDays(detailLiveTask.startDate, detailLiveTask.endDate) !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const ids =
                      detailLiveTask.assignedUserIds?.length
                        ? detailLiveTask.assignedUserIds
                        : detailLiveTask.assignedUserId != null
                          ? [detailLiveTask.assignedUserId]
                          : []
                    const principal = ids[0]
                    const rest = ids.slice(1)
                    const n = (id: number) => collaboratorNames.get(id) || `#${id}`
                    const areaCollabs = collaboratorsForArea(detailLiveTask.areaId)
                    const principalMeta = principal != null ? areaCollabs.find((c) => c.id === principal) : undefined
                    const roleLabel = principalMeta?.rol?.trim() || '—'
                    return (
                      <>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 inline-flex items-center gap-1.5">
                            <Crown className="h-3 w-3 text-amber-500 dark:text-amber-400 shrink-0" aria-hidden />
                            Responsable
                          </div>
                          {principal != null ? (
                            <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-card p-2">
                              <Avatar name={n(principal)} size="lg" variant="owner" />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold truncate">{n(principal)}</div>
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                  {roleLabel}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs italic text-muted-foreground">Sin responsable</div>
                          )}
                        </div>

                        {!taskRowIsPrivate(detailLiveTask) && (
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 inline-flex items-center gap-1.5">
                              <Users className="h-3 w-3" />
                              Colaboradores ({rest.length})
                            </div>
                            {rest.length === 0 ? (
                              <div className="text-xs italic text-muted-foreground">Sin colaboradores</div>
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                {rest.map((id) => {
                                  const m = areaCollabs.find((c) => c.id === id)
                                  return (
                                    <div
                                      key={id}
                                      className="flex items-center gap-2 rounded-lg border border-border/80 bg-card p-2"
                                    >
                                      <Avatar name={n(id)} size="sm" />
                                      <div className="min-w-0">
                                        <div className="text-xs font-medium truncate">{n(id)}</div>
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                          {m?.rol?.trim() || '—'}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )
                  })()}

                </div>

                <div className="flex items-center justify-end gap-2 pt-4 mt-2 border-t border-border/60">
                  {manage && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 rounded-lg border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          removeTask(detailLiveTask)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 shrink-0" />
                        Eliminar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="gap-1.5 rounded-lg workos-gantt-btn-primary text-white border-0 shadow-sm"
                        onClick={() => {
                          setTaskDetailOpen(false)
                          setDetailTaskId(null)
                          openEdit(detailLiveTask)
                        }}
                      >
                        <PencilLine className="h-3.5 w-3.5 shrink-0" />
                        Editar
                      </Button>
                    </>
                  )}
                  {!manage && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => setTaskDetailOpen(false)}
                    >
                      Cerrar
                    </Button>
                  )}
                </div>
              </>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open && taskFormSaving) return
            setDialogOpen(open)
          }}
        >
          <DialogContent
            className="workos-gantt-task-modal-scroll max-w-2xl w-[calc(100vw-1.5rem)] max-h-[90vh] overflow-y-auto overflow-x-hidden p-0 gap-0 sm:rounded-xl"
            onPointerDownOutside={(e) => {
              if (taskFormSaving) e.preventDefault()
            }}
            onEscapeKeyDown={(e) => {
              if (taskFormSaving) e.preventDefault()
            }}
          >
            <div className="px-6 pt-6 pb-4">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  {editing ? 'Editar Tarea' : 'Nueva Tarea'}
                </DialogTitle>
              </DialogHeader>
            </div>

            <div className="px-6 pb-6 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium" htmlFor="task-form-title">
                  Título <span className="text-red-500">*</span>
                </Label>
                <input
                  id="task-form-title"
                  placeholder="Ej. Migrar módulo de reportes"
                  value={form.title}
                  disabled={taskFormSaving}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, title: e.target.value }))
                    setFormErrors((p) => ({ ...p, title: '' }))
                  }}
                  className={cn(
                    'flex h-10 w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 transition-colors',
                    TASK_MODAL_FOCUS,
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    formErrors.title && 'border-red-500 focus:border-red-500',
                  )}
                />
                {formErrors.title && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.title}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Descripción</Label>
                <Textarea
                  placeholder="Contexto, criterios de aceptación…"
                  value={form.description}
                  disabled={taskFormSaving}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className={cn(
                    'min-h-[100px] rounded-lg resize-none border border-neutral-300 dark:border-neutral-600',
                    TASK_MODAL_FOCUS,
                  )}
                />
              </div>

              {taskFormWorkspaceTagsSection}

              <div className={cn('grid gap-3', form.isPrivateTask ? 'grid-cols-1' : 'grid-cols-2')}>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Equipo <span className="text-red-500">*</span>
                  </Label>
                  {form.isPrivateTask ? (
                    <div
                      className={cn(
                        'h-10 rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 flex items-center text-sm bg-muted/40 dark:bg-muted/25 text-foreground',
                        formErrors.areaId && 'border-red-500',
                      )}
                    >
                      {areas.find((a) => String(a.id) === form.areaId)?.name ??
                        user?.areaNombre ??
                        (form.areaId ? `Área ${form.areaId}` : '—')}
                    </div>
                  ) : (
                    <Select
                      value={form.areaId}
                      onValueChange={(v) => {
                        setForm((f) => ({ ...f, areaId: v, assignedUserIds: [] }))
                        setFormErrors((p) => ({ ...p, areaId: '' }))
                      }}
                      disabled={!!editing || taskFormSaving}
                    >
                      <SelectTrigger
                        className={cn(
                          'h-10 rounded-lg',
                          TASK_MODAL_FOCUS,
                          formErrors.areaId && 'border-red-500 focus:border-red-500',
                        )}
                      >
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        {areas.map((a) => (
                          <SelectItem key={a.id} value={String(a.id)}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {formErrors.areaId && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.areaId}</p>}
                </div>
                {!form.isPrivateTask && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Sprint</Label>
                    <Select
                      value={form.sprintId || 'none'}
                      disabled={taskFormSaving || !form.workspaceId}
                      onValueChange={(v) => setForm((f) => ({ ...f, sprintId: v === 'none' ? '' : v }))}
                    >
                      <SelectTrigger className={cn('h-10 rounded-lg', TASK_MODAL_FOCUS)}>
                        <SelectValue placeholder={form.workspaceId ? 'Backlog (sin sprint)' : 'Elige espacio primero'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Backlog (sin sprint)</SelectItem>
                        {sprintsForWorkspace.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Estado</Label>
                  <Select
                    value={form.status}
                    disabled={taskFormSaving}
                    onValueChange={(v) => setForm((f) => ({ ...f, status: v as AreaTaskStatus }))}
                  >
                    <SelectTrigger className={cn('h-10 rounded-lg', TASK_MODAL_FOCUS)}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_LABEL) as AreaTaskStatus[]).map((k) => (
                        <SelectItem key={k} value={k}>
                          {STATUS_LABEL[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Prioridad</Label>
                  <Select
                    value={form.priority}
                    disabled={taskFormSaving}
                    onValueChange={(v) => setForm((f) => ({ ...f, priority: v as TaskPriority }))}
                  >
                    <SelectTrigger className={cn('h-10 rounded-lg', TASK_MODAL_FOCUS)}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((k) => (
                        <SelectItem key={k} value={k}>
                          {PRIORITY_LABEL[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Inicio <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    variant="plain"
                    type="date"
                    min={editing ? undefined : todayYmdLocal()}
                    value={form.startDate}
                    disabled={taskFormSaving}
                    onChange={(e) => {
                      const v = e.target.value
                      setForm((f) => {
                        let end = f.endDate
                        if (v && end && end < v) end = v
                        return { ...f, startDate: v, endDate: end }
                      })
                      setFormErrors((p) => ({ ...p, startDate: '', endDate: '' }))
                    }}
                    className={cn(
                      'h-10 rounded-lg text-sm px-3 border border-neutral-300 dark:border-neutral-600',
                      TASK_MODAL_FOCUS,
                      formErrors.startDate && 'border-red-500 focus:border-red-500',
                    )}
                  />
                  {formErrors.startDate && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.startDate}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Fin <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    variant="plain"
                    type="date"
                    min={form.startDate || (!editing ? todayYmdLocal() : undefined)}
                    value={form.endDate}
                    disabled={taskFormSaving}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, endDate: e.target.value }))
                      setFormErrors((p) => ({ ...p, endDate: '' }))
                    }}
                    className={cn(
                      'h-10 rounded-lg text-sm px-3 border border-neutral-300 dark:border-neutral-600',
                      TASK_MODAL_FOCUS,
                      formErrors.endDate && 'border-red-500 focus:border-red-500',
                    )}
                  />
                  {formErrors.endDate && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.endDate}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Label className="text-sm font-medium mb-0">
                    Progreso · {displayProgressValue}%
                  </Label>
                  {progressFromFormSubtasks != null && (
                    <span className="text-[10px] text-muted-foreground italic">Calculado desde subtareas</span>
                  )}
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={displayProgressValue}
                  disabled={taskFormSaving || progressFromFormSubtasks != null}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, progressPercent: e.target.value }))
                    setFormErrors((p) => ({ ...p, progressPercent: '' }))
                  }}
                  className="w-full h-2 accent-primary-500 rounded-full bg-muted disabled:opacity-50 cursor-pointer"
                />
                {formErrors.progressPercent && (
                  <p className="text-[11px] text-red-500">{formErrors.progressPercent}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Crown
                    className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0"
                    aria-hidden
                  />
                  Responsable principal
                </Label>
                {form.isPrivateTask ? (
                  <div className="h-10 rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 flex items-center gap-2 text-sm bg-muted/40 dark:bg-muted/25 text-foreground">
                    {(() => {
                      const oid = form.assignedUserIds[0]
                      if (oid == null) return <span className="text-muted-foreground">—</span>
                      const fromCollab = currentAreaCollabs.find((c) => c.id === oid)
                      const label =
                        fromCollab?.nombreCompleto ??
                        (user?.id === oid ? user.name : null) ??
                        `Usuario ${oid}`
                      return (
                        <>
                          <Avatar name={label} size="xs" variant="owner" />
                          <span className="truncate min-w-0">{label}</span>
                        </>
                      )
                    })()}
                  </div>
                ) : (
                  <Select
                    value={form.assignedUserIds[0] != null ? String(form.assignedUserIds[0]) : 'none'}
                    onValueChange={setOwnerPrincipal}
                    disabled={taskFormSaving || !form.areaId}
                  >
                    <SelectTrigger className={cn('h-10 rounded-lg', TASK_MODAL_FOCUS)}>
                      <SelectValue placeholder="Selecciona un responsable" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin responsable</SelectItem>
                      {currentAreaCollabs.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          <span className="flex items-center gap-2">
                            <Avatar name={c.nombreCompleto} size="xs" variant="owner" />
                            <span className="truncate">{c.nombreCompleto}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {!form.isPrivateTask && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Colaboradores</Label>
                  <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/80 bg-muted/10 dark:bg-muted/20 p-3 max-h-44 overflow-y-auto">
                    {!form.areaId ? (
                      <p className="text-xs text-muted-foreground col-span-2">Selecciona un equipo primero.</p>
                    ) : currentAreaCollabs.filter((c) => c.id !== form.assignedUserIds[0]).length === 0 ? (
                      <p className="text-xs text-muted-foreground col-span-2">No hay más personas en esta área.</p>
                    ) : (
                      currentAreaCollabs
                        .filter((c) => c.id !== form.assignedUserIds[0])
                        .map((c) => {
                          const selected = form.assignedUserIds.slice(1).includes(c.id)
                          return (
                            <label
                              key={c.id}
                              className="flex items-center gap-2 cursor-pointer rounded-md p-1.5 hover:bg-muted/50 transition-colors"
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-border text-primary-600 accent-primary-600 shrink-0"
                                checked={selected}
                                disabled={taskFormSaving}
                                onChange={() => toggleCollaborator(c.id)}
                              />
                              <Avatar name={c.nombreCompleto} size="xs" />
                              <span className="text-xs truncate min-w-0">{c.nombreCompleto}</span>
                            </label>
                          )
                        })
                    )}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-border px-2 py-2 space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span>Subtareas</span>
                  <span className="tabular-nums">
                    {editing && subtasksLoading
                      ? '…'
                      : `${formSubtaskDone}/${formSubtaskCount}`}
                  </span>
                </div>
                {editing && subtasksLoading && (
                  <div
                    className="flex items-center gap-2 text-xs text-muted-foreground py-1.5 px-0.5"
                    role="status"
                    aria-live="polite"
                  >
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary-600" aria-hidden />
                    <span>Cargando subtareas…</span>
                  </div>
                )}
                {editing && subtasks.length > 0 && (
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-0.5">
                    {subtasks.map((st) => (
                      <div
                        key={st.id}
                        className="flex items-center gap-2 rounded-none border border-neutral-200/90 dark:border-border/70 bg-white dark:bg-card px-2 py-1 group"
                      >
                        <input
                          type="checkbox"
                          className={FORM_SUBTASK_CHECKBOX_CLASS}
                          checked={st.done}
                          disabled={taskFormSaving || subtaskModalBusy !== 'idle'}
                          onChange={async (e) => {
                            if (!editing || subtaskModalBusy !== 'idle') return
                            const done = e.target.checked
                            setSubtaskModalBusy('updating')
                            try {
                              const updated = normalizeSubtaskDto(
                                await updateTaskSubtask(editing.id, st.id, { done }),
                              )
                              setSubtasks((prev) => prev.map((x) => (x.id === st.id ? updated : x)))
                              const nextList = subtasks.map((x) => (x.id === st.id ? updated : x))
                              patchGanttParentFromSubtasks(editing.id, nextList, setTasks, setKpis)
                              scheduleReloadTasksAndKpisAfterSubtasks()
                            } catch {
                              setErr('No se pudo actualizar la subtarea')
                            } finally {
                              setSubtaskModalBusy('idle')
                            }
                          }}
                        />
                        <Input
                          variant="plain"
                          value={st.title}
                          disabled={taskFormSaving || subtaskModalBusy !== 'idle'}
                          onChange={(e) =>
                            setSubtasks((prev) =>
                              prev.map((x) => (x.id === st.id ? { ...x, title: e.target.value } : x)),
                            )
                          }
                          onBlur={async () => {
                            if (!editing || taskFormSaving || subtaskModalBusy !== 'idle') return
                            const row = subtasks.find((x) => x.id === st.id)
                            const v = row?.title?.trim() ?? ''
                            if (!v) return
                            setSubtaskModalBusy('updating')
                            try {
                              const updated = normalizeSubtaskDto(
                                await updateTaskSubtask(editing.id, st.id, { title: v }),
                              )
                              setSubtasks((prev) => prev.map((x) => (x.id === st.id ? updated : x)))
                              const nextList = subtasks.map((x) => (x.id === st.id ? updated : x))
                              patchGanttParentFromSubtasks(editing.id, nextList, setTasks, setKpis)
                              scheduleReloadTasksAndKpisAfterSubtasks()
                            } catch {
                              setErr('No se pudo renombrar la subtarea')
                            } finally {
                              setSubtaskModalBusy('idle')
                            }
                          }}
                          className={cn(
                            'h-7 min-h-0 rounded-none border-0 bg-transparent px-1 py-0 text-xs shadow-none flex-1 min-w-0',
                            'focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0',
                            st.done ? 'line-through text-muted-foreground' : 'text-foreground',
                          )}
                        />
                        <button
                          type="button"
                          disabled={taskFormSaving || subtaskModalBusy !== 'idle'}
                          className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10"
                          aria-label="Eliminar subtarea"
                          onClick={async () => {
                            if (!editing || subtaskModalBusy !== 'idle') return
                            setSubtaskModalBusy('updating')
                            try {
                              await deleteTaskSubtask(editing.id, st.id)
                              setSubtasks((prev) => prev.filter((x) => x.id !== st.id))
                              scheduleReloadTasksAndKpisAfterSubtasks()
                            } catch {
                              setErr('No se pudo eliminar la subtarea')
                            } finally {
                              setSubtaskModalBusy('idle')
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {!editing && pendingSubtasks.length > 0 && (
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-0.5">
                    {pendingSubtasks.map((ps) => (
                      <div
                        key={ps.tempId}
                        className="flex items-center gap-2 rounded-none border border-neutral-200/90 dark:border-border/70 bg-white dark:bg-card px-2 py-1 group"
                      >
                        <input
                          type="checkbox"
                          className={FORM_SUBTASK_CHECKBOX_CLASS}
                          checked={ps.done}
                          disabled={taskFormSaving}
                          onChange={() =>
                            setPendingSubtasks((prev) =>
                              prev.map((x) =>
                                x.tempId === ps.tempId ? { ...x, done: !x.done } : x,
                              ),
                            )
                          }
                        />
                        <Input
                          variant="plain"
                          value={ps.title}
                          disabled={taskFormSaving}
                          onChange={(e) =>
                            setPendingSubtasks((prev) =>
                              prev.map((x) =>
                                x.tempId === ps.tempId ? { ...x, title: e.target.value } : x,
                              ),
                            )
                          }
                          className={cn(
                            'h-7 min-h-0 rounded-none border-0 bg-transparent px-1 py-0 text-xs shadow-none flex-1 min-w-0',
                            'focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0',
                            ps.done ? 'line-through text-muted-foreground' : 'text-foreground',
                          )}
                        />
                        <button
                          type="button"
                          disabled={taskFormSaving}
                          className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10"
                          aria-label="Quitar subtarea"
                          onClick={() =>
                            setPendingSubtasks((prev) => prev.filter((x) => x.tempId !== ps.tempId))
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-1.5 items-stretch">
                  <Input
                    variant="plain"
                    placeholder="Añadir subtarea y presiona Enter"
                    value={subtaskDraft.title}
                    disabled={
                      taskFormSaving || subtaskModalBusy !== 'idle' || (Boolean(editing) && subtasksLoading)
                    }
                    onChange={(e) => setSubtaskDraft((d) => ({ ...d, title: e.target.value }))}
                    className={cn(
                      'h-8 flex-1 min-w-0 rounded-none border border-neutral-200 dark:border-border bg-white dark:bg-background text-xs px-2.5',
                      TASK_MODAL_FOCUS,
                    )}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return
                      e.preventDefault()
                      void commitSubtaskDraft()
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 shrink-0 rounded-none border-neutral-200 dark:border-border bg-white dark:bg-background px-2.5 text-xs font-medium gap-1.5"
                    disabled={
                      taskFormSaving ||
                      subtaskModalBusy !== 'idle' ||
                      !subtaskDraft.title.trim() ||
                      (Boolean(editing) && subtasksLoading)
                    }
                    onClick={() => void commitSubtaskDraft()}
                  >
                    {subtaskModalBusy !== 'idle' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
                    ) : null}
                    {subtaskModalBusy === 'adding'
                      ? 'Añadiendo…'
                      : subtaskModalBusy === 'updating'
                        ? 'Actualizando…'
                        : '+ Añadir'}
                  </Button>
                </div>
              </div>

              {!isMySpaceView && (
              <label className="flex items-center gap-2 rounded-md border border-border px-2 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-primary-500 text-primary-600 accent-primary-600 shrink-0"
                  checked={form.isPrivateTask}
                  disabled={taskFormSaving}
                  onChange={(e) => {
                    const checked = e.target.checked
                    if (!checked) {
                      setForm((f) => ({ ...f, isPrivateTask: false }))
                      return
                    }
                    setForm((f) => {
                      const myId = user?.id
                      const myAreaId = resolveUserDefaultAreaId(user, areas)
                      const nextAreaId = myAreaId || f.areaId
                      const assignees =
                        myId != null ? [myId] : f.assignedUserIds[0] != null ? [f.assignedUserIds[0]] : []
                      return {
                        ...f,
                        isPrivateTask: true,
                        sprintId: '',
                        ...(nextAreaId ? { areaId: nextAreaId } : {}),
                        assignedUserIds: assignees,
                      }
                    })
                    setFormErrors((p) => ({ ...p, areaId: '' }))
                  }}
                />
                <span className="text-sm font-medium">Tarea privada</span>
              </label>
              )}

            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/60 bg-muted/20">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={taskFormSaving}
                className="rounded-lg px-5"
              >
                Cancelar
              </Button>
              <Button
                className="workos-gantt-btn-primary rounded-lg px-5 inline-flex items-center justify-center gap-2 text-white border-0 shadow-sm"
                onClick={saveTask}
                disabled={taskFormSaving || !form.title.trim() || (!editing && !form.areaId)}
              >
                {taskFormSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    {editing ? 'Guardando…' : 'Creando…'}
                  </>
                ) : (
                  editing ? 'Guardar Cambios' : 'Crear Tarea'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete task confirmation dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={(open) => { if (!deleting) { setDeleteDialogOpen(open); if (!open) setTaskToDelete(null) } }}>
          <DialogContent className="max-w-sm">
            <div className="flex flex-col items-center text-center pt-2 pb-1">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4 gantt-scale-in">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <DialogHeader className="space-y-1.5">
                <DialogTitle className="text-base">Eliminar tarea</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                ¿Estás seguro de que deseas eliminar{' '}
                <span className="font-semibold text-foreground">"{taskToDelete?.title}"</span>?
                Esta acción no se puede deshacer.
              </p>
            </div>
            <DialogFooter className="flex-row gap-2 sm:justify-center pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-lg"
                onClick={() => { setDeleteDialogOpen(false); setTaskToDelete(null) }}
                disabled={deleting}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg"
                onClick={confirmDeleteTask}
                disabled={deleting}
              >
                {deleting ? 'Eliminando…' : 'Eliminar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete area confirmation dialog */}
        <Dialog open={deleteAreaDialogOpen} onOpenChange={(open) => { if (!deletingArea) { setDeleteAreaDialogOpen(open); if (!open) setAreaToDelete(null) } }}>
          <DialogContent className="max-w-md p-6 rounded-xl text-center">
            <DialogHeader className="space-y-1 pb-0">
              <DialogTitle className="text-lg font-semibold text-center">Eliminar Área</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed text-center">
              ¿Estás seguro de eliminar <strong>"{areaToDelete?.name}"</strong>? Los equipos asignados
              quedarán sin área. Esta acción no se puede deshacer.
            </p>
            <DialogFooter className="flex-row justify-center gap-3 pt-4 sm:justify-center">
              <Button
                variant="outline"
                className="rounded-lg px-5"
                onClick={() => { setDeleteAreaDialogOpen(false); setAreaToDelete(null) }}
                disabled={deletingArea}
              >
                Cancelar
              </Button>
              <Button
                className="rounded-lg px-5 bg-red-500 hover:bg-red-600 text-white"
                onClick={confirmDeleteArea}
                disabled={deletingArea}
              >
                {deletingArea ? 'Eliminando…' : 'Eliminar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
