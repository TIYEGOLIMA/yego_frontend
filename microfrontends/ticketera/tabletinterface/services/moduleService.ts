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

export interface ModuleOption {
  id: number
  name: string
  description: string
  code: string
  module_id: number
  parent_id?: number
  is_active: boolean
  priority: number
}

export const moduleService = {
  async getAllOptions(): Promise<ModuleOption[]> {
    try {
      const response = await api.get('/modulo-opciones/options')
      return response.data
    } catch (error) {
      console.error('[moduleService] Error obteniendo opciones:', error)
      throw error
    }
  },

  async getSubOptions(parentId: number): Promise<ModuleOption[]> {
    try {
      const response = await api.get(`/modulo-opciones/${parentId}/suboptions`)
      return response.data
    } catch (error) {
      console.error('[moduleService] Error obteniendo subopciones:', error)
      throw error
    }
  }
}
