import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertOctagon,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Circle,
  CircleDot,
  Clock,
  ExternalLink,
  Flag,
  FolderKanban,
  Plus,
  Radio,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WorkosRefreshingPill, WorkosTabLoading } from './WorkosLoading'
import type { DashboardTabProps, TaskRow, ProjectDto } from '../types'
import { isOverdue, fmtShort, avatarInitials } from '../utils'
import { useTaskStats } from '../hooks'
import { Panel, RowBar, ProgressBar, Avatar, AvatarGroup } from './common'

export function DashboardTab({
  tasks,
  projects,
  loading,
  refreshing = false,
  suppressEdgeRefreshPill = false,
  onCreateTask,
}: DashboardTabProps) {
  const navigate = useNavigate()

  const stats = useTaskStats(tasks, isOverdue)

  const projectRows = useMemo(() => {
    if (projects.length === 0) return []

    const projectIdSet = new Set(projects.map((p) => p.id))
    const isUnassignedToPortfolio = (t: TaskRow) =>
      t.projectId == null || t.projectId === undefined || !projectIdSet.has(t.projectId)

    const row = (p: ProjectDto, pt: TaskRow[]) => {
      const prog = pt.length
        ? Math.round(pt.reduce((s, t) => s + (t.progressPercent ?? 0), 0) / pt.length)
        : 0
      const done = pt.filter((t) => t.status === 'DONE').length
      return { p, pt, prog, done }
    }

    if (projects.length === 1) {
      const p = projects[0]
      const pt = tasks.filter((t) => t.projectId === p.id || isUnassignedToPortfolio(t))
      return [row(p, pt)]
    }

    const base = projects.map((p) => {
      const pt = tasks.filter((t) => t.projectId === p.id)
      return row(p, pt)
    })
    const orphan = tasks.filter(isUnassignedToPortfolio)
    if (orphan.length === 0) return base
    const synthetic: ProjectDto = {
      id: -1,
      name: 'Sin proyecto asignado',
      description: null,
      activo: true,
      iconKey: 'folder',
      memberUserIds: [],
    }
    return [...base, row(synthetic, orphan)]
  }, [tasks, projects])

  const pct = (n: number) => (stats.total ? Math.round((n / stats.total) * 100) : 0)

  const completedRecent = useMemo(
    () => tasks.filter((t) => t.status === 'DONE').slice(0, 5),
    [tasks],
  )

  if (loading && tasks.length === 0 && projects.length === 0) {
    return <WorkosTabLoading srLabel="Cargando dashboard…" />
  }

  return (
    <div className="space-y-3 relative">
      {refreshing && !suppressEdgeRefreshPill && (
        <WorkosRefreshingPill className="absolute top-0 right-0 z-10" />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Panel Icon={BarChart3} title="Estado de tareas">
          <RowBar
            Icon={CircleDot}
            color="text-amber-600"
            label="En curso"
            value={stats.inProgress}
            pct={pct(stats.inProgress)}
            barClass="bg-amber-500"
          />
          <RowBar
            Icon={Circle}
            color="text-muted-foreground"
            label="Pendiente"
            value={stats.pending}
            pct={pct(stats.pending)}
            barClass="bg-slate-400/90 dark:bg-slate-500/80"
          />
          <RowBar
            Icon={CheckCircle2}
            color="text-emerald-600"
            label="Completada"
            value={stats.done}
            pct={pct(stats.done)}
            barClass="bg-emerald-500"
          />
          <RowBar
            Icon={AlertTriangle}
            color="text-primary-700 dark:text-primary-400"
            label="En riesgo"
            value={stats.atRisk}
            pct={pct(stats.atRisk)}
            barClass="workos-progress-fill"
          />
          <RowBar
            Icon={AlertOctagon}
            color="text-destructive"
            label="Bloqueada"
            value={stats.blocked}
            pct={pct(stats.blocked)}
            barClass="bg-destructive/80"
          />
        </Panel>
        <Panel Icon={Flag} title="Distribución por prioridad">
          <RowBar Icon={Flag} color="text-destructive" label="Urgente" value={stats.byPriority.URGENT} pct={pct(stats.byPriority.URGENT)} barClass="bg-destructive/70" />
          <RowBar Icon={Flag} color="text-amber-600" label="Alta" value={stats.byPriority.HIGH} pct={pct(stats.byPriority.HIGH)} barClass="bg-amber-500" />
          <RowBar Icon={Flag} color="text-sky-600" label="Media" value={stats.byPriority.MEDIUM} pct={pct(stats.byPriority.MEDIUM)} barClass="bg-sky-500" />
          <RowBar Icon={Flag} color="text-muted-foreground" label="Baja" value={stats.byPriority.LOW} pct={pct(stats.byPriority.LOW)} barClass="bg-slate-400/90 dark:bg-slate-500/80" />
        </Panel>
        <Panel Icon={FolderKanban} title="Progreso por proyecto">
          {projectRows.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-4">Sin proyectos</p>
          ) : (
            projectRows.map(({ p, pt, prog, done }) => (
              <div key={p.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate">{p.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {done}/{pt.length} · {prog}%
                  </span>
                </div>
                <ProgressBar value={prog} variant="primary" showLabel={false} size="md" />
              </div>
            ))
          )}
        </Panel>
      </div>

      <Panel Icon={Clock} title={`Tareas vencidas (${stats.overdue})`}>
        {stats.overdue === 0 ? (
          <p className="text-sm text-muted-foreground italic">Sin tareas vencidas</p>
        ) : (
          <div className="divide-y divide-border/40">
            {tasks
              .filter((t) => t.status !== 'DONE' && isOverdue(t.endDate))
              .slice(0, 12)
              .map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-1.5 text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="font-medium flex-1 truncate">{t.title}</span>
                  <span className="text-xs text-muted-foreground">{t.areaName}</span>
                  <span className="text-xs font-mono text-amber-700 dark:text-amber-400 tabular-nums">{t.endDate}</span>
                </div>
              ))}
          </div>
        )}
      </Panel>

      <Panel Icon={CheckCircle2} title="Completadas recientes">
        {completedRecent.length === 0 ? (
          <p className="text-sm text-center text-muted-foreground italic py-4">Sin tareas completadas aún</p>
        ) : (
          <div className="divide-y divide-border/40">
            {completedRecent.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-medium flex-1 truncate">{t.title}</span>
                <span className="text-xs text-muted-foreground">{t.areaName}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="rounded-xl border border-border/80 bg-card p-4 workos-shadow-soft flex flex-wrap items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary-500/12 text-primary-700 dark:text-primary-400 flex items-center justify-center">
          <Radio className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold">Control Tower</div>
          <p className="text-xs text-muted-foreground">
            Enlace rápido a operaciones. Si ves una incidencia, regístrala como tarea aquí mismo.
          </p>
        </div>
        <span className="text-xs text-amber-600 font-semibold">{stats.overdue} vencida(s)</span>
        <Button variant="outline" size="sm" onClick={() => navigate('/control-tower')} className="gap-1.5 rounded-lg">
          <ExternalLink className="h-3.5 w-3.5" />
          Abrir Control Tower
        </Button>
        {onCreateTask && (
          <Button size="sm" onClick={onCreateTask} className="gap-1.5 rounded-lg workos-gantt-btn-primary border-0">
            <Plus className="h-4 w-4" />
            Nueva tarea
          </Button>
        )}
      </div>
    </div>
  )
}
