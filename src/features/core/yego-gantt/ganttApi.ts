/**
 * Llamadas HTTP del módulo WorkOS Gantt: rutas y tipos en un solo sitio.
 */

import { api } from '../../../services/core/api'
import type {
  AreaFull,
  AreaTaskStatus,
  ColaboradorDto,
  Kpis,
  MeetingMinuteItemResponse,
  MeetingMinuteResponse,
  MeetingMinutesDashboardKpisResponse,
  MeetingMinuteStatus,
  MeetingMinuteType,
  ConvertMeetingItemToTaskResponse,
  SprintDto,
  TaskPriority,
  TaskRow,
  TaskSubtaskChecklistItem,
  TaskSubtaskDto,
  WorkspaceDto,
  WorkosMeetingItemStatus,
  WorkosMeetingItemType,
} from './types'

export type { TaskSubtaskDto }

/** Prefijos de API usados solo por este módulo. */
export const yegoGanttPaths = {
  taskSummary: '/yego-gantt/tasks/summary',
  workspaces: '/yego-gantt/workspaces',
  sprintsByWorkspace: (workspaceId: number) => `/yego-gantt/sprints/by-workspace/${workspaceId}`,
  meetingMinutes: '/yego-gantt/meeting-minutes',
  meetingMinuteById: (id: number) => `/yego-gantt/meeting-minutes/${id}`,
  meetingMinuteStatus: (id: number) => `/yego-gantt/meeting-minutes/${id}/status`,
  meetingMinuteItems: (id: number) => `/yego-gantt/meeting-minutes/${id}/items`,
  meetingMinuteItem: (minuteId: number, itemId: number) =>
    `/yego-gantt/meeting-minutes/${minuteId}/items/${itemId}`,
  meetingMinuteConvert: (minuteId: number, itemId: number) =>
    `/yego-gantt/meeting-minutes/${minuteId}/items/${itemId}/convert-to-task`,
  meetingMinutesDashboardKpis: '/yego-gantt/meeting-minutes/dashboard-kpis',
  meetingMinutesUnconverted: '/yego-gantt/meeting-minutes/unconverted-items',
} as const

export const areasPaths = {
  findAllActive: '/areas/find-all-active',
  /** Un solo GET con ?ids= &ids=… (lista repetida; compatible con Spring MVC). */
  collaboratorsByAreas: '/areas/colaboradores-por-areas',
} as const

/** Query: areaId, priority, workspaceId, ownerUserId, mySpace («Mi espacio»). */
export function ganttListParams(
  areaFilter: string,
  priorityFilter: string,
  workspaceFilter: string,
  ownerUserIdFilter: string,
): Record<string, string> {
  const q: Record<string, string> = {}
  if (areaFilter !== 'all') q.areaId = areaFilter
  if (priorityFilter !== 'all') q.priority = priorityFilter
  if (workspaceFilter === 'my_space') {
    q.mySpace = 'true'
  } else {
    q.workspaceId = workspaceFilter
  }
  if (ownerUserIdFilter !== 'all') q.ownerUserId = ownerUserIdFilter
  return q
}

/** Quita claves con valor `undefined` para no serializarlas en JSON (Axios). */
export function omitUndefinedKeys<T extends Record<string, unknown>>(obj: T): T {
  const out = {} as T
  for (const key of Object.keys(obj) as (keyof T)[]) {
    const v = obj[key]
    if (v !== undefined) {
      ;(out as Record<string, unknown>)[key as string] = v
    }
  }
  return out
}

/** Campos del formulario de tarea necesarios para armar el cuerpo de guardado. */
export type GanttTaskSaveFormFields = {
  areaId: string
  workspaceId: string
  sprintId: string
  title: string
  description: string
  startDate: string
  endDate: string
  status: AreaTaskStatus
  priority: TaskPriority
  isPrivateTask: boolean
  assignedUserIds: number[]
}

/**
 * POST/PUT tarea Gantt: si es privada, no incluye `sprintId` y solo añade `workspaceId` si hay valor;
 * listas de asignación (principal + colaboradores) se envían igual en privada y pública.
 */
export function buildGanttTaskSavePayload(
  form: GanttTaskSaveFormFields,
  progressPercent: number,
  parsedTags: string[],
): Record<string, unknown> {
  const privateTask = form.isPrivateTask
  const ownerId = form.assignedUserIds[0]
  const assignedIdsForPayload =
    form.assignedUserIds.length > 0 ? [...form.assignedUserIds] : []

  const base: Record<string, unknown> = {
    areaId: Number(form.areaId),
    title: form.title.trim(),
    startDate: form.startDate,
    endDate: form.endDate,
    status: form.status,
    priority: form.priority,
    progressPercent,
    privateTask,
    tags: parsedTags.length > 0 ? parsedTags : null,
  }

  const desc = form.description?.trim()
  if (desc) {
    base.description = desc
  }

  if (privateTask) {
    if (form.workspaceId) {
      base.workspaceId = Number(form.workspaceId)
    }
    base.assignedUserId = ownerId ?? null
    base.assignedUserIds = assignedIdsForPayload.length > 0 ? assignedIdsForPayload : null
    return omitUndefinedKeys(base)
  }

  base.workspaceId = form.workspaceId ? Number(form.workspaceId) : null
  base.sprintId = form.sprintId ? Number(form.sprintId) : null
  base.assignedUserId = ownerId ?? null
  base.assignedUserIds = assignedIdsForPayload.length > 0 ? assignedIdsForPayload : null
  return omitUndefinedKeys(base)
}

/** Clave estable del conjunto de áreas (caché de colaboradores). */
export function areasStableKey(areas: AreaFull[]): string {
  if (areas.length === 0) return ''
  return areas
    .map((a) => a.id)
    .sort((x, y) => x - y)
    .join(',')
}

export interface GanttTaskSummary {
  tasks: TaskRow[]
  kpis: Kpis
}

/** GET /yego-gantt/tasks/summary — tareas + KPIs en una petición. */
export async function fetchGanttTaskSummary(
  areaFilter: string,
  priorityFilter: string,
  workspaceFilter: string,
  ownerUserIdFilter: string,
): Promise<GanttTaskSummary> {
  const res = await api.get<GanttTaskSummary>(yegoGanttPaths.taskSummary, {
    params: ganttListParams(areaFilter, priorityFilter, workspaceFilter, ownerUserIdFilter),
  })
  return res.data
}

export interface GanttMasterData {
  areas: AreaFull[]
  workspaces: WorkspaceDto[]
}

/** Áreas activas + espacios de trabajo Gantt en paralelo. */
export async function fetchGanttMasterData(): Promise<GanttMasterData> {
  const [areasRes, workspacesRes] = await Promise.all([
    api.get<AreaFull[]>(areasPaths.findAllActive),
    api.get<WorkspaceDto[]>(yegoGanttPaths.workspaces),
  ])
  return { areas: areasRes.data, workspaces: workspacesRes.data }
}

/** Colaboradores por área; una petición en lugar de N GET por área. */
export async function fetchAreaCollaboratorsMap(
  areaList: AreaFull[],
): Promise<Map<number, ColaboradorDto[]>> {
  const map = new Map<number, ColaboradorDto[]>()
  if (areaList.length === 0) return map
  const ids = [...new Set(areaList.map((a) => a.id))].sort((x, y) => x - y)
  for (const id of ids) map.set(id, [])
  const params = new URLSearchParams()
  for (const id of ids) params.append('ids', String(id))
  try {
    const res = await api.get<Record<string, ColaboradorDto[]>>(
      `${areasPaths.collaboratorsByAreas}?${params.toString()}`,
    )
    const data = res.data
    for (const id of ids) {
      const list = data[String(id)]
      map.set(id, Array.isArray(list) ? list : [])
    }
  } catch {
    /* map ya tiene listas vacías por área */
  }
  return map
}

/** Sprints agrupados por id de espacio de trabajo. */
export async function fetchSprintsByWorkspaces(
  workspaces: { id: number }[],
): Promise<Record<number, SprintDto[]>> {
  if (workspaces.length === 0) return {}
  const results = await Promise.allSettled(
    workspaces.map((w) => api.get<SprintDto[]>(yegoGanttPaths.sprintsByWorkspace(w.id))),
  )
  const map: Record<number, SprintDto[]> = {}
  workspaces.forEach((w, i) => {
    const r = results[i]
    map[w.id] = r.status === 'fulfilled' ? r.value.data : []
  })
  return map
}

export async function fetchTaskSubtasks(taskId: number, opts?: { signal?: AbortSignal }): Promise<TaskSubtaskDto[]> {
  const res = await api.get<TaskSubtaskDto[]>(`/yego-gantt/tasks/${taskId}/subtasks`, {
    signal: opts?.signal,
  })
  return res.data
}

/** PUT — reordenar subtareas persistiendo `sortOrder` según lista completa de ids. */
export async function reorderTaskSubtasks(
  taskId: number,
  orderedSubtaskIds: number[],
): Promise<TaskSubtaskDto[]> {
  const res = await api.put<TaskSubtaskDto[]>(`/yego-gantt/tasks/${taskId}/subtasks/order`, {
    orderedSubtaskIds,
  })
  return res.data
}

export async function fetchTaskSubtask(
  taskId: number,
  subtaskId: number,
  opts?: { signal?: AbortSignal },
): Promise<TaskSubtaskDto> {
  const res = await api.get<TaskSubtaskDto>(`/yego-gantt/tasks/${taskId}/subtasks/${subtaskId}`, {
    signal: opts?.signal,
  })
  return res.data
}

export async function createTaskSubtask(
  taskId: number,
  body: {
    title: string
    weight: number
    done?: boolean
    status?: AreaTaskStatus
    assignedUserId?: number | null
    dueDate?: string | null
    description?: string | null
    objectives?: string | null
    checklist?: TaskSubtaskChecklistItem[]
    areaId?: number | null
    workspaceId?: number | null
  },
): Promise<TaskSubtaskDto> {
  const payload: Record<string, unknown> = {
    title: body.title,
    weight: body.weight,
    done: body.done ?? false,
  }
  if (body.assignedUserId != null) payload.assignedUserId = body.assignedUserId
  const d = body.dueDate?.trim()
  if (d) payload.dueDate = d
  const desc = body.description?.trim()
  if (desc) payload.description = desc
  const obj = body.objectives?.trim()
  if (obj) payload.objectives = obj
  if (body.checklist != null && body.checklist.length > 0) {
    payload.checklist = body.checklist.map((c) => ({
      ...(c.id ? { id: c.id } : {}),
      text: c.text.trim(),
      done: Boolean(c.done),
    }))
  }
  if (body.areaId != null) payload.areaId = body.areaId
  if (body.workspaceId != null) payload.workspaceId = body.workspaceId
  const res = await api.post<TaskSubtaskDto>(`/yego-gantt/tasks/${taskId}/subtasks`, payload)
  return res.data
}

export async function updateTaskSubtask(
  taskId: number,
  subtaskId: number,
  body: Partial<{
    title: string
    description: string
    objectives: string | null
    checklist: TaskSubtaskChecklistItem[] | null
    weight: number
    done: boolean
    sortOrder: number
    assignedUserId: number
    unassignUser: boolean
    dueDate: string | null
    clearDueDate: boolean
    areaId: number
    workspaceId: number
    clearWorkspace: boolean
    /** Columna Kanban propia de la subtarea. */
    status?: AreaTaskStatus
  }>,
): Promise<TaskSubtaskDto> {
  const res = await api.put(`/yego-gantt/tasks/${taskId}/subtasks/${subtaskId}`, body)
  return res.data
}

export async function deleteTaskSubtask(taskId: number, subtaskId: number): Promise<void> {
  await api.delete(`/yego-gantt/tasks/${taskId}/subtasks/${subtaskId}`)
}

/** Mueve la subtarea a otra tarea padre (permisos igual que crear/borrar subtarea). */
export async function moveTaskSubtask(
  fromParentTaskId: number,
  subtaskId: number,
  targetParentTaskId: number,
): Promise<TaskSubtaskDto> {
  const res = await api.post<TaskSubtaskDto>(
    `/yego-gantt/tasks/${fromParentTaskId}/subtasks/${subtaskId}/move`,
    { targetParentTaskId },
  )
  return res.data
}

export function parseGanttLoadError(e: unknown): string {
  const data = e && typeof e === 'object' && 'response' in e
    ? (e as { response?: { data?: { message?: string; code?: string } } }).response?.data
    : undefined
  if (data?.message != null && String(data.message).trim() !== '') {
    return String(data.message)
  }
  return 'Error al cargar'
}

export async function convertTaskToSubtask(
  taskId: number,
  targetParentTaskId: number,
): Promise<TaskSubtaskDto> {
  const res = await api.post<TaskSubtaskDto>(`/yego-gantt/tasks/${taskId}/convert-to-subtask`, {
    targetParentTaskId,
  })
  return res.data
}

// --- Actas de reunión (meeting minutes) ---

interface SpringPage<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

export type CreateMeetingMinutePayload = {
  title: string
  meetingDate: string
  meetingType?: MeetingMinuteType
  summary?: string | null
  ownerUserId?: number | null
  nextMeetingDate?: string | null
  status?: MeetingMinuteStatus
}

type UpdateMeetingMinutePayload = Partial<CreateMeetingMinutePayload>

export type CreateMeetingMinuteItemPayload = {
  itemOrder?: number | null
  areaId?: number | null
  areaNameSnapshot?: string | null
  projectId?: number | null
  sprintId?: number | null
  itemType?: WorkosMeetingItemType
  situation?: string | null
  decision?: string | null
  taskTitle?: string | null
  taskDescription?: string | null
  responsibleUserId?: number | null
  responsibleNameSnapshot?: string | null
  startDate?: string | null
  deadline?: string | null
  priority?: string | null
  status?: WorkosMeetingItemStatus
}

export type UpdateMeetingMinuteItemPayload = Omit<CreateMeetingMinuteItemPayload, 'itemOrder'>

export type ConvertMeetingItemPayload = {
  title?: string | null
  description?: string | null
  areaId?: number | null
  workspaceId?: number | null
  sprintId?: number | null
  startDate?: string | null
  endDate?: string | null
  status?: AreaTaskStatus
  priority?: TaskPriority
  assignedUserId?: number | null
  assignedUserIds?: number[] | null
  privateTask?: boolean
  tags?: string[] | null
}

interface MeetingMinutesListParams {
  status?: MeetingMinuteStatus
  meetingType?: MeetingMinuteType
  dateFrom?: string
  dateTo?: string
  ownerUserId?: number
  projectId?: number
  areaId?: number
  page?: number
  size?: number
  sort?: string
}

export async function fetchMeetingMinutesPage(
  params: MeetingMinutesListParams,
): Promise<SpringPage<MeetingMinuteResponse>> {
  const q: Record<string, string | number> = {}
  if (params.status) q.status = params.status
  if (params.meetingType) q.meetingType = params.meetingType
  if (params.dateFrom) q.dateFrom = params.dateFrom
  if (params.dateTo) q.dateTo = params.dateTo
  if (params.ownerUserId != null) q.ownerUserId = params.ownerUserId
  if (params.projectId != null) q.projectId = params.projectId
  if (params.areaId != null) q.areaId = params.areaId
  if (params.page != null) q.page = params.page
  if (params.size != null) q.size = params.size
  if (params.sort) q.sort = params.sort
  const res = await api.get<SpringPage<MeetingMinuteResponse>>(yegoGanttPaths.meetingMinutes, { params: q })
  return res.data
}

export async function fetchMeetingMinuteById(id: number): Promise<MeetingMinuteResponse> {
  const res = await api.get<MeetingMinuteResponse>(yegoGanttPaths.meetingMinuteById(id))
  return res.data
}

export async function createMeetingMinute(body: CreateMeetingMinutePayload): Promise<MeetingMinuteResponse> {
  const res = await api.post<MeetingMinuteResponse>(yegoGanttPaths.meetingMinutes, body)
  return res.data
}

export async function updateMeetingMinute(
  id: number,
  body: UpdateMeetingMinutePayload,
): Promise<MeetingMinuteResponse> {
  const res = await api.put<MeetingMinuteResponse>(yegoGanttPaths.meetingMinuteById(id), body)
  return res.data
}

export async function patchMeetingMinuteStatus(id: number, status: MeetingMinuteStatus): Promise<void> {
  await api.patch(yegoGanttPaths.meetingMinuteStatus(id), { status })
}

export async function softDeleteMeetingMinute(id: number): Promise<void> {
  await api.delete(yegoGanttPaths.meetingMinuteById(id))
}

export async function addMeetingMinuteItems(
  minuteId: number,
  items: CreateMeetingMinuteItemPayload[],
): Promise<MeetingMinuteResponse> {
  const res = await api.post<MeetingMinuteResponse>(yegoGanttPaths.meetingMinuteItems(minuteId), items)
  return res.data
}

export async function updateMeetingMinuteItem(
  minuteId: number,
  itemId: number,
  body: UpdateMeetingMinuteItemPayload,
): Promise<MeetingMinuteResponse> {
  const res = await api.put<MeetingMinuteResponse>(yegoGanttPaths.meetingMinuteItem(minuteId, itemId), body)
  return res.data
}

export async function deleteMeetingMinuteItem(minuteId: number, itemId: number): Promise<void> {
  await api.delete(yegoGanttPaths.meetingMinuteItem(minuteId, itemId))
}

export async function convertMeetingItemToTask(
  minuteId: number,
  itemId: number,
  body: ConvertMeetingItemPayload,
): Promise<ConvertMeetingItemToTaskResponse> {
  const res = await api.post<ConvertMeetingItemToTaskResponse>(
    yegoGanttPaths.meetingMinuteConvert(minuteId, itemId),
    omitUndefinedKeys({ ...(body as Record<string, unknown>) }),
  )
  return res.data
}

export async function fetchMeetingMinutesUnconverted(): Promise<MeetingMinuteItemResponse[]> {
  const res = await api.get<MeetingMinuteItemResponse[]>(yegoGanttPaths.meetingMinutesUnconverted)
  return res.data
}

export async function fetchMeetingMinutesDashboardKpis(): Promise<MeetingMinutesDashboardKpisResponse> {
  const res = await api.get<MeetingMinutesDashboardKpisResponse>(yegoGanttPaths.meetingMinutesDashboardKpis)
  return res.data
}
