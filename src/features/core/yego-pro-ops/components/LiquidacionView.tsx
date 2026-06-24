import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { yegoProOpsService, type LiquidacionSemanalResponse, type ListaConductoresResponse, type FacturacionSemanal } from '../../../../services/yego-pro-ops-service'
import type { SharedProOpsState } from '../yego-pro-ops.module'
import { useAuth } from '../../../../shared/hooks/useAuth'
import { Button } from '../../../../components/ui/button'
import { Phone, Hash, ChevronRight, ChevronDown, ChevronUp, Calendar } from 'lucide-react'
import { cn } from '../../../../utils/cn'

function getInitials(name: string): string { return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') }
function fmtCur(v: number): string { return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(v).replace('PEN', 'S/') }
function fmtDateFull(iso: string): string { return new Date(iso + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }) }
function fmtPercent(v: number): string { return (v * 100).toFixed(0) + '%' }

function DriverAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  return avatarUrl ? <img src={avatarUrl} alt={name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
    : <div className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center font-bold flex-shrink-0 text-xs">{getInitials(name)}</div>
}

export function LiquidacionView({ shared }: { shared: SharedProOpsState }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [weekOffset, setWeekOffset] = useState(0)
  const [expandedSettled, setExpandedSettled] = useState<Set<string>>(new Set())
  const [showBonificacionModal, setShowBonificacionModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [bonificacionMonto, setBonificacionMonto] = useState('')
  const { driver: selectedDriver, setDriver } = shared

  const liquidarSemanaMutation = useMutation({
    mutationFn: (facturacion: FacturacionSemanal) => yegoProOpsService.registrarFacturacionSemanal(facturacion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pro-ops', 'liquidacion-semanal'] })
      queryClient.invalidateQueries({ queryKey: ['pro-ops', 'liquidacion-pendiente'] })
    },
  })

  const { data: driversData } = useQuery<ListaConductoresResponse>({
    queryKey: ['pro-ops', 'drivers'],
    queryFn: () => yegoProOpsService.obtenerListaConductores(),
  })

  const filteredDrivers = useMemo(() =>
    (driversData?.conductores ?? []).filter(d => {
      const q = searchTerm.toLowerCase()
      return d.nombre.toLowerCase().includes(q) || d.telefono?.includes(q) || d.driverId.toLowerCase().includes(q)
    }), [driversData, searchTerm])

  const weekStart = useMemo(() => {
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + weekOffset * 7)
    monday.setHours(0, 0, 0, 0)
    return monday.toISOString().split('T')[0]
  }, [weekOffset])

  const { data: liquidacion, isLoading } = useQuery<LiquidacionSemanalResponse>({
    queryKey: ['pro-ops', 'liquidacion-semanal', selectedDriver?.driverId, weekStart],
    queryFn: () => yegoProOpsService.getLiquidacionSemanal(selectedDriver?.driverId ?? '', weekStart),
    enabled: !!selectedDriver?.driverId,
    staleTime: 0,
  })

  const weekEnd = useMemo(() => {
    const monday = new Date(weekStart + 'T00:00:00')
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return sunday.toISOString().split('T')[0]
  }, [weekStart])

  const toggleSettled = (week: string) => setExpandedSettled(prev => { const n = new Set(prev); if (n.has(week)) n.delete(week); else n.add(week); return n })

  const handleLiquidarSemana = () => {
    if (!liquidacion || !selectedDriver) return
    setShowConfirmModal(true)
  }

  const handleConfirmarLiquidacion = () => {
    if (!liquidacion || !selectedDriver) return
    const sesiones = liquidacion.sesionesDetalle ?? []
    const horas = sesiones.reduce((sum, s) => {
      if (!s.inicio || !s.fin) return sum
      return sum + (new Date(s.fin).getTime() - new Date(s.inicio).getTime()) / 3600000
    }, 0)
    const diasUnicos = new Set(sesiones.map(s => s.inicio?.substring(0, 10)).filter(Boolean)).size
    const payload: FacturacionSemanal = {
      driverId: selectedDriver.driverId,
      fechaInicio: weekStart,
      fechaFin: weekEnd,
      totalViajes: liquidacion.totalViajes,
      viajesValidos: liquidacion.totalViajes,
      horasTrabajo: Math.round(horas * 100) / 100,
      montoTotalProducido: liquidacion.montoTotalProducido,
      comisionApp: liquidacion.comisionApp,
      montoNeto: liquidacion.montoNeto,
      kmRecorrido: liquidacion.kmRecorrido,
      gastoCombustible: liquidacion.gastoCombustible ?? 0,
      bonoYango: liquidacion.bonoYango,
      gastoMantenimiento: liquidacion.gastoMantenimiento,
      produccionBonificable: liquidacion.produccionBonificable,
      bonoAdicViajes: liquidacion.bonoAdicViajes,
      bono: liquidacion.bono,
      porcentajePago: liquidacion.porcentajePago,
      pago: liquidacion.pago,
      pagoTotal: liquidacion.pagoTotal,
      utilidad: liquidacion.pagoTotal,
      utilidadPorViaje: liquidacion.utilidadPorViaje,
      pagoPorViaje: liquidacion.pagoPorViaje,
      diasTrabajados: diasUnicos,
      diasLiquidados: diasUnicos,
      turno: 'general',
      estado: 'liquidado',
      userId: user?.id ?? 0,
    }
    setShowConfirmModal(false)
    liquidarSemanaMutation.mutate(payload)
  }

  return (
    <div className="flex h-[calc(100vh-180px)] bg-white dark:bg-neutral-950 rounded-xl overflow-hidden border border-gray-200 dark:border-neutral-800 shadow-sm">
      <div className="w-[280px] flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <div className="bg-red-600 px-4 py-3.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white font-medium text-sm">Liquidación</span>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white text-red-600 text-xs font-bold">{driversData?.conductores?.length ?? 0}</span>
          </div>
          <p className="text-red-200 text-[11px]">Selecciona un conductor</p>
        </div>
        <div className="px-3 py-2.5">
          <input type="text" placeholder="Buscar nombre, teléfono o ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-red-500" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredDrivers.map(driver => (
            <button key={driver.driverId} onClick={() => setDriver(driver)}
              className={cn('w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors', selectedDriver?.driverId === driver.driverId ? 'bg-red-50 dark:bg-red-950/30 border-l-[3px] border-l-red-600' : 'border-l-[3px] border-l-transparent hover:bg-gray-50 dark:hover:bg-neutral-800/30')}>
              <div className="relative"><DriverAvatar name={driver.nombre} avatarUrl={driver.avatarUrl} /><span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-950" /></div>
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{driver.nombre}</p><div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5"><Phone className="w-3 h-3" /><span>{driver.telefono}</span></div></div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!selectedDriver ? (
          <div className="h-full flex items-center justify-center text-gray-400"><p className="text-sm font-medium">Selecciona un conductor</p></div>
        ) : isLoading ? (
          <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" /></div>
        ) : liquidacion ? (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <DriverAvatar name={selectedDriver.nombre} avatarUrl={selectedDriver.avatarUrl} />
                <div>
                  <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">{selectedDriver.nombre}</h2>
                  <div className="flex items-center gap-3 text-sm text-gray-400"><span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{selectedDriver.telefono}</span><span className="text-gray-300">|</span><span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" />ID {selectedDriver.driverId}</span></div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-6">
              <Button size="sm" variant="ghost" onClick={() => setWeekOffset(w => w - 1)} className="h-7 text-xs rounded-lg"><ChevronDown className="w-4 h-4 rotate-90" /></Button>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{fmtDateFull(weekStart)} → {fmtDateFull(weekEnd)}</span>
              <Button size="sm" variant="ghost" onClick={() => setWeekOffset(w => w + 1)} className="h-7 text-xs rounded-lg"><ChevronDown className="w-4 h-4 -rotate-90" /></Button>
              <Button size="sm" variant="ghost" onClick={() => setWeekOffset(0)} className="h-7 text-xs text-gray-400 rounded-lg">Hoy</Button>
            </div>

            {/* WEEK BREAKDOWN */}
            <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 overflow-hidden mb-6 bg-white dark:bg-neutral-950 shadow-sm">
              <div className="px-5 py-4 bg-gray-50 dark:bg-neutral-900/50 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">Semana · {liquidacion.totalSesiones} sesiones · {liquidacion.totalViajes} viajes</span>
                {liquidacion.tieneSesionesCerradas && <span className="text-[10px] font-bold px-2 py-1 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-600">Pendiente</span>}
                {!liquidacion.tieneSesionesCerradas && liquidacion.totalSesiones > 0 && <span className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600">Liquidado</span>}
                {liquidacion.totalSesiones === 0 && <span className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 dark:bg-neutral-800 text-gray-500">Sin actividad</span>}
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-5 gap-3">
                  <div className="rounded-xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase">Viajes</span>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{liquidacion.totalViajes}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase">Producido</span>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{fmtCur(liquidacion.montoTotalProducido)}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
                    <span className="text-[10px] font-semibold text-emerald-600 uppercase">Neto</span>
                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{fmtCur(liquidacion.montoNeto)}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
                    <span className="text-[10px] font-semibold text-emerald-600 uppercase">A Pagar</span>
                    <p className="text-xl font-bold text-emerald-600">{fmtCur(liquidacion.pagoTotal)}</p>
                  </div>
                  <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-3">
                    <span className="text-[10px] font-semibold text-blue-600 uppercase">A Pagar Final</span>
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{liquidacion.semanaCerrada && liquidacion.pagoTotalFinal != null ? fmtCur(liquidacion.pagoTotalFinal) : fmtCur(liquidacion.pagoTotal)}</p>
                    {liquidacion.semanaCerrada && liquidacion.bonificacionEmpresa != null && liquidacion.bonificacionEmpresa > 0 && <p className="text-[10px] text-blue-500 mt-0.5">- {fmtCur(liquidacion.bonificacionEmpresa)} bonif.</p>}
                  </div>
                </div>

                {/* TRAZABILIDAD DEL CÁLCULO */}
                <div className="border border-gray-200 dark:border-neutral-800 rounded-xl p-3 bg-gray-50/50 dark:bg-neutral-900/30 mb-4">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-3 text-center">Trazabilidad del cálculo</p>
                  
                  <div className="flex items-center justify-center gap-1.5 mb-2 overflow-x-auto">
                    <Caja label="PRODUCIDO" value={fmtCur(liquidacion.montoTotalProducido)} color="gray" />
                    <Flecha />
                    <Caja label="- COMISIÓN" value={fmtCur(liquidacion.comisionApp)} color="red" />
                    <Flecha />
                    <Caja label="NETO" value={fmtCur(liquidacion.montoNeto)} color="gray" />
                    <Flecha />
                    <Caja label="+ B YANGO" value={fmtCur(liquidacion.bonoYango)} color="green" />
                    <Flecha />
                    <Caja label="- COMBUSTIBLE" value={fmtCur(liquidacion.gastoCombustible)} color="red" />
                    <Flecha />
                    <Caja label="- GTO MANT" value={fmtCur(liquidacion.gastoMantenimiento)} color="red" />
                    <Flecha />
                    <Caja label="PROD BONIF" value={fmtCur(liquidacion.produccionBonificable)} color="emerald" />
                  </div>
                  
                  <div className="flex justify-center mb-1.5">
                    <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                  </div>
                  
                  <div className="flex items-center justify-center gap-1.5 overflow-x-auto">
                    <Caja label="- BONO AD" value={fmtCur(liquidacion.bonoAdicViajes)} color="red" />
                    <Flecha />
                    <Caja label="BONO" value={fmtCur(liquidacion.bono)} color="gray" />
                    <Flecha />
                    <Caja label="× % PAGO" value={(liquidacion.porcentajePago * 100).toFixed(0) + '%'} color="blue" />
                    <Flecha />
                    <Caja label="PAGO" value={fmtCur(liquidacion.pago)} color="gray" />
                    <Flecha />
                    <Caja label="+ BONO AD" value={fmtCur(liquidacion.bonoAdicViajes)} color="green" />
                    <Flecha />
                    <Caja label="PAGO TOTAL" value={fmtCur(liquidacion.pagoTotal)} color="gray" />
                  </div>

                  {liquidacion.semanaCerrada && liquidacion.bonificacionEmpresa != null && liquidacion.bonificacionEmpresa > 0 && (
                    <>
                      <div className="flex justify-center my-1.5">
                        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 overflow-x-auto">
                        <Caja label="- BONIF EMPRESA" value={fmtCur(liquidacion.bonificacionEmpresa)} color="red" />
                        <Flecha />
                        <Caja label="PAGO FINAL" value={fmtCur(liquidacion.pagoTotalFinal)} color="emerald" big />
                      </div>
                    </>
                  )}
                  {liquidacion.totalAdelantos != null && liquidacion.totalAdelantos > 0 && (
                    <>
                      <div className="flex justify-center my-1.5">
                        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 overflow-x-auto">
                        <Caja label="- ADELANTOS" value={fmtCur(liquidacion.totalAdelantos)} color="red" />
                        <Flecha />
                        <Caja label="PAGO FINAL" value={fmtCur(liquidacion.pagoTotalConAdelantos ?? liquidacion.pagoTotal)} color="emerald" big />
                      </div>
                    </>
                  )}
                </div>

                {liquidacion.sesionesDetalle?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Sesiones de la semana</p>
                    <div className="space-y-1">
                      {liquidacion.sesionesDetalle.map(ses => (
                        <div key={ses.sessionId} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-gray-50 dark:bg-neutral-800/30 text-xs">
                          <span className="text-gray-600 dark:text-gray-300">{ses.inicio?.substring(0, 16) ?? '···'} → {ses.fin?.substring(0, 16) ?? '···'}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-500">{ses.viajes}v</span>
                            <span className="text-gray-500">Efec: <span className="font-semibold text-emerald-600">{fmtCur(ses.efectivo ?? ses.ingresos)}</span></span>
                            <span className="text-gray-500">Prod: <span className="font-semibold text-gray-900 dark:text-gray-100">{fmtCur(ses.montoTotalProducido ?? 0)}</span></span>
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', ses.status === 'settled' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600')}>{ses.status === 'settled' ? '✓' : '⏳'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {liquidacion.tieneSesionesCerradas && !liquidacion.semanaCerrada ? (
                <div className="px-5 py-4 border-t border-gray-100 dark:border-neutral-800">
                  <Button onClick={handleLiquidarSemana} disabled={liquidarSemanaMutation.isPending} className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm shadow-emerald-200">
                    {liquidarSemanaMutation.isPending ? 'Liquidando...' : `Liquidar semana — ${fmtCur(liquidacion.pagoTotal)}`}
                  </Button>
                </div>
              ) : liquidacion.semanaCerrada && (
                <div className="px-5 py-4 border-t border-gray-100 dark:border-neutral-800">
                  <div className="w-full h-11 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 flex items-center justify-center text-sm font-medium text-red-600">
                    Esta semana ya fue liquidada
                  </div>
                </div>
              )}
            </div>

            {/* SETTLED WEEKS NAVIGATION */}
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Semanas anteriores</p>
            <div className="text-sm text-gray-400 py-4 text-center">Navega con ← → para ver semanas anteriores</div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400"><p className="text-sm">Sin datos disponibles</p></div>
        )}
      </div>

      {showBonificacionModal && liquidacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowBonificacionModal(false)}>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Bonificación de la empresa</h3>
            <p className="text-sm text-gray-400 mb-4">Ingresa el monto que la empresa bonifica al conductor</p>
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">A Pagar original: <span className="font-bold text-gray-900 dark:text-gray-100">{fmtCur(liquidacion.pagoTotal)}</span></p>
            </div>
            <div className="mb-4">
              <label className="text-[10px] font-medium text-gray-500 uppercase">Bonificación empresa (S/)</label>
              <input type="number" min="0" step="0.01" value={bonificacionMonto} onChange={e => setBonificacionMonto(e.target.value)} placeholder="0.00"
                className="w-full text-sm border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 mt-1 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-red-500" />
              {parseFloat(bonificacionMonto) > liquidacion.pagoTotal && (
                <p className="text-[11px] text-red-500 mt-1">No puede ser mayor a {fmtCur(liquidacion.pagoTotal)}</p>
              )}
            </div>
            <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-neutral-800/50">
              <p className="text-xs text-gray-500">A Pagar final: <span className="font-bold text-emerald-600">{fmtCur(liquidacion.pagoTotal - (parseFloat(bonificacionMonto) || 0))}</span></p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowBonificacionModal(false)} className="rounded-xl text-sm">Cancelar</Button>
              <Button onClick={handleConfirmarLiquidacion} disabled={liquidarSemanaMutation.isPending || (parseFloat(bonificacionMonto) || 0) > liquidacion.pagoTotal || (parseFloat(bonificacionMonto) || 0) < 0} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-5">
                {liquidarSemanaMutation.isPending ? 'Liquidando...' : 'Liquidar semana'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && liquidacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowConfirmModal(false)}>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Cerrar semana</h3>
            <p className="text-sm text-gray-400 mb-4">¿Estás seguro de cerrar la semana del {fmtDateFull(weekStart)} al {fmtDateFull(weekEnd)}?</p>
            <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-neutral-800/50 space-y-1">
              <p className="text-xs text-gray-500">{liquidacion.totalSesiones} sesiones · {liquidacion.totalViajes} viajes</p>
              <p className="text-xs font-bold text-gray-900 dark:text-gray-100">Pago total: {fmtCur(liquidacion.pagoTotal)}</p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowConfirmModal(false)} className="rounded-xl text-sm">Cancelar</Button>
              <Button onClick={handleConfirmarLiquidacion} disabled={liquidarSemanaMutation.isPending} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-5">
                {liquidarSemanaMutation.isPending ? 'Liquidando...' : 'Cerrar semana'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Caja({ label, value, color, big }: { label: string; value: string; color: string; big?: boolean }) {
  const colorCls = color === 'red' ? 'text-red-500' : color === 'green' ? 'text-emerald-500' : color === 'blue' ? 'text-blue-500' : color === 'emerald' ? 'text-emerald-600' : 'text-gray-700 dark:text-gray-200'
  return <div className={cn('rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1.5 text-center min-w-[64px]', big && 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20')}>
    <p className="text-[9px] font-semibold text-gray-400 uppercase leading-tight">{label}</p>
    <p className={cn(big ? 'text-xs' : 'text-[11px]', 'font-bold', colorCls)}>{value}</p>
  </div>
}
function Flecha() {
  return <span className="text-gray-300 dark:text-gray-600 text-xs flex-shrink-0">→</span>
}
