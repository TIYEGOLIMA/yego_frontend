import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  yegoProOpsService,
  type ResumenSemanalResponse,
  type ConductorSemanalInfo,
  type FacturacionSemanal,
  type BillingConfigResponse,
  type BonusThreshold,
  type PaymentPercentage,
} from '../../../../services/yego-pro-ops-service'
import { useAuth } from '../../../../shared/hooks/useAuth'
import { Card, CardContent } from '../../../../components/ui/card'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs'
import {
  User, ChevronLeft, ChevronRight, Calendar, RefreshCw, Search,
  AlertCircle, Calculator, Table2, Save, History, Settings, Plus, Trash2,
} from 'lucide-react'
import { cn } from '../../../../utils/cn'

const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const formatBalance = (v: number): string =>
  `S/. ${new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}`

const formatNumber = (v: number, decimals = 2): string =>
  new Intl.NumberFormat('es-PE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(v)

const obtenerLunesSemana = (f: Date): Date => {
  const d = new Date(f)
  const dia = d.getDay()
  d.setDate(d.getDate() + (dia === 0 ? -6 : 1 - dia))
  d.setHours(0, 0, 0, 0)
  return d
}

const formatearFechaYMD = (f: Date): string =>
  `${f.getFullYear()}-${(f.getMonth() + 1).toString().padStart(2, '0')}-${f.getDate().toString().padStart(2, '0')}`

const formatearFechaLegible = (f: Date): string =>
  f.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })

export const FacturacionSemanalView = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [showConfirmPago, setShowConfirmPago] = useState<ConductorSemanalInfo | null>(null)
  const [conductorExpandido, setConductorExpandido] = useState<string | null>(null)
  const [vista, setVista] = useState<'resumen' | 'calculos' | 'config'>('calculos')
  const [searchTerm, setSearchTerm] = useState('')

  const lunesSemana = useMemo(() => {
    const lunes = obtenerLunesSemana(new Date())
    lunes.setDate(lunes.getDate() + semanaOffset * 7)
    return lunes
  }, [semanaOffset])

  const domingoSemana = new Date(lunesSemana)
  domingoSemana.setDate(lunesSemana.getDate() + 6)

  const diasSemana = useMemo(() => {
    const dias: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(lunesSemana)
      d.setDate(lunesSemana.getDate() + i)
      dias.push(d)
    }
    return dias
  }, [lunesSemana])

  const fechaInicio = formatearFechaYMD(lunesSemana)
  const fechaFin = formatearFechaYMD(domingoSemana)
  const semanaFutura = lunesSemana > new Date()

  const { data, isLoading, error, refetch } = useQuery<ResumenSemanalResponse>({
    queryKey: ['yego-pro-ops-resumen-semanal', fechaInicio, fechaFin],
    queryFn: () => yegoProOpsService.obtenerResumenSemanal(fechaInicio, fechaFin),
    enabled: !semanaFutura,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  })

  const saveMutation = useMutation({
    mutationFn: (facturacion: FacturacionSemanal) =>
      yegoProOpsService.registrarFacturacionSemanal(facturacion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yego-pro-ops-resumen-semanal'] })
    },
  })

  const handleGuardarFacturacion = (conductor: ConductorSemanalInfo) => {
    const payload: FacturacionSemanal = {
      driverId: conductor.driver_id,
      fechaInicio,
      fechaFin,
      totalViajes: conductor.total_viajes,
      viajesValidos: conductor.viajes_validos,
      horasTrabajo: conductor.horas_trabajo,
      montoTotalProducido: conductor.monto_total_producido,
      comisionApp: conductor.comision_app,
      montoNeto: conductor.monto_neto,
      kmRecorrido: conductor.km_recorrido,
      gastoCombustible: conductor.gasto_combustible,
      bonoYango: conductor.bono_yango,
      gastoMantenimiento: conductor.gasto_mantenimiento,
      produccionBonificable: conductor.produccion_bonificable,
      bonoAdicViajes: conductor.bono_adic_viajes,
      bono: conductor.bono,
      porcentajePago: conductor.porcentaje_pago,
      pago: conductor.pago,
      pagoTotal: conductor.pago_total,
      utilidad: conductor.utilidad,
      utilidadPorViaje: conductor.utilidad_por_viaje,
      pagoPorViaje: conductor.pago_por_viaje,
      diasTrabajados: conductor.dias_trabajados,
      diasLiquidados: conductor.dias_liquidados,
      turno: conductor.turno,
      userId: user?.id,
      bonificacion: bonificacion ? Number(bonificacion) : undefined,
      garantia: garantia ? Number(garantia) : undefined,
      descuento: descuento ? Number(descuento) : undefined,
      general: general || undefined,
    }
    saveMutation.mutate(payload)
    setBonificacion('')
    setGarantia('')
    setDescuento('')
    setGeneral('')
  }


  const { data: config } = useQuery<BillingConfigResponse>({
    queryKey: ['yego-pro-ops-config-billing'],
    queryFn: () => yegoProOpsService.obtenerConfigBilling(),
    staleTime: 5 * 60 * 1000,
  })

  const [editBonos, setEditBonos] = useState<BonusThreshold[]>([])
  const [editPcts, setEditPcts] = useState<PaymentPercentage[]>([])
  const [configDirty, setConfigDirty] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'bono' | 'pct'; index: number } | null>(null)
  const [bonificacion, setBonificacion] = useState('')
  const [garantia, setGarantia] = useState('')
  const [descuento, setDescuento] = useState('')
  const [general, setGeneral] = useState('')
  const [exportando, setExportando] = useState(false)

  const iniciarEdicionConfig = () => {
    if (!config) return
    setEditBonos(JSON.parse(JSON.stringify(config.bonus_thresholds)))
    setEditPcts(JSON.parse(JSON.stringify(config.payment_percentages)))
    setConfigDirty(true)
  }

  const cancelarEdicionConfig = () => {
    setEditBonos([])
    setEditPcts([])
    setConfigDirty(false)
  }

  const saveConfigMutation = useMutation({
    mutationFn: (cfg: BillingConfigResponse) =>
      yegoProOpsService.guardarConfigBilling(cfg, user?.id ?? 0),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yego-pro-ops-config-billing'] })
      setConfigDirty(false)
    },
  })

  const handleGuardarConfig = () => {
    saveConfigMutation.mutate({
      bonus_thresholds: editBonos,
      payment_percentages: editPcts,
    })
  }

  const semAnterior = () => setSemanaOffset((s) => s - 1)
  const semSiguiente = () => {
    const sig = new Date(lunesSemana)
    sig.setDate(sig.getDate() + 7)
    if (sig <= new Date()) setSemanaOffset((s) => s + 1)
  }
  const semActual = () => setSemanaOffset(0)
  const puedeAvanzar = (() => {
    const sig = new Date(lunesSemana)
    sig.setDate(sig.getDate() + 7)
    return sig <= new Date()
  })()

  const conductorExpandidoData = useMemo(
    () => data?.conductores.find((c) => c.driver_id === conductorExpandido) ?? null,
    [data, conductorExpandido],
  )

  const conductoresFiltrados = useMemo(() => {
    if (!data) return []
    if (!searchTerm.trim()) return data.conductores
    const term = searchTerm.toLowerCase().trim()
    return data.conductores.filter(c =>
      (c.nombre || c.driver_id).toLowerCase().includes(term) ||
      (c.placa || '').toLowerCase().includes(term)
    )
  }, [data, searchTerm])

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          {/* ── Selector de semana compacto ── */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={semAnterior} className="h-8 w-8 p-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatearFechaLegible(lunesSemana)} — {formatearFechaLegible(domingoSemana)}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={semSiguiente} disabled={!puedeAvanzar} className="h-8 w-8 p-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
              {semanaOffset !== 0 && (
                <Button variant="outline" size="sm" onClick={semActual} className="h-7 text-xs">Hoy</Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-7 w-7 p-0" title="Refrescar datos">
                <RefreshCw className="h-3.5 w-3.5 text-gray-500" />
              </Button>
            </div>
          </div>

          {/* ── KPIs ── */}
          {data && (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2 text-center">
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Conductores</p>
                <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{data.total_conductores}</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg px-3 py-2 text-center">
                <p className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">Viajes</p>
                <p className="text-sm font-bold text-purple-700 dark:text-purple-300">{data.total_viajes}</p>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg px-3 py-2 text-center">
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">Producción</p>
                <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{formatBalance(data.total_produccion)}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-center">
                <p className="text-[10px] text-red-600 dark:text-red-400 font-medium">Total a pagar</p>
                <p className="text-sm font-bold text-red-700 dark:text-red-300">{formatBalance(data.total_pagar)}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2 text-center">
                <p className="text-[10px] text-green-600 dark:text-green-400 font-medium">Total pagado</p>
                <p className="text-sm font-bold text-green-700 dark:text-green-300">{formatBalance(data.total_pagado)}</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-2 text-center">
                <p className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">Pendiente</p>
                <p className="text-sm font-bold text-orange-700 dark:text-orange-300">{formatBalance(data.total_pendiente)}</p>
              </div>
            </div>
          )}

          {/* ── Estados ── */}
          {semanaFutura ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Esta semana aún no ha comenzado</p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-red-600" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600 text-sm">Error al cargar los datos</div>
          ) : !data || data.conductores.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">Sin datos para esta semana</div>
          ) : (
            <>
              {/* ── Tabs compactos ── */}
              <Tabs value={vista} onValueChange={(v) => setVista(v as typeof vista)}>
                <div className="flex items-center gap-3 mb-2">
                  <TabsList className="bg-gray-100 dark:bg-gray-800 p-0.5 rounded-md h-auto">
                    <TabsTrigger value="calculos" className="flex items-center gap-1 text-[11px] px-2.5 py-1 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 rounded-sm">
                      <Calculator className="w-3 h-3" />
                      Cálculo Semanal
                    </TabsTrigger>
                    <TabsTrigger value="resumen" className="flex items-center gap-1 text-[11px] px-2.5 py-1 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 rounded-sm">
                      <Table2 className="w-3 h-3" />
                      Resumen por Día
                    </TabsTrigger>
                    <TabsTrigger value="config" className="flex items-center gap-1 text-[11px] px-2.5 py-1 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 rounded-sm">
                      <Settings className="w-3 h-3" />
                      Config
                    </TabsTrigger>
                  </TabsList>
                  {(vista === 'calculos' || vista === 'resumen') && (
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                      <Input
                        type="text"
                        placeholder="Buscar conductor o placa..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setConductorExpandido(null) }}
                        className="pl-7 h-7 text-xs w-44"
                      />
                    </div>
                  )}
                  <Button variant="outline" size="sm" disabled={exportando}
                    onClick={async () => {
                      setExportando(true)
                      try {
                        await yegoProOpsService.exportarAsistenciaExcel(fechaInicio, fechaFin)
                      } finally {
                        setExportando(false)
                      }
                    }}
                    className="h-7 text-xs gap-1 ml-auto">
                    {exportando ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-gray-400 border-t-transparent" />
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                    {exportando ? 'Cargando...' : 'Excel'}
                  </Button>
                </div>

                {/* ── Vista Cálculo Semanal ── */}
                <TabsContent value="calculos" className="mt-0">
                  <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-md">
                    <Table className="text-[11px]">
                      <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                          <TableHead className="sticky left-0 bg-gray-50 dark:bg-gray-800/50 z-10 min-w-[170px] py-1.5">Conductor</TableHead>
                          <TableHead className="text-center py-1.5 w-10">Días</TableHead>
                          <TableHead className="text-center py-1.5 w-14">Tipo Turno</TableHead>
                          <TableHead className="text-right py-1.5">Viajes</TableHead>
                          <TableHead className="text-right py-1.5">Horas</TableHead>
                          <TableHead className="text-right py-1.5">Viajes/Hr</TableHead>
                          <TableHead className="text-right py-1.5">Producción</TableHead>
                          <TableHead className="text-right py-1.5">Comisión</TableHead>
                          <TableHead className="text-right py-1.5">Neto</TableHead>
                          <TableHead className="text-right py-1.5">KM</TableHead>
                          <TableHead className="text-right py-1.5">Combustible</TableHead>
                          <TableHead className="text-right py-1.5">Bono Yango</TableHead>
                          <TableHead className="text-right py-1.5">Mantenim.</TableHead>
                          <TableHead className="text-right py-1.5">Prod. Bonif.</TableHead>
                          <TableHead className="text-right py-1.5">Bono Adic.</TableHead>
                          <TableHead className="text-right py-1.5">Bono</TableHead>
                          <TableHead className="text-right py-1.5">% Pago</TableHead>
                          <TableHead className="text-right py-1.5">Pago</TableHead>
                          <TableHead className="text-right py-1.5 font-bold">Pago Total</TableHead>
                          <TableHead className="text-right py-1.5">Utilidad</TableHead>
                          <TableHead className="text-right py-1.5">Util./Viaje</TableHead>
                          <TableHead className="text-center py-1.5 w-28">Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {conductoresFiltrados.map((c) => {
                          const expanded = conductorExpandido === c.driver_id

                          return (
                            <>
                              <TableRow
                                key={c.driver_id}
                                className={cn('cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50', expanded && 'bg-blue-50/50 dark:bg-blue-900/10')}
                                onClick={() => setConductorExpandido(expanded ? null : c.driver_id)}
                              >
                                <TableCell className="sticky left-0 bg-white dark:bg-gray-900 z-10 py-1">
                                  <div className="flex items-center gap-1.5">
                                    {c.avatar_url ? (
                                      <img src={c.avatar_url} alt={c.nombre} className="w-5 h-5 rounded-full object-cover border flex-shrink-0"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden') }} />
                                    ) : null}
                                    <div className={`w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 ${c.avatar_url ? 'hidden' : ''}`}>
                                      <User className="w-3 h-3 text-gray-400" />
                                    </div>
                                    <span className="truncate max-w-[130px]" title={c.nombre || c.driver_id}>
                                      {c.nombre || c.driver_id}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center py-1">{c.dias_trabajados}</TableCell>
                                <TableCell className="text-center py-1">
                                  <Badge variant="outline" className={cn('text-[10px] px-1 py-0',
                                    c.turno === 'diurno' ? 'border-amber-300 text-amber-700 bg-amber-50' :
                                    c.turno === 'nocturno' ? 'border-indigo-300 text-indigo-700 bg-indigo-50' : 'border-gray-300 text-gray-600')}
                                    title={c.turno === 'diurno' ? 'Diurno' : c.turno === 'nocturno' ? 'Nocturno' : 'Mixto'}>
                                    {c.turno === 'diurno' ? 'D' : c.turno === 'nocturno' ? 'N' : c.turno}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right py-1 font-medium">{c.total_viajes}</TableCell>
                                <TableCell className="text-right py-1">{formatNumber(c.horas_trabajo, 1)}</TableCell>
                                <TableCell className="text-right py-1">{formatNumber(c.tph, 2)}</TableCell>
                                <TableCell className="text-right py-1">{formatNumber(c.monto_total_producido)}</TableCell>
                                <TableCell className="text-right py-1 text-rose-600">{formatNumber(c.comision_app)}</TableCell>
                                <TableCell className="text-right py-1 font-medium">{formatNumber(c.monto_neto)}</TableCell>
                                <TableCell className="text-right py-1">{c.km_recorrido > 0 ? formatNumber(c.km_recorrido, 0) : '—'}</TableCell>
                                <TableCell className="text-right py-1 text-amber-600">{c.gasto_combustible > 0 ? formatNumber(c.gasto_combustible) : '—'}</TableCell>
                                <TableCell className="text-right py-1 text-blue-600">{c.bono_yango > 0 ? formatNumber(c.bono_yango) : (c.bono_yango < 0 ? formatNumber(c.bono_yango) : '—')}</TableCell>
                                <TableCell className="text-right py-1 text-gray-500">{c.gasto_mantenimiento > 0 ? formatNumber(c.gasto_mantenimiento) : '—'}</TableCell>
                                <TableCell className="text-right py-1 font-medium">{formatNumber(c.produccion_bonificable)}</TableCell>
                                <TableCell className="text-right py-1 text-green-600">{c.bono_adic_viajes > 0 ? formatNumber(c.bono_adic_viajes) : '—'}</TableCell>
                                <TableCell className="text-right py-1 font-medium">{formatNumber(c.bono)}</TableCell>
                                <TableCell className="text-right py-1">{(c.porcentaje_pago * 100).toFixed(0)}%</TableCell>
                                <TableCell className="text-right py-1">{formatNumber(c.pago)}</TableCell>
                                <TableCell className="text-right py-1 font-bold text-red-600">{formatBalance(c.pago_total)}</TableCell>
                                <TableCell className={cn('text-right py-1 font-medium', c.utilidad >= 0 ? 'text-green-600' : 'text-red-600')}>
                                  {formatNumber(c.utilidad)}
                                </TableCell>
                                <TableCell className={cn('text-right py-1', c.utilidad_por_viaje >= 0 ? 'text-green-600' : 'text-red-600')}>
                                  {formatNumber(c.utilidad_por_viaje)}
                                </TableCell>
                                <TableCell className="text-center py-1">
                                  {c.completamente_liquidado ? (
                                    <div className="flex items-center gap-1 justify-center">
                                      <Badge className="text-[10px] bg-yellow-100 text-yellow-700 border-yellow-300 px-1.5 h-5">
                                        Pendiente
                                      </Badge>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 p-0"
                                        title="Registrar pago"
                                        onClick={(e) => { e.stopPropagation(); setBonificacion(''); setGarantia(''); setDescuento(''); setGeneral(''); setShowConfirmPago(c) }}
                                        disabled={saveMutation.isPending}
                                      >
                                        <Save className="w-3 h-3 text-gray-400 hover:text-blue-600" />
                                      </Button>
                                    </div>
                                  ) : (
                                    (() => {
                                      const diasFaltantes = c.datos_por_dia
                                        .filter(d => !d.liquidado && d.monto_total_pagar > 0)
                                        .map(d => d.dia_semana.slice(0, 3))
                                        .join(', ')
                                      return (
                                        <Badge className="text-[10px] bg-orange-100 text-orange-700 border-orange-300 px-1.5 h-5"
                                          title={diasFaltantes ? `Falta cerrar: ${diasFaltantes}` : 'Sin datos'}>
                                          Falta cierre
                                        </Badge>
                                      )
                                    })()
                                  )}
                                </TableCell>
                              </TableRow>

                              {expanded && conductorExpandidoData && (
                                <TableRow key={`${c.driver_id}-detalle`} className="bg-gray-50 dark:bg-gray-800/20">
                                  <TableCell colSpan={22} className="p-0">
                                    <div className="px-3 py-2">
                                      <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-2 flex-wrap">
                                        <span>Neto: <b className="text-gray-700">{formatBalance(conductorExpandidoData.monto_neto)}</b></span>
                                        {conductorExpandidoData.bono_yango !== 0 && (
                                          <span>+ B.Yango: <b className="text-blue-600">{formatBalance(conductorExpandidoData.bono_yango)}</b></span>
                                        )}
                                        <span>− Comb: <b className="text-amber-600">{formatBalance(conductorExpandidoData.gasto_combustible)}</b></span>
                                        <span>− Mant(15%): <b>{formatBalance(conductorExpandidoData.gasto_mantenimiento)}</b></span>
                                        <span>= Bonif: <b className="text-indigo-600">{formatBalance(conductorExpandidoData.produccion_bonificable)}</b></span>
                                        <span>− B.Adic: <b className="text-green-600">{formatBalance(conductorExpandidoData.bono_adic_viajes)}</b></span>
                                        <span>= Bono: <b>{formatBalance(conductorExpandidoData.bono)}</b></span>
                                        <span>× {(conductorExpandidoData.porcentaje_pago * 100).toFixed(0)}% = <b className="text-red-600">{formatBalance(conductorExpandidoData.pago_total)}</b></span>
                                      </div>
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-[10px] border-collapse">
                                          <thead>
                                            <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500">
                                              <th className="text-left py-1 pr-2">Día</th>
                                              <th className="text-right py-1 px-1">Viajes</th>
                                              <th className="text-right py-1 px-1">Turnos</th>
                                              <th className="text-right py-1 px-1">Producción</th>
                                              <th className="text-right py-1 px-1">Comisión</th>
                                              <th className="text-right py-1 px-1">Combustible</th>
                                              <th className="text-right py-1 px-1">KM</th>
                                              <th className="text-right py-1 px-1">A Pagar</th>
                                              <th className="text-right py-1 px-1">Pagado</th>
                                              <th className="text-right py-1 px-1">Efectivo</th>
                                              <th className="text-right py-1 px-1">Yape</th>
                                              <th className="text-center py-1 pl-1">Estado</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {conductorExpandidoData.datos_por_dia.map((dia, i) => (
                                              <tr key={i} className={cn('border-b border-gray-100 dark:border-gray-800', !dia.liquidado && dia.monto_total_pagar > 0 && 'bg-orange-50/50 dark:bg-orange-900/10')}>
                                                <td className="py-0.5 pr-2 font-medium">
                                                  {dia.dia_semana.slice(0, 3)} <span className="text-gray-400">{dia.fecha.slice(8)}/{dia.fecha.slice(5, 7)}</span>
                                                </td>
                                                <td className="text-right py-0.5 px-1">{dia.cantidad_viajes || '—'}</td>
                                                <td className="text-right py-0.5 px-1">{dia.turnos_tipo || '—'}</td>
                                                <td className="text-right py-0.5 px-1">{dia.produccion_total > 0 ? formatNumber(dia.produccion_total) : '—'}</td>
                                                <td className="text-right py-0.5 px-1 text-rose-600">{dia.comisiones_servicio !== 0 ? formatNumber(dia.comisiones_servicio) : '—'}</td>
                                                <td className="text-right py-0.5 px-1 text-amber-600">{dia.gasto_combustible > 0 ? formatNumber(dia.gasto_combustible) : '—'}</td>
                                                <td className="text-right py-0.5 px-1">{dia.km_recorrido > 0 ? formatNumber(dia.km_recorrido, 0) : '—'}</td>
                                                <td className="text-right py-0.5 px-1 font-semibold text-red-600">{formatNumber(dia.monto_total_pagar)}</td>
                                                <td className="text-right py-0.5 px-1 font-semibold text-green-600">{formatNumber(dia.monto_total_pagado)}</td>
                                                <td className="text-right py-0.5 px-1">{dia.liquida_efectivo > 0 ? formatNumber(dia.liquida_efectivo) : '—'}</td>
                                                <td className="text-right py-0.5 px-1">{dia.liquida_yape > 0 ? formatNumber(dia.liquida_yape) : '—'}</td>
                                                <td className="text-center py-0.5 pl-1">
                                                  {dia.liquidado ? (
                                                    <Badge className="text-[10px] bg-green-100 text-green-700 border-green-300 px-1 h-4">Liq.</Badge>
                                                  ) : dia.monto_total_pagar > 0 ? (
                                                    <Badge className="text-[10px] bg-orange-100 text-orange-700 border-orange-300 px-1 h-4">Pend.</Badge>
                                                  ) : (
                                                    <span className="text-gray-300">—</span>
                                                  )}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          )
                        })}

                        <TableRow className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 font-bold text-[11px]">
                          <TableCell className="sticky left-0 bg-gray-100 dark:bg-gray-800/50 z-10 py-1">Totales</TableCell>
                          <TableCell className="text-center py-1">{data.conductores.reduce((s, c) => s + c.dias_trabajados, 0)}</TableCell>
                          <TableCell className="text-center py-1">—</TableCell>
                          <TableCell className="text-right py-1">{data.total_viajes}</TableCell>
                          <TableCell className="text-right py-1">{formatNumber(data.conductores.reduce((s, c) => s + c.horas_trabajo, 0), 1)}</TableCell>
                          <TableCell className="text-right py-1">—</TableCell>
                          <TableCell className="text-right py-1">{formatNumber(data.total_produccion)}</TableCell>
                          <TableCell className="text-right py-1 text-rose-600">{formatNumber(data.total_comision)}</TableCell>
                          <TableCell className="text-right py-1">{formatNumber(data.total_produccion - data.total_comision)}</TableCell>
                          <TableCell className="text-right py-1">—</TableCell>
                          <TableCell className="text-right py-1 text-amber-600">{formatNumber(data.total_combustible)}</TableCell>
                          <TableCell className="text-right py-1 text-blue-600">{formatNumber(data.conductores.reduce((s, c) => s + (c.bono_yango ?? 0), 0))}</TableCell>
                          <TableCell className="text-right py-1">—</TableCell>
                          <TableCell className="text-right py-1">{formatNumber(data.total_bonos)}</TableCell>
                          <TableCell className="text-right py-1">—</TableCell>
                          <TableCell className="text-right py-1">{formatNumber(data.total_bonos)}</TableCell>
                          <TableCell className="text-right py-1">—</TableCell>
                          <TableCell className="text-right py-1">{formatNumber(data.total_pagar)}</TableCell>
                          <TableCell className="text-right py-1 font-bold text-red-600">{formatBalance(data.total_pagar)}</TableCell>
                          <TableCell className={cn('text-right py-1', data.total_utilidad >= 0 ? 'text-green-600' : 'text-red-600')}>{formatNumber(data.total_utilidad)}</TableCell>
                          <TableCell className="text-right py-1">—</TableCell>
                          <TableCell className="text-center py-1">{formatBalance(data.total_pendiente)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* ── Vista Resumen por Día ── */}
                <TabsContent value="resumen" className="mt-0">
                  <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-md">
                    <Table className="text-[11px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-white dark:bg-gray-900 z-10 min-w-[160px] py-1.5">Conductor</TableHead>
                          {diasSemana.map((dia, i) => (
                            <TableHead key={i} className="text-center min-w-[85px] py-1.5">
                              <div className="flex flex-col items-center leading-tight">
                                <span className="font-semibold">{DIAS_CORTOS[i]}</span>
                                <span className="text-[10px] text-gray-400">{dia.getDate()}/{dia.getMonth() + 1}</span>
                              </div>
                            </TableHead>
                          ))}
                          <TableHead className="text-right min-w-[85px] py-1.5">Total</TableHead>
                          <TableHead className="text-right min-w-[85px] py-1.5">Pagado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {conductoresFiltrados.map((c) => {
                          const mapaMonto = new Map<string, number>()
                          const mapaPagado = new Map<string, number>()
                          const mapaTurnosTipo = new Map<string, string>()
                          c.datos_por_dia.forEach((d) => {
                            mapaMonto.set(d.fecha, d.monto_total_pagar)
                            mapaPagado.set(d.fecha, d.monto_total_pagado)
                            mapaTurnosTipo.set(d.fecha, d.turnos_tipo)
                          })

                          return (
                            <TableRow key={c.driver_id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                              onClick={() => { setConductorExpandido(c.driver_id === conductorExpandido ? null : c.driver_id); setVista('calculos') }}>
                              <TableCell className="sticky left-0 bg-white dark:bg-gray-900 z-10 py-1">
                                <div className="flex items-center gap-1.5">
                                  {c.avatar_url ? <img src={c.avatar_url} alt={c.nombre} className="w-5 h-5 rounded-full object-cover border flex-shrink-0"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden') }} /> : null}
                                  <div className={`w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 ${c.avatar_url ? 'hidden' : ''}`}>
                                    <User className="w-3 h-3 text-gray-400" />
                                  </div>
                                  <span className="truncate max-w-[130px]" title={c.nombre || c.driver_id}>{c.nombre || c.driver_id}</span>
                                </div>
                              </TableCell>
                              {diasSemana.map((dia, i) => {
                                const f = formatearFechaYMD(dia)
                                const monto = mapaMonto.get(f)
                                const pagado = mapaPagado.get(f) ?? 0
                                const tipos = mapaTurnosTipo.get(f) ?? ''
                                if (monto === undefined || !tipos) {
                                  return <TableCell key={i} className="text-center py-1"><span className="text-gray-400">—</span></TableCell>
                                }
                                const liq = monto > 0 && pagado >= monto
                                return (
                                  <TableCell key={i} className="text-center py-1">
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span className={cn('text-xs font-semibold', liq ? 'text-green-600' : 'text-orange-600')}>
                                        {formatNumber(monto)}
                                      </span>
                                      <span className={cn('text-[10px]', liq ? 'text-green-500' : 'text-orange-500')}>
                                        {tipos}
                                      </span>
                                    </div>
                                  </TableCell>
                                )
                              })}
                              <TableCell className="text-right py-1 font-bold text-red-600">{formatBalance(c.pago_total)}</TableCell>
                              <TableCell className="text-right py-1 font-bold text-green-600">{formatBalance(c.total_pagado)}</TableCell>
                            </TableRow>
                          )
                        })}
                        <TableRow className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 font-bold text-[11px]">
                          <TableCell className="sticky left-0 bg-gray-100 dark:bg-gray-800/50 z-10 py-1">Totales</TableCell>
                          {diasSemana.map((dia, i) => {
                            const f = formatearFechaYMD(dia)
                            let t = 0
                            data.conductores.forEach((c) => {
                              const d = c.datos_por_dia.find((dd) => dd.fecha === f)
                              if (d) t += d.monto_total_pagar
                            })
                            return <TableCell key={i} className="text-center py-1"><span className="text-red-600">{t > 0 ? formatNumber(t) : '—'}</span></TableCell>
                          })}
                          <TableCell className="text-right py-1 text-red-600">{formatBalance(data.total_pagar)}</TableCell>
                          <TableCell className="text-right py-1 text-green-600">{formatBalance(data.total_pagado)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* ── Vista Configuración ── */}
                <TabsContent value="config" className="mt-0">
                  {!config ? (
                    <div className="text-center py-8"><div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-red-600" /></div>
                  ) : (
                    <div className="space-y-4">
                      {!configDirty ? (
                        <div className="flex justify-end">
                          <Button size="sm" variant="outline" onClick={iniciarEdicionConfig} className="text-xs h-7">
                            Editar configuración
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={cancelarEdicionConfig} className="text-xs h-7">Cancelar</Button>
                          <Button size="sm" onClick={handleGuardarConfig} disabled={saveConfigMutation.isPending} className="text-xs h-7 bg-red-600 hover:bg-red-700 text-white">
                            {saveConfigMutation.isPending ? 'Guardando...' : 'Guardar'}
                          </Button>
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Bonos por Viajes</p>
                        <div className="overflow-x-auto border rounded-md">
                          <Table className="text-[11px]">
                            <TableHeader>
                              <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                                <TableHead className="py-1.5">Mín. Viajes</TableHead>
                                <TableHead className="py-1.5">Bono (S/.)</TableHead>
                                <TableHead className="py-1.5">Vigencia</TableHead>
                                <TableHead className="py-1.5">Actualizado</TableHead>
                                {configDirty && <TableHead className="py-1.5 w-8"></TableHead>}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(configDirty ? editBonos : config.bonus_thresholds).map((b, i) => (
                                <TableRow key={b.id ?? i}>
                                  <TableCell className="py-1">
                                    {configDirty ? (
                                      <Input
                                        type="number"
                                        value={b.minTrips}
                                        onChange={(e) => {
                                          const next = [...editBonos]
                                          next[i] = { ...next[i], minTrips: Number(e.target.value) }
                                          setEditBonos(next)
                                        }}
                                      />
                                    ) : (
                                      <span className="font-medium">{b.minTrips}</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-1">
                                    {configDirty ? (
                                      <Input
                                        type="number"
                                        value={b.bonusAmount}
                                        onChange={(e) => {
                                          const next = [...editBonos]
                                          next[i] = { ...next[i], bonusAmount: Number(e.target.value) }
                                          setEditBonos(next)
                                        }}
                                      />
                                    ) : (
                                      <span className="text-green-600 font-medium">S/. {b.bonusAmount}</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-1 text-gray-500">{b.effectiveFrom}</TableCell>
                                  <TableCell className="py-1 text-gray-400 text-[10px]">
                                    {b.updatedAt ? new Date(b.updatedAt).toLocaleDateString('es-PE') : '—'}
                                  </TableCell>
                                  {configDirty && (
                                    <TableCell className="py-1">
                                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0"
                                        onClick={() => setConfirmDelete({ type: 'bono', index: i })}>
                                        <Trash2 className="w-3 h-3 text-red-500" />
                                      </Button>
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        {configDirty && (
                          <Button variant="ghost" size="sm" className="mt-1 text-xs"
                            onClick={() => setEditBonos([...editBonos, { minTrips: 0, bonusAmount: 0, effectiveFrom: new Date().toISOString().slice(0, 10) }])}>
                            <Plus className="w-3 h-3 mr-1" /> Agregar umbral
                          </Button>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Porcentajes de Pago</p>
                        <div className="overflow-x-auto border rounded-md">
                          <Table className="text-[11px]">
                            <TableHeader>
                              <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                                <TableHead className="py-1.5">Mín. Viajes Válidos</TableHead>
                                <TableHead className="py-1.5">% Pago</TableHead>
                                <TableHead className="py-1.5">Vigencia</TableHead>
                                <TableHead className="py-1.5">Actualizado</TableHead>
                                {configDirty && <TableHead className="py-1.5 w-8"></TableHead>}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(configDirty ? editPcts : config.payment_percentages).map((p, i) => (
                                <TableRow key={p.id ?? i}>
                                  <TableCell className="py-1">
                                    {configDirty ? (
                                      <Input
                                        type="number"
                                        value={p.minValidatedTrips}
                                        onChange={(e) => {
                                          const next = [...editPcts]
                                          next[i] = { ...next[i], minValidatedTrips: Number(e.target.value) }
                                          setEditPcts(next)
                                        }}
                                      />
                                    ) : (
                                      <span className="font-medium">{p.minValidatedTrips}</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-1">
                                    {configDirty ? (
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={p.percentage}
                                        onChange={(e) => {
                                          const next = [...editPcts]
                                          next[i] = { ...next[i], percentage: Number(e.target.value) }
                                          setEditPcts(next)
                                        }}
                                      />
                                    ) : (
                                      <span className="text-blue-600 font-medium">{(p.percentage * 100).toFixed(0)}%</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-1 text-gray-500">{p.effectiveFrom}</TableCell>
                                  <TableCell className="py-1 text-gray-400 text-[10px]">
                                    {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('es-PE') : '—'}
                                  </TableCell>
                                  {configDirty && (
                                    <TableCell className="py-1">
                                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0"
                                        onClick={() => setConfirmDelete({ type: 'pct', index: i })}>
                                        <Trash2 className="w-3 h-3 text-red-500" />
                                      </Button>
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        {configDirty && (
                          <Button variant="ghost" size="sm" className="mt-1 text-xs"
                            onClick={() => setEditPcts([...editPcts, { minValidatedTrips: 0, percentage: 0, effectiveFrom: new Date().toISOString().slice(0, 10) }])}>
                            <Plus className="w-3 h-3 mr-1" /> Agregar porcentaje
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!showConfirmPago} onOpenChange={(open) => { if (!open) setShowConfirmPago(null) }}>
        <DialogContent className="max-w-sm rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl bg-white dark:bg-gray-900 p-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Confirmar pago
            </DialogTitle>
          </DialogHeader>

          {showConfirmPago && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                {showConfirmPago.avatar_url ? (
                  <img src={showConfirmPago.avatar_url} alt={showConfirmPago.nombre}
                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-500" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                    {showConfirmPago.nombre || showConfirmPago.driver_id}
                  </p>
                  {showConfirmPago.placa && (
                    <p className="text-xs text-gray-500 font-mono">{showConfirmPago.placa}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">
                    Semana: {formatearFechaLegible(lunesSemana)} — {formatearFechaLegible(domingoSemana)}
                  </p>
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center border border-red-200 dark:border-red-800">
                <p className="text-xs text-red-600 dark:text-red-400 mb-1">Monto total a pagar</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {formatBalance(showConfirmPago.pago_total)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-center">
                  <p className="text-gray-500">Viajes</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{showConfirmPago.total_viajes}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-center">
                  <p className="text-gray-500">Días trabajados</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{showConfirmPago.dias_trabajados}</p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 space-y-2.5 border border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ajustes manuales</p>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-0.5">Bonificación (S/.)</label>
                    <Input
                      type="number" step="0.01" min="0"
                      value={bonificacion}
                      onChange={(e) => { const v = e.target.value; if (v === '' || parseFloat(v) >= 0) setBonificacion(v) }}
                      placeholder="0.00"
                      className="w-full h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-0.5">Garantía (S/.)</label>
                    <Input
                      type="number" step="0.01" min="0"
                      value={garantia}
                      onChange={(e) => { const v = e.target.value; if (v === '' || parseFloat(v) >= 0) setGarantia(v) }}
                      placeholder="0.00"
                      className="w-full h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-0.5">Descuento (S/.)</label>
                    <Input
                      type="number" step="0.01" min="0"
                      value={descuento}
                      onChange={(e) => { const v = e.target.value; if (v === '' || parseFloat(v) >= 0) setDescuento(v) }}
                      placeholder="0.00"
                      className="w-full h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="pt-1">
                  <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-0.5">Descripción</label>
                  <textarea
                    value={general}
                    onChange={(e) => setGeneral(e.target.value)}
                    placeholder="Observaciones..."
                    rows={2}
                    className="w-full text-xs px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 h-9 text-sm" onClick={() => setShowConfirmPago(null)}
                  disabled={saveMutation.isPending}>
                  Cancelar
                </Button>
                <Button className="flex-1 h-9 text-sm bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => {
                    handleGuardarFacturacion(showConfirmPago)
                    setShowConfirmPago(null)
                  }}
                  disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Guardando...' : 'Confirmar pago'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null) }}>
        <DialogContent className="max-w-sm rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl bg-white dark:bg-gray-900 p-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
              ¿Eliminar {confirmDelete?.type === 'bono' ? 'umbral de bono' : 'porcentaje de pago'}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Esta acción no se puede deshacer. El registro se eliminará permanentemente al guardar los cambios.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 h-9 text-sm" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button className="flex-1 h-9 text-sm bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (!confirmDelete) return
                if (confirmDelete.type === 'bono') {
                  setEditBonos(editBonos.filter((_, j) => j !== confirmDelete.index))
                } else {
                  setEditPcts(editPcts.filter((_, j) => j !== confirmDelete.index))
                }
                setConfirmDelete(null)
              }}>
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
