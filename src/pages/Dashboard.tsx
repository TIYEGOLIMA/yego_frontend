import React, { useState, useEffect } from "react"
import { useAuthStore } from "../store/auth-store"
import { useConnectionStatus } from "../shared/hooks/useConnectionStatus"
import { CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Switch } from "../components/ui/switch"
import { dashboardService, DashboardData, DashboardMetrics } from "../services"
import { RoleDebugInfo } from "../components/RoleDebugInfo"
import { 
  Users, 
  Shield, 
  Database, 
  BarChart3, 
  TrendingUp, 
  Activity,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  Server,
  RefreshCw,
  AlertCircle,
  Upload,
  HardDrive,
  Cpu,
  Layers,
  ArrowRight
} from 'lucide-react'

interface MetricCard {
  title: string
  value: string | number
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
  icon: React.ReactNode
  color: string
}

const Dashboard: React.FC = () => {
  const { user } = useAuthStore()
  useConnectionStatus()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Cargar datos del dashboard
  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await dashboardService.getDashboardData()
      setDashboardData(data)
      setLastUpdate(new Date())
    } catch (err: any) {
      console.error('Error cargando datos del dashboard:', err)
      setError(err.message || 'Error al cargar datos del dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  // Refrescar datos
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadDashboardData()
    setIsRefreshing(false)
  }

  // Cargar datos iniciales
  useEffect(() => {
    loadDashboardData()
  }, [])

  // Actualizar tiempo cada segundo
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Auto-refresh cada 5 minutos (solo si está habilitado)
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      if (!isLoading) {
        loadDashboardData()
      }
    }, 5 * 60 * 1000) // 5 minutos
    
    return () => clearInterval(interval)
  }, [isLoading, autoRefresh])

  // Generar métricas desde datos reales
  const generateMetrics = (data: DashboardMetrics): MetricCard[] => [
    {
      title: "Usuarios Activos",
      value: data.activeUsers.toLocaleString(),
      change: data.changes?.usersChange || "+12.5%",
      changeType: data.changes?.usersChange?.startsWith('+') ? "positive" : 
                  data.changes?.usersChange?.startsWith('-') ? "negative" : "neutral",
      icon: <Users className="h-6 w-6" />,
      color: "from-primary-500 to-primary-600"
    },
    {
      title: "Sesiones Activas",
      value: data.activeSessions.toLocaleString(),
      change: data.changes?.sessionsChange || "+5.2%",
      changeType: data.changes?.sessionsChange?.startsWith('+') ? "positive" : 
                  data.changes?.sessionsChange?.startsWith('-') ? "negative" : "neutral",
      icon: <Activity className="h-6 w-6" />,
      color: "from-success-500 to-success-600"
    },
    {
      title: "Importaciones Hoy",
      value: data.importsToday.toLocaleString(),
      change: data.changes?.importsChange || "0%",
      changeType: data.changes?.importsChange?.startsWith('+') ? "positive" : 
                  data.changes?.importsChange?.startsWith('-') ? "negative" : "neutral",
      icon: <TrendingUp className="h-6 w-6" />,
      color: "from-warning-500 to-warning-600"
    },
    {
      title: "Errores del Sistema",
      value: data.systemErrors.toLocaleString(),
      change: data.changes?.errorsChange || "0%",
      changeType: data.changes?.errorsChange?.startsWith('+') ? "negative" : 
                  data.changes?.errorsChange?.startsWith('-') ? "positive" : "neutral",
      icon: <Shield className="h-6 w-6" />,
      color: "from-error-500 to-error-600"
    }
  ]

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }


  const getStatusText = (status: string) => {
    switch (status) {
      case 'operational':
        return 'Operativo'
      case 'connected':
        return 'Conectado'
      case 'warning':
        return 'Advertencia'
      case 'error':
        return 'Error'
      case 'disconnected':
        return 'Desconectado'
      default:
        return 'Desconocido'
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'operational':
      case 'connected':
        return 'success'
      case 'warning':
        return 'warning'
      case 'error':
      case 'disconnected':
        return 'error'
      default:
        return 'outline'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="yego-body-sm">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="w-12 h-12 text-error-500" />
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              Error al cargar datos
            </h3>
            <p className="yego-body-sm text-neutral-600 dark:text-neutral-400 mb-4">
              {error}
            </p>
            <Button onClick={loadDashboardData} leftIcon={<RefreshCw className="h-4 w-4" />}>
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="yego-body-sm text-neutral-600 dark:text-neutral-400">
            No se pudieron cargar los datos del dashboard
          </p>
        </div>
      </div>
    )
  }

  const metrics = generateMetrics(dashboardData.metrics)

  return (
    <div className="space-y-6">
      {/* Debug Info - Temporal */}
      <RoleDebugInfo />
      
      {/* Header del Dashboard */}
      <div className="glassmorphism-strong shadow-xl dark:shadow-dark-xl rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white mb-2 bg-gradient-to-r from-neutral-900 to-neutral-700 dark:from-white dark:to-neutral-300 bg-clip-text">
              ¡Bienvenido, {user?.name?.split(' ')[0] || user?.username || 'Usuario'}!
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Aquí tienes un resumen de la actividad del sistema
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            <div className="text-right">
              <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                {formatTime(currentTime)}
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                {formatDate(currentTime)}
              </div>
            </div>
            {/* Controles de actualización */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                  Auto-refresh
                </span>
              </div>
              <Button 
                variant="glassmorphism" 
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-9 w-9 flex-shrink-0"
                title={isRefreshing ? 'Actualizando...' : 'Actualizar datos'}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              {lastUpdate && (
                <div className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                  {lastUpdate.toLocaleTimeString('es-ES')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className="glassmorphism-glow rounded-2xl">
            <div className="glassmorphism rounded-2xl p-6 flex flex-col gap-4 shadow-md hover:shadow-xl transition-all duration-300 group">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-3 rounded-xl bg-gradient-to-r ${metric.color} shadow-md group-hover:scale-105 transition-transform flex-shrink-0`}>
                  <div className="text-white w-6 h-6 flex items-center justify-center">
                    <div className="flex-shrink-0">
                      {metric.icon}
                    </div>
                  </div>
                </div>
                <div className={`flex items-center text-sm font-semibold ${
                  metric.changeType === 'positive' ? 'text-success-600 dark:text-success-400' : 
                  metric.changeType === 'negative' ? 'text-error-600 dark:text-error-400' : 'text-neutral-600 dark:text-neutral-400'
                }`}>
                  {metric.changeType === 'positive' ? (
                    <ArrowUpRight className="h-4 w-4 mr-1 flex-shrink-0" />
                  ) : metric.changeType === 'negative' ? (
                    <ArrowDownRight className="h-4 w-4 mr-1 flex-shrink-0" />
                  ) : null}
                  <span className="flex-shrink-0">{metric.change}</span>
                </div>
              </div>
              <div>
                <h3 className="text-sm text-neutral-700 dark:text-neutral-300 mb-1">
                  {metric.title}
                </h3>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {metric.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Actividad Reciente */}
        <div className="lg:col-span-2">
          <div className="glassmorphism-strong shadow-xl dark:shadow-dark-xl rounded-3xl">
            <CardHeader className="px-6 pt-6 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary-500 flex-shrink-0" />
                  Actividad Reciente
                </CardTitle>
                <Button 
                  variant="glassmorphism" 
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  title="Ver toda la actividad"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="space-y-4">
                {dashboardData.recentActivity.length > 0 ? (
                  dashboardData.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-4 p-4 glassmorphism-light rounded-xl hover:bg-white/10 dark:hover:bg-neutral-800/30 transition-colors">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        activity.status === 'success' ? 'bg-success-500' :
                        activity.status === 'warning' ? 'bg-warning-500' : 'bg-error-500'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-neutral-900 dark:text-white truncate">
                          {activity.user.nombre}
                        </p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                          {activity.action}
                        </p>
                      </div>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400 flex-shrink-0">
                        {activity.createdAt || new Date().toLocaleDateString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-neutral-500 dark:text-neutral-400 py-8">
                    No hay actividad reciente.
                  </div>
                )}
              </div>
            </CardContent>
          </div>
        </div>
        {/* Panel lateral: Estado del sistema */}
        <div>
          <div className="glassmorphism-strong shadow-xl dark:shadow-dark-xl rounded-3xl mb-8">
            <CardHeader className="px-6 pt-6 pb-2">
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-success-500 flex-shrink-0" />
                Estado del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="space-y-4">
                {/* Uptime */}
                <div className="flex items-center gap-4 p-4 glassmorphism-light rounded-xl">
                  <Clock className="h-5 w-5 text-primary-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 dark:text-white">Tiempo Activo</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{formatUptime(dashboardData.systemStatus.uptime)}</p>
                  </div>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 flex-shrink-0">{dashboardData.systemStatus.uptime ? 'Activo' : '—'}</span>
                </div>
                {/* Database */}
                <div className="flex items-center gap-4 p-4 glassmorphism-light rounded-xl">
                  <Database className="h-5 w-5 text-primary-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 dark:text-white">Base de Datos</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{getStatusText(dashboardData.systemStatus.database)}</p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(dashboardData.systemStatus.database)} className="flex-shrink-0">{getStatusText(dashboardData.systemStatus.database)}</Badge>
                </div>
                {/* API Backend */}
                <div className="flex items-center gap-4 p-4 glassmorphism-light rounded-xl">
                  <Server className="h-5 w-5 text-success-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 dark:text-white">API Backend</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{getStatusText(dashboardData.systemStatus.api)}</p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(dashboardData.systemStatus.api)} className="flex-shrink-0">{getStatusText(dashboardData.systemStatus.api)}</Badge>
                </div>
                {/* WebSockets */}
                <div className="flex items-center gap-4 p-4 glassmorphism-light rounded-xl">
                  <Globe className="h-5 w-5 text-warning-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 dark:text-white">WebSockets</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{getStatusText(dashboardData.systemStatus.websockets)}</p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(dashboardData.systemStatus.websockets)} className="flex-shrink-0">{getStatusText(dashboardData.systemStatus.websockets)}</Badge>
                </div>
                {/* CPU */}
                <div className="flex items-center gap-4 p-4 glassmorphism-light rounded-xl">
                  <Cpu className="h-5 w-5 text-error-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 dark:text-white">CPU</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{dashboardData.systemStatus.cpu.usage}%</p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(dashboardData.systemStatus.cpu.status)} className="flex-shrink-0">{getStatusText(dashboardData.systemStatus.cpu.status)}</Badge>
                </div>
                {/* Memoria */}
                <div className="flex items-center gap-4 p-4 glassmorphism-light rounded-xl">
                  <Layers className="h-5 w-5 text-warning-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 dark:text-white">Memoria</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{dashboardData.systemStatus.memory.usage}%</p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(dashboardData.systemStatus.memory.status)} className="flex-shrink-0">{getStatusText(dashboardData.systemStatus.memory.status)}</Badge>
                </div>
                {/* Almacenamiento */}
                <div className="flex items-center gap-4 p-4 glassmorphism-light rounded-xl">
                  <HardDrive className="h-5 w-5 text-success-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 dark:text-white">Almacenamiento</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{dashboardData.systemStatus.storage.usage}%</p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(dashboardData.systemStatus.storage.status)} className="flex-shrink-0">{getStatusText(dashboardData.systemStatus.storage.status)}</Badge>
                </div>
                {/* Última verificación */}
                <div className="text-xs text-neutral-500 dark:text-neutral-400 text-center pt-2">
                  Última verificación: {new Date(dashboardData.systemStatus.lastCheck).toLocaleTimeString('es-ES')}
                </div>
              </div>
            </CardContent>
          </div>
          {/* Panel lateral: Estadísticas semanales */}
          <div className="glassmorphism-strong shadow-xl dark:shadow-dark-xl rounded-3xl">
            <CardHeader className="px-6 pt-6 pb-2">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-warning-500 flex-shrink-0" />
                Estadísticas Semanales
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="space-y-4">
                {/* Nuevos Usuarios */}
                <div className="flex items-center gap-4 p-4 glassmorphism-light rounded-xl">
                  <Users className="h-5 w-5 text-success-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 dark:text-white">Nuevos Usuarios</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{dashboardData.weeklyStats.newUsers}</p>
                  </div>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 flex-shrink-0">Esta semana</span>
                </div>
                {/* Importaciones */}
                <div className="flex items-center gap-4 p-4 glassmorphism-light rounded-xl">
                  <Upload className="h-5 w-5 text-primary-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 dark:text-white">Importaciones</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{dashboardData.weeklyStats.imports}</p>
                  </div>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 flex-shrink-0">Esta semana</span>
                </div>
                {/* Actividad */}
                <div className="flex items-center gap-4 p-4 glassmorphism-light rounded-xl">
                  <Activity className="h-5 w-5 text-warning-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 dark:text-white">Actividad</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{dashboardData.weeklyStats.activity}</p>
                  </div>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 flex-shrink-0">Esta semana</span>
                </div>
                {/* Período */}
                <div className="text-xs text-neutral-500 dark:text-neutral-400 text-center pt-2">
                  Período: {dashboardData.weeklyStats.period}
                </div>
              </div>
            </CardContent>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard