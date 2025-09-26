import axios from 'axios'
import { API_BASE_URL } from '../utils/constants'
import { QueueAgent } from '../types'

// 🔧 Instancia axios específica para colas de agentes
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 🔐 Interceptor para agregar token automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Tipos adicionales necesarios
export interface AssignModuleRequest {
  moduleId: number
  userId: number
}

export interface ActiveAgent {
  id: number
  userId: number
  moduleId: number
  status: string
  createdAt: string
  updatedAt: string
}

export interface ModuleAssignmentResponse {
  success: boolean
  message: string
  moduleId?: number
  existing?: boolean
}

class QueueAgentService {
  async asignarModuloAlUsuario(moduleId: number): Promise<void> {
    try {
      console.log('🔍 [queueAgentService] ===== INICIANDO ASIGNACIÓN DE MÓDULO =====')
      
      const userData = localStorage.getItem('user')
      if (!userData) {
        throw new Error('No hay datos de usuario')
      }

      const user = JSON.parse(userData)
      const userId = user.id
      console.log('🔍 [queueAgentService] User ID:', userId, 'Module ID:', moduleId)

      // 🎯 RUTA CORREGIDA: /queue-agents/asignar (plural como en el backend)
      await api.post('/queue-agents/asignar', {
        moduleId,
        userId
      })

      console.log('✅ [queueAgentService] Módulo asignado exitosamente:', moduleId)
      
      // Guardar en localStorage como backup
      localStorage.setItem(`selectedModule_${userId}`, moduleId.toString())
      
    } catch (error) {
      console.error('❌ [queueAgentService] Error asignando módulo:', error)
      throw error
    }
  }

  async liberarModuloDelUsuario(): Promise<void> {
    try {
      const userData = localStorage.getItem('user')
      if (!userData) {
        throw new Error('No hay datos de usuario')
      }

      console.log('⚠️ Función de liberar módulo no implementada en el backend')
      console.log('✅ Módulo liberado exitosamente (simulado)')
    } catch (error) {
      console.error('❌ Error liberando módulo:', error)
      throw error
    }
  }

  async recuperarModuloAsignado(): Promise<number | null> {
    try {
      const userData = localStorage.getItem('user')
      if (!userData) {
        console.log('❌ No hay datos de usuario en localStorage')
        return null
      }

      const user = JSON.parse(userData)
      const userId = user.id
      console.log('🔍 [queueAgentService] Recuperando módulo asignado para usuario:', userId)

      // 🎯 PRIMERO: Intentar obtener desde el backend
      try {
        const response = await api.get(`/queue-agents/recuperar-modulo/${userId}`)
        if (response.data && response.data.moduleId) {
          const moduloId = response.data.moduleId
          console.log('✅ [queueAgentService] Módulo recuperado desde el backend:', moduloId)
          
          // 🎯 SINCRONIZAR CON LOCALSTORAGE
          localStorage.setItem(`selectedModule_${userId}`, moduloId.toString())
          console.log('💾 [queueAgentService] Módulo sincronizado en localStorage:', moduloId)
          
          return moduloId
        }
      } catch (backendError) {
        console.log('⚠️ [queueAgentService] Backend no disponible, intentando localStorage...')
        console.log('🔍 [queueAgentService] Error del backend:', backendError)
      }

      // 🎯 FALLBACK: Usar localStorage si el backend no está disponible
      const moduloGuardado = localStorage.getItem(`selectedModule_${userId}`)
      if (moduloGuardado) {
        const moduloId = parseInt(moduloGuardado)
        console.log('✅ [queueAgentService] Módulo recuperado del localStorage (fallback):', moduloId)
        return moduloId
      }

      console.log('❌ [queueAgentService] No se encontró módulo asignado ni en backend ni en localStorage')
      return null
    } catch (error) {
      console.error('❌ [queueAgentService] Error recuperando módulo asignado:', error)
      return null
    }
  }

  async verificarYUsarModuloExistente(): Promise<ModuleAssignmentResponse> {
    try {
      const userData = localStorage.getItem('user')
      if (!userData) {
        return { success: false, message: 'No hay datos de usuario', existing: false }
      }

      const user = JSON.parse(userData)
      const userId = user.id
      console.log('🔍 [queueAgentService] Verificando módulo existente para usuario:', userId)

      // 🎯 PRIMERO: Intentar obtener desde el backend
      try {
        const response = await api.get(`/queue-agents/recuperar-modulo/${userId}`)
        if (response.data && response.data.moduleId) {
          const moduloId = response.data.moduleId
          console.log('✅ [queueAgentService] Usuario ya tiene módulo asignado en backend:', moduloId)
          
          // 🎯 SINCRONIZAR CON LOCALSTORAGE
          localStorage.setItem(`selectedModule_${userId}`, moduloId.toString())
          
          return {
            success: true,
            message: 'Usuario ya tiene módulo asignado',
            moduleId: moduloId,
            existing: true
          }
        }
      } catch (backendError) {
        console.log('⚠️ [queueAgentService] Backend no disponible, verificando localStorage...')
      }

      // 🎯 FALLBACK: Verificar localStorage
      const moduloGuardado = localStorage.getItem(`selectedModule_${userId}`)
      if (moduloGuardado) {
        const moduloId = parseInt(moduloGuardado)
        console.log('✅ [queueAgentService] Usuario ya tiene módulo asignado en localStorage:', moduloId)
        return {
          success: true,
          message: 'Usuario ya tiene módulo asignado (localStorage)',
          moduleId: moduloId,
          existing: true
        }
      }

      return { success: true, message: 'Usuario no tiene módulo asignado', existing: false }
    } catch (error) {
      console.error('❌ [queueAgentService] Error verificando módulo existente:', error)
      return { success: false, message: 'Error verificando módulo existente', existing: false }
    }
  }

  async getActiveAgents(): Promise<ActiveAgent[]> {
    try {
      const response = await api.get('/queue-agents/active-agents')
      return response.data || []
    } catch (error) {
      console.error('❌ Error obteniendo agentes activos:', error)
      return []
    }
  }

  async getAgentStatus(userId: number): Promise<QueueAgent | null> {
    try {
      const response = await api.get(`/queue-agents/agent-status/${userId}`)
      return response.data || null
    } catch (error) {
      console.error('❌ Error obteniendo estado del agente:', error)
      return null
    }
  }
}

export const queueAgentService = new QueueAgentService()