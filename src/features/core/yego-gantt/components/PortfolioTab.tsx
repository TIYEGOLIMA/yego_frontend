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
import { WorkosTabLoading } from './WorkosLoading'
import type { PortfolioTabProps, TaskRow, AreaGroup, AreaFull, ColaboradorDto, WorkspaceDto } from '../types'
import { PROJECT_ICON_CHOICES, projectIconByKey } from '../projectIcons'
import {
  STATUS_LABEL,
  STATUS_BG,
  PRIO_LABEL,
  PRIO_COLOR,
  tagColor,
  norm,
  avatarInitials,
} from '../utils'

/** Vista de cartera: subconjunto de tareas por criterio (p. ej. solo las de un proyecto). */
function sliceGroupTasks(g: AreaGroup, predicate: (t: TaskRow) => boolean): AreaGroup {
  const list = g.tasks.filter(predicate)
  const done = list.filter((t) => t.status === 'DONE').length
  const total = list.length
  return {
    ...g,
    tasks: list,
    done,
    total,
    progressPct: total > 0 ? Math.round((done / total) * 100) : 0,
  }
}

/** Mismo criterio que el Gantt: primer `assignedUserIds` o `assignedUserId`. */
function taskPrincipalUserId(t: TaskRow): number | undefined {
  if (t.assignedUserIds?.length) return t.assignedUserIds[0]
  if (t.assignedUserId != null) return t.assignedUserId
  return undefined
}

function principalUserIdsInAreaTasks(tasks: TaskRow[]): Set<number> {
  const s = new Set<number>()
  for (const t of tasks) {
    const p = taskPrincipalUserId(t)
    if (p != null) s.add(p)
  }
  return s
}

export function PortfolioTab({
  tasks,
  loading,
  manage,
  canManageWorkspaces,
  areas,
  workspaces,
  collaboratorNames,
  collaboratorsForArea,
  onEdit,
  onDelete,
  onCreateTask,
  onDeleteArea,
  onReload,
  onOpenTask,
}: PortfolioTabProps) {
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set())
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(() => new Set())
  const [unassignedProjectOpen, setUnassignedProjectOpen] = useState(false)

  // --- Project dialog ---
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [projectEditing, setProjectEditing] = useState<WorkspaceDto | null>(null)
  const [projectForm, setProjectForm] = useState({ name: '', description: '', iconKey: 'folder' })
  const [projectSaving, setProjectSaving] = useState(false)

  // --- Delete project dialog ---
  const [deleteProjectDialogOpen, setDeleteProjectDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<WorkspaceDto | null>(null)
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

    /** Solo áreas que tienen tareas en la vista de cartera (no todo el catálogo de áreas). */
    const areaIds = [...taskMap.keys()]

    return areaIds
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

  const unassignedGroups = useMemo(
    () =>
      groups
        .map((g) => sliceGroupTasks(g, (t) => t.workspaceId == null))
        .filter((g) => g.tasks.length > 0),
    [groups],
  )

  const unassignedStripMeta = useMemo(() => {
    const orphanTasks = tasks.filter((t) => t.workspaceId == null)
    const orphanDone = orphanTasks.filter((t) => t.status === 'DONE').length
    const orphanInProgress = orphanTasks.filter((t) => t.status === 'IN_PROGRESS').length
    const orphanBlocked = orphanTasks.filter((t) => t.status === 'BLOCKED').length
    const orphanPct = orphanTasks.length > 0 ? Math.round((orphanDone / orphanTasks.length) * 100) : 0
    const orphanCollabCount = (() => {
      const s = new Set<number>()
      for (const g of unassignedGroups) for (const c of g.collaborators) s.add(c.id)
      return s.size
    })()
    return {
      orphanTasks,
      orphanDone,
      orphanInProgress,
      orphanBlocked,
      orphanPct,
      orphanCollabCount,
    }
  }, [tasks, unassignedGroups])

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
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
      void onReload({ refreshCollaborators: true })
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
      const local = collaboratorsForArea(areaId).find((x) => x.id === userId)?.nombreCompleto?.trim()
      if (local) return local
      const global = collaboratorNames?.get(userId)?.trim()
      return global || null
    },
    [collaboratorsForArea, collaboratorNames],
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
        name: findCollabName(areaId, uid) || `Usuario #${uid}`,
      }))
    },
    [findCollabName],
  )

  // --- Project handlers ---
  const toggleProject = (id: number) =>
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const openProjectEdit = (p: WorkspaceDto) => {
    setProjectEditing(p)
    setProjectForm({
      name: p.name,
      description: p.description || '',
      iconKey: p.iconKey && p.iconKey.trim() !== '' ? p.iconKey : 'folder',
    })
    setProjectDialogOpen(true)
  }

  const saveProject = async () => {
    const workspace = projectEditing
    if (!workspace) return
    setProjectSaving(true)
    try {
      const payload = {
        name: projectForm.name.trim(),
        description: projectForm.description || null,
        iconKey: projectForm.iconKey || 'folder',
      }
      await api.put(`/yego-gantt/workspaces/${workspace.id}`, payload)
      setProjectDialogOpen(false)
      onReload()
    } catch { /* ignore */ }
    setProjectSaving(false)
  }

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return
    setDeletingProject(true)
    try {
      await api.delete(`/yego-gantt/workspaces/${projectToDelete.id}`)
      setDeleteProjectDialogOpen(false)
      setProjectToDelete(null)
      onReload()
    } catch { /* ignore */ }
    setDeletingProject(false)
  }

  const renderAreaCard = (g: AreaGroup, gIdx: number) => {
    const isOpen = expanded.has(g.areaId)
    const areaInfo = areas.find((a) => a.id === g.areaId)
    const principalsInTasks = principalUserIdsInAreaTasks(g.tasks)

    return (
      <div
        key={g.areaId}
        style={{ animationDelay: `${gIdx * 0.06}s` }}
        className="mx-2 sm:mx-3 my-2 rounded-xl border border-border bg-card/95 workos-shadow-soft hover:shadow-md transition-shadow duration-300 gantt-fade-in overflow-hidden dark:border-border/90"
      >
        <div
          className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer select-none transition-colors border-b border-transparent ${
            isOpen ? 'bg-muted/25 border-border/40' : 'hover:bg-muted/20'
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
          <div className="px-4 pb-4 pt-3 border-t border-border/50 bg-muted/15 dark:bg-muted/25 gantt-expand">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,300px)_1fr] gap-4">
              <div className="rounded-xl border border-border/70 bg-background dark:bg-card/90 shadow-sm p-4 ring-1 ring-border/30">
                <h4 className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-3 font-semibold flex items-center gap-2 pb-2 border-b border-border/50">
                  <span className="w-1 h-3.5 rounded-full bg-red-500/70 inline-block" />
                  Equipo del área
                </h4>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
                  {g.collaborators.length > 0 ? (
                    g.collaborators.map((c, cIdx) => {
                      const isManager = g.manager?.id === c.id
                      const isTaskPrincipal = principalsInTasks.has(c.id)
                      const showCrown = isManager || isTaskPrincipal
                      const crownTitle = isManager && isTaskPrincipal
                        ? 'Gerente del área y responsable en tareas'
                        : isManager
                          ? 'Gerente del área'
                          : 'Responsable principal (tarea)'
                      return (
                        <div
                          key={c.id}
                          style={{ animationDelay: `${cIdx * 0.05}s` }}
                          title={`${c.nombreCompleto} · ${c.rol}${showCrown ? ` · ${crownTitle}` : ''}`}
                          className="relative shrink-0 gantt-fade-in-left"
                        >
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                              showCrown
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-300/80 dark:border-amber-700/80 shadow-sm'
                                : 'bg-muted border-border/70 text-muted-foreground'
                            }`}
                          >
                            {avatarInitials(c.nombreCompleto)}
                          </div>
                          {showCrown && (
                            <Crown
                              className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 text-amber-500 drop-shadow-sm dark:text-amber-400"
                              aria-hidden
                            />
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-[11px] text-muted-foreground/60 italic py-2 w-full">Sin miembros asignados</p>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-border/70 bg-background dark:bg-card/90 shadow-sm p-4 ring-1 ring-border/30 min-w-0">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/50">
                  <h4 className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold flex items-center gap-2">
                    <span className="w-1 h-3.5 rounded-full bg-red-500/70 inline-block" />
                    Tareas del área
                  </h4>
                  {manage && (
                    <button
                      type="button"
                      onClick={() => onCreateTask(g.areaId)}
                      className="text-[11px] text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-0.5 font-semibold transition-colors"
                    >
                      + Nueva tarea
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {g.tasks.map((t, tIdx) => {
                    const pr = norm(t.priority)
                    const assignees = getAssignees(g.areaId, t)
                    const taskTags = t.tags ?? []
                    const principalId = taskPrincipalUserId(t)
                    return (
                      <div
                        key={t.id}
                        style={{ animationDelay: `${tIdx * 0.04}s` }}
                        className="flex items-center gap-3 py-2.5 px-3 rounded-lg border border-border/60 bg-muted/25 dark:bg-muted/20 hover:bg-muted/45 dark:hover:bg-muted/35 transition-all duration-200 cursor-pointer group gantt-fade-in-left"
                        onClick={() => (onOpenTask ?? onEdit)(t)}
                      >
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-md font-semibold shrink-0 whitespace-nowrap ${STATUS_BG[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                        <span className="text-xs text-foreground font-medium flex-1 min-w-0 truncate">{t.title}</span>
                        {taskTags.length > 0 && (
                          <div className="flex items-center gap-1 shrink-0">
                            {taskTags.map((tag, tagIdx) => (
                              <span key={tag} className={`text-[9px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${tagColor(tag, tagIdx)}`}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <span className="text-[10px] text-muted-foreground/70 shrink-0 tabular-nums flex items-center gap-1">
                          <svg className="w-2.5 h-2.5 text-muted-foreground/50" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="12" height="12" rx="2" /><path d="M5 1v2M11 1v2M1 6h14" /></svg>
                          {t.endDate.slice(5)}
                        </span>
                        {assignees.length > 0 ? (
                          <div className="flex items-center shrink-0 gap-1">
                            {assignees.map((a) => {
                              const isPrincipal = principalId != null && a.id === principalId
                              return (
                                <div
                                  key={a.id}
                                  className="relative shrink-0"
                                  title={isPrincipal ? `${a.name} · Responsable principal` : a.name}
                                >
                                  <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 border-2 border-background dark:border-card flex items-center justify-center text-[7px] font-bold text-red-600 dark:text-red-400">
                                    {avatarInitials(a.name)}
                                  </div>
                                  {isPrincipal && (
                                    <Crown className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 text-amber-500 drop-shadow-sm dark:text-amber-400" aria-hidden />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="w-6 shrink-0" />
                        )}
                        <span className={`text-[10px] font-semibold shrink-0 min-w-[48px] text-right ${PRIO_COLOR[pr]}`}>{PRIO_LABEL[pr]}</span>
                        {manage && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDelete(t)
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                  {g.tasks.length === 0 && <p className="text-[11px] text-muted-foreground/60 italic text-center py-8 rounded-lg border border-dashed border-border/60 bg-muted/10">Sin tareas asignadas.</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading && tasks.length === 0 && areas.length === 0) {
    return <WorkosTabLoading srLabel="Cargando cartera…" />
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden relative">
      {/* Stats strip */}
      <div className="px-4 py-3 mx-1 rounded-xl border border-border/80 bg-card workos-shadow-soft flex items-center gap-6 shrink-0 flex-wrap">
        <div className="flex items-center gap-1.5">
          <FolderKanban className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
          <span className="text-xs text-muted-foreground font-medium">Proyectos:</span>
          <span className="text-xs font-bold tabular-nums">{workspaces.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
          <span className="text-xs text-muted-foreground font-medium">Áreas con tareas:</span>
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
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onCreateTask()}
              className="h-8 text-xs gap-1.5 rounded-lg border-red-200/90 dark:border-red-800/60 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40"
              title="Abre el formulario de nueva tarea (equipo y espacio se eligen en el modal)"
            >
              <Plus className="w-3 h-3" />
              Nueva tarea
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
      <div className="flex-1 overflow-y-auto py-2 space-y-1">
        {groups.length === 0 && workspaces.length === 0 && unassignedGroups.length === 0 && (
          <div className="text-center py-16">
            <Building2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No hay proyectos ni tareas en cartera.</p>
          </div>
        )}

        {/* ===== ESPACIOS DE TRABAJO (proyectos): solo áreas con tareas en ese espacio ===== */}
        {workspaces.map((proj, pIdx) => {
          const isProjectOpen = expandedProjects.has(proj.id)
          const projectGroups = groups
            .map((g) => sliceGroupTasks(g, (t) => t.workspaceId === proj.id))
            .filter((g) => g.tasks.length > 0)

          // KPIs directos: tareas con workspaceId === proj.id
          const directTasks = tasks.filter((t) => t.workspaceId === proj.id)
          const directDone = directTasks.filter((t) => t.status === 'DONE').length
          const directInProgress = directTasks.filter((t) => t.status === 'IN_PROGRESS').length
          const directBlocked = directTasks.filter((t) => t.status === 'BLOCKED').length
          const directPct = directTasks.length > 0 ? Math.round((directDone / directTasks.length) * 100) : 0

          const projectTaskCount = directTasks.length
          const projectDoneCount = directDone
          const projectPct = directPct

          const projectCollabCount = (() => {
            const s = new Set<number>()
            for (const g of projectGroups) for (const c of g.collaborators) s.add(c.id)
            return s.size
          })()

          const ProjIcon = projectIconByKey(proj.iconKey)

          return (
            <div
              key={`proj-${proj.id}`}
              style={{ animationDelay: `${pIdx * 0.06}s` }}
              className="mx-2 sm:mx-3 my-3 rounded-xl border border-border/80 bg-card workos-shadow-soft hover:shadow-md transition-shadow duration-300 gantt-fade-in overflow-hidden ring-1 ring-[hsla(8,78%,57%,0.15)]"
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

                <div
                  className="h-9 w-9 shrink-0 rounded-lg bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white shadow-sm"
                  aria-hidden
                >
                  <ProjIcon className="w-[18px] h-[18px] stroke-[2]" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-foreground leading-tight">{proj.name}</h3>
                  {proj.description && (
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{proj.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1" title="Personas en áreas con tareas de este espacio de trabajo">
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

                {canManageWorkspaces && (
                  <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => openProjectEdit(proj)}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title="Editar espacio de trabajo"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setProjectToDelete(proj); setDeleteProjectDialogOpen(true) }}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                      title="Eliminar espacio de trabajo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Expanded: KPIs + areas */}
              {isProjectOpen && (
                <div className="border-t border-red-200/40 dark:border-red-800/30 gantt-expand">
                  {/* KPIs por espacio de trabajo */}
                  {directTasks.length > 0 && (
                    <div className="px-5 py-3 grid grid-cols-5 gap-3 border-b border-red-100/40 dark:border-red-900/20 bg-red-50/30 dark:bg-red-900/5">
                      <div className="text-center">
                        <div className="text-[11px] text-muted-foreground mb-0.5">Total</div>
                        <div className="text-base font-bold tabular-nums">{directTasks.length}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[11px] text-muted-foreground mb-0.5">Completadas</div>
                        <div className="text-base font-bold tabular-nums text-emerald-600">{directDone}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[11px] text-muted-foreground mb-0.5">En curso</div>
                        <div className="text-base font-bold tabular-nums text-amber-600">{directInProgress}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[11px] text-muted-foreground mb-0.5">Bloqueadas</div>
                        <div className="text-base font-bold tabular-nums text-red-600">{directBlocked}</div>
                      </div>
                      <div className="text-center" title="Tareas en estado Hecha respecto al total del proyecto">
                        <div className="text-[11px] text-muted-foreground mb-0.5">Progreso</div>
                        <div className="text-base font-bold tabular-nums">{directPct}%</div>
                      </div>
                    </div>
                  )}
                  {projectGroups.length === 0 && directTasks.length === 0 && (
                    <p className="text-xs text-muted-foreground/50 italic text-center py-6">
                      No hay tareas en este espacio de trabajo. Crea tareas y asígnalas desde el formulario de tarea o desde cada área.
                    </p>
                  )}
                  {projectGroups.map((g, gIdx) => renderAreaCard(g, gIdx))}
                </div>
              )}
            </div>
          )
        })}

        {/* Tareas sin espacio de trabajo: no se mezclan con el catálogo global de áreas */}
        {unassignedGroups.length > 0 && (
            <div
              key="proj-sin-espacio"
              className="mx-2 sm:mx-3 my-3 rounded-xl border border-border/80 bg-card workos-shadow-soft hover:shadow-md transition-shadow duration-300 gantt-fade-in overflow-hidden ring-1 ring-muted/40"
            >
              <div
                className={`flex items-center gap-3 px-5 py-4 cursor-pointer select-none transition-colors ${
                  unassignedProjectOpen ? 'bg-muted/20' : 'hover:bg-muted/10'
                }`}
                onClick={() => setUnassignedProjectOpen((o) => !o)}
              >
                <span className="text-muted-foreground shrink-0">
                  {unassignedProjectOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </span>
                <div
                  className="h-9 w-9 shrink-0 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shadow-sm border border-border/60"
                  aria-hidden
                >
                  <FolderKanban className="w-[18px] h-[18px] stroke-[2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-foreground leading-tight">Sin espacio de trabajo</h3>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    Tareas sin proyecto asignado ({unassignedGroups.length}{' '}
                    {unassignedGroups.length === 1 ? 'área' : 'áreas'})
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1" title="Personal en áreas listadas">
                    <UsersIcon className="w-3 h-3" /> {unassignedStripMeta.orphanCollabCount}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs tabular-nums text-muted-foreground font-medium">
                    {unassignedStripMeta.orphanDone}/{unassignedStripMeta.orphanTasks.length}
                  </span>
                  <div className="w-20 h-1.5 rounded-full bg-border/60 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-muted-foreground/60 to-muted-foreground/40 transition-all duration-500"
                      style={{ width: `${unassignedStripMeta.orphanPct}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground font-medium">
                    {unassignedStripMeta.orphanPct}%
                  </span>
                </div>
              </div>
              {unassignedProjectOpen && (
                <div className="border-t border-border/40 gantt-expand">
                  {unassignedStripMeta.orphanTasks.length > 0 && (
                    <div className="px-5 py-3 grid grid-cols-5 gap-3 border-b border-border/30 bg-muted/10">
                      <div className="text-center">
                        <div className="text-[11px] text-muted-foreground mb-0.5">Total</div>
                        <div className="text-base font-bold tabular-nums">{unassignedStripMeta.orphanTasks.length}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[11px] text-muted-foreground mb-0.5">Completadas</div>
                        <div className="text-base font-bold tabular-nums text-emerald-600">
                          {unassignedStripMeta.orphanDone}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[11px] text-muted-foreground mb-0.5">En curso</div>
                        <div className="text-base font-bold tabular-nums text-amber-600">
                          {unassignedStripMeta.orphanInProgress}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[11px] text-muted-foreground mb-0.5">Bloqueadas</div>
                        <div className="text-base font-bold tabular-nums text-red-600">
                          {unassignedStripMeta.orphanBlocked}
                        </div>
                      </div>
                      <div className="text-center" title="Tareas en estado Hecha respecto al total">
                        <div className="text-[11px] text-muted-foreground mb-0.5">Progreso</div>
                        <div className="text-base font-bold tabular-nums">{unassignedStripMeta.orphanPct}%</div>
                      </div>
                    </div>
                  )}
                  {unassignedGroups.map((g, gIdx) => renderAreaCard(g, gIdx))}
                </div>
              )}
            </div>
          )}
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

      {/* Edición de espacio de trabajo (la creación está en el selector del header WorkOS). */}
      <Dialog
        open={projectDialogOpen}
        onOpenChange={(open) => {
          setProjectDialogOpen(open)
          if (!open) setProjectEditing(null)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar espacio de trabajo</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-1">
            Nombre, descripción e icono. Se muestran en Cartera y en el selector superior.
          </p>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Icono</Label>
              <p className="text-[11px] text-muted-foreground mb-2">Se muestra junto al nombre en cartera y en el selector del header.</p>
              <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-8">
                {PROJECT_ICON_CHOICES.map(({ key, label, Icon }) => {
                  const sel = projectForm.iconKey === key
                  return (
                    <button
                      key={key}
                      type="button"
                      title={label}
                      onClick={() => setProjectForm((f) => ({ ...f, iconKey: key }))}
                      className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors border ${
                        sel
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-muted/50 text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4 stroke-[2]" />
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <Label>Nombre del espacio de trabajo *</Label>
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
                placeholder="Descripción del espacio de trabajo..."
                className="mt-1 resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectDialogOpen(false)}>Cancelar</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={!projectForm.name.trim() || projectSaving || !projectEditing}
              onClick={saveProject}
            >
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Delete project dialog ===== */}
      <Dialog open={deleteProjectDialogOpen} onOpenChange={(open) => { if (!deletingProject) { setDeleteProjectDialogOpen(open); if (!open) setProjectToDelete(null) } }}>
        <DialogContent className="max-w-md p-6 rounded-xl text-center">
          <DialogHeader className="space-y-1 pb-0">
            <DialogTitle className="text-lg font-semibold text-center">Eliminar espacio de trabajo</DialogTitle>
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
