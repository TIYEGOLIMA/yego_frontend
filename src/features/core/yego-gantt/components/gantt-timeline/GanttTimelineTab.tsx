import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Clock, Edit3, FileText, Flag, GitBranch, Route, Trash2, User, X } from 'lucide-react'
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
  /** Añade entrada al panel de notificaciones del toolbar (vista Gantt) */
  onTaskSelectNotify?: (taskTitle: string) => void
}

function TimelineHeader({ anchor, totalDays }: { anchor: Date; totalDays: number }) {
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
            style={{ width: DAY_WIDTH }}
          >
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{weekday}</span>
            <span className={`text-xs font-medium ${day === 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>{label}</span>
          </div>
        )
      })}
    </div>
  )
}

function TodayLine({ anchor, totalDays, containerHeight }: { anchor: Date; totalDays: number; containerHeight: number }) {
  const range = useMemo(() => ({ anchor, totalDays }), [anchor, totalDays])
  const offset = getTodayOffsetDays(range)
  const left = offset * DAY_WIDTH + DAY_WIDTH / 2
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
}: {
  task: GanttTaskItem
  onClick: (t: GanttTaskItem) => void
  dimmed: boolean
}) {
  const left = task.startDay * DAY_WIDTH
  const width = task.duration * DAY_WIDTH - 4

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
      className={`absolute top-1/2 -translate-y-1/2 z-10 flex items-center px-2 overflow-hidden rounded-md border text-left cursor-pointer shadow-sm transition-transform hover:scale-[1.02] hover:z-20 hover:shadow-md ${statusClass} ${
        dimmed ? 'opacity-35' : ''
      }`}
      style={{ left, width: Math.max(width, 24), height: 28 }}
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

function TeamRowWithGrid({
  team,
  totalDays,
  anchor,
  onTaskClick,
  showHeatmap,
  showCriticalPath,
}: {
  team: GanttTeamItem
  totalDays: number
  anchor: Date
  onTaskClick: (t: GanttTaskItem) => void
  showHeatmap: boolean
  showCriticalPath: boolean
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

  const tw = totalDays * DAY_WIDTH

  return (
    <div className={`border-b border-border ${heatmapBg}`}>
      <div className="flex">
        <div
          className="shrink-0 sticky left-0 z-20 bg-gradient-to-r from-card to-card/95 border-r border-border/80 px-4 py-3 flex flex-col gap-1 shadow-[2px_0_8px_-4px_rgba(0,0,0,0.08)]"
          style={{ width: LEFT_COL }}
        >
          <span className="text-sm font-semibold text-foreground truncate" title={team.name}>
            {team.name}
          </span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
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

        <div className="relative flex-1 overflow-hidden" style={{ minWidth: tw }}>
          <div className="absolute inset-0 flex">
            {Array.from({ length: totalDays }, (_, i) => (
              <div
                key={i}
                className={`shrink-0 border-r border-border/30 h-full ${isWeekendDay(anchor, i) ? 'bg-muted/20' : ''}`}
                style={{ width: DAY_WIDTH }}
              />
            ))}
          </div>
          <div className="relative h-16">
            {team.tasks.map((task) => (
              <GanttBar
                key={task.id}
                task={task}
                onClick={onTaskClick}
                dimmed={showCriticalPath && criticalIds !== null && !criticalIds.has(task.id)}
              />
            ))}
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
}: {
  scrollLeft: number
  viewportWidth: number
  onSeek: (x: number) => void
  teams: GanttTeamItem[]
  totalDays: number
}) {
  const totalW = totalDays * DAY_WIDTH
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
                left: task.startDay * scale * DAY_WIDTH,
                width: Math.max(task.duration * scale * DAY_WIDTH, 2),
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

function TaskDetailPanel({
  task,
  ganttTask,
  onClose,
  onEdit,
  onDelete,
  manage,
}: {
  task: TaskRowLike | null
  ganttTask: GanttTaskItem | null
  onClose: () => void
  onEdit: (t: TaskRowLike) => void
  onDelete: (t: TaskRowLike) => void
  manage: boolean
}) {
  if (!task || !ganttTask) return null

  const st = STATUS_UI[ganttTask.status] || STATUS_UI['on-track']
  const pr = PRIORITY_UI[ganttTask.priority] || PRIORITY_UI.medium

  return (
    <div className="w-80 shrink-0 border-l border-border/80 bg-gradient-to-b from-card to-muted/20 overflow-y-auto flex flex-col shadow-[inset_4px_0_12px_-8px_rgba(0,0,0,0.06)]">
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-bold leading-tight">{task.title}</h3>
            <p className="text-[10px] text-muted-foreground mt-1 font-mono">ID: {task.id}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-muted shrink-0" aria-label="Cerrar">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {manage && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => onEdit(task)}>
              <Edit3 className="w-3 h-3 mr-1" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => onDelete(task)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium ${st.className}`}>
            <Clock className="w-3 h-3" />
            {st.label}
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${pr.className}`}>
            <Flag className="w-3 h-3" />
            {pr.label}
          </div>
        </div>

        {task.description && (
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <FileText className="w-3 h-3" /> Descripción
            </span>
            <p className="text-xs text-muted-foreground leading-relaxed bg-muted/40 rounded-md p-2">{task.description}</p>
          </div>
        )}

        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <User className="w-3 h-3" /> Asignado
          </span>
          {task.assignedUserId != null ? (
            <p className="text-xs text-muted-foreground">Usuario #{task.assignedUserId}</p>
          ) : (
            <p className="text-xs text-muted-foreground italic">Sin asignar</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Progreso</span>
            <span className="tabular-nums font-semibold">{ganttTask.progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-red-600 transition-all" style={{ width: `${ganttTask.progress}%` }} />
          </div>
        </div>

        <div className="space-y-2 bg-muted/30 rounded-md p-3 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Inicio</span>
            <span className="tabular-nums">{task.startDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fin</span>
            <span className="tabular-nums">{task.endDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Área</span>
            <span className="truncate max-w-[140px] text-right">{task.areaName || `#${task.areaId}`}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <GitBranch className="w-3 h-3" />
          Dependencias no disponibles en API
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
  const totalWidth = LEFT_COL + totalDays * DAY_WIDTH
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
                  <TimelineHeader anchor={range.anchor} totalDays={totalDays} />
                </div>
                <div className="relative">
                  <div className="absolute top-0 pointer-events-none" style={{ left: LEFT_COL, width: totalDays * DAY_WIDTH }}>
                    <TodayLine anchor={range.anchor} totalDays={totalDays} containerHeight={todayLineHeight} />
                  </div>
                  {filteredTeams.map((team) => (
                    <TeamRowWithGrid
                      key={team.id}
                      team={team}
                      totalDays={totalDays}
                      anchor={range.anchor}
                      onTaskClick={onTaskClick}
                      showHeatmap={showHeatmap}
                      showCriticalPath={showCriticalPath}
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
          />
        </div>
      )}
    </div>
  )
}

export default GanttTimelineTab
