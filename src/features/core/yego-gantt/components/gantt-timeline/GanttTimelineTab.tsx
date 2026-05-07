import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Clock,
  CornerDownRight,
  Crown,
  Calendar,
  Edit3,
  FileText,
  Flag,
  ListChecks,
  Loader2,
  Route,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WorkosTabLoading } from '../WorkosLoading'
import { SubtaskDoneToggle } from '../SubtaskFormFields'
import type { TaskSubtaskDto } from '../../types'
import { canUserToggleSubtaskDone } from '../../lib/ganttSubtaskPermissions'
import { updateTaskSubtaskNormalized } from '../../lib/ganttSubtaskProgress'
import { useTaskSubtasks } from '../../hooks/useTaskSubtasks'
import { useTimelineTasksSubtasks } from '../../hooks/useTimelineTasksSubtasks'
import {
  DAY_WIDTH,
  timelineTaskBarColor,
  areaLabelColor,
  buildTeamsFromTasks,
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
} from '../../utils'
import type { ColaboradorDto, GanttTimelineTabProps } from '../../types'

const LEFT_COL = 288

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
      className={`absolute z-10 flex items-center px-2 overflow-hidden rounded-lg border border-white/25 text-left cursor-pointer shadow-sm transition-all duration-200 hover:scale-[1.01] hover:z-20 hover:shadow-md hover:ring-2 hover:ring-white/45 dark:hover:ring-white/35 gantt-bar-grow ${
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
        task.name,
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

const TIMELINE_LANE_H = 34

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
  anchor,
  totalDays,
  laneIdx,
  dayWidth,
  onOpenParent,
}: {
  parent: GanttTaskItem
  sub: TaskSubtaskDto
  anchor: Date
  totalDays: number
  laneIdx: number
  dayWidth: number
  onOpenParent: (t: GanttTaskItem) => void
}) {
  const { startDay, duration } = subtaskTimelineSpan(parent, sub.dueDate, anchor, totalDays)
  const left = startDay * dayWidth
  const width = Math.max(duration * dayWidth - 4, 20)
  const base = timelineTaskBarColor(parent.progress, parent.status)
  const fade = sub.done ? 'opacity-45' : 'opacity-80'
  const top = laneIdx * TIMELINE_LANE_H + 6

  return (
    <button
      type="button"
      title={`${sub.title?.trim() || 'Subtarea'} · Tarea: ${parent.name}`}
      className={`absolute z-[9] flex items-center px-1.5 overflow-hidden rounded-md border border-dashed border-white/40 text-left cursor-pointer shadow-sm transition-all duration-150 hover:opacity-100 hover:z-[19] hover:ring-2 hover:ring-white/45 dark:hover:ring-white/35 ${fade}`}
      style={{
        left,
        width,
        height: 22,
        top,
        backgroundColor: base,
        color: '#fff',
      }}
      onClick={() => onOpenParent(parent)}
    >
      <span className="relative min-w-0 flex-1 truncate text-[10px] font-medium drop-shadow-sm leading-tight">
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
}: {
  team: GanttTeamItem
  totalDays: number
  anchor: Date
  onTaskClick: (t: GanttTaskItem) => void
  showHeatmap: boolean
  showCriticalPath: boolean
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
}) {
  const [subBusyId, setSubBusyId] = useState<number | null>(null)

  const lanes = useMemo(() => {
    const out: TimelineLane[] = []
    let laneIdx = 0
    for (const task of team.tasks) {
      out.push({ kind: 'parent', task, laneIdx })
      laneIdx++
      const subs = subtasksByParentId.get(task.sourceId)
      const parentRow = tasksBySourceId.get(task.sourceId)
      if (!subs?.length || !parentRow) continue
      for (const sub of subs) {
        out.push({ kind: 'sub', parent: task, parentRow, sub, laneIdx })
        laneIdx++
      }
    }
    return out
  }, [team.tasks, subtasksByParentId, tasksBySourceId])

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
  const lead = collaborators[0] || null
  const hasCollabs = collaborators.length > 0

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
          <span
            className="text-sm font-semibold truncate"
            style={{ color: areaLabelColor(Number(team.id)) }}
            title={team.name}
          >
            {team.name}
          </span>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {hasCollabs && (
              <div className="flex flex-wrap items-center mr-1 shrink-0 max-w-full gap-x-0">
                {collaborators.slice(0, 4).map((c, ci) => (
                  <React.Fragment key={c.id}>
                    {ci > 0 ? (
                      <span className="text-[11px] text-muted-foreground/70 px-px select-none" aria-hidden>
                        
                      </span>
                    ) : null}
                    <div
                      className="w-5 h-5 shrink-0 rounded-full bg-muted border border-border/60 flex items-center justify-center text-[8px] font-bold text-muted-foreground"
                      title={`${c.nombreCompleto} · ${c.rol}`}
                    >
                      {avatarInitials(c.nombreCompleto)}
                    </div>
                  </React.Fragment>
                ))}
                {collaborators.length > 4 && (
                  <>
                    <span className="text-[11px] text-muted-foreground/70 px-px select-none" aria-hidden>
                      
                    </span>
                    <div className="w-5 h-5 shrink-0 rounded-full bg-muted border border-border/60 flex items-center justify-center text-[7px] font-bold text-muted-foreground">
                      +{collaborators.length - 4}
                    </div>
                  </>
                )}
              </div>
            )}
            <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  team.capacity < 70 ? 'bg-emerald-500' : team.capacity < 90 ? 'bg-amber-500' : 'bg-destructive'
                }`}
                style={{ width: `${team.capacity}%` }}
              />
            </div>
            <span className="text-[10px] tabular-nums text-muted-foreground">{team.capacity}%</span>
          </div>
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
                const principal =
                  task.principalUserId != null ? collaborators.find((c) => c.id === task.principalUserId) : undefined
                const principalName =
                  principal?.nombreCompleto ??
                  (task.principalUserId != null
                    ? collaboratorNames?.get(task.principalUserId) ?? `Usuario #${task.principalUserId}`
                    : '')
                const stHint =
                  (task.subtaskTotal ?? 0) > 0 ? ` · Subtareas ${task.subtaskDone ?? 0}/${task.subtaskTotal}` : ''
                return (
                  <div
                    key={`p-${task.id}`}
                    className={`flex items-center shrink-0 h-[34px] rounded-md px-0.5 -mx-0.5 ${laneBg}`}
                    title={`${task.name}${stHint}`}
                  >
                    {task.principalUserId != null ? (
                      <button
                        type="button"
                        onClick={() => onTaskClick(task)}
                        className="relative shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                        title={`${task.name} · Responsable principal · ${principalName}${stHint}`}
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-muted text-[9px] font-bold text-muted-foreground">
                          {avatarInitials(principalName)}
                        </div>
                        <Crown
                          className="absolute -right-0.5 -top-0.5 h-3 w-3 text-amber-500 drop-shadow-sm dark:text-amber-400"
                          aria-hidden
                        />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onTaskClick(task)}
                        className="h-6 w-6 shrink-0 rounded-full border border-dashed border-muted-foreground/20 bg-muted/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                        title={`${task.name} · Sin responsable asignado${stHint}`}
                        aria-label={`Seleccionar tarea ${task.name}`}
                      />
                    )}
                    <span className="ml-2 min-w-0 flex-1 truncate text-[11px] font-medium text-foreground/90 dark:text-foreground/95">
                      {task.name}
                    </span>
                  </div>
                )
              }

              const { parent, parentRow, sub } = lane
              const canToggle = canUserToggleSubtaskDone(parentRow, sub, currentUserId, manage)
              const rn = subtaskResponsibleLabel(sub.assignedUserId, collaboratorNames)
              return (
                <div
                  key={`s-${parent.sourceId}-${sub.id}`}
                  className={`flex items-center gap-1.5 shrink-0 h-[34px] rounded-md pl-0.5 pr-0.5 -mx-0.5 ${laneBg}`}
                >
                  <CornerDownRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
                  <div className="shrink-0" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <SubtaskDoneToggle
                      done={sub.done}
                      canToggle={canToggle}
                      disabled={subBusyId === sub.id}
                      checkboxClassName="mt-0"
                      onCommitted={async (next) => {
                        setSubBusyId(sub.id)
                        try {
                          const updated = await updateTaskSubtaskNormalized(parent.sourceId, sub.id, { done: next })
                          const prev = subtasksByParentId.get(parent.sourceId) ?? []
                          const nextList = prev.map((x) => (x.id === sub.id ? updated : x))
                          onParentSubtasksSynced?.(parent.sourceId, nextList)
                        } catch {
                          /* mismo criterio que panel lateral */
                        } finally {
                          setSubBusyId(null)
                        }
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onTaskClick(parent)}
                    className="min-w-0 flex-1 text-left"
                    title={`${sub.title?.trim() || `Subtarea #${sub.id}`} · Tarea maestra: ${parent.name}`}
                  >
                    <span
                      className={`block truncate text-[11px] font-medium ${
                        sub.done ? 'text-muted-foreground line-through decoration-muted-foreground/45' : 'text-foreground'
                      }`}
                    >
                      {sub.title?.trim() || `Subtarea #${sub.id}`}
                    </span>
                    {(rn || sub.dueDate) && (
                      <span className="flex flex-wrap gap-x-2 gap-y-px text-[9px] text-muted-foreground/90 mt-px">
                        {rn ? (
                          <span className="inline-flex items-center gap-0.5 min-w-0">
                            <User className="h-2.5 w-2.5 shrink-0 opacity-80" aria-hidden />
                            <span className="truncate">{rn}</span>
                          </span>
                        ) : null}
                        {sub.dueDate ? (
                          <span className="inline-flex items-center gap-0.5 tabular-nums shrink-0">
                            <Calendar className="h-2.5 w-2.5 opacity-80" aria-hidden />
                            {formatShortDate(sub.dueDate)}
                          </span>
                        ) : null}
                      </span>
                    )}
                  </button>
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
                return (
                  <React.Fragment key={`g-p-${task.id}`}>
                    {laneSel ? (
                      <div
                        className={`absolute left-0 right-0 z-[1] rounded-md pointer-events-none ${selectionLaneTint(laneSel)}`}
                        style={{ top: idx * TIMELINE_LANE_H + 4, height: 28 }}
                        aria-hidden
                      />
                    ) : null}
                    <GanttBar
                      task={task}
                      onClick={onTaskClick}
                      dimmed={showCriticalPath && criticalIds !== null && !criticalIds.has(task.id)}
                      highlightCritical={showCriticalPath && (criticalIds?.has(task.id) ?? false)}
                      selectionEmphasis={laneSel}
                      yOffset={idx * TIMELINE_LANE_H + 4}
                      barIndex={idx}
                      dayWidth={dayWidth}
                    />
                  </React.Fragment>
                )
              }
              const { parent, sub } = lane
              const idx = lane.laneIdx
              return (
                <React.Fragment key={`g-s-${parent.sourceId}-${sub.id}`}>
                  {laneSel ? (
                    <div
                      className={`absolute left-0 right-0 z-[1] rounded-md pointer-events-none ${selectionLaneTint(laneSel)}`}
                      style={{ top: idx * TIMELINE_LANE_H + 4, height: 24 }}
                      aria-hidden
                    />
                  ) : null}
                  <SubtaskGanttBar
                    parent={parent}
                    sub={sub}
                    anchor={anchor}
                    totalDays={totalDays}
                    laneIdx={idx}
                    dayWidth={dayWidth}
                    onOpenParent={onTaskClick}
                  />
                </React.Fragment>
              )
            })}
          </div>
        </div>
      </div>

      {lead && (
        <div className="flex">
          <div
            className="shrink-0 sticky left-0 z-20 bg-white border-r border-[#e5e7eb] px-4 py-1.5 flex items-center gap-2 shadow-[2px_0_8px_-4px_rgba(0,0,0,0.06)] dark:bg-card/95 dark:border-border/80"
            style={{ width: LEFT_COL }}
          >
            <div className="w-6 h-6 rounded-full bg-muted border border-border/60 flex items-center justify-center text-[9px] font-bold text-muted-foreground shrink-0">
              {avatarInitials(lead.nombreCompleto)}
            </div>
            <span className="text-xs text-foreground truncate">{lead.nombreCompleto}</span>
            <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{lead.rol}</span>
          </div>
          <div className="flex-1" style={{ minWidth: tw }} />
        </div>
      )}
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

function formatShortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  const day = d.getDate()
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${day} ${months[d.getMonth()]}`
}

function subtaskResponsibleLabel(
  userId: number | null | undefined,
  collaboratorNames?: Map<number, string>,
): string | null {
  if (userId == null) return null
  return collaboratorNames?.get(userId) ?? `#${userId}`
}

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
}) {
  const [busyId, setBusyId] = useState<number | null>(null)

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
              const canToggle = canUserToggleSubtaskDone(parentTask, pst, currentUserId, manage)
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
                    checkboxClassName="mt-px"
                    onCommitted={async (next) => {
                      setBusyId(pst.id)
                      try {
                        const updated = await updateTaskSubtaskNormalized(parentTask.id, pst.id, {
                          done: next,
                        })
                        setItems((prev) => {
                          const nextList = prev.map((x) => (x.id === pst.id ? updated : x))
                          onParentSubtasksSynced?.(parentTask.id, nextList)
                          return nextList
                        })
                      } catch {
                        /* sidebar: sin mensaje modal */
                      } finally {
                        setBusyId(null)
                      }
                    }}
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
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
                            {formatShortDate(pst.dueDate)}
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
  collaboratorAreaLabels,
  onParentSubtasksSynced,
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
  collaboratorAreaLabels?: Map<number, string>
  onParentSubtasksSynced?: (parentId: number, nextList: TaskSubtaskDto[]) => void
}) {
  const { items: subtasks, loading: subtasksLoading, setItems: setSubtasks } = useTaskSubtasks(
    task?.id ?? null,
  )

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
  const areaLabel = task.areaName || `Área #${task.areaId}`

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
        {manage && (
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
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 rounded-lg text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => onDelete(task)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
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
        />

        {/* Assigned */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 font-semibold">
            <User className="w-3 h-3" /> {assignees.length > 1 ? 'Asignados' : 'Asignado'}
          </span>
          {assignees.length > 0 ? (
            <div className="space-y-2">
              {assignees.map((a) => {
                const equiposPersona =
                  collaboratorAreaLabels?.get(a.id)?.trim() || ''
                const equiposLine = equiposPersona || areaLabel
                const tareaDistinta =
                  equiposPersona !== '' &&
                  areaLabel !== '' &&
                  !equiposPersona.split(/\s*·\s*/).some((part) => part.trim() === areaLabel.trim())
                return (
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
                    <p
                      className="text-[11px] text-muted-foreground/90 truncate"
                      title={equiposLine + (tareaDistinta ? ` · Tarea en: ${areaLabel}` : '')}
                    >
                      {equiposPersona ? (
                        <>
                          <span className="text-muted-foreground/70">Equipos: </span>
                          {equiposPersona}
                        </>
                      ) : (
                        <>
                          <span className="text-muted-foreground/70">Área tarea: </span>
                          {areaLabel}
                        </>
                      )}
                      {tareaDistinta ? (
                        <span className="text-muted-foreground/80">
                          {' '}
                          · <span className="italic">Tarea en {areaLabel}</span>
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>
                )
              })}
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
                {formatShortDate(task.startDate)}
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Fin</div>
              <div className="text-sm font-semibold tabular-nums text-foreground mt-0.5 leading-tight">
                {formatShortDate(task.endDate)}
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

export function GanttTimelineTab({
  tasks,
  loading,
  refreshing = false,
  timelinePanDays = 0,
  filterText,
  onFilterChange,
  manage,
  onEditTask,
  onDeleteTask,
  showHeatmap,
  showCriticalPath,
  onTaskSelectNotify,
  collaboratorsForArea,
  collaboratorNames,
  collaboratorAreaLabels,
  mySpaceShowProjectNames = false,
  workspaceNameById,
  currentUserId = null,
  onParentSubtasksSynced,
}: GanttTimelineTabProps) {
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null)
  const [selectedGantt, setSelectedGantt] = useState<GanttTaskItem | null>(null)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [viewportW, setViewportW] = useState(800)
  const scrollRef = useRef<HTMLDivElement>(null)

  const baseRange = useMemo(() => buildTimelineRange(tasks), [tasks])
  const range = useMemo(() => shiftTimelineRange(baseRange, timelinePanDays), [baseRange, timelinePanDays])
  const { subtasksByParentId, setSubtasksByParentId } = useTimelineTasksSubtasks(tasks)
  const teamsAll = useMemo(
    () =>
      buildTeamsFromTasks(tasks, range, {
        workspaceNameById,
        showProjectNameOnTasks: mySpaceShowProjectNames,
      }),
    [tasks, range, workspaceNameById, mySpaceShowProjectNames],
  )

  const filteredTeams = useMemo(() => {
    const q = filterText.trim().toLowerCase()
    if (!q) return teamsAll
    return teamsAll.filter((t) => t.name.toLowerCase().includes(q))
  }, [teamsAll, filterText])

  const totalDays = range.totalDays
  const availableForTimeline = viewportW - LEFT_COL
  const dayWidth = Math.max(DAY_WIDTH, Math.floor(availableForTimeline / totalDays))
  const totalWidth = LEFT_COL + totalDays * dayWidth
  const todayLineHeight = useMemo(() => {
    let h = 48
    for (const tm of filteredTeams) {
      let lc = tm.tasks.length
      for (const gt of tm.tasks) {
        lc += subtasksByParentId.get(gt.sourceId)?.length ?? 0
      }
      h += Math.max(72, lc * TIMELINE_LANE_H + 52)
    }
    return Math.max(160, h)
  }, [filteredTeams, subtasksByParentId])

  const taskById = useMemo(() => {
    const m = new Map<number, TaskRowLike>()
    for (const t of tasks) m.set(t.id, t)
    return m
  }, [tasks])

  const handleSubtasksSyncedFromUi = useCallback(
    (parentId: number, nextList: TaskSubtaskDto[]) => {
      setSubtasksByParentId((prev) => new Map(prev).set(parentId, nextList))
      onParentSubtasksSynced?.(parentId, nextList)
    },
    [onParentSubtasksSynced, setSubtasksByParentId],
  )

  const selectedTask = selectedSourceId != null ? taskById.get(selectedSourceId) ?? null : null

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
  }, [filteredTeams.length])

  const onTaskClick = useCallback(
    (gt: GanttTaskItem) => {
      setSelectedSourceId(gt.sourceId)
      setSelectedGantt(gt)
      const row = taskById.get(gt.sourceId)
      if (row) onTaskSelectNotify?.(row.title)
    },
    [taskById, onTaskSelectNotify],
  )

  const blockingLoad = loading && tasks.length === 0

  return (
    <div className="flex flex-col flex-1 min-h-0 min-h-[420px] max-h-[calc(100vh-260px)] overflow-hidden bg-transparent relative">
      {blockingLoad && <WorkosTabLoading srLabel="Cargando timeline…" />}

      {!blockingLoad && filteredTeams.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm">
          <p>No hay equipos o tareas que coincidan.</p>
          {filterText && (
            <button type="button" className="text-primary text-xs mt-2 underline" onClick={() => onFilterChange('')}>
              Limpiar filtro
            </button>
          )}
        </div>
      )}

      {!blockingLoad && filteredTeams.length > 0 && (
        <div
          className={`flex flex-1 min-h-0 overflow-hidden rounded-xl border border-[#e5e7eb] bg-white workos-shadow-soft dark:border-border/80 dark:bg-card ${refreshing ? 'opacity-95' : ''}`}
        >
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div ref={scrollRef} className="flex-1 overflow-auto" onScroll={handleScroll}>
              <div style={{ minWidth: totalWidth }}>
                <div className="flex sticky top-0 z-30 items-stretch min-h-[40px]">
                  <div
                    className="shrink-0 sticky left-0 z-40 bg-[#fafafa] border-b border-r border-[#e5e7eb] px-3 py-1 flex items-end shadow-[2px_0_8px_-4px_rgba(0,0,0,0.06)] dark:bg-muted/30 dark:border-border/80 min-h-[40px] box-border"
                    style={{ width: LEFT_COL }}
                  >
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Equipos</span>
                  </div>
                  <TimelineHeader anchor={range.anchor} totalDays={totalDays} dayWidth={dayWidth} />
                </div>
                <div className="relative">
                  <div className="absolute top-0 z-0 pointer-events-none" style={{ left: LEFT_COL, width: totalDays * dayWidth }}>
                    <TodayLine anchor={range.anchor} totalDays={totalDays} containerHeight={todayLineHeight} dayWidth={dayWidth} />
                  </div>
                  {filteredTeams.map((team, tIdx) => (
                    <TeamRowWithGrid
                      key={team.id}
                      team={team}
                      staggerIndex={tIdx}
                      totalDays={totalDays}
                      anchor={range.anchor}
                      onTaskClick={onTaskClick}
                      showHeatmap={showHeatmap}
                      showCriticalPath={showCriticalPath}
                      collaborators={collaboratorsForArea(Number(team.id))}
                      collaboratorNames={collaboratorNames}
                      dayWidth={dayWidth}
                      selectedSourceId={selectedSourceId}
                      selectedPrincipalUserId={selectedGantt?.principalUserId}
                      tasksBySourceId={taskById}
                      subtasksByParentId={subtasksByParentId}
                      manage={manage}
                      currentUserId={currentUserId}
                      onParentSubtasksSynced={handleSubtasksSyncedFromUi}
                    />
                  ))}
                </div>
              </div>
            </div>
            <Minimap
              scrollLeft={scrollLeft}
              viewportWidth={viewportW}
              onSeek={handleSeek}
              teams={filteredTeams}
              totalDays={totalDays}
              dayWidth={dayWidth}
            />
          </div>
          <TaskDetailPanel
            task={selectedTask}
            ganttTask={selectedGantt}
            onClose={() => {
              setSelectedSourceId(null)
              setSelectedGantt(null)
            }}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
            manage={manage}
            currentUserId={currentUserId}
            collaborators={selectedTask ? (collaboratorsForArea?.(selectedTask.areaId) ?? []) : []}
            collaboratorNames={collaboratorNames}
            collaboratorAreaLabels={collaboratorAreaLabels}
            onParentSubtasksSynced={handleSubtasksSyncedFromUi}
          />
        </div>
      )}
    </div>
  )
}

export default GanttTimelineTab
