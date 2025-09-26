import axios from 'axios'

// 🌐 API Instance inline para TVDisplay
const api = axios.create({
  baseURL: 'http://localhost:3030/api/ticketera',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 📝 Interface para Ticket (local para TVDisplay)
interface Ticket {
  id: number
  ticketNumber: string
  status: string
  createdAt: string
  priority: number
  moduleId?: number
  agent_id?: number | null
  phone?: string
  userId?: number | null
  licenseNumber?: string
  driverName?: string
  calledAt?: string | null
  completedAt?: string | null
  agentId?: number
}

export const ticketService = {
  async getTickets(): Promise<Ticket[]> {
    try {
      const response = await api.get('/tickets/all')
      return response.data
    } catch (error: any) {
      if (error?.response?.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        const retryResponse = await api.get('/tickets/all')
        return retryResponse.data
      }
      console.error('❌ [ticketService] Error obteniendo tickets:', error)
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

  async getCalledTickets(): Promise<Ticket[]> {
    try {
      const response = await api.get('/tickets/called')
      return response.data
    } catch (error) {
      console.error('❌ [ticketService] Error obteniendo tickets llamados:', error)
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

  async searchDriverByPhone(phoneDigits: string): Promise<{ phone: string, full_name: string } | null> {
    try {
      let phoneToSearch = phoneDigits.trim()
      
      if (!phoneToSearch.startsWith('+51') && phoneToSearch.length === 9) {
        phoneToSearch = `+51${phoneToSearch}`
      }
      
      const response = await api.get(`/buscar/telefono/${phoneToSearch}`)
      return response.data
    } catch (error: any) {
      if (error?.response?.status === 404 || error?.response?.status === 400) {
        return null
      }
      console.error('❌ [ticketService] Error consultando conductor:', error)
      return null
    }
  }
}
