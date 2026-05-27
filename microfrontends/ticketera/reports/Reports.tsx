import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../shared/components/ui/Card'
import { Button } from '../shared/components/ui/Button'
import {
  BarChart as BarChartIcon,
  Users,
  Download,
  RefreshCw,
  Star,
  Award,
  Target,
  UserCheck,
  ThumbsUp,
  MessageSquare,
  ChevronDown,
  FileSpreadsheet,
  Image,
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Building2,
  Filter,
  MapPin
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts'
import { reportsService, ReportData, ReportFilters, SACPerformance } from './services/reportsService'
import { sedesService, SedeInfo } from './services/sedesService'

interface SedeGroup {
  sedeId: number | null;
  sedeName: string;
  sacs: SACPerformance[];
  totalTickets: number;
  completedTickets: number;
  averageRating: number;
  totalRatings: number;
  satisfactionPercentage: number;
}

const SEDE_COLORS = [
  { bg: 'from-blue-500/10 to-blue-600/5', border: 'border-blue-200 dark:border-blue-800', accent: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
  { bg: 'from-emerald-500/10 to-emerald-600/5', border: 'border-emerald-200 dark:border-emerald-800', accent: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  { bg: 'from-violet-500/10 to-violet-600/5', border: 'border-violet-200 dark:border-violet-800', accent: 'text-violet-600 dark:text-violet-400', dot: 'bg-violet-500' },
  { bg: 'from-amber-500/10 to-amber-600/5', border: 'border-amber-200 dark:border-amber-800', accent: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  { bg: 'from-rose-500/10 to-rose-600/5', border: 'border-rose-200 dark:border-rose-800', accent: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
  { bg: 'from-cyan-500/10 to-cyan-600/5', border: 'border-cyan-200 dark:border-cyan-800', accent: 'text-cyan-600 dark:text-cyan-400', dot: 'bg-cyan-500' },
];

const Reports: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [fechaInicio, setFechaInicio] = useState<string>('')
  const [fechaFin, setFechaFin] = useState<string>('')
  const [datosCargados, setDatosCargados] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedSede, setSelectedSede] = useState<string>('todas')
  const [showSedeFilter, setShowSedeFilter] = useState(false)
  const [sedes, setSedes] = useState<SedeInfo[]>([])
  const datePickerRef = useRef<HTMLDivElement>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const sedeFilterRef = useRef<HTMLDivElement>(null)
  const hasLoadedRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)

  const sedeGroups = useMemo<SedeGroup[]>(() => {
    const groups = new Map<string, SedeGroup>();

    for (const sede of sedes) {
      groups.set(sede.id.toString(), {
        sedeId: sede.id,
        sedeName: sede.name,
        sacs: [],
        totalTickets: 0,
        completedTickets: 0,
        averageRating: 0,
        totalRatings: 0,
        satisfactionPercentage: 0,
      });
    }

    if (reportData?.sacPerformance) {
      for (const sac of reportData.sacPerformance) {
        const key = sac.sedeId?.toString() ?? 'sin-sede';
        if (key === 'sin-sede') continue;
        const name = sac.sedeName || 'Sin sede';

        if (!groups.has(key)) {
          groups.set(key, {
            sedeId: sac.sedeId,
            sedeName: name,
            sacs: [],
            totalTickets: 0,
            completedTickets: 0,
            averageRating: 0,
            totalRatings: 0,
            satisfactionPercentage: 0,
          });
        }
        const group = groups.get(key)!;
        group.sacs.push(sac);
        group.totalTickets += sac.totalTickets;
        group.completedTickets += sac.completedTickets;
        group.totalRatings += sac.totalRatings;
      }
    }

    for (const group of groups.values()) {
      group.averageRating = group.totalRatings > 0
        ? Math.round((group.sacs.reduce((sum, s) => sum + s.averageRating * s.totalRatings, 0) / group.totalRatings) * 10) / 10
        : 0;
      group.satisfactionPercentage = group.totalTickets > 0
        ? Math.round((group.completedTickets / group.totalTickets) * 100)
        : 0;
    }

    return Array.from(groups.values()).sort((a, b) => a.sedeName.localeCompare(b.sedeName));
  }, [reportData, sedes]);

  const filteredGroups = useMemo(() => {
    if (selectedSede === 'todas') return sedeGroups;
    return sedeGroups.filter(g => g.sedeId?.toString() === selectedSede);
  }, [sedeGroups, selectedSede]);

  const globalStats = useMemo(() => {
    return {
      totalSACs: selectedSede === 'todas'
        ? (reportData?.totalSACs ?? 0)
        : (filteredGroups[0]?.sacs.length ?? 0),
      totalTickets: reportData?.totalTickets ?? 0,
      averageRating: reportData?.averageRating ?? 0,
      totalRatings: reportData?.totalRatings ?? 0,
    };
  }, [reportData, selectedSede, filteredGroups]);

  const globalTopPerformers = useMemo(() => {
    if (selectedSede === 'todas') return reportData?.topPerformers ?? [];
    const group = filteredGroups[0];
    if (!group) return [];
    return group.sacs
      .filter(s => s.totalTickets > 0)
      .sort((a, b) => b.satisfactionPercentage - a.satisfactionPercentage)
      .slice(0, 3);
  }, [reportData, selectedSede, filteredGroups]);

  const hourlyBySedeData = useMemo(() => {
    if (!reportData?.hourlyBySede || reportData.hourlyBySede.length === 0) return null;
    const hours = Array.from({ length: 24 }, (_, h) => {
      const entry: Record<string, string | number> = { hour: h, label: reportData.hourlyDistribution?.[h]?.label ?? `${h}h` };
      for (const sede of reportData.hourlyBySede) {
        entry[sede.sedeName] = sede.hourlyDistribution[h]?.count ?? 0;
      }
      return entry;
    });
    return { hours, sedes: reportData.hourlyBySede.map(s => s.sedeName) };
  }, [reportData]);

  useEffect(() => {
    const manejarClicExterno = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false)
      }
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false)
      }
      if (sedeFilterRef.current && !sedeFilterRef.current.contains(event.target as Node)) {
        setShowSedeFilter(false)
      }
    }

    document.addEventListener('mousedown', manejarClicExterno)
    return () => document.removeEventListener('mousedown', manejarClicExterno)
  }, [])

  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const diasSemana = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  
  const formatearFechaLocal = (fecha: Date): string => {
    const año = fecha.getFullYear()
    const mes = String(fecha.getMonth() + 1).padStart(2, '0')
    const dia = String(fecha.getDate()).padStart(2, '0')
    return `${año}-${mes}-${dia}`
  }

  const parsearFechaLocal = (fechaStr: string): Date => {
    const [año, mes, dia] = fechaStr.split('-').map(Number)
    return new Date(año, mes - 1, dia)
  }
  
  const obtenerDiasDelMes = (fecha: Date) => {
    const año = fecha.getFullYear()
    const mes = fecha.getMonth()
    const primerDia = new Date(año, mes, 1)
    const ultimoDia = new Date(año, mes + 1, 0)
    const diasEnMes = ultimoDia.getDate()
    const diaInicioSemana = (primerDia.getDay() + 6) % 7

    const dias: (number | null)[] = []
    for (let i = 0; i < diaInicioSemana; i++) {
      dias.push(null)
    }
    for (let i = 1; i <= diasEnMes; i++) {
      dias.push(i)
    }
    
    return dias
  }

  const esFechaFutura = (dia: number) => {
    const fecha = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dia)
    const hoy = new Date()
    hoy.setHours(23, 59, 59, 999)
    return fecha > hoy
  }

  const seleccionarFecha = (dia: number) => {
    const fechaSeleccionada = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dia)
    const fechaStr = formatearFechaLocal(fechaSeleccionada)
    
    if (esFechaFutura(dia)) return

    if (!fechaInicio || (fechaInicio && fechaFin)) {
      setFechaInicio(fechaStr)
      setFechaFin('')
    } else if (fechaStr < fechaInicio) {
      setFechaInicio(fechaStr)
      setFechaFin('')
    } else {
      setFechaFin(fechaStr)
    }
  }

  const formatearRangoFechas = () => {
    if (!fechaInicio && !fechaFin) return 'Seleccionar rango de fechas'
    if (!fechaFin) {
      const fecha = parsearFechaLocal(fechaInicio)
      return `${fecha.getDate()} de ${meses[fecha.getMonth()].toLowerCase()}`
    }
    const inicio = parsearFechaLocal(fechaInicio)
    const fin = parsearFechaLocal(fechaFin)
    if (inicio.getMonth() === fin.getMonth()) {
      return `${inicio.getDate()}-${fin.getDate()} de ${meses[inicio.getMonth()].toLowerCase()}`
    }
    return `${inicio.getDate()} ${meses[inicio.getMonth()].toLowerCase()} - ${fin.getDate()} ${meses[fin.getMonth()].toLowerCase()}`
  }

  const esFechaEnRango = (dia: number) => {
    if (!fechaInicio || !fechaFin) return false
    const fecha = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dia)
    const fechaStr = formatearFechaLocal(fecha)
    return fechaStr >= fechaInicio && fechaStr <= fechaFin
  }

  const esFechaInicio = (dia: number) => {
    if (!fechaInicio) return false
    const fecha = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dia)
    const fechaStr = formatearFechaLocal(fecha)
    return fechaStr === fechaInicio
  }

  const esFechaFin = (dia: number) => {
    if (!fechaFin) return false
    const fecha = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dia)
    const fechaStr = formatearFechaLocal(fecha)
    return fechaStr === fechaFin
  }

  const cambiarMes = (direccion: 'anterior' | 'siguiente') => {
    setCurrentMonth(prev => {
      const nuevoMes = new Date(prev)
      if (direccion === 'anterior') {
        nuevoMes.setMonth(prev.getMonth() - 1)
      } else {
        const mesSiguiente = new Date(prev)
        mesSiguiente.setMonth(prev.getMonth() + 1)
        const hoy = new Date()
        if (mesSiguiente.getFullYear() > hoy.getFullYear() || 
            (mesSiguiente.getFullYear() === hoy.getFullYear() && mesSiguiente.getMonth() > hoy.getMonth())) {
          return prev
        }
        nuevoMes.setMonth(prev.getMonth() + 1)
      }
      return nuevoMes
    })
  }

  const obtenerFechasParaPeticion = () => {
    if (fechaInicio && fechaFin) {
      return { fechaInicio, fechaFin }
    }
    return {}
  }

  const construirFiltros = (extra?: Partial<ReportFilters>): ReportFilters => {
    const effectiveSedeId = selectedSede !== 'todas' ? Number(selectedSede) : undefined
    return {
      ...obtenerFechasParaPeticion(),
      ...(effectiveSedeId ? { sedeId: effectiveSedeId } : {}),
      ...(extra ?? {}),
    }
  }

  const loadReportData = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    const currentRequestId = ++requestIdRef.current

    try {
      setLoading(true)
      const params = construirFiltros()
      const data = await reportsService.getSACPerformanceReports(params, abortController.signal)
      if (currentRequestId !== requestIdRef.current) return
      setReportData(data)
      setDatosCargados(true)
    } catch (error: any) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return
      console.error('[Reports] Error cargando datos de reportes:', error)
      if (currentRequestId !== requestIdRef.current) return
      setReportData({
        totalSACs: 0, totalTickets: 0, averageRating: 0, totalRatings: 0,
        sacPerformance: [], topPerformers: [], recentRatings: [], hourlyDistribution: [], hourlyBySede: []
      })
      setDatosCargados(false)
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }

  const cargarHistorialCompleto = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    const currentRequestId = ++requestIdRef.current

    try {
      setLoading(true)
      setDatosCargados(false)
      setShowDatePicker(false)
      setSelectedSede('todas')
      const data = await reportsService.obtenerTodoElHistorial(undefined, abortController.signal)
      if (currentRequestId !== requestIdRef.current) return
      setReportData(data)
      setDatosCargados(true)
      setFechaInicio('')
      setFechaFin('')
    } catch (error: any) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return
      console.error('[Reports] Error cargando historial completo:', error)
      if (currentRequestId !== requestIdRef.current) return
      setReportData({
        totalSACs: 0, totalTickets: 0, averageRating: 0, totalRatings: 0,
        sacPerformance: [], topPerformers: [], recentRatings: [], hourlyDistribution: [], hourlyBySede: []
      })
      setDatosCargados(false)
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true

    sedesService.listarSedesActivas().then(setSedes).catch(() => {})
    cargarHistorialCompleto()
  }, [])

  useEffect(() => {
    loadReportData()
  }, [selectedSede])

  useEffect(() => {
    if (!fechaInicio || !fechaFin) return
    if (new Date(fechaInicio) > new Date(fechaFin)) return
    const timer = setTimeout(() => { loadReportData() }, 300)
    return () => clearTimeout(timer)
  }, [fechaInicio, fechaFin])

  const descargarArchivo = (blob: Blob, nombreArchivo: string) => {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = nombreArchivo
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const exportarReporte = async (tipo: 'excel' | 'imagen', formato?: string) => {
    try {
      setExporting(true)
      setShowExportMenu(false)
      const tieneFechas = fechaInicio && fechaFin
      const params = construirFiltros()
      const tieneFiltros = tieneFechas || params.sedeId !== undefined
      let blob: Blob
      let extension: string
      if (tipo === 'excel') {
        blob = await reportsService.exportarAExcel(tieneFiltros ? params : undefined)
        extension = 'xlsx'
      } else {
        blob = await reportsService.exportarAImagen(formato || 'png', tieneFiltros ? params : undefined)
        extension = formato || 'png'
      }
      const dateRange = tieneFechas ? `${fechaInicio}_${fechaFin}` : 'historial_completo'
      const nombreArchivo = `reporte_sac_${dateRange}.${extension}`
      descargarArchivo(blob, nombreArchivo)
    } catch (error) {
      console.error(`[Reports] Error exportando a ${tipo}:`, error)
      alert(`Error al exportar a ${tipo === 'excel' ? 'Excel' : formato}.`)
    } finally {
      setExporting(false)
    }
  }

  const exportarAExcel = () => exportarReporte('excel')
  const exportarAImagen = (formato: string) => exportarReporte('imagen', formato)

  if (loading && !datosCargados) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-slate-600 dark:text-slate-400 mx-auto mb-4" />
              <p className="text-lg text-slate-600 dark:text-slate-400">Procesando datos de reportes...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3">
              Reporte de Desempeño SAC
              {selectedSede !== 'todas' && (
                <span className="text-lg font-normal text-slate-500 dark:text-slate-400 ml-2">
                  — {sedes.find(s => s.id.toString() === selectedSede)?.name ?? ''}
                </span>
              )}
            </h1>
            <div className="flex items-center gap-2 flex-nowrap">
              {loading && datosCargados && (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-400 dark:text-slate-500" />
              )}
              {/* Sede filter */}
              {sedes.length > 0 && (
                <div className="relative" ref={sedeFilterRef}>
                  <button
                    type="button"
                    onClick={() => setShowSedeFilter(!showSedeFilter)}
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>{selectedSede === 'todas' ? 'Todas las sedes' : sedes.find(s => s.id.toString() === selectedSede)?.name ?? 'Sede'}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showSedeFilter ? 'rotate-180' : ''}`} />
                  </button>
                  {showSedeFilter && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50">
                      <button
                        onClick={() => { setSelectedSede('todas'); setShowSedeFilter(false); }}
                        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 ${selectedSede === 'todas' ? 'bg-slate-100 dark:bg-slate-700 font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}
                      >
                        <Filter className="w-4 h-4" />
                        Todas las sedes
                      </button>
                      {sedes.map((sede, i) => (
                        <button
                          key={sede.id}
                          onClick={() => { setSelectedSede(sede.id.toString()); setShowSedeFilter(false); }}
                          className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 ${selectedSede === sede.id.toString() ? 'bg-slate-100 dark:bg-slate-700 font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}
                        >
                          <div className={`w-2.5 h-2.5 rounded-full ${SEDE_COLORS[i % SEDE_COLORS.length].dot}`} />
                          {sede.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Date picker */}
              <div className="relative flex items-center gap-2" ref={datePickerRef}>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 focus:border-transparent flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span className={fechaInicio && fechaFin ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}>
                      {formatearRangoFechas()}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform ml-2 ${showDatePicker ? 'rotate-180' : ''}`} />
                </button>
                {(fechaInicio || fechaFin) && (
                  <button
                    type="button"
                    onClick={() => { setFechaInicio(''); setFechaFin(''); setShowDatePicker(false); loadReportData(); }}
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-red-600 dark:hover:text-red-400 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <X className="w-4 h-4" /> Limpiar fechas
                  </button>
                )}
                {showDatePicker && (
                  <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-5 z-50">
                    <div className="flex items-center justify-between mb-4">
                      <button onClick={() => cambiarMes('anterior')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                        <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                      </button>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {meses[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                      </h3>
                      <button
                        onClick={() => cambiarMes('siguiente')}
                        disabled={(() => {
                          const mesSiguiente = new Date(currentMonth)
                          mesSiguiente.setMonth(currentMonth.getMonth() + 1)
                          const hoy = new Date()
                          return mesSiguiente.getFullYear() > hoy.getFullYear() || 
                                 (mesSiguiente.getFullYear() === hoy.getFullYear() && mesSiguiente.getMonth() > hoy.getMonth())
                        })()}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-2 mb-3">
                      {diasSemana.map((dia, i) => (
                        <div key={i} className="text-center text-sm font-medium text-slate-600 dark:text-slate-400 py-2">{dia}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {obtenerDiasDelMes(currentMonth).map((dia, i) => {
                        if (dia === null) return <div key={i} className="py-2"></div>
                        const esFutura = esFechaFutura(dia)
                        const estaEnRango = esFechaEnRango(dia)
                        const esInicio = esFechaInicio(dia)
                        const esFin = esFechaFin(dia)
                        return (
                          <button
                            key={i}
                            onClick={() => seleccionarFecha(dia)}
                            disabled={esFutura}
                            className={`py-2.5 rounded text-sm transition-colors ${
                              esFutura ? 'opacity-30 cursor-not-allowed text-slate-400 dark:text-slate-600'
                              : esInicio || esFin ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold'
                              : estaEnRango ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {dia}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Export */}
              <div className="relative" ref={exportMenuRef}>
                <Button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={exporting || !datosCargados}
                  variant="ghost"
                  className={`border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center ${!datosCargados ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Exportar <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
                    <button onClick={exportarAExcel} className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center">
                      <FileSpreadsheet className="w-4 h-4 mr-3 text-green-600 dark:text-green-400" /> Exportar a Excel
                    </button>
                    <button onClick={() => exportarAImagen('png')} className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center">
                      <Image className="w-4 h-4 mr-3 text-slate-600 dark:text-slate-400" /> Exportar como PNG
                    </button>
                    <button onClick={() => exportarAImagen('jpg')} className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center">
                      <Image className="w-4 h-4 mr-3 text-slate-600 dark:text-slate-400" /> Exportar como JPG
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {datosCargados && reportData ? (
          <>
            {/* Global Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total SAC', value: globalStats.totalSACs, icon: Users, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
                { label: 'Total Tickets', value: globalStats.totalTickets, icon: BarChartIcon, color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
                { label: 'Calificación Promedio', value: `${globalStats.averageRating}/5`, icon: Star, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
                { label: 'Total Valoraciones', value: globalStats.totalRatings, icon: ThumbsUp, color: 'from-violet-500 to-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30' },
              ].map((metric, i) => {
                const IconComponent = metric.icon
                return (
                  <Card key={i} className="border-slate-200 dark:border-slate-700 overflow-hidden">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{metric.label}</p>
                          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{metric.value}</p>
                        </div>
                        <div className={`w-12 h-12 ${metric.bg} rounded-xl flex items-center justify-center`}>
                          <IconComponent className={`w-6 h-6 bg-gradient-to-br ${metric.color} bg-clip-text text-transparent`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Top Performers */}
            {globalTopPerformers.length > 0 && selectedSede !== 'todas' && (
              <Card className="mb-8 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-slate-900 dark:text-slate-100">
                    <Award className="w-6 h-6 text-yellow-500" />
                    <span>Top 3 Mejores SAC {selectedSede !== 'todas' ? `— ${sedes.find(s => s.id.toString() === selectedSede)?.name ?? ''}` : ''}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {globalTopPerformers.map((sac, idx) => (
                      <div key={sac.id} className={`bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-6 border border-slate-200 dark:border-slate-600 ${idx === 0 ? 'ring-2 ring-yellow-400 dark:ring-yellow-500' : ''}`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' : idx === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-500' : 'bg-gradient-to-br from-amber-600 to-amber-700'}`}>
                              #{idx + 1}
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{sac.name}</h3>
                              <p className="text-sm text-slate-500 dark:text-slate-400">@{sac.username}</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600 dark:text-slate-400">Completados</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{sac.completedTickets}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600 dark:text-slate-400">Calificación</span>
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              <span className="font-semibold text-slate-900 dark:text-slate-100">{sac.averageRating}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600 dark:text-slate-400">Rendimiento</span>
                            <span className="font-semibold text-green-600 dark:text-green-400">{sac.satisfactionPercentage}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resumen General - solo en modo "Todas las sedes" */}
            {selectedSede === 'todas' && sedeGroups.length > 0 && (
              <>
                {/* Demanda por Sede */}
                <Card className="mb-8 border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-slate-900 dark:text-slate-100">
                      <BarChartIcon className="w-6 h-6 text-blue-500" />
                      <span>Demanda por Sede</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={Math.max(sedeGroups.length * 50, 180)}>
                      <BarChart
                        data={[...sedeGroups]
                          .sort((a, b) => b.totalTickets - a.totalTickets)
                          .map(g => ({ name: g.sedeName, tickets: g.totalTickets, completados: g.completedTickets, agentes: g.sacs.length }))}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" horizontal={false} />
                        <XAxis type="number" className="text-xs text-slate-500" />
                        <YAxis dataKey="name" type="category" className="text-xs text-slate-500" width={90} />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#1e293b' }}
                          formatter={(value: number, name: string) => [value, name === 'tickets' ? 'Tickets' : 'Completados']}
                        />
                        <Bar dataKey="tickets" radius={[0, 6, 6, 0]} barSize={18}>
                          {[...sedeGroups]
                            .sort((a, b) => b.totalTickets - a.totalTickets)
                            .map((g, i) => (
                              <Cell key={g.sedeId ?? i} fill={i === 0 && g.totalTickets > 0 ? '#ef4444' : '#3b82f6'} />
                            ))}
                        </Bar>
                        <Bar dataKey="completados" radius={[0, 6, 6, 0]} barSize={18}>
                          {[...sedeGroups]
                            .sort((a, b) => b.totalTickets - a.totalTickets)
                            .map((g, i) => (
                              <Cell key={g.sedeId ?? i} fill={i === 0 && g.totalTickets > 0 ? '#fca5a5' : '#93c5fd'} />
                            ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    {(() => {
                      const pico = [...sedeGroups].sort((a, b) => b.totalTickets - a.totalTickets)[0];
                      return pico && pico.totalTickets > 0 ? (
                        <div className="mt-3 flex items-center gap-2 text-sm">
                          <span className="w-3 h-3 bg-red-500 rounded-full inline-block" />
                          <span className="text-slate-600 dark:text-slate-400">
                            Pico máximo: <strong className="text-slate-900 dark:text-slate-100">{pico.sedeName}</strong> con <strong className="text-red-500">{pico.totalTickets}</strong> tickets
                            {pico.sacs.length > 0 && <> ({pico.sacs.length} agentes)</>}
                          </span>
                        </div>
                      ) : null;
                    })()}
                  </CardContent>
                </Card>

                {/* Satisfacción por Sede */}
                <Card className="mb-8 border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-slate-900 dark:text-slate-100">
                      <Star className="w-6 h-6 text-amber-500" />
                      <span>Satisfacción por Sede</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sedeGroups.filter(g => g.totalRatings > 0).length > 0 ? (
                      <ResponsiveContainer width="100%" height={Math.max(sedeGroups.filter(g => g.totalRatings > 0).length * 50, 180)}>
                        <BarChart
                          data={[...sedeGroups]
                            .filter(g => g.totalRatings > 0)
                            .sort((a, b) => b.averageRating - a.averageRating)
                            .map(g => ({ name: g.sedeName, rating: g.averageRating, ratings: g.totalRatings }))}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" horizontal={false} />
                          <XAxis type="number" domain={[0, 5]} className="text-xs text-slate-500" />
                          <YAxis dataKey="name" type="category" className="text-xs text-slate-500" width={90} />
                          <Tooltip
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#1e293b' }}
                            formatter={(value: number, name: string) => [name === 'rating' ? `${value}/5` : value, name === 'rating' ? 'Calificación' : 'Valoraciones']}
                          />
                          <Bar dataKey="rating" radius={[0, 6, 6, 0]} barSize={20} fill="#f59e0b" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-center text-slate-400 dark:text-slate-500 py-8 text-sm">Sin valoraciones registradas</p>
                    )}
                  </CardContent>
                </Card>

                {/* Tickets por Hora por Sede */}
                {hourlyBySedeData && (
                  <Card className="mb-8 border-slate-200 dark:border-slate-700">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-slate-900 dark:text-slate-100">
                        <BarChartIcon className="w-6 h-6 text-emerald-500" />
                        <span>Tickets por Hora — Desglose por Sede</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={hourlyBySedeData.hours}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                          <XAxis dataKey="label" className="text-xs text-slate-500" />
                          <YAxis className="text-xs text-slate-500" allowDecimals={false} />
                          <Tooltip
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#1e293b' }}
                          />
                          <Legend />
                          {hourlyBySedeData.sedes.map((sedeName, i) => {
                            const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
                            return (
                              <Bar key={sedeName} dataKey={sedeName} fill={colors[i % colors.length]} radius={[2, 2, 0, 0]} barSize={12} stackId="hour" />
                            );
                          })}
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Tickets por Hora - para ambos modos */}
            <Card className="mb-8 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-slate-900 dark:text-slate-100">
                  <BarChartIcon className="w-6 h-6 text-violet-500" />
                  <span>Tickets Atendidos por Hora {selectedSede !== 'todas' ? `— ${sedes.find(s => s.id.toString() === selectedSede)?.name ?? ''}` : ''}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reportData?.hourlyDistribution && reportData.hourlyDistribution.some(h => h.count > 0) ? (
                  <>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={reportData.hourlyDistribution}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                        <XAxis dataKey="label" className="text-xs text-slate-500" />
                        <YAxis className="text-xs text-slate-500" allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#1e293b' }}
                          formatter={(value: number) => [`${value} tickets`, 'Atendidos']}
                        />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={20}>
                          {reportData.hourlyDistribution.map((entry) => {
                            const max = Math.max(...reportData.hourlyDistribution!.map(h => h.count), 1);
                            const isPeak = entry.count === max && entry.count > 0;
                            return <Cell key={entry.hour} fill={isPeak ? '#ef4444' : '#8b5cf6'} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    {(() => {
                      const peak = [...reportData.hourlyDistribution].sort((a, b) => b.count - a.count)[0];
                      return peak && peak.count > 0 ? (
                        <div className="mt-3 flex items-center gap-2 text-sm">
                          <span className="w-3 h-3 bg-red-500 rounded-full inline-block" />
                          <span className="text-slate-600 dark:text-slate-400">
                            Hora pico: <strong className="text-slate-900 dark:text-slate-100">{peak.label}</strong> con <strong className="text-red-500">{peak.count}</strong> tickets
                          </span>
                        </div>
                      ) : null;
                    })()}
                  </>
                ) : (
                  <p className="text-center text-slate-400 dark:text-slate-500 py-12 text-sm">
                    {reportData?.hourlyDistribution ? 'Sin tickets registrados en este rango' : 'Selecciona un rango de fechas para ver la distribución horaria'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Sede Sections - solo cuando se selecciona una sede específica */}
            {selectedSede !== 'todas' && filteredGroups.map((group, groupIndex) => {
              const colorScheme = SEDE_COLORS[groupIndex % SEDE_COLORS.length];
              const sedeRatings = group.sacs
                .flatMap(s => s.ratings.map(r => ({ ...r, sacName: s.name })))
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 6);
              return (
                <div key={group.sedeId ?? 'sin-sede'} className="mb-8">
                  {/* Sede Header */}
                  <div className={`bg-gradient-to-r ${colorScheme.bg} rounded-xl border ${colorScheme.border} p-5 mb-4`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${colorScheme.bg} border ${colorScheme.border} flex items-center justify-center`}>
                          <MapPin className={`w-5 h-5 ${colorScheme.accent}`} />
                        </div>
                        <div>
                          <h2 className={`text-xl font-bold ${colorScheme.accent}`}>{group.sedeName}</h2>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{group.sacs.length} agentes SAC</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        <div className="text-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Tickets</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{reportData?.totalTickets ?? group.totalTickets}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Completados</p>
                          <p className="text-lg font-bold text-green-600 dark:text-green-400">{group.completedTickets}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Calificación</p>
                          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{reportData?.averageRating ?? group.averageRating}/5</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Satisfacción</p>
                          <p className="text-lg font-bold text-violet-600 dark:text-violet-400">{group.satisfactionPercentage}%</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SAC Table per Sede */}
                  <Card className="border-slate-200 dark:border-slate-700">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 text-lg">
                        <Target className="w-5 h-5 text-red-500" />
                        <span>Desempeño por agente</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {group.sacs.length === 0 ? (
                        <p className="text-center text-slate-400 dark:text-slate-500 py-8 text-sm">Sin actividad en esta sede</p>
                      ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b-2 border-slate-200 dark:border-slate-600">
                              <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 text-sm">Agente</th>
                              <th className="text-center py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 text-sm">Total</th>
                              <th className="text-center py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 text-sm">Completados</th>
                              <th className="text-center py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 text-sm">Calificación</th>
                              <th className="text-center py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 text-sm">Satisfacción</th>
                              <th className="text-center py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 text-sm">T. Respuesta</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.sacs.map((sac) => (
                              <tr key={sac.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="py-4 px-4">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-9 h-9 bg-gradient-to-br from-slate-400 to-slate-500 rounded-full flex items-center justify-center">
                                      <span className="text-white font-semibold text-xs">{sac.name.charAt(0)}</span>
                                    </div>
                                    <div>
                                      <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{sac.name}</p>
                                      <p className="text-xs text-slate-500 dark:text-slate-400">@{sac.username}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="text-center py-4 px-4"><span className="font-semibold text-slate-900 dark:text-slate-100">{sac.totalTickets}</span></td>
                                <td className="text-center py-4 px-4"><span className="font-semibold text-green-600 dark:text-green-400">{sac.completedTickets}</span></td>
                                <td className="text-center py-4 px-4">
                                  <div className="flex items-center justify-center space-x-1">
                                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                                    <span className="font-semibold text-slate-900 dark:text-slate-100">{sac.averageRating}</span>
                                    <span className="text-xs text-slate-400">({sac.totalRatings})</span>
                                  </div>
                                </td>
                                <td className="text-center py-4 px-4">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="w-16 h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full ${sac.satisfactionPercentage >= 80 ? 'bg-green-500' : sac.satisfactionPercentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${sac.satisfactionPercentage}%` }} />
                                    </div>
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{sac.satisfactionPercentage}%</span>
                                  </div>
                                </td>
                                <td className="text-center py-4 px-4"><span className="text-sm text-slate-500 dark:text-slate-400">{sac.averageResponseTime}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Ratings per Sede */}
                  {sedeRatings.length > 0 && (
                    <Card className="border-slate-200 dark:border-slate-700 mt-4">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 text-lg">
                          <MessageSquare className="w-5 h-5 text-green-500" />
                          <span>Valoraciones Recientes</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {sedeRatings.map((rating) => (
                            <div key={rating.id} className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 rounded-full flex items-center justify-center">
                                    <UserCheck className="w-5 h-5 text-red-600 dark:text-red-400" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{rating.sacName}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Ticket {rating.ticketNumber}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`w-4 h-4 ${i < rating.score ? 'text-yellow-500 fill-current' : 'text-slate-300 dark:text-slate-600'}`} />
                                  ))}
                                  <span className="ml-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{rating.score}/5</span>
                                </div>
                                <span className="text-xs text-slate-400">{rating.date}</span>
                              </div>
                              {rating.comment && (
                                <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                                  <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{rating.comment}"</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <Card className="mb-8 border-slate-200 dark:border-slate-700">
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No hay datos cargados</h3>
              <p className="text-slate-500 dark:text-slate-400">Selecciona un rango de fechas para ver los reportes</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default Reports