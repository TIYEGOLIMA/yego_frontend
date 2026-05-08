import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Clock,
  Crown,
  Calendar,
  CheckCircle2,
  Circle,
  Edit3,
  FileText,
  Flag,
  ListChecks,
  Loader2,
  Pencil,
  Route,
  ChevronDown,
  Trash2,
  User,
  X,
  GripVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import { WorkosTabLoading } from '../WorkosLoading'
import { SubtaskDoneToggle } from '../SubtaskFormFields'
import type {
  ColaboradorDto,
  GanttTimelineTabProps,
  TaskRow,
  TaskSubtaskChecklistItem,
  TaskSubtaskDto,
} from '../../types'
import { canUserToggleSubtaskDone, SUBTASK_DONE_NOT_ALLOWED_HINT } from '../../lib/ganttSubtaskPermissions'
import { updateTaskSubtaskNormalized, normalizeSubtaskDtoList, sortSubtasksForDisplay, bodyForSubtaskDoneToggleCommit } from '../../lib/ganttSubtaskProgress'
import { fetchTaskSubtasks, reorderTaskSubtasks } from '../../ganttApi'
import { useTaskSubtasks } from '../../hooks/useTaskSubtasks'
import { canCollaboratorManageTaskBasics } from '../../taskPrivacy'
import {
  DAY_WIDTH,
  TIMELINE_FLAT_TEAM_ID,
  timelineTaskBarColor,
  areaLabelColor,
  buildTimelineTeamsFlat,
  buildTimelineRange,
  computeCriticalPathTaskIds,
  computePerDayTaskLoad,
  formatTimelineDayCell,
  timelineDayDensity,
  getTodayOffsetDays,
  isTodayAtIndex,
  isWeekendDay,
  shiftTimelineRange,
  type GanttTaskItem,
  type GanttTeamItem,
  type TaskRowLike,
} from '../../ganttModel'
import {
  computeDurationDays,
  avatarInitials,
  differenceInCalendarDays,
  parseYmd,
  startOfDay,
  timelineSubtaskBarColor,
} from '../../utils'
import { formatTimelineShortDate, subtaskResponsibleLabel } from './timelineColumnUtils'
import { TimelineParentTaskRow } from './TimelineParentTaskRow'
import {
  TIMELINE_SUBTASK_BADGE_ICON,
  TIMELINE_SUBTASK_BADGE_LABEL,
  TIMELINE_SUBTASK_MINIBAR_HOVER_RING,
  TIMELINE_SUBTASK_ROW,
} from '../../timelinePalette'

const LEFT_COL = 288

/** Ítems de checklist no vacíos (misma semántica que el editor / agregados). */
function checklistTimelineItems(checklist: TaskSubtaskDto['checklist']): TaskSubtaskChecklistItem[] {
  if (!Array.isArray(checklist)) return []
  return checklist.filter((c) => String(c?.text ?? '').trim().length > 0)
}

function checklistLanesIfExpandedCount(
  subList: TaskSubtaskDto[],
  parentTaskId: number,
  expandedKeys: ReadonlySet<string>,
): number {
  let n = 0
  for (const s of subList) {
    const chk = checklistTimelineItems(s.checklist)
    if (chk.length === 0) continue
    if (!expandedKeys.has(`${parentTaskId}:${s.id}`)) continue
    n += chk.length
  }
  return n
}

/** Reinserta antes de `dropBeforeSubId` (solo ids del mismo padre). */
function moveOrderedSubtasksAdjacent(
  sorted: readonly TaskSubtaskDto[],
  fromSubId: number,
  dropBeforeSubId: number,
): TaskSubtaskDto[] {
  if (fromSubId === dropBeforeSubId) return sortSubtasksForDisplay([...sorted])
  const arr = [...sorted]
  const fromIdx = arr.findIndex((s) => s.id === fromSubId)
  if (fromIdx < 0) return sortSubtasksForDisplay(arr)
  const [moved] = arr.splice(fromIdx, 1)
  if (!moved) return sortSubtasksForDisplay(arr)
  const insertAt = arr.findIndex((s) => s.id === dropBeforeSubId)
  if (insertAt < 0) return sortSubtasksForDisplay(sorted)
  arr.splice(insertAt, 0, moved)
  return arr.map((s, i) => ({ ...s, sortOrder: i }))
}

/** Preview bajo el cursor durante HTML5 drag para que el usuario vea claro qué está moviendo. */
function setTimelineSubtaskDragPreview(ev: React.DragEvent, titleRaw: string) {
  const label = titleRaw.trim().length > 0 ? titleRaw.trim() : 'Subtarea'
  const display = label.length > 76 ? `${label.slice(0, 73)}…` : label
  const ghost = document.createElement('div')
  ghost.textContent = display
  ghost.setAttribute(
    'style',
    [
      'position:absolute',
      'left:-9999px',
      'top:0',
      'z-index:100000',
      'padding:10px 14px',
      'border-radius:12px',
      'border:2px dashed rgb(34,211,238)',
      'background:linear-gradient(135deg,rgb(236,253,250),rgb(255,255,255))',
      'box-shadow:0 14px 40px rgba(15,118,166,0.22)',
      'font-family:ui-sans-serif,system-ui,sans-serif',
      'font-weight:650',
      'font-size:11px',
      'line-height:1.35',
      'max-width:268px',
      'color:#0f172a',
      'pointer-events:none',
      'white-space:nowrap',
      'overflow:hidden',
      'text-overflow:ellipsis',
    ].join(';'),
  )
  document.body.appendChild(ghost)
  try {
    ev.dataTransfer.setDragImage(ghost, 28, 20)
  } catch {
    /* algunos navegadores limitan setDragImage */
  }
  window.requestAnimationFrame(() => {
    window.setTimeout(() => ghost.remove(), 0)
  })
}

function TimelineHeader({ anchor, totalDays, dayWidth }: { anchor: Date; totalDays: number; dayWidth: number }) {
  const days = Array.from({ length: totalDays }, (_, i) => i)
  const density = timelineDayDensity(totalDays)
  return (
    <div className="flex border-b border-[#e5e7eb] bg-[#fafafa] sticky top-0 z-30 dark:border-border/80 dark:bg-muted/30 min-h-[40px]">
      {days.map((day) => {
        const { weekday, label, title } = formatTimelineDayCell(anchor, day, density)
        const weekend = isWeekendDay(anchor, day)
        const today = isTodayAtIndex(anchor, day)
        return (
          <div
            key={day}
            title={title}
            className={`shrink-0 flex flex-col items-center justify-center border-r border-[#e5e7eb] dark:border-border/40 min-w-0 overflow-hidden px-0.5 ${
              density === 'minimal' ? 'py-1 gap-0' : 'py-1 gap-0.5'
            } ${
              today
                ? 'bg-sky-600/[0.12] text-sky-900 ring-1 ring-inset ring-sky-500/25 dark:bg-sky-500/15 dark:text-sky-100 dark:ring-sky-400/30'
                : weekend
                  ? 'bg-[#f3f4f6] text-muted-foreground dark:bg-muted/40'
                  : 'bg-white text-muted-foreground dark:bg-card'
            }`}
            style={{ width: dayWidth, maxWidth: dayWidth }}
          >
            {weekday ? (
              <span
                className={`leading-none font-medium whitespace-nowrap max-w-full truncate text-center normal-case tracking-normal ${
                  density === 'compact' ? 'text-[9px]' : 'text-[10px]'
                } ${today ? 'text-sky-900/90 dark:text-sky-100/90' : ''}`}
              >
                {weekday}
              </span>
            ) : null}
            <span
              className={`leading-none font-semibold whitespace-nowrap max-w-full truncate text-center normal-case tabular-nums ${
                density === 'minimal' ? 'text-[11px]' : density === 'compact' ? 'text-[10px]' : 'text-[11px]'
              } ${today ? 'text-sky-950 dark:text-sky-50' : 'text-foreground'}`}
            >
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function TodayLine({ anchor, totalDays, containerHeight, dayWidth }: { anchor: Date; totalDays: number; containerHeight: number; dayWidth: number }) {
  const range = useMemo(() => ({ anchor, totalDays }), [anchor, totalDays])
  const offset = getTodayOffsetDays(range)
  const left = offset * dayWidth + dayWidth / 2
  if (offset < 0 || offset >= totalDays) return null
  return (
    <div
      aria-hidden
      className="absolute top-0 z-0 w-px -translate-x-1/2 pointer-events-none bg-gradient-to-b from-sky-600/40 via-sky-500/22 to-transparent dark:from-sky-400/35 dark:via-sky-500/18"
      style={{ left, height: containerHeight }}
    />
  )
}

function rowSelectionForTask(
  task: GanttTaskItem,
  selectedSourceId: number | null,
  selectedPrincipalUserId: number | null | undefined,
): 'primary' | 'peer' | null {
  if (selectedSourceId == null) return null
  if (task.sourceId === selectedSourceId) return 'primary'
  if (
    selectedPrincipalUserId != null &&
    task.principalUserId != null &&
    task.principalUserId === selectedPrincipalUserId
  ) {
    return 'peer'
  }
  return null
}

/** Fondo de franja (columna equipos + rejilla) para tarea seleccionada o mismo responsable. */
function selectionLaneTint(sel: 'primary' | 'peer' | null): string {
  if (sel === 'primary') return 'bg-sky-500/14 dark:bg-sky-500/20'
  if (sel === 'peer') return 'bg-sky-500/[0.07] dark:bg-sky-500/12'
  return ''
}

function GanttBar({
  task,
  onClick,
  dimmed,
  highlightCritical,
  selectionEmphasis,
  yOffset,
  barIndex = 0,
  dayWidth,
}: {
  task: GanttTaskItem
  onClick: (t: GanttTaskItem) => void
  dimmed: boolean
  /** Tarea en ruta crítica: contorno para distinguirla del resto. */
  highlightCritical?: boolean
  /** Resaltado por selección en timeline (fila activa o mismo responsable). */
  selectionEmphasis?: 'primary' | 'peer' | null
  yOffset?: number
  barIndex?: number
  dayWidth: number
}) {
  const left = task.startDay * dayWidth
  const width = task.duration * dayWidth - 4
  const barW = Math.max(width, 24)
  const stTotal = task.subtaskTotal ?? 0
  const stDone = task.subtaskDone ?? 0

  const fill = timelineTaskBarColor(task.progress, task.status)

  const criticalRing =
    highlightCritical && selectionEmphasis == null
      ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-white dark:ring-white/55 dark:ring-offset-card z-[15]'
      : ''
  const selectionRing =
    selectionEmphasis === 'primary'
      ? 'ring-2 ring-white ring-offset-2 ring-offset-white dark:ring-white/90 dark:ring-offset-card z-[16]'
      : selectionEmphasis === 'peer'
        ? 'ring-1 ring-white/55 z-[14]'
        : ''

  return (
    <button
      type="button"
      className={`absolute z-10 flex items-center px-2 overflow-hidden rounded-lg border-2 border-white/40 border-l-[4px] border-l-white/70 text-left cursor-pointer shadow-md transition-all duration-200 hover:scale-[1.01] hover:z-20 hover:shadow-md hover:ring-2 hover:ring-white/45 dark:border-white/20 dark:border-l-white/50 dark:hover:ring-white/35 gantt-bar-grow ring-1 ring-sky-950/10 dark:ring-sky-200/20 ${
        dimmed ? 'opacity-35' : ''
      } ${criticalRing} ${selectionRing}`}
      style={{
        left,
        width: barW,
        height: 28,
        top: yOffset ?? '50%',
        transform: yOffset == null ? 'translateY(-50%)' : undefined,
        animationDelay: `${barIndex * 0.08}s`,
        backgroundColor: fill,
        color: '#fff',
      }}
      onClick={() => onClick(task)}
      title={[
        `Tarea: ${task.name}`,
        task.principalUserId != null ? '· Responsable principal' : '',
        task.workspaceLabel ? `· ${task.workspaceLabel}` : '',
        stTotal > 0 ? `· Subtareas ${stDone}/${stTotal}` : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-l-lg bg-black/20"
        style={{ width: `${Math.min(100, Math.max(0, task.progress))}%` }}
      />
      <span className="relative min-w-0 flex-1 truncate text-[11px] font-semibold drop-shadow-sm">
        {task.name}
        {task.workspaceLabel ? (
          <span className="font-normal opacity-85"> · {task.workspaceLabel}</span>
        ) : null}
      </span>
      {stTotal > 0 && (
        <span
          className={`relative shrink-0 tabular-nums font-bold bg-black/35 text-white/95 ${
            barW >= 48 ? 'mr-1 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px]' : 'rounded px-0.5 py-px text-[8px]'
          }`}
          title={`${stDone} de ${stTotal} subtareas`}
        >
          {barW >= 48 ? <ListChecks className="h-2.5 w-2.5 shrink-0 opacity-90" aria-hidden /> : null}
          {stDone}/{stTotal}
        </span>
      )}
      {task.progress > 0 && width > 72 && (
        <span className="relative ml-auto text-[10px] tabular-nums font-bold bg-black/25 rounded px-1 py-0.5 shrink-0">
          {task.progress}%
        </span>
      )}
    </button>
  )
}

const TIMELINE_LANE_H = 42

function subtaskTimelineSpan(
  parent: GanttTaskItem,
  dueDate: string | null | undefined,
  anchor: Date,
  totalDays: number,
): { startDay: number; duration: number } {
  const d = dueDate ? parseYmd(dueDate) : null
  if (d) {
    let dayIdx = differenceInCalendarDays(startOfDay(d), startOfDay(anchor))
    if (dayIdx < 0) dayIdx = 0
    if (dayIdx >= totalDays) dayIdx = totalDays - 1
    return { startDay: dayIdx, duration: 1 }
  }
  return { startDay: parent.startDay, duration: Math.max(1, parent.duration) }
}

function SubtaskGanttBar({
  parent,
  sub,
  parentRow,
  anchor,
  totalDays,
  laneIdx,
  dayWidth,
  onOpenParent,
  onActivateSubtimeline,
  manage,
  currentUserId,
}: {
  parent: GanttTaskItem
  sub: TaskSubtaskDto
  parentRow: TaskRowLike
  anchor: Date
  totalDays: number
  laneIdx: number
  dayWidth: number
  onOpenParent: (t: GanttTaskItem) => void
  /** Clic sobre la barra de subtarea: selección + modal de subtarea (sin modal de tarea padre). */
  onActivateSubtimeline?: (parentRow: TaskRowLike, sub: TaskSubtaskDto) => void
  manage: boolean
  currentUserId: number | null | undefined
}) {
  const { startDay, duration } = subtaskTimelineSpan(parent, sub.dueDate, anchor, totalDays)
  const left = startDay * dayWidth
  const width = Math.max(duration * dayWidth - 4, 20)
  const fill = timelineSubtaskBarColor(parent.progress, parent.status)
  const fade = sub.done ? 'opacity-40' : 'opacity-95'
  const laneTop = laneIdx * TIMELINE_LANE_H
  const barTop = laneTop + (TIMELINE_LANE_H - 20) / 2

  const canEditSubtimeline =
    onActivateSubtimeline != null &&
    (manage || canCollaboratorManageTaskBasics(parentRow, currentUserId))

  return (
    <button
      type="button"
      title={`Subtarea: ${sub.title?.trim() || 'Subtarea'} · Padre: ${parent.name}`}
      className={`absolute z-[9] flex items-center gap-1 pl-1.5 pr-2 overflow-hidden rounded-full border-2 border-dashed border-white/70 text-left cursor-pointer transition-all duration-150 shadow-md hover:opacity-100 hover:z-[19] ${TIMELINE_SUBTASK_MINIBAR_HOVER_RING} ${fade}`}
      style={{
        left,
        width,
        height: 20,
        top: barTop,
        backgroundColor: fill,
        color: '#fff',
        boxShadow: 'inset 4px 0 0 rgba(255,255,255,0.35)',
      }}
      onClick={() =>
        canEditSubtimeline && onActivateSubtimeline
          ? onActivateSubtimeline(parentRow, sub)
          : onOpenParent(parent)
      }
    >
      <span
        className="relative shrink-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-black/25 border border-white/35"
        aria-hidden
      >
        <ListChecks className="h-2 w-2 text-white opacity-95" strokeWidth={2.5} />
      </span>
      <span className="relative min-w-0 flex-1 truncate text-[8px] font-medium italic opacity-95 drop-shadow-sm leading-tight">
        {sub.title?.trim() || `Sub #${sub.id}`}
      </span>
    </button>
  )
}

/** Fondo de celda día: hoy, heatmap por carga, fin de semana o neutro. */
function timelineDayCellClass(
  anchor: Date,
  dayIndex: number,
  showHeatmap: boolean,
  concurrentTasks: number,
): string {
  const base = 'shrink-0 border-r border-[#e5e7eb]/80 h-full dark:border-border/30'
  if (isTodayAtIndex(anchor, dayIndex)) {
    return `${base} bg-sky-500/[0.08] dark:bg-sky-500/14`
  }
  if (showHeatmap) {
    if (concurrentTasks >= 3) return `${base} bg-red-500/15 dark:bg-red-500/25`
    if (concurrentTasks === 2) return `${base} bg-amber-500/12 dark:bg-amber-500/20`
    if (concurrentTasks === 1) return `${base} bg-emerald-500/10 dark:bg-emerald-500/15`
  }
  if (isWeekendDay(anchor, dayIndex)) {
    return `${base} bg-[#f9fafb] dark:bg-muted/30`
  }
  return `${base} bg-white dark:bg-transparent`
}

type TimelineLane =
  | { kind: 'parent'; task: GanttTaskItem; laneIdx: number }
  | { kind: 'sub'; parent: GanttTaskItem; parentRow: TaskRowLike; sub: TaskSubtaskDto; laneIdx: number }
  | {
      kind: 'subChecklist'
      parent: GanttTaskItem
      parentRow: TaskRowLike
      sub: TaskSubtaskDto
      item: TaskSubtaskChecklistItem
      itemKey: string
      laneIdx: number
    }

interface TeamRowWithGridProps {
  team: GanttTeamItem
  totalDays: number
  anchor: Date
  onTaskClick: (t: GanttTaskItem) => void
  showHeatmap: boolean
  showCriticalPath: boolean
  /** Colaboradores mostrados en la columna izquierda (área o listado global en vista plana). */
  collaborators: ColaboradorDto[]
  collaboratorNames?: Map<number, string>
  staggerIndex?: number
  dayWidth: number
  selectedSourceId: number | null
  selectedPrincipalUserId: number | null | undefined
  tasksBySourceId: Map<number, TaskRowLike>
  subtasksByParentId: Map<number, TaskSubtaskDto[]>
  manage: boolean
  currentUserId: number | null | undefined
  onParentSubtasksSynced?: (parentId: number, nextList: TaskSubtaskDto[]) => void
  onSubtaskDoneBlockedNotify?: (message?: string) => void
  collapsedParentIds: ReadonlySet<number>
  onToggleParentSubtasksCollapsed: (parentSourceId: number) => void
  expandedSubtaskChecklistKeys: ReadonlySet<string>
  onToggleSubtaskChecklistExpanded: (parentTaskId: number, subtaskId: number) => void
  onDropTaskToSubtask?: (sourceTaskId: number, targetTaskId: number) => void
  /** Seleccionar padre en el panel sin abrir el modal de editar tarea. */
  onSelectTimelineTaskSidebarOnly: (task: GanttTaskItem) => void
  onTimelineEditPersistedSubtask?: (parent: TaskRow, sub: TaskSubtaskDto) => void
}

function TeamRowWithGrid({
  team,
  totalDays,
  anchor,
  onTaskClick,
  showHeatmap,
  showCriticalPath,
  collaborators,
  collaboratorNames,
  staggerIndex = 0,
  dayWidth,
  selectedSourceId,
  selectedPrincipalUserId,
  tasksBySourceId,
  subtasksByParentId,
  manage,
  currentUserId,
  onParentSubtasksSynced,
  onSubtaskDoneBlockedNotify,
  collapsedParentIds,
  onToggleParentSubtasksCollapsed,
  expandedSubtaskChecklistKeys,
  onToggleSubtaskChecklistExpanded,
  onDropTaskToSubtask,
  onSelectTimelineTaskSidebarOnly,
  onTimelineEditPersistedSubtask,
}: TeamRowWithGridProps) {
  const [subBusyId, setSubBusyId] = useState<number | null>(null)
  const [reorderBusyParentId, setReorderBusyParentId] = useState<number | null>(null)
  /** Activo durante el gesto HTML5-drag (para estilos reactivos en la lista). */
  const [reorderDrag, setReorderDrag] = useState<{ parentSourceId: number; subtaskId: number } | null>(
    null,
  )
  /** Insertar justo antes de esta fila cuando sueltas. */
  const [reorderHoverBefore, setReorderHoverBefore] = useState<{
    parentSourceId: number
    targetSubtaskId: number
  } | null>(null)
  const subtaskReorderDragRef = useRef<{ parentSourceId: number; subtaskId: number } | null>(null)

  const clearReorderDragUi = useCallback(() => {
    subtaskReorderDragRef.current = null
    setReorderDrag(null)
    setReorderHoverBefore(null)
  }, [])

  useEffect(() => {
    if (!reorderDrag) return undefined
    const onWinDragEnd = () => clearReorderDragUi()
    window.addEventListener('dragend', onWinDragEnd)
    return () => window.removeEventListener('dragend', onWinDragEnd)
  }, [reorderDrag, clearReorderDragUi])

  const lanes = useMemo(() => {
    const out: TimelineLane[] = []
    let laneIdx = 0
    for (const task of team.tasks) {
      out.push({ kind: 'parent', task, laneIdx })
      laneIdx++
      const subs = subtasksByParentId.get(task.sourceId)
      const parentRow = tasksBySourceId.get(task.sourceId)
      const orderedSubs = subs?.length ? sortSubtasksForDisplay(subs) : undefined
      if (!orderedSubs?.length || !parentRow) continue
      if (collapsedParentIds.has(task.sourceId)) continue
      for (const sub of orderedSubs) {
        out.push({ kind: 'sub', parent: task, parentRow, sub, laneIdx })
        laneIdx++
        const chk = checklistTimelineItems(sub.checklist)
        if (chk.length === 0 || !expandedSubtaskChecklistKeys.has(`${task.sourceId}:${sub.id}`))
          continue
        for (let ci = 0; ci < chk.length; ci++) {
          const item = chk[ci]!
          const rawId =
            typeof item.id === 'string' && item.id.trim().length > 0 ? item.id.trim() : ''
          const itemKey =
            rawId !== ''
              ? `${sub.id}:${rawId}`
              : `${sub.id}:chk-${ci}:${String(item.text ?? '').trim().slice(0, 48)}`
          out.push({
            kind: 'subChecklist',
            parent: task,
            parentRow,
            sub,
            item,
            itemKey,
            laneIdx,
          })
          laneIdx++
        }
      }
    }
    return out
  }, [
    team.tasks,
    subtasksByParentId,
    tasksBySourceId,
    collapsedParentIds,
    expandedSubtaskChecklistKeys,
  ])

  const laneCount = lanes.length > 0 ? lanes.length : team.tasks.length
  const taskLaneMinHeight = Math.max(48, laneCount * TIMELINE_LANE_H + 8)

  const perDayLoad = useMemo(() => computePerDayTaskLoad(team.tasks, totalDays), [team.tasks, totalDays])
  const maxOverlap = useMemo(() => perDayLoad.reduce((a, b) => Math.max(a, b), 0), [perDayLoad])

  const heatmapRowTint =
    showHeatmap && maxOverlap > 0
      ? maxOverlap >= 3
        ? 'bg-red-500/[0.05] dark:bg-red-950/25'
        : maxOverlap >= 2
          ? 'bg-amber-500/[0.05] dark:bg-amber-950/20'
          : 'bg-emerald-500/[0.04] dark:bg-emerald-950/15'
      : ''

  const criticalIds = useMemo(() => {
    if (!showCriticalPath) return null as Set<string> | null
    return computeCriticalPathTaskIds(team.tasks)
  }, [showCriticalPath, team.tasks])

  const tw = totalDays * dayWidth

  return (
    <div
      className={`border-b border-[#e5e7eb] gantt-fade-in dark:border-border ${heatmapRowTint}`}
      style={{ animationDelay: `${staggerIndex * 0.06}s` }}
    >
      {/* Main row: team header + gantt bars */}
      <div className="flex">
        <div
          className="shrink-0 sticky left-0 z-20 bg-white border-r border-[#e5e7eb] px-4 py-2.5 flex flex-col gap-2 shadow-[2px_0_8px_-4px_rgba(0,0,0,0.06)] dark:bg-card dark:border-border/80"
          style={{ width: LEFT_COL }}
        >
          {team.id !== TIMELINE_FLAT_TEAM_ID ? (
            <span
              className="text-sm font-semibold truncate"
              style={{ color: areaLabelColor(Number(team.id)) }}
              title={team.name}
            >
              {team.name}
            </span>
          ) : null}
          <div
            className="flex flex-col gap-0 w-full shrink-0 pt-1 text-[11px] text-muted-foreground/75 leading-tight"
            style={{ minHeight: taskLaneMinHeight }}
          >
            {lanes.map((lane) => {
              const laneSel =
                lane.kind === 'parent'
                  ? rowSelectionForTask(lane.task, selectedSourceId, selectedPrincipalUserId)
                  : rowSelectionForTask(lane.parent, selectedSourceId, selectedPrincipalUserId)
              const laneBg = selectionLaneTint(laneSel)

              if (lane.kind === 'parent') {
                const task = lane.task
                const rawSubs = subtasksByParentId.get(task.sourceId)
                const loadedSubs = rawSubs?.length ? sortSubtasksForDisplay(rawSubs) : rawSubs
                const apiSubCount = task.subtaskTotal ?? 0
                const hasSubtasks =
                  (loadedSubs?.length ?? 0) > 0 || apiSubCount > 0
                return (
                  <TimelineParentTaskRow
                    key={`p-${task.id}`}
                    task={task}
                    laneBgClass={laneBg}
                    collaborators={collaborators}
                    collaboratorNames={collaboratorNames}
                    subs={loadedSubs}
                    hasSubtasks={hasSubtasks}
                    subtasksExpanded={!collapsedParentIds.has(task.sourceId)}
                    onToggleSubtasksCollapsed={() =>
                      onToggleParentSubtasksCollapsed(task.sourceId)
                    }
                    onActivate={() => onTaskClick(task)}
                    onDropTaskToSubtask={onDropTaskToSubtask}
                  />
                )
              }

              if (lane.kind === 'subChecklist') {
                const { parent, item, itemKey } = lane
                const laneCkSel = rowSelectionForTask(
                  parent,
                  selectedSourceId,
                  selectedPrincipalUserId,
                )
                const laneCkBg = selectionLaneTint(laneCkSel)
                const ckText = String(item.text ?? '').trim()
                const ckDone = Boolean(item.done)
                return (
                  <div
                    key={`ck-${itemKey}`}
                    className={cn(
                      'flex shrink-0 select-none gap-1.5 min-h-[40px] py-1.5 pl-10 pr-1.5 items-center rounded-md mr-px',
                      'ml-7 border border-rose-200/90 bg-gradient-to-r from-rose-50 via-rose-50/78 to-transparent',
                      'border-l-[4px] border-l-rose-500/95 dark:border-rose-800/95',
                      'dark:from-rose-950/60 dark:via-rose-950/38 dark:to-transparent',
                      'shadow-sm ring-1 ring-inset ring-rose-200/80 dark:ring-rose-800/65',
                      laneCkBg,
                    )}
                    aria-label={`Checklist de subtarea ${parent.name}: ${ckText}`}
                  >
                    <span aria-hidden className="shrink-0 text-rose-500 dark:text-rose-400">
                      {ckDone ? (
                        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                      ) : (
                        <Circle className="h-3.5 w-3.5" strokeWidth={2.25} />
                      )}
                    </span>
                    <span
                      className={cn(
                        'min-w-0 flex-1 text-[10px] leading-snug font-semibold tracking-tight',
                        'text-rose-950/95 dark:text-rose-100/95 [overflow-wrap:anywhere]',
                        ckDone &&
                          'line-through decoration-rose-500/70 text-rose-800/82 dark:text-rose-300/82',
                      )}
                    >
                      {ckText.length > 260 ? `${ckText.slice(0, 257)}…` : ckText}
                    </span>
                  </div>
                )
              }

              const { parent, parentRow, sub } = lane
              const canToggle = canUserToggleSubtaskDone(
                parentRow,
                sub,
                currentUserId,
                manage || canCollaboratorManageTaskBasics(parentRow, currentUserId),
              )
              const rn = subtaskResponsibleLabel(sub.assignedUserId, collaboratorNames)
              const subChecklistItems = checklistTimelineItems(sub.checklist)
              const subChecklistExpanded = expandedSubtaskChecklistKeys.has(`${parent.sourceId}:${sub.id}`)
              const canOpenSubtimelineEditor =
                onTimelineEditPersistedSubtask != null &&
                (manage || canCollaboratorManageTaskBasics(parentRow, currentUserId))
              const canReorderSubs = manage || canCollaboratorManageTaskBasics(parentRow, currentUserId)
              const reorderBusyHere = reorderBusyParentId === parent.sourceId
              const reorderActiveHere = reorderDrag?.parentSourceId === parent.sourceId
              const isDragSource =
                reorderDrag?.parentSourceId === parent.sourceId && reorderDrag.subtaskId === sub.id
              const showDropCue =
                reorderActiveHere &&
                reorderDrag.subtaskId !== sub.id &&
                reorderHoverBefore?.parentSourceId === parent.sourceId &&
                reorderHoverBefore.targetSubtaskId === sub.id
              const sameGroupReorderDragging =
                reorderActiveHere && reorderDrag !== null && !reorderBusyHere
              return (
                <div
                  key={`s-${parent.sourceId}-${sub.id}`}
                  className={cn(
                    TIMELINE_SUBTASK_ROW,
                    laneBg,
                    'relative transition-[opacity,transform,box-shadow] duration-150',
                    sameGroupReorderDragging &&
                      !isDragSource &&
                      !showDropCue &&
                      'shadow-[inset_0_0_0_1px_rgba(34,211,238,0.35)] bg-gradient-to-r from-cyan-500/[0.07] via-transparent dark:from-cyan-400/[0.12]',
                    isDragSource &&
                      '-translate-y-px z-[55] rounded-md opacity-[0.45] shadow-xl ring-[3px] ring-cyan-500/65 ring-offset-2 ring-offset-white dark:ring-offset-card scale-[0.985]',
                    showDropCue && 'rounded-t-none z-[50] pt-[5px]',
                  )}
                  title={`Subtarea · Tarea: ${parent.name}${canReorderSubs ? ' · Arrastra el asa para cambiar orden' : ''}`}
                  onDragOver={(e) => {
                    if (!canReorderSubs || reorderBusyHere) return
                    const drag = subtaskReorderDragRef.current
                    if (!drag || drag.parentSourceId !== parent.sourceId || drag.subtaskId === sub.id)
                      return
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    setReorderHoverBefore((prev) => {
                      const next = { parentSourceId: parent.sourceId, targetSubtaskId: sub.id }
                      if (
                        prev?.parentSourceId === next.parentSourceId &&
                        prev?.targetSubtaskId === next.targetSubtaskId
                      ) {
                        return prev
                      }
                      return next
                    })
                  }}
                  onDrop={async (e) => {
                    e.preventDefault()
                    const dragSnapshot = subtaskReorderDragRef.current
                    const pid = parent.sourceId
                    if (!canReorderSubs || reorderBusyHere) {
                      clearReorderDragUi()
                      return
                    }
                    if (
                      !dragSnapshot ||
                      dragSnapshot.parentSourceId !== pid ||
                      dragSnapshot.subtaskId === sub.id
                    ) {
                      clearReorderDragUi()
                      return
                    }
                    const base = sortSubtasksForDisplay(subtasksByParentId.get(pid) ?? [])
                    const optimistic = moveOrderedSubtasksAdjacent(base, dragSnapshot.subtaskId, sub.id)
                    onParentSubtasksSynced?.(pid, optimistic)
                    clearReorderDragUi()
                    try {
                      setReorderBusyParentId(pid)
                      const server = normalizeSubtaskDtoList(
                        await reorderTaskSubtasks(
                          pid,
                          optimistic.map((x) => x.id),
                        ),
                      )
                      onParentSubtasksSynced?.(pid, server)
                    } catch {
                      onSubtaskDoneBlockedNotify?.(SUBTASK_REORDER_FAILED_HINT)
                      try {
                        const rows = await fetchTaskSubtasks(pid)
                        onParentSubtasksSynced?.(pid, normalizeSubtaskDtoList(rows))
                      } catch {
                        /* ignore refresh failure */
                      }
                    } finally {
                      setReorderBusyParentId(null)
                    }
                  }}
                >
                  {showDropCue ? (
                    <div
                      aria-hidden
                      className="absolute left-0 right-2 top-0 z-20 h-[3px] rounded-full bg-cyan-500 shadow-[0_0_14px_rgb(34,211,238)] pointer-events-none"
                    />
                  ) : null}
                  {canReorderSubs ? (
                    reorderBusyHere ? (
                      <span
                        className="shrink-0 inline-flex w-8 items-center justify-center text-muted-foreground"
                        aria-label="Guardando orden de subtareas"
                        title="Guardando orden…"
                      >
                        <Loader2 className="h-4 w-4 animate-spin opacity-85" aria-hidden />
                      </span>
                    ) : (
                      <span
                        className={cn(
                          'shrink-0 inline-flex items-center justify-center rounded-md p-0.5 text-muted-foreground',
                          'hover:text-cyan-700 hover:bg-cyan-500/10 dark:hover:bg-cyan-950/55 dark:hover:text-cyan-200',
                          'cursor-grab active:cursor-grabbing touch-none select-none',
                          isDragSource && 'text-cyan-700 dark:text-cyan-200',
                        )}
                        draggable
                        role="button"
                        tabIndex={0}
                        aria-label="Arrastrar para reordenar subtareas"
                        title="Sostén y arrastra; suelta sobre otra fila para dejarla encima (se guarda solo)"
                        onDragStart={(ev) => {
                          const ctx = { parentSourceId: parent.sourceId, subtaskId: sub.id }
                          subtaskReorderDragRef.current = ctx
                          setReorderDrag(ctx)
                          ev.dataTransfer.effectAllowed = 'move'
                          ev.dataTransfer.setData('text/plain', `yego-subtask-reorder:${sub.id}`)
                          setTimelineSubtaskDragPreview(ev, sub.title ?? '')
                        }}
                        onDragEnd={clearReorderDragUi}
                        onClick={(ev) => ev.stopPropagation()}
                        onKeyDown={(ev) => ev.stopPropagation()}
                      >
                        <GripVertical className="h-4 w-4" aria-hidden />
                      </span>
                    )
                  ) : (
                    <span className="w-3 shrink-0" aria-hidden />
                  )}
                  <span className="flex w-5 shrink-0 flex-col items-center justify-center gap-px select-none pointer-events-none" aria-hidden>
                    <ListChecks className={TIMELINE_SUBTASK_BADGE_ICON} strokeWidth={2.25} />
                    <span className={TIMELINE_SUBTASK_BADGE_LABEL}>sub</span>
                  </span>
                  <div className="shrink-0" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <SubtaskDoneToggle
                      done={sub.done}
                      canToggle={canToggle}
                      disabled={subBusyId === sub.id}
                      preferDisabledCheckbox
                      checkboxClassName="mt-0"
                      cannotToggleTitle={SUBTASK_DONE_NOT_ALLOWED_HINT}
                      onCannotToggleInteract={() =>
                        onSubtaskDoneBlockedNotify?.(SUBTASK_DONE_NOT_ALLOWED_HINT)
                      }
                      onCommitted={async (next) => {
                        setSubBusyId(sub.id)
                        try {
                          const updated = await updateTaskSubtaskNormalized(
                            parent.sourceId,
                            sub.id,
                            bodyForSubtaskDoneToggleCommit(sub, next),
                          )
                          const prev = subtasksByParentId.get(parent.sourceId) ?? []
                          const nextList = sortSubtasksForDisplay(
                            prev.map((x) => (x.id === sub.id ? updated : x)),
                          )
                          onParentSubtasksSynced?.(parent.sourceId, nextList)
                        } catch (e: unknown) {
                          onSubtaskDoneBlockedNotify?.(
                            httpResponseStatus(e) === 403
                              ? SUBTASK_DONE_NOT_ALLOWED_HINT
                              : SUBTASK_UPDATE_FAILED_HINT,
                          )
                        } finally {
                          setSubBusyId(null)
                        }
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (canOpenSubtimelineEditor && onTimelineEditPersistedSubtask) {
                        onSelectTimelineTaskSidebarOnly(parent)
                        onTimelineEditPersistedSubtask(parentRow as TaskRow, sub)
                        return
                      }
                      onTaskClick(parent)
                    }}
                    className="min-w-0 flex-1 text-left flex flex-col justify-center gap-0.5 py-px"
                    title={[
                      sub.title?.trim() || `Subtarea #${sub.id}`,
                      `Tarea: ${parent.name}`,
                      rn ? `Responsable: ${rn}` : '',
                      sub.dueDate ? `Vence: ${formatTimelineShortDate(sub.dueDate)}` : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  >
                    <span
                      className={`min-w-0 w-full truncate text-[10px] font-normal italic leading-snug text-left ${
                        sub.done
                          ? 'text-muted-foreground line-through decoration-muted-foreground/45'
                          : 'text-foreground/85'
                      }`}
                    >
                      {sub.title?.trim() || `Subtarea #${sub.id}`}
                    </span>
                    {(rn || sub.dueDate) ? (
                      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0 text-[8px] text-muted-foreground leading-tight">
                        {rn ? (
                          <span className="inline-flex min-w-0 items-center gap-0.5" title={`Responsable: ${rn}`}>
                            <User className="h-2.5 w-2.5 shrink-0 opacity-80" aria-hidden />
                            <span className="truncate">{rn}</span>
                          </span>
                        ) : null}
                        {sub.dueDate ? (
                          <span className="inline-flex shrink-0 items-center gap-0.5 tabular-nums">
                            <Calendar className="h-2 w-2 shrink-0 opacity-80" aria-hidden />
                            {formatTimelineShortDate(sub.dueDate)}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </button>
                  {subChecklistItems.length > 0 ? (
                    <button
                      type="button"
                      aria-label={subChecklistExpanded ? 'Ocultar checklist' : 'Mostrar checklist'}
                      aria-expanded={subChecklistExpanded}
                      title={subChecklistExpanded ? 'Ocultar ítems de checklist' : 'Mostrar checklist de esta subtarea'}
                      className={cn(
                        'shrink-0 self-stretch flex items-center justify-center pl-0.5 pr-1 min-w-[28px]',
                        'border-l border-cyan-700/14 text-muted-foreground/90 transition-colors rounded-r-md',
                        'hover:bg-cyan-950/[0.06] hover:text-foreground dark:border-cyan-400/22',
                        'dark:hover:bg-cyan-400/[0.1] dark:hover:text-cyan-50',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500',
                      )}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onToggleSubtaskChecklistExpanded(parent.sourceId, sub.id)
                      }}
                    >
                      <ChevronDown
                        className={cn(
                          'h-2.5 w-2.5 shrink-0 opacity-90 stroke-[2.5] transition-transform duration-200 ease-out',
                          !subChecklistExpanded && '-rotate-90',
                        )}
                        aria-hidden
                      />
                    </button>
                  ) : canOpenSubtimelineEditor && onTimelineEditPersistedSubtask ? (
                    <button
                      type="button"
                      aria-label="Editar subtarea"
                      title="Editar subtarea"
                      className={cn(
                        'shrink-0 self-stretch flex items-center justify-center pl-0.5 pr-1 min-w-[28px]',
                        'border-l border-cyan-700/14 text-muted-foreground/90 transition-colors rounded-r-md',
                        'hover:bg-cyan-950/[0.06] hover:text-foreground dark:border-cyan-400/22',
                        'dark:hover:bg-cyan-400/[0.1] dark:hover:text-cyan-50',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500',
                      )}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onSelectTimelineTaskSidebarOnly(parent)
                        onTimelineEditPersistedSubtask(parentRow as TaskRow, sub)
                      }}
                    >
                      <Pencil className="h-2.5 w-2.5 shrink-0 opacity-90 stroke-[2.5]" aria-hidden />
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        <div className="relative z-[4] flex-1 overflow-hidden" style={{ minWidth: tw }}>
          <div className="absolute inset-0 flex">
            {Array.from({ length: totalDays }, (_, i) => (
              <div
                key={i}
                className={timelineDayCellClass(anchor, i, showHeatmap, perDayLoad[i] ?? 0)}
                style={{ width: dayWidth }}
                title={
                  showHeatmap && (perDayLoad[i] ?? 0) > 0
                    ? `${perDayLoad[i]} tarea(s) activas este día`
                    : undefined
                }
              />
            ))}
          </div>
          <div className="relative" style={{ minHeight: taskLaneMinHeight }}>
            {lanes.map((lane) => {
              const laneSel =
                lane.kind === 'parent'
                  ? rowSelectionForTask(lane.task, selectedSourceId, selectedPrincipalUserId)
                  : rowSelectionForTask(lane.parent, selectedSourceId, selectedPrincipalUserId)
              if (lane.kind === 'parent') {
                const task = lane.task
                const idx = lane.laneIdx
                const barYOffset = idx * TIMELINE_LANE_H + (TIMELINE_LANE_H - 28) / 2
                return (
                  <React.Fragment key={`g-p-${task.id}`}>
                    {laneSel ? (
                      <div
                        className={`absolute left-0 right-0 z-[1] rounded-md pointer-events-none ${selectionLaneTint(laneSel)}`}
                        style={{ top: barYOffset, height: 28 }}
                        aria-hidden
                      />
                    ) : null}
                    <GanttBar
                      task={task}
                      onClick={onTaskClick}
                      dimmed={showCriticalPath && criticalIds !== null && !criticalIds.has(task.id)}
                      highlightCritical={showCriticalPath && (criticalIds?.has(task.id) ?? false)}
                      selectionEmphasis={laneSel}
                      yOffset={barYOffset}
                      barIndex={idx}
                      dayWidth={dayWidth}
                    />
                  </React.Fragment>
                )
              }

              if (lane.kind === 'subChecklist') {
                const idxCk = lane.laneIdx
                const topBand = idxCk * TIMELINE_LANE_H
                return (
                  <React.Fragment key={`g-${lane.itemKey}`}>
                    {laneSel ? (
                      <div
                        className={`absolute left-0 right-0 z-[1] pointer-events-none rounded-sm ${selectionLaneTint(laneSel)}`}
                        style={{ top: topBand, height: TIMELINE_LANE_H }}
                        aria-hidden
                      />
                    ) : null}
                    <div
                      aria-hidden
                      className="absolute left-[18px] right-[14px] z-[8] rounded-full opacity-95 bg-gradient-to-r from-transparent via-rose-400/98 to-transparent dark:via-rose-500/90"
                      style={{ top: topBand + TIMELINE_LANE_H / 2 - 2, height: 3 }}
                    />
                  </React.Fragment>
                )
              }

              const { parent, parentRow, sub } = lane
              const idx = lane.laneIdx
              const subBarH = 20
              const subSelTop = idx * TIMELINE_LANE_H + (TIMELINE_LANE_H - subBarH) / 2
              return (
                <React.Fragment key={`g-s-${parent.sourceId}-${sub.id}`}>
                  {laneSel ? (
                    <div
                      className={`absolute left-0 right-0 z-[1] rounded-md pointer-events-none ${selectionLaneTint(laneSel)}`}
                      style={{ top: subSelTop, height: subBarH }}
                      aria-hidden
                    />
                  ) : null}
                  <SubtaskGanttBar
                    parent={parent}
                    sub={sub}
                    parentRow={parentRow}
                    anchor={anchor}
                    totalDays={totalDays}
                    laneIdx={idx}
                    dayWidth={dayWidth}
                    onOpenParent={onTaskClick}
                    onActivateSubtimeline={
                      onTimelineEditPersistedSubtask
                        ? (pr, s) => {
                            onSelectTimelineTaskSidebarOnly(parent)
                            onTimelineEditPersistedSubtask(pr as TaskRow, s)
                          }
                        : undefined
                    }
                    manage={manage}
                    currentUserId={currentUserId}
                  />
                </React.Fragment>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

const MINIMAP_W = 300
const MINIMAP_H = 48

function Minimap({
  scrollLeft,
  viewportWidth,
  onSeek,
  teams,
  totalDays,
  dayWidth,
}: {
  scrollLeft: number
  viewportWidth: number
  onSeek: (x: number) => void
  teams: GanttTeamItem[]
  totalDays: number
  dayWidth: number
}) {
  const totalW = totalDays * dayWidth
  const scale = MINIMAP_W / totalW
  const thumbW = Math.max(viewportWidth * scale, 20)
  const thumbLeft = scrollLeft * scale

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const newScroll = (x / MINIMAP_W) * totalW - viewportWidth / 2
    onSeek(Math.max(0, Math.min(newScroll, totalW - viewportWidth)))
  }

  return (
    <div className="px-4 py-2 border-t border-[#e5e7eb] bg-[#fafafa] flex items-center gap-3 shrink-0 dark:border-border/60 dark:bg-muted/20">
      <Route className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">Nav</span>
      <button
        type="button"
        className="relative rounded-md bg-muted cursor-pointer overflow-hidden border border-border text-left p-0"
        style={{ width: MINIMAP_W, height: MINIMAP_H }}
        onClick={handleClick}
        aria-label="Minimapa del timeline"
      >
        {teams.map((team, teamIdx) =>
          team.tasks.map((task) => (
            <div
              key={task.id}
              className="absolute rounded-sm bg-sky-500/45 dark:bg-sky-500/40"
              style={{
                left: task.startDay * scale * dayWidth,
                width: Math.max(task.duration * scale * dayWidth, 2),
                top: teamIdx * 9 + 2,
                height: 6,
              }}
            />
          )),
        )}
        <div
          className="absolute top-0 h-full border border-sky-500/45 bg-sky-500/10 rounded pointer-events-none dark:border-sky-400/40"
          style={{ left: thumbLeft, width: thumbW }}
        />
      </button>
    </div>
  )
}

const STATUS_UI: Record<string, { label: string; className: string }> = {
  'on-track': {
    label: 'En curso',
    className: 'text-amber-700 bg-white border-amber-400 dark:bg-transparent dark:border-amber-500/50',
  },
  'at-risk': {
    label: 'En riesgo',
    className: 'text-orange-700 bg-white border-orange-400 dark:bg-transparent',
  },
  blocked: { label: 'Bloqueado', className: 'text-red-700 bg-white border-red-300 dark:bg-transparent' },
  completed: { label: 'Completado', className: 'text-emerald-700 bg-white border-emerald-400 dark:bg-transparent' },
}

const PRIORITY_UI: Record<string, { label: string; className: string }> = {
  low: { label: 'Baja', className: 'text-muted-foreground bg-white border-[#e5e7eb]' },
  medium: { label: 'Media', className: 'text-sky-700 bg-white border-sky-400 dark:text-sky-300' },
  high: { label: 'Alta', className: 'text-amber-800 bg-white border-amber-500' },
  critical: { label: 'Urgente', className: 'text-red-700 bg-white border-red-400' },
}

function httpResponseStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('response' in error)) return undefined
  const r = (error as { response?: { status?: number } }).response
  return r?.status
}

const SUBTASK_UPDATE_FAILED_HINT = 'No se pudo guardar el cambio en la subtarea.'
const SUBTASK_REORDER_FAILED_HINT = 'No se pudo guardar el orden de las subtareas.'

function TimelineDetailSubtasksSection({
  parentTask,
  loading,
  items,
  setItems,
  manage,
  currentUserId,
  summaryDone,
  summaryTotal,
  collaboratorNames,
  onParentSubtasksSynced,
  onSubtaskDoneBlockedNotify,
  onEditPersisted,
}: {
  parentTask: TaskRowLike
  loading: boolean
  items: TaskSubtaskDto[]
  setItems: React.Dispatch<React.SetStateAction<TaskSubtaskDto[]>>
  manage: boolean
  currentUserId: number | null | undefined
  summaryDone: number
  summaryTotal: number
  collaboratorNames?: Map<number, string>
  onParentSubtasksSynced?: (parentId: number, nextList: TaskSubtaskDto[]) => void
  onSubtaskDoneBlockedNotify?: (message?: string) => void
  onEditPersisted?: (sub: TaskSubtaskDto) => void
}) {
  const [busyId, setBusyId] = useState<number | null>(null)
  const canEditSubtaskRows =
    manage || canCollaboratorManageTaskBasics(parentTask, currentUserId)

  if (!loading && items.length === 0 && summaryTotal <= 0) return null

  const doneInList = items.reduce((n, s) => n + (s.done ? 1 : 0), 0)
  const listPct = items.length > 0 ? Math.round((100 * doneInList) / items.length) : null
  const subtitle =
    !loading && items.length > 0 ? (
      <div className="text-[10px] text-muted-foreground">
        {doneInList} de {items.length} completadas
      </div>
    ) : !loading && summaryTotal > 0 ? (
      <div className="text-[10px] text-muted-foreground tabular-nums">
        {summaryDone}/{summaryTotal} · resumen
      </div>
    ) : null

  return (
    <div className="rounded-lg border border-border/60 bg-muted/15 overflow-hidden dark:border-border/50">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 bg-muted/25 dark:bg-muted/15">
        <div
          className="h-7 w-7 shrink-0 rounded-md bg-primary/12 text-primary flex items-center justify-center border border-primary/15 dark:bg-primary/15"
          aria-hidden
        >
          <ListChecks className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-foreground">Subtareas</div>
          {subtitle}
        </div>
        {listPct != null ? (
          <span className="shrink-0 text-[10px] font-semibold tabular-nums rounded-full bg-primary/12 text-primary px-2 py-0.5 border border-primary/15">
            {listPct}%
          </span>
        ) : null}
      </div>
      <div className="p-2">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 px-1" role="status">
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary-600" aria-hidden />
            <span>Cargando subtareas…</span>
          </div>
        ) : items.length > 0 ? (
          <ul className="space-y-0.5 max-h-[min(32vh,220px)] overflow-y-auto overscroll-contain">
            {items.map((pst) => {
              const rn = subtaskResponsibleLabel(pst.assignedUserId, collaboratorNames)
              const canToggle = canUserToggleSubtaskDone(
                parentTask,
                pst,
                currentUserId,
                manage || canCollaboratorManageTaskBasics(parentTask, currentUserId),
              )
              return (
              <li
                key={pst.id}
                className="rounded-md px-2 py-1 text-[13px] leading-snug border border-transparent hover:border-border/40 hover:bg-muted/25"
              >
                <div className="flex items-start gap-2">
                  <SubtaskDoneToggle
                    done={pst.done}
                    canToggle={canToggle}
                    disabled={loading || busyId === pst.id}
                    preferDisabledCheckbox
                    checkboxClassName="mt-px"
                    cannotToggleTitle={SUBTASK_DONE_NOT_ALLOWED_HINT}
                    onCannotToggleInteract={() =>
                      onSubtaskDoneBlockedNotify?.(SUBTASK_DONE_NOT_ALLOWED_HINT)
                    }
                    onCommitted={async (next) => {
                      setBusyId(pst.id)
                      try {
                        const updated = await updateTaskSubtaskNormalized(
                          parentTask.id,
                          pst.id,
                          bodyForSubtaskDoneToggleCommit(pst, next),
                        )
                        setItems((prev) => {
                          const nextList = prev.map((x) => (x.id === pst.id ? updated : x))
                          onParentSubtasksSynced?.(parentTask.id, nextList)
                          return nextList
                        })
                      } catch (e: unknown) {
                        onSubtaskDoneBlockedNotify?.(
                          httpResponseStatus(e) === 403
                            ? SUBTASK_DONE_NOT_ALLOWED_HINT
                            : SUBTASK_UPDATE_FAILED_HINT,
                        )
                      } finally {
                        setBusyId(null)
                      }
                    }}
                  />
                  <div
                    className={cn(
                      'min-w-0 flex-1 space-y-0.5',
                      canEditSubtaskRows && onEditPersisted ? 'cursor-pointer' : '',
                    )}
                    role={canEditSubtaskRows && onEditPersisted ? 'button' : undefined}
                    tabIndex={canEditSubtaskRows && onEditPersisted ? 0 : undefined}
                    onClick={() => {
                      if (!canEditSubtaskRows || busyId != null || !onEditPersisted) return
                      onEditPersisted(pst)
                    }}
                    onKeyDown={(e) => {
                      if (!canEditSubtaskRows || busyId != null || !onEditPersisted) return
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onEditPersisted(pst)
                      }
                    }}
                  >
                    <span
                      className={`block ${
                        pst.done
                          ? 'text-muted-foreground line-through decoration-muted-foreground/45'
                          : 'text-foreground'
                      }`}
                    >
                      {pst.title?.trim() || `Subtarea #${pst.id}`}
                    </span>
                    {(rn || pst.dueDate) ? (
                      <div className="flex flex-wrap gap-x-2 gap-y-px text-[10px] text-muted-foreground">
                        {rn ? (
                          <span className="inline-flex items-center gap-0.5 min-w-0">
                            <User className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                            <span className="truncate">{rn}</span>
                          </span>
                        ) : null}
                        {pst.dueDate ? (
                          <span className="inline-flex items-center gap-0.5 tabular-nums shrink-0">
                            <Calendar className="h-3 w-3 opacity-80" aria-hidden />
                            {formatTimelineShortDate(pst.dueDate)}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className={cn(
                      'shrink-0 rounded-md p-1 mt-px text-muted-foreground hover:text-primary hover:bg-primary/10',
                      !canEditSubtaskRows || !onEditPersisted || busyId != null ? 'hidden' : '',
                    )}
                    aria-label={`Editar subtarea: ${pst.title?.trim() || pst.id}`}
                    title="Editar subtarea"
                    disabled={busyId != null}
                    onClick={() => onEditPersisted?.(pst)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-[11px] text-muted-foreground py-1 px-1 leading-snug">
            Sin subtareas. Gestión en <strong className="font-medium text-foreground/85">Editar</strong>.
          </p>
        )}
      </div>
    </div>
  )
}

function TaskDetailPanel({
  task,
  ganttTask,
  onClose,
  onEdit,
  onDelete,
  manage,
  currentUserId,
  collaborators,
  collaboratorNames,
  onParentSubtasksSynced,
  onSubtaskDoneBlockedNotify,
  subtasksByParentId,
  onTimelineEditPersistedSubtask,
}: {
  task: TaskRowLike | null
  ganttTask: GanttTaskItem | null
  onClose: () => void
  onEdit: (t: TaskRowLike) => void
  onDelete: (t: TaskRowLike) => void
  manage: boolean
  currentUserId?: number | null
  collaborators: ColaboradorDto[]
  collaboratorNames?: Map<number, string>
  onParentSubtasksSynced?: (parentId: number, nextList: TaskSubtaskDto[]) => void
  onSubtaskDoneBlockedNotify?: (message?: string) => void
  subtasksByParentId: Map<number, TaskSubtaskDto[]>
  onTimelineEditPersistedSubtask?: (parent: TaskRow, sub: TaskSubtaskDto) => void
}) {
  const { items: subtasks, loading: subtasksLoading, setItems: setSubtasks } = useTaskSubtasks(
    task?.id ?? null,
  )

  const mapSubs = task != null ? subtasksByParentId.get(task.id) : undefined
  useEffect(() => {
    if (mapSubs === undefined) return
    if (subtasksLoading && mapSubs.length === 0) return
    setSubtasks(mapSubs)
  }, [mapSubs, setSubtasks, subtasksLoading])

  if (!task || !ganttTask) return null

  const st = STATUS_UI[ganttTask.status] || STATUS_UI['on-track']
  const pr = PRIORITY_UI[ganttTask.priority] || PRIORITY_UI.medium
  const duration = computeDurationDays(task.startDate, task.endDate)

  const assigneeIds = task.assignedUserIds?.length
    ? task.assignedUserIds
    : task.assignedUserId != null
      ? [task.assignedUserId]
      : []
  const assignees = assigneeIds.map((uid) => {
    const c = collaborators.find((x) => x.id === uid)
    return {
      id: uid,
      name: c?.nombreCompleto ?? collaboratorNames?.get(uid) ?? `Usuario #${uid}`,
      role: c?.rol ?? '',
    }
  })
  const principalUserId = ganttTask.principalUserId

  return (
    <div className="w-80 shrink-0 border-l border-[#e5e7eb] bg-white overflow-y-auto flex flex-col gantt-slide-right workos-shadow-elevated dark:border-border/80 dark:bg-card">
      <div className="p-5 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-base font-bold leading-tight text-foreground">{task.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 font-mono">t-{task.id}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-[#f3f4f6] shrink-0 -mt-1 -mr-1" aria-label="Cerrar">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Actions */}
        {(manage || canCollaboratorManageTaskBasics(task, currentUserId)) && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 min-w-0 text-xs h-9 gap-1.5 rounded-lg border-primary-500 text-primary-600 bg-white hover:bg-primary-50 dark:hover:bg-primary-950/30"
              onClick={() => onEdit(task)}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Editar
            </Button>
            {manage && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 rounded-lg text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => onDelete(task)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}

        {/* Status + Priority */}
        <div className="flex flex-wrap gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${st.className}`}>
            <Clock className="w-3 h-3" />
            {st.label}
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${pr.className}`}>
            <Flag className="w-3 h-3" />
            {pr.label}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-semibold">
            <FileText className="w-3 h-3" /> Descripción
          </span>
          <p className="text-sm text-foreground leading-relaxed">
            {task.description?.trim() ? task.description : <span className="italic text-muted-foreground">Sin descripción</span>}
          </p>
        </div>

        <TimelineDetailSubtasksSection
          parentTask={task}
          loading={subtasksLoading}
          items={subtasks}
          setItems={setSubtasks}
          manage={manage}
          currentUserId={currentUserId}
          summaryDone={task.subtaskDone ?? 0}
          summaryTotal={task.subtaskTotal ?? 0}
          collaboratorNames={collaboratorNames}
          onParentSubtasksSynced={onParentSubtasksSynced}
          onSubtaskDoneBlockedNotify={onSubtaskDoneBlockedNotify}
          onEditPersisted={
            onTimelineEditPersistedSubtask
              ? (sub) => onTimelineEditPersistedSubtask(task as TaskRow, sub)
              : undefined
          }
        />

        {/* Assigned */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 font-semibold">
            <User className="w-3 h-3" /> {assignees.length > 1 ? 'Asignados' : 'Asignado'}
          </span>
          {assignees.length > 0 ? (
            <div className="space-y-2">
              {assignees.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 flex items-center justify-center text-[11px] font-bold text-red-600 dark:text-red-400">
                      {avatarInitials(a.name)}
                    </div>
                    {principalUserId != null && a.id === principalUserId && (
                      <Crown
                        className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 text-amber-500 drop-shadow-sm dark:text-amber-400"
                        aria-hidden
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{a.name}</p>
                    {a.role ? (
                      <p className="text-[11px] text-muted-foreground truncate">{a.role}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Sin asignar</p>
          )}
        </div>

        {/* Progreso + fechas (misma tarjeta: barra y tres columnas debajo) */}
        <div className="rounded-lg border border-[#e5e7eb] bg-[#fafafa] p-4 space-y-3 dark:border-border/60 dark:bg-muted/20">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Progreso</span>
            <span className="text-sm font-semibold tabular-nums text-foreground">{ganttTask.progress}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-[#e5e7eb] overflow-hidden dark:bg-border/60">
            <div
              className="h-full rounded-full workos-progress-fill transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, ganttTask.progress))}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-3 pt-1 border-t border-[#e5e7eb]/80 dark:border-border/50">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Inicio</div>
              <div className="text-sm font-semibold tabular-nums text-foreground mt-0.5 leading-tight">
                {formatTimelineShortDate(task.startDate)}
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Fin</div>
              <div className="text-sm font-semibold tabular-nums text-foreground mt-0.5 leading-tight">
                {formatTimelineShortDate(task.endDate)}
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Duración</div>
              <div className="text-sm font-semibold tabular-nums text-foreground mt-0.5 leading-tight">
                {duration} día{duration !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function useTimelineTaskActivation(
  taskById: Map<number, TaskRowLike>,
  opts: {
    manage: boolean
    currentUserId: number | null | undefined
    onTaskSelectNotify?: (title: string) => void
    onEditTask: (row: TaskRow) => void
  },
) {
  const { manage, currentUserId, onTaskSelectNotify, onEditTask } = opts
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null)
  const [selectedGantt, setSelectedGantt] = useState<GanttTaskItem | null>(null)

  const clearSelection = useCallback(() => {
    setSelectedSourceId(null)
    setSelectedGantt(null)
  }, [])

  const activateTask = useCallback(
    (gt: GanttTaskItem, options?: { openEditModal?: boolean }) => {
      const openEdit = options?.openEditModal !== false
      setSelectedSourceId(gt.sourceId)
      setSelectedGantt(gt)
      const row = taskById.get(gt.sourceId)
      if (row) onTaskSelectNotify?.(row.title)
      if (
        openEdit &&
        row != null &&
        (manage || canCollaboratorManageTaskBasics(row, currentUserId))
      ) {
        onEditTask(row as TaskRow)
      }
    },
    [taskById, onTaskSelectNotify, manage, currentUserId, onEditTask],
  )

  return { selectedSourceId, selectedGantt, clearSelection, activateTask }
}

export function GanttTimelineTab({
  tasks,
  loading,
  refreshing = false,
  timelinePanDays = 0,
  manage,
  onEditTask,
  onDeleteTask,
  showHeatmap,
  showCriticalPath,
  onTaskSelectNotify,
  collaboratorsForArea,
  collaboratorsForDetailPanel,
  collaboratorNames,
  mySpaceShowProjectNames = false,
  workspaceNameById,
  currentUserId = null,
  onParentSubtasksSynced,
  subtasksByParentId,
  setSubtasksByParentId,
  onDropTaskToSubtask,
  onTimelineEditPersistedSubtask,
}: GanttTimelineTabProps) {
  const [scrollLeft, setScrollLeft] = useState(0)
  const [viewportW, setViewportW] = useState(800)
  const [subtaskDoneHint, setSubtaskDoneHint] = useState<string | null>(null)
  const [collapsedSubtasksParentIds, setCollapsedSubtasksParentIds] = useState(() => new Set<number>())
  const [expandedSubtaskChecklistKeys, setExpandedSubtaskChecklistKeys] = useState(() => new Set<string>())
  const scrollRef = useRef<HTMLDivElement>(null)

  const toggleParentSubtasksCollapsed = useCallback((parentSourceId: number) => {
    setCollapsedSubtasksParentIds((prev) => {
      const next = new Set(prev)
      if (next.has(parentSourceId)) next.delete(parentSourceId)
      else next.add(parentSourceId)
      return next
    })
  }, [])

  const toggleSubtaskChecklistExpanded = useCallback((parentTaskId: number, subtaskId: number) => {
    const key = `${parentTaskId}:${subtaskId}`
    setExpandedSubtaskChecklistKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const notifySubtaskDoneBlocked = useCallback((msg?: string) => {
    const m = msg?.trim()
    setSubtaskDoneHint(m && m.length > 0 ? m : SUBTASK_DONE_NOT_ALLOWED_HINT)
  }, [])

  useEffect(() => {
    if (!subtaskDoneHint) return
    const tid = window.setTimeout(() => setSubtaskDoneHint(null), 8000)
    return () => window.clearTimeout(tid)
  }, [subtaskDoneHint])

  const baseRange = useMemo(() => buildTimelineRange(tasks), [tasks])
  const range = useMemo(() => shiftTimelineRange(baseRange, timelinePanDays), [baseRange, timelinePanDays])
  const timelineTeams = useMemo(
    () =>
      buildTimelineTeamsFlat(tasks, range, {
        workspaceNameById,
        showProjectNameOnTasks: mySpaceShowProjectNames,
      }),
    [tasks, range, workspaceNameById, mySpaceShowProjectNames],
  )

  const totalDays = range.totalDays
  const availableForTimeline = viewportW - LEFT_COL
  const dayWidth = Math.max(DAY_WIDTH, Math.floor(availableForTimeline / totalDays))
  const totalWidth = LEFT_COL + totalDays * dayWidth
  const todayLineHeight = useMemo(() => {
    let h = 48
    for (const tm of timelineTeams) {
      let lc = tm.tasks.length
      for (const gt of tm.tasks) {
        if (!collapsedSubtasksParentIds.has(gt.sourceId)) {
          const subList = subtasksByParentId.get(gt.sourceId) ?? []
          lc += subList.length
          lc += checklistLanesIfExpandedCount(subList, gt.sourceId, expandedSubtaskChecklistKeys)
        }
      }
      h += Math.max(72, lc * TIMELINE_LANE_H + 52)
    }
    return Math.max(160, h)
  }, [timelineTeams, subtasksByParentId, collapsedSubtasksParentIds, expandedSubtaskChecklistKeys])

  const taskById = useMemo(() => {
    const m = new Map<number, TaskRowLike>()
    for (const t of tasks) m.set(t.id, t)
    return m
  }, [tasks])

  const { selectedSourceId, selectedGantt, clearSelection, activateTask } = useTimelineTaskActivation(taskById, {
    manage,
    currentUserId,
    onTaskSelectNotify,
    onEditTask,
  })

  const selectTimelineTaskSidebarOnly = useCallback(
    (gt: GanttTaskItem) => activateTask(gt, { openEditModal: false }),
    [activateTask],
  )

  const handleSubtasksSyncedFromUi = useCallback(
    (parentId: number, nextList: TaskSubtaskDto[]) => {
      setSubtasksByParentId((prev) => new Map(prev).set(parentId, nextList))
      onParentSubtasksSynced?.(parentId, nextList)
    },
    [onParentSubtasksSynced, setSubtasksByParentId],
  )

  const selectedTask = selectedSourceId != null ? taskById.get(selectedSourceId) ?? null : null
  const taskDetailCollaboratorSource =
    selectedTask != null
      ? collaboratorsForDetailPanel ?? collaboratorsForArea(selectedTask.areaId)
      : []

  const handleScroll = useCallback(() => {
    if (scrollRef.current) setScrollLeft(scrollRef.current.scrollLeft)
  }, [])

  const handleSeek = useCallback((x: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = x
      setScrollLeft(x)
    }
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setViewportW(el.clientWidth || 800))
    ro.observe(el)
    setViewportW(el.clientWidth || 800)
    return () => ro.disconnect()
  }, [timelineTeams.length])

  const blockingLoad = loading && tasks.length === 0

  return (
    <div className="flex flex-col flex-1 min-h-0 min-h-[420px] max-h-[calc(100vh-260px)] overflow-hidden bg-transparent relative">
      {blockingLoad && <WorkosTabLoading srLabel="Cargando timeline…" />}

      {!blockingLoad && timelineTeams.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm">
          <p>No hay proyectos que mostrar en esta vista.</p>
        </div>
      )}

      {!blockingLoad && timelineTeams.length > 0 && (
        <div
          className={`flex flex-1 min-h-0 overflow-hidden rounded-xl border border-[#e5e7eb] bg-white workos-shadow-soft dark:border-border/80 dark:bg-card ${refreshing ? 'opacity-95' : ''}`}
        >
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {subtaskDoneHint ? (
              <div className="shrink-0 z-[60] px-3 pt-2" role="alert" aria-live="polite">
                <div className="rounded-lg border border-amber-500/45 bg-amber-50 px-3 py-2 text-xs leading-snug text-amber-950 shadow-sm dark:border-amber-500/40 dark:bg-amber-950/50 dark:text-amber-50">
                  {subtaskDoneHint}
                </div>
              </div>
            ) : null}
            <div ref={scrollRef} className="flex-1 overflow-auto" onScroll={handleScroll}>
              <div style={{ minWidth: totalWidth }}>
                <div className="flex sticky top-0 z-30 items-stretch min-h-[40px]">
                  <div
                    className="shrink-0 sticky left-0 z-40 bg-[#fafafa] border-b border-r border-[#e5e7eb] px-3 py-1 flex items-end shadow-[2px_0_8px_-4px_rgba(0,0,0,0.06)] dark:bg-muted/30 dark:border-border/80 min-h-[40px] box-border"
                    style={{ width: LEFT_COL }}
                  >
                    <span className="sr-only">Lista de tareas en el timeline</span>
                  </div>
                  <TimelineHeader anchor={range.anchor} totalDays={totalDays} dayWidth={dayWidth} />
                </div>
                <div className="relative">
                  <div className="absolute top-0 z-0 pointer-events-none" style={{ left: LEFT_COL, width: totalDays * dayWidth }}>
                    <TodayLine anchor={range.anchor} totalDays={totalDays} containerHeight={todayLineHeight} dayWidth={dayWidth} />
                  </div>
                  {timelineTeams.map((team, tIdx) => (
                    <TeamRowWithGrid
                      key={team.id}
                      team={team}
                      staggerIndex={tIdx}
                      totalDays={totalDays}
                      anchor={range.anchor}
                      onTaskClick={activateTask}
                      showHeatmap={showHeatmap}
                      showCriticalPath={showCriticalPath}
                      collaborators={
                        team.id === TIMELINE_FLAT_TEAM_ID
                          ? collaboratorsForDetailPanel ?? []
                          : collaboratorsForArea(Number(team.id))
                      }
                      collaboratorNames={collaboratorNames}
                      dayWidth={dayWidth}
                      selectedSourceId={selectedSourceId}
                      selectedPrincipalUserId={selectedGantt?.principalUserId}
                      tasksBySourceId={taskById}
                      subtasksByParentId={subtasksByParentId}
                      manage={manage}
                      currentUserId={currentUserId}
                      onParentSubtasksSynced={handleSubtasksSyncedFromUi}
                      onSubtaskDoneBlockedNotify={notifySubtaskDoneBlocked}
                      collapsedParentIds={collapsedSubtasksParentIds}
                      onToggleParentSubtasksCollapsed={toggleParentSubtasksCollapsed}
                      expandedSubtaskChecklistKeys={expandedSubtaskChecklistKeys}
                      onToggleSubtaskChecklistExpanded={toggleSubtaskChecklistExpanded}
                      onDropTaskToSubtask={onDropTaskToSubtask}
                      onSelectTimelineTaskSidebarOnly={selectTimelineTaskSidebarOnly}
                      onTimelineEditPersistedSubtask={onTimelineEditPersistedSubtask}
                    />
                  ))}
                </div>
              </div>
            </div>
            <Minimap
              scrollLeft={scrollLeft}
              viewportWidth={viewportW}
              onSeek={handleSeek}
              teams={timelineTeams}
              totalDays={totalDays}
              dayWidth={dayWidth}
            />
          </div>
          <TaskDetailPanel
            task={selectedTask}
            ganttTask={selectedGantt}
            onClose={clearSelection}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
            manage={manage}
            currentUserId={currentUserId}
            collaborators={selectedTask ? taskDetailCollaboratorSource : []}
            collaboratorNames={collaboratorNames}
            onParentSubtasksSynced={handleSubtasksSyncedFromUi}
            onSubtaskDoneBlockedNotify={notifySubtaskDoneBlocked}
            subtasksByParentId={subtasksByParentId}
            onTimelineEditPersistedSubtask={onTimelineEditPersistedSubtask}
          />
        </div>
      )}
    </div>
  )
}

export default GanttTimelineTab
