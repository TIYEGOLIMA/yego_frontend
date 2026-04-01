import type { ReactNode } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ListTodo,
  ShieldAlert,
  Users,
  Zap,
} from 'lucide-react'

export interface PulseKpis {
  equipos: number
  tareas: number
  progresoPromedioPct: number
  completadas: number
  enRiesgo: number
  bloqueadas: number
}

function ProgressRing({ pct }: { pct: number }) {
  const p = Math.min(100, Math.max(0, pct))
  const deg = (p / 100) * 360
  return (
    <div
      className="relative w-9 h-9 shrink-0 rounded-full grid place-items-center"
      style={{
        background: `conic-gradient(rgb(220 38 38) ${deg}deg, hsl(var(--muted)) ${deg}deg)`,
      }}
    >
      <div className="w-[30px] h-[30px] rounded-full bg-background flex items-center justify-center border border-border/50">
        <span className="text-[10px] font-bold tabular-nums text-foreground">{p}%</span>
      </div>
    </div>
  )
}

export function PulseStatsBar({ kpis }: { kpis: PulseKpis | null }) {
  if (!kpis) return null

  const items: { key: string; icon: typeof Users; label: string; node: ReactNode; className: string }[] = [
    {
      key: 'eq',
      icon: Users,
      label: 'Equipos',
      node: <span className="text-sm font-bold tabular-nums text-red-600 dark:text-red-400">{kpis.equipos}</span>,
      className: 'text-red-600 dark:text-red-400',
    },
    {
      key: 'ta',
      icon: ListTodo,
      label: 'Tareas',
      node: <span className="text-sm font-bold tabular-nums">{kpis.tareas}</span>,
      className: 'text-foreground',
    },
    {
      key: 'pr',
      icon: Zap,
      label: 'Progreso',
      node: <ProgressRing pct={kpis.progresoPromedioPct} />,
      className: 'text-red-600 dark:text-red-400',
    },
    {
      key: 'ok',
      icon: CheckCircle2,
      label: 'Completadas',
      node: <span className="text-sm font-bold tabular-nums text-emerald-600">{kpis.completadas}</span>,
      className: 'text-emerald-600',
    },
    {
      key: 'risk',
      icon: AlertTriangle,
      label: 'En riesgo',
      node: <span className="text-sm font-bold tabular-nums text-amber-600">{kpis.enRiesgo}</span>,
      className: 'text-amber-600',
    },
    {
      key: 'bl',
      icon: ShieldAlert,
      label: 'Bloqueadas',
      node: <span className="text-sm font-bold tabular-nums text-destructive">{kpis.bloqueadas}</span>,
      className: 'text-destructive',
    },
  ]

  return (
    <div className="flex items-center gap-0.5 px-4 sm:px-5 py-2.5 border-b border-border/80 bg-gradient-to-b from-muted/25 to-background overflow-x-auto">
      {items.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <div className="flex items-center gap-2.5 px-3 py-1 rounded-xl hover:bg-muted/50 transition-colors">
            {s.key === 'pr' ? (
              <>
                {s.node}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">{s.label}</span>
                  <span className={`text-xs font-semibold tabular-nums ${s.className}`}>{kpis.progresoPromedioPct}%</span>
                </div>
              </>
            ) : (
              <>
                <s.icon className={`w-4 h-4 shrink-0 ${s.className}`} />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">{s.label}</span>
                  {s.node}
                </div>
              </>
            )}
          </div>
          {i < items.length - 1 && <div className="w-px h-9 bg-border/60 mx-0.5 shrink-0" />}
        </div>
      ))}
    </div>
  )
}
