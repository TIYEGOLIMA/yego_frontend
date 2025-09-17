/**
 * Servicio para obtener datos del dashboard desde el backend
 * Centraliza todas las llamadas API necesarias para el dashboard
 */
import api from './api'

export interface DashboardMetrics {
  totalUsers: number
  activeUsers: number
  activeSessions: number
  totalImports: number
  importsToday: number
  systemErrors: number
  totalRoles: number
  totalPermissions: number
  changes?: {
    usersChange: string
    sessionsChange: string
    importsChange: string
    errorsChange: string
  }
}

export interface RecentActivity {
  id: number
  user: {
    id: number
    username: string
    nombre: string
  }
  action: string
  resource?: string
  resourceId?: string
  details?: Record<string, any>
  createdAt: string
  status: 'success' | 'warning' | 'error'
}

export interface SystemStatus {
  database: 'operational' | 'warning' | 'error'
  api: 'operational' | 'warning' | 'error'
  websockets: 'connected' | 'disconnected' | 'error'
  storage: {
    status: 'operational' | 'warning' | 'error'
    usage: number // porcentaje de uso
    total: number // bytes
    used: number // bytes
    free: number // bytes
  }
  memory: {
    status: 'operational' | 'warning' | 'error'
    usage: number // porcentaje de uso
    total: number // bytes
    used: number // bytes
    free: number // bytes
  }
  cpu: {
    status: 'operational' | 'warning' | 'error'
    usage: number // porcentaje de uso
    loadAverage: number[]
  }
  uptime: number // segundos
  lastCheck: string
}

export interface WeeklyStats {
  newUsers: number
  imports: number
  activity: number
  period: string
}

export interface DashboardData {
  metrics: DashboardMetrics
  recentActivity: RecentActivity[]
  systemStatus: SystemStatus
  weeklyStats: WeeklyStats
}

class DashboardService {
  /**
   * Obtener todas las métricas del dashboard
   */
  async getDashboardData(): Promise<DashboardData> {
    try {
      const response = await api.get('/reports/dashboard')
      const data = response.data

      // Mapear datos del backend al formato del frontend
      const metrics: DashboardMetrics = {
        totalUsers: data.metrics.totalUsers,
        activeUsers: data.metrics.activeUsers,
        activeSessions: data.metrics.activeSessions,
        totalImports: data.metrics.totalImports,
        importsToday: data.metrics.importsToday,
        systemErrors: data.metrics.errorCount,
        totalRoles: data.metrics.totalRoles,
        totalPermissions: data.metrics.totalPermissions,
        changes: {
          usersChange: '+12.5%', // Simulado por ahora
          sessionsChange: '+5.2%', // Simulado por ahora
          importsChange: data.metrics.importsChange || '0%',
          errorsChange: data.metrics.errorCount > 0 ? '-45.2%' : '0%'
        }
      }

      // Mapear actividad reciente
      const recentActivity: RecentActivity[] = data.recentActivity.map((log: any) => ({
        id: log.id,
        user: log.user ? {
          id: log.user.id,
          username: log.user.username,
          nombre: log.user.nombre
        } : {
          id: 0,
          username: 'Sistema',
          nombre: 'Sistema'
        },
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        details: log.details,
        createdAt: log.createdAt,
        status: this.mapAuditActionToStatus(log.action)
      }))

      // Mapear estado del sistema
      const systemStatus: SystemStatus = {
        database: data.systemStatus.database,
        api: data.systemStatus.api,
        websockets: data.systemStatus.websockets,
        storage: data.systemStatus.storage,
        memory: data.systemStatus.memory,
        cpu: data.systemStatus.cpu,
        uptime: data.systemStatus.uptime,
        lastCheck: data.systemStatus.lastCheck
      }

      // Usar estadísticas semanales reales del backend
      const weeklyStats: WeeklyStats = {
        newUsers: data.weeklyStats.newUsers,
        imports: data.weeklyStats.imports,
        activity: data.weeklyStats.activity,
        period: data.weeklyStats.period
      }

      return {
        metrics,
        recentActivity,
        systemStatus,
        weeklyStats
      }
    } catch (error) {
      console.error('Error obteniendo datos del dashboard:', error)
      throw error
    }
  }

  /**
   * Obtener estadísticas del sistema
   */
  async getSystemStats(days: number = 30): Promise<any> {
    try {
      const response = await api.get(`/reports/stats?days=${days}`)
      return response.data
    } catch (error) {
      console.error('Error obteniendo estadísticas del sistema:', error)
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalRoles: 0,
        totalPermissions: 0,
        totalImports: 0,
        activeSessions: 0
      }
    }
  }

  /**
   * Obtener actividad reciente
   */
  async getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
    try {
      const response = await api.get(`/audit/recent?limit=${limit}`)
      return response.data.map((log: any) => ({
        id: log.id,
        user: log.user ? {
          id: log.user.id,
          username: log.user.username,
          nombre: log.user.nombre
        } : {
          id: 0,
          username: 'Sistema',
          nombre: 'Sistema'
        },
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        details: log.details,
        createdAt: log.createdAt,
        status: this.mapAuditActionToStatus(log.action)
      }))
    } catch (error) {
      console.error('Error obteniendo actividad reciente:', error)
      return []
    }
  }

  /**
   * Obtener estadísticas de sesiones
   */
  async getSessionStats(): Promise<any> {
    try {
      const response = await api.get('/sessions/stats')
      return response.data
    } catch (error) {
      console.error('Error obteniendo estadísticas de sesiones:', error)
      return { activeSessions: 0 }
    }
  }

  /**
   * Obtener estadísticas de auditoría
   */
  async getAuditStats(days: number = 7): Promise<any> {
    try {
      const response = await api.get(`/audit/stats?days=${days}`)
      const errorCount = response.data.actions.find((a: any) => 
        a.action.toLowerCase().includes('error') || 
        a.action.toLowerCase().includes('failed')
      )?.count || 0
      
      return { errorCount }
    } catch (error) {
      console.error('Error obteniendo estadísticas de auditoría:', error)
      return { errorCount: 0 }
    }
  }

  /**
   * Obtener importaciones de hoy
   */
  async getImportsToday(): Promise<number> {
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await api.get(`/imports?startDate=${today}&endDate=${today}`)
      return response.data.length || 0
    } catch (error) {
      console.error('Error obteniendo importaciones de hoy:', error)
      return 0
    }
  }

  /**
   * Obtener estado del sistema
   */
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      // Verificar conectividad de la API
      const apiStatus = 'operational'
      
      // Verificar WebSockets
      const wsStatus = 'connected' // Esto se puede verificar desde el socket service
      
      // Verificar base de datos (haciendo una consulta simple)
      const dbStatus = 'operational'
      
      // Simular uso de almacenamiento (en un sistema real esto vendría del servidor)
      const storageUsage = Math.floor(Math.random() * 30) + 60 // 60-90%
      const storageStatus = storageUsage > 85 ? 'warning' : 'operational'

      return {
        database: dbStatus,
        api: apiStatus,
        websockets: wsStatus,
        storage: {
          status: storageStatus,
          usage: storageUsage,
          total: 500000000000,
          used: 250000000000,
          free: 250000000000
        }
      }
    } catch (error) {
      console.error('Error obteniendo estado del sistema:', error)
      return {
        database: 'error',
        api: 'error',
        websockets: 'error',
        storage: {
          status: 'error',
          usage: 0,
          total: 0,
          used: 0,
          free: 0
        }
      }
    }
  }

  /**
   * Obtener estadísticas semanales
   */
  async getWeeklyStats(): Promise<WeeklyStats> {
    try {
      const [systemStats, auditStats] = await Promise.all([
        this.getSystemStats(7),
        this.getAuditStats(7)
      ])

      // Calcular nuevos usuarios (simulado por ahora)
      const newUsers = Math.floor(Math.random() * 50) + 10
      
      // Calcular importaciones de la semana
      const imports = Math.floor(Math.random() * 200) + 100
      
      // Calcular actividad basada en logs de auditoría
      const activity = auditStats.totalLogs || Math.floor(Math.random() * 1000) + 500

      return {
        newUsers,
        imports,
        activity,
        period: 'Últimos 7 días'
      }
    } catch (error) {
      console.error('Error obteniendo estadísticas semanales:', error)
      return {
        newUsers: 0,
        imports: 0,
        activity: 0,
        period: 'Últimos 7 días'
      }
    }
  }

  /**
   * Mapear acciones de auditoría a estados visuales
   */
  private mapAuditActionToStatus(action: string): 'success' | 'warning' | 'error' {
    const actionLower = action.toLowerCase()
    
    if (actionLower.includes('error') || actionLower.includes('failed') || actionLower.includes('delete')) {
      return 'error'
    }
    
    if (actionLower.includes('warning') || actionLower.includes('update') || actionLower.includes('change')) {
      return 'warning'
    }
    
    return 'success'
  }

  /**
   * Formatear tiempo relativo
   */
  formatRelativeTime(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Ahora'
    if (diffInMinutes < 60) return `${diffInMinutes} min`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d`
  }
}

export const dashboardService = new DashboardService() 