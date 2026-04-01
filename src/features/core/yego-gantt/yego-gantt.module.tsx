import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../../services/core/api'
import { useAuthStore } from '../../../store/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GanttChart, LayoutDashboard, ListChecks } from 'lucide-react'
import { GanttTimelineTab } from './components/gantt-timeline/GanttTimelineTab'
import { PulseGanttToolbar, type PulseNotification } from './components/gantt-timeline/PulseGanttToolbar'
import { PulseStatsBar } from './components/gantt-timeline/PulseStatsBar'
import { PortfolioTab } from './components/PortfolioTab'
import { TodoBoardTab } from './components/TodoBoardTab'

type AreaTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED' | 'AT_RISK'
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

interface AreaSimple {
  id: number
  name: string
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
  const [areas, setAreas] = useState<AreaSimple[]>([])
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
  const [form, setForm] = useState({
    areaId: '',
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'PENDING' as AreaTaskStatus,
    priority: 'MEDIUM' as TaskPriority,
    progressPercent: '0',
  })

  const manage = useMemo(() => {
    if (!user) return false
    const r = (user.role || '').toUpperCase()
    if (r === 'ADMIN' || r === 'SUPERADMIN') return true
    return user.esJefe === true
  }, [user])

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
      if (manage) {
        const ar = await api.get<AreaSimple[]>('/areas/find-all-active')
        setAreas(ar.data)
      }
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e
        ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Error al cargar')
        : 'Error al cargar'
      setErr(msg)
    } finally {
      setLoading(false)
    }
  }, [areaFilter, priorityFilter, manage])

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

  const openCreate = () => {
    setEditing(null)
    setForm({
      areaId: areas[0]?.id?.toString() || '',
      title: '',
      description: '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      status: 'PENDING',
      priority: 'MEDIUM',
      progressPercent: '0',
    })
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
    })
    setDialogOpen(true)
  }

  const saveTask = async () => {
    const payload = {
      areaId: Number(form.areaId),
      title: form.title.trim(),
      description: form.description || undefined,
      startDate: form.startDate,
      endDate: form.endDate,
      status: form.status,
      priority: form.priority,
      progressPercent: Number(form.progressPercent) || 0,
    }
    try {
      if (editing) {
        await api.put(`/yego-gantt/tasks/${editing.id}`, {
          title: payload.title,
          description: payload.description,
          startDate: payload.startDate,
          endDate: payload.endDate,
          status: payload.status,
          priority: payload.priority,
          progressPercent: payload.progressPercent,
        })
      } else {
        await api.post('/yego-gantt/tasks', payload)
      }
      setDialogOpen(false)
      await load()
    } catch {
      setErr('No se pudo guardar la tarea')
    }
  }

  const removeTask = async (t: TaskRow) => {
    if (!confirm('¿Eliminar esta tarea?')) return
    try {
      await api.delete(`/yego-gantt/tasks/${t.id}`)
      await load()
    } catch {
      setErr('No se pudo eliminar')
    }
  }

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

  const tabTriggerClass =
    'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all data-[state=active]:bg-red-500/12 data-[state=active]:text-red-700 dark:data-[state=active]:text-red-300 data-[state=active]:border data-[state=active]:border-red-500/35 data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground data-[state=inactive]:border data-[state=inactive]:border-transparent data-[state=inactive]:hover:bg-muted/60'

  return (
    <div className="min-h-full bg-gradient-to-b from-muted/50 via-muted/25 to-background p-3 md:p-5">
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
          onCreateTask={openCreate}
          notifications={pulseNotifications}
          onMarkNotificationRead={(id) =>
            setPulseNotifications((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)))
          }
          onClearNotifications={() => setPulseNotifications([])}
          manage={manage}
          showGanttExtras={activeTab === 'gantt'}
          onRefresh={() => load()}
          refreshing={loading}
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

          <TabsContent value="gantt" className="mt-0 flex-1 min-h-0 flex flex-col data-[state=inactive]:hidden outline-none">
            <GanttTimelineTab
              tasks={displayedTasks}
              loading={loading}
              filterText={ganttTeamFilter}
              onFilterChange={setGanttTeamFilter}
              manage={manage}
              onCreateTask={openCreate}
              onEditTask={openEdit}
              onDeleteTask={removeTask}
              showHeatmap={showHeatmap}
              showCriticalPath={showCriticalPath}
              onTaskSelectNotify={onTaskSelectNotify}
            />
          </TabsContent>

        <TabsContent value="cartera" className="mt-0 flex-1 min-h-0 flex flex-col data-[state=inactive]:hidden outline-none">
          <PortfolioTab
            tasks={displayedTasks}
            loading={loading}
            manage={manage}
            onEdit={openEdit}
            onDelete={removeTask}
            onCreateTask={openCreate}
          />
        </TabsContent>

        <TabsContent value="board" className="mt-0 flex-1 min-h-0 flex flex-col data-[state=inactive]:hidden outline-none">
          <TodoBoardTab
            tasks={displayedTasks}
            loading={loading}
            manage={manage}
            onEdit={openEdit}
            onDelete={removeTask}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar tarea' : 'Nueva tarea'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {!editing && (
              <div>
                <Label>Área</Label>
                <Select value={form.areaId} onValueChange={(v) => setForm((f) => ({ ...f, areaId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                  <SelectContent>
                    {areas.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <Label>Descripción</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Inicio</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <Label>Fin</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Prioridad</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v as TaskPriority }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((k) => (
                    <SelectItem key={k} value={k}>{PRIORITY_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as AreaTaskStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABEL) as AreaTaskStatus[]).map((k) => (
                    <SelectItem key={k} value={k}>{STATUS_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Progreso %</Label>
              <Input type="number" min={0} max={100} value={form.progressPercent} onChange={(e) => setForm((f) => ({ ...f, progressPercent: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveTask} disabled={!form.title.trim() || (!editing && !form.areaId)}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}

export default YegoGanttModule
