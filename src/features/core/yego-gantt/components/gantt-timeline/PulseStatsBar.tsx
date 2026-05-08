import type { ReactNode } from 'react'
import {
  Activity,
  AlertOctagon,
  CheckCircle2,
  Users,
} from 'lucide-react'

export interface PulseKpis {
  equipos: number
  tareas: number
  progresoPromedioPct: number
  completadas: number
  bloqueadas: number
}

function KPI({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Users
  label: string
  value: string | number
  accent?: 'default' | 'primary' | 'success' | 'warning' | 'destructive'
}) {
  const tone =
    accent === 'primary'
      ? 'text-primary-600 dark:text-primary-400'
      : accent === 'success'
        ? 'text-emerald-600 dark:text-emerald-400'
        : accent === 'warning'
          ? 'text-amber-600 dark:text-amber-400'
          : accent === 'destructive'
            ? 'text-red-600 dark:text-red-400'
            : 'text-foreground'
  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-[#f3f4f6] transition dark:hover:bg-muted/40">
      <Icon className={`h-4 w-4 shrink-0 ${tone}`} />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold leading-none">{label}</div>
        <div className={`text-sm font-semibold tabular-nums mt-0.5 ${tone}`}>{value}</div>
      </div>
    </div>
  )
}

export function PulseStatsBar({ kpis, trailing }: { kpis: PulseKpis | null; trailing?: ReactNode }) {
  if (!kpis) return null

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white p-2 workos-shadow-soft dark:border-border/80 dark:bg-card">
      <KPI icon={Users} label="Equipos" value={kpis.equipos} />
      <KPI icon={Activity} label="Proyectos" value={kpis.tareas} />
      <KPI icon={Activity} label="Progreso" value={`${kpis.progresoPromedioPct}%`} accent="primary" />
      <KPI icon={CheckCircle2} label="Completadas" value={kpis.completadas} accent="success" />
      <KPI icon={AlertOctagon} label="Bloqueadas" value={kpis.bloqueadas} accent="destructive" />
      {trailing ? <div className="ml-auto flex items-center gap-2 flex-wrap">{trailing}</div> : null}
    </div>
  )
}
