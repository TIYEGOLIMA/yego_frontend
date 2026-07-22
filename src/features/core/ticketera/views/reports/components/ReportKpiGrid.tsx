import { Activity, BarChart3, CheckCircle2, Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface Props {
  totalTickets: number
  openTickets: number
  completedTickets: number
  cancelledTickets: number
  averageRating: number
  totalRatings: number
}

export function ReportKpiGrid(props: Props) {
  const metrics = [
    { label: 'Tickets generados', value: props.totalTickets, helper: 'Dentro del alcance seleccionado', icon: BarChart3, iconClass: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' },
    { label: 'Abiertos ahora', value: props.openTickets, helper: 'En espera, llamados o en atención', icon: Activity, iconClass: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    { label: 'Completados', value: props.completedTickets, helper: `${props.cancelledTickets} cancelados`, icon: CheckCircle2, iconClass: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { label: 'Calificación', value: `${props.averageRating}/5`, helper: `${props.totalRatings} respuestas recibidas`, icon: Star, iconClass: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/30' },
  ]

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon
        return (
          <Card key={metric.label} className="overflow-hidden border-slate-200 shadow-none dark:border-slate-700">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{metric.label}</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">{metric.value}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{metric.helper}</p>
                </div>
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${metric.bg}`}>
                  <Icon className={`h-5 w-5 ${metric.iconClass}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
