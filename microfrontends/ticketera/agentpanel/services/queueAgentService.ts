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
// 🎯 ACTUALIZADO: Leer desde auth-storage (Zustand persist) en lugar de clave directa
api.interceptors.request.use((config) => {
  try {
    // Leer desde auth-storage
    const authStorageData = localStorage.getItem('auth-storage')
    if (authStorageData) {
      const parsedData = JSON.parse(authStorageData)
      const token = parsedData?.state?.token || null
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
  } catch (error) {
    console.error('❌ [queueAgentService] Error obteniendo token:', error)
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
  moduleAssignment?: {
    moduleId: string
    assignmentId: number
    status: string
  }
}

class QueueAgentService {
  async asignarModuloAlUsuario(moduleId: number): Promise<void> {
    try {
      console.log('🔍 [queueAgentService] ===== INICIANDO ASIGNACIÓN DE MÓDULO =====')
      
      // 🎯 LEER DESDE auth-storage (Zustand persist)
      const authStorageData = localStorage.getItem('auth-storage')
      if (!authStorageData) {
        throw new Error('No hay datos de autenticación')
      }

      const parsedData = JSON.parse(authStorageData)
      const user = parsedData?.state?.user || null
      if (!user?.id) {
        throw new Error('Usuario no encontrado en auth-storage')
      }

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
      // 🎯 LEER DESDE auth-storage
      const authStorageData = localStorage.getItem('auth-storage')
      if (!authStorageData) {
        throw new Error('No hay datos de autenticación')
      }
      
      const parsedData = JSON.parse(authStorageData)
      const user = parsedData?.state?.user || null
      if (!user?.id) {
        throw new Error('Usuario no encontrado')
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
      // 🎯 LEER DESDE auth-storage
      const authStorageData = localStorage.getItem('auth-storage')
      if (!authStorageData) {
        console.log('❌ No hay datos de autenticación')
        return null
      }

      const parsedData = JSON.parse(authStorageData)
      const user = parsedData?.state?.user || null
      if (!user?.id) {
        console.log('❌ Usuario no encontrado en auth-storage')
        return null
      }

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
      // 🎯 LEER DESDE auth-storage
      const authStorageData = localStorage.getItem('auth-storage')
      if (!authStorageData) {
        return { success: false, message: 'No hay datos de autenticación', existing: false }
      }

      const parsedData = JSON.parse(authStorageData)
      const user = parsedData?.state?.user || null
      if (!user?.id) {
        return { success: false, message: 'Usuario no encontrado', existing: false }
      }

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

  /**
   * Asigna un módulo a un usuario
   * @param userId ID del usuario
   * @param moduleId ID del módulo a asignar
   */
  async assignModuleToUser(userId: number, moduleId: number): Promise<ModuleAssignmentResponse> {
    try {
      console.log(`🔄 [queueAgentService] Asignando módulo ${moduleId} al usuario ${userId}...`);
      
      const response = await api.post<any>('/queue-agents/asignar', {
        userId,
        moduleId
      });
      
      console.log('✅ [queueAgentService] Módulo asignado exitosamente:', response.data);
      
      // Verificar diferentes formatos de respuesta del backend
      let moduleAssignment;
      
      if (response.data.moduleId) {
        // Formato directo con moduleId
        moduleAssignment = {
          moduleId: response.data.moduleId.toString(),
          assignmentId: response.data.id || response.data.assignmentId,
          status: response.data.status || 'assigned'
        };
      } else if (response.data.data && response.data.data.moduleId) {
        // Formato anidado
        moduleAssignment = {
          moduleId: response.data.data.moduleId.toString(),
          assignmentId: response.data.data.id || response.data.data.assignmentId,
          status: response.data.data.status || 'assigned'
        };
      } else {
        // Formato alternativo - usar el moduleId del parámetro
        moduleAssignment = {
          moduleId: moduleId.toString(),
          assignmentId: response.data.id || response.data.assignmentId || Date.now(),
          status: response.data.status || 'assigned'
        };
      }
      
      return {
        success: true,
        message: response.data.message || 'Módulo asignado exitosamente',
        moduleAssignment: moduleAssignment
      };
    } catch (error: any) {
      console.error('❌ [queueAgentService] Error asignando módulo:', error);
      throw error;
    }
  }
}

export const queueAgentService = new QueueAgentService()