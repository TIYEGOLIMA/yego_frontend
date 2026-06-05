import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { yegoProOpsService, type ShiftSessionResponse, type ShiftSessionSummaryResponse, type TripResponse, type ListaConductoresResponse, type ConductorSimple } from '../../../../services/yego-pro-ops-service'
import { useAuth } from '../../../../shared/hooks/useAuth'
import { Button } from '../../../../components/ui/button'
import { Phone, Hash, Sun, Moon, Clock, CheckCircle2, ChevronRight, Pause } from 'lucide-react'
import { cn } from '../../../../utils/cn'

type FilterType = 'todos' | 'manana' | 'tarde'

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

function formatDateShort(iso: string): { date: string; day: string } {
  const d = new Date(iso)
  const date = d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }).replace(' ', '-').replace('.', '')
  const day = d.toLocaleDateString('es-PE', { weekday: 'long' }).toLowerCase()
  return { date, day }
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(v).replace('PEN', 'S/')
}

function isMorning(session: ShiftSessionResponse): boolean {
  const h = new Date(session.startedAt).getHours()
  return h >= 5 && h < 14
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
    case 'active':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />En curso
        </span>
      )
    case 'closed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
          <Pause className="w-3 h-3" />Pendiente
        </span>
      )
    case 'settled':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="w-3 h-3" />Liquidada
        </span>
      )
    default:
      return null
  }
}

function SessionStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'settled':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-3 h-3" />Completada
        </span>
      )
    case 'closed':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
          <Clock className="w-3 h-3" />Pendiente
        </span>
      )
    case 'active':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />En curso
        </span>
      )
    default:
      return null
  }
}

function ShiftBadge({ morning }: { morning: boolean }) {
  if (morning) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-medium">
        <Sun className="w-3 h-3" />Mañana
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-medium">
      <Moon className="w-3 h-3" />Tarde
    </span>
  )
}

function DriverAvatar({ name, avatarUrl, size }: { name: string; avatarUrl?: string; size?: 'sm' | 'lg' }) {
  const s = size === 'lg' ? 'w-14 h-14 rounded-xl' : 'w-9 h-9 rounded-full'
  return avatarUrl ? (
    <img src={avatarUrl} alt={name} className={cn(s, 'object-cover flex-shrink-0')} />
  ) : (
    <div className={cn(s, 'bg-red-600 text-white flex items-center justify-center font-bold flex-shrink-0', size === 'lg' ? 'text-lg' : 'text-xs')}>
      {getInitials(name)}
    </div>
  )
}

function MetricCard({ label, value, subtitle, subColor }: {
  label: string
  value: string
  subtitle: string
  subColor?: string
}) {
  return (
    <div className="bg-[#F8F8F8] dark:bg-neutral-800/60 rounded-xl p-4">
      <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</span>
      <p className="text-[28px] font-bold text-gray-900 dark:text-gray-100 leading-tight mb-1">{value}</p>
      <p className={cn('text-xs', subColor ?? 'text-gray-400 dark:text-gray-500')}>{subtitle}</p>
    </div>
  )
}

function SessionRow({ session, onSelect }: { session: ShiftSessionResponse; onSelect: () => void }) {
  const { date, day } = formatDateShort(session.startedAt)
  const morning = isMorning(session)
  const startTime = formatTime(session.startedAt)
  const endTime = session.closedAt ? formatTime(session.closedAt) : '···'
  const trips = session.totalTrips ?? 0
  const amount = session.totalAmount ?? 0

  return (
    <tr
      onClick={onSelect}
      className="border-b border-gray-100 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-800/30 cursor-pointer transition-colors"
    >
      <td className="py-3 px-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{date}.</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">{day}</p>
      </td>
      <td className="py-3 px-4">
        <ShiftBadge morning={morning} />
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <Car className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">—</span>
        </div>
      </td>
      <td className="py-3 px-4">
        <span className="text-sm text-gray-700 dark:text-gray-300 tabular-nums">
          {startTime} <span className="text-gray-400">→</span> {endTime}
        </span>
      </td>
      <td className="py-3 px-4 text-center">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 tabular-nums">{trips}v</span>
      </td>
      <td className="py-3 px-4 text-center">
        <span className="text-sm text-gray-400">—</span>
      </td>
      <td className="py-3 px-4 text-right">
        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(amount)}</span>
      </td>
      <td className="py-3 px-4">
        <SessionStatusBadge status={session.status} />
      </td>
    </tr>
  )
}

export function ShiftSessionsView() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDriver, setSelectedDriver] = useState<ConductorSimple | null>(null)
  const [filter, setFilter] = useState<FilterType>('todos')

  const { data: driversData } = useQuery<ListaConductoresResponse>({
    queryKey: ['pro-ops', 'drivers'],
    queryFn: () => yegoProOpsService.obtenerListaConductores(),
  })

  const filteredDrivers = useMemo(() =>
    (driversData?.conductores ?? []).filter(d => {
      const q = searchTerm.toLowerCase()
      return d.nombre.toLowerCase().includes(q) || d.telefono?.includes(q) || d.driverId.toLowerCase().includes(q)
    }),
    [driversData, searchTerm],
  )

  const { data: history } = useQuery<ShiftSessionResponse[]>({
    queryKey: ['pro-ops', 'shift-sessions', 'history', selectedDriver?.driverId],
    queryFn: () => yegoProOpsService.getSessionHistory(selectedDriver?.driverId ?? ''),
    enabled: !!selectedDriver?.driverId,
  })

  const filteredSessions = useMemo(() => {
    if (!history) return []
    return history.filter(s => {
      if (filter === 'todos') return true
      const morning = isMorning(s)
      return filter === 'manana' ? morning : !morning
    })
  }, [history, filter])

  const totalTrips = useMemo(() => history?.reduce((s, sess) => s + (sess.totalTrips ?? 0), 0) ?? 0, [history])
  const totalAmount = useMemo(() => history?.reduce((s, sess) => s + (sess.totalAmount ?? 0), 0) ?? 0, [history])
  const avgPerSession = history && history.length > 0 ? (totalAmount / history.length) : 0

  const closeMutation = useMutation({
    mutationFn: (sessionId: string) => yegoProOpsService.closeSession(sessionId, user?.id ?? 0),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pro-ops', 'shift-sessions'] }),
  })

  const settleMutation = useMutation({
    mutationFn: (sessionId: string) => yegoProOpsService.settleSession(sessionId, user?.id ?? 0),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pro-ops', 'shift-sessions'] }),
  })

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  const { data: sessionSummary } = useQuery<ShiftSessionSummaryResponse>({
    queryKey: ['pro-ops', 'shift-sessions', 'summary', selectedSessionId],
    queryFn: () => yegoProOpsService.getSessionSummary(selectedSessionId ?? ''),
    enabled: !!selectedSessionId,
  })

  const { data: sessionTrips } = useQuery<TripResponse[]>({
    queryKey: ['pro-ops', 'shift-sessions', 'trips', selectedSessionId],
    queryFn: () => yegoProOpsService.getSessionTrips(selectedSessionId ?? ''),
    enabled: !!selectedSessionId,
  })

  const activeCount = driversData?.conductores?.length ?? 0

  return (
    <div className="flex h-[calc(100vh-180px)] bg-white dark:bg-neutral-950 rounded-xl overflow-hidden border border-gray-200 dark:border-neutral-800 shadow-sm">
      {/* PANEL IZQUIERDO — Lista de conductores */}
      <div className="w-[280px] flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <div className="bg-red-600 px-4 py-3.5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-white font-medium text-sm">Conductores</span>
            </div>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white text-red-600 text-xs font-bold">{activeCount}</span>
          </div>
          <p className="text-red-200 text-[11px]">Selecciona un conductor para ver sus sesiones</p>
        </div>

        <div className="px-3 py-2.5">
          <input
            type="text"
            placeholder="Buscar nombre, teléfono o ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-red-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredDrivers.map(driver => {
            const isSelected = selectedDriver?.driverId === driver.driverId
            return (
              <button
                key={driver.driverId}
                onClick={() => { setSelectedDriver(driver); setSelectedSessionId(null) }}
                className={cn(
                  'w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors group',
                  isSelected
                    ? 'bg-red-50 dark:bg-red-950/30 border-l-[3px] border-l-red-600'
                    : 'border-l-[3px] border-l-transparent hover:bg-gray-50 dark:hover:bg-neutral-800/30',
                )}
              >
                <div className="relative">
                  <DriverAvatar name={driver.nombre} avatarUrl={driver.avatarUrl} />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-950" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{driver.nombre}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    <Phone className="w-3 h-3" />
                    <span>{driver.telefono}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500" />
              </button>
            )
          })}
        </div>
      </div>

      {/* PANEL DERECHO — Detalle */}
      <div className="flex-1 overflow-y-auto">
        {!selectedDriver ? (
          <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm font-medium">Selecciona un conductor</p>
              <p className="text-xs mt-1">Elige un conductor de la lista para ver su historial de sesiones</p>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {/* Header del conductor */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <DriverAvatar name={selectedDriver.nombre} avatarUrl={selectedDriver.avatarUrl} size="lg" />
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">{selectedDriver.nombre}</h2>
                    <StatusBadge status={history?.find(s => s.status === 'active')?.status ?? 'settled'} />
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400 dark:text-gray-500">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      {selectedDriver.telefono}
                    </span>
                    <span className="text-gray-300 dark:text-neutral-700">|</span>
                    <span className="flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5" />
                      ID {selectedDriver.driverId.substring(0, 6)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 tarjetas de métricas */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <MetricCard
                label="SESIONES TOTALES" value={String(history?.length ?? 0)}
                subtitle="Historial completo"
              />
              <MetricCard
                label="VIAJES REALIZADOS" value={String(totalTrips)}
                subtitle={`${history?.filter(s => s.status === 'active').length ?? 0} en curso`}
                subColor="text-emerald-600 dark:text-emerald-400"
              />
              <MetricCard
                label="INGRESOS TOTALES" value={formatCurrency(totalAmount)}
                subtitle="Bruto histórico"
              />
              <MetricCard
                label="PROMEDIO POR SESIÓN" value={formatCurrency(avgPerSession)}
                subtitle="Ingresos / sesión"
              />
            </div>

            {/* Sección Historial de sesiones */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">Historial de sesiones</h3>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
                  {history?.length ?? 0} sesiones · {totalTrips} viajes · {formatCurrency(totalAmount)} ingresos
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {([
                  { key: 'todos', label: 'Todos', icon: null },
                  { key: 'manana', label: 'Mañana', icon: Sun },
                  { key: 'tarde', label: 'Tarde', icon: Moon },
                ] as const).map(f => (
                  <Button
                    key={f.key}
                    size="sm"
                    variant="ghost"
                    onClick={() => setFilter(f.key)}
                    className={cn(
                      'rounded-full px-3.5 h-8 text-xs font-medium gap-1.5 transition-all',
                      filter === f.key
                        ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800',
                    )}
                  >
                    {f.icon && <f.icon className="w-3.5 h-3.5" />}
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Tabla de sesiones */}
            <div className="rounded-xl border border-gray-200 dark:border-neutral-800 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900/50">
                    <th className="py-2.5 px-4 text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="py-2.5 px-4 text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Turno</th>
                    <th className="py-2.5 px-4 text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Horario</th>
                    <th className="py-2.5 px-4 text-center text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Viajes</th>
                    <th className="py-2.5 px-4 text-right text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Ingresos</th>
                    <th className="py-2.5 px-4 text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="py-2.5 px-4 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400 dark:text-gray-600">
                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Sin sesiones{filter !== 'todos' ? ' en este turno' : ''}</p>
                      </td>
                    </tr>
                  ) : (
                    filteredSessions.map(session => {
                      const { date, day } = formatDateShort(session.startedAt)
                      const morning = isMorning(session)
                      const startTime = formatTime(session.startedAt)
                      const endTime = session.closedAt ? formatTime(session.closedAt) : '···'
                      const trips = session.totalTrips ?? 0
                      const amount = session.totalAmount ?? 0
                      const isSelected = selectedSessionId === session.id

                      return (
                        <tr
                          key={session.id}
                          onClick={() => setSelectedSessionId(isSelected ? null : session.id)}
                          className={cn(
                            'border-b border-gray-50 dark:border-neutral-800/50 hover:bg-gray-50 dark:hover:bg-neutral-800/20 cursor-pointer transition-colors',
                            isSelected && 'bg-red-50/50 dark:bg-red-950/20',
                          )}
                        >
                          <td className="py-3 px-4">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{date}.</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{day}</p>
                          </td>
                          <td className="py-3 px-4">
                            <ShiftBadge morning={morning} />
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-700 dark:text-gray-300 tabular-nums">
                              {startTime} <span className="text-gray-400">→</span> {endTime}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{trips}v</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(amount)}</span>
                          </td>
                          <td className="py-3 px-4">
                            <SessionStatusBadge status={session.status} />
                          </td>
                          <td className="py-3 px-4">
                            {session.status === 'active' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => { e.stopPropagation(); closeMutation.mutate(session.id) }}
                                disabled={closeMutation.isPending}
                                className="h-7 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-full"
                              >
                                Cerrar
                              </Button>
                            )}
                            {session.status === 'closed' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => { e.stopPropagation(); settleMutation.mutate(session.id) }}
                                disabled={settleMutation.isPending}
                                className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-full"
                              >
                                Liquidar
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Panel de viajes de sesión seleccionada */}
            {selectedSessionId && sessionTrips && (
              <div className="mt-4 rounded-xl border border-gray-200 dark:border-neutral-800 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-neutral-900/50 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Viajes de la sesión
                  </span>
                  <span className="text-xs text-gray-400">{sessionTrips.length} viajes</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50 dark:bg-neutral-900/50">
                      <tr>
                        <th className="py-2 px-4 text-left text-[11px] font-semibold text-gray-400 uppercase">ID</th>
                        <th className="py-2 px-4 text-left text-[11px] font-semibold text-gray-400 uppercase">Completado</th>
                        <th className="py-2 px-4 text-right text-[11px] font-semibold text-gray-400 uppercase">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-neutral-800/50">
                      {sessionTrips.length === 0 ? (
                        <tr><td colSpan={3} className="py-6 text-center text-gray-400 text-sm">Sin viajes</td></tr>
                      ) : (
                        sessionTrips.map(trip => (
                          <tr key={trip.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800/20">
                            <td className="py-2 px-4 text-xs text-gray-500 font-mono">{trip.externalTripId ?? trip.id.substring(0, 8)}</td>
                            <td className="py-2 px-4 text-xs text-gray-700 dark:text-gray-300">
                              {new Date(trip.completedAt).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-2 px-4 text-right text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(trip.amount)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
