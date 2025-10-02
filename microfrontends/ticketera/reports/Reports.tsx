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
  Loader2
} from 'lucide-react'
import { reportsService, ReportData } from './services/reportsService'

const Reports: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting, setExporting] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  // 🎯 CARGAR DATOS DEL USUARIO
  useEffect(() => {
    try {
      const userData = localStorage.getItem('user')
      if (userData) {
        const user = JSON.parse(userData)
        console.log('👤 [Reports] Usuario cargado:', user)
        setCurrentUser({
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
          moduleId: user.moduleId || null
        })
      }
    } catch (error) {
      console.error('❌ [Reports] Error cargando datos del usuario:', error)
    }
  }, [])

  // 🎯 CARGAR DATOS DE REPORTES DE SAC (solo una vez al montar)
  useEffect(() => {
    loadReportData()
  }, [])

  // 🎯 CERRAR MENÚ AL HACER CLIC FUERA
  useEffect(() => {
    const manejarClicExterno = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false)
      }
    }

    document.addEventListener('mousedown', manejarClicExterno)
    return () => document.removeEventListener('mousedown', manejarClicExterno)
  }, [])

  // 🎯 FUNCIONES DE ACCIÓN
  const handleRefresh = () => {
    console.log('🔄 [Reports] Actualizando datos...')
    // Reutilizar la misma función de carga
    loadReportData()
  }

  // 🎯 FUNCIÓN DE CARGA DE DATOS (reutilizable)
  const loadReportData = async () => {
    try {
      setLoading(true)
      console.log('📊 [Reports] Cargando datos de reportes de SAC...')
      
      // Obtener datos reales del backend
      const data = await reportsService.getSACPerformanceReports()
      setReportData(data)
      console.log('✅ [Reports] Datos de reportes cargados:', data)
      
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
    } finally {
      setLoading(false)
    }
  }

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

  const exportarAExcel = async () => {
    try {
      setExporting(true)
      setShowExportMenu(false)
      console.log('📊 [Reports] Exportando a Excel...')
      
      const blob = await reportsService.exportarAExcel()
      const nombreArchivo = `reporte_sac_${new Date().toISOString().split('T')[0]}.xlsx`
      
      descargarArchivo(blob, nombreArchivo)
      console.log('✅ [Reports] Exportación a Excel completada')
    } catch (error) {
      console.error('❌ [Reports] Error exportando a Excel:', error)
      alert('Error al exportar a Excel. Por favor, intente nuevamente.')
    } finally {
      setExporting(false)
    }
  }

  const exportarAImagen = async (formato: string) => {
    try {
      setExporting(true)
      setShowExportMenu(false)
      console.log('📊 [Reports] Exportando a imagen:', formato)
      
      const blob = await reportsService.exportarAImagen(formato)
      const nombreArchivo = `reporte_sac_${new Date().toISOString().split('T')[0]}.${formato}`
      
      descargarArchivo(blob, nombreArchivo)
      console.log('✅ [Reports] Exportación a imagen completada')
    } catch (error) {
      console.error('❌ [Reports] Error exportando a imagen:', error)
      alert('Error al exportar a imagen. Por favor, intente nuevamente.')
    } finally {
      setExporting(false)
    }
  }

  const toggleExportMenu = () => {
    setShowExportMenu(!showExportMenu)
  }

  // 🎯 RENDERIZADO DE LOADING
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
              <p className="text-lg text-slate-600 dark:text-slate-400">Cargando reportes de SAC...</p>
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
              <Button
                onClick={handleRefresh}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              
              {/* Botón de exportar con menú desplegable */}
              <div className="relative" ref={exportMenuRef}>
                <Button
                  onClick={toggleExportMenu}
                  disabled={exporting}
                  variant="ghost"
                  className="border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center"
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
                      <Image className="w-4 h-4 mr-3 text-blue-600 dark:text-blue-400" />
                      Exportar como PNG
                    </button>
                    <button
                      onClick={() => exportarAImagen('jpg')}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center"
                    >
                      <Image className="w-4 h-4 mr-3 text-blue-600 dark:text-blue-400" />
                      Exportar como JPG
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MÉTRICAS PRINCIPALES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-800 dark:to-slate-700 border-blue-200 dark:border-slate-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-slate-400">Total SAC</p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-slate-200">{reportData?.totalSACs || 0}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-slate-800 dark:to-slate-700 border-green-200 dark:border-slate-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-slate-400">Total Tickets</p>
                  <p className="text-3xl font-bold text-green-900 dark:text-slate-200">{reportData?.totalTickets || 0}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-slate-800 dark:to-slate-700 border-yellow-200 dark:border-slate-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600 dark:text-slate-400">Calificación Promedio</p>
                  <p className="text-3xl font-bold text-yellow-900 dark:text-slate-200">{reportData?.averageRating || 0}/5</p>
                </div>
                <Star className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-slate-800 dark:to-slate-700 border-purple-200 dark:border-slate-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-slate-400">Total Valoraciones</p>
                  <p className="text-3xl font-bold text-purple-900 dark:text-slate-200">{reportData?.totalRatings || 0}</p>
                </div>
                <ThumbsUp className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TOP 3 MEJORES SAC */}
        <Card className="mb-8 dark:bg-slate-800 dark:border-slate-700">
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
                      <span className="text-sm text-slate-600 dark:text-slate-400">Satisfacción</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">{sac.satisfactionPercentage}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* TABLA DE DESEMPEÑO DETALLADO */}
        <Card className="mb-8 dark:bg-slate-800 dark:border-slate-700">
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
                    <th className="text-center py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Última Actividad</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData?.sacPerformance?.map((sac) => (
                    <tr key={sac.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
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
                      <td className="text-center py-4 px-4">
                        <span className="text-sm text-slate-600 dark:text-slate-400">{sac.lastActivity}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* VALORACIONES RECIENTES */}
        <Card className="dark:bg-slate-800 dark:border-slate-700">
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
      </div>
    </div>
  )
}

export default Reports