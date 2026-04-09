import axios from 'axios'
import { API_BASE_URL } from '../utils/constants'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use((config) => {
  try {
    const authStorageData = localStorage.getItem('auth-storage')
    if (authStorageData) {
      const parsedData = JSON.parse(authStorageData)
      const token = parsedData?.state?.token || null
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
  } catch (error) {
    console.error('[queueAgentService] Error obteniendo token:', error)
  }
  return config
})

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
  async liberarModuloDelUsuario(): Promise<void> {
    try {
      const authStorageData = localStorage.getItem('auth-storage')
      if (!authStorageData) {
        throw new Error('No hay datos de autenticación')
      }
      
      const parsedData = JSON.parse(authStorageData)
      const user = parsedData?.state?.user || null
      if (!user?.id) {
        throw new Error('Usuario no encontrado')
      }

      const userId = user.id
      await api.post(`/queue-agents/liberar-modulo/${userId}`)
      localStorage.removeItem(`selectedModule_${userId}`)
    } catch (error) {
      console.error('Error liberando módulo:', error)
      throw error
    }
  }

  async liberarModuloPorId(moduleId: number): Promise<{ message?: string; moduleId?: number; userId?: number }> {
    try {
      const response = await api.post(`/queue-agents/liberar-modulo-por-id/${moduleId}`)
      return response.data || {}
    } catch (error) {
      console.error('[queueAgentService] Error liberando módulo por ID:', error)
      throw error
    }
  }

  /**
   * Asigna un módulo a un usuario
   * @param userId ID del usuario
   * @param moduleId ID del módulo a asignar
   */
  async assignModuleToUser(userId: number, moduleId: number): Promise<ModuleAssignmentResponse> {
    try {
      const response = await api.post<any>('/queue-agents/asignar', {
        userId,
        moduleId
      });
      let moduleAssignment;
      if (response.data.moduleId) {
        moduleAssignment = {
          moduleId: response.data.moduleId.toString(),
          assignmentId: response.data.id || response.data.assignmentId,
          status: response.data.status || 'assigned'
        };
      } else if (response.data.data && response.data.data.moduleId) {
        moduleAssignment = {
          moduleId: response.data.data.moduleId.toString(),
          assignmentId: response.data.data.id || response.data.data.assignmentId,
          status: response.data.data.status || 'assigned'
        };
      } else {
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
      console.error('[queueAgentService] Error asignando módulo:', error);
      throw error;
    }
  }
}

export const queueAgentService = new QueueAgentService()
