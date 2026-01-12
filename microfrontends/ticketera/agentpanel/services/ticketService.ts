import axios from 'axios'
import { API_BASE_URL } from '../utils/constants'
import { 
  Ticket, 
  CreateTicketData,
} from '../types'

// 🔧 Instancia axios específica para tickets
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
    console.error('❌ [ticketService] Error obteniendo token:', error)
  }
  return config
})

// 🔄 Interceptor para manejar renovación automática de tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        console.log('🔄 [ticketService] Token expirado, intentando renovar...')
        
        // 🎯 LEER TOKEN DESDE auth-storage
        const authStorageData = localStorage.getItem('auth-storage')
        if (authStorageData) {
          const parsedData = JSON.parse(authStorageData)
          const currentToken = parsedData?.state?.token || null
          
          if (currentToken) {
            // Usar el endpoint específico de ticketera
            const refreshResponse = await api.post('/ticketera/auth/refresh', {}, {
              headers: { 'Authorization': `Bearer ${currentToken}` }
            })
            
            // Actualizar token en auth-storage
            const newToken = refreshResponse.data.accessToken
            if (newToken) {
              // Actualizar auth-storage con el nuevo token
              const updatedAuthStorage = {
                ...parsedData,
                state: {
                  ...parsedData.state,
                  token: newToken
                }
              }
              localStorage.setItem('auth-storage', JSON.stringify(updatedAuthStorage))
            }
            
            // Reintentar request original
            error.config.headers['Authorization'] = `Bearer ${newToken}`
            return api.request(error.config)
          }
        }
      } catch (refreshError) {
        console.warn('⚠️ [ticketService] Error renovando token:', refreshError)
        // Redirigir a login si no podemos renovar
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export const ticketService = {
  async createTicket(data: CreateTicketData): Promise<Ticket> {
    try {
      const response = await api.post('/tickets/create', data)
      return response.data
    } catch (error) {
      console.error('❌ [ticketService] Error creando ticket:', error)
      throw error
    }
  },

  async createTicketPublic(data: CreateTicketData): Promise<Ticket> {
    try {
      console.log('🎫 [ticketService] Creando ticket público con datos:', data)
      
      const response = await api.post('/tickets/create', data)
      console.log('✅ [ticketService] Ticket creado exitosamente:', response.data)
      
      return response.data
    } catch (error: any) {
      console.error('❌ [ticketService] Error creando ticket público:', error)
      
      // Log detallado del error
      if (error?.response) {
        console.error('📊 [ticketService] Detalles del error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        })
      }
      
      throw error
    }
  },

  async getAllTickets(): Promise<Ticket[]> {
    try {
      const response = await api.get('/tickets/all')
      return response.data
    } catch (error: any) {
      if (error?.response?.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        const retryResponse = await api.get('/tickets/all')
        return retryResponse.data
      }
      console.error('❌ [ticketService] Error obteniendo todos los tickets:', error)
      throw error
    }
  },

  async getTicketById(ticketId: number): Promise<Ticket> {
    try {
      console.log(`🎯 [ticketService] Obteniendo ticket con ID: ${ticketId}`)
      const response = await api.get(`/tickets/${ticketId}`)
      console.log('✅ [ticketService] Ticket obtenido:', response.data)
      return response.data
    } catch (error: any) {
      console.error(`❌ [ticketService] Error obteniendo ticket con ID ${ticketId}:`, error)
      throw new Error(`Error obteniendo ticket: ${error?.response?.data?.message || error?.message}`)
    }
  },

  async getTickets(): Promise<Ticket[]> {
    try {
      const response = await api.get('/tickets/waiting')
      return response.data
    } catch (error: any) {
      if (error?.response?.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        const retryResponse = await api.get('/tickets/waiting')
        return retryResponse.data
      }
      console.error('❌ [ticketService] Error obteniendo tickets:', error)
      throw error
    }
  },

  async getTicketsByStatus(status: string): Promise<Ticket[]> {
    try {
      const response = await api.get(`/tickets/status/${status}`)
      return response.data
    } catch (error) {
      console.error('❌ [ticketService] Error obteniendo tickets por estado:', error)
      throw error
    }
  },

  async getTicketWaiting(): Promise<Ticket[]> {
    try {
      const response = await api.get('/tickets/waiting')
      return response.data
    } catch (error) {
      console.error('❌ [ticketService] Error obteniendo tickets en espera:', error)
      throw error
    }
  },

  async getLastCalledTicket(): Promise<Ticket | null> {
    try {
      const response = await api.get('/tickets/last-called')
      return response.data
    } catch (error) {
      console.error('❌ [ticketService] Error obteniendo último ticket llamado:', error)
      throw error
    }
  },

  async getCalledTickets(): Promise<Ticket[]> {
    try {
      const response = await api.get('/tickets/called')
      return response.data
    } catch (error) {
      console.error('❌ [ticketService] Error obteniendo tickets llamados:', error)
      throw error
    }
  },

  async callTicket(ticketId: number, userId: number, moduleId: number): Promise<Ticket> {
    try {
      console.log('🎯 [ticketService] Llamando ticket:', { ticketId, userId, moduleId })
      
      if (!moduleId) {
        throw new Error('moduleId es requerido para llamar un ticket')
      }
      
      // 🎯 Usar el endpoint correcto: POST /{ticketId}/call/{userId}?moduleId={moduleId}
      const response = await api.post(`/tickets/${ticketId}/call/${userId}?moduleId=${moduleId}`)
      console.log('✅ [ticketService] Respuesta del backend:', response.data)
      
      return response.data
    } catch (error: any) {
      console.error('❌ [ticketService] Error llamando ticket:', error)
      console.error('🔍 [ticketService] Detalles del error:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        url: error?.config?.url,
        method: error?.config?.method
      })
      throw new Error(`Error llamando ticket: ${error?.response?.data?.message || error?.message}`)
    }
  },

  async completeTicket(ticketId: number, agentId: number, notes?: string): Promise<Ticket> {
    try {
      const validAgentId = Number(agentId)
      if (!validAgentId || validAgentId <= 0) {
        throw new Error(`ID de agente inválido: ${agentId}`)
      }
      
      const validNotes = notes && notes.trim() ? notes.trim() : null
      
      const requestData = {
        agentId: validAgentId,
        notes: validNotes
      }
      
      console.log('🎯 [ticketService] Completando ticket:', { ticketId, agentId, notes: validNotes })
      
      // 🎯 Usar el endpoint correcto: POST /{ticketId}/complete
      const response = await api.post(`/tickets/${ticketId}/complete`, requestData)
      console.log('✅ [ticketService] Respuesta del backend:', response.data)
      
      return response.data
    } catch (error: any) {
      console.error('❌ [ticketService] Error completando ticket:', error)
      throw new Error(`Error completando ticket: ${error?.response?.data?.message || error?.message}`)
    }
  },

  async cancelTicket(ticketId: number, agentId: number): Promise<Ticket> {
    try {
      console.log('🎯 [ticketService] Cancelando ticket:', { ticketId, agentId })
      
      // 🎯 Usar el endpoint correcto: POST /{ticketId}/cancel/{agentId}
      const response = await api.post(`/tickets/${ticketId}/cancel/${agentId}`)
      console.log('✅ [ticketService] Respuesta del backend:', response.data)
      
      return response.data
    } catch (error: any) {
      console.error('❌ [ticketService] Error cancelando ticket:', error)
      throw new Error(`Error cancelando ticket: ${error?.response?.data?.message || error?.message}`)
    }
  },

  async startTicket(ticketId: number, agentId: number): Promise<Ticket> {
    try {
      console.log('🎯 [ticketService] Iniciando atención de ticket:', { ticketId, agentId })
      
      // 🎯 Usar el endpoint correcto: POST /{ticketId}/start/{agentId}
      const response = await api.post(`/tickets/${ticketId}/start/${agentId}`)
      console.log('✅ [ticketService] Respuesta del backend:', response.data)
      
      return response.data
    } catch (error: any) {
      console.error('❌ [ticketService] Error iniciando ticket:', error)
      throw new Error(`Error iniciando ticket: ${error?.response?.data?.message || error?.message}`)
    }
  },

  async getStats(): Promise<{
    enEspera: number
    llamados: number
    atendidos: number
    completados: number
  }> {
    try {
      const response = await api.get('/tickets/stats')
      return response.data
    } catch (error) {
      console.error('❌ [ticketService] Error obteniendo estadísticas:', error)
      throw error
    }
  },

  async getTicketsByModule(moduleId: number): Promise<Ticket[]> {
    try {
      console.log('🎯 [ticketService] Obteniendo tickets del módulo:', moduleId)
      const response = await api.get(`/tickets/modulo/${moduleId}/completos`)
      
      // 🎯 DEBUGGING: Ver qué estructura devuelve el endpoint
      console.log('🔍 [ticketService] Tipo de response.data:', typeof response.data)
      console.log('🔍 [ticketService] ¿Es array?', Array.isArray(response.data))
      console.log('🔍 [ticketService] Estructura completa:', response.data)
      
      // 🎯 MANEJAR DIFERENTES ESTRUCTURAS DE RESPUESTA
      let tickets: any[] = []
      
      if (Array.isArray(response.data)) {
        // Si es un array directo
        tickets = response.data
      } else if (response.data && typeof response.data === 'object') {
        // Si es un objeto con propiedades
        if (response.data.tickets && Array.isArray(response.data.tickets)) {
          tickets = response.data.tickets
        } else if (response.data.data && Array.isArray(response.data.data)) {
          tickets = response.data.data
        } else if (response.data.content && Array.isArray(response.data.content)) {
          tickets = response.data.content
        } else {
          // Si no hay estructura conocida, intentar convertir el objeto
          console.log('⚠️ [ticketService] Estructura desconocida, intentando convertir...')
          tickets = Object.values(response.data).filter(item => Array.isArray(item)).flat()
        }
      }
      
      console.log('✅ [ticketService] Tickets extraídos:', tickets.length)
      console.log('✅ [ticketService] Primer ticket:', tickets[0])
      
      // 🎯 MAPEAR LOS TICKETS
      return tickets.map(ticket => ({
        ...ticket,
        userId: ticket.agent_id || null,
        optionId: undefined,
        licenseNumber: ticket.phone,
        user: undefined,
        option: undefined
      }))
      
    } catch (error: any) {
      if (error?.response?.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        const retryResponse = await api.get(`/tickets/modulo/${moduleId}/completos`)
        
        let tickets: any[] = []
        if (Array.isArray(retryResponse.data)) {
          tickets = retryResponse.data
        } else if (retryResponse.data && typeof retryResponse.data === 'object') {
          if (retryResponse.data.tickets && Array.isArray(retryResponse.data.tickets)) {
            tickets = retryResponse.data.tickets
          } else if (retryResponse.data.data && Array.isArray(retryResponse.data.data)) {
            tickets = retryResponse.data.data
          } else if (retryResponse.data.content && Array.isArray(retryResponse.data.content)) {
            tickets = retryResponse.data.content
          } else {
            tickets = Object.values(retryResponse.data).filter(item => Array.isArray(item)).flat()
          }
        }
        
        return tickets.map(ticket => ({
          ...ticket,
          userId: ticket.agent_id || null,
          optionId: undefined,
          licenseNumber: ticket.phone,
          user: undefined,
          option: undefined
        }))
      }
      console.error('❌ [ticketService] Error obteniendo tickets por módulo:', error)
      throw error
    }
  },

  async getWaitingTicketsByModule(moduleId: number): Promise<Ticket[]> {
    try {
      const response = await api.get(`/tickets/modulo/${moduleId}/waiting`)
      return response.data
    } catch (error) {
      console.error('❌ [ticketService] Error obteniendo tickets en espera por módulo:', error)
      throw error
    }
  },

  async getModuleStats(moduleId: number): Promise<any> {
    try {
      const response = await api.get(`/tickets/modulo/${moduleId}/stats`)
      return response.data
    } catch (error) {
      console.error('❌ [ticketService] Error obteniendo estadísticas del módulo:', error)
      throw error
    }
  }
}