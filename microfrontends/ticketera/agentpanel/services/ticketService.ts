import axios from 'axios'
import { API_BASE_URL } from '../utils/constants'
import { Ticket } from '../types'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  try {
    const authStorageData = localStorage.getItem('auth-storage')
    if (authStorageData) {
      const token = JSON.parse(authStorageData)?.state?.token
      if (token) config.headers.Authorization = `Bearer ${token}`
    }
  } catch (error) {
    console.error('[ticketService] Error obteniendo token:', error)
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-storage')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export const ticketService = {
  async getAllTickets(sedeId?: number | null): Promise<Ticket[]> {
    try {
      const params = sedeId != null ? { sedeId } : undefined
      const response = await api.get('/tickets/all', { params })
      return response.data
    } catch (error: any) {
      if (error?.response?.status === 429) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        const params = sedeId != null ? { sedeId } : undefined
        const retryResponse = await api.get('/tickets/all', { params })
        return retryResponse.data
      }
      throw error
    }
  },

  async callTicket(ticketId: number, userId: number, moduleId: number): Promise<Ticket> {
    if (!moduleId) throw new Error('moduleId es requerido para llamar un ticket')
    const response = await api.post(`/tickets/${ticketId}/call/${userId}?moduleId=${moduleId}`)
    return response.data
  },

  async completeTicket(ticketId: number, agentId: number, notes?: string): Promise<Ticket> {
    const validAgentId = Number(agentId)
    if (!validAgentId || validAgentId <= 0) {
      throw new Error(`ID de agente inválido: ${agentId}`)
    }
    const response = await api.post(`/tickets/${ticketId}/complete`, {
      agentId: validAgentId,
      notes: notes && notes.trim() ? notes.trim() : null,
    })
    return response.data
  },

  async cancelTicket(ticketId: number, agentId: number): Promise<Ticket> {
    const response = await api.post(`/tickets/${ticketId}/cancel/${agentId}`)
    return response.data
  },

  async startTicket(ticketId: number, agentId: number): Promise<Ticket> {
    const response = await api.post(`/tickets/${ticketId}/start/${agentId}`)
    return response.data
  },
}
