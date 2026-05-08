import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
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
import {
  AlertCircle,
  Calendar,
  CalendarRange,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Crown,
  Flame,
  ListChecks,
  Loader2,
  PencilLine,
  Route,
  Trash2,
  User,
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
import { MeetingMinutesTab } from './components/MeetingMinutesTab'
import { WorkosCalendarTab } from './components/WorkosCalendarTab'
import { WorkosTaskChatPanel } from './components/WorkosTaskChatPanel'
import type {
  AreaTaskStatus,
  TaskPriority,
  TaskRow,
  AreaFull,
  ColaboradorDto,
  SprintDto,
  WorkspaceDto,
  Kpis,
  GanttOpenTaskHint,
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
  moveTaskSubtask,
  convertTaskToSubtask,
  parseGanttLoadError,
} from './ganttApi'
import type { GanttMasterData, GanttTaskSaveFormFields, TaskSubtaskDto } from './ganttApi'
import {
  normPriority,
  STATUS_LABEL,
  PRIORITY_LABEL,
  taskPoints,
  tagColor,
  PRIO_BADGE,
  computeDurationDays,
  ensureSubtaskDueNotBeforeParentStart,
} from './utils'
import {
  filterTasksForTimeline,
  tagsWithoutPrivateLabels,
  taskRowIsPrivate,
  taskIsMine,
  taskIsMyPrivate,
  canCollaboratorManageTaskBasics,
  type TimelineVisibilityFilter,
} from './taskPrivacy'
import { cn } from '@/utils/cn'
import { Avatar, PrincipalOwnerLine, ProgressBar } from './components/common'
import {
  SubtaskAssigneeDateGrid,
  SubtaskAreaWorkspaceRow,
  SubtaskDescriptionField,
  SubtaskDoneToggle,
} from './components/SubtaskFormFields'
import {
  buildAllCollaboratorsDeduped,
  buildAssigneePickerRows,
  buildCollaboratorNameMap,
  principalOwnerPrivateParts,
  principalOwnerPublicParts,
  principalSelectItemTextValue,
  type AssigneePickerRow,
} from './ganttCollaborators'
import {
  DETAIL_STATUS_PILL,
  DETAIL_TITLE_META_PILL,
  FORM_SUBTASK_CHECKBOX_CLASS,
  TASK_MODAL_FOCUS,
  canUserToggleSubtaskDone,
  SUBTASK_DONE_NOT_ALLOWED_HINT,
  formatDetailModalDate,
  ganttHasFullTabAccess,
  ganttCanCreateTasks,
  ganttCanManageWorkspaces,
  ganttIsPlatformAdmin,
  normalizeSubtaskDto,
  normalizeSubtaskDtoList,
  parentEndDateFromSubtasks,
  patchGanttParentFromSubtasks,
  resolveUserDefaultAreaId,
  type SubtaskModalBusy,
  todayYmdLocal,
  updateTaskSubtaskNormalized,
} from './lib'
import {
  CreateWorkspaceDialog,
  DeleteAreaConfirmDialog,
  DeleteSubtaskConfirmDialog,
  DeleteTaskConfirmDialog,
  GanttModuleHeader,
  GANTT_TAB_DEFINITIONS,
  HEADER_WORKSPACE_CREATE_VALUE,
} from './components/gantt-shell'
import { TaskFormWorkspaceTagsRow } from './components/task-modal/TaskFormWorkspaceTagsRow'
import { useTimelineTasksSubtasks } from './hooks/useTimelineTasksSubtasks'

function httpSubtaskMutateStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('response' in error)) return undefined
  return (error as { response?: { status?: number } }).response?.status
}

/** Fingerprint del formulario de tarea (sin % de progreso: las subtareas lo gestionan aparte). */
function taskModalFormDirtyFingerprint(f: {
  areaId: string
  workspaceId: string
  sprintId: string
  title: string
  description: string
  startDate: string
  endDate: string
  status: AreaTaskStatus
  priority: TaskPriority
  assignedUserIds: number[]
  tagsInput: string
  isPrivateTask: boolean
}): string {
  const tags = tagsWithoutPrivateLabels(
    f.tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
  )
  tags.sort()
  const assignees = [...f.assignedUserIds].sort((a, b) => a - b)
  return JSON.stringify({
    areaId: f.areaId,
    workspaceId: f.workspaceId,
    sprintId: f.sprintId,
    title: f.title.trim(),
    description: f.description.trim(),
    startDate: f.startDate,
    endDate: f.endDate,
    status: f.status,
    priority: f.priority,
    isPrivateTask: f.isPrivateTask,
    assignedUserIds: assignees,
    tags: tags.join(','),
  })
}

export function YegoGanttModule() {
  const user = useAuthStore((s) => s.user)
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [areas, setAreas] = useState<AreaFull[]>([])
  const [workspaces, setWorkspaces] = useState<WorkspaceDto[]>([])
  const [headerWorkspaceDialogOpen, setHeaderWorkspaceDialogOpen] = useState(false)
  const [headerWorkspaceForm, setHeaderWorkspaceForm] = useState({
    name: '',
    description: '',
    iconKey: 'folder',
  })
  const [headerWorkspaceSaving, setHeaderWorkspaceSaving] = useState(false)
  const [sprintById, setSprintById] = useState<Map<number, SprintDto>>(() => new Map())
  /** Por defecto «Mi espacio»; el usuario elige proyecto en el selector. */
  const [workspaceFilter, setWorkspaceFilter] = useState<string>('my_space')
  const [areaCollaborators, setAreaCollaborators] = useState<Map<number, ColaboradorDto[]>>(new Map())
  const [activeTab, setActiveTab] = useState<
    'gantt' | 'cartera' | 'board' | 'sprints' | 'actas' | 'calendar' | 'dashboard'
  >(() => (ganttHasFullTabAccess(useAuthStore.getState().user) ? 'sprints' : 'gantt'))
  const [actaSeedDate, setActaSeedDate] = useState<string | null>(null)
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
  /** Copia estable para `load()` sin repetir `/master`: no depender solo del estado en el closure. */
  const areasRef = useRef<AreaFull[]>([])
  const workspacesRef = useRef<WorkspaceDto[]>([])
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
  /** Filtro local en el modal crear/editar tarea (responsable y colaboradores). */
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('')
  const [subtasks, setSubtasks] = useState<TaskSubtaskDto[]>([])
  const [subtasksLoading, setSubtasksLoading] = useState(false)
  const [subtaskDraft, setSubtaskDraft] = useState({ title: '' })
  const [subtaskModalBusy, setSubtaskModalBusy] = useState<SubtaskModalBusy>('idle')
  /** Subtareas locales al crear tarea (se persisten tras POST). */
  const [pendingSubtasks, setPendingSubtasks] = useState<
    Array<{
      tempId: string
      title: string
      description: string
      done: boolean
      assignedUserId: number | null
      dueDate: string | null
      areaId: number
      workspaceId: number | null
    }>
  >([])
  /**
   * En edición: si la tarea tiene o ha tenido subtareas en esta sesión, el % no es manual
   * (lista vacía → 0% hasta cerrar el modal).
   */
  const [subtaskDrivenProgress, setSubtaskDrivenProgress] = useState(false)
  const [taskDetailOpen, setTaskDetailOpen] = useState(false)
  const [detailTaskId, setDetailTaskId] = useState<number | null>(null)
  /** Subtareas del modal de solo lectura (detalle desde board, etc.). */
  const [detailModalSubtasks, setDetailModalSubtasks] = useState<TaskSubtaskDto[]>([])
  const [detailModalSubtasksLoading, setDetailModalSubtasksLoading] = useState(false)
  const [detailSubtaskBusyId, setDetailSubtaskBusyId] = useState<number | null>(null)
  /** Aviso visible dentro del modal (setErr queda detrás del diálogo). */
  const [detailSubtaskBlockedMsg, setDetailSubtaskBlockedMsg] = useState<string | null>(null)
  const [editSubtaskBlockedMsg, setEditSubtaskBlockedMsg] = useState<string | null>(null)
  /** Mover subtarea a otra tarea padre (diálogo desde el modal editar). */
  const [subtaskMoveTargetRow, setSubtaskMoveTargetRow] = useState<TaskSubtaskDto | null>(null)
  const [subtaskMoveParentChoice, setSubtaskMoveParentChoice] = useState<string>('')
  /**
   * Al elegir otro espacio para una subtarea: convertir en tarea o colgar bajo un padre «Por definir»
   * en el espacio destino (no aplica si solo se limpia el espacio → herencia).
   */
  const [subtaskWorkspaceRelocation, setSubtaskWorkspaceRelocation] = useState<{
    subtask: TaskSubtaskDto
    nextWorkspaceId: number
  } | null>(null)
  const [relocationTargetTasks, setRelocationTargetTasks] = useState<TaskRow[] | null>(null)
  const [relocationTargetTasksLoading, setRelocationTargetTasksLoading] = useState(false)
  const [relocationSelectedParentId, setRelocationSelectedParentId] = useState<string>('')
  const [subtaskPendingDelete, setSubtaskPendingDelete] = useState<TaskSubtaskDto | null>(null)
  const [subtaskDeleteInProgress, setSubtaskDeleteInProgress] = useState(false)
  /** Convertir la tarea principal en subtarea de otra. */
  const [taskConvertToSubtaskDialogOpen, setTaskConvertToSubtaskDialogOpen] = useState(false)
  const [taskConvertToSubtaskCandidates, setTaskConvertToSubtaskCandidates] = useState<TaskRow[] | null>(null)
  const [taskConvertToSubtaskLoading, setTaskConvertToSubtaskLoading] = useState(false)
  const [taskConvertToSubtaskSelectedId, setTaskConvertToSubtaskSelectedId] = useState<string>('')
  /** Tras cambiar el filtro de espacio para abrir una tarea: esperar a que `load()` traiga la lista nueva. */
  const pendingOpenTaskIdRef = useRef<number | null>(null)
  const pendingSawWorkspaceSwitchingRef = useRef(false)
  const mergeTimelineSubtasksForParentRef = useRef<
    ((parentId: number, list: TaskSubtaskDto[]) => void) | null
  >(null)
  /** Valor de `taskModalFormDirtyFingerprint` al abrir edición; el botón «Guardar» solo si difiere del form actual. */
  const taskEditFormBaselineRef = useRef<string | null>(null)

  const manage = useMemo(() => ganttHasFullTabAccess(user), [user])
  const canCreateTasks = useMemo(() => ganttCanCreateTasks(user), [user])
  const canManageWorkspaces = useMemo(() => ganttCanManageWorkspaces(user), [user])

  const canEditSubtasksInTaskModal = useMemo(() => {
    if (manage) return true
    if (!editing) return canCreateTasks
    return canCollaboratorManageTaskBasics(editing, user?.id)
  }, [manage, editing, user?.id, canCreateTasks])

  const subtaskAssigneeReadOnlyLabel = useMemo(() => {
    if (canEditSubtasksInTaskModal || !user) return null
    const label = (user.name || user.username || '').trim()
    return label || `Usuario ${user.id}`
  }, [canEditSubtasksInTaskModal, user])

  const loadCollaborators = useCallback(async (areaList: AreaFull[], requestId: number) => {
    const map = await fetchAreaCollaboratorsMap(areaList)
    if (requestId !== ganttFullLoadSeqRef.current) return
    setAreaCollaborators(map)
  }, [])

  const reloadTasksAndKpis = useCallback(async (): Promise<TaskRow[] | null> => {
    const requestId = ++tasksKpisSeqRef.current
    const fullSeq = ++ganttFullLoadSeqRef.current
    const { tasks: nextTasks, kpis: nextKpis } = await fetchGanttTaskSummary(
      'all',
      'all',
      workspaceFilter,
      'all',
    )
    if (requestId !== tasksKpisSeqRef.current) return null
    if (fullSeq !== ganttFullLoadSeqRef.current) return null
    setTasks(nextTasks)
    setKpis(nextKpis)
    return nextTasks
  }, [workspaceFilter])

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

  const applySubtaskListToParentState = useCallback(
    (parentId: number, list: TaskSubtaskDto[]) => {
      patchGanttParentFromSubtasks(parentId, list, setTasks, setKpis)
      mergeTimelineSubtasksForParentRef.current?.(parentId, list)
      setForm((f) => {
        if (editing?.id !== parentId) return f
        const nextEnd = parentEndDateFromSubtasks(f.startDate, f.endDate, list)
        return nextEnd !== f.endDate ? { ...f, endDate: nextEnd } : f
      })
    },
    [editing?.id],
  )

  const pickDefaultSprintIdForWorkspace = useCallback(
    (wsId: number): number | null => {
      const list = [...sprintById.values()].filter((s) => s.workspaceId === wsId)
      const active = list.find((s) => s.status === 'ACTIVE')
      if (active) return active.id
      const planned = list.filter((s) => s.status === 'PLANNED').sort((a, b) => a.id - b.id)
      if (planned.length > 0) return planned[0]!.id
      const rest = list.sort((a, b) => a.id - b.id)
      return rest.length > 0 ? rest[0]!.id : null
    },
    [sprintById],
  )

  const confirmSubtaskWorkspaceRelocation = useCallback(
    async (mode: 'standalone' | 'nested' | 'existing') => {
      const ctx = subtaskWorkspaceRelocation
      if (!editing || ctx == null) return
      const st = ctx.subtask
      const nextWs = ctx.nextWorkspaceId
      setSubtaskModalBusy('updating')
      try {
        if (mode === 'existing') {
          const targetParentId = Number(relocationSelectedParentId)
          if (!Number.isFinite(targetParentId)) return
          await moveTaskSubtask(editing.id, st.id, targetParentId)
          setSubtasks((prev) => {
            const nl = prev.filter((x) => x.id !== st.id)
            applySubtaskListToParentState(editing.id, nl)
            return nl
          })
          setSubtaskWorkspaceRelocation(null)
          const targetWs = String(nextWs)
          if (targetWs !== workspaceFilter) {
            pendingOpenTaskIdRef.current = targetParentId
            setWorkspaceFilter(targetWs)
          } else {
            pendingOpenTaskIdRef.current = targetParentId
            await reloadTasksAndKpis()
          }
          return
        }

        const parentPriv = taskRowIsPrivate(editing)
        const areaId = st.areaId ?? editing.areaId
        const sprintId = parentPriv ? null : pickDefaultSprintIdForWorkspace(nextWs)
        
        const startYmd = (form.startDate || editing.startDate || '').slice(0, 10)
        const parentEndFallback = (form.endDate || editing.endDate || '').slice(0, 10)
        let endYmd =
          mode === 'standalone'
            ? ensureSubtaskDueNotBeforeParentStart(st.dueDate, startYmd) || parentEndFallback
            : parentEndFallback
        if (startYmd && endYmd < startYmd) endYmd = startYmd
        if (!startYmd || !endYmd) {
          setErr('Completa las fechas de la tarea antes de cambiar el espacio de la subtarea.')
          setSubtaskModalBusy('idle')
          return
        }
        if (mode === 'standalone') {
          const formSnapshot: GanttTaskSaveFormFields = {
            areaId: String(areaId),
            workspaceId: String(nextWs),
            sprintId: sprintId != null ? String(sprintId) : '',
            title: st.title.trim() || 'Sin título',
            description: (st.description ?? '').trim(),
            startDate: startYmd,
            endDate: endYmd,
            status: st.done ? 'DONE' : 'PENDING',
            priority: editing.priority ?? 'MEDIUM',
            isPrivateTask: parentPriv,
            assignedUserIds:
              st.assignedUserId != null ? [st.assignedUserId] : [...form.assignedUserIds],
          }
          const payload = buildGanttTaskSavePayload(formSnapshot, st.done ? 100 : 0, [])
          const res = await api.post<TaskRow>('/yego-gantt/tasks', payload)
          const newTask = res.data
          await deleteTaskSubtask(editing.id, st.id)
          setSubtasks((prev) => {
            const nl = prev.filter((x) => x.id !== st.id)
            applySubtaskListToParentState(editing.id, nl)
            return nl
          })
          setSubtaskWorkspaceRelocation(null)
          const targetWs = String(nextWs)
          if (targetWs !== workspaceFilter) {
            pendingOpenTaskIdRef.current = newTask.id
            setWorkspaceFilter(targetWs)
          } else {
            pendingOpenTaskIdRef.current = newTask.id
            await reloadTasksAndKpis()
          }
        } else {
          const formSnapshot: GanttTaskSaveFormFields = {
            areaId: String(areaId),
            workspaceId: String(nextWs),
            sprintId: sprintId != null ? String(sprintId) : '',
            title: 'Por definir',
            description: '',
            startDate: startYmd,
            endDate: endYmd,
            status: 'PENDING',
            priority: editing.priority ?? 'MEDIUM',
            isPrivateTask: parentPriv,
            assignedUserIds:
              form.assignedUserIds.length > 0
                ? [...form.assignedUserIds]
                : user?.id != null
                  ? [user.id]
                  : [],
          }
          const payload = buildGanttTaskSavePayload(formSnapshot, 0, [])
          const res = await api.post<TaskRow>('/yego-gantt/tasks', payload)
          const shellParent = res.data
          await moveTaskSubtask(editing.id, st.id, shellParent.id)
          setSubtasks((prev) => {
            const nl = prev.filter((x) => x.id !== st.id)
            applySubtaskListToParentState(editing.id, nl)
            return nl
          })
          setSubtaskWorkspaceRelocation(null)
          const targetWs = String(nextWs)
          if (targetWs !== workspaceFilter) {
            pendingOpenTaskIdRef.current = shellParent.id
            setWorkspaceFilter(targetWs)
          } else {
            pendingOpenTaskIdRef.current = shellParent.id
            await reloadTasksAndKpis()
          }
        }
      } catch (e: unknown) {
        setErr(parseGanttLoadError(e))
      } finally {
        setSubtaskModalBusy('idle')
      }
    },
    [
      subtaskWorkspaceRelocation,
      editing,
      form.startDate,
      form.endDate,
      form.assignedUserIds,
      pickDefaultSprintIdForWorkspace,
      workspaceFilter,
      reloadTasksAndKpis,
      applySubtaskListToParentState,
      user?.id,
      relocationSelectedParentId,
    ],
  )

  const confirmConvertToSubtask = useCallback(async () => {
    if (!editing || !taskConvertToSubtaskSelectedId) return
    const targetParentId = Number(taskConvertToSubtaskSelectedId)
    if (!Number.isFinite(targetParentId) || targetParentId === editing.id) return

    setTaskConvertToSubtaskLoading(true)
    try {
      await convertTaskToSubtask(editing.id, targetParentId)
      
      // Update local state: remove the converted task from the list
      setTasks((prev) => prev.filter((t) => t.id !== editing.id))
      
      // We should ideally reload tasks and kpis to reflect progress changes on the parent
      await reloadTasksAndKpis()

      // Also refresh the subtasks list for the parent in the timeline
      try {
        const rows = await fetchTaskSubtasks(targetParentId)
        setSubtasksByParentId((prev) => new Map(prev).set(targetParentId, normalizeSubtaskDtoList(rows)))
      } catch (e) {
        console.error('Failed to refresh parent subtasks after conversion', e)
      }
      
      setTaskConvertToSubtaskDialogOpen(false)
      setDialogOpen(false)
    } catch (e: unknown) {
      setErr(parseGanttLoadError(e))
    } finally {
      setTaskConvertToSubtaskLoading(false)
    }
  }, [editing, taskConvertToSubtaskSelectedId, reloadTasksAndKpis])

  const handleDropTaskToSubtask = useCallback(async (sourceTaskId: number, targetTaskId: number) => {
    if (sourceTaskId === targetTaskId) return
    const sourceTask = tasks.find(t => t.id === sourceTaskId)
    // Avoid if source task has subtasks visually loaded, though backend validates this too
    if (sourceTask && (sourceTask.subtaskTotal ?? 0) > 0) {
      setErr('No puedes convertir una tarea con subtareas en una subtarea.')
      return
    }

    setTaskConvertToSubtaskLoading(true)
    try {
      await convertTaskToSubtask(sourceTaskId, targetTaskId)
      setTasks((prev) => prev.filter((t) => t.id !== sourceTaskId))
      await reloadTasksAndKpis()

      // Also refresh the subtasks list for the parent in the timeline
      try {
        const rows = await fetchTaskSubtasks(targetTaskId)
        setSubtasksByParentId((prev) => new Map(prev).set(targetTaskId, normalizeSubtaskDtoList(rows)))
      } catch (e) {
        console.error('Failed to refresh parent subtasks after conversion drop', e)
      }
    } catch (e: unknown) {
      setErr(parseGanttLoadError(e) || 'Error al convertir la tarea')
    } finally {
      setTaskConvertToSubtaskLoading(false)
    }
  }, [tasks, reloadTasksAndKpis])

  useEffect(() => {
    if (!subtaskWorkspaceRelocation) {
      setRelocationTargetTasks(null)
      setRelocationTargetTasksLoading(false)
      setRelocationSelectedParentId('')
      return
    }
    let cancelled = false
    setRelocationTargetTasksLoading(true)
    setRelocationSelectedParentId('')
    void fetchGanttTaskSummary('all', 'all', String(subtaskWorkspaceRelocation.nextWorkspaceId), 'all')
      .then((res) => {
        if (!cancelled) setRelocationTargetTasks(res.tasks)
      })
      .catch(() => {
        if (!cancelled) setRelocationTargetTasks([])
      })
      .finally(() => {
        if (!cancelled) setRelocationTargetTasksLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [subtaskWorkspaceRelocation])

  const handleTimelineSubtasksSynced = useCallback(
    (parentId: number, list: TaskSubtaskDto[]) => {
      applySubtaskListToParentState(parentId, list)
      scheduleReloadTasksAndKpisAfterSubtasks()
    },
    [applySubtaskListToParentState, scheduleReloadTasksAndKpisAfterSubtasks],
  )

  const subtaskParentMoveCandidates = useMemo(() => {
    const curId = editing?.id
    if (curId == null) return [] as { id: number; title: string; secondary: string }[]
    const areaLabel = (id: number) => areas.find((a) => a.id === id)?.name?.trim() ?? `Equipo ${id}`
    return tasks
      .filter((t) => t.id !== curId)
      .map((t) => {
        const secondary = [t.areaName?.trim() || areaLabel(t.areaId), t.privateTask ? 'Privada' : null]
          .filter(Boolean)
          .join(' · ')
        return { id: t.id, title: t.title.trim() || `Tarea #${t.id}`, secondary }
      })
      .sort((a, b) => {
        const x = `${a.secondary}\t${a.title}`
        const y = `${b.secondary}\t${b.title}`
        return x.localeCompare(y, undefined, { sensitivity: 'base' })
      })
  }, [tasks, editing?.id, areas])

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

  const load = useCallback(
    async (opts?: { refreshCollaborators?: boolean; refreshMaster?: boolean }) => {
    if (loadInFlightRef.current) {
      await loadInFlightRef.current
      return
    }
    const requestId = ++ganttFullLoadSeqRef.current
    const run = (async () => {
      const isFirstLoad = !hasLoadedOnceRef.current
      let refreshMaster = isFirstLoad || opts?.refreshMaster === true
      if (!refreshMaster && areasRef.current.length === 0) {
        refreshMaster = true
      }
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
        const [summaryPack, masterOpt] = await Promise.all([
          fetchGanttTaskSummary('all', 'all', workspaceFilter, 'all'),
          refreshMaster ? fetchGanttMasterData() : Promise.resolve<GanttMasterData | null>(null),
        ])
        if (requestId !== ganttFullLoadSeqRef.current) return
        setTasks(summaryPack.tasks)
        setKpis(summaryPack.kpis)

        let ar: AreaFull[]
        let ws: WorkspaceDto[]
        if (masterOpt) {
          ar = masterOpt.areas
          ws = masterOpt.workspaces
          setAreas(ar)
          setWorkspaces(ws)
        } else {
          ar = areasRef.current
          ws = workspacesRef.current
        }
        areasRef.current = ar
        workspacesRef.current = ws

        if (refreshMaster) {
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
        }

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
  }, [workspaceFilter, loadCollaborators])


  const workspacePickerBusy = loading || workspaceSwitching

  const handleWorkspaceFilterChange = useCallback(
    (next: string) => {
      if (next === HEADER_WORKSPACE_CREATE_VALUE) {
        if (workspacePickerBusy || !canManageWorkspaces) return
        setHeaderWorkspaceForm({ name: '', description: '', iconKey: 'folder' })
        setHeaderWorkspaceDialogOpen(true)
        return
      }
      if (next === workspaceFilter) return
      if (workspacePickerBusy) return
      if (hasLoadedOnceRef.current) {
        setWorkspaceSwitching(true)
      }
      setWorkspaceFilter(next)
    },
    [workspaceFilter, workspacePickerBusy, canManageWorkspaces],
  )

  const saveHeaderWorkspace = useCallback(async () => {
    const name = headerWorkspaceForm.name.trim()
    if (!name) return
    setHeaderWorkspaceSaving(true)
    setErr(null)
    try {
      const res = await api.post<WorkspaceDto>('/yego-gantt/workspaces', {
        name,
        description: headerWorkspaceForm.description.trim() || undefined,
        iconKey: headerWorkspaceForm.iconKey?.trim() || 'folder',
      })
      const created = res.data
      setHeaderWorkspaceDialogOpen(false)
      await load({ refreshMaster: true })
      setWorkspaceFilter(String(created.id))
    } catch (e: unknown) {
      setErr(parseGanttLoadError(e))
    } finally {
      setHeaderWorkspaceSaving(false)
    }
  }, [headerWorkspaceForm, load])

  /** Espacio por defecto: siempre «Mi espacio». Solo se ajusta el filtro si el proyecto elegido dejó de existir. */
  useEffect(() => {
    if (workspaces.length === 0) {
      setWorkspaceFilter('my_space')
      return
    }
    setWorkspaceFilter((prev) => {
      const ids = new Set(workspaces.map((p) => String(p.id)))
      if (prev === 'my_space') return 'my_space'
      if (ids.has(prev)) return prev
      return 'my_space'
    })
  }, [workspaces])

  useEffect(() => {
    load()
  }, [load])

  useLayoutEffect(() => {
    if (workspaceFilter !== 'my_space') return
    setTimelineVisibility((v) => (v === 'default' ? 'all' : v))
  }, [workspaceFilter])

  const tasksForTimeline = useMemo(
    () => filterTasksForTimeline(tasks, timelineVisibility, user?.id ?? null),
    [tasks, timelineVisibility, user?.id],
  )

  const { subtasksByParentId, setSubtasksByParentId } = useTimelineTasksSubtasks(tasksForTimeline)
  mergeTimelineSubtasksForParentRef.current = (parentId, list) => {
    setSubtasksByParentId((prev) => new Map(prev).set(parentId, [...list]))
  }

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

  const allSprints = useMemo(() => [...sprintById.values()], [sprintById])

  const formSubtaskCount = editing ? subtasks.length : pendingSubtasks.length
  const formSubtaskDone = editing
    ? subtasks.filter((s) => s.done).length
    : pendingSubtasks.filter((s) => s.done).length
  /** `null` = porcentaje reflejado desde el guardado (solo lectura en UI); número = derivado de subtareas en el formulario. */
  const progressFromFormSubtasks =
    formSubtaskCount > 0
      ? Math.floor((100 * formSubtaskDone) / formSubtaskCount)
      : editing && subtaskDrivenProgress
        ? 0
        : null
  const displayProgressValue =
    progressFromFormSubtasks != null
      ? progressFromFormSubtasks
      : Math.min(100, Math.max(0, Number(form.progressPercent) || 0))

  const collaboratorsForArea = useCallback(
    (areaId: number): ColaboradorDto[] => areaCollaborators.get(areaId) || [],
    [areaCollaborators],
  )

  const {
    assigneePickerList,
    allCollaborators,
    collaboratorNames,
  } = useMemo((): {
    assigneePickerList: AssigneePickerRow[]
    allCollaborators: ColaboradorDto[]
    collaboratorNames: Map<number, string>
  } => {
    const assigneePickerList = buildAssigneePickerRows(areas, areaCollaborators)
    return {
      assigneePickerList,
      allCollaborators: buildAllCollaboratorsDeduped(areaCollaborators),
      collaboratorNames: buildCollaboratorNameMap(assigneePickerList),
    }
  }, [areas, areaCollaborators])

  const assigneePickerFiltered = useMemo(() => {
    const q = assigneeSearchQuery.trim().toLowerCase()
    const assigned = new Set(form.assignedUserIds)
    const matches = (c: AssigneePickerRow) => {
      if (!q) return true
      const name = (c.nombreCompleto || '').toLowerCase()
      const areaL = (c.areaNamesLabel || '').toLowerCase()
      const role = (c.rol || '').toLowerCase()
      return name.includes(q) || areaL.includes(q) || role.includes(q)
    }
    return assigneePickerList.filter((c) => matches(c) || assigned.has(c.id))
  }, [assigneePickerList, assigneeSearchQuery, form.assignedUserIds])

  const taskPrincipalOwnerRow = useMemo(() => {
    const oid = form.assignedUserIds[0]
    if (oid == null) return null
    const row = assigneePickerList.find((c) => c.id === oid)
    return form.isPrivateTask
      ? principalOwnerPrivateParts(row, oid, user, form.areaId, areas)
      : principalOwnerPublicParts(row, oid)
  }, [form.assignedUserIds, form.isPrivateTask, form.areaId, assigneePickerList, user, areas])

  const workspaceNameById = useMemo(
    () => new Map(workspaces.map((w) => [w.id, w.name])),
    [workspaces],
  )

  const isMySpaceView = workspaceFilter === 'my_space'

  const workspacesInScope = useMemo(() => {
    if (workspaceFilter === 'my_space') return workspaces
    return workspaces.filter((p) => String(p.id) === workspaceFilter)
  }, [workspaces, workspaceFilter])

  const taskAlertNotifications = useMemo(
    () => buildTaskAlertNotifications(tasks, dismissedTaskIds),
    [tasks, dismissedTaskIds],
  )

  const allNotifications = useMemo(
    () => [...taskAlertNotifications, ...pulseNotifications].slice(0, 40),
    [taskAlertNotifications, pulseNotifications],
  )

  useEffect(() => {
    if (!dialogOpen) {
      taskEditFormBaselineRef.current = null
    }
  }, [dialogOpen])

  const isEditTaskFormDirty = useMemo(() => {
    if (editing == null) return false
    const b = taskEditFormBaselineRef.current
    if (b == null) return true
    return taskModalFormDirtyFingerprint(form) !== b
  }, [form, editing])

  useEffect(() => {
    if (!dialogOpen || !editing) {
      setSubtaskDrivenProgress(false)
      return
    }
    setSubtaskDrivenProgress((editing.subtaskTotal ?? 0) > 0)
  }, [dialogOpen, editing?.id])

  useEffect(() => {
    if (!editing || !dialogOpen || subtasksLoading) return
    if (subtasks.length > 0) setSubtaskDrivenProgress(true)
  }, [editing, dialogOpen, subtasksLoading, subtasks.length])

  useEffect(() => {
    setDismissedTaskIds((d) => d.filter((id) => tasks.some((t) => t.id === id)))
  }, [tasks])

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
    presetDates?: { startDate: string; endDate: string },
  ) => {
    setTaskFormSaving(false)
    setEditing(null)
    const start = presetDates?.startDate ?? new Date().toISOString().slice(0, 10)
    const end = presetDates?.endDate ?? new Date().toISOString().slice(0, 10)
    const vistaMiEspacio = workspaceFilter === 'my_space'
    const areaFromProfile = resolveUserDefaultAreaId(user, areas)
    const areaIdStr =
      presetAreaId != null
        ? String(presetAreaId)
        : vistaMiEspacio
          ? areaFromProfile || areas[0]?.id?.toString() || ''
          : areas[0]?.id?.toString() || ''
    const assignedUserIdsNew = user?.id != null ? [user.id] : ([] as number[])
    setForm({
      areaId: areaIdStr,
      workspaceId:
        presetWorkspaceId != null
          ? String(presetWorkspaceId)
          : workspaceFilter !== 'my_space' && workspaces.some((w) => String(w.id) === workspaceFilter)
            ? workspaceFilter
            : '',
      sprintId: presetSprintId != null ? String(presetSprintId) : '',
      title: '',
      description: '',
      startDate: start,
      endDate: end,
      status: presetStatus ?? 'PENDING',
      priority: 'MEDIUM',
      progressPercent: '0',
      assignedUserIds: assignedUserIdsNew,
      tagsInput: '',
      isPrivateTask: false,
    })
    setFormErrors({})
    setPendingSubtasks([])
    setAssigneeSearchQuery('')
    taskEditFormBaselineRef.current = null
    setDialogOpen(true)
  }

  /** Tras cargar `areas`, rellena equipo/responsable en creación privada si iban vacíos. */
  useEffect(() => {
    if (!dialogOpen || editing != null || areas.length === 0 || !form.isPrivateTask) return
    const myArea = resolveUserDefaultAreaId(user, areas)
    const uid = user?.id
    setForm((f) => {
      if (!f.isPrivateTask) return f
      const patch: Partial<typeof f> = {}
      if (!f.areaId && myArea) patch.areaId = myArea
      if (uid != null && f.assignedUserIds.length === 0) patch.assignedUserIds = [uid]
      return Object.keys(patch).length > 0 ? { ...f, ...patch } : f
    })
  }, [dialogOpen, editing, areas, form.isPrivateTask, user])

  const openEdit = (t: TaskRow) => {
    setTaskFormSaving(false)
    setEditing(t)
    setPendingSubtasks([])
    const effectivePrivate = Boolean(t.privateTask)
    const rawIds = t.assignedUserIds?.length
      ? [...t.assignedUserIds]
      : t.assignedUserId != null
        ? [t.assignedUserId]
        : []
    const assignedIds =
      effectivePrivate && rawIds.length > 0
        ? rawIds
        : effectivePrivate
          ? user?.id != null && t.createdByUserId === user.id
            ? [user.id]
            : []
          : rawIds
    const nextForm = {
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
    }
    taskEditFormBaselineRef.current = taskModalFormDirtyFingerprint(nextForm)
    setForm(nextForm)
    setFormErrors({})
    setAssigneeSearchQuery('')
    setDialogOpen(true)
  }

  const validateForm = (): Record<string, string> => {
    const errors: Record<string, string> = {}
    if (!form.title.trim()) errors.title = 'El nombre es obligatorio'
    if (!form.areaId) errors.areaId = 'Selecciona un equipo'

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
    const effectivePrivate = form.isPrivateTask
    const parsedTags = tagsWithoutPrivateLabels(
      form.tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    )
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
            const subtaskAssigneePersist =
              row.assignedUserId ??
              formSnapshot.assignedUserIds[0] ??
              user?.id ??
              null
            await createTaskSubtask(newTaskId, {
              title: st,
              weight: 1,
              done: row.done,
              areaId: row.areaId,
              ...(row.workspaceId != null ? { workspaceId: row.workspaceId } : {}),
              ...(subtaskAssigneePersist != null ? { assignedUserId: subtaskAssigneePersist } : {}),
              ...((): { dueDate?: string } => {
                const d = ensureSubtaskDueNotBeforeParentStart(row.dueDate, form.startDate)
                return d != null ? { dueDate: d } : {}
              })(),
              ...(row.description != null && row.description.trim() !== ''
                ? { description: row.description.trim() }
                : {}),
            })
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

  const confirmDeleteSubtask = async () => {
    if (!editing || subtaskPendingDelete == null) return
    const taskId = editing.id
    const subId = subtaskPendingDelete.id
    setSubtaskDeleteInProgress(true)
    try {
      await deleteTaskSubtask(taskId, subId)
      setSubtasks((prev) => {
        const nextList = prev.filter((x) => x.id !== subId)
        applySubtaskListToParentState(taskId, nextList)
        return nextList
      })
      scheduleReloadTasksAndKpisAfterSubtasks()
      setSubtaskPendingDelete(null)
    } catch {
      setErr('No se pudo eliminar la subtarea')
    } finally {
      setSubtaskDeleteInProgress(false)
    }
  }

  const openTaskDetail = useCallback((t: TaskRow) => {
    setDetailTaskId(t.id)
    setTaskDetailOpen(true)
  }, [])

  const onOpenTaskById = useCallback(
    async (taskId: number, hint?: GanttOpenTaskHint) => {
      const tryOpen = (list: TaskRow[]) => {
        const t = list.find((x) => x.id === taskId)
        if (t) {
          pendingOpenTaskIdRef.current = null
          openTaskDetail(t)
          return true
        }
        return false
      }
      if (tryOpen(tasks)) return

      setErr(null)
      const targetWs =
        hint?.privateTask || hint?.workspaceId == null
          ? 'my_space'
          : String(hint.workspaceId)

      if (targetWs !== workspaceFilter) {
        pendingOpenTaskIdRef.current = taskId
        setWorkspaceFilter(targetWs)
        return
      }

      const nextList = await reloadTasksAndKpis()
      if (nextList && tryOpen(nextList)) return

      setErr(
        'La tarea no está en la lista actual. Cambia el espacio de trabajo, recarga o ábrela desde el board.',
      )
    },
    [tasks, openTaskDetail, workspaceFilter, reloadTasksAndKpis],
  )

  useEffect(() => {
    const pid = pendingOpenTaskIdRef.current
    if (pid == null) {
      pendingSawWorkspaceSwitchingRef.current = false
      return
    }
    if (workspaceSwitching) pendingSawWorkspaceSwitchingRef.current = true

    const t = tasks.find((x) => x.id === pid)
    if (t) {
      pendingOpenTaskIdRef.current = null
      pendingSawWorkspaceSwitchingRef.current = false
      openTaskDetail(t)
      return
    }

    if (
      pendingSawWorkspaceSwitchingRef.current &&
      !workspaceSwitching &&
      !loading &&
      !refreshing
    ) {
      pendingOpenTaskIdRef.current = null
      pendingSawWorkspaceSwitchingRef.current = false
      setErr(
        'La tarea no está en la lista actual. Cambia el espacio de trabajo, recarga o ábrela desde el board.',
      )
    }
  }, [tasks, loading, refreshing, workspaceSwitching, openTaskDetail])

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

  useEffect(() => {
    if (!taskDetailOpen) setDetailSubtaskBusyId(null)
  }, [taskDetailOpen])

  useEffect(() => {
    if (!taskDetailOpen) setDetailSubtaskBlockedMsg(null)
  }, [taskDetailOpen])

  useEffect(() => {
    if (!detailSubtaskBlockedMsg) return
    const tid = window.setTimeout(() => setDetailSubtaskBlockedMsg(null), 9000)
    return () => window.clearTimeout(tid)
  }, [detailSubtaskBlockedMsg])

  useEffect(() => {
    if (!dialogOpen) {
      setEditSubtaskBlockedMsg(null)
      setSubtaskPendingDelete(null)
      setSubtaskDeleteInProgress(false)
    }
  }, [dialogOpen])

  useEffect(() => {
    if (!editSubtaskBlockedMsg) return
    const tid = window.setTimeout(() => setEditSubtaskBlockedMsg(null), 9000)
    return () => window.clearTimeout(tid)
  }, [editSubtaskBlockedMsg])

  useEffect(() => {
    if (!taskDetailOpen || detailTaskId == null) {
      setDetailModalSubtasks([])
      setDetailModalSubtasksLoading(false)
      return
    }
    const ac = new AbortController()
    setDetailModalSubtasksLoading(true)
    void fetchTaskSubtasks(detailTaskId, { signal: ac.signal })
      .then((rows) => {
        setDetailModalSubtasks(normalizeSubtaskDtoList(rows))
      })
      .catch((e: unknown) => {
        if (axios.isCancel(e)) return
        setDetailModalSubtasks([])
      })
      .finally(() => {
        if (!ac.signal.aborted) setDetailModalSubtasksLoading(false)
      })
    return () => ac.abort()
  }, [taskDetailOpen, detailTaskId])

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
      await load({ refreshMaster: true })
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
        const ownerForSubtask =
          form.assignedUserIds[0] ?? user?.id ?? null
        const createdRaw = await createTaskSubtask(editing.id, {
          title: t,
          weight: 1,
          ...(ownerForSubtask != null ? { assignedUserId: ownerForSubtask } : {}),
          areaId: editing.areaId,
          ...(editing.workspaceId != null ? { workspaceId: editing.workspaceId } : {}),
        })
        const row = normalizeSubtaskDto(createdRaw)
        setSubtaskDraft({ title: '' })
        setSubtasks((prev) => {
          const next = [...prev, row].sort((a, b) =>
            a.sortOrder !== b.sortOrder ? a.sortOrder - b.sortOrder : a.id - b.id,
          )
          applySubtaskListToParentState(editing.id, next)
          return next
        })
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
    const ownerForSubtaskPending =
      form.assignedUserIds[0] ?? user?.id ?? null
    const pendingAreaId =
      Number.isFinite(Number(form.areaId)) && Number(form.areaId) > 0
        ? Number(form.areaId)
        : areas[0]?.id ?? 0
    const pendingWsRaw = form.workspaceId ? Number(form.workspaceId) : NaN
    setPendingSubtasks((s) => [
      ...s,
      {
        tempId,
        title: t,
        description: '',
        done: false,
        assignedUserId: ownerForSubtaskPending,
        dueDate: null,
        areaId: pendingAreaId,
        workspaceId: Number.isFinite(pendingWsRaw) && pendingWsRaw > 0 ? pendingWsRaw : null,
      },
    ])
    setSubtaskDraft({ title: '' })
  }, [
    subtaskDraft.title,
    taskFormSaving,
    subtaskModalBusy,
    editing,
    form.assignedUserIds,
    user?.id,
    scheduleReloadTasksAndKpisAfterSubtasks,
    areas,
    form.areaId,
    form.workspaceId,
    applySubtaskListToParentState,
  ])

  const visibleTabs = useMemo(() => {
    const restricted = ['gantt', 'board', 'actas'] as const
    const baseTabs = manage
      ? GANTT_TAB_DEFINITIONS
      : GANTT_TAB_DEFINITIONS.filter((t) => (restricted as readonly string[]).includes(t.id))
    if (!isMySpaceView) return baseTabs
    return baseTabs.filter(
      (t) =>
        t.id !== 'cartera' && t.id !== 'sprints' && t.id !== 'dashboard' && t.id !== 'calendar',
    )
  }, [manage, isMySpaceView])

  useEffect(() => {
    if (!isMySpaceView) return
    if (
      activeTab === 'cartera' ||
      activeTab === 'sprints' ||
      activeTab === 'dashboard' ||
      activeTab === 'calendar'
    ) {
      setActiveTab('gantt')
    }
  }, [isMySpaceView, activeTab])

  useEffect(() => {
    if (manage) return
    if (activeTab === 'gantt' || activeTab === 'board' || activeTab === 'actas') return
    setActiveTab('gantt')
  }, [manage, activeTab])

  return (
    <div className="workos-gantt-shell workos-gantt-shell-bg min-h-[calc(100vh-4rem)] flex flex-col">
      <GanttModuleHeader
        workspaceFilter={workspaceFilter}
        workspacePickerBusy={workspacePickerBusy}
        onWorkspaceFilterChange={handleWorkspaceFilterChange}
        workspaces={workspaces}
        canManageWorkspaces={canManageWorkspaces}
        canCreateTasks={canCreateTasks}
        onNewTaskClick={() => openCreate()}
        visibleTabs={visibleTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <CreateWorkspaceDialog
        open={headerWorkspaceDialogOpen}
        onOpenChange={setHeaderWorkspaceDialogOpen}
        form={headerWorkspaceForm}
        setForm={setHeaderWorkspaceForm}
        saving={headerWorkspaceSaving}
        onSave={saveHeaderWorkspace}
      />

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
              <div className="mt-0 flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
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
                <span className="text-[11px] text-muted-foreground tabular-nums leading-none">
                  {tasksForTimeline.length} tareas en vista
                </span>
              </div>
              <div className="mt-1 flex-1 min-h-0 flex flex-col">
                <GanttTimelineTab
                  tasks={tasksForTimeline}
                  loading={loading}
                  refreshing={refreshing}
                  timelinePanDays={timelinePanDays}
                  manage={manage}
                  onEditTask={openEdit}
                  onDeleteTask={removeTask}
                  showHeatmap={showHeatmap}
                  showCriticalPath={showCriticalPath}
                  onTaskSelectNotify={onTaskSelectNotify}
                  collaboratorsForArea={collaboratorsForArea}
                  collaboratorsForDetailPanel={allCollaborators}
                  collaboratorNames={collaboratorNames}
                  mySpaceShowProjectNames={isMySpaceView}
                  workspaceNameById={workspaceNameById}
                  currentUserId={user?.id ?? null}
                  onParentSubtasksSynced={handleTimelineSubtasksSynced}
                  subtasksByParentId={subtasksByParentId}
                  setSubtasksByParentId={setSubtasksByParentId}
                  onDropTaskToSubtask={handleDropTaskToSubtask}
                />
              </div>
            </div>
          )}

          {manage && activeTab === 'cartera' && (
            <PortfolioTab
              tasks={tasksWithoutPrivate}
              loading={loading}
              manage={manage}
              canManageWorkspaces={canManageWorkspaces}
              areas={areas}
              workspaces={workspacesInScope}
              collaboratorNames={collaboratorNames}
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
              refreshTasksAndKpis={async () => {
                await reloadTasksAndKpis()
              }}
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
              onOpenActasTab={() => setActiveTab('actas')}
            />
          )}

          {activeTab === 'actas' && (
            <MeetingMinutesTab
              areas={areas}
              workspaces={workspaces}
              allSprints={allSprints}
              collaboratorsForArea={collaboratorsForArea}
              manage={manage}
              onOpenTaskById={onOpenTaskById}
              initialMeetingDate={actaSeedDate}
              onConsumedInitialMeetingDate={() => setActaSeedDate(null)}
            />
          )}

          {manage && activeTab === 'calendar' && !isMySpaceView && (
            <WorkosCalendarTab
              tasks={tasks}
              loadingTasks={loading}
              onPickCreateTask={(d) => openCreate(undefined, undefined, undefined, undefined, { startDate: d, endDate: d })}
              onPickCreateActa={(d) => {
                setActaSeedDate(d)
                setActiveTab('actas')
              }}
              onOpenTaskById={onOpenTaskById}
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
          <DialogContent className="max-w-5xl w-[calc(100vw-1.5rem)] max-h-[min(92vh,940px)] overflow-hidden gap-0 sm:rounded-xl p-6 flex flex-col">
            {detailLiveTask ? (
              <>
                <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 mt-0">
                  <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
                <DialogHeader className="text-left space-y-0 pr-10 shrink-0">
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

                <div className="space-y-4 mt-2 flex-1 overflow-y-auto min-h-0 pr-1">
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

                  {(detailModalSubtasksLoading ||
                    detailModalSubtasks.length > 0 ||
                    (detailLiveTask.subtaskTotal ?? 0) > 0) && (
                    <div className="rounded-xl border border-border/70 bg-card/40 dark:bg-card/25 overflow-hidden shadow-sm">
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60 bg-muted/25 dark:bg-muted/20">
                        <div
                          className="h-8 w-8 shrink-0 rounded-lg bg-primary/12 text-primary dark:bg-primary/20 flex items-center justify-center border border-primary/15"
                          aria-hidden
                        >
                          <ListChecks className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-foreground tracking-tight">Subtareas</div>
                          {!detailModalSubtasksLoading && detailModalSubtasks.length > 0 ? (
                            <div className="text-[10px] text-muted-foreground">
                              {detailModalSubtasks.filter((s) => s.done).length} de {detailModalSubtasks.length}{' '}
                              completadas
                            </div>
                          ) : (
                            <div className="text-[10px] text-muted-foreground">Checklist de esta tarea</div>
                          )}
                        </div>
                        {!detailModalSubtasksLoading && detailModalSubtasks.length > 0 ? (
                          <span className="shrink-0 text-[10px] font-semibold tabular-nums rounded-full bg-primary/12 text-primary px-2 py-0.5 border border-primary/15">
                            {Math.round(
                              (100 * detailModalSubtasks.filter((s) => s.done).length) /
                                Math.max(1, detailModalSubtasks.length),
                            )}
                            %
                          </span>
                        ) : null}
                      </div>
                      <div className="p-2">
                        {detailSubtaskBlockedMsg ? (
                          <div
                            role="alert"
                            className="mb-2 rounded-lg border border-amber-500/55 bg-amber-500/12 text-amber-950 dark:text-amber-50 dark:border-amber-500/40 dark:bg-amber-950/40 px-2.5 py-2 text-xs flex gap-2 items-start shadow-sm"
                          >
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 opacity-90" aria-hidden />
                            <span className="leading-snug">{detailSubtaskBlockedMsg}</span>
                          </div>
                        ) : null}
                        {detailModalSubtasksLoading ? (
                          <div
                            className="flex items-center gap-2 text-xs text-muted-foreground py-3 px-2"
                            role="status"
                            aria-live="polite"
                          >
                            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary-600" aria-hidden />
                            <span>Cargando subtareas…</span>
                          </div>
                        ) : detailModalSubtasks.length > 0 ? (
                          <ul className="space-y-1 max-h-[min(36vh,260px)] overflow-y-auto">
                            {detailModalSubtasks.map((st) => {
                              const subResp =
                                st.assignedUserId != null
                                  ? collaboratorNames.get(st.assignedUserId) ?? `Usuario #${st.assignedUserId}`
                                  : null
                              const canToggle = canUserToggleSubtaskDone(
                                detailLiveTask,
                                st,
                                user?.id ?? null,
                                manage || canCollaboratorManageTaskBasics(detailLiveTask, user?.id),
                              )
                              return (
                              <li
                                key={st.id}
                                className="rounded-lg px-2 py-1.5 text-sm border border-transparent hover:border-border/50 hover:bg-muted/30 transition-colors"
                              >
                                <div className="flex items-start gap-2.5">
                                  <SubtaskDoneToggle
                                    done={st.done}
                                    canToggle={canToggle}
                                    disabled={detailSubtaskBusyId === st.id}
                                    preferDisabledCheckbox
                                    checkboxClassName="mt-0.5 shrink-0"
                                    idleWrapperClassName="mt-0.5"
                                    cannotToggleTitle={SUBTASK_DONE_NOT_ALLOWED_HINT}
                                    onCannotToggleInteract={() => setDetailSubtaskBlockedMsg(SUBTASK_DONE_NOT_ALLOWED_HINT)}
                                    onCommitted={async (next) => {
                                      setDetailSubtaskBusyId(st.id)
                                      try {
                                        const updated = await updateTaskSubtaskNormalized(
                                          detailLiveTask.id,
                                          st.id,
                                          { done: next },
                                        )
                                        setDetailModalSubtasks((prev) => {
                                          const nextList = prev.map((x) =>
                                            x.id === st.id ? updated : x,
                                          )
                                          applySubtaskListToParentState(detailLiveTask.id, nextList)
                                          return nextList
                                        })
                                        scheduleReloadTasksAndKpisAfterSubtasks()
                                      } catch (e: unknown) {
                                        setDetailSubtaskBlockedMsg(
                                          httpSubtaskMutateStatus(e) === 403
                                            ? SUBTASK_DONE_NOT_ALLOWED_HINT
                                            : 'No se pudo actualizar la subtarea',
                                        )
                                      } finally {
                                        setDetailSubtaskBusyId(null)
                                      }
                                    }}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <span
                                      className={cn(
                                        'block leading-snug text-[13px]',
                                        st.done &&
                                          'text-muted-foreground line-through decoration-muted-foreground/50',
                                      )}
                                    >
                                      {st.title?.trim() || `Subtarea #${st.id}`}
                                    </span>
                                    {st.description?.trim() ? (
                                      <p className="mt-1 text-[11px] text-muted-foreground whitespace-pre-wrap leading-snug">
                                        {st.description.trim()}
                                      </p>
                                    ) : null}
                                    {(subResp || st.dueDate) ? (
                                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                                        {subResp ? (
                                          <span className="inline-flex items-center gap-1 truncate max-w-[12rem]">
                                            <User className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                                            {subResp}
                                          </span>
                                        ) : null}
                                        {st.dueDate ? (
                                          <span className="inline-flex items-center gap-1 tabular-nums shrink-0">
                                            <Calendar className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                                            {formatDetailModalDate(st.dueDate)}
                                          </span>
                                        ) : null}
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </li>
                              )
                            })}
                          </ul>
                        ) : (
                          <p className="text-[11px] text-muted-foreground py-2 px-2 leading-snug">
                            Sin subtareas. Usa{' '}
                            <strong className="font-medium text-foreground/80">Editar</strong> para añadir ítems al checklist.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

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
                    const principalMeta =
                      principal != null
                        ? assigneePickerList.find((c) => c.id === principal)
                        : undefined
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
                                  const m = assigneePickerList.find((c) => c.id === id)
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
                  </div>

                  <div className="shrink-0 w-full lg:w-[min(22rem,36vw)] lg:min-w-[260px] flex flex-col border-t lg:border-t-0 lg:border-l border-border/60 pt-4 lg:pt-0 lg:pl-4 lg:max-h-full min-h-[220px] lg:min-h-[min(68vh,620px)]">
                    <WorkosTaskChatPanel
                      key={detailLiveTask.id}
                      taskId={detailLiveTask.id}
                      currentUserId={user?.id ?? null}
                      subtasks={detailModalSubtasks}
                      subtasksLoading={detailModalSubtasksLoading}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-border/60 shrink-0">
                  {manage && (
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
                  )}
                  {(manage ||
                    canCollaboratorManageTaskBasics(detailLiveTask, user?.id)) && (
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
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="rounded-lg"
                    onClick={() => setTaskDetailOpen(false)}
                  >
                    Cerrar
                  </Button>
                </div>
              </>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open && taskFormSaving) return
            if (!open) setAssigneeSearchQuery('')
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

              <TaskFormWorkspaceTagsRow
                workspaces={workspaces}
                workspaceId={form.workspaceId}
                tagsInput={form.tagsInput}
                taskFormSaving={taskFormSaving}
                onWorkspaceChange={onTaskFormWorkspaceSelect}
                onTagsChange={(v) => setForm((f) => ({ ...f, tagsInput: v }))}
              />

              <div className={cn('grid gap-3', form.isPrivateTask ? 'grid-cols-1' : 'grid-cols-2')}>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Equipo <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.areaId}
                    onValueChange={(v) => {
                      setForm((f) => ({ ...f, areaId: v }))
                      setAssigneeSearchQuery('')
                      setFormErrors((p) => ({ ...p, areaId: '' }))
                    }}
                    disabled={taskFormSaving || (!!editing && !manage && !form.isPrivateTask)}
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
                  <Label
                    className={cn(
                      'text-sm font-medium mb-0',
                      displayProgressValue >= 100 && 'text-red-600 dark:text-red-500',
                    )}
                  >
                    Progreso · {displayProgressValue}%
                  </Label>
                  {progressFromFormSubtasks != null ? (
                    <span className="text-[10px] text-muted-foreground italic">Calculado desde subtareas</span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Solo lectura (no se ajusta manualmente)</span>
                  )}
                </div>
                <div className="w-full flex items-center">
                  <div className="w-full rounded-full border border-border/60 bg-muted/50 dark:bg-muted/40 p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)]">
                    <ProgressBar
                      value={displayProgressValue}
                      size="md"
                      variant={displayProgressValue >= 100 ? 'red' : 'primary'}
                      className="!bg-transparent dark:!bg-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Crown
                    className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0"
                    aria-hidden
                  />
                  Responsable principal
                </Label>
                <Select
                  value={form.assignedUserIds[0] != null ? String(form.assignedUserIds[0]) : 'none'}
                  onValueChange={setOwnerPrincipal}
                  disabled={taskFormSaving || (!form.isPrivateTask && !form.areaId)}
                >
                  <SelectTrigger
                    className={cn(
                      'relative min-h-10 h-auto min-w-0 py-2 rounded-lg items-center text-left [&>svg]:shrink-0',
                      TASK_MODAL_FOCUS,
                    )}
                    aria-label={taskPrincipalOwnerRow?.lineTitle}
                  >
                    {taskPrincipalOwnerRow ? (
                      <span className="flex min-w-0 flex-1 items-start gap-2 text-left">
                        <Avatar
                          name={taskPrincipalOwnerRow.nombre}
                          size="xs"
                          variant="owner"
                          className="mt-0.5 shrink-0"
                        />
                        <PrincipalOwnerLine
                          nombre={taskPrincipalOwnerRow.nombre}
                          area={taskPrincipalOwnerRow.area}
                        />
                      </span>
                    ) : (
                      <SelectValue
                        placeholder="Selecciona un responsable"
                        className="block min-w-0 flex-1 text-left"
                      />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin responsable</SelectItem>
                    {assigneePickerFiltered.map((c) => {
                      const textValue = principalSelectItemTextValue(c)
                      return (
                        <SelectItem key={c.id} value={String(c.id)} textValue={textValue}>
                          <span className="flex items-start gap-2 w-full min-w-0 py-0.5">
                            <Avatar
                              name={c.nombreCompleto}
                              size="xs"
                              variant="owner"
                              className="mt-0.5 shrink-0"
                            />
                            <PrincipalOwnerLine nombre={c.nombreCompleto} area="" className="text-left" />
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Colaboradores</Label>
                <div className="flex gap-1.5 items-stretch">
                  <Input
                    variant="plain"
                    type="text"
                    autoComplete="off"
                    placeholder="Buscar por nombre o rol…"
                    value={assigneeSearchQuery}
                    disabled={taskFormSaving || (!form.isPrivateTask && !form.areaId)}
                    onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                    className={cn(
                      'h-8 flex-1 min-w-0 rounded-none border border-neutral-200 dark:border-border bg-white dark:bg-background text-xs px-2.5',
                      TASK_MODAL_FOCUS,
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 shrink-0 rounded-none border-neutral-200 dark:border-border bg-white dark:bg-background px-2.5 text-xs font-medium gap-1.5"
                    disabled={
                      taskFormSaving ||
                      (!form.isPrivateTask && !form.areaId) ||
                      !assigneeSearchQuery.trim()
                    }
                    onClick={() => setAssigneeSearchQuery('')}
                  >
                    Limpiar
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/80 bg-muted/10 dark:bg-muted/20 p-3 max-h-44 overflow-y-auto">
                  {!form.areaId && !form.isPrivateTask ? (
                    <p className="text-xs text-muted-foreground col-span-2">Selecciona un equipo primero.</p>
                  ) : assigneePickerList.filter((c) => c.id !== form.assignedUserIds[0]).length === 0 ? (
                    <p className="text-xs text-muted-foreground col-span-2">
                      No hay más personas en los equipos cargados.
                    </p>
                  ) : assigneePickerFiltered.filter((c) => c.id !== form.assignedUserIds[0]).length === 0 ? (
                    <p className="text-xs text-muted-foreground col-span-2">
                      Nadie coincide con la búsqueda. Prueba con otro nombre o equipo.
                    </p>
                  ) : (
                    assigneePickerFiltered
                      .filter((c) => c.id !== form.assignedUserIds[0])
                      .map((c) => {
                        const selected = form.assignedUserIds.slice(1).includes(c.id)
                        return (
                          <label
                            key={c.id}
                            className={cn(
                              'flex items-center gap-2.5 cursor-pointer rounded-lg border px-2 py-1.5 transition-all duration-150',
                              selected
                                ? 'border-primary/35 bg-primary/[0.07] shadow-sm dark:bg-primary/10'
                                : 'border-transparent hover:border-border/50 hover:bg-muted/40',
                            )}
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-border text-primary-600 accent-primary-600 shrink-0"
                              checked={selected}
                              disabled={taskFormSaving}
                              onChange={() => toggleCollaborator(c.id)}
                            />
                            <Avatar
                              name={c.nombreCompleto}
                              size="md"
                              variant="picker"
                              className={cn(
                                selected &&
                                  'ring-2 ring-primary/45 ring-offset-2 ring-offset-background dark:ring-offset-background',
                              )}
                            />
                            <span className="text-xs truncate min-w-0 flex flex-col items-start gap-0 leading-tight">
                              <span className="truncate w-full font-medium">{c.nombreCompleto}</span>
                            </span>
                          </label>
                        )
                      })
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border px-2 py-2 space-y-2">
                {editSubtaskBlockedMsg ? (
                  <div
                    role="alert"
                    className="rounded-lg border border-amber-500/55 bg-amber-500/12 text-amber-950 dark:text-amber-50 dark:border-amber-500/40 dark:bg-amber-950/40 px-2.5 py-2 text-xs flex gap-2 items-start shadow-sm"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 opacity-90" aria-hidden />
                    <span className="leading-snug">{editSubtaskBlockedMsg}</span>
                  </div>
                ) : null}
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
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
                    {subtasks.map((st) => {
                      const subCanToggle = canUserToggleSubtaskDone(
                        editing,
                        st,
                        user?.id ?? null,
                        manage || canCollaboratorManageTaskBasics(editing, user?.id),
                      )
                      const subAreaId = st.areaId ?? Number(editing.areaId)
                      const collabsForSub = collaboratorsForArea(subAreaId)
                      return (
                      <div
                        key={st.id}
                        className="rounded-md border border-neutral-200/90 dark:border-border/70 bg-white dark:bg-card px-2 py-1.5 space-y-1.5 group"
                      >
                        <div className="flex items-center gap-2">
                          <SubtaskDoneToggle
                            preferDisabledCheckbox
                            done={st.done}
                            canToggle={subCanToggle}
                            disabled={taskFormSaving || subtaskModalBusy !== 'idle'}
                            cannotToggleTitle={SUBTASK_DONE_NOT_ALLOWED_HINT}
                            onCannotToggleInteract={() => setEditSubtaskBlockedMsg(SUBTASK_DONE_NOT_ALLOWED_HINT)}
                            onCommitted={async (done) => {
                              if (!editing || subtaskModalBusy !== 'idle' || !subCanToggle) return
                              setSubtaskModalBusy('updating')
                              try {
                                const updated = await updateTaskSubtaskNormalized(editing.id, st.id, {
                                  done,
                                })
                                setSubtasks((prev) => {
                                  const nextList = prev.map((x) => (x.id === st.id ? updated : x))
                                  applySubtaskListToParentState(editing.id, nextList)
                                  return nextList
                                })
                                scheduleReloadTasksAndKpisAfterSubtasks()
                              } catch (e: unknown) {
                                setEditSubtaskBlockedMsg(
                                  httpSubtaskMutateStatus(e) === 403
                                    ? SUBTASK_DONE_NOT_ALLOWED_HINT
                                    : 'No se pudo actualizar la subtarea',
                                )
                              } finally {
                                setSubtaskModalBusy('idle')
                              }
                            }}
                          />
                          <Input
                            variant="plain"
                            value={st.title}
                            disabled={taskFormSaving || subtaskModalBusy !== 'idle' || !canEditSubtasksInTaskModal}
                            onChange={(e) =>
                              setSubtasks((prev) =>
                                prev.map((x) => (x.id === st.id ? { ...x, title: e.target.value } : x)),
                              )
                            }
                            onBlur={async () => {
                              if (
                                !editing ||
                                taskFormSaving ||
                                subtaskModalBusy !== 'idle' ||
                                !canEditSubtasksInTaskModal
                              )
                                return
                              const row = subtasks.find((x) => x.id === st.id)
                              const v = row?.title?.trim() ?? ''
                              if (!v || v === (st.title ?? '').trim()) return
                              setSubtaskModalBusy('updating')
                              try {
                                const updated = await updateTaskSubtaskNormalized(editing.id, st.id, {
                                  title: v,
                                })
                                setSubtasks((prev) => {
                                  const nextList = prev.map((x) => (x.id === st.id ? updated : x))
                                  applySubtaskListToParentState(editing.id, nextList)
                                  return nextList
                                })
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
                            disabled={taskFormSaving || subtaskModalBusy !== 'idle' || !canEditSubtasksInTaskModal}
                            className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary hover:bg-primary/10"
                            aria-label="Mover subtarea a otra tarea"
                            title="Mover a otra tarea"
                            onClick={() => {
                              setSubtaskMoveParentChoice('')
                              setSubtaskMoveTargetRow(st)
                            }}
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={taskFormSaving || subtaskModalBusy !== 'idle' || !canEditSubtasksInTaskModal}
                            className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10"
                            aria-label="Eliminar subtarea"
                            onClick={() => {
                              if (
                                taskFormSaving ||
                                subtaskModalBusy !== 'idle' ||
                                !canEditSubtasksInTaskModal
                              )
                                return
                              setSubtaskPendingDelete(st)
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <SubtaskAreaWorkspaceRow
                          areas={areas.map((a) => ({ id: a.id, name: a.name }))}
                          workspaces={workspaces.map((w) => ({ id: w.id, name: w.name }))}
                          areaId={subAreaId}
                          workspaceId={st.workspaceId ?? editing.workspaceId ?? null}
                          disabled={taskFormSaving || subtaskModalBusy !== 'idle' || !canEditSubtasksInTaskModal}
                          onAreaCommit={async (nextArea) => {
                            if (
                              !editing ||
                              subtaskModalBusy !== 'idle' ||
                              !canEditSubtasksInTaskModal ||
                              nextArea === subAreaId
                            )
                              return
                            setSubtaskModalBusy('updating')
                            try {
                              const updated = await updateTaskSubtaskNormalized(editing.id, st.id, {
                                areaId: nextArea,
                              })
                              setSubtasks((prev) => prev.map((x) => (x.id === st.id ? updated : x)))
                              scheduleReloadTasksAndKpisAfterSubtasks()
                            } catch {
                              setErr('No se pudo actualizar el equipo de la subtarea')
                            } finally {
                              setSubtaskModalBusy('idle')
                            }
                          }}
                          onWorkspaceCommit={async (nextWs) => {
                            if (!editing || subtaskModalBusy !== 'idle' || !canEditSubtasksInTaskModal) return
                            const curWs = st.workspaceId ?? editing.workspaceId ?? null
                            if (nextWs === curWs) return
                            if (nextWs == null) {
                              setSubtaskModalBusy('updating')
                              try {
                                const updated = await updateTaskSubtaskNormalized(
                                  editing.id,
                                  st.id,
                                  { clearWorkspace: true as const },
                                )
                                setSubtasks((prev) => prev.map((x) => (x.id === st.id ? updated : x)))
                                scheduleReloadTasksAndKpisAfterSubtasks()
                              } catch {
                                setErr('No se pudo actualizar el espacio de la subtarea')
                              } finally {
                                setSubtaskModalBusy('idle')
                              }
                              return
                            }
                            setSubtaskWorkspaceRelocation({ subtask: st, nextWorkspaceId: nextWs })
                          }}
                        />
                        <SubtaskAssigneeDateGrid
                          assignees={collabsForSub}
                          assignedUserId={st.assignedUserId}
                          dueDate={st.dueDate}
                          min={form.startDate || undefined}
                          disabled={
                            taskFormSaving || subtaskModalBusy !== 'idle' || !canEditSubtasksInTaskModal
                          }
                          dueDateDisabled={taskFormSaving || !canEditSubtasksInTaskModal}
                          readOnlyAssigneeLabel={subtaskAssigneeReadOnlyLabel}
                          onAssigneeCommit={async (nextAssignee) => {
                            if (
                              !editing ||
                              subtaskModalBusy !== 'idle' ||
                              !canEditSubtasksInTaskModal
                            )
                              return
                            setSubtaskModalBusy('updating')
                            try {
                              const body =
                                nextAssignee == null
                                  ? { unassignUser: true as const }
                                  : { assignedUserId: nextAssignee }
                              const updated = await updateTaskSubtaskNormalized(editing.id, st.id, body)
                              setSubtasks((prev) => prev.map((x) => (x.id === st.id ? updated : x)))
                              scheduleReloadTasksAndKpisAfterSubtasks()
                            } catch {
                              setErr('No se pudo asignar responsable a la subtarea')
                            } finally {
                              setSubtaskModalBusy('idle')
                            }
                          }}
                          onDueDateCommit={async (v) => {
                            if (!editing || !canEditSubtasksInTaskModal) return
                            const vClamped = ensureSubtaskDueNotBeforeParentStart(v, form.startDate)
                            const previousDue = st.dueDate ?? null
                            setSubtasks((prev) => {
                              const nl = prev.map((x) =>
                                x.id === st.id ? { ...x, dueDate: vClamped } : x,
                              )
                              applySubtaskListToParentState(editing.id, nl)
                              return nl
                            })
                            setSubtaskModalBusy('updating')
                            try {
                              const body =
                                vClamped == null
                                  ? { clearDueDate: true as const }
                                  : { dueDate: vClamped }
                              const updated = await updateTaskSubtaskNormalized(editing.id, st.id, body)
                              setSubtasks((prev) => {
                                const nl = prev.map((x) => (x.id === st.id ? updated : x))
                                applySubtaskListToParentState(editing.id, nl)
                                return nl
                              })
                              scheduleReloadTasksAndKpisAfterSubtasks()
                            } catch {
                              setErr(
                                'Fecha inválida: la fecha límite no puede ser anterior al inicio de la tarea',
                              )
                              setSubtasks((prev) => {
                                const nl = prev.map((x) =>
                                  x.id === st.id ? { ...x, dueDate: previousDue } : x,
                                )
                                applySubtaskListToParentState(editing.id, nl)
                                return nl
                              })
                            } finally {
                              setSubtaskModalBusy('idle')
                            }
                          }}
                        />
                        <div className="pl-7 min-w-0">
                          <SubtaskDescriptionField
                            value={st.description ?? ''}
                            disabled={
                              taskFormSaving || subtaskModalBusy !== 'idle' || !canEditSubtasksInTaskModal
                            }
                            onChange={(v) =>
                              setSubtasks((prev) =>
                                prev.map((x) => (x.id === st.id ? { ...x, description: v } : x)),
                              )
                            }
                            onBlur={async () => {
                              if (
                                !editing ||
                                taskFormSaving ||
                                subtaskModalBusy !== 'idle' ||
                                !canEditSubtasksInTaskModal
                              )
                                return
                              const row = subtasks.find((x) => x.id === st.id)
                              const payload = (row?.description ?? '').trim()
                              if (!payload || payload === (st.description ?? '').trim()) return
                              setSubtaskModalBusy('updating')
                              try {
                                const updated = await updateTaskSubtaskNormalized(editing.id, st.id, {
                                  description: payload,
                                })
                                setSubtasks((prev) => {
                                  const nl = prev.map((x) => (x.id === st.id ? updated : x))
                                  applySubtaskListToParentState(editing.id, nl)
                                  return nl
                                })
                                scheduleReloadTasksAndKpisAfterSubtasks()
                              } catch {
                                setErr('No se pudo guardar la descripción de la subtarea')
                              } finally {
                                setSubtaskModalBusy('idle')
                              }
                            }}
                          />
                        </div>
                      </div>
                      )
                    })}
                  </div>
                )}
                {!editing && pendingSubtasks.length > 0 && (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
                    {pendingSubtasks.map((ps) => (
                      <div
                        key={ps.tempId}
                        className="rounded-md border border-neutral-200/90 dark:border-border/70 bg-white dark:bg-card px-2 py-1.5 space-y-1.5 group"
                      >
                        <div className="flex items-center gap-2">
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
                        <SubtaskAreaWorkspaceRow
                          areas={areas.map((a) => ({ id: a.id, name: a.name }))}
                          workspaces={workspaces.map((w) => ({ id: w.id, name: w.name }))}
                          areaId={ps.areaId}
                          workspaceId={ps.workspaceId}
                          disabled={taskFormSaving}
                          onAreaCommit={(nextArea) => {
                            setPendingSubtasks((prev) =>
                              prev.map((x) =>
                                x.tempId === ps.tempId ? { ...x, areaId: nextArea } : x,
                              ),
                            )
                          }}
                          onWorkspaceCommit={(nextWs) => {
                            setPendingSubtasks((prev) =>
                              prev.map((x) =>
                                x.tempId === ps.tempId ? { ...x, workspaceId: nextWs } : x,
                              ),
                            )
                          }}
                        />
                        <SubtaskAssigneeDateGrid
                          assignees={collaboratorsForArea(ps.areaId)}
                          assignedUserId={ps.assignedUserId}
                          dueDate={ps.dueDate}
                          min={form.startDate || undefined}
                          disabled={taskFormSaving}
                          readOnlyAssigneeLabel={subtaskAssigneeReadOnlyLabel}
                          onAssigneeCommit={(nextAssignee) => {
                            setPendingSubtasks((prev) =>
                              prev.map((x) =>
                                x.tempId === ps.tempId ? { ...x, assignedUserId: nextAssignee } : x,
                              ),
                            )
                          }}
                          onDueDateCommit={(v) => {
                            const vClamped = ensureSubtaskDueNotBeforeParentStart(v, form.startDate)
                            setPendingSubtasks((prev) =>
                              prev.map((x) =>
                                x.tempId === ps.tempId ? { ...x, dueDate: vClamped } : x,
                              ),
                            )
                          }}
                        />
                        <div className="pl-7 min-w-0">
                          <SubtaskDescriptionField
                            value={ps.description ?? ''}
                            disabled={taskFormSaving}
                            onChange={(v) =>
                              setPendingSubtasks((prev) =>
                                prev.map((x) =>
                                  x.tempId === ps.tempId ? { ...x, description: v } : x,
                                ),
                              )
                            }
                          />
                        </div>
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
                    className={cn(
                      'h-8 min-w-[9rem] shrink-0 justify-center rounded-none border-neutral-200 dark:border-border bg-white dark:bg-background px-2.5 text-xs font-semibold gap-1.5',
                      /* El Button global usa disabled:opacity-50; durante subtarea en curso debe leerse el texto. */
                      subtaskModalBusy !== 'idle' && 'disabled:!opacity-100 disabled:border-primary/50 disabled:text-primary',
                    )}
                    aria-busy={subtaskModalBusy !== 'idle'}
                    disabled={
                      taskFormSaving ||
                      subtaskModalBusy !== 'idle' ||
                      !subtaskDraft.title.trim() ||
                      (Boolean(editing) && subtasksLoading)
                    }
                    onClick={() => void commitSubtaskDraft()}
                  >
                    {subtaskModalBusy !== 'idle' ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" aria-hidden />
                    ) : null}
                    <span className="whitespace-nowrap">
                      {subtaskModalBusy === 'adding'
                        ? 'Añadiendo…'
                        : subtaskModalBusy === 'updating'
                          ? 'Actualizando…'
                          : '+ Añadir'}
                    </span>
                  </Button>
                </div>
              </div>

              <label
                className={cn(
                  'flex items-center gap-2 rounded-md border border-border px-2 py-2',
                  taskFormSaving ? 'cursor-default' : 'cursor-pointer',
                )}
              >
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-primary-500 text-primary-600 accent-primary-600 shrink-0"
                  checked={form.isPrivateTask}
                  disabled={taskFormSaving}
                  onChange={(e) => {
                    const checked = e.target.checked
                    if (!checked) {
                      setForm((f) => ({ ...f, isPrivateTask: false }))
                      setAssigneeSearchQuery('')
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

            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/60 bg-muted/20">
              {editing && !subtasksLoading && subtasks.length === 0 && (editing.subtaskTotal ?? 0) === 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setTaskConvertToSubtaskCandidates(subtaskParentMoveCandidates)
                    setTaskConvertToSubtaskSelectedId('')
                    setTaskConvertToSubtaskDialogOpen(true)
                  }}
                  disabled={taskFormSaving}
                  className="rounded-lg px-4 mr-auto gap-2 text-muted-foreground hover:text-foreground"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  Convertir a subtarea
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={taskFormSaving}
                className="rounded-lg px-5 ml-auto"
              >
                Cancelar
              </Button>
              <Button
                className="workos-gantt-btn-primary rounded-lg px-5 inline-flex items-center justify-center gap-2 text-white border-0 shadow-sm"
                onClick={saveTask}
                disabled={
                  taskFormSaving ||
                  !form.title.trim() ||
                  (!editing && !form.areaId) ||
                  (!!editing && !isEditTaskFormDirty)
                }
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

        <Dialog
          open={subtaskWorkspaceRelocation !== null}
          onOpenChange={(open) => {
            if (!open && subtaskModalBusy === 'idle') {
              setSubtaskWorkspaceRelocation(null)
            }
          }}
        >
          <DialogContent
            className={cn(
              'max-h-[85vh] w-[min(100%,28rem)] max-w-md gap-0 overflow-y-auto p-0 sm:max-w-md sm:rounded-xl',
              'border-border/80 shadow-lg',
            )}
          >
            <DialogHeader className="min-w-0 space-y-0 px-4 pb-3 pt-4 text-left">
              <DialogTitle className="pr-9 text-base font-semibold leading-tight text-foreground">
                Cambio de espacio
              </DialogTitle>
              <DialogDescription asChild>
                <div className="mt-2.5 min-w-0 space-y-2 text-xs leading-snug text-muted-foreground">
                  <p>
                    Destino:{' '}
                    <span className="font-medium text-foreground">
                      {workspaces.find((w) => w.id === subtaskWorkspaceRelocation?.nextWorkspaceId)?.name?.trim() ||
                        '—'}
                    </span>
                  </p>
                  <p className="break-words rounded-md bg-muted/50 px-2 py-1.5 text-[13px] text-foreground [overflow-wrap:anywhere]">
                    {subtaskWorkspaceRelocation?.subtask.title?.trim() ||
                      (subtaskWorkspaceRelocation != null ? `#${subtaskWorkspaceRelocation.subtask.id}` : '')}
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>

            <div className="min-w-0 space-y-2 border-t border-border/50 px-4 py-3">
              {subtaskModalBusy !== 'idle' && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                  Aplicando…
                </p>
              )}
              <div className="flex min-w-0 flex-col gap-2">
                <button
                  type="button"
                  disabled={subtaskModalBusy !== 'idle' || !editing || subtaskWorkspaceRelocation == null}
                  className={cn(
                    'flex min-w-0 flex-col items-stretch gap-0.5 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2.5 text-left outline-none transition-colors',
                    'hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-primary/25',
                    'disabled:pointer-events-none disabled:opacity-50',
                    'dark:bg-primary/15 dark:hover:bg-primary/25',
                  )}
                  onClick={() => void confirmSubtaskWorkspaceRelocation('standalone')}
                >
                  <span className="text-sm font-medium leading-snug text-foreground">
                    Convertir en tarea
                  </span>
                  <span className="text-[11px] leading-snug text-muted-foreground">
                    Independiente en el nuevo espacio, mismo contenido
                  </span>
                </button>
                <div className="my-2 border-t border-border/50"></div>
                <Label className="text-[13px] font-medium text-foreground">
                  O mover a una tarea en el nuevo espacio:
                </Label>
                {relocationTargetTasksLoading ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-2">
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                    Cargando tareas...
                  </div>
                ) : (
                  <>
                    <Select
                      value={relocationSelectedParentId}
                      onValueChange={setRelocationSelectedParentId}
                      disabled={subtaskModalBusy !== 'idle' || !relocationTargetTasks?.length}
                    >
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue placeholder={relocationTargetTasks?.length ? 'Selecciona una tarea...' : 'No hay tareas en este espacio'} />
                      </SelectTrigger>
                      <SelectContent>
                        {relocationTargetTasks?.map(t => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.title?.trim() || `Tarea #${t.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      disabled={subtaskModalBusy !== 'idle' || !editing || subtaskWorkspaceRelocation == null || !relocationSelectedParentId}
                      className={cn(
                        'flex min-w-0 flex-col items-stretch gap-0.5 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-left shadow-sm outline-none transition-colors mt-1',
                        'hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-primary/25',
                        'disabled:pointer-events-none disabled:opacity-50',
                      )}
                      onClick={() => void confirmSubtaskWorkspaceRelocation('existing')}
                    >
                      <span className="text-sm font-medium leading-snug text-primary text-center">
                        Mover a la tarea seleccionada
                      </span>
                    </button>
                    
                    {!relocationTargetTasks?.length && (
                      <button
                        type="button"
                        disabled={subtaskModalBusy !== 'idle' || !editing || subtaskWorkspaceRelocation == null}
                        className={cn(
                          'flex min-w-0 flex-col items-stretch gap-0.5 rounded-lg border border-border bg-background px-3 py-2 text-left shadow-sm outline-none transition-colors mt-2',
                          'hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring',
                          'disabled:pointer-events-none disabled:opacity-50',
                        )}
                        onClick={() => void confirmSubtaskWorkspaceRelocation('nested')}
                      >
                        <span className="text-[13px] font-medium leading-snug text-foreground">
                          Subtarea con padre «Por definir»
                        </span>
                        <span className="text-[11px] leading-snug text-muted-foreground">
                          Se crea la tarea padre y se mueve debajo
                        </span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-border/50 px-3 py-2.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
                disabled={subtaskModalBusy !== 'idle'}
                onClick={() => setSubtaskWorkspaceRelocation(null)}
              >
                Cancelar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={subtaskMoveTargetRow !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSubtaskMoveTargetRow(null)
              setSubtaskMoveParentChoice('')
            }
          }}
        >
          <DialogContent className="max-w-md sm:rounded-xl">
            <DialogHeader>
              <DialogTitle>Mover subtarea</DialogTitle>
              <DialogDescription>
                La subtarea «{subtaskMoveTargetRow?.title?.trim() || `#${subtaskMoveTargetRow?.id}`}» pasará a formar parte
                de la tarea que elijas. El chat de la subtarea se mantendrá; equipo y espacio heredados se alinean con el
                nuevo padre.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-1">
              <Label className="text-sm font-medium">Nueva tarea padre</Label>
              <Select
                value={subtaskMoveParentChoice}
                onValueChange={setSubtaskMoveParentChoice}
                disabled={subtaskModalBusy !== 'idle' || subtaskParentMoveCandidates.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elegir tarea…" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {subtaskParentMoveCandidates.map((c) => (
                    <SelectItem
                      key={c.id}
                      value={String(c.id)}
                      textValue={`${c.title} ${c.secondary}`}
                    >
                      {`${c.title} (${c.secondary})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {subtaskParentMoveCandidates.length === 0 && (
                <p className="text-xs text-muted-foreground">No hay otras tareas en la vista actual.</p>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSubtaskMoveTargetRow(null)
                  setSubtaskMoveParentChoice('')
                }}
                disabled={subtaskModalBusy !== 'idle'}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="workos-gantt-btn-primary text-white"
                disabled={
                  subtaskModalBusy !== 'idle' ||
                  !editing ||
                  !subtaskMoveTargetRow ||
                  subtaskMoveParentChoice === ''
                }
                onClick={async () => {
                  if (!editing || !subtaskMoveTargetRow || subtaskMoveParentChoice === '') return
                  const targetId = Number(subtaskMoveParentChoice)
                  if (Number.isNaN(targetId) || targetId === editing.id) return
                  setSubtaskModalBusy('updating')
                  try {
                    await moveTaskSubtask(editing.id, subtaskMoveTargetRow.id, targetId)
                    const movedId = subtaskMoveTargetRow.id
                    setSubtasks((prev) => {
                      const nextList = prev.filter((x) => x.id !== movedId)
                      applySubtaskListToParentState(editing.id, nextList)
                      return nextList
                    })
                    setSubtaskMoveTargetRow(null)
                    setSubtaskMoveParentChoice('')
                    scheduleReloadTasksAndKpisAfterSubtasks()
                  } catch (e) {
                    setErr(parseGanttLoadError(e))
                  } finally {
                    setSubtaskModalBusy('idle')
                  }
                }}
              >
                {subtaskModalBusy !== 'idle' ? (
                  <>
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin mr-2" aria-hidden />
                    Moviendo…
                  </>
                ) : (
                  'Mover'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DeleteSubtaskConfirmDialog
          open={subtaskPendingDelete !== null && dialogOpen}
          onOpenChange={(open) => {
            if (!subtaskDeleteInProgress) {
              if (!open) setSubtaskPendingDelete(null)
            }
          }}
          subtaskTitle={
            subtaskPendingDelete?.title?.trim() ||
            (subtaskPendingDelete != null ? `Subtarea #${subtaskPendingDelete.id}` : undefined)
          }
          deleting={subtaskDeleteInProgress}
          onConfirm={confirmDeleteSubtask}
        />

        <DeleteTaskConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            if (!deleting) {
              setDeleteDialogOpen(open)
              if (!open) setTaskToDelete(null)
            }
          }}
          taskTitle={taskToDelete?.title}
          deleting={deleting}
          onConfirm={confirmDeleteTask}
        />

        <DeleteAreaConfirmDialog
          open={deleteAreaDialogOpen}
          onOpenChange={(open) => {
            if (!deletingArea) {
              setDeleteAreaDialogOpen(open)
              if (!open) setAreaToDelete(null)
            }
          }}
          areaName={areaToDelete?.name}
          deleting={deletingArea}
          onConfirm={confirmDeleteArea}
        />

        <Dialog
          open={taskConvertToSubtaskDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setTaskConvertToSubtaskDialogOpen(false)
              setTaskConvertToSubtaskSelectedId('')
            }
          }}
        >
          <DialogContent className="max-w-md sm:rounded-xl">
            <DialogHeader>
              <DialogTitle>Convertir a subtarea</DialogTitle>
              <DialogDescription>
                La tarea actual pasará a ser una subtarea de la tarea que elijas. Su chat y comentarios se mantendrán.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-1">
              <Label className="text-sm font-medium">Tarea padre destino</Label>
              <Select
                value={taskConvertToSubtaskSelectedId}
                onValueChange={setTaskConvertToSubtaskSelectedId}
                disabled={taskConvertToSubtaskLoading || !taskConvertToSubtaskCandidates?.length}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elegir tarea…" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {taskConvertToSubtaskCandidates?.map((c) => (
                    <SelectItem
                      key={c.id}
                      value={String(c.id)}
                      textValue={`${c.title} ${c.secondary}`}
                    >
                      {`${c.title} (${c.secondary})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {taskConvertToSubtaskCandidates?.length === 0 && (
                <p className="text-xs text-muted-foreground">No hay otras tareas en la vista actual.</p>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setTaskConvertToSubtaskDialogOpen(false)
                  setTaskConvertToSubtaskSelectedId('')
                }}
                disabled={taskConvertToSubtaskLoading}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="workos-gantt-btn-primary text-white"
                disabled={
                  taskConvertToSubtaskLoading ||
                  !editing ||
                  taskConvertToSubtaskSelectedId === ''
                }
                onClick={confirmConvertToSubtask}
              >
                {taskConvertToSubtaskLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin mr-2" aria-hidden />
                    Convirtiendo…
                  </>
                ) : (
                  'Convertir'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  )
}
