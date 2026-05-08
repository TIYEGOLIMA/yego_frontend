/**
 * Tipos compartidos del módulo Yego Gantt
 * Centraliza todas las definiciones de tipos para evitar duplicación
 */

import type { Dispatch, SetStateAction } from 'react'

// ==================== ENUMS/TIPOS BÁSICOS ====================

export type AreaTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'

// ==================== INTERFACES DE MODELO ====================

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

export interface WorkspaceDto {
  id: number
  name: string
  description?: string | null
  activo?: boolean
  /** Clave de icono (misma lista que backend). */
  iconKey?: string | null
  memberUserIds: number[]
}

export interface SprintDto {
  id: number
  workspaceId: number
  name: string
  goal?: string | null
  startDate: string
  endDate: string
  status: SprintStatus
  taskCount: number
  doneCount: number
}

// ==================== INTERFACES DE TAREAS ====================

export interface TaskRow {
  id: number
  areaId: number
  areaName?: string | null
  workspaceId?: number | null
  sprintId?: number | null
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
  /** Marca de tarea privada (columna persistida); no usar etiquetas «privada» para privacidad. */
  privateTask?: boolean
  createdByUserId?: number | null
  sortOrder?: number
  /** Agregados de subtareas (API). */
  subtaskDone?: number
  subtaskTotal?: number
  /** Resumen Gantt: el usuario actual tiene alguna subtarea asignada bajo esta tarea. */
  subtaskAssignedToViewer?: boolean
}

export interface TaskRowLike {
  id: number
  areaId: number
  areaName?: string | null
  workspaceId?: number | null
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
  privateTask?: boolean
  createdByUserId?: number | null
  /** Agregados de subtareas cuando el origen los expone (p. ej. TaskRow desde API). */
  subtaskDone?: number
  subtaskTotal?: number
  subtaskAssignedToViewer?: boolean
}

/** Subtarea (checklist); alineado con `/yego-gantt/tasks/:id/subtasks`. */
export interface TaskSubtaskDto {
  id: number
  parentTaskId: number
  title: string
  description?: string | null
  sortOrder: number
  done: boolean
  weight: string
  assignedUserId?: number | null
  dueDate?: string | null
  createdByUserId?: number | null
  /** Equipo efectivo (puede coincidir con el del padre si no hay override). */
  areaId?: number | null
  /** Espacio de trabajo / proyecto (herencia si null en API resuelto al padre). */
  workspaceId?: number | null
}

// ==================== TIPOS VISUALES DEL GANTT ====================

export type GanttVisualStatus = 'on-track' | 'at-risk' | 'blocked' | 'completed'
export type GanttVisualPriority = 'low' | 'medium' | 'high' | 'critical'

export interface GanttTaskItem {
  id: string
  name: string
  startDay: number
  duration: number
  progress: number
  status: GanttVisualStatus
  priority: GanttVisualPriority
  assignee?: string
  /** Responsable principal (owner): primer id en `assignedUserIds` o `assignedUserId`. */
  principalUserId?: number
  description?: string
  sourceId: number
  areaId: number
  /** Nombre del espacio de trabajo (vista «Mi espacio»). */
  workspaceLabel?: string | null
  subtaskDone?: number
  subtaskTotal?: number
}

export interface GanttTeamItem {
  id: string
  name: string
  capacity: number
  tasks: GanttTaskItem[]
}

export interface TimelineRange {
  anchor: Date
  totalDays: number
}

export type TimelineDayDensity = 'comfortable' | 'compact' | 'minimal'

// ==================== INTERFACES DE PROPS ====================

export interface DashboardTabProps {
  tasks: TaskRow[]
  workspaces: WorkspaceDto[]
  loading: boolean
  refreshing?: boolean
  onCreateTask?: () => void
  /** Abre la pestaña Actas dentro del mismo módulo WorkOS. */
  onOpenActasTab?: () => void
}

export interface PortfolioTabProps {
  tasks: TaskRow[]
  loading: boolean
  manage: boolean
  /** Crear/editar/borrar espacios de trabajo (proyectos Gantt): rol operativo exclusivo (no el jefe de área por sí solo). */
  canManageWorkspaces: boolean
  areas: AreaFull[]
  workspaces: WorkspaceDto[]
  /** Nombres de usuarios en cualquier equipo cargado (asignación cruzada entre áreas). */
  collaboratorNames?: Map<number, string>
  collaboratorsForArea: (areaId: number) => ColaboradorDto[]
  onEdit: (t: TaskRow) => void
  onDelete: (t: TaskRow) => void
  onCreateTask: (presetAreaId?: number) => void
  onDeleteArea: (areaId: number) => void
  onReload: (opts?: { refreshCollaborators?: boolean }) => void | Promise<void>
  /** Vista detalle (subtareas); si no se define, el clic sigue yendo a onEdit. */
  onOpenTask?: (t: TaskRow) => void
}

export interface TodoBoardTabProps {
  tasks: TaskRow[]
  loading: boolean
  refreshing?: boolean
  manage: boolean
  allCollaborators?: ColaboradorDto[]
  onStatusChange?: (taskId: number, newStatus: AreaTaskStatus) => Promise<void>
  onAddTask?: (status: AreaTaskStatus) => void
  /** Abre vista detalle con subtareas (clic en tarjeta). */
  onOpenTask?: (t: TaskRow) => void
  /** Id del usuario logueado (filtro «Mis tareas»). */
  currentUserId?: number | null
  /** Vista «Mi espacio»: muestra chip con nombre del proyecto si la tarea tiene `workspaceId`. */
  showWorkspaceOnCards?: boolean
  workspaceNameById?: Map<number, string>
}

export interface SprintsTabProps {
  tasks: TaskRow[]
  workspaces: WorkspaceDto[]
  manage: boolean
  /** Eliminar sprint: solo ADMIN/SUPERADMIN (la API también lo exige). */
  canDeleteSprints: boolean
  loading: boolean
  refreshing?: boolean
  onSprintsPayload: (byWorkspace: Record<number, SprintDto[]>) => void
  refreshTasksAndKpis: () => Promise<void>
  onTaskStatusChange?: (taskId: number, status: AreaTaskStatus) => void
  onOpenCreateTask?: (opts?: { sprintId?: number; workspaceId?: number }) => void
  onEditTask?: (task: TaskRow) => void
  collaboratorNames?: Map<number, string>
}

export interface GanttTimelineTabProps {
  tasks: TaskRow[]
  loading: boolean
  refreshing?: boolean
  timelinePanDays: number
  manage: boolean
  onEditTask: (t: TaskRow) => void
  onDeleteTask: (t: TaskRow) => void
  showHeatmap: boolean
  showCriticalPath: boolean
  onTaskSelectNotify?: (taskTitle: string) => void
  /** Nombres en todos los equipos cargados (responsables fuera del área de la fila). */
  collaboratorNames?: Map<number, string>
  collaboratorsForArea: (areaId: number) => ColaboradorDto[]
  /**
   * Listado amplio para el panel detalle del timeline (nombres/roles fuera del solo equipo de la tarea).
   * Si no se envía se usa collaboratorsForArea(tarea.areaId).
   */
  collaboratorsForDetailPanel?: ColaboradorDto[]
  /** Vista «Mi espacio»: nombre de proyecto en barras del timeline. */
  mySpaceShowProjectNames?: boolean
  workspaceNameById?: Map<number, string>
  /** Usuario sesión (checkbox de subtareas sin ser gestor). */
  currentUserId?: number | null
  /** Tras togglear subtareas en panel lateral del timeline (sincronizar KPIs/grid). */
  onParentSubtasksSynced?: (parentId: number, list: TaskSubtaskDto[]) => void
  /**
   * Estado de subtareas por tarea padre (mismo mapa que el timeline). Lo gestiona el padre
   * para actualizar el timeline al editar subtareas en el modal sin esperar un refetch.
   */
  subtasksByParentId: Map<number, TaskSubtaskDto[]>
  setSubtasksByParentId: Dispatch<SetStateAction<Map<number, TaskSubtaskDto[]>>>
}

// ==================== OTRAS INTERFACES ====================

export interface Kpis {
  equipos: number
  tareas: number
  progresoPromedioPct: number
  completadas: number
  bloqueadas: number
}

export interface AreaGroup {
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

// Actas de reunión (WorkOS) — alineado con enums backend
export type MeetingMinuteStatus = 'ABIERTA' | 'EN_SEGUIMIENTO' | 'CERRADA' | 'CANCELADA'

export type MeetingMinuteType = 'COMITE' | 'SEGUIMIENTO' | 'OPERATIVA' | 'ESTRATEGICA' | 'OTRO'

export type WorkosMeetingItemType = 'ACCION' | 'DECISION' | 'RIESGO' | 'SEGUIMIENTO' | 'INFORMACION'

export type WorkosMeetingItemStatus =
  | 'PENDIENTE'
  | 'EN_PROGRESO'
  | 'BLOQUEADA'
  | 'COMPLETADA'
  | 'CANCELADA'

export interface MeetingMinuteSummaryKpis {
  totalItems: number
  convertedItems: number
  unconvertedItems: number
  completedTasks: number
  inProgressTasks: number
  blockedTasks: number
  overdueTasks: number
  pendingWithoutTask: number
  completionPercentage: number
}

/** Pista para abrir una tarea que puede estar en otro espacio de trabajo (p. ej. tras convertir desde acta). */
export type GanttOpenTaskHint = {
  workspaceId?: number | null
  privateTask?: boolean
}

export interface MeetingMinuteItemResponse {
  id: number
  meetingMinuteId: number
  itemOrder: number | null
  areaId: number | null
  areaNameSnapshot: string | null
  projectId: number | null
  projectName: string | null
  sprintId: number | null
  sprintName: string | null
  itemType: WorkosMeetingItemType
  situation: string | null
  decision: string | null
  taskTitle: string | null
  taskDescription: string | null
  responsibleUserId: number | null
  responsibleNameSnapshot: string | null
  startDate: string | null
  deadline: string | null
  priority: string | null
  status: WorkosMeetingItemStatus
  converted: boolean
  convertedTaskId: number | null
  convertedAt: string | null
  convertedByUserId: number | null
  createdAt: string
  updatedAt: string
  taskStatus: AreaTaskStatus | null
  taskProgress: number | null
  taskEndDate: string | null
  taskIsOverdue: boolean | null
  taskAssigneeIds: number[] | null
}

export interface MeetingMinuteResponse {
  id: number
  title: string
  meetingDate: string
  meetingType: MeetingMinuteType
  summary: string | null
  createdByUserId: number | null
  ownerUserId: number | null
  status: MeetingMinuteStatus
  nextMeetingDate: string | null
  createdAt: string
  updatedAt: string
  items: MeetingMinuteItemResponse[] | null
  kpis: MeetingMinuteSummaryKpis | null
  /** API: solo ítems propios o de su área (no creador/dueño/admin). */
  partialItemsView?: boolean
}

export interface NamedCountDto {
  name: string
  count: number
}

export interface MeetingMinutesDashboardKpisResponse {
  openMinutes: number
  inFollowUpMinutes: number
  unconvertedItemsGlobal: number
  tasksBornFromMinutes: number
  overdueTasksFromMinutes: number
  completionPercentFromMinutes: number
  topResponsiblesPending: NamedCountDto[] | null
  topAreasBlocked: NamedCountDto[] | null
}

/** Respuesta mínima de tarea tras conversión desde acta. */
export interface AreaTaskResponseDto {
  id: number
  areaId: number
  areaName?: string | null
  workspaceId?: number | null
  sprintId?: number | null
  title: string
  description?: string | null
  startDate: string
  endDate: string
  status: AreaTaskStatus
  priority: TaskPriority
  progressPercent?: number | null
  assignedUserId?: number | null
  assignedUserIds?: number[] | null
  tags?: string[] | null
  privateTask?: boolean
  subtaskAssignedToViewer?: boolean
}

export interface ConvertMeetingItemToTaskResponse {
  item: MeetingMinuteItemResponse
  task: AreaTaskResponseDto
}
