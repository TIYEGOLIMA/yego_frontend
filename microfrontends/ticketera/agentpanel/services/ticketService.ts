import axios from 'axios'
import { API_BASE_URL } from '../utils/constants'
import { Ticket } from '../types'

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
    console.error('[ticketService] Error obteniendo token:', error)
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        const authStorageData = localStorage.getItem('auth-storage')
        if (authStorageData) {
          const parsedData = JSON.parse(authStorageData)
          const currentToken = parsedData?.state?.token || null
          
          if (currentToken) {
            const refreshResponse = await api.post('/ticketera/auth/refresh', {}, {
              headers: { 'Authorization': `Bearer ${currentToken}` }
            })
            
            const newToken = refreshResponse.data.accessToken
            if (newToken) {
              const updatedAuthStorage = {
                ...parsedData,
                state: {
                  ...parsedData.state,
                  token: newToken
                }
              }
              localStorage.setItem('auth-storage', JSON.stringify(updatedAuthStorage))
            }
            
            error.config.headers['Authorization'] = `Bearer ${newToken}`
            return api.request(error.config)
          }
        }
      } catch (refreshError) {
        console.error('[ticketService] Error renovando token:', refreshError)
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export const ticketService = {
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
      console.error('[ticketService] Error obteniendo todos los tickets:', error)
      throw error
    }
  },

  async callTicket(ticketId: number, userId: number, moduleId: number): Promise<Ticket> {
    try {
      if (!moduleId) {
        throw new Error('moduleId es requerido para llamar un ticket')
      }
      
      const response = await api.post(`/tickets/${ticketId}/call/${userId}?moduleId=${moduleId}`)
      
      return response.data
    } catch (error: any) {
      console.error('[ticketService] Error llamando ticket:', error)
      console.error('[ticketService] Detalles del error:', {
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
      
      const response = await api.post(`/tickets/${ticketId}/complete`, requestData)
      
      return response.data
    } catch (error: any) {
      console.error('[ticketService] Error completando ticket:', error)
      throw new Error(`Error completando ticket: ${error?.response?.data?.message || error?.message}`)
    }
  },

  async cancelTicket(ticketId: number, agentId: number): Promise<Ticket> {
    try {
      const response = await api.post(`/tickets/${ticketId}/cancel/${agentId}`)
      
      return response.data
    } catch (error: any) {
      console.error('[ticketService] Error cancelando ticket:', error)
      throw new Error(`Error cancelando ticket: ${error?.response?.data?.message || error?.message}`)
    }
  },

  async startTicket(ticketId: number, agentId: number): Promise<Ticket> {
    try {
      const response = await api.post(`/tickets/${ticketId}/start/${agentId}`)
      
      return response.data
    } catch (error: any) {
      console.error('[ticketService] Error iniciando ticket:', error)
      throw new Error(`Error iniciando ticket: ${error?.response?.data?.message || error?.message}`)
    }
  }
}
