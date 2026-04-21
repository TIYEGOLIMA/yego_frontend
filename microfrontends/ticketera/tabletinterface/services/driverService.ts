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

export interface CreateDriverData {
  firstName: string
  lastName: string
  phone: string
}

export interface Driver {
  id: number
  firstName: string
  lastName: string
  phone: string
  createdAt: string
}

export interface CreateDriverByDniData {
  dni: string
  phone: string
}

export interface DriverSearchResponse {
  phone: string
  full_name: string
}

export const driverService = {
  async searchDriverByPhone(phoneDigits: string): Promise<DriverSearchResponse | null> {
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
      console.error('[driverService] Error consultando conductor:', error)
      return null
    }
  },

  async createDriverManual(driverData: CreateDriverData): Promise<any> {
    try {
      const response = await api.post('/drivers/registrar', driverData)
      return response.data
    } catch (error) {
      console.error('[driverService] Error registrando conductor:', error)
      throw error
    }
  },

  async createDriverByDni(dniData: CreateDriverByDniData): Promise<any> {
    try {
      const response = await api.post('/drivers/registrar-dni', dniData)
      return response.data
    } catch (error) {
      console.error('[driverService] Error registrando conductor por DNI:', error)
      throw error
    }
  }
}
