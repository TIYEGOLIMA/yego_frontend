import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertOctagon,
  BarChart3,
  CheckCircle2,
  Circle,
  CircleDot,
  Clock,
  ExternalLink,
  FileText,
  Flag,
  FolderKanban,
  Plus,
  Radio,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WorkosTabLoading } from './WorkosLoading'
import type { DashboardTabProps, MeetingMinutesDashboardKpisResponse, TaskRow, WorkspaceDto } from '../types'
import { isOverdue } from '../utils'
import { useTaskStats } from '../hooks'
import { Panel, RowBar, ProgressBar } from './common'
import { fetchMeetingMinutesDashboardKpis, parseGanttLoadError } from '../ganttApi'

export function DashboardTab({
  tasks,
  workspaces,
  loading,
  refreshing = false,
  onCreateTask,
  onOpenActasTab,
}: DashboardTabProps) {
  const navigate = useNavigate()

  const [mmKpis, setMmKpis] = useState<MeetingMinutesDashboardKpisResponse | null>(null)
  const [mmKpisErr, setMmKpisErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const k = await fetchMeetingMinutesDashboardKpis()
        if (!cancelled) {
          setMmKpis(k)
          setMmKpisErr(null)
        }
      } catch (e) {
        if (!cancelled) setMmKpisErr(parseGanttLoadError(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshing])

  const stats = useTaskStats(tasks)

  const workspaceRows = useMemo(() => {
    if (workspaces.length === 0) return []

    const workspaceIdSet = new Set(workspaces.map((p) => p.id))
    const isUnassignedToPortfolio = (t: TaskRow) =>
      t.workspaceId == null || t.workspaceId === undefined || !workspaceIdSet.has(t.workspaceId)

    const row = (p: WorkspaceDto, pt: TaskRow[]) => {
      const prog = pt.length
        ? Math.round(pt.reduce((s, t) => s + (t.progressPercent ?? 0), 0) / pt.length)
        : 0
      const done = pt.filter((t) => t.status === 'DONE').length
      return { p, pt, prog, done }
    }

    if (workspaces.length === 1) {
      const p = workspaces[0]
      const pt = tasks.filter((t) => t.workspaceId === p.id || isUnassignedToPortfolio(t))
      return [row(p, pt)]
    }

    const base = workspaces.map((p) => {
      const pt = tasks.filter((t) => t.workspaceId === p.id)
      return row(p, pt)
    })
    const orphan = tasks.filter(isUnassignedToPortfolio)
    if (orphan.length === 0) return base
    const synthetic: WorkspaceDto = {
      id: -1,
      name: 'Sin espacio de trabajo asignado',
      description: null,
      activo: true,
      iconKey: 'folder',
      memberUserIds: [],
    }
    return [...base, row(synthetic, orphan)]
  }, [tasks, workspaces])

  const pct = (n: number) => (stats.total ? Math.round((n / stats.total) * 100) : 0)

  const completedRecent = useMemo(
    () => tasks.filter((t) => t.status === 'DONE').slice(0, 5),
    [tasks],
  )

  if (loading && tasks.length === 0 && workspaces.length === 0) {
    return <WorkosTabLoading srLabel="Cargando dashboard…" />
  }

  return (
    <div className="space-y-3 relative">
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
            label="Hecha"
            value={stats.done}
            pct={pct(stats.done)}
            barClass="bg-emerald-500"
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
        <Panel Icon={FolderKanban} title="Progreso por espacio de trabajo">
          {workspaceRows.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-4">Sin espacios de trabajo</p>
          ) : (
            workspaceRows.map(({ p, pt, prog, done }) => (
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

      <Panel Icon={FileText} title="Seguimiento de actas">
        {mmKpisErr && (
          <p className="text-sm text-destructive">{mmKpisErr}</p>
        )}
        {!mmKpis && !mmKpisErr && (
          <p className="text-sm text-muted-foreground italic">Cargando métricas de actas…</p>
        )}
        {mmKpis && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg bg-muted/35 px-3 py-2">
                <div className="text-xs text-muted-foreground">Actas abiertas</div>
                <div className="text-lg font-semibold tabular-nums">{mmKpis.openMinutes}</div>
              </div>
              <div className="rounded-lg bg-muted/35 px-3 py-2">
                <div className="text-xs text-muted-foreground">En seguimiento</div>
                <div className="text-lg font-semibold tabular-nums">{mmKpis.inFollowUpMinutes}</div>
              </div>
              <div className="rounded-lg bg-muted/35 px-3 py-2">
                <div className="text-xs text-muted-foreground">Ítems sin convertir</div>
                <div className="text-lg font-semibold tabular-nums">{mmKpis.unconvertedItemsGlobal}</div>
              </div>
              <div className="rounded-lg bg-muted/35 px-3 py-2">
                <div className="text-xs text-muted-foreground">Tareas desde actas</div>
                <div className="text-lg font-semibold tabular-nums">{mmKpis.tasksBornFromMinutes}</div>
              </div>
              <div className="rounded-lg bg-muted/35 px-3 py-2">
                <div className="text-xs text-muted-foreground">Tareas vencidas (actas)</div>
                <div className="text-lg font-semibold tabular-nums">{mmKpis.overdueTasksFromMinutes}</div>
              </div>
              <div className="rounded-lg bg-muted/35 px-3 py-2">
                <div className="text-xs text-muted-foreground">Completitud derivada</div>
                <div className="text-lg font-semibold tabular-nums">
                  {Math.round(mmKpis.completionPercentFromMinutes)}%
                </div>
              </div>
            </div>
            {mmKpis.topResponsiblesPending && mmKpis.topResponsiblesPending.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Top responsables (pendientes)</div>
                <ul className="text-xs space-y-0.5">
                  {mmKpis.topResponsiblesPending.slice(0, 5).map((r) => (
                    <li key={r.name} className="flex justify-between gap-2 tabular-nums">
                      <span className="truncate">{r.name || '—'}</span>
                      <span>{r.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {mmKpis.topAreasBlocked && mmKpis.topAreasBlocked.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Áreas con más bloqueos</div>
                <ul className="text-xs space-y-0.5">
                  {mmKpis.topAreasBlocked.slice(0, 5).map((r) => (
                    <li key={r.name} className="flex justify-between gap-2 tabular-nums">
                      <span className="truncate">{r.name || '—'}</span>
                      <span>{r.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {onOpenActasTab && (
          <Button variant="outline" size="sm" className="mt-3 rounded-lg w-full sm:w-auto" onClick={onOpenActasTab}>
            Ir a Actas
          </Button>
        )}
      </Panel>

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
