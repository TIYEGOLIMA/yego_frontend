export { YegoGanttModule } from './yego-gantt.module'

export type { AssigneePickerRow } from './ganttCollaborators'
export {
  buildAssigneePickerRows,
  buildAllCollaboratorsDeduped,
  buildCollaboratorNameMap,
  buildCollaboratorAreaLabelMap,
  collaboratorAreaLabel,
} from './ganttCollaborators'

/** Contratos y funciones HTTP del módulo (rutas + fetch). */
export type { GanttTaskSummary, GanttMasterData } from './ganttApi'
export {
  yegoGanttPaths,
  areasPaths,
  ganttListParams,
  areasStableKey,
  fetchGanttTaskSummary,
  fetchGanttMasterData,
  fetchAreaCollaboratorsMap,
  fetchSprintsByWorkspaces,
  parseGanttLoadError,
} from './ganttApi'

// Tipos compartidos
export type {
  AreaTaskStatus,
  TaskPriority,
  SprintStatus,
  TaskRow,
  TaskRowLike,
  SprintDto,
  AreaFull,
  ColaboradorDto,
  WorkspaceDto,
  Kpis,
  GanttVisualStatus,
  GanttVisualPriority,
  GanttTaskItem,
  GanttTeamItem,
  TimelineRange,
  TimelineDayDensity,
  DashboardTabProps,
  PortfolioTabProps,
  TodoBoardTabProps,
  SprintsTabProps,
  GanttTimelineTabProps,
  AreaGroup,
} from './types'

// Utilidades
export {
  // Constantes
  STATUS_LABEL,
  TASK_STATUS_LABEL,
  TASK_STATUS_COLOR,
  STATUS_BG,
  PRIORITY_LABEL,
  PRIO_LABEL,
  PRIO_COLOR,
  PRIO_BADGE,
  PRIORITY_BADGE,
  SPRINT_STATUS_LABEL,
  TAG_COLORS,
  AREA_PILL_STYLES,
  // Funciones
  normPriority,
  norm,
  avatarInitials,
  tagColor,
  isOverdue,
  differenceInCalendarDays,
  fmtShort,
  initialsFromLabel,
  taskPoints,
  sprintCapacityPts,
  areaBarFill,
  areaLabelColor,
  areaPillClass,
  startOfDay,
  parseYmd,
  daysBetween,
  formatSpanishDayHeader,
  timelineDayDensity,
  isWeekendDay,
  mapVisualStatus,
  mapVisualPriority,
  computeDurationDays,
} from './utils'
