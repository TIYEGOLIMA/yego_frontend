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

api.interceptors.request.use((config) => {
  const token = getRequestToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const ticketService = {
  async createTicketPublic(data: CreateTicketData): Promise<Ticket> {
    const response = await api.post('/tickets/create', data)
    return response.data
  }
}
