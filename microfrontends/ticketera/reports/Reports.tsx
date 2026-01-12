import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../shared/components/ui/Card'
import { Button } from '../shared/components/ui/Button'
import { 
  BarChart3, 
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
  X
} from 'lucide-react'
import { reportsService, ReportData } from './services/reportsService'

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
  const datePickerRef = useRef<HTMLDivElement>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const hasLoadedRef = useRef(false)

  // 🎯 CERRAR MENÚ AL HACER CLIC FUERA
  useEffect(() => {
    const manejarClicExterno = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false)
      }
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false)
      }
    }

    document.addEventListener('mousedown', manejarClicExterno)
    return () => document.removeEventListener('mousedown', manejarClicExterno)
  }, [])

  // 🎯 FUNCIONES PARA EL CALENDARIO
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const diasSemana = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  
  // Función para formatear fecha sin conversión UTC (mantiene fecha local)
  const formatearFechaLocal = (fecha: Date): string => {
    const año = fecha.getFullYear()
    const mes = String(fecha.getMonth() + 1).padStart(2, '0')
    const dia = String(fecha.getDate()).padStart(2, '0')
    return `${año}-${mes}-${dia}`
  }

  // Función para parsear fecha YYYY-MM-DD como fecha local (sin conversión UTC)
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
    const diaInicioSemana = (primerDia.getDay() + 6) % 7 // Ajustar para que Lunes = 0
    
    const dias: (number | null)[] = []
    // Agregar días vacíos al inicio
    for (let i = 0; i < diaInicioSemana; i++) {
      dias.push(null)
    }
    // Agregar días del mes
    for (let i = 1; i <= diasEnMes; i++) {
      dias.push(i)
    }
    
    return dias
  }

  // 🎯 FUNCIÓN PARA VERIFICAR SI UNA FECHA ES FUTURA
  const esFechaFutura = (dia: number) => {
    const fecha = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dia)
    const hoy = new Date()
    hoy.setHours(23, 59, 59, 999) // Incluir todo el día de hoy
    return fecha > hoy
  }

  const seleccionarFecha = (dia: number) => {
    const fechaSeleccionada = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dia)
    const fechaStr = formatearFechaLocal(fechaSeleccionada)
    
    // Validar que no sea una fecha futura
    if (esFechaFutura(dia)) {
      return // No permitir seleccionar fechas futuras
    }
    
    if (!fechaInicio || (fechaInicio && fechaFin)) {
      // Iniciar nueva selección
      setFechaInicio(fechaStr)
      setFechaFin('')
    } else if (fechaStr < fechaInicio) {
      // Si la fecha seleccionada es anterior a la de inicio, hacerla la nueva fecha de inicio
      setFechaInicio(fechaStr)
      setFechaFin('')
    } else {
      // Completar el rango
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
        // Validar que no se pueda avanzar a un mes futuro
        const mesSiguiente = new Date(prev)
        mesSiguiente.setMonth(prev.getMonth() + 1)
        const hoy = new Date()
        // Si el mes siguiente es mayor que el mes actual, no permitir avanzar
        if (mesSiguiente.getFullYear() > hoy.getFullYear() || 
            (mesSiguiente.getFullYear() === hoy.getFullYear() && mesSiguiente.getMonth() > hoy.getMonth())) {
          return prev // No cambiar el mes
        }
        nuevoMes.setMonth(prev.getMonth() + 1)
      }
      return nuevoMes
    })
  }


  // 🎯 OBTENER FECHAS PARA USAR EN LAS PETICIONES
  const obtenerFechasParaPeticion = () => {
    if (fechaInicio && fechaFin) {
      return { fechaInicio, fechaFin }
    }
    return {}
  }

  // 🎯 FUNCIÓN DE CARGA DE DATOS
  const loadReportData = async () => {
    try {
      setLoading(true)
      setDatosCargados(false)
      
      const params = obtenerFechasParaPeticion()
      
      // Log para indicar si se está cargando con o sin filtros
      if (params.fechaInicio && params.fechaFin) {
        console.log('📊 [Reports] Cargando datos de reportes de SAC con filtro de fechas:', params)
      } else {
        console.log('📊 [Reports] Cargando todo el historial de reportes de SAC (sin filtros de fecha)')
      }
      
      // Obtener datos reales del backend
      const data = await reportsService.getSACPerformanceReports(params)
      setReportData(data)
      setDatosCargados(true)
      
      if (params.fechaInicio && params.fechaFin) {
        console.log('✅ [Reports] Datos de reportes cargados con filtro:', params, data)
      } else {
        console.log('✅ [Reports] Todo el historial de reportes cargado:', data)
      }
      
    } catch (error) {
      console.error('❌ [Reports] Error cargando datos de reportes:', error)
      // En caso de error, mostrar datos vacíos
      setReportData({
        totalSACs: 0,
        totalTickets: 0,
        averageRating: 0,
        totalRatings: 0,
        sacPerformance: [],
        topPerformers: [],
        recentRatings: []
      })
      setDatosCargados(false)
    } finally {
      setLoading(false)
    }
  }

  // 🎯 FUNCIÓN PARA CARGAR TODO EL HISTORIAL (endpoint /all)
  const cargarHistorialCompleto = async () => {
    try {
      setLoading(true)
      setDatosCargados(false)
      // No limpiar las fechas aquí para que el usuario pueda ver qué filtro tenía antes
      setShowDatePicker(false)
      
      // Llamar al endpoint /all que devuelve todo el historial
      const data = await reportsService.obtenerTodoElHistorial()
      setReportData(data)
      setDatosCargados(true)
      // Limpiar fechas después de cargar los datos
      setFechaInicio('')
      setFechaFin('')
      
    } catch (error) {
      console.error('❌ [Reports] Error cargando historial completo:', error)
      // En caso de error, mostrar datos vacíos
      setReportData({
        totalSACs: 0,
        totalTickets: 0,
        averageRating: 0,
        totalRatings: 0,
        sacPerformance: [],
        topPerformers: [],
        recentRatings: []
      })
      setDatosCargados(false)
    } finally {
      setLoading(false)
    }
  }

  // 🎯 CARGAR HISTORIAL COMPLETO POR DEFECTO AL MONTAR EL COMPONENTE
  useEffect(() => {
    // Evitar llamadas duplicadas (especialmente en React StrictMode)
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    
    // Cargar todo el historial al iniciar
    cargarHistorialCompleto()
  }, []) // Solo se ejecuta una vez al montar el componente

  // 🎯 CARGAR DATOS AUTOMÁTICAMENTE CUANDO SE COMPLETA EL RANGO
  useEffect(() => {
    if (fechaInicio && fechaFin) {
      // Validar que la fecha de inicio sea anterior a la de fin
      if (new Date(fechaInicio) > new Date(fechaFin)) {
        return
      }
      // Cargar datos automáticamente cuando se seleccionan ambas fechas
      const timer = setTimeout(() => {
        loadReportData()
      }, 300) // Pequeño delay para evitar múltiples llamadas
      
      return () => clearTimeout(timer)
    }
  }, [fechaInicio, fechaFin])

  // 🎯 FUNCIONES DE EXPORTACIÓN
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

  // 🎯 FUNCIÓN HELPER PARA EXPORTAR
  const exportarReporte = async (tipo: 'excel' | 'imagen', formato?: string) => {
    try {
      setExporting(true)
      setShowExportMenu(false)
      
      // Obtener parámetros de fecha para enviar al backend
      // Si hay fechas seleccionadas, usar esos filtros; si no, exportar todo el historial
      const tieneFechas = fechaInicio && fechaFin
      const params = tieneFechas ? { fechaInicio, fechaFin } : {}
      
      console.log(`📤 [Reports] Exportando a ${tipo}...`)
      
      if (tieneFechas) {
        console.log(`📅 [Reports] Exportando con filtro de fechas: ${fechaInicio} - ${fechaFin}`)
        console.log(`📅 [Reports] Parámetros enviados:`, params)
      } else {
        console.log(`📚 [Reports] Exportando todo el historial (sin filtros de fecha)`)
    }
      
      let blob: Blob
      let extension: string
      
      if (tipo === 'excel') {
        // Si hay fechas, enviar con parámetros; si no, el backend debe manejar sin parámetros
        blob = await reportsService.exportarAExcel(tieneFechas ? params : undefined)
        extension = 'xlsx'
      } else {
        blob = await reportsService.exportarAImagen(formato || 'png', tieneFechas ? params : undefined)
        extension = formato || 'png'
      }
      
      const dateRange = tieneFechas
        ? `${fechaInicio}_${fechaFin}`
        : 'historial_completo'
      const nombreArchivo = `reporte_sac_${dateRange}.${extension}`
      
      descargarArchivo(blob, nombreArchivo)
      
      if (tieneFechas) {
        console.log(`✅ [Reports] Exportación a ${tipo} completada con filtro de fechas:`, params)
      } else {
        console.log(`✅ [Reports] Exportación a ${tipo} completada (historial completo)`)
      }
    } catch (error) {
      console.error(`❌ [Reports] Error exportando a ${tipo}:`, error)
      alert(`Error al exportar a ${tipo === 'excel' ? 'Excel' : formato}. Por favor, intente nuevamente.`)
    } finally {
      setExporting(false)
    }
  }

  const exportarAExcel = () => exportarReporte('excel')
  const exportarAImagen = (formato: string) => exportarReporte('imagen', formato)

  const toggleExportMenu = () => {
    setShowExportMenu(!showExportMenu)
  }

  // 🎯 RENDERIZADO DE LOADING (solo cuando está cargando datos)
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-slate-600 dark:text-slate-400 mx-auto mb-4" />
              <p className="text-lg text-slate-600 dark:text-slate-400">Procesando datos de reportes...</p>
              {fechaInicio && fechaFin && (
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                  Rango: {parsearFechaLocal(fechaInicio).toLocaleDateString()} - {parsearFechaLocal(fechaFin).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 🎯 RENDERIZADO PRINCIPAL
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Reporte de Desempeño SAC
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Análisis detallado del rendimiento de los agentes de atención al cliente
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Date Picker */}
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
                
                {/* Botón de Histórico */}
                {(fechaInicio || fechaFin) && (
                  <button
                    type="button"
                    onClick={cargarHistorialCompleto}
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-sm font-medium flex items-center gap-2"
                    title="Cargar todo el historial sin filtros"
                  >
                    <X className="w-4 h-4" />
                    Histórico
                  </button>
                )}
                
                {/* Calendario desplegable */}
                {showDatePicker && (
                  <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-5 z-50">
                    {/* Header del calendario */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => cambiarMes('anterior')}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                      >
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
                    
                    {/* Días de la semana */}
                    <div className="grid grid-cols-7 gap-2 mb-3">
                      {diasSemana.map((dia, index) => (
                        <div key={index} className="text-center text-sm font-medium text-slate-600 dark:text-slate-400 py-2">
                          {dia}
                        </div>
                      ))}
                    </div>
                    
                    {/* Días del mes */}
                    <div className="grid grid-cols-7 gap-2">
                      {obtenerDiasDelMes(currentMonth).map((dia, index) => {
                        if (dia === null) {
                          return <div key={index} className="py-2"></div>
                        }
                        const esFutura = esFechaFutura(dia)
                        const estaEnRango = esFechaEnRango(dia)
                        const esInicio = esFechaInicio(dia)
                        const esFin = esFechaFin(dia)
                        
                        return (
                          <button
                            key={index}
                            onClick={() => seleccionarFecha(dia)}
                            disabled={esFutura}
                            className={`py-2.5 rounded text-sm transition-colors ${
                              esFutura
                                ? 'opacity-30 cursor-not-allowed text-slate-400 dark:text-slate-600'
                                : esInicio || esFin
                                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold'
                                : estaEnRango
                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                            title={esFutura ? 'No se pueden seleccionar fechas futuras' : ''}
                          >
                            {dia}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Botón de exportar con menú desplegable */}
              <div className="relative" ref={exportMenuRef}>
                <Button
                  onClick={toggleExportMenu}
                  disabled={exporting || !datosCargados}
                  variant="ghost"
                  className={`border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center ${
                    !datosCargados ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title={!datosCargados ? 'Esperando a que se carguen los datos' : (fechaInicio && fechaFin) ? 'Exportar reporte filtrado' : 'Exportar historial completo'}
                >
                  {exporting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Exportar
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>

                {/* Menú desplegable */}
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
                    <button
                      onClick={exportarAExcel}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center"
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-3 text-green-600 dark:text-green-400" />
                      Exportar a Excel
                    </button>
                    <button
                      onClick={() => exportarAImagen('png')}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center"
                    >
                      <Image className="w-4 h-4 mr-3 text-slate-600 dark:text-slate-400" />
                      Exportar como PNG
                    </button>
                    <button
                      onClick={() => exportarAImagen('jpg')}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center"
                    >
                      <Image className="w-4 h-4 mr-3 text-slate-600 dark:text-slate-400" />
                      Exportar como JPG
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>


        {/* MÉTRICAS PRINCIPALES - Solo mostrar si hay datos cargados */}
        {datosCargados && reportData ? (
          <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { label: 'Total SAC', value: reportData?.totalSACs || 0, icon: Users },
                { label: 'Total Tickets', value: reportData?.totalTickets || 0, icon: BarChart3 },
                { label: 'Calificación Promedio', value: `${reportData?.averageRating || 0}/5`, icon: Star },
                { label: 'Total Valoraciones', value: reportData?.totalRatings || 0, icon: ThumbsUp }
              ].map((metric, index) => {
                const IconComponent = metric.icon
                return (
                  <Card key={index} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{metric.label}</p>
                          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{metric.value}</p>
                </div>
                        <IconComponent className="w-8 h-8 text-slate-600 dark:text-slate-400" />
              </div>
            </CardContent>
          </Card>
                )
              })}
        </div>

        {/* TOP 3 MEJORES SAC */}
        <Card className="mb-8 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-slate-900 dark:text-slate-100">
              <Award className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              <span>Top 3 Mejores SAC</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reportData?.topPerformers?.map((sac, index) => (
                <div key={sac.id} className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 rounded-xl p-6 border border-slate-200 dark:border-slate-600">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">#{index + 1}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{sac.name}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">@{sac.username}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Tickets Completados</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{sac.completedTickets}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Calificación</span>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-500 dark:text-yellow-400 fill-current" />
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

        {/* TABLA DE DESEMPEÑO DETALLADO */}
        <Card className="mb-8 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-slate-900 dark:text-slate-100">
              <Target className="w-6 h-6 text-red-600 dark:text-red-400" />
              <span>Desempeño Detallado por SAC</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-600">
                    <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">SAC</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Total Tickets</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Completados</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Calificación</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Satisfacción</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Tiempo Respuesta</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData?.sacPerformance?.map((sac) => (
                    <tr key={sac.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-slate-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {sac.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{sac.name}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">@{sac.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{sac.totalTickets}</span>
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className="font-semibold text-green-600 dark:text-green-400">{sac.completedTickets}</span>
                      </td>
                      <td className="text-center py-4 px-4">
                        <div className="flex items-center justify-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-500 dark:text-yellow-400 fill-current" />
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{sac.averageRating}</span>
                          <span className="text-sm text-slate-600 dark:text-slate-400">({sac.totalRatings})</span>
                        </div>
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className="font-semibold text-green-600 dark:text-green-400">{sac.satisfactionPercentage}%</span>
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className="text-sm text-slate-600 dark:text-slate-400">{sac.averageResponseTime}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* VALORACIONES RECIENTES */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-slate-900 dark:text-slate-100">
              <MessageSquare className="w-6 h-6 text-green-600 dark:text-green-400" />
              <span>Valoraciones Recientes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportData?.recentRatings?.map((rating) => (
                <div key={rating.id} className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 hover:shadow-md dark:hover:shadow-slate-900/20 transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 rounded-full flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{rating.sacName}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Ticket {rating.ticketNumber}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-4 h-4 ${
                            i < rating.score ? 'text-yellow-500 dark:text-yellow-400 fill-current' : 'text-slate-300 dark:text-slate-600'
                          }`} 
                        />
                      ))}
                      <span className="ml-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{rating.score}/5</span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{rating.date}</span>
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
          </>
        ) : (
          <Card className="mb-8 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                No hay datos cargados
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Selecciona un rango de fechas para ver los reportes
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default Reports