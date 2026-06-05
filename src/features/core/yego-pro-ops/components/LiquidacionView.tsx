import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { yegoProOpsService, type LiquidacionSemanalResponse, type DiaLiquidacionInfo, type SesionDiaInfo, type ListaConductoresResponse, type ConductorSimple } from '../../../../services/yego-pro-ops-service'
import { Card, CardContent } from '../../../../components/ui/card'
import { Button } from '../../../../components/ui/button'
import { Phone, Hash, DollarSign, Clock, CheckCircle2, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '../../../../utils/cn'

type FilterType = 'esta' | 'pendientes'

function getInitials(name: string): string { return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') }
function fmtCur(v: number): string { return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(v).replace('PEN', 'S/') }
function fmtDateFull(iso: string): string { return new Date(iso + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }) }
function fmtDateShort(iso: string): string { return new Date(iso + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) }
function fmtTime(iso: string): string { const d = new Date(iso); return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }) }
function isToday(dateStr: string): boolean { const d = new Date(dateStr + 'T00:00:00'); const h = new Date(); return d.getFullYear() === h.getFullYear() && d.getMonth() === h.getMonth() && d.getDate() === h.getDate() }

function SessionStatusBadge({ status, small }: { status: string; small?: boolean }) {
  const cls = small ? 'text-[10px] px-1.5 py-0 h-5' : 'text-xs px-2.5 py-0.5'
  switch (status) {
    case 'settled': return <span className={cn('inline-flex items-center gap-1 rounded-full font-medium bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400', cls)}><CheckCircle2 className="w-3 h-3" />Liquidado</span>
    case 'closed': return <span className={cn('inline-flex items-center gap-1 rounded-full font-medium bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400', cls)}><Clock className="w-3 h-3" />Cerrado</span>
    case 'active': return <span className={cn('inline-flex items-center gap-1 rounded-full font-medium bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400', cls)}><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />En curso</span>
    default: return null
  }
}

function DayStatusBadge({ estado }: { estado: string }) {
  switch (estado) {
    case 'En curso': return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />En curso</span>
    case 'Cerrado': return <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600"><Clock className="w-3 h-3" />Cerrado</span>
    case 'Pendiente parcial': return <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600"><Clock className="w-3 h-3" />Pendiente parcial</span>
    case 'Liquidado': return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 className="w-3 h-3" />Liquidado</span>
    default: return <span className="text-xs text-gray-400">Sin actividad</span>
  }
}

function DriverAvatar({ name, avatarUrl, size }: { name: string; avatarUrl?: string; size?: 'lg' }) {
  const s = size === 'lg' ? 'w-14 h-14 rounded-xl' : 'w-9 h-9 rounded-full'
  return avatarUrl ? (
    <img src={avatarUrl} alt={name} className={cn(s, 'object-cover flex-shrink-0')} />
  ) : (
    <div className={cn(s, 'bg-red-600 text-white flex items-center justify-center font-bold flex-shrink-0', size === 'lg' ? 'text-lg' : 'text-xs')}>{getInitials(name)}</div>
  )
}

function WeekTimeline({ dias, todayIdx }: { dias: DiaLiquidacionInfo[]; todayIdx: number }) {
  const colors: Record<string, string> = { 'Sin actividad': 'bg-gray-200 dark:bg-neutral-700', 'En curso': 'bg-red-500 animate-pulse', 'Cerrado': 'bg-emerald-500', 'Pendiente parcial': 'bg-amber-500', 'Liquidado': 'bg-emerald-700' }
  return (
    <div className="flex gap-1.5 items-end h-10 mb-2">
      {dias.map((d, i) => (
        <div key={d.fecha} className="flex-1 flex flex-col items-center gap-1" title={`${d.diaSemana}: ${d.estado} — ${d.viajes} viajes`}>
          <div className={cn('w-full rounded-sm transition-all', colors[d.estado] ?? 'bg-gray-200', i === todayIdx ? 'h-10' : d.viajes > 0 ? 'h-6' : 'h-3')} />
          <span className="text-[10px] text-gray-400">{d.diaSemana.substring(0, 3)}</span>
        </div>
      ))}
    </div>
  )
}

export function LiquidacionView() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDriver, setSelectedDriver] = useState<ConductorSimple | null>(null)
  const [filter, setFilter] = useState<FilterType>('esta')
  const [tab, setTab] = useState<'diario' | 'semanal'>('diario')
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())
  const [showConfirm, setShowConfirm] = useState(false)
  const [settleResult, setSettleResult] = useState<any>(null)

  const { data: driversData } = useQuery<ListaConductoresResponse>({
    queryKey: ['pro-ops', 'drivers'],
    queryFn: () => yegoProOpsService.obtenerListaConductores(),
  })

  const filteredDrivers = useMemo(() =>
    (driversData?.conductores ?? []).filter(d => {
      const q = searchTerm.toLowerCase()
      return d.nombre.toLowerCase().includes(q) || d.telefono?.includes(q) || d.driverId.toLowerCase().includes(q)
    }), [driversData, searchTerm])

  const weekOffset = filter === 'esta' ? 0 : filter === 'pendientes' ? 0 : -1
  const weekStart = useMemo(() => {
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + weekOffset * 7)
    monday.setHours(0, 0, 0, 0)
    return monday.toISOString().split('T')[0]
  }, [weekOffset])

  const { data: liquidacion, isLoading } = useQuery<LiquidacionSemanalResponse>({
    queryKey: ['pro-ops', 'liquidacion', selectedDriver?.driverId, weekStart],
    queryFn: () => yegoProOpsService.getLiquidacionSemanal(selectedDriver?.driverId ?? '', weekStart),
    enabled: !!selectedDriver?.driverId,
  })

  const liquidarMutation = useMutation({
    mutationFn: () => yegoProOpsService.liquidarSemana(selectedDriver?.driverId ?? ''),
    onSuccess: (data) => {
      setSettleResult(data)
      queryClient.invalidateQueries({ queryKey: ['pro-ops', 'liquidacion'] })
      queryClient.invalidateQueries({ queryKey: ['pro-ops', 'shift-sessions'] })
    },
  })

  const handleLiquidar = () => { setShowConfirm(false); liquidarMutation.mutate() }
  const toggleDay = (fecha: string) => setExpandedDays(prev => { const n = new Set(prev); if (n.has(fecha)) n.delete(fecha); else n.add(fecha); return n })

  const todayIdx = useMemo(() => {
    if (!liquidacion?.dias) return -1
    return liquidacion.dias.findIndex(d => isToday(d.fecha))
  }, [liquidacion])

  return (
    <div className="flex h-[calc(100vh-180px)] bg-white dark:bg-neutral-950 rounded-xl overflow-hidden border border-gray-200 dark:border-neutral-800 shadow-sm">
      {/* PANEL IZQUIERDO */}
      <div className="w-[280px] flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <div className="bg-red-600 px-4 py-3.5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-white" />
              <span className="text-white font-medium text-sm">Liquidación</span>
            </div>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white text-red-600 text-xs font-bold">{driversData?.conductores?.length ?? 0}</span>
          </div>
          <p className="text-red-200 text-[11px]">Selecciona un conductor para liquidar</p>
        </div>
        <div className="px-3 py-2.5">
          <input type="text" placeholder="Buscar nombre, teléfono o ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-red-500" />
        </div>
        <div className="px-3 py-2 flex gap-1.5">
          {([{ key: 'esta', label: 'Esta semana' }, { key: 'pendientes', label: 'Pendientes' }] as const).map(f => (
            <Button key={f.key} size="sm" variant="ghost" onClick={() => setFilter(f.key)}
              className={cn('rounded-full px-3 h-7 text-[11px] font-medium', filter === f.key ? 'bg-red-50 dark:bg-red-950/40 text-red-600' : 'text-gray-500')}>{f.label}</Button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredDrivers.map(driver => {
            const isSel = selectedDriver?.driverId === driver.driverId
            return (
              <button key={driver.driverId} onClick={() => { setSelectedDriver(driver); setExpandedDays(new Set()); setSettleResult(null) }}
                className={cn('w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors', isSel ? 'bg-red-50 dark:bg-red-950/30 border-l-[3px] border-l-red-600' : 'border-l-[3px] border-l-transparent hover:bg-gray-50 dark:hover:bg-neutral-800/30')}>
                <div className="relative"><DriverAvatar name={driver.nombre} avatarUrl={driver.avatarUrl} /><span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-950" /></div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{driver.nombre}</p><div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5"><Phone className="w-3 h-3" /><span>{driver.telefono}</span></div></div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
              </button>
            )
          })}
        </div>
      </div>

      {/* PANEL DERECHO */}
      <div className="flex-1 overflow-y-auto">
        {!selectedDriver ? (
          <div className="h-full flex items-center justify-center text-gray-400"><div className="text-center"><DollarSign className="w-16 h-16 mx-auto mb-4 opacity-30" /><p className="text-sm font-medium">Selecciona un conductor</p></div></div>
        ) : isLoading ? (
          <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" /></div>
        ) : liquidacion ? (
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <DriverAvatar name={selectedDriver.nombre} avatarUrl={selectedDriver.avatarUrl} size="lg" />
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">{selectedDriver.nombre}</h2>
                    {liquidacion.tieneSesionActiva && <SessionStatusBadge status="active" />}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400"><span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{selectedDriver.telefono}</span><span className="text-gray-300">|</span><span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" />ID {selectedDriver.driverId.substring(0, 6)}</span></div>
                </div>
              </div>
            </div>

            {/* METRIC CARDS */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="bg-[#F8F8F8] dark:bg-neutral-800/60 rounded-xl p-4">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">SESIONES ESTA SEMANA</span>
                <p className="text-[28px] font-bold text-gray-900 dark:text-gray-100 leading-tight mb-1">{liquidacion.totalSesiones}</p>
                <p className="text-xs text-gray-400">Lun a hoy</p>
              </div>
              <div className="bg-[#F8F8F8] dark:bg-neutral-800/60 rounded-xl p-4">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">VIAJES ESTA SEMANA</span>
                <p className="text-[28px] font-bold text-gray-900 dark:text-gray-100 leading-tight mb-1">{liquidacion.totalViajes}</p>
                <p className="text-xs text-gray-400">Total semanal</p>
              </div>
              <div className="bg-[#F8F8F8] dark:bg-neutral-800/60 rounded-xl p-4">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">A LIQUIDAR</span>
                <p className="text-[28px] font-bold text-emerald-600 dark:text-emerald-400 leading-tight mb-1">{fmtCur(liquidacion.totalIngresos)}</p>
                <p className={cn('text-xs', liquidacion.tieneSesionesCerradas ? 'text-emerald-600' : 'text-red-500')}>{liquidacion.tieneSesionesCerradas ? 'Total pendiente' : 'Cierra el turno para liquidar'}</p>
              </div>
              <div className="bg-[#F8F8F8] dark:bg-neutral-800/60 rounded-xl p-4">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">KM RECORRIDOS</span>
                <p className="text-[28px] font-bold text-gray-900 dark:text-gray-100 leading-tight mb-1">{liquidacion.totalKm.toFixed(1)}</p>
                <p className="text-xs text-gray-400">Esta semana</p>
              </div>
            </div>

            {/* TABS */}
            <div className="flex items-center gap-1 mb-4">
              {(['diario', 'semanal'] as const).map(t => (
                <Button key={t} size="sm" variant="ghost" onClick={() => setTab(t)}
                  className={cn('rounded-full px-4 h-8 text-sm font-medium transition-all', tab === t ? 'bg-red-600 text-white hover:bg-red-700' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800')}>{t === 'diario' ? 'Diario' : 'Semanal'}</Button>
              ))}
            </div>

            {/* TAB DIARIO */}
            {tab === 'diario' && (
              <div className="rounded-xl border border-gray-200 dark:border-neutral-800 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900/50">
                      <th className="py-2.5 px-4 text-left text-[11px] font-semibold text-gray-400 uppercase">Día</th>
                      <th className="py-2.5 px-3 text-center text-[11px] font-semibold text-gray-400 uppercase">Ses.</th>
                      <th className="py-2.5 px-3 text-center text-[11px] font-semibold text-gray-400 uppercase">Viajes</th>
                      <th className="py-2.5 px-3 text-center text-[11px] font-semibold text-gray-400 uppercase">KM</th>
                      <th className="py-2.5 px-4 text-right text-[11px] font-semibold text-gray-400 uppercase">Ingresos</th>
                      <th className="py-2.5 px-4 text-left text-[11px] font-semibold text-gray-400 uppercase">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liquidacion.dias.map(dia => {
                      const expanded = expandedDays.has(dia.fecha)
                      const hasSessions = dia.sesionesDetalle.length > 0
                      const mixed = dia.ingresosPendientes > 0 && dia.ingresosLiquidados > 0
                      const allSettled = dia.sesionesDetalle.length > 0 && dia.sesionesDetalle.every(s => s.status === 'settled')

                      return (
                        <>
                          <tr key={dia.fecha} onClick={() => hasSessions && toggleDay(dia.fecha)}
                            className={cn('border-b border-gray-50 dark:border-neutral-800/50 transition-colors', hasSessions && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800/20', expanded && 'bg-gray-50 dark:bg-neutral-800/20')}>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                {hasSessions && (expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />)}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize">{dia.diaSemana}</p>
                                    {isToday(dia.fecha) && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/40 text-red-600">Hoy</span>}
                                  </div>
                                  <p className="text-xs text-gray-400">{fmtDateShort(dia.fecha)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">{dia.sesiones}</td>
                            <td className="py-3 px-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">{dia.viajes}</td>
                            <td className="py-3 px-3 text-center text-sm text-gray-500">{dia.km.toFixed(1)}</td>
                            <td className="py-3 px-4 text-right tabular-nums">
                              {dia.viajes > 0 ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  {dia.ingresosPendientes > 0 && <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmtCur(dia.ingresosPendientes)}</span>}
                                  {dia.ingresosLiquidados > 0 && <span className="text-xs text-gray-400 line-through">{fmtCur(dia.ingresosLiquidados)}</span>}
                                  {!mixed && dia.estado === 'En curso' && <span className="text-sm font-bold text-red-600">{fmtCur(dia.ingresos)}</span>}
                                  {!mixed && dia.estado !== 'En curso' && <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmtCur(dia.ingresos)}</span>}
                                </div>
                              ) : <span className="text-gray-400">—</span>}
                            </td>
                            <td className="py-3 px-4">
                              {mixed ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {dia.ingresosLiquidados > 0 && <SessionStatusBadge status="settled" small />}
                                  {dia.ingresosPendientes > 0 && <SessionStatusBadge status={dia.estado === 'En curso' ? 'active' : 'closed'} small />}
                                </div>
                              ) : (
                                <DayStatusBadge estado={dia.estado} />
                              )}
                            </td>
                          </tr>
                          {expanded && dia.sesionesDetalle.map(ses => (
                            <tr key={ses.sessionId} className="border-b border-gray-100 dark:border-neutral-800/30">
                              <td className="py-2.5 pl-10 pr-4" colSpan={1}>
                                <div className={cn('pl-2 border-l-[3px]',
                                  ses.status === 'settled' ? 'border-l-emerald-500' : ses.status === 'closed' ? 'border-l-amber-500' : 'border-l-red-500')}>
                                  <p className="text-xs text-gray-500">
                                    {ses.inicio ? fmtTime(ses.inicio) : '—'} <span className="text-gray-300">→</span> {ses.fin ? fmtTime(ses.fin) : '···'}
                                  </p>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center"><SessionStatusBadge status={ses.status} small /></td>
                              <td className="py-2.5 px-3 text-center text-xs font-medium text-gray-600">{ses.viajes}</td>
                              <td className="py-2.5 px-3 text-center text-xs text-gray-400">{ses.km.toFixed(1)}</td>
                              <td className={cn('py-2.5 px-4 text-right text-xs font-semibold tabular-nums', ses.status === 'settled' ? 'text-gray-400 line-through' : ses.status === 'active' ? 'text-red-600' : 'text-emerald-600 dark:text-emerald-400')}>{fmtCur(ses.ingresos)}</td>
                              <td className="py-2.5 px-4" />
                            </tr>
                          ))}
                        </>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 dark:bg-neutral-800/60 font-bold">
                      <td className="py-3 px-4 text-sm text-gray-900">TOTAL</td>
                      <td className="py-3 px-3 text-center text-sm text-gray-900">{liquidacion.totalSesiones}</td>
                      <td className="py-3 px-3 text-center text-sm text-gray-900">{liquidacion.totalViajes}</td>
                      <td className="py-3 px-3 text-center text-sm text-gray-900">{liquidacion.totalKm.toFixed(1)}</td>
                      <td className="py-3 px-4 text-right text-sm text-emerald-600 tabular-nums">{fmtCur(liquidacion.totalIngresos)}</td>
                      <td className="py-3 px-4" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* TAB SEMANAL */}
            {tab === 'semanal' && (
              <div className="space-y-4">
                <Card className="border-0 shadow-sm dark:bg-neutral-900/80 rounded-2xl overflow-hidden">
                  <CardContent className="p-5">
                    <p className="text-sm text-gray-500 mb-3">{fmtDateFull(liquidacion.semanaInicio)} → {fmtDateFull(liquidacion.semanaFin)}</p>
                    <WeekTimeline dias={liquidacion.dias} todayIdx={todayIdx} />
                    <div className="space-y-0.5 mt-4">
                      {liquidacion.dias.map(dia => (
                        <div key={dia.fecha} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800/30">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-20 capitalize">{dia.diaSemana}</span>
                            <DayStatusBadge estado={dia.estado} />
                          </div>
                          <div className="flex items-center gap-6 text-sm tabular-nums">
                            <span className={dia.viajes > 0 ? 'text-emerald-600 font-semibold' : 'text-gray-400'}>{fmtCur(dia.ingresos)}</span>
                            <span className="text-gray-500">{dia.viajes} viajes</span>
                            <span className="text-gray-400 w-16 text-right">{dia.km.toFixed(1)} km</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between py-3 px-3 mt-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                      <span className="text-sm font-bold text-gray-900">TOTAL A LIQUIDAR</span>
                      <span className="text-lg font-bold text-emerald-600 tabular-nums">{fmtCur(liquidacion.totalIngresos)}</span>
                    </div>
                  </CardContent>
                </Card>
                {liquidacion.tieneSesionesCerradas ? (
                  <Button onClick={() => setShowConfirm(true)} disabled={liquidarMutation.isPending}
                    className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base flex items-center justify-center gap-2">
                    <DollarSign className="w-5 h-5" />Liquidar semana — {fmtCur(liquidacion.totalIngresos)}
                  </Button>
                ) : (
                  <div className="w-full h-12 rounded-xl bg-gray-100 dark:bg-neutral-800 flex items-center justify-center text-sm text-gray-500 font-medium">
                    {liquidacion.tieneSesionActiva ? 'Sesión en curso — cierra el turno para liquidar' : 'Sin sesiones pendientes esta semana'}
                  </div>
                )}
                {settleResult?.liquidado && (
                  <Card className="border-0 shadow-sm dark:bg-neutral-900/80 rounded-2xl"><CardContent className="p-5 text-center"><CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" /><p className="text-lg font-bold">{settleResult.sesiones} sesiones liquidadas por {fmtCur(settleResult.total)}</p></CardContent></Card>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* MODAL */}
      {showConfirm && liquidacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-neutral-800"><h3 className="text-lg font-bold">Confirmar liquidación</h3></div>
            <div className="p-6 space-y-4">
              <div><p className="text-sm text-gray-500">Conductor</p><p className="text-base font-semibold">{selectedDriver?.nombre}</p></div>
              <div><p className="text-sm text-gray-500">Período</p><p className="text-sm">{fmtDateFull(liquidacion.semanaInicio)} → {fmtDateFull(liquidacion.semanaFin)}</p></div>
              <div className="border-t border-gray-100 dark:border-neutral-800 pt-3">
                {liquidacion.dias.filter(d => d.ingresosPendientes > 0).map(dia => (
                  <div key={dia.fecha} className="flex justify-between py-1.5 text-sm">
                    <span className="text-gray-600 capitalize">{dia.diaSemana}</span>
                    <span className="font-semibold text-emerald-600 tabular-nums">{fmtCur(dia.ingresosPendientes)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 dark:border-neutral-800 pt-3 flex justify-between items-center">
                <span className="text-base font-bold">Total a pagar</span>
                <span className="text-2xl font-bold text-emerald-600 tabular-nums">{fmtCur(liquidacion.totalIngresos)}</span>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-neutral-800/50 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowConfirm(false)} className="rounded-xl">Cancelar</Button>
              <Button onClick={handleLiquidar} disabled={liquidarMutation.isPending} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6">
                {liquidarMutation.isPending ? 'Liquidando...' : 'Confirmar liquidación'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
