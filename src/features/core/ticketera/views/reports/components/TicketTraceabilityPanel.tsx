import { useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Clock3,
  MapPin,
  Monitor,
  Route,
  Search,
  Star,
  UserRound,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TicketTraceability } from '../services/reportsService'

interface Props {
  tickets: TicketTraceability[]
  total: number
}

const STATUS_META: Record<TicketTraceability['status'], { label: string; className: string }> = {
  WAITING: { label: 'En espera', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  CALLED: { label: 'Llamado', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
  IN_PROGRESS: { label: 'En atención', className: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300' },
  COMPLETED: { label: 'Completado', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  CANCELLED: { label: 'Cancelado', className: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatDuration(ticket: TicketTraceability): string {
  if (!ticket.completedAt) return 'En curso'
  const start = new Date(ticket.createdAt).getTime()
  const end = new Date(ticket.completedAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return '—'
  const minutes = Math.max(1, Math.round((end - start) / 60000))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  return `${hours} h ${minutes % 60} min`
}

export function TicketTraceabilityPanel({ tickets, total }: Props) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'ALL' | TicketTraceability['status']>('ALL')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const visibleTickets = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es')
    return tickets.filter((ticket) => {
      if (status !== 'ALL' && ticket.status !== status) return false
      if (!query) return true
      return [
        ticket.ticketNumber,
        ticket.sedeName,
        ticket.categoryName,
        ticket.optionName,
        ticket.licenseNumber,
        ticket.operatorName,
        ticket.moduleName,
      ].some((value) => value?.toLocaleLowerCase('es').includes(query))
    })
  }, [search, status, tickets])

  return (
    <Card className="mb-8 overflow-hidden border-slate-200 dark:border-slate-700">
      <CardHeader className="border-b border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/40">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Route className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              Trazabilidad de tickets
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Origen, opción marcada y recorrido operativo. Mostrando {tickets.length} de {total} tickets recientes.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ticket, opción, conductor u operador"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as typeof status)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="ALL">Todos los estados</option>
              {Object.entries(STATUS_META).map(([value, meta]) => (
                <option key={value} value={value}>{meta.label}</option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {visibleTickets.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-slate-500 dark:text-slate-400">
            No hay tickets que coincidan con los filtros.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {visibleTickets.map((ticket) => {
              const meta = STATUS_META[ticket.status] ?? STATUS_META.WAITING
              const expanded = expandedId === ticket.id
              return (
                <article key={ticket.id} className="bg-white transition-colors hover:bg-slate-50/70 dark:bg-slate-900/20 dark:hover:bg-slate-800/50">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : ticket.id)}
                    className="grid w-full gap-4 px-5 py-4 text-left md:grid-cols-[1.1fr_1.5fr_1fr_1fr_auto] md:items-center"
                    aria-expanded={expanded}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">#{ticket.ticketNumber}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}>{meta.label}</span>
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Clock3 className="h-3.5 w-3.5" /> {formatDate(ticket.createdAt)} · {formatDuration(ticket)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Opción marcada</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {ticket.categoryName ? `${ticket.categoryName} → ` : ''}{ticket.optionName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">ID opción: {ticket.optionId ?? '—'}</p>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200"><MapPin className="h-4 w-4 text-slate-400" /> {ticket.sedeName}</p>
                      <p className="flex items-center gap-1.5 text-xs text-slate-500"><UserRound className="h-4 w-4" /> {ticket.licenseNumber || 'Conductor no identificado'}</p>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-slate-700 dark:text-slate-200">{ticket.operatorName || 'Sin operador'}</p>
                      <p className="flex items-center gap-1.5 text-xs text-slate-500"><Monitor className="h-4 w-4" /> {ticket.moduleName || 'Sin módulo'}</p>
                    </div>
                    <div className="flex items-center justify-end gap-3">
                      {ticket.rating != null && (
                        <span className="flex items-center gap-1 text-sm font-semibold text-amber-600 dark:text-amber-400">
                          <Star className="h-4 w-4 fill-current" /> {ticket.rating}/5
                        </span>
                      )}
                      {expanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-slate-100 bg-slate-50/80 px-5 py-5 dark:border-slate-700 dark:bg-slate-950/30">
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        {ticket.events.map((event, index) => (
                          <div key={`${event.status}-${event.occurredAt}-${index}`} className="relative rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                            <div className="mb-2 flex items-center gap-2">
                              <span className={`h-2.5 w-2.5 rounded-full ${event.status === 'CANCELLED' ? 'bg-rose-500' : event.status === 'COMPLETED' || event.status === 'RATED' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{event.label}</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(event.occurredAt)}</p>
                            {event.notes && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{event.notes}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
