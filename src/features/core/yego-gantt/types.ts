/**
 * Tipos compartidos del módulo Yego Gantt
 * Centraliza todas las definiciones de tipos para evitar duplicación
 */

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
  /** Flag persistido en API; las etiquetas «privada» siguen siendo respaldo en datos antiguos. */
  privateTask?: boolean
  createdByUserId?: number | null
  sortOrder?: number
  /** Agregados de subtareas (API). */
  subtaskDone?: number
  subtaskTotal?: number
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
}

export interface PortfolioTabProps {
  tasks: TaskRow[]
  loading: boolean
  refreshing?: boolean
  manage: boolean
  areas: AreaFull[]
  workspaces: WorkspaceDto[]
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
  filterText: string
  onFilterChange: (v: string) => void
  manage: boolean
  onEditTask: (t: TaskRow) => void
  onDeleteTask: (t: TaskRow) => void
  showHeatmap: boolean
  showCriticalPath: boolean
  onTaskSelectNotify?: (taskTitle: string) => void
  collaboratorsForArea: (areaId: number) => ColaboradorDto[]
  /** Vista «Mi espacio»: nombre de proyecto en barras del timeline. */
  mySpaceShowProjectNames?: boolean
  workspaceNameById?: Map<number, string>
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
