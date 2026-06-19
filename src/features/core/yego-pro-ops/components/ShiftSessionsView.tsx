import { useState, useMemo, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { yegoProOpsService, type ShiftSessionResponse, type ListaConductoresResponse, type LiquidacionPendienteResponse, type RegistroCierre } from '../../../../services/yego-pro-ops-service'
import type { SharedProOpsState } from '../yego-pro-ops.module'
import { useAuth } from '../../../../shared/hooks/useAuth'
import { Button } from '../../../../components/ui/button'
import { Phone, Hash, Clock, CheckCircle2, ChevronRight, ChevronDown, ChevronUp, Pause, Calendar, Search, DollarSign, Car, TrendingUp, Percent, Award, Trash2 } from 'lucide-react'
import { cn } from '../../../../utils/cn'

function getInitials(name: string): string { return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') }
function formatDateShort(iso: string): { date: string; day: string } {
  const d = new Date(iso)
  const date = d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }).replace(' ', '-').replace('.', '')
  const day = d.toLocaleDateString('es-PE', { weekday: 'long' }).toLowerCase()
  return { date, day }
}
function formatTime(iso: string): string { const d = new Date(iso); return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }) }
function formatCurrency(v: number): string { return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(v).replace('PEN', 'S/') }
function fmtPercent(v: number): string { return v.toFixed(1) + '%' }
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'active': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />En curso</span>
    case 'closed': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"><Pause className="w-3 h-3" />Pendiente</span>
    case 'settled': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="w-3 h-3" />Liquidada</span>
    default: return null
  }
}
function SessionStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'settled': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-3 h-3" />Completada</span>
    case 'closed': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"><Clock className="w-3 h-3" />Pendiente</span>
    case 'active': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />En curso</span>
    default: return null
  }
}
function DriverAvatar({ name, avatarUrl, size }: { name: string; avatarUrl?: string; size?: 'sm' | 'lg' }) {
  const s = size === 'lg' ? 'w-14 h-14 rounded-xl' : 'w-9 h-9 rounded-full'
  return avatarUrl ? <img src={avatarUrl} alt={name} className={cn(s, 'object-cover flex-shrink-0')} />
    : <div className={cn(s, 'bg-red-600 text-white flex items-center justify-center font-bold flex-shrink-0', size === 'lg' ? 'text-lg' : 'text-xs')}>{getInitials(name)}</div>
}

export function ShiftSessionsView({ shared }: { shared: SharedProOpsState }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const { driver: selectedDriver, desde, hasta, weekOffset, setDriver, setDesde, setHasta, setWeekOffset, switchTab } = shared
  const [localDesde, setLocalDesde] = useState('')
  const [localHasta, setLocalHasta] = useState('')
  const [filtroAplicado, setFiltroAplicado] = useState(false)
  const [loadingBuscar, setLoadingBuscar] = useState(false)
  const [metricasYango, setMetricasYango] = useState<LiquidacionPendienteResponse | null>(null)
  const [showLiquidarModal, setShowLiquidarModal] = useState(false)
  const [modalModo, setModalModo] = useState<ModalModo>('sesion')
  const [sessionALiquidar, setSessionALiquidar] = useState<ShiftSessionResponse | null>(null)
  const [liquidando, setLiquidando] = useState(false)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [editando, setEditando] = useState(false)
  const [guardandoCambios, setGuardandoCambios] = useState(false)
  const [errorEdicion, setErrorEdicion] = useState('')
  const [resultadoExpandido, setResultadoExpandido] = useState(false)
  const [cierrePrevio, setCierrePrevio] = useState<RegistroCierre | null>(null)
  const [cierreForm, setCierreForm] = useState({ placa: '', odometroInicial: '', odometroFinal: '', gnvM3: '', gnvSoles: '', gasolinaGalones: '', gasolinaSoles: '', liquidaEfectivo: '', liquidaYape: '', operacionYape: '', otrosGastos: '', otrosGastosDescripcion: '' })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<ShiftSessionResponse | null>(null)
  const [deleteReason, setDeleteReason] = useState('')

  const deleteMutation = useMutation({
    mutationFn: ({ sessionId, reason }: { sessionId: string; reason: string }) =>
      yegoProOpsService.deleteSession(sessionId, user?.id ?? 0, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pro-ops', 'shift-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['pro-ops', 'liquidacion-pendiente'] })
      queryClient.invalidateQueries({ queryKey: ['pro-ops', 'liquidacion-semanal'] })
      setShowDeleteConfirm(false); setSessionToDelete(null); setDeleteReason('')
      setMetricasYango(null)
    },
  })

  const limpiarFacturacionMutation = useMutation({
    mutationFn: () => {
      const desde = metricasYango?.periodoDesde ?? localDesde
      const hasta = metricasYango?.periodoHasta ?? localHasta
      return yegoProOpsService.limpiarFacturacion(selectedDriver?.driverId ?? '', desde, hasta)
    },
    onSuccess: () => {
      setMetricasYango(null)
      queryClient.invalidateQueries({ queryKey: ['pro-ops', 'liquidacion-pendiente'] })
      queryClient.invalidateQueries({ queryKey: ['pro-ops', 'liquidacion-semanal'] })
    },
  })

  const { data: driversData } = useQuery<ListaConductoresResponse>({ queryKey: ['pro-ops', 'drivers'], queryFn: () => yegoProOpsService.obtenerListaConductores() })
  const filteredDrivers = useMemo(() => (driversData?.conductores ?? []).filter(d => { const q = searchTerm.toLowerCase(); return d.nombre.toLowerCase().includes(q) || d.telefono?.includes(q) || d.driverId.toLowerCase().includes(q) }), [driversData, searchTerm])

  const { data: rangoSugerido } = useQuery<LiquidacionPendienteResponse>({ queryKey: ['pro-ops', 'liquidacion-pendiente', selectedDriver?.driverId], queryFn: () => yegoProOpsService.getLiquidacionPendiente(selectedDriver?.driverId ?? ''), enabled: !!selectedDriver?.driverId })

  const fechaEfectivaDesde = localDesde || desde
  const fechaEfectivaHasta = localHasta || hasta

  useEffect(() => {
    if (localDesde !== desde || localHasta !== hasta) {
      setMetricasYango(null)
    }
  }, [localDesde, localHasta])

  useEffect(() => {
    if (rangoSugerido?.periodoDesde && rangoSugerido?.periodoHasta && !desde) {
      const d = toDatetimeLocal(rangoSugerido.periodoDesde)
      setLocalDesde(d)
      setDesde(d)
    }
  }, [rangoSugerido?.periodoDesde, rangoSugerido?.periodoHasta])

  const handleAplicarFiltro = useCallback(async () => {
    if (!localDesde || !localHasta) return
    setDesde(localDesde); setHasta(localHasta)
    setMetricasYango(null)
    setLoadingBuscar(true)
    setFiltroAplicado(true)
    try {
      const data = await yegoProOpsService.getLiquidacionPendiente(selectedDriver?.driverId ?? '', localDesde, localHasta)
      setMetricasYango(data)
    } catch { setMetricasYango(null) }
    setLoadingBuscar(false)
    setTimeout(() => setFiltroAplicado(false), 1500)
  }, [localDesde, localHasta, selectedDriver?.driverId, setDesde, setHasta])

  const { data: history } = useQuery<ShiftSessionResponse[]>({ queryKey: ['pro-ops', 'shift-sessions', 'history', selectedDriver?.driverId], queryFn: () => yegoProOpsService.getSessionHistory(selectedDriver?.driverId ?? ''), enabled: !!selectedDriver?.driverId })

  const filteredSessions = useMemo(() => {
    return history ?? []
  }, [history])

  const currentWeekLabel = useMemo(() => {
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + weekOffset * 7)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const mLabel = monday.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
    const sLabel = sunday.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
    return { label: `${mLabel} → ${sLabel}`, monday, sunday }
  }, [weekOffset])

  const filteredSessionsByWeek = useMemo(() => {
    return filteredSessions.filter(s => {
      const d = new Date(s.startedAt)
      return d >= currentWeekLabel.monday && d <= new Date(currentWeekLabel.sunday.getTime() + 86399999)
    })
  }, [filteredSessions, currentWeekLabel])

  const cierresDesde = currentWeekLabel.monday.toISOString().split('T')[0]
  const cierresHasta = currentWeekLabel.sunday.toISOString().split('T')[0]
  const { data: cierresSemana } = useQuery<RegistroCierre[]>({
    queryKey: ['pro-ops', 'cierres-rango', selectedDriver?.driverId, cierresDesde, cierresHasta],
    queryFn: () => yegoProOpsService.obtenerCierresPorRango(selectedDriver?.driverId ?? '', cierresDesde, cierresHasta),
    enabled: !!selectedDriver?.driverId
  })
  const totalLiquidado = useMemo(() => (cierresSemana ?? []).reduce((s, c) => s + (c.liquidaEfectivo ?? 0) + (c.liquidaYape ?? 0), 0), [cierresSemana])

  const sessionsByWeek = useMemo(() => {
    const groups: { weekLabel: string; sessions: typeof filteredSessionsByWeek }[] = []
    const sorted = [...filteredSessionsByWeek].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    let currentWeek = ''
    for (const s of sorted) {
      const d = new Date(s.startedAt)
      const day = d.getDay()
      const monday = new Date(d); monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
      const weekKey = monday.toISOString().split('T')[0]
      if (weekKey !== currentWeek) {
        currentWeek = weekKey
        const mLabel = monday.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
        const sLabel = sunday.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
        groups.push({ weekLabel: `${mLabel} → ${sLabel}`, sessions: [] })
      }
      groups[groups.length - 1].sessions.push(s)
    }
    return groups
  }, [filteredSessionsByWeek])

  const todasSettled = !!(fechaEfectivaDesde && fechaEfectivaHasta) && (() => {
    if (!history || history.length === 0) return false
    const dd = new Date(fechaEfectivaDesde); const hd = new Date(fechaEfectivaHasta)
    const enRango = history.filter(s => {
      const ss = new Date(s.startedAt); const se = s.closedAt ? new Date(s.closedAt) : new Date()
      return ss <= hd && se >= dd
    })
    return enRango.length > 0 && enRango.every(s => s.status === 'settled')
  })()
  const hayPendientes = filteredSessionsByWeek.some(s => s.status === 'closed')
  const hayActivas = filteredSessionsByWeek.some(s => s.status === 'active')
  const activasEnRango = filteredSessionsByWeek.filter(s => s.status === 'active').length

  const sesionesSolapadas = useMemo(() => {
    if (!localDesde || !localHasta || !history) return []
    const dd = new Date(localDesde); const hd = new Date(localHasta)
    return history.filter(s => {
      const ss = new Date(s.startedAt)
      const se = s.closedAt ? new Date(s.closedAt) : new Date()
      return ss < hd && se > dd && (s.status === 'closed' || s.status === 'settled')
    })
  }, [localDesde, localHasta, history])

  const haySolapamiento = sesionesSolapadas.length > 0
  const hastaEsFuturo = !!(localHasta && new Date(localHasta) > new Date())
  const desdeMayorQueHasta = !!(localDesde && localHasta && new Date(localDesde) >= new Date(localHasta))
  const desdeEsFuturo = !!(localDesde && new Date(localDesde) > new Date())
  const buscarBloqueado = !localDesde || !localHasta || desdeMayorQueHasta || desdeEsFuturo || todasSettled || haySolapamiento || hastaEsFuturo

  const closeMutation = useMutation({ mutationFn: (sessionId: string) => yegoProOpsService.closeSession(sessionId, user?.id ?? 0), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pro-ops', 'shift-sessions'] }) })

  const handleCerrarTodas = () => { filteredSessionsByWeek.filter(s => s.status === 'active').forEach(s => closeMutation.mutate(s.id)) }

  const openLiquidarSesion = useCallback(async (session: ShiftSessionResponse) => {
    if (cargandoDetalle) return
    setModalModo('sesion'); setSessionALiquidar(session); setShowLiquidarModal(true)
    setEditando(false); setErrorEdicion('')
    setCierreForm({ placa: '', odometroInicial: '', odometroFinal: '', gnvM3: '', gnvSoles: '', gasolinaGalones: '', gasolinaSoles: '', liquidaEfectivo: '', liquidaYape: '', operacionYape: '', otrosGastos: '', otrosGastosDescripcion: '' })
    setCargandoDetalle(true)
    try {
      const previo = await yegoProOpsService.obtenerCierrePorSession(session.id)
      if (previo) {
        setCierrePrevio(previo)
        setCierreForm({ placa: previo.placa ?? '', odometroInicial: previo.odometroInicial?.toString() ?? '', odometroFinal: previo.odometroFinal?.toString() ?? '', gnvM3: previo.gnvM3 ?? '', gnvSoles: previo.gnvSoles?.toString() ?? '', gasolinaGalones: previo.gasolinaGalones ?? '', gasolinaSoles: previo.gasolinaSoles?.toString() ?? '', liquidaEfectivo: previo.liquidaEfectivo?.toString() ?? '', liquidaYape: previo.liquidaYape?.toString() ?? '', otrosGastos: previo.otrosGastos?.toString() ?? '', otrosGastosDescripcion: previo.otrosGastosDescripcion ?? '' })
      } else { setCierrePrevio(null) }
    } catch { setCierrePrevio(null) }
    setCargandoDetalle(false)
  }, [cargandoDetalle])

  const openCerrarTurno = useCallback(() => {
    if (!metricasYango || !selectedDriver) return
    setModalModo('turno'); setSessionALiquidar(null); setShowLiquidarModal(true)
    setCierreForm({ placa: metricasYango.placa ?? '', odometroInicial: '', odometroFinal: '', gnvM3: '', gnvSoles: '', gasolinaGalones: '', gasolinaSoles: '', liquidaEfectivo: '', liquidaYape: '', operacionYape: '', otrosGastos: '', otrosGastosDescripcion: '' })
  }, [metricasYango, selectedDriver])

  const handleLiquidarSesion = async () => {
    if (!sessionALiquidar || !selectedDriver) return
    setLiquidando(true)
    try {
      await yegoProOpsService.settleSession(sessionALiquidar.id, user?.id ?? 0)
      const fecha = new Date(sessionALiquidar.startedAt).toISOString().split('T')[0]
      const ingresos = sessionALiquidar?.totalCash ?? 0
      const gastos = (parseFloat(cierreForm.gnvSoles) || 0) + (parseFloat(cierreForm.gasolinaSoles) || 0) + (parseFloat(cierreForm.otrosGastos) || 0)
      await yegoProOpsService.registrarCierre({
        driverId: selectedDriver.driverId, userId: user?.id ?? 0, fecha, shiftSessionId: sessionALiquidar.id,
        placa: cierreForm.placa || null, odometroInicial: cierreForm.odometroInicial ? parseInt(cierreForm.odometroInicial) : null, odometroFinal: cierreForm.odometroFinal ? parseInt(cierreForm.odometroFinal) : null,
        diferenciaOdometro: (cierreForm.odometroInicial && cierreForm.odometroFinal) ? parseInt(cierreForm.odometroFinal) - parseInt(cierreForm.odometroInicial) : null,
        gnvM3: cierreForm.gnvM3 || null, gnvSoles: parseFloat(cierreForm.gnvSoles) || 0, gasolinaGalones: cierreForm.gasolinaGalones || null, gasolinaSoles: parseFloat(cierreForm.gasolinaSoles) || 0,
        liquidaEfectivo: parseFloat(cierreForm.liquidaEfectivo) || 0, liquidaYape: parseFloat(cierreForm.liquidaYape) || 0, operacionYape: cierreForm.operacionYape || null,
        otrosGastos: parseFloat(cierreForm.otrosGastos) || 0, otrosGastosDescripcion: cierreForm.otrosGastosDescripcion || null,
        totalIngresos: ingresos, totalGastos: gastos, resta: ingresos - gastos,
      })
      queryClient.invalidateQueries({ queryKey: ['pro-ops', 'shift-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['pro-ops', 'liquidacion-pendiente'] })
      queryClient.invalidateQueries({ queryKey: ['pro-ops', 'liquidacion-semanal'] })
      setShowLiquidarModal(false); setSessionALiquidar(null)
    } catch (e) { console.error('Error liquidando sesión:', e) }
    setLiquidando(false)
  }

  const handleEditar = () => {
    setEditando(true)
    setErrorEdicion('')
  }

  const handleCancelarEdicion = () => {
    setEditando(false)
    setErrorEdicion('')
    if (cierrePrevio) {
      setCierreForm({
        placa: cierrePrevio.placa ?? '', odometroInicial: cierrePrevio.odometroInicial?.toString() ?? '', odometroFinal: cierrePrevio.odometroFinal?.toString() ?? '',
        gnvM3: cierrePrevio.gnvM3 ?? '', gnvSoles: cierrePrevio.gnvSoles?.toString() ?? '', gasolinaGalones: cierrePrevio.gasolinaGalones ?? '', gasolinaSoles: cierrePrevio.gasolinaSoles?.toString() ?? '',
        liquidaEfectivo: cierrePrevio.liquidaEfectivo?.toString() ?? '', liquidaYape: cierrePrevio.liquidaYape?.toString() ?? '', operacionYape: cierrePrevio.operacionYape ?? '',
        otrosGastos: cierrePrevio.otrosGastos?.toString() ?? '', otrosGastosDescripcion: cierrePrevio.otrosGastosDescripcion ?? ''
      })
    }
  }

  const handleGuardarEdicion = async () => {
    if (!cierrePrevio || !selectedDriver || !user || !sessionALiquidar) return
    const totalLiquidacion = (parseFloat(cierreForm.liquidaEfectivo) || 0) + (parseFloat(cierreForm.liquidaYape) || 0)
    const ingresos = sessionALiquidar?.totalCash ?? 0
    const totalG = (parseFloat(cierreForm.gnvSoles) || 0) + (parseFloat(cierreForm.gasolinaSoles) || 0) + (parseFloat(cierreForm.otrosGastos) || 0)
    if (Math.abs(ingresos - totalG - totalLiquidacion) > 0.01) {
      setErrorEdicion('Los montos no calzan. Ajustá los valores.')
      return
    }
    setGuardandoCambios(true)
    setErrorEdicion('')
    try {
      await yegoProOpsService.actualizarCierre({
        id: cierrePrevio.id,
        driverId: selectedDriver.driverId,
        userId: user.id ?? 0,
        fecha: cierrePrevio.fecha,
        shiftSessionId: sessionALiquidar.id,
        placa: cierreForm.placa || null,
        odometroInicial: cierreForm.odometroInicial ? parseInt(cierreForm.odometroInicial) : null,
        odometroFinal: cierreForm.odometroFinal ? parseInt(cierreForm.odometroFinal) : null,
        diferenciaOdometro: (cierreForm.odometroInicial && cierreForm.odometroFinal) ? parseInt(cierreForm.odometroFinal) - parseInt(cierreForm.odometroInicial) : null,
        gnvM3: cierreForm.gnvM3 || null, gnvSoles: parseFloat(cierreForm.gnvSoles) || 0,
        gasolinaGalones: cierreForm.gasolinaGalones || null, gasolinaSoles: parseFloat(cierreForm.gasolinaSoles) || 0,
        liquidaEfectivo: parseFloat(cierreForm.liquidaEfectivo) || 0, liquidaYape: parseFloat(cierreForm.liquidaYape) || 0, operacionYape: cierreForm.operacionYape || null,
        otrosGastos: parseFloat(cierreForm.otrosGastos) || 0, otrosGastosDescripcion: cierreForm.otrosGastosDescripcion || null,
        totalIngresos: ingresos, totalGastos: totalG, resta: ingresos - totalG,
      })
      if (sessionALiquidar) {
        const previo = await yegoProOpsService.obtenerCierrePorSession(sessionALiquidar.id)
        if (previo) setCierrePrevio(previo)
      }
      setEditando(false)
      queryClient.invalidateQueries({ queryKey: ['pro-ops', 'shift-sessions'] })
    } catch (e) {
      setErrorEdicion('Error al guardar los cambios. Reintentá.')
      console.error('Error guardando edición:', e)
    }
    setGuardandoCambios(false)
  }

  const handleCerrarTurno = async () => {
    if (!metricasYango || !selectedDriver || !localDesde || !localHasta) return
    setLiquidando(true)
    try {
      await yegoProOpsService.liquidarPendiente({
        driverId: selectedDriver.driverId,
        userId: user?.id ?? 0,
        desde: localDesde,
        hasta: localHasta,
        placa: cierreForm.placa || null,
        odometroInicial: cierreForm.odometroInicial ? parseInt(cierreForm.odometroInicial) : null,
        odometroFinal: cierreForm.odometroFinal ? parseInt(cierreForm.odometroFinal) : null,
        diferenciaOdometro: (cierreForm.odometroInicial && cierreForm.odometroFinal) ? parseInt(cierreForm.odometroFinal) - parseInt(cierreForm.odometroInicial) : null,
        gnvM3: cierreForm.gnvM3 || null,
        gnvSoles: parseFloat(cierreForm.gnvSoles) || 0,
        gasolinaGalones: cierreForm.gasolinaGalones || null,
        gasolinaSoles: parseFloat(cierreForm.gasolinaSoles) || 0,
        liquidaEfectivo: parseFloat(cierreForm.liquidaEfectivo) || 0,
        liquidaYape: parseFloat(cierreForm.liquidaYape) || 0,
        operacionYape: cierreForm.operacionYape || null,
        otrosGastos: parseFloat(cierreForm.otrosGastos) || 0,
        otrosGastosDescripcion: cierreForm.otrosGastosDescripcion || null,
      })
      queryClient.invalidateQueries({ queryKey: ['pro-ops', 'shift-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['pro-ops', 'liquidacion-pendiente'] })
      queryClient.invalidateQueries({ queryKey: ['pro-ops', 'liquidacion-semanal'] })
    } catch (e) { console.error('Error cerrando turno:', e) } finally {
      setShowLiquidarModal(false)
      setLiquidando(false)
      setMetricasYango(null)
      const nextDesde = new Date(localHasta)
      nextDesde.setMinutes(nextDesde.getMinutes() + 1)
      const nextDesdeStr = toDatetimeLocal(nextDesde.toISOString())
      setLocalDesde(nextDesdeStr); setLocalHasta('')
      setDesde(nextDesdeStr); setHasta('')
    }
  }

  const activeCount = driversData?.conductores?.length ?? 0
  const odometroDif = (cierreForm.odometroInicial && cierreForm.odometroFinal) ? parseInt(cierreForm.odometroFinal) - parseInt(cierreForm.odometroInicial) : 0
  const totalGastos = (parseFloat(cierreForm.gnvSoles) || 0) + (parseFloat(cierreForm.gasolinaSoles) || 0) + (parseFloat(cierreForm.otrosGastos) || 0)
  const ingresosModal = modalModo === 'turno' ? (metricasYango?.efectivo ?? 0) : (sessionALiquidar?.totalCash ?? 0)
  const isReadonly = modalModo === 'sesion' && sessionALiquidar?.status === 'settled' && !editando
  const montoRestante = ingresosModal - totalGastos
  const totalLiquidacion = (parseFloat(cierreForm.liquidaEfectivo) || 0) + (parseFloat(cierreForm.liquidaYape) || 0)

  const fechaInputClase = cn('text-xs border rounded px-2 py-1 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-red-500',
    todasSettled ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' : haySolapamiento || desdeMayorQueHasta || desdeEsFuturo ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : hayPendientes ? 'border-amber-500' : hayActivas ? 'border-red-400' : 'border-gray-300 dark:border-neutral-600')

  const hastaInputClase = cn('text-xs border rounded px-2 py-1 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-red-500',
    todasSettled ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' : haySolapamiento || hastaEsFuturo || desdeMayorQueHasta ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : hayPendientes ? 'border-amber-500' : 'border-gray-300 dark:border-neutral-600')

  return (
    <div className="flex h-[calc(100vh-180px)] bg-white dark:bg-neutral-950 rounded-xl overflow-hidden border border-gray-200 dark:border-neutral-800 shadow-sm">
      <div className="w-[280px] flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <div className="bg-red-600 px-4 py-3.5">
          <div className="flex items-center justify-between mb-1"><div className="flex items-center gap-2"><svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg><span className="text-white font-medium text-sm">Conductores</span></div><span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white text-red-600 text-xs font-bold">{activeCount}</span></div>
          <p className="text-red-200 text-[11px]">Selecciona un conductor para ver sus sesiones</p>
        </div>
        <div className="px-3 py-2.5"><input type="text" placeholder="Buscar nombre, teléfono o ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-red-500" /></div>
        <div className="flex-1 overflow-y-auto">
          {filteredDrivers.map(driver => (
            <button key={driver.driverId} onClick={() => { setDriver(driver); setMetricasYango(null) }}
              className={cn('w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors group', selectedDriver?.driverId === driver.driverId ? 'bg-red-50 dark:bg-red-950/30 border-l-[3px] border-l-red-600' : 'border-l-[3px] border-l-transparent hover:bg-gray-50 dark:hover:bg-neutral-800/30')}>
              <div className="relative"><DriverAvatar name={driver.nombre} avatarUrl={driver.avatarUrl} /><span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-950" /></div>
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{driver.nombre}</p><div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-0.5"><Phone className="w-3 h-3" /><span>{driver.telefono}</span></div></div>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500" />
            </button>
          ))}
              </div>
            </div>

      <div className="flex-1 overflow-y-auto">
        {!selectedDriver ? (
          <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-600"><div className="text-center"><svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg><p className="text-sm font-medium">Selecciona un conductor</p></div></div>
        ) : (
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <DriverAvatar name={selectedDriver.nombre} avatarUrl={selectedDriver.avatarUrl} size="lg" />
                <div><div className="flex items-center gap-3 mb-1"><h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">{selectedDriver.nombre}</h2>{history?.some(s => s.status === 'active') && <StatusBadge status="active" />}</div>
                  <div className="flex items-center gap-3 text-sm text-gray-400 dark:text-gray-500"><span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{selectedDriver.telefono}</span><span className="text-gray-300 dark:text-neutral-700">|</span><span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" />                      ID {selectedDriver.driverId}</span></div></div>
              </div>
            </div>

            {/* RANGO DE FECHAS */}
            <div className={cn('mb-4 px-4 py-3 rounded-xl', todasSettled ? 'bg-emerald-50 dark:bg-emerald-950/20' : haySolapamiento ? 'bg-red-50 dark:bg-red-950/10' : hayPendientes ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-gray-50 dark:bg-neutral-800/50')}>
              <div className="flex items-center gap-3">
                <Calendar className={cn('w-4 h-4 flex-shrink-0', todasSettled ? 'text-emerald-500' : haySolapamiento ? 'text-red-500' : hayPendientes ? 'text-amber-500' : 'text-gray-400')} />
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex flex-col gap-0.5"><label className="text-[10px] font-semibold text-gray-400 uppercase">Desde</label><input type="datetime-local" value={localDesde} onChange={e => setLocalDesde(e.target.value)} disabled={todasSettled} className={fechaInputClase} /></div>
                  <span className="text-gray-400 text-sm mt-4">→</span>
                  <div className="flex flex-col gap-0.5"><label className="text-[10px] font-semibold text-gray-400 uppercase">Hasta</label><input type="datetime-local" value={localHasta} onChange={e => setLocalHasta(e.target.value)} disabled={todasSettled} className={hastaInputClase} /></div>
                  <Button size="sm" onClick={handleAplicarFiltro} disabled={loadingBuscar || buscarBloqueado}
                    className={cn('ml-2 mt-4 h-7 text-xs rounded-lg text-white px-3 transition-colors', filtroAplicado ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700')}>
                    {loadingBuscar ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" /> : filtroAplicado ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Aplicado</> : <><Search className="w-3.5 h-3.5 mr-1" />Buscar</>}
                  </Button>
                </div>
                {todasSettled && <span className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex-shrink-0">Liquidado</span>}
                {haySolapamiento && <span className="text-[10px] font-bold px-2 py-1 rounded bg-red-100 dark:bg-red-950/40 text-red-600 flex-shrink-0">Período ocupado</span>}
                {!todasSettled && !haySolapamiento && hayPendientes && <span className="text-[10px] font-bold px-2 py-1 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-600 flex-shrink-0">Pendiente parcial</span>}
                {rangoSugerido?.esPrimeraLiquidacion && !desde && <span className="text-[10px] font-bold px-2 py-1 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-600 flex-shrink-0">Primera liquidación</span>}
              </div>
              {desdeMayorQueHasta && (
                <p className="text-[11px] text-red-500 mt-1 pl-7">La fecha de inicio no puede ser posterior a la de fin</p>
              )}
              {desdeEsFuturo && !desdeMayorQueHasta && (
                <p className="text-[11px] text-red-500 mt-1 pl-7">La fecha de inicio no puede ser futura</p>
              )}
              {haySolapamiento && !desdeMayorQueHasta && !desdeEsFuturo && (
                <div className="mt-2 pl-7">
                  <p className="text-[11px] font-semibold text-red-600 mb-1">El período seleccionado se superpone con una sesión existente:</p>
                  {sesionesSolapadas.map(s => (
                    <p key={s.id} className="text-[10px] text-red-500 ml-2">
                      • {formatDateShort(s.startedAt).date} {formatTime(s.startedAt)} → {s.closedAt ? formatTime(s.closedAt) : '···'} ({s.status === 'settled' ? 'Liquidado' : 'Pendiente'})
                    </p>
                  ))}
                </div>
              )}
              {hastaEsFuturo && !haySolapamiento && !desdeMayorQueHasta && !desdeEsFuturo && (
                <p className="text-[11px] text-red-500 mt-1 pl-7">La fecha seleccionada es posterior a la fecha actual</p>
              )}
            </div>

            {/* MÉTRICAS (siempre visibles) */}
            <div className="grid grid-cols-5 gap-3 mb-6">
              {loadingBuscar ? (
                <div className="col-span-5 flex items-center justify-center py-6"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" /><p className="text-sm text-gray-400 ml-3">Consultando Yango...</p></div>
              ) : metricasYango ? (
                <>
                  <div className="bg-[#F8F8F8] dark:bg-neutral-800/60 rounded-xl p-4"><span className="text-[11px] font-semibold text-gray-400 uppercase">VIAJES</span><p className="text-[28px] font-bold text-gray-900 dark:text-gray-100 leading-tight mb-1">{metricasYango.totalViajes}</p><p className="text-xs text-gray-400">{metricasYango.viajesPorHora.toFixed(1)} viajes/hora</p></div>
                  <div className="bg-[#F8F8F8] dark:bg-neutral-800/60 rounded-xl p-4"><span className="text-[11px] font-semibold text-gray-400 uppercase">PRODUCIDO</span><p className="text-[28px] font-bold text-gray-900 dark:text-gray-100 leading-tight mb-1">{formatCurrency(metricasYango.montoTotalProducido)}</p><p className="text-xs text-gray-400">Comisión: {formatCurrency(metricasYango.comisionApp)}</p></div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-4"><span className="text-[11px] font-semibold text-gray-400 uppercase">EFECTIVO</span><p className="text-[28px] font-bold text-gray-900 dark:text-gray-100 leading-tight mb-1">{formatCurrency(metricasYango.efectivo)}</p><p className="text-xs text-gray-400">Efectivo recolectado</p></div>
                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-4"><span className="text-[11px] font-semibold text-gray-400 uppercase">LIQUIDADO</span><p className="text-[28px] font-bold text-blue-600 leading-tight mb-1">{formatCurrency(totalLiquidado)}</p><p className="text-xs text-gray-400">Efectivo + Yape</p></div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-4"><span className="text-[11px] font-semibold text-gray-400 uppercase">MONTO NETO</span><p className="text-[28px] font-bold text-emerald-600 leading-tight mb-1">{formatCurrency(metricasYango.montoNeto)}</p><p className="text-xs text-gray-400">% Pago: {fmtPercent(metricasYango.porcentajePago)} · Utilidad: {formatCurrency(metricasYango.utilidad)}</p></div>
                </>
              ) : (
                <>
                  <div className="bg-[#F8F8F8] dark:bg-neutral-800/60 rounded-xl p-4"><span className="text-[11px] font-semibold text-gray-400 uppercase">SESIONES TOTALES</span><p className="text-[28px] font-bold text-gray-900 dark:text-gray-100 leading-tight mb-1">{filteredSessionsByWeek.length}</p><p className="text-xs text-gray-400">{filteredSessionsByWeek.filter(s => s.status === 'active').length} activa(s)</p></div>
                  <div className="bg-[#F8F8F8] dark:bg-neutral-800/60 rounded-xl p-4"><span className="text-[11px] font-semibold text-gray-400 uppercase">VIAJES TOTALES</span><p className="text-[28px] font-bold text-gray-900 dark:text-gray-100 leading-tight mb-1">{filteredSessionsByWeek.reduce((s, x) => s + (x.totalTrips ?? 0), 0)}</p><p className="text-xs text-gray-400">Total acumulado</p></div>
                  <div className="bg-[#F8F8F8] dark:bg-neutral-800/60 rounded-xl p-4"><span className="text-[11px] font-semibold text-gray-400 uppercase">INGRESOS TOTALES</span><p className="text-[28px] font-bold text-gray-900 dark:text-gray-100 leading-tight mb-1">{formatCurrency(filteredSessionsByWeek.reduce((s, x) => s + ((x.totalCash ?? 0)), 0))}</p><p className="text-xs text-gray-400">Efectivo acumulado</p></div>
                  <div className="bg-[#F8F8F8] dark:bg-neutral-800/60 rounded-xl p-4"><span className="text-[11px] font-semibold text-gray-400 uppercase">PROMEDIO</span><p className="text-[28px] font-bold text-gray-900 dark:text-gray-100 leading-tight mb-1">{filteredSessionsByWeek.length > 0 ? formatCurrency(filteredSessionsByWeek.reduce((s, x) => s + ((x.totalCash ?? 0)), 0) / filteredSessionsByWeek.length) : '—'}</p><p className="text-xs text-gray-400">Efectivo / sesión</p></div>
                  <div className="bg-[#F8F8F8] dark:bg-neutral-800/60 rounded-xl p-4"><span className="text-[11px] font-semibold text-gray-400 uppercase">LIQUIDADO</span><p className="text-[28px] font-bold text-gray-900 dark:text-gray-100 leading-tight mb-1">{formatCurrency(totalLiquidado)}</p><p className="text-xs text-gray-400">Efectivo + Yape</p></div>
                </>
              )}
            </div>

            {/* TABLA DE SESIONES CON NAVEACIÓN POR SEMANA */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setWeekOffset((w: number) => w - 1)} className="h-7 w-7 p-0 rounded-lg"><ChevronDown className="w-4 h-4 rotate-90" /></Button>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{currentWeekLabel.label}</h3>
                <Button size="sm" variant="ghost" onClick={() => setWeekOffset((w: number) => w + 1)} className="h-7 w-7 p-0 rounded-lg"><ChevronDown className="w-4 h-4 -rotate-90" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setWeekOffset(0)} className="h-7 text-xs text-gray-400 rounded-lg">Hoy</Button>
                <span className="text-xs text-gray-400">· {filteredSessionsByWeek.length} turnos · {filteredSessionsByWeek.reduce((s, x) => s + (x.totalTrips ?? 0), 0)} viajes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" onClick={() => { switchTab('liquidacion'); setWeekOffset(0) }} className="h-7 text-xs rounded-lg border-gray-200 dark:border-neutral-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  <DollarSign className="w-3.5 h-3.5 mr-1" />Liquidación
                </Button>
                {activasEnRango > 0 && <Button size="sm" variant="ghost" onClick={handleCerrarTodas} disabled={closeMutation.isPending} className="rounded-full px-3 h-8 text-xs font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30">Cerrar {activasEnRango} activa(s)</Button>}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-neutral-800 overflow-hidden mb-6">
              <table className="w-full">
                    <thead><tr className="border-b border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900/50"><th className="py-2.5 px-4 text-left text-[11px] font-semibold text-gray-400 uppercase">Período</th><th className="py-2.5 px-4 text-center text-[11px] font-semibold text-gray-400 uppercase">Viajes</th><th className="py-2.5 px-4 text-right text-[11px] font-semibold text-gray-400 uppercase">Ingresos</th><th className="py-2.5 px-4 text-left text-[11px] font-semibold text-gray-400 uppercase">Estado</th><th className="py-2.5 px-4 w-10" /></tr></thead>
                <tbody>
                   {sessionsByWeek.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-gray-400 dark:text-gray-600"><Clock className="w-8 h-8 mx-auto mb-2 opacity-40" /><p className="text-sm">Sin sesiones esta semana</p></td></tr>
                  ) : sessionsByWeek[0].sessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).map(session => {
                    const startDate = new Date(session.startedAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
                    const startTime = formatTime(session.startedAt)
                    const endDate = session.closedAt ? new Date(session.closedAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : ''
                    const endTime = session.closedAt ? formatTime(session.closedAt) : '···'
                    const mismoDia = session.closedAt ? new Date(session.startedAt).toDateString() === new Date(session.closedAt).toDateString() : true
                    const periodoText = mismoDia ? `${startDate} ${startTime} → ${endTime}` : `${startDate} ${startTime} → ${endDate} ${endTime}`
                    const trips = session.totalTrips ?? 0; const amount = (session.totalCash ?? 0) ?? 0

                    return (
                      <tr key={session.id} onClick={() => {
                        if (session.status === 'closed' || session.status === 'settled') {
                          openLiquidarSesion(session)
                        }
                      }} className={cn('border-b border-gray-50 dark:border-neutral-800/50', (session.status === 'closed' || session.status === 'settled') && 'hover:bg-gray-50 dark:hover:bg-neutral-800/20 cursor-pointer transition-colors')}>
                        <td className="py-3 px-4"><p className="text-sm font-medium text-gray-900 dark:text-gray-100">{periodoText}</p></td>
                        <td className="py-3 px-4 text-center"><span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{trips}v</span></td>
                        <td className="py-3 px-4 text-right"><span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(amount)}</span></td>
                        <td className="py-3 px-4"><SessionStatusBadge status={session.status} /></td>
                        <td className="py-3 px-4">
                          {session.status === 'active' && <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); closeMutation.mutate(session.id) }} disabled={closeMutation.isPending} className="h-7 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-full">Cerrar</Button>}
                          {session.status === 'closed' && <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openLiquidarSesion(session) }} className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-full"><DollarSign className="w-3 h-3 mr-1" />Liquidar</Button>}
                          {session.status !== 'active' && (
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSessionToDelete(session); setDeleteReason(''); setShowDeleteConfirm(true) }} className="h-7 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full ml-1"><Trash2 className="w-3 h-3" /></Button>
                          )}
                        </td>
                      </tr>
                    )
                    })}
                </tbody>
              </table>
            </div>

            {/* RESULTADO DEL PERÍODO */}
            {metricasYango && (
              <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 overflow-hidden mb-6 bg-white dark:bg-neutral-950 shadow-sm">
                <div className="px-5 py-4 bg-gray-50 dark:bg-neutral-900/50 border-b border-gray-100 dark:border-neutral-800">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">Resultado del período{metricasYango.carBrandModel ? ' · ' + metricasYango.carBrandModel : ''}{metricasYango.placa ? ' · ' + metricasYango.placa : ''}</span>
                </div>

                <div className="p-5 space-y-5">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="rounded-xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
                      <div className="mb-3">
                        <span className="text-xs font-semibold text-gray-400 uppercase">Viajes</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metricasYango.totalViajes}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{metricasYango.viajesPorHora > 0 ? metricasYango.viajesPorHora.toFixed(1) + ' viajes/hora' : '—'}</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
                      <div className="mb-3">
                        <span className="text-xs font-semibold text-gray-400 uppercase">Producido</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(metricasYango.montoTotalProducido)}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Monto total</p>
                    </div>
                    <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
                      <div className="mb-3">
                        <span className="text-xs font-semibold text-emerald-600 uppercase">Efectivo</span>
                      </div>
                      <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(metricasYango.efectivo)}</p>
                      <p className="text-[11px] text-emerald-500 mt-0.5">Efectivo recolectado</p>
                    </div>
                    <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
                      <div className="mb-3">
                        <span className="text-xs font-semibold text-emerald-600 uppercase">Monto Neto</span>
                      </div>
                      <p className="text-2xl font-bold text-emerald-600">{formatCurrency(metricasYango.montoNeto)}</p>
                      <p className="text-[11px] text-emerald-500 mt-0.5">{fmtPercent(metricasYango.porcentajePago)}</p>
                    </div>
                  </div>

                  <button onClick={() => setResultadoExpandido(!resultadoExpandido)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                    {resultadoExpandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {resultadoExpandido ? 'Ocultar detalle' : 'Ver detalle'}
                  </button>

                  {resultadoExpandido && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="rounded-xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase">Comisión app</span>
                        <p className="text-lg font-bold text-red-500">{formatCurrency(metricasYango.comisionApp)}</p>
                      </div>
                      <div className="rounded-xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase">Bono Yango</span>
                        <p className="text-lg font-bold text-blue-600">{formatCurrency(metricasYango.bonoYango ?? 0)}</p>
                      </div>
                      <div className="rounded-xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase">Km recorridos</span>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{metricasYango.kmRecorrido.toFixed(1)} km</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{metricasYango.totalViajes > 0 ? (metricasYango.kmRecorrido / metricasYango.totalViajes).toFixed(1) + ' km/viaje' : ''}</p>
                      </div>
                      <div className="rounded-xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase">Utilidad</span>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(metricasYango.utilidad)}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{metricasYango.totalViajes > 0 ? formatCurrency(metricasYango.utilidadPorViaje) + ' /viaje' : ''}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-5 py-4 border-t border-gray-100 dark:border-neutral-800 space-y-2">
                  {metricasYango.semanaCerrada ? (
                    <>
                      <div className="w-full h-11 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 flex items-center justify-center text-sm font-medium text-red-600">
                        Esta semana ya fue liquidada. No se pueden generar nuevos turnos.
                      </div>
                      <Button onClick={() => limpiarFacturacionMutation.mutate()} disabled={limpiarFacturacionMutation.isPending}
                        className="w-full h-9 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800 text-xs font-medium">
                        {limpiarFacturacionMutation.isPending ? 'Limpiando...' : 'Limpiar cierre de semana'}
                      </Button>
                    </>
                  ) : (
                    <Button onClick={openCerrarTurno}
                      className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm shadow-emerald-200 dark:shadow-emerald-900/30">
                      Cerrar turno — {formatCurrency(metricasYango.efectivo)}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL DE LIQUIDAR */}
      {showLiquidarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowLiquidarModal(false)}>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
              <div>

                <h3 className="text-lg font-bold">{modalModo === 'turno' ? 'Cerrar turno' : editando ? 'Editar sesión' : isReadonly ? 'Detalle de sesión' : 'Liquidar sesión'}</h3>
                <p className="text-sm text-gray-400">
                  {modalModo === 'turno'
                    ? <>{metricasYango?.totalViajes ?? 0} viajes · {formatCurrency(metricasYango?.efectivo ?? 0)}{metricasYango?.carBrandModel ? <> · <Car className="w-3 h-3 inline mx-0.5" />{metricasYango.carBrandModel}</> : null}</>
                    : `${new Date(sessionALiquidar?.startedAt ?? '').toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })} · ${sessionALiquidar?.totalTrips} viajes · ${formatCurrency((sessionALiquidar?.totalCash ?? 0))}`
                  }
                </p>
              </div>
              <button onClick={() => setShowLiquidarModal(false)} className="text-gray-400 hover:text-gray-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            <div className="p-4 space-y-3 relative">
              {cargandoDetalle && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 dark:bg-neutral-900/80 rounded-xl gap-3">
                  <div className="w-8 h-8 border-[3px] border-gray-300 border-t-emerald-600 rounded-full animate-spin" />
                  <p className="text-sm text-gray-600 dark:text-gray-300">Cargando detalle de sesión...</p>
                </div>
              )}
              <div className={cn(cargandoDetalle && 'opacity-20 pointer-events-none')}>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-medium text-gray-500 uppercase">Placa</label><input type="text" value={cierreForm.placa} disabled className="w-full text-sm border border-gray-300 dark:border-neutral-600 rounded px-2 py-1 mt-0.5 bg-gray-100 dark:bg-neutral-700 cursor-not-allowed" /></div>
                <div />
                <div><label className="text-[10px] font-medium text-gray-500 uppercase">Odómetro inicial</label><input type="number" value={cierreForm.odometroInicial} onChange={e => setCierreForm(f => ({ ...f, odometroInicial: e.target.value }))} disabled={isReadonly} className={cn('w-full text-sm border border-gray-300 dark:border-neutral-600 rounded px-2 py-1 mt-0.5', isReadonly ? 'bg-gray-100 dark:bg-neutral-700 cursor-not-allowed' : 'bg-white dark:bg-neutral-800')} /></div>
                <div><label className="text-[10px] font-medium text-gray-500 uppercase">Odómetro final</label><input type="number" value={cierreForm.odometroFinal} onChange={e => setCierreForm(f => ({ ...f, odometroFinal: e.target.value }))} disabled={isReadonly} className={cn('w-full text-sm border border-gray-300 dark:border-neutral-600 rounded px-2 py-1 mt-0.5', isReadonly ? 'bg-gray-100 dark:bg-neutral-700 cursor-not-allowed' : 'bg-white dark:bg-neutral-800')} />{odometroDif !== 0 && <p className="text-[10px] text-gray-400 mt-0.5">Diferencia: {odometroDif} km</p>}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-medium text-gray-500 uppercase">GNV m³</label><input type="text" value={cierreForm.gnvM3} onChange={e => setCierreForm(f => ({ ...f, gnvM3: e.target.value }))} disabled={isReadonly} className={cn('w-full text-sm border border-gray-300 dark:border-neutral-600 rounded px-2 py-1 mt-0.5', isReadonly ? 'bg-gray-100 dark:bg-neutral-700 cursor-not-allowed' : 'bg-white dark:bg-neutral-800')} /></div>
                <div><label className="text-[10px] font-medium text-gray-500 uppercase">GNV soles</label><input type="number" value={cierreForm.gnvSoles} onChange={e => setCierreForm(f => ({ ...f, gnvSoles: e.target.value }))} disabled={isReadonly} className={cn('w-full text-sm border border-gray-300 dark:border-neutral-600 rounded px-2 py-1 mt-0.5', isReadonly ? 'bg-gray-100 dark:bg-neutral-700 cursor-not-allowed' : 'bg-white dark:bg-neutral-800')} /></div>
                <div><label className="text-[10px] font-medium text-gray-500 uppercase">Gasolina galones</label><input type="text" value={cierreForm.gasolinaGalones} onChange={e => setCierreForm(f => ({ ...f, gasolinaGalones: e.target.value }))} disabled={isReadonly} className={cn('w-full text-sm border border-gray-300 dark:border-neutral-600 rounded px-2 py-1 mt-0.5', isReadonly ? 'bg-gray-100 dark:bg-neutral-700 cursor-not-allowed' : 'bg-white dark:bg-neutral-800')} /></div>
                <div><label className="text-[10px] font-medium text-gray-500 uppercase">Gasolina soles</label><input type="number" value={cierreForm.gasolinaSoles} onChange={e => setCierreForm(f => ({ ...f, gasolinaSoles: e.target.value }))} disabled={isReadonly} className={cn('w-full text-sm border border-gray-300 dark:border-neutral-600 rounded px-2 py-1 mt-0.5', isReadonly ? 'bg-gray-100 dark:bg-neutral-700 cursor-not-allowed' : 'bg-white dark:bg-neutral-800')} /></div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div><label className="text-[10px] font-medium text-gray-500 uppercase">Efectivo</label><input type="number" value={cierreForm.liquidaEfectivo} onChange={e => setCierreForm(f => ({ ...f, liquidaEfectivo: e.target.value }))} disabled={isReadonly} className={cn('w-full text-sm border border-gray-300 dark:border-neutral-600 rounded px-2 py-1 mt-0.5', isReadonly ? 'bg-gray-100 dark:bg-neutral-700 cursor-not-allowed' : 'bg-white dark:bg-neutral-800')} /></div>
                <div className="col-span-2"><div className="grid grid-cols-2 gap-2"><div><label className="text-[10px] font-medium text-gray-500 uppercase">Yape</label><input type="number" value={cierreForm.liquidaYape} onChange={e => setCierreForm(f => ({ ...f, liquidaYape: e.target.value, operacionYape: parseFloat(e.target.value) > 0 ? f.operacionYape : '' }))} disabled={isReadonly} className={cn('w-full text-sm border border-gray-300 dark:border-neutral-600 rounded px-2 py-1 mt-0.5', isReadonly ? 'bg-gray-100 dark:bg-neutral-700 cursor-not-allowed' : 'bg-white dark:bg-neutral-800')} /></div><div><label className="text-[10px] font-medium text-gray-500 uppercase">Nro. Operación</label><input type="text" value={cierreForm.operacionYape} onChange={e => setCierreForm(f => ({ ...f, operacionYape: e.target.value }))} disabled={isReadonly || !(parseFloat(cierreForm.liquidaYape) > 0)} placeholder="N° de operación" className={cn('w-full text-sm border border-gray-300 dark:border-neutral-600 rounded px-2 py-1 mt-0.5', (isReadonly || !(parseFloat(cierreForm.liquidaYape) > 0)) ? 'bg-gray-100 dark:bg-neutral-700 cursor-not-allowed' : 'bg-white dark:bg-neutral-800')} /></div></div></div>
                <div><label className="text-[10px] font-medium text-gray-500 uppercase">Otros gastos</label><input type="number" value={cierreForm.otrosGastos} onChange={e => setCierreForm(f => ({ ...f, otrosGastos: e.target.value }))} disabled={isReadonly} className={cn('w-full text-sm border border-gray-300 dark:border-neutral-600 rounded px-2 py-1 mt-0.5', isReadonly ? 'bg-gray-100 dark:bg-neutral-700 cursor-not-allowed' : 'bg-white dark:bg-neutral-800')} /></div>
              </div>
              <div className="mt-3"><input type="text" value={cierreForm.otrosGastosDescripcion} onChange={e => setCierreForm(f => ({ ...f, otrosGastosDescripcion: e.target.value }))} disabled={isReadonly} placeholder="Descripción otros gastos" className={cn('w-full text-xs border border-gray-300 dark:border-neutral-600 rounded px-2 py-2.5', isReadonly ? 'bg-gray-100 dark:bg-neutral-700 cursor-not-allowed' : 'bg-white dark:bg-neutral-800')} /></div>

              <div className="border-t border-gray-100 dark:border-neutral-800 pt-3 space-y-1.5">
                <div className="flex justify-between"><span className="text-xs text-gray-500">Ingresos</span><span className="text-xs font-semibold text-emerald-600">{formatCurrency(ingresosModal)}</span></div>
                <div className="flex justify-between"><span className="text-xs text-gray-500">Gastos</span><span className="text-xs font-semibold text-red-500">{formatCurrency(totalGastos)}</span></div>
                <div className="flex justify-between"><span className="text-xs text-gray-500">Monto restante</span><span className={cn('text-xs font-bold', montoRestante >= 0 ? 'text-emerald-600' : 'text-red-600')}>{formatCurrency(montoRestante)}</span></div>
                <div className="flex justify-between"><span className="text-xs text-gray-500">Total liquidado (efectivo + yape)</span><span className="text-xs font-semibold">{formatCurrency(totalLiquidacion)}</span></div>
                {Math.abs(montoRestante - totalLiquidacion) > 0.01 && montoRestante > 0 && totalLiquidacion > 0 && <p className="text-[10px] text-red-500">Los montos no calzan. Diferencia: {formatCurrency(Math.abs(montoRestante - totalLiquidacion))}</p>}
              </div>
              </div>
            </div>

            {modalModo === 'sesion' && cierrePrevio && (
              <div className="px-5 pb-2 text-[11px] text-gray-400 space-y-0.5">
                <p>Registrado por {cierrePrevio.userName} — {new Date(cierrePrevio.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(cierrePrevio.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</p>
                {cierrePrevio.userNameModificado && (
                  <p>Modificado por {cierrePrevio.userNameModificado} — {new Date(cierrePrevio.updatedAt).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(cierrePrevio.updatedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</p>
                )}
              </div>
            )}

            {errorEdicion && (
              <div className="px-5 pb-2">
                <p className="text-[11px] text-red-500">{errorEdicion}</p>
              </div>
            )}

            {editando ? (
              <div className="px-5 py-3 bg-gray-50 dark:bg-neutral-800/50 flex gap-3 justify-end">
                <Button variant="outline" onClick={handleCancelarEdicion} disabled={guardandoCambios} className="rounded-xl text-sm">Cancelar</Button>
                <Button onClick={handleGuardarEdicion} disabled={guardandoCambios} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5">
                  {guardandoCambios ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </div>
            ) : (
              <div className="px-5 py-3 bg-gray-50 dark:bg-neutral-800/50 flex gap-3 justify-end">
                <Button variant="outline" onClick={() => { setShowLiquidarModal(false); setEditando(false) }} className="rounded-xl text-sm">Cancelar</Button>
                {modalModo === 'sesion' && isReadonly && (
                  <Button onClick={handleEditar} className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm px-5">
                    Editar
                  </Button>
                )}
                <Button onClick={modalModo === 'turno' ? handleCerrarTurno : handleLiquidarSesion} disabled={liquidando || isReadonly || cargandoDetalle} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-5">
                  {isReadonly ? 'Sesión liquidada' : cargandoDetalle ? 'Cargando...' : liquidando ? 'Liquidando...' : 'Confirmar liquidación'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE ELIMINAR */}
      {showDeleteConfirm && sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 dark:border-neutral-800">
              <h3 className="text-lg font-bold">Eliminar sesión</h3>
              <p className="text-sm text-gray-400 mt-1">
                {new Date(sessionToDelete.startedAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })} · {sessionToDelete.totalTrips} viajes · {formatCurrency((sessionToDelete.totalCash ?? 0))}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">¿Estás seguro? Esta acción liberará el rango de fechas y permitirá generar un nuevo turno.</p>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Motivo (opcional)</label>
                <input type="text" value={deleteReason} onChange={e => setDeleteReason(e.target.value)} placeholder="Ej: Datos incorrectos" className="w-full text-sm border border-gray-300 dark:border-neutral-600 rounded px-2 py-1.5 mt-1 bg-white dark:bg-neutral-800" />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-neutral-800/50 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setSessionToDelete(null) }} className="rounded-xl">Cancelar</Button>
              <Button onClick={() => deleteMutation.mutate({ sessionId: sessionToDelete.id, reason: deleteReason })} disabled={deleteMutation.isPending} className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold px-6">
                {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
