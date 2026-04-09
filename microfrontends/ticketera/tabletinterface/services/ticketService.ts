import axios from 'axios'
import type { CreateTicketData, Ticket } from '../types'

const API_BASE_URL = import.meta.env.VITE_AGENT_API_URL || 'https://api-int.yego.pro/api/ticketera'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const ticketService = {
  async createTicketPublic(data: CreateTicketData): Promise<Ticket> {
    try {
      const response = await api.post('/tickets/create', data)
      return response.data
    } catch (error: any) {
      console.error('[ticketService] Error creando ticket público:', error)

      if (error?.response) {
        console.error('[ticketService] Detalles del error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        })
      }

      throw error
    }
  }
}
