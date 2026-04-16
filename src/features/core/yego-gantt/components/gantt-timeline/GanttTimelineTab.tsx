import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Clock, Edit3, FileText, Flag, Route, Trash2, User, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DAY_WIDTH,
  buildTeamsFromTasks,
  buildTimelineRange,
  formatTimelineDayLabel,
  getTodayOffsetDays,
  isWeekendDay,
  type GanttTaskItem,
  type GanttTeamItem,
  type TaskRowLike,
} from '../../ganttModel'

const LEFT_COL = 256

export interface TeamCollaborator {
  id: number
  nombreCompleto: string
  rol: string
}

export interface GanttTimelineTabProps {
  tasks: TaskRowLike[]
  loading: boolean
  filterText: string
  onFilterChange: (v: string) => void
  manage: boolean
  onCreateTask: () => void
  onEditTask: (t: TaskRowLike) => void
  onDeleteTask: (t: TaskRowLike) => void
  showHeatmap: boolean
  showCriticalPath: boolean
  onTaskSelectNotify?: (taskTitle: string) => void
  collaboratorsForArea?: (areaId: number) => TeamCollaborator[]
}

function TimelineHeader({ anchor, totalDays, dayWidth }: { anchor: Date; totalDays: number; dayWidth: number }) {
  const days = Array.from({ length: totalDays }, (_, i) => i)
  return (
    <div className="flex border-b border-border/80 bg-card/95 backdrop-blur-sm sticky top-0 z-30 shadow-sm">
      {days.map((day) => {
        const { weekday, label } = formatTimelineDayLabel(anchor, day)
        const weekend = isWeekendDay(anchor, day)
        return (
          <div
            key={day}
            className={`shrink-0 flex flex-col items-center justify-center py-2 border-r border-border/50 tabular-nums ${
              weekend ? 'bg-muted/30' : ''
            }`}
            style={{ width: dayWidth }}
          >
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{weekday}</span>
            <span className={`text-xs font-medium ${day === 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>{label}</span>
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
      className="absolute top-0 pointer-events-none z-[5] w-0.5 bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.55)]"
      style={{ left, height: containerHeight }}
    />
  )
}

function GanttBar({
  task,
  onClick,
  dimmed,
  yOffset,
  barIndex = 0,
  dayWidth,
}: {
  task: GanttTaskItem
  onClick: (t: GanttTaskItem) => void
  dimmed: boolean
  yOffset?: number
  barIndex?: number
  dayWidth: number
}) {
  const left = task.startDay * dayWidth
  const width = task.duration * dayWidth - 4

  const statusClass =
    task.status === 'blocked'
      ? 'border-red-950/50 bg-red-950/25 dark:bg-red-950/40'
      : task.status === 'at-risk'
        ? 'border-orange-500/55 bg-orange-600/20 dark:bg-orange-950/35'
        : task.status === 'completed'
          ? 'border-border bg-muted/70 opacity-65'
          : 'border-red-500/45 bg-gradient-to-r from-red-600/25 to-red-500/15 dark:from-red-900/35 dark:to-red-800/20'

  return (
    <button
      type="button"
      className={`absolute z-10 flex items-center px-2 overflow-hidden rounded-md border text-left cursor-pointer shadow-sm transition-all duration-200 hover:scale-[1.02] hover:z-20 hover:shadow-md gantt-bar-grow ${statusClass} ${
        dimmed ? 'opacity-35' : ''
      }`}
      style={{ left, width: Math.max(width, 24), height: 28, top: yOffset ?? '50%', transform: yOffset == null ? 'translateY(-50%)' : undefined, animationDelay: `${barIndex * 0.08}s` }}
      onClick={() => onClick(task)}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-l-md opacity-50 bg-red-700 dark:bg-red-600"
        style={{ width: `${Math.min(100, Math.max(0, task.progress))}%` }}
      />
      <span className="relative text-[11px] font-medium text-foreground truncate">{task.name}</span>
      {task.progress > 0 && width > 80 && (
        <span className="relative ml-auto text-[10px] tabular-nums text-muted-foreground pl-1">{task.progress}%</span>
      )}
    </button>
  )
}

function avatarInit(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function TeamRowWithGrid({
  team,
  totalDays,
  anchor,
  onTaskClick,
  showHeatmap,
  showCriticalPath,
  collaborators,
  staggerIndex = 0,
  dayWidth,
}: {
  team: GanttTeamItem
  totalDays: number
  anchor: Date
  onTaskClick: (t: GanttTaskItem) => void
  showHeatmap: boolean
  showCriticalPath: boolean
  collaborators: TeamCollaborator[]
  staggerIndex?: number
  dayWidth: number
}) {
  const heatmapBg =
    showHeatmap
      ? team.capacity >= 90
        ? 'bg-destructive/5'
        : team.capacity >= 70
          ? 'bg-amber-500/5'
          : 'bg-emerald-500/5'
      : ''

  const criticalIds = useMemo(() => {
    if (!showCriticalPath) return null as Set<string> | null
    const urgent = team.tasks.filter((t) => t.priority === 'critical')
    if (urgent.length) return new Set(urgent.map((t) => t.id))
    const longest = team.tasks.reduce<GanttTaskItem | null>((best, t) => {
      if (!best || t.duration > best.duration) return t
      return best
    }, null)
    return longest ? new Set([longest.id]) : new Set<string>()
  }, [showCriticalPath, team.tasks])

  const tw = totalDays * dayWidth
  const lead = collaborators[0] || null
  const hasCollabs = collaborators.length > 0
  const rowHeight = hasCollabs ? 'auto' : undefined

  return (
    <div className={`border-b border-border gantt-fade-in ${heatmapBg}`} style={{ animationDelay: `${staggerIndex * 0.06}s` }}>
      {/* Main row: team header + gantt bars */}
      <div className="flex">
        <div
          className="shrink-0 sticky left-0 z-20 bg-gradient-to-r from-card to-card/95 border-r border-border/80 px-4 py-2.5 flex flex-col gap-1 shadow-[2px_0_8px_-4px_rgba(0,0,0,0.08)]"
          style={{ width: LEFT_COL }}
        >
          <span className="text-sm font-semibold text-foreground truncate" title={team.name}>
            {team.name}
          </span>
          <div className="flex items-center gap-2">
            {/* Avatar circles */}
            {hasCollabs && (
              <div className="flex -space-x-1.5 mr-1">
                {collaborators.slice(0, 4).map((c) => (
                  <div
                    key={c.id}
                    className="w-5 h-5 rounded-full bg-muted border border-card flex items-center justify-center text-[8px] font-bold text-muted-foreground"
                    title={`${c.nombreCompleto} · ${c.rol}`}
                  >
                    {avatarInit(c.nombreCompleto)}
                  </div>
                ))}
                {collaborators.length > 4 && (
                  <div className="w-5 h-5 rounded-full bg-muted border border-card flex items-center justify-center text-[7px] font-bold text-muted-foreground">
                    +{collaborators.length - 4}
                  </div>
                )}
              </div>
            )}
            {/* Progress bar */}
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
        </div>

        <div className="relative flex-1 overflow-hidden" style={{ minWidth: tw, height: rowHeight }}>
          <div className="absolute inset-0 flex">
            {Array.from({ length: totalDays }, (_, i) => (
              <div
                key={i}
                className={`shrink-0 border-r border-border/30 h-full ${isWeekendDay(anchor, i) ? 'bg-muted/20' : ''}`}
                style={{ width: dayWidth }}
              />
            ))}
          </div>
          <div className="relative" style={{ minHeight: Math.max(48, team.tasks.length * 34 + 8) }}>
            {team.tasks.map((task, idx) => (
              <GanttBar
                key={task.id}
                task={task}
                onClick={onTaskClick}
                dimmed={showCriticalPath && criticalIds !== null && !criticalIds.has(task.id)}
                yOffset={idx * 34 + 4}
                barIndex={idx}
                dayWidth={dayWidth}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Lead member row */}
      {lead && (
        <div className="flex">
          <div
            className="shrink-0 sticky left-0 z-20 bg-card/95 border-r border-border/80 px-4 py-1.5 flex items-center gap-2 shadow-[2px_0_8px_-4px_rgba(0,0,0,0.08)]"
            style={{ width: LEFT_COL }}
          >
            <div className="w-6 h-6 rounded-full bg-muted border border-border/60 flex items-center justify-center text-[9px] font-bold text-muted-foreground shrink-0">
              {avatarInit(lead.nombreCompleto)}
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

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const newScroll = (x / MINIMAP_W) * totalW - viewportWidth / 2
    onSeek(Math.max(0, Math.min(newScroll, totalW - viewportWidth)))
  }

  return (
    <div className="px-4 py-2 border-t bg-muted/20 flex items-center gap-3 shrink-0">
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
              className="absolute rounded-sm bg-red-500/50 dark:bg-red-600/45"
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
          className="absolute top-0 h-full border border-red-500/50 bg-red-500/10 rounded pointer-events-none"
          style={{ left: thumbLeft, width: thumbW }}
        />
      </button>
    </div>
  )
}

const STATUS_UI: Record<string, { label: string; className: string }> = {
  'on-track': { label: 'En curso', className: 'text-primary bg-primary/10 border-primary/20' },
  'at-risk': { label: 'En riesgo', className: 'text-amber-700 bg-amber-500/10 border-amber-500/30' },
  blocked: { label: 'Bloqueado', className: 'text-destructive bg-destructive/10 border-destructive/25' },
  completed: { label: 'Completado', className: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/25' },
}

const PRIORITY_UI: Record<string, { label: string; className: string }> = {
  low: { label: 'Baja', className: 'text-muted-foreground bg-muted' },
  medium: { label: 'Media', className: 'text-primary bg-primary/10' },
  high: { label: 'Alta', className: 'text-amber-800 bg-amber-500/10' },
  critical: { label: 'Urgente', className: 'text-destructive bg-destructive/10' },
}

function computeDurationDays(start: string, end: string): number {
  const a = new Date(start)
  const b = new Date(end)
  const ms = b.getTime() - a.getTime()
  return Math.max(1, Math.round(ms / 86400000) + 1)
}

function formatShortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  const day = d.getDate()
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${day} ${months[d.getMonth()]}`
}

function TaskDetailPanel({
  task,
  ganttTask,
  onClose,
  onEdit,
  onDelete,
  manage,
  collaborators,
}: {
  task: TaskRowLike | null
  ganttTask: GanttTaskItem | null
  onClose: () => void
  onEdit: (t: TaskRowLike) => void
  onDelete: (t: TaskRowLike) => void
  manage: boolean
  collaborators: TeamCollaborator[]
}) {
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
      name: c?.nombreCompleto ?? `Usuario #${uid}`,
      role: c?.rol ?? '',
    }
  })
  const areaLabel = task.areaName || `Área #${task.areaId}`

  return (
    <div className="w-80 shrink-0 border-l border-border/80 bg-card overflow-y-auto flex flex-col gantt-slide-right">
      <div className="p-5 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-bold leading-tight text-foreground">{task.title}</h3>
            <p className="text-[10px] text-muted-foreground mt-1 font-mono">ID: {task.id}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-muted shrink-0 -mt-1 -mr-1" aria-label="Cerrar">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Actions */}
        {manage && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs h-9 gap-1.5 rounded-lg" onClick={() => onEdit(task)}>
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
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${st.className}`}>
            <Clock className="w-3 h-3" />
            {st.label}
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${pr.className}`}>
            <Flag className="w-3 h-3" />
            {pr.label}
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 font-semibold">
              <FileText className="w-3 h-3" /> Descripción
            </span>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground leading-relaxed">{task.description}</p>
            </div>
          </div>
        )}

        {/* Assigned */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 font-semibold">
            <User className="w-3 h-3" /> {assignees.length > 1 ? 'Asignados' : 'Asignado'}
          </span>
          {assignees.length > 0 ? (
            <div className="space-y-2">
              {assignees.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                  <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 flex items-center justify-center text-[11px] font-bold text-red-600 dark:text-red-400 shrink-0">
                    {avatarInit(a.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{a.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {a.role ? `${a.role} · ` : ''}{areaLabel}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Sin asignar</p>
          )}
        </div>

        {/* Progress */}
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-muted-foreground">Progreso</span>
            <span className="text-lg font-bold tabular-nums text-foreground">{ganttTask.progress}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-red-600 transition-all" style={{ width: `${ganttTask.progress}%` }} />
          </div>
        </div>

        {/* Dates */}
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Inicio</span>
            <span className="tabular-nums font-medium">{formatShortDate(task.startDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fin</span>
            <span className="tabular-nums font-medium">{formatShortDate(task.endDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Duración</span>
            <span className="tabular-nums font-medium">{duration} día{duration !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function GanttTimelineTab({
  tasks,
  loading,
  filterText,
  onFilterChange,
  manage,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  showHeatmap,
  showCriticalPath,
  onTaskSelectNotify,
  collaboratorsForArea,
}: GanttTimelineTabProps) {
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null)
  const [selectedGantt, setSelectedGantt] = useState<GanttTaskItem | null>(null)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [viewportW, setViewportW] = useState(800)
  const scrollRef = useRef<HTMLDivElement>(null)

  const range = useMemo(() => buildTimelineRange(tasks), [tasks])
  const teamsAll = useMemo(() => buildTeamsFromTasks(tasks, range), [tasks, range])

  const filteredTeams = useMemo(() => {
    const q = filterText.trim().toLowerCase()
    if (!q) return teamsAll
    return teamsAll.filter((t) => t.name.toLowerCase().includes(q))
  }, [teamsAll, filterText])

  const totalDays = range.totalDays
  const availableForTimeline = viewportW - LEFT_COL
  const dayWidth = Math.max(DAY_WIDTH, Math.floor(availableForTimeline / totalDays))
  const totalWidth = LEFT_COL + totalDays * dayWidth
  const rowApproxHeight = 73
  const todayLineHeight = Math.max(120, filteredTeams.length * rowApproxHeight)

  const taskById = useMemo(() => {
    const m = new Map<number, TaskRowLike>()
    for (const t of tasks) m.set(t.id, t)
    return m
  }, [tasks])

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
  }, [loading, filteredTeams.length])

  const onTaskClick = useCallback(
    (gt: GanttTaskItem) => {
      setSelectedSourceId(gt.sourceId)
      setSelectedGantt(gt)
      const row = taskById.get(gt.sourceId)
      if (row) onTaskSelectNotify?.(row.title)
    },
    [taskById, onTaskSelectNotify],
  )

  return (
    <div className="flex flex-col flex-1 min-h-0 min-h-[420px] max-h-[calc(100vh-260px)] overflow-hidden bg-background">
      {loading && <p className="text-sm text-muted-foreground p-6">Cargando timeline…</p>}

      {!loading && filteredTeams.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm">
          <p>No hay equipos o tareas que coincidan.</p>
          {filterText && (
            <button type="button" className="text-primary text-xs mt-2 underline" onClick={() => onFilterChange('')}>
              Limpiar filtro
            </button>
          )}
        </div>
      )}

      {!loading && filteredTeams.length > 0 && (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div ref={scrollRef} className="flex-1 overflow-auto" onScroll={handleScroll}>
              <div style={{ minWidth: totalWidth }}>
                <div className="flex sticky top-0 z-30">
                  <div
                    className="shrink-0 sticky left-0 z-40 bg-gradient-to-r from-card to-card/95 border-b border-r border-border/80 px-4 py-2 flex items-end shadow-[2px_0_8px_-4px_rgba(0,0,0,0.08)]"
                    style={{ width: LEFT_COL }}
                  >
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Equipos</span>
                  </div>
                  <TimelineHeader anchor={range.anchor} totalDays={totalDays} dayWidth={dayWidth} />
                </div>
                <div className="relative">
                  <div className="absolute top-0 pointer-events-none" style={{ left: LEFT_COL, width: totalDays * dayWidth }}>
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
                      collaborators={collaboratorsForArea?.(Number(team.id)) ?? []}
                      dayWidth={dayWidth}
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
            collaborators={selectedTask ? (collaboratorsForArea?.(selectedTask.areaId) ?? []) : []}
          />
        </div>
      )}
    </div>
  )
}

export default GanttTimelineTab
