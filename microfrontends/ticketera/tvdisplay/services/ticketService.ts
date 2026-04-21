import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_AGENT_API_URL || 'https://api-int.yego.pro/api/ticketera',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

function getRequestToken(): string | null {
  try {
    const authStorage = localStorage.getItem('auth-storage')
    if (authStorage) {
      const parsed = JSON.parse(authStorage)
      const t = parsed?.state?.token
      if (t) return t
    }
  } catch {
    // ignore
  }
  try {
    const raw = localStorage.getItem('dispositivo-session')
    if (raw) return JSON.parse(raw)?.accessToken ?? null
  } catch {
    // ignore
  }
  return localStorage.getItem('token')
}

api.interceptors.request.use(
  (config) => {
    const token = getRequestToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
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
