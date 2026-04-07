import { useCallback, useMemo, useState } from 'react'
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Crown,
  FolderKanban,
  Pencil,
  Plus,
  Trash2,
  Users as UsersIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { api } from '../../../../services/core/api'
import type { AreaFull, ColaboradorDto, ProjectDto } from '../yego-gantt.module'

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
  tags?: string[]
}

const STATUS_LABEL: Record<AreaTaskStatus, string> = {
  PENDING: 'Por Hacer',
  IN_PROGRESS: 'En Progreso',
  DONE: 'Hecho',
  BLOCKED: 'Bloqueada',
  AT_RISK: 'Backlog',
}

const STATUS_BG: Record<AreaTaskStatus, string> = {
  PENDING: 'bg-red-500 text-white',
  IN_PROGRESS: 'bg-amber-500 text-white',
  DONE: 'bg-emerald-500 text-white',
  BLOCKED: 'bg-zinc-400 text-white',
  AT_RISK: 'bg-gray-400 text-white',
}

const PRIO_LABEL: Record<TaskPriority, string> = { LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', URGENT: 'Urgente' }
const PRIO_COLOR: Record<TaskPriority, string> = {
  LOW: 'text-emerald-600',
  MEDIUM: 'text-foreground',
  HIGH: 'text-amber-600',
  URGENT: 'text-red-600',
}

const TAG_COLORS = [
  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
]

function tagColor(tag: string): string {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) | 0
  return TAG_COLORS[Math.abs(h) % TAG_COLORS.length]
}

function norm(p?: TaskPriority | null): TaskPriority {
  return p === 'LOW' || p === 'MEDIUM' || p === 'HIGH' || p === 'URGENT' ? p : 'MEDIUM'
}

function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

interface AreaGroup {
  areaId: number
  areaName: string
  description: string
  tasks: TaskRow[]
  done: number
  total: number
  progressPct: number
  collaborators: ColaboradorDto[]
  manager: ColaboradorDto | null
  managerName: string
}

export interface PortfolioTabProps {
  tasks: TaskRow[]
  loading: boolean
  manage: boolean
  areas: AreaFull[]
  projects: ProjectDto[]
  collaboratorsForArea: (areaId: number) => ColaboradorDto[]
  onEdit: (t: TaskRow) => void
  onDelete: (t: TaskRow) => void
  onCreateTask: (presetAreaId?: number) => void
  onDeleteArea: (areaId: number) => void
  onReload: () => void
}

export function PortfolioTab({
  tasks,
  loading,
  manage,
  areas,
  projects,
  collaboratorsForArea,
  onEdit,
  onDelete,
  onCreateTask,
  onDeleteArea,
  onReload,
}: PortfolioTabProps) {
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set())
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(() => new Set())

  // --- Project dialog ---
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [projectEditing, setProjectEditing] = useState<ProjectDto | null>(null)
  const [projectForm, setProjectForm] = useState({ name: '', description: '', memberUserIds: [] as number[] })
  const [projectSaving, setProjectSaving] = useState(false)

  // --- Delete project dialog ---
  const [deleteProjectDialogOpen, setDeleteProjectDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<ProjectDto | null>(null)
  const [deletingProject, setDeletingProject] = useState(false)

  // --- Collaborator dialog ---
  const [collabDialogOpen, setCollabDialogOpen] = useState(false)
  const [collabAreaName, setCollabAreaName] = useState('')
  const [collabList, setCollabList] = useState<ColaboradorDto[]>([])
  const [collabSaving, setCollabSaving] = useState(false)

  // --- Area edit dialog ---
  const [areaDialogOpen, setAreaDialogOpen] = useState(false)
  const [areaEditing, setAreaEditing] = useState<AreaFull | null>(null)
  const [areaForm, setAreaForm] = useState({ name: '', description: '' })
  const [areaSaving, setAreaSaving] = useState(false)

  const groups = useMemo<AreaGroup[]>(() => {
    const areaMap = new Map<number, AreaFull>()
    for (const a of areas) areaMap.set(a.id, a)

    const taskMap = new Map<number, TaskRow[]>()
    for (const t of tasks) {
      if (!taskMap.has(t.areaId)) taskMap.set(t.areaId, [])
      taskMap.get(t.areaId)!.push(t)
    }

    const areaIds = new Set([...taskMap.keys(), ...areas.map((a) => a.id)])

    return [...areaIds]
      .map((areaId) => {
        const areaInfo = areaMap.get(areaId)
        const list = taskMap.get(areaId) || []
        const done = list.filter((t) => t.status === 'DONE').length
        const total = list.length
        const collabs = collaboratorsForArea(areaId)
        const mgr = areaInfo?.managerId
          ? collabs.find((c) => c.id === areaInfo.managerId) || null
          : null

        return {
          areaId,
          areaName: areaInfo?.name || list[0]?.areaName?.trim() || `Área ${areaId}`,
          description: areaInfo?.description || '',
          tasks: list,
          done,
          total,
          progressPct: total > 0 ? Math.round((done / total) * 100) : 0,
          collaborators: collabs,
          manager: mgr,
          managerName: mgr?.nombreCompleto || (areaInfo?.managerId ? `Usuario #${areaInfo.managerId}` : ''),
        }
      })
      .sort((a, b) => a.areaName.localeCompare(b.areaName))
  }, [tasks, areas, collaboratorsForArea])

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
    for (const g of groups) for (const c of g.collaborators) s.add(c.id)
    return s.size
  }, [groups])

  // --- Collaborator dialog handlers ---
  const openCollabDialog = useCallback(
    (areaId: number, areaName: string) => {
      setCollabAreaName(areaName)
      setCollabList(collaboratorsForArea(areaId))
      setCollabDialogOpen(true)
    },
    [collaboratorsForArea],
  )

  const removeCollaborator = async (userId: number) => {
    setCollabSaving(true)
    try {
      await api.patch(`/users/${userId}/area`, { areaId: null })
      setCollabList((prev) => prev.filter((c) => c.id !== userId))
      onReload()
    } catch { /* ignore */ }
    setCollabSaving(false)
  }

  // --- Area edit dialog handlers ---
  const openAreaEdit = (area: AreaFull) => {
    setAreaEditing(area)
    setAreaForm({ name: area.name, description: area.description || '' })
    setAreaDialogOpen(true)
  }

  const openAreaCreate = () => {
    setAreaEditing(null)
    setAreaForm({ name: '', description: '' })
    setAreaDialogOpen(true)
  }

  const saveArea = async () => {
    setAreaSaving(true)
    try {
      if (areaEditing) {
        await api.put(`/areas/update/${areaEditing.id}`, {
          name: areaForm.name.trim(),
          description: areaForm.description || null,
        })
      } else {
        await api.post('/areas/create', {
          name: areaForm.name.trim(),
          description: areaForm.description || null,
        })
      }
      setAreaDialogOpen(false)
      onReload()
    } catch { /* ignore */ }
    setAreaSaving(false)
  }

  const findCollabName = useCallback(
    (areaId: number, userId: number): string | null => {
      const collabs = collaboratorsForArea(areaId)
      const c = collabs.find((x) => x.id === userId)
      return c?.nombreCompleto || null
    },
    [collaboratorsForArea],
  )

  const getAssignees = useCallback(
    (areaId: number, t: TaskRow): { id: number; name: string }[] => {
      const ids = t.assignedUserIds?.length
        ? t.assignedUserIds
        : t.assignedUserId != null
          ? [t.assignedUserId]
          : []
      return ids.map((uid) => ({
        id: uid,
        name: findCollabName(areaId, uid) || `#${uid}`,
      }))
    },
    [findCollabName],
  )

  // --- Project handlers ---
  const toggleProject = (id: number) =>
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const openProjectCreate = () => {
    setProjectEditing(null)
    setProjectForm({ name: '', description: '', memberUserIds: [] })
    setProjectDialogOpen(true)
  }

  const openProjectEdit = (p: ProjectDto) => {
    setProjectEditing(p)
    setProjectForm({ name: p.name, description: p.description || '', memberUserIds: [...p.memberUserIds] })
    setProjectDialogOpen(true)
  }

  const saveProject = async () => {
    setProjectSaving(true)
    try {
      const payload = {
        name: projectForm.name.trim(),
        description: projectForm.description || null,
        memberUserIds: projectForm.memberUserIds,
      }
      if (projectEditing) {
        await api.put(`/yego-gantt/projects/${projectEditing.id}`, payload)
      } else {
        await api.post('/yego-gantt/projects', payload)
      }
      setProjectDialogOpen(false)
      onReload()
    } catch { /* ignore */ }
    setProjectSaving(false)
  }

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return
    setDeletingProject(true)
    try {
      await api.delete(`/yego-gantt/projects/${projectToDelete.id}`)
      setDeleteProjectDialogOpen(false)
      setProjectToDelete(null)
      onReload()
    } catch { /* ignore */ }
    setDeletingProject(false)
  }

  const toggleProjectMember = (userId: number) => {
    setProjectForm((f) => {
      const ids = f.memberUserIds.includes(userId)
        ? f.memberUserIds.filter((id) => id !== userId)
        : [...f.memberUserIds, userId]
      return { ...f, memberUserIds: ids }
    })
  }

  const areaManagers = useMemo(() => {
    const managers: { userId: number; name: string; areaName: string; areaId: number }[] = []
    for (const a of areas) {
      if (a.managerId) {
        const collabs = collaboratorsForArea(a.id)
        const mgr = collabs.find((c) => c.id === a.managerId)
        managers.push({
          userId: a.managerId,
          name: mgr?.nombreCompleto || `Usuario #${a.managerId}`,
          areaName: a.name,
          areaId: a.id,
        })
      }
    }
    return managers
  }, [areas, collaboratorsForArea])

  const projectMemberAreas = useCallback(
    (memberUserIds: number[]): number[] => {
      const areaIds: number[] = []
      for (const uid of memberUserIds) {
        const mgr = areaManagers.find((m) => m.userId === uid)
        if (mgr) areaIds.push(mgr.areaId)
      }
      return areaIds
    },
    [areaManagers],
  )

  const renderAreaCard = (g: AreaGroup, gIdx: number) => {
    const isOpen = expanded.has(g.areaId)
    const areaInfo = areas.find((a) => a.id === g.areaId)

    return (
      <div
        key={g.areaId}
        style={{ animationDelay: `${gIdx * 0.06}s` }}
        className="mx-4 sm:mx-5 my-2 rounded-xl border border-border/40 bg-white dark:bg-neutral-900/60 shadow-sm hover:shadow-md transition-shadow duration-300 gantt-fade-in overflow-hidden"
      >
        <div
          className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer select-none transition-colors ${
            isOpen ? 'bg-muted/10' : 'hover:bg-muted/10'
          }`}
          onClick={() => toggle(g.areaId)}
        >
          <span className="text-muted-foreground shrink-0">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 ring-2 ring-red-500/20" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground leading-tight">{g.areaName}</h3>
            {g.description && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{g.description}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs tabular-nums text-muted-foreground font-medium">{g.done}/{g.total}</span>
            <div className="w-20 h-1.5 rounded-full bg-border/60 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500" style={{ width: `${g.progressPct}%` }} />
            </div>
            <span className="text-xs tabular-nums text-muted-foreground font-medium">{g.progressPct}%</span>
          </div>
          {g.managerName && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-red-500/20 bg-red-50 dark:bg-red-900/20 text-[11px] text-red-600 dark:text-red-400 shrink-0 font-semibold shadow-sm">
              <Crown className="w-3 h-3" />{g.managerName}
            </div>
          )}
          {manage && (
            <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => onCreateTask(g.areaId)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Agregar tarea"><Plus className="w-4 h-4" /></button>
              <button type="button" onClick={() => openCollabDialog(g.areaId, g.areaName)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Colaboradores"><UsersIcon className="w-4 h-4" /></button>
              {areaInfo && <button type="button" onClick={() => openAreaEdit(areaInfo)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Editar área"><Pencil className="w-4 h-4" /></button>}
              <button type="button" onClick={() => onDeleteArea(g.areaId)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive" title="Eliminar área"><Trash2 className="w-4 h-4" /></button>
            </div>
          )}
        </div>
        {isOpen && (
          <div className="px-5 pb-5 pt-1 border-t border-border/30 gantt-expand">
            <div className="grid grid-cols-[280px_1fr] gap-0">
              <div className="pr-6 border-r-2 border-border/30 pt-4">
                <h4 className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60 mb-3 font-semibold flex items-center gap-2">
                  <span className="w-1 h-3.5 rounded-full bg-red-400/60 inline-block" />Equipo del Área
                </h4>
                <div className="space-y-0.5">
                  {g.collaborators.length > 0 ? g.collaborators.map((c, cIdx) => {
                    const isManager = g.manager?.id === c.id
                    return (
                      <div key={c.id} style={{ animationDelay: `${cIdx * 0.05}s` }} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted/40 transition-all duration-200 gantt-fade-in-left">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isManager ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800' : 'bg-muted border border-border/60 text-muted-foreground'}`}>{avatarInitials(c.nombreCompleto)}</div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-foreground font-semibold">{c.nombreCompleto}</span>
                          <span className="text-[10px] text-muted-foreground/70 ml-1.5">· {c.rol}</span>
                        </div>
                        {isManager && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                      </div>
                    )
                  }) : <p className="text-[11px] text-muted-foreground/50 italic py-3">Sin miembros asignados</p>}
                </div>
              </div>
              <div className="pl-6 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60 font-semibold flex items-center gap-2">
                    <span className="w-1 h-3.5 rounded-full bg-red-400/60 inline-block" />Tareas del Área
                  </h4>
                  {manage && (
                    <button type="button" onClick={() => onCreateTask(g.areaId)} className="text-[11px] text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-0.5 font-semibold transition-colors">+ Nueva tarea</button>
                  )}
                </div>
                <div className="space-y-0">
                  {g.tasks.map((t, tIdx) => {
                    const pr = norm(t.priority)
                    const assignees = getAssignees(g.areaId, t)
                    const taskTags = t.tags ?? []
                    return (
                      <div key={t.id} style={{ animationDelay: `${tIdx * 0.04}s` }} className="flex items-center gap-3 py-2.5 border-b border-border/20 last:border-b-0 hover:bg-red-50/30 dark:hover:bg-red-900/5 transition-all duration-200 cursor-pointer group px-2 rounded-lg gantt-fade-in-left" onClick={() => onEdit(t)}>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-md font-semibold shrink-0 whitespace-nowrap ${STATUS_BG[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                        <span className="text-xs text-foreground font-medium flex-1 min-w-0 truncate">{t.title}</span>
                        {taskTags.length > 0 && (
                          <div className="flex items-center gap-1 shrink-0">
                            {taskTags.map((tag) => (<span key={tag} className={`text-[9px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${tagColor(tag)}`}>{tag}</span>))}
                          </div>
                        )}
                        <span className="text-[10px] text-muted-foreground/70 shrink-0 tabular-nums flex items-center gap-1">
                          <svg className="w-2.5 h-2.5 text-muted-foreground/50" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="12" height="12" rx="2" /><path d="M5 1v2M11 1v2M1 6h14" /></svg>
                          {t.endDate.slice(5)}
                        </span>
                        {assignees.length > 0 ? (
                          <div className="flex items-center shrink-0 -space-x-1.5">
                            {assignees.map((a) => (<div key={a.id} className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 border-2 border-white dark:border-neutral-900 flex items-center justify-center text-[7px] font-bold text-red-600 dark:text-red-400" title={a.name}>{avatarInitials(a.name)}</div>))}
                          </div>
                        ) : <div className="w-5 shrink-0" />}
                        <span className={`text-[10px] font-semibold shrink-0 min-w-[48px] text-right ${PRIO_COLOR[pr]}`}>{PRIO_LABEL[pr]}</span>
                        {manage && (
                          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(t) }} className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all shrink-0"><Trash2 className="w-3 h-3" /></button>
                        )}
                      </div>
                    )
                  })}
                  {g.tasks.length === 0 && <p className="text-[11px] text-muted-foreground/50 italic text-center py-6">Sin tareas asignadas.</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) return <p className="text-sm text-muted-foreground p-6">Cargando cartera…</p>

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Stats strip */}
      <div className="px-5 sm:px-6 py-3 border-b border-border/40 bg-gradient-to-r from-muted/5 to-muted/15 flex items-center gap-6 shrink-0">
        <div className="flex items-center gap-1.5">
          <FolderKanban className="w-3.5 h-3.5 text-red-500" />
          <span className="text-xs text-muted-foreground font-medium">Proyectos:</span>
          <span className="text-xs font-bold tabular-nums">{projects.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-red-500" />
          <span className="text-xs text-muted-foreground font-medium">Áreas:</span>
          <span className="text-xs font-bold tabular-nums">{totalAreas}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <UsersIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Personal:</span>
          <span className="text-xs font-bold tabular-nums">{totalUsers}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-medium">Tareas:</span>
          <span className="text-xs font-bold tabular-nums">
            {totalDone}/{totalTasks}
          </span>
        </div>
        {manage && (
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              onClick={openProjectCreate}
              className="h-7 text-xs gap-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm"
            >
              <Plus className="w-3 h-3" />
              Nuevo Proyecto
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={openAreaCreate}
              className="h-7 text-xs gap-1.5 rounded-lg"
            >
              <Plus className="w-3 h-3" />
              Nueva Área
            </Button>
          </div>
        )}
      </div>

      {/* Content list */}
      <div className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-neutral-950/30 py-2">
        {groups.length === 0 && projects.length === 0 && (
          <div className="text-center py-16">
            <Building2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No hay áreas ni proyectos.</p>
          </div>
        )}

        {/* ===== PROJECTS ===== */}
        {projects.map((proj, pIdx) => {
          const isProjectOpen = expandedProjects.has(proj.id)
          const projAreaIds = projectMemberAreas(proj.memberUserIds)
          const projectGroups = groups.filter((g) => projAreaIds.includes(g.areaId))
          const projectTaskCount = projectGroups.reduce((s, g) => s + g.total, 0)
          const projectDoneCount = projectGroups.reduce((s, g) => s + g.done, 0)
          const projectPct = projectTaskCount > 0 ? Math.round((projectDoneCount / projectTaskCount) * 100) : 0
          const projectCollabCount = (() => {
            const s = new Set<number>()
            for (const g of projectGroups) for (const c of g.collaborators) s.add(c.id)
            return s.size
          })()

          const memberNames = proj.memberUserIds.map((uid) => {
            const mgr = areaManagers.find((m) => m.userId === uid)
            return mgr?.name || `#${uid}`
          })

          return (
            <div
              key={`proj-${proj.id}`}
              style={{ animationDelay: `${pIdx * 0.06}s` }}
              className="mx-4 sm:mx-5 my-3 rounded-xl border-2 border-red-200/60 dark:border-red-800/40 bg-white dark:bg-neutral-900/60 shadow-sm hover:shadow-md transition-shadow duration-300 gantt-fade-in overflow-hidden"
            >
              {/* Project header */}
              <div
                className={`flex items-center gap-3 px-5 py-4 cursor-pointer select-none transition-colors ${
                  isProjectOpen ? 'bg-red-50/30 dark:bg-red-900/10' : 'hover:bg-red-50/20 dark:hover:bg-red-900/5'
                }`}
                onClick={() => toggleProject(proj.id)}
              >
                <span className="text-muted-foreground shrink-0">
                  {isProjectOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </span>

                <FolderKanban className="w-4.5 h-4.5 text-red-500 shrink-0" />

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-foreground leading-tight">{proj.name}</h3>
                  {proj.description && (
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{proj.description}</p>
                  )}
                </div>

                {/* Member avatars */}
                <div className="flex items-center -space-x-1.5 shrink-0">
                  {memberNames.slice(0, 4).map((name, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 border-2 border-white dark:border-neutral-900 flex items-center justify-center text-[8px] font-bold text-red-600 dark:text-red-400"
                      title={name}
                    >
                      {avatarInitials(name)}
                    </div>
                  ))}
                  {memberNames.length > 4 && (
                    <div className="w-6 h-6 rounded-full bg-muted border-2 border-white dark:border-neutral-900 flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                      +{memberNames.length - 4}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-500" /> {proj.memberUserIds.length} líderes
                  </span>
                  <span className="flex items-center gap-1">
                    <UsersIcon className="w-3 h-3" /> {projectCollabCount}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs tabular-nums text-muted-foreground font-medium">
                    {projectDoneCount}/{projectTaskCount}
                  </span>
                  <div className="w-20 h-1.5 rounded-full bg-border/60 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500"
                      style={{ width: `${projectPct}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground font-medium">{projectPct}%</span>
                </div>

                {manage && (
                  <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => openProjectEdit(proj)}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title="Editar proyecto"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setProjectToDelete(proj); setDeleteProjectDialogOpen(true) }}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                      title="Eliminar proyecto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Expanded: areas of members */}
              {isProjectOpen && (
                <div className="border-t border-red-200/40 dark:border-red-800/30 gantt-expand">
                  {projectGroups.length === 0 && (
                    <p className="text-xs text-muted-foreground/50 italic text-center py-6">
                      No hay líderes asignados a este proyecto.
                    </p>
                  )}
                  {projectGroups.map((g, gIdx) => renderAreaCard(g, gIdx))}
                </div>
              )}
            </div>
          )
        })}

        {/* ===== ALL AREAS (when no projects) or remaining areas ===== */}
        {groups.map((g, gIdx) => renderAreaCard(g, gIdx))}
      </div>

      {/* ===== Collaborator dialog ===== */}
      <Dialog open={collabDialogOpen} onOpenChange={setCollabDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Colaboradores · {collabAreaName}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-1">
            Agrega o elimina colaboradores de esta área.
          </p>
          <div className="space-y-1 mt-2 max-h-56 overflow-y-auto">
            {collabList.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6 italic">Sin colaboradores</p>
            )}
            {collabList.map((c) => (
              <div key={c.id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg border border-border/50 bg-muted/20">
                <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-[11px] font-bold text-muted-foreground shrink-0">
                  {avatarInitials(c.nombreCompleto)}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-foreground">{c.nombreCompleto}</span>
                  <span className="text-[10px] text-muted-foreground ml-1.5">· {c.rol}</span>
                </div>
                {manage && (
                  <button
                    type="button"
                    disabled={collabSaving}
                    onClick={() => removeCollaborator(c.id)}
                    className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    title="Quitar del área"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCollabDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Area create/edit dialog ===== */}
      <Dialog open={areaDialogOpen} onOpenChange={setAreaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{areaEditing ? 'Editar Área' : 'Nueva Área'}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-1">
            {areaEditing ? 'Modifica los detalles del área.' : 'Crea una nueva área de trabajo.'}
          </p>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Nombre del Área *</Label>
              <Input
                value={areaForm.name}
                onChange={(e) => setAreaForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Tecnología"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Input
                value={areaForm.description}
                onChange={(e) => setAreaForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descripción del área..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAreaDialogOpen(false)}>Cancelar</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={!areaForm.name.trim() || areaSaving}
              onClick={saveArea}
            >
              {areaEditing ? 'Guardar Cambios' : 'Crear Área'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Project create/edit dialog ===== */}
      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{projectEditing ? 'Editar Proyecto' : 'Nuevo Proyecto'}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-1">
            {projectEditing ? 'Modifica los detalles del proyecto.' : 'Crea un proyecto y asigna los líderes que participan.'}
          </p>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Nombre del Proyecto *</Label>
              <Input
                value={projectForm.name}
                onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Migración Cloud"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea
                value={projectForm.description}
                onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descripción del proyecto..."
                className="mt-1 resize-none"
                rows={3}
              />
            </div>
            <div>
              <Label>Líderes de área (jefes)</Label>
              <p className="text-[11px] text-muted-foreground mb-2">Selecciona los jefes de área que participan. Sus equipos y tareas se mostrarán dentro del proyecto.</p>
              <div className="max-h-48 overflow-y-auto border border-border/60 rounded-lg p-2 space-y-1">
                {areaManagers.map((mgr) => {
                  const selected = projectForm.memberUserIds.includes(mgr.userId)
                  return (
                    <button
                      key={mgr.userId}
                      type="button"
                      onClick={() => toggleProjectMember(mgr.userId)}
                      className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors text-xs ${
                        selected ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 font-semibold' : 'hover:bg-muted/40 text-foreground'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selected ? 'border-red-500 bg-red-500' : 'border-border'
                      }`}>
                        {selected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 flex items-center justify-center text-[8px] font-bold text-red-600 dark:text-red-400 shrink-0">
                        {avatarInitials(mgr.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{mgr.name}</span>
                        <span className="text-muted-foreground ml-1.5">· Jefe de {mgr.areaName}</span>
                      </div>
                    </button>
                  )
                })}
                {areaManagers.length === 0 && <p className="text-xs text-muted-foreground/50 italic py-3 text-center">No hay jefes de área disponibles</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectDialogOpen(false)}>Cancelar</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={!projectForm.name.trim() || projectSaving}
              onClick={saveProject}
            >
              {projectEditing ? 'Guardar Cambios' : 'Crear Proyecto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Delete project dialog ===== */}
      <Dialog open={deleteProjectDialogOpen} onOpenChange={(open) => { if (!deletingProject) { setDeleteProjectDialogOpen(open); if (!open) setProjectToDelete(null) } }}>
        <DialogContent className="max-w-md p-6 rounded-xl gantt-scale-in text-center">
          <DialogHeader className="space-y-1 pb-0">
            <DialogTitle className="text-lg font-semibold text-center">Eliminar Proyecto</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed text-center">
            ¿Estás seguro de eliminar <strong>"{projectToDelete?.name}"</strong>? Las áreas seguirán existiendo pero ya no estarán agrupadas. Esta acción no se puede deshacer.
          </p>
          <DialogFooter className="flex-row justify-center gap-3 pt-4 sm:justify-center">
            <Button variant="outline" className="rounded-lg px-5" onClick={() => { setDeleteProjectDialogOpen(false); setProjectToDelete(null) }} disabled={deletingProject}>
              Cancelar
            </Button>
            <Button className="rounded-lg px-5 bg-red-500 hover:bg-red-600 text-white" onClick={confirmDeleteProject} disabled={deletingProject}>
              {deletingProject ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
