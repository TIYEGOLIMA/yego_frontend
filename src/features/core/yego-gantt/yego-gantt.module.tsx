import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../../services/core/api'
import { useAuthStore } from '../../../store/auth-store'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertTriangle, Check, ChevronDown, GanttChart, LayoutDashboard, ListChecks } from 'lucide-react'
import { GanttTimelineTab } from './components/gantt-timeline/GanttTimelineTab'
import { PulseGanttToolbar, type PulseNotification } from './components/gantt-timeline/PulseGanttToolbar'
import { PulseStatsBar } from './components/gantt-timeline/PulseStatsBar'
import { PortfolioTab } from './components/PortfolioTab'
import { TodoBoardTab } from './components/TodoBoardTab'

type AreaTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED' | 'AT_RISK'
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface AreaFull {
  id: number
  name: string
  description?: string | null
  managerId?: number | null
  activo?: boolean
}

export interface ColaboradorDto {
  id: number
  nombreCompleto: string
  email: string
  rol: string
}

export interface ProjectDto {
  id: number
  name: string
  description?: string | null
  activo?: boolean
  memberUserIds: number[]
}

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
  tags?: string[]
  sortOrder?: number
}

interface Kpis {
  equipos: number
  tareas: number
  progresoPromedioPct: number
  completadas: number
  enRiesgo: number
  bloqueadas: number
}

const STATUS_LABEL: Record<AreaTaskStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En curso',
  DONE: 'Hecha',
  BLOCKED: 'Bloqueada',
  AT_RISK: 'En riesgo',
}

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

function normPriority(p?: TaskPriority | null): TaskPriority {
  if (p === 'LOW' || p === 'MEDIUM' || p === 'HIGH' || p === 'URGENT') return p
  return 'MEDIUM'
}

export function YegoGanttModule() {
  const user = useAuthStore((s) => s.user)
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [areas, setAreas] = useState<AreaFull[]>([])
  const [projects, setProjects] = useState<ProjectDto[]>([])
  const [areaCollaborators, setAreaCollaborators] = useState<Map<number, ColaboradorDto[]>>(new Map())
  const [areaFilter, setAreaFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('gantt')
  const [ganttTeamFilter, setGanttTeamFilter] = useState('')
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [showCriticalPath, setShowCriticalPath] = useState(false)
  const [pulseNotifications, setPulseNotifications] = useState<PulseNotification[]>([])
  const notifSeqRef = useRef(0)
  const [loading, setLoading] = useState(true)
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
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'PENDING' as AreaTaskStatus,
    priority: 'MEDIUM' as TaskPriority,
    progressPercent: '0',
    assignedUserIds: [] as number[],
    tagsInput: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [assignDropdownOpen, setAssignDropdownOpen] = useState(false)
  const assignDropdownRef = useRef<HTMLDivElement>(null)

  const manage = useMemo(() => {
    if (!user) return false
    const r = (user.role || '').toUpperCase()
    if (r === 'ADMIN' || r === 'SUPERADMIN') return true
    return user.esJefe === true
  }, [user])

  const loadCollaborators = useCallback(async (areaList: AreaFull[]) => {
    const map = new Map<number, ColaboradorDto[]>()
    const results = await Promise.allSettled(
      areaList.map((a) => api.get<ColaboradorDto[]>(`/areas/${a.id}/colaboradores`)),
    )
    areaList.forEach((a, i) => {
      const r = results[i]
      map.set(a.id, r.status === 'fulfilled' ? r.value.data : [])
    })
    setAreaCollaborators(map)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const q: Record<string, string> = {}
      if (areaFilter !== 'all') q.areaId = areaFilter
      if (priorityFilter !== 'all') q.priority = priorityFilter
      const [tr, kp] = await Promise.all([
        api.get<TaskRow[]>('/yego-gantt/tasks', { params: q }),
        api.get<Kpis>('/yego-gantt/tasks/kpis', { params: q }),
      ])
      setTasks(tr.data)
      setKpis(kp.data)

      const [ar, pr] = await Promise.all([
        api.get<AreaFull[]>('/areas/find-all-active'),
        api.get<ProjectDto[]>('/yego-gantt/projects'),
      ])
      setAreas(ar.data)
      setProjects(pr.data)
      await loadCollaborators(ar.data)
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e
        ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Error al cargar')
        : 'Error al cargar'
      setErr(msg)
    } finally {
      setLoading(false)
    }
  }, [areaFilter, priorityFilter, loadCollaborators])

  useEffect(() => {
    load()
  }, [load])

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

  const openCreate = (presetAreaId?: number) => {
    setEditing(null)
    setForm({
      areaId: presetAreaId?.toString() || areas[0]?.id?.toString() || '',
      title: '',
      description: '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      status: 'PENDING',
      priority: 'MEDIUM',
      progressPercent: '0',
      assignedUserIds: [],
      tagsInput: '',
    })
    setFormErrors({})
    setDialogOpen(true)
  }

  const openEdit = (t: TaskRow) => {
    setEditing(t)
    setForm({
      areaId: String(t.areaId),
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
    try {
      if (editing) {
        await api.put(`/yego-gantt/tasks/${editing.id}`, payload)
      } else {
        await api.post('/yego-gantt/tasks', payload)
      }
      setFormErrors({})
      setDialogOpen(false)
      await load()
    } catch {
      setErr('No se pudo guardar la tarea')
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
      await load()
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
    try {
      await api.put(`/yego-gantt/tasks/${taskId}`, { status: newStatus })
      await load()
    } catch {
      setErr('No se pudo actualizar el estado')
    }
  }, [load])

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

  const tabTriggerClass =
    'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all data-[state=active]:bg-red-500/12 data-[state=active]:text-red-700 dark:data-[state=active]:text-red-300 data-[state=active]:border data-[state=active]:border-red-500/35 data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground data-[state=inactive]:border data-[state=inactive]:border-transparent data-[state=inactive]:hover:bg-muted/60'

  return (
    <div className="min-h-full bg-gradient-to-b from-muted/50 via-muted/25 to-background p-3 md:p-5 font-sans">
      <div className="max-w-[1840px] mx-auto flex flex-col rounded-2xl border border-border/80 bg-card shadow-xl shadow-black/[0.07] overflow-hidden min-h-[calc(100vh-96px)]">
        {err && (
          <div className="mx-4 mt-3 rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2 border border-destructive/20">
            {err}
          </div>
        )}

        <PulseGanttToolbar
          showHeatmap={showHeatmap}
          onToggleHeatmap={() => setShowHeatmap((v) => !v)}
          showCriticalPath={showCriticalPath}
          onToggleCriticalPath={() => setShowCriticalPath((v) => !v)}
          filterText={activeTab === 'gantt' ? ganttTeamFilter : searchQuery}
          onFilterChange={activeTab === 'gantt' ? setGanttTeamFilter : setSearchQuery}
          searchPlaceholder={activeTab === 'gantt' ? 'Filtrar equipos…' : 'Buscar tareas o áreas…'}
          onCreateTask={() => openCreate()}
          notifications={pulseNotifications}
          onMarkNotificationRead={(id) =>
            setPulseNotifications((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)))
          }
          onClearNotifications={() => setPulseNotifications([])}
          manage={manage}
          showGanttExtras={activeTab === 'gantt'}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
          <div className="border-b border-border/70 bg-muted/20 px-4 sm:px-5 py-2">
            <TabsList className="bg-transparent h-auto p-0 gap-1.5 flex flex-wrap justify-start w-full">
              <TabsTrigger value="gantt" className={tabTriggerClass}>
                <GanttChart className="h-3.5 w-3.5 shrink-0" />
                Gantt Timeline
              </TabsTrigger>
              <TabsTrigger value="cartera" className={tabTriggerClass}>
                <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
                Cartera de proyectos
              </TabsTrigger>
              <TabsTrigger value="board" className={tabTriggerClass}>
                <ListChecks className="h-3.5 w-3.5 shrink-0" />
                To-Do Board
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="gantt" className="mt-0 flex-1 min-h-0 flex flex-col data-[state=inactive]:hidden outline-none">
            <PulseStatsBar kpis={kpis} />
            <div className="flex flex-wrap items-center gap-3 px-4 sm:px-5 py-2.5 border-b border-border/60 bg-background/60">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-medium whitespace-nowrap text-muted-foreground">Área</Label>
                <Select value={areaFilter} onValueChange={setAreaFilter}>
                  <SelectTrigger className="w-[200px] h-8 text-xs rounded-lg border-border/80">
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
                <Label className="text-xs font-medium whitespace-nowrap text-muted-foreground">Prioridad</Label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[180px] h-8 text-xs rounded-lg border-border/80">
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
              <span className="text-xs text-muted-foreground ml-auto">{displayedTasks.length} tareas en vista</span>
            </div>
            <GanttTimelineTab
              tasks={displayedTasks}
              loading={loading}
              filterText={ganttTeamFilter}
              onFilterChange={setGanttTeamFilter}
              manage={manage}
              onCreateTask={() => openCreate()}
              onEditTask={openEdit}
              onDeleteTask={removeTask}
              showHeatmap={showHeatmap}
              showCriticalPath={showCriticalPath}
              onTaskSelectNotify={onTaskSelectNotify}
              collaboratorsForArea={collaboratorsForArea}
            />
          </TabsContent>

          <TabsContent value="cartera" className="mt-0 flex-1 min-h-0 flex flex-col data-[state=inactive]:hidden outline-none">
            <PortfolioTab
              tasks={displayedTasks}
              loading={loading}
              manage={manage}
              areas={areas}
              projects={projects}
              collaboratorsForArea={collaboratorsForArea}
              onEdit={openEdit}
              onDelete={removeTask}
              onCreateTask={openCreate}
              onDeleteArea={deleteArea}
              onReload={load}
            />
          </TabsContent>

          <TabsContent value="board" className="mt-0 flex-1 min-h-0 flex flex-col data-[state=inactive]:hidden outline-none">
            <TodoBoardTab
              tasks={displayedTasks}
              loading={loading}
              manage={manage}
              allCollaborators={allCollaborators}
              onEdit={openEdit}
              onDelete={removeTask}
              onStatusChange={changeTaskStatus}
            />
          </TabsContent>
        </Tabs>

        {/* Task create/edit dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
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
                  onChange={(e) => setForm((f) => ({ ...f, tagsInput: e.target.value }))}
                  className="h-10 rounded-lg border-border focus-visible:ring-red-500 focus-visible:border-red-500"
                />
                <p className="text-[10px] text-muted-foreground">Separadas por coma</p>
              </div>

              {/* Equipo + Asignado a */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Equipo <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.areaId}
                    onValueChange={(v) => { setForm((f) => ({ ...f, areaId: v, assignedUserIds: [] })); setAssignDropdownOpen(false); setFormErrors((p) => ({ ...p, areaId: '' })) }}
                    disabled={!!editing}
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
                      onClick={() => setAssignDropdownOpen((v) => !v)}
                      className="flex items-center justify-between w-full h-10 rounded-lg border border-border bg-background px-3 text-sm transition-colors hover:bg-muted/50"
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
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as AreaTaskStatus }))}>
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
                  <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v as TaskPriority }))}>
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
                className="rounded-lg px-5"
              >
                Cancelar
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-5"
                onClick={saveTask}
                disabled={!form.title.trim() || (!editing && !form.areaId)}
              >
                {editing ? 'Guardar Cambios' : 'Crear Tarea'}
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
          <DialogContent className="max-w-md p-6 rounded-xl gantt-scale-in text-center">
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
      </div>
    </div>
  )
}

export default YegoGanttModule
