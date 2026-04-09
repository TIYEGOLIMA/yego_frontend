import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_AGENT_API_URL || 'https://api-int.yego.pro/api/ticketera',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    let token: string | null = null
    try {
      const authStorageData = localStorage.getItem('auth-storage')
      if (authStorageData) {
        const parsedData = JSON.parse(authStorageData)
        token = parsedData?.state?.token || null
      }
    } catch {
      token = localStorage.getItem('token')
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

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
  }
}
