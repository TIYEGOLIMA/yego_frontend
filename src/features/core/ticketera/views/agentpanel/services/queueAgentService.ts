import { api } from '@/services/core/api'
import { useAuthStore } from '@/store/auth-store'
import { safeRemoveItem } from '../utils/storage'

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
      const user = useAuthStore.getState().user
      if (!user?.id) {
        throw new Error('Usuario no encontrado')
      }

      const userId = user.id
      await api.post(`/ticketera/queue-agents/liberar-modulo/${userId}`)
      safeRemoveItem(`selectedModule_${userId}`)
    } catch (error) {
      console.error('Error liberando módulo:', error)
      throw error
    }
  }

  async liberarModuloPorId(moduleId: number): Promise<{ message?: string; moduleId?: number; userId?: number }> {
    try {
      const response = await api.post(`/ticketera/queue-agents/liberar-modulo-por-id/${moduleId}`)
      return response.data || {}
    } catch (error) {
      console.error('[queueAgentService] Error liberando módulo por ID:', error)
      throw error
    }
  }

  async assignModuleToUser(
    userId: number,
    moduleId: number,
    sedeId?: number
  ): Promise<ModuleAssignmentResponse> {
    try {
      const response = await api.post<Record<string, unknown>>('/ticketera/queue-agents/asignar', {
        userId,
        moduleId,
        ...(sedeId !== undefined ? { sedeId } : {}),
      });
      const responseData = response.data
      const nestedData = responseData.data && typeof responseData.data === 'object'
        ? responseData.data as Record<string, unknown>
        : null
      let moduleAssignment
      if (responseData.moduleId) {
        moduleAssignment = {
          moduleId: String(responseData.moduleId),
          assignmentId: Number(responseData.id || responseData.assignmentId),
          status: String(responseData.status || 'assigned')
        };
      } else if (nestedData?.moduleId) {
        moduleAssignment = {
          moduleId: String(nestedData.moduleId),
          assignmentId: Number(nestedData.id || nestedData.assignmentId),
          status: String(nestedData.status || 'assigned')
        };
      } else {
        moduleAssignment = {
          moduleId: moduleId.toString(),
          assignmentId: Number(responseData.id || responseData.assignmentId || Date.now()),
          status: String(responseData.status || 'assigned')
        };
      }
      
      return {
        success: true,
        message: String(responseData.message || 'Módulo asignado exitosamente'),
        moduleAssignment: moduleAssignment
      };
    } catch (error: unknown) {
      console.error('[queueAgentService] Error asignando módulo:', error);
      throw error;
    }
  }
}

export const queueAgentService = new QueueAgentService()
