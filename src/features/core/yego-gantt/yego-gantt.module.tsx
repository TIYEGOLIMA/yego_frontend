import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../../services/core/api'
import { useAuthStore, type User } from '../../../store/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flame,
  Folder,
  GanttChartSquare,
  KanbanSquare,
  LayoutDashboard,
  Loader2,
  Plus,
  Route,
  Search,
  Sparkles,
} from 'lucide-react'
import './workos-gantt-shell.css'
import { GanttTimelineTab } from './components/gantt-timeline/GanttTimelineTab'
import { PulseStatsBar } from './components/gantt-timeline/PulseStatsBar'
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
  ProjectDto,
  Kpis,
} from './types'
import {
  areasStableKey,
  fetchAreaCollaboratorsMap,
  fetchGanttMasterData,
  fetchGanttTaskSummary,
  parseGanttLoadError,
} from './ganttApi'
import { projectIconByKey } from './projectIcons'
import { normPriority, STATUS_LABEL, PRIORITY_LABEL } from './utils'
import { cn } from '@/utils/cn'

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

export function YegoGanttModule() {
  const user = useAuthStore((s) => s.user)
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [areas, setAreas] = useState<AreaFull[]>([])
  const [projects, setProjects] = useState<ProjectDto[]>([])
  /** 'all' = todas; si hay varios proyectos el efecto sugiere uno por defecto hasta que el usuario cambie. */
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [areaCollaborators, setAreaCollaborators] = useState<Map<number, ColaboradorDto[]>>(new Map())
  const [areaFilter, setAreaFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'gantt' | 'cartera' | 'board' | 'sprints' | 'dashboard'>(() =>
    ganttHasFullTabAccess(useAuthStore.getState().user) ? 'sprints' : 'gantt',
  )
  const [ganttTeamFilter, setGanttTeamFilter] = useState('')
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [showCriticalPath, setShowCriticalPath] = useState(false)
  const [timelinePanDays, setTimelinePanDays] = useState(0)
  const [pulseNotifications, setPulseNotifications] = useState<IntegralNotification[]>([])
  const notifSeqRef = useRef(0)
  const hasLoadedOnceRef = useRef(false)
  /** Invalidación solo para `load` + colaboradores (no debe pisar el poll de tareas). */
  const ganttFullLoadSeqRef = useRef(0)
  /** Invalidación solo para `reloadTasksAndKpis`. */
  const tasksKpisSeqRef = useRef(0)
  /** Tras fetch exitoso; si difiere de areaKey, hay que cargar colaboradores otra vez. */
  const collabsFetchedForKeyRef = useRef<string>('')
  /** Una sola `load()` a la vez (Strict Mode monta el efecto dos veces en dev). */
  const loadInFlightRef = useRef<Promise<void> | null>(null)
  /** Último `projectFilter` con el que terminó un `load()` completo (para detectar cambio de proyecto). */
  const prevProjectFilterForLoadRef = useRef<string | null>(null)
  const [dismissedTaskIds, setDismissedTaskIds] = useState<number[]>([])

  const setIntegralItems = useIntegralNotificationsStore((s) => s.setItems)
  const registerIntegralHandlers = useIntegralNotificationsStore((s) => s.registerHandlers)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  /** Recarga por cambio de proyecto: mensaje claro arriba y sin pastilla en esquina. */
  const [projectSwitching, setProjectSwitching] = useState(false)
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
    projectId: '' as string,
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
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [assignDropdownOpen, setAssignDropdownOpen] = useState(false)
  const assignDropdownRef = useRef<HTMLDivElement>(null)
  const [taskFormSaving, setTaskFormSaving] = useState(false)

  const manage = useMemo(() => ganttHasFullTabAccess(user), [user])

  const loadCollaborators = useCallback(async (areaList: AreaFull[], requestId: number) => {
    const map = await fetchAreaCollaboratorsMap(areaList)
    if (requestId !== ganttFullLoadSeqRef.current) return
    setAreaCollaborators(map)
  }, [])

  const reloadTasksAndKpis = useCallback(async () => {
    const requestId = ++tasksKpisSeqRef.current
    const { tasks: nextTasks, kpis: nextKpis } = await fetchGanttTaskSummary(areaFilter, priorityFilter, projectFilter)
    if (requestId !== tasksKpisSeqRef.current) return
    setTasks(nextTasks)
    setKpis(nextKpis)
  }, [areaFilter, priorityFilter, projectFilter])

  /** Evita forzar siempre 'all' al primer fetch cuando hay varios proyectos. */
  const projectFilterInitRef = useRef(false)

  const load = useCallback(async (opts?: { refreshCollaborators?: boolean }) => {
    if (loadInFlightRef.current) {
      await loadInFlightRef.current
      return
    }
    const requestId = ++ganttFullLoadSeqRef.current
    const run = (async () => {
      const isFirstLoad = !hasLoadedOnceRef.current
      const prevPf = prevProjectFilterForLoadRef.current
      const isProjectChangeRefresh =
        !isFirstLoad && prevPf !== null && prevPf !== projectFilter
      if (isProjectChangeRefresh) {
        setProjectSwitching(true)
      }
      if (isFirstLoad) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      setErr(null)
      try {
        const { tasks: nextTasks, kpis: nextKpis } = await fetchGanttTaskSummary(areaFilter, priorityFilter, projectFilter)
        if (requestId !== ganttFullLoadSeqRef.current) return
        setTasks(nextTasks)
        setKpis(nextKpis)

        const { areas: ar, projects: pr } = await fetchGanttMasterData()
        if (requestId !== ganttFullLoadSeqRef.current) return
        setAreas(ar)
        setProjects(pr)

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
          setProjectSwitching(false)
          prevProjectFilterForLoadRef.current = projectFilter
        }
        loadInFlightRef.current = null
      }
    })()
    loadInFlightRef.current = run
    await run
  }, [areaFilter, priorityFilter, projectFilter, loadCollaborators])

  useEffect(() => {
    if (projects.length === 0) {
      projectFilterInitRef.current = false
      setProjectFilter('all')
      return
    }
    if (projects.length === 1) {
      projectFilterInitRef.current = true
      setProjectFilter(String(projects[0].id))
      return
    }
    if (!projectFilterInitRef.current) {
      projectFilterInitRef.current = true
      const sorted = [...projects].sort((a, b) => a.id - b.id)
      setProjectFilter(String(sorted[0].id))
      return
    }
    setProjectFilter((prev) => {
      const ids = new Set(projects.map((p) => String(p.id)))
      if (prev === 'all') return 'all'
      if (ids.has(prev)) return prev
      const sorted = [...projects].sort((a, b) => a.id - b.id)
      return String(sorted[0].id)
    })
  }, [projects])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void reloadTasksAndKpis().catch(() => {
        /* silenciar poll en background */
      })
    }, 60_000)
    return () => clearInterval(id)
  }, [reloadTasksAndKpis])

  const displayedTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return tasks
    return tasks.filter((t) => {
      const title = (t.title || '').toLowerCase()
      const area = (t.areaName || '').toLowerCase()
      return title.includes(q) || area.includes(q)
    })
  }, [tasks, searchQuery])

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

  const projectsInScope = useMemo(() => {
    if (projectFilter === 'all') return projects
    return projects.filter((p) => String(p.id) === projectFilter)
  }, [projects, projectFilter])

  const projectPickerIcon = useMemo(() => {
    if (projectFilter === 'all') return Folder
    const p = projects.find((x) => String(x.id) === projectFilter)
    return projectIconByKey(p?.iconKey)
  }, [projectFilter, projects])

  const projectPickerLabel = useMemo(() => {
    if (projects.length === 0) return '—'
    if (projectFilter === 'all') return 'Todos los proyectos'
    return projects.find((p) => String(p.id) === projectFilter)?.name ?? 'Proyecto'
  }, [projectFilter, projects])

  const PickerGlyph = projectPickerIcon

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

  const openCreate = (
    presetAreaId?: number,
    presetProjectId?: number,
    presetStatus?: AreaTaskStatus,
    presetSprintId?: number,
  ) => {
    setTaskFormSaving(false)
    setEditing(null)
    setForm({
      areaId: presetAreaId?.toString() || areas[0]?.id?.toString() || '',
      projectId:
        presetProjectId != null
          ? String(presetProjectId)
          : projectFilter !== 'all'
            ? projectFilter
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
    })
    setFormErrors({})
    setDialogOpen(true)
  }

  const openEdit = (t: TaskRow) => {
    setTaskFormSaving(false)
    setEditing(t)
    setForm({
      areaId: String(t.areaId),
      projectId: t.projectId != null ? String(t.projectId) : '',
      sprintId: t.sprintId != null ? String(t.sprintId) : '',
      title: t.title,
      description: t.description || '',
      startDate: t.startDate,
      endDate: t.endDate,
      status: t.status,
      priority: normPriority(t.priority),
      progressPercent: String(t.progressPercent ?? 0),
      assignedUserIds: t.assignedUserIds?.length ? t.assignedUserIds : (t.assignedUserId != null ? [t.assignedUserId] : []),
      tagsInput: t.tags?.join(', ') || '',
    })
    setFormErrors({})
    setDialogOpen(true)
  }

  const validateForm = (): Record<string, string> => {
    const errors: Record<string, string> = {}
    if (!form.title.trim()) errors.title = 'El nombre es obligatorio'
    if (!form.areaId) errors.areaId = 'Selecciona un equipo'

    const prog = Number(form.progressPercent)
    if (isNaN(prog) || prog < 0) errors.progressPercent = 'No puede ser negativo'
    if (prog > 100) errors.progressPercent = 'Máximo 100%'

    if (!form.startDate) errors.startDate = 'Fecha inicio requerida'
    if (!form.endDate) errors.endDate = 'Fecha fin requerida'
    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      errors.endDate = 'Debe ser igual o posterior a la fecha de inicio'
    }

    return errors
  }

  const saveTask = async () => {
    if (taskFormSaving) return
    const errors = validateForm()
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    const prog = Math.min(100, Math.max(0, Number(form.progressPercent) || 0))
    const parsedTags = form.tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    const payload = {
      areaId: Number(form.areaId),
      projectId: form.projectId ? Number(form.projectId) : null,
      sprintId: form.sprintId ? Number(form.sprintId) : null,
      title: form.title.trim(),
      description: form.description || undefined,
      startDate: form.startDate,
      endDate: form.endDate,
      status: form.status,
      priority: form.priority,
      progressPercent: prog,
      assignedUserId: form.assignedUserIds.length > 0 ? form.assignedUserIds[0] : null,
      assignedUserIds: form.assignedUserIds.length > 0 ? form.assignedUserIds : null,
      tags: parsedTags.length > 0 ? parsedTags : null,
    }
    setAssignDropdownOpen(false)
    setTaskFormSaving(true)
    try {
      if (editing) {
        await api.put(`/yego-gantt/tasks/${editing.id}`, payload)
      } else {
        await api.post('/yego-gantt/tasks', payload)
      }
      setFormErrors({})
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
      setTaskToDelete(null)
      await reloadTasksAndKpis()
    } catch {
      setErr('No se pudo eliminar')
    } finally {
      setDeleting(false)
    }
  }

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
    if (id.startsWith('gantt-at-risk-') || id.startsWith('gantt-blocked-')) {
      const raw = id.replace(/^gantt-(at-risk|blocked)-/, '')
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

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (assignDropdownRef.current && !assignDropdownRef.current.contains(e.target as Node)) {
        setAssignDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const toggleAssignee = (userId: number) => {
    setForm((f) => {
      const ids = f.assignedUserIds.includes(userId)
        ? f.assignedUserIds.filter((id) => id !== userId)
        : [...f.assignedUserIds, userId]
      return { ...f, assignedUserIds: ids }
    })
  }

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

  const visibleTabs = useMemo(
    () => (manage ? TAB_CONFIG : TAB_CONFIG.filter((t) => t.id === 'gantt' || t.id === 'board')),
    [manage, TAB_CONFIG],
  )

  useEffect(() => {
    if (manage) return
    if (activeTab === 'gantt' || activeTab === 'board') return
    setActiveTab('gantt')
  }, [manage, activeTab])

  return (
    <div className="workos-gantt-shell workos-gantt-shell-bg min-h-[calc(100vh-4rem)] flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background shadow-sm dark:shadow-dark-sm">
        <div className="mx-auto max-w-[1680px] px-4 lg:px-6 py-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 shrink-0 rounded-xl workos-gantt-gradient-icon flex items-center justify-center text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="font-display font-bold text-foreground leading-tight truncate">WorkOS</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider -mt-0.5 truncate">
                Project OS
              </div>
            </div>
          </div>
          {projects.length > 0 && (
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger
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
                    <PickerGlyph className="h-4 w-4 stroke-[2]" />
                  </div>
                  <div className="flex-1 min-w-0 text-left leading-none">
                    <div className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Proyecto
                    </div>
                    <div className="text-[13px] font-semibold text-foreground truncate tracking-tight">
                      {projectPickerLabel}
                    </div>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
                </div>
              </SelectTrigger>
              <SelectContent align="start" className="rounded-xl">
                {projects.length > 1 && (
                  <SelectItem value="all">
                    <span className="flex items-center gap-2">
                      <Folder className="h-3.5 w-3.5 shrink-0 opacity-80" />
                      Todos los proyectos
                    </span>
                  </SelectItem>
                )}
                {projects.map((p) => {
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
          )}
          <div className="flex-1 min-w-[200px] max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={activeTab === 'gantt' ? ganttTeamFilter : searchQuery}
              onChange={(e) =>
                activeTab === 'gantt'
                  ? setGanttTeamFilter(e.target.value)
                  : setSearchQuery(e.target.value)
              }
              placeholder={activeTab === 'gantt' ? 'Filtrar equipos en timeline…' : 'Buscar tareas o áreas…'}
              className="pl-9 h-9 text-sm rounded-lg bg-background border-border/80"
            />
          </div>
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

        {refreshing && projectSwitching && (
          <div
            className="mb-3 flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground shadow-sm"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
            <span className="font-medium">Se está cambiando de proyecto…</span>
          </div>
        )}
        {refreshing && !projectSwitching && (
          <div
            className="h-0.5 w-full shrink-0 bg-primary/40 animate-pulse rounded-full mb-2"
            title="Actualizando datos…"
            aria-busy="true"
          />
        )}

        <div className="animate-fade-in flex-1 flex flex-col min-h-0">
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
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white px-4 py-2 workos-shadow-soft mt-2 dark:border-border/80 dark:bg-card">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Área</span>
                  <Select value={areaFilter} onValueChange={setAreaFilter}>
                    <SelectTrigger className="w-[200px] h-8 text-xs rounded-lg border-[#e5e7eb] dark:border-border/80">
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
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Prioridad</span>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[180px] h-8 text-xs rounded-lg border-[#e5e7eb] dark:border-border/80">
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
                <div className="ml-auto flex items-center gap-1 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-[#e5e7eb] bg-white dark:border-border/80"
                    onClick={() => setTimelinePanDays((d) => d - 7)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg border-[#e5e7eb] bg-white px-3 text-xs dark:border-border/80"
                    onClick={() => setTimelinePanDays(0)}
                  >
                    Hoy
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-[#e5e7eb] bg-white dark:border-border/80"
                    onClick={() => setTimelinePanDays((d) => d + 7)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                    {displayedTasks.length} tareas en vista
                  </span>
                </div>
              </div>
              <div className="mt-2 flex-1 min-h-0 flex flex-col">
                <GanttTimelineTab
                  tasks={displayedTasks}
                  loading={loading}
                  refreshing={refreshing}
                  suppressEdgeRefreshPill={projectSwitching}
                  timelinePanDays={timelinePanDays}
                  filterText={ganttTeamFilter}
                  onFilterChange={setGanttTeamFilter}
                  manage={manage}
                  onEditTask={openEdit}
                  onDeleteTask={removeTask}
                  showHeatmap={showHeatmap}
                  showCriticalPath={showCriticalPath}
                  onTaskSelectNotify={onTaskSelectNotify}
                  collaboratorsForArea={collaboratorsForArea}
                />
              </div>
            </div>
          )}

          {manage && activeTab === 'cartera' && (
            <PortfolioTab
              tasks={displayedTasks}
              loading={loading}
              refreshing={refreshing}
              suppressEdgeRefreshPill={projectSwitching}
              manage={manage}
              areas={areas}
              projects={projectsInScope}
              collaboratorsForArea={collaboratorsForArea}
              onEdit={openEdit}
              onDelete={removeTask}
              onCreateTask={openCreate}
              onDeleteArea={deleteArea}
              onReload={load}
            />
          )}

          {activeTab === 'board' && (
            <TodoBoardTab
              tasks={displayedTasks}
              loading={loading}
              refreshing={refreshing}
              suppressEdgeRefreshPill={projectSwitching}
              manage={manage}
              allCollaborators={allCollaborators}
              onEdit={openEdit}
              onDelete={removeTask}
              onStatusChange={changeTaskStatus}
              onAddTask={(status) => openCreate(undefined, undefined, status)}
            />
          )}

          {manage && activeTab === 'sprints' && (
            <SprintsTab
              tasks={tasks}
              projects={projectsInScope}
              manage={manage}
              loading={loading}
              refreshing={refreshing}
              suppressEdgeRefreshPill={projectSwitching}
              onReload={load}
              onTaskStatusChange={changeTaskStatus}
              onOpenCreateTask={
                manage ? (opts) => openCreate(undefined, opts?.projectId, undefined, opts?.sprintId) : undefined
              }
              onEditTask={openEdit}
              collaboratorNames={collaboratorNames}
            />
          )}

          {manage && activeTab === 'dashboard' && (
            <DashboardTab
              tasks={tasks}
              projects={projectsInScope}
              loading={loading}
              refreshing={refreshing}
              suppressEdgeRefreshPill={projectSwitching}
              onCreateTask={manage ? () => openCreate() : undefined}
            />
          )}
        </div>

        {/* Task create/edit dialog */}
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open && taskFormSaving) return
            setDialogOpen(open)
          }}
        >
          <DialogContent
            className="max-w-lg p-0 gap-0 overflow-hidden"
            onPointerDownOutside={(e) => {
              if (taskFormSaving) e.preventDefault()
            }}
            onEscapeKeyDown={(e) => {
              if (taskFormSaving) e.preventDefault()
            }}
          >
            <div className="px-6 pt-6 pb-4">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-xl font-bold">
                  {editing ? 'Editar Tarea' : 'Nueva Tarea'}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {editing
                    ? 'Modifica los campos necesarios y guarda los cambios.'
                    : 'Completa los campos para crear una nueva tarea.'}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="px-6 pb-6 space-y-4">
              {/* Nombre */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Nombre de la tarea"
                  value={form.title}
                  disabled={taskFormSaving}
                  onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setFormErrors((p) => ({ ...p, title: '' })) }}
                  className={`h-10 rounded-lg focus-visible:ring-red-500 focus-visible:border-red-500 ${formErrors.title ? 'border-red-500' : 'border-border'}`}
                />
                {formErrors.title && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.title}</p>}
              </div>

              {/* Descripción */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Descripción</Label>
                <Textarea
                  placeholder="Descripción opcional..."
                  value={form.description}
                  disabled={taskFormSaving}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="min-h-[100px] rounded-lg border-border resize-none focus-visible:ring-red-500 focus-visible:border-red-500"
                />
              </div>

              {/* Etiquetas */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Etiquetas</Label>
                <Input
                  placeholder="ci-devops, seguridad, backend…"
                  value={form.tagsInput}
                  disabled={taskFormSaving}
                  onChange={(e) => setForm((f) => ({ ...f, tagsInput: e.target.value }))}
                  className="h-10 rounded-lg border-border focus-visible:ring-red-500 focus-visible:border-red-500"
                />
                <p className="text-[10px] text-muted-foreground">Separadas por coma</p>
              </div>

              {/* Proyecto */}
              {projects.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Proyecto</Label>
                  <Select
                    value={form.projectId || 'none'}
                    disabled={taskFormSaving}
                    onValueChange={(v) => setForm((f) => ({ ...f, projectId: v === 'none' ? '' : v }))}
                  >
                    <SelectTrigger className="h-10 rounded-lg border-border">
                      <SelectValue placeholder="Sin proyecto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin proyecto</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Equipo + Asignado a */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Equipo <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.areaId}
                    onValueChange={(v) => { setForm((f) => ({ ...f, areaId: v, assignedUserIds: [] })); setAssignDropdownOpen(false); setFormErrors((p) => ({ ...p, areaId: '' })) }}
                    disabled={!!editing || taskFormSaving}
                  >
                    <SelectTrigger className={`h-10 rounded-lg ${formErrors.areaId ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.areaId && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.areaId}</p>}
                </div>
                <div className="space-y-1.5" ref={assignDropdownRef}>
                  <Label className="text-sm font-medium">Asignado a</Label>
                  <div className="relative">
                    <button
                      type="button"
                      disabled={taskFormSaving}
                      onClick={() => !taskFormSaving && setAssignDropdownOpen((v) => !v)}
                      className="flex items-center justify-between w-full h-10 rounded-lg border border-border bg-background px-3 text-sm transition-colors hover:bg-muted/50 disabled:opacity-60 disabled:pointer-events-none"
                    >
                      <span className={`truncate ${form.assignedUserIds.length === 0 ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {form.assignedUserIds.length === 0
                          ? 'Sin asignar'
                          : form.assignedUserIds.length === 1
                            ? currentAreaCollabs.find((c) => c.id === form.assignedUserIds[0])?.nombreCompleto || '1 seleccionado'
                            : `${form.assignedUserIds.length} seleccionados`}
                      </span>
                      <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${assignDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {assignDropdownOpen && (
                      <div className="absolute z-[100] mt-1 w-full rounded-lg border border-border bg-white dark:bg-neutral-800 shadow-xl max-h-48 overflow-y-auto gantt-scale-in">
                        {currentAreaCollabs.length === 0 ? (
                          <p className="text-xs text-muted-foreground px-3 py-2.5">No hay colaboradores en esta área</p>
                        ) : (
                          currentAreaCollabs.map((c) => {
                            const selected = form.assignedUserIds.includes(c.id)
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => toggleAssignee(c.id)}
                                className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-sm"
                              >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${selected ? 'bg-red-600 border-red-600' : 'border-border'}`}>
                                  {selected && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <span className="truncate">{c.nombreCompleto}</span>
                                <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{c.rol}</span>
                              </button>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Fechas + Progreso */}
              <div className="grid grid-cols-[1fr_1fr_90px] gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Fecha inicio <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    disabled={taskFormSaving}
                    onChange={(e) => { setForm((f) => ({ ...f, startDate: e.target.value })); setFormErrors((p) => ({ ...p, startDate: '', endDate: '' })) }}
                    className={`h-9 rounded-lg text-xs px-2 ${formErrors.startDate ? 'border-red-500' : ''}`}
                  />
                  {formErrors.startDate && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.startDate}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Fecha fin <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={form.endDate}
                    disabled={taskFormSaving}
                    onChange={(e) => { setForm((f) => ({ ...f, endDate: e.target.value })); setFormErrors((p) => ({ ...p, endDate: '' })) }}
                    className={`h-9 rounded-lg text-xs px-2 ${formErrors.endDate ? 'border-red-500' : ''}`}
                  />
                  {formErrors.endDate && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.endDate}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Progreso (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="0"
                    value={form.progressPercent}
                    disabled={taskFormSaving}
                    onChange={(e) => {
                      const val = e.target.value
                      const num = Number(val)
                      if (val === '' || (!isNaN(num) && num >= 0 && num <= 100)) {
                        setForm((f) => ({ ...f, progressPercent: val }))
                        setFormErrors((p) => ({ ...p, progressPercent: '' }))
                      }
                    }}
                    className={`h-9 rounded-lg text-xs px-2 ${formErrors.progressPercent ? 'border-red-500' : ''}`}
                  />
                  {formErrors.progressPercent && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.progressPercent}</p>}
                </div>
              </div>

              {/* Estado + Prioridad */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Estado</Label>
                  <Select value={form.status} disabled={taskFormSaving} onValueChange={(v) => setForm((f) => ({ ...f, status: v as AreaTaskStatus }))}>
                    <SelectTrigger className="h-10 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_LABEL) as AreaTaskStatus[]).map((k) => (
                        <SelectItem key={k} value={k}>{STATUS_LABEL[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Prioridad</Label>
                  <Select value={form.priority} disabled={taskFormSaving} onValueChange={(v) => setForm((f) => ({ ...f, priority: v as TaskPriority }))}>
                    <SelectTrigger className="h-10 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((k) => (
                        <SelectItem key={k} value={k}>{PRIORITY_LABEL[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Footer */}
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
                className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-5 inline-flex items-center justify-center gap-2"
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
