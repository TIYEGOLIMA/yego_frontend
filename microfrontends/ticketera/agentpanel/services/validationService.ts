import axios from 'axios'
import { API_BASE_URL } from '../utils/constants'
import { normalizeDriverName } from '../utils/utf8Decoder'

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
    console.error('[validationService] Error obteniendo token:', error)
  }
  return config
})

const DRIVER_CACHE_KEY = 'driver_names_cache'
const CACHE_EXPIRY_HOURS = 24

export interface DriverResponse {
  phone: string
  full_name: string
}

const getDriverCache = (): Record<string, { name: string; timestamp: number }> => {
  try {
    const cached = localStorage.getItem(DRIVER_CACHE_KEY)
    if (cached) {
      const cache = JSON.parse(cached)
      const now = Date.now()
      const expiryTime = now - (CACHE_EXPIRY_HOURS * 60 * 60 * 1000)
      
      const validCache: Record<string, { name: string; timestamp: number }> = {}
      Object.entries(cache).forEach(([phone, data]: [string, any]) => {
        if (data.timestamp > expiryTime) {
          validCache[phone] = data
        }
      })
      
      localStorage.setItem(DRIVER_CACHE_KEY, JSON.stringify(validCache))
      return validCache
    }
  } catch (error) {
    console.error('[validationService] Error leyendo cache de conductores:', error)
  }
  return {}
}

const setDriverCache = (phone: string, name: string) => {
  try {
    const cache = getDriverCache()
    cache[phone] = { name, timestamp: Date.now() }
    localStorage.setItem(DRIVER_CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.error('[validationService] Error guardando cache de conductores:', error)
  }
}

export const validationService = {
  async getDriverByPhonePublic(phoneDigits: string): Promise<DriverResponse | null> {
    try {
      let phoneToSearch = phoneDigits.trim()
      
      if (!phoneToSearch.startsWith('+51') && phoneToSearch.length === 9) {
        phoneToSearch = `+51${phoneToSearch}`
      }
      
      const cache = getDriverCache()
      if (cache[phoneToSearch]) {
        return {
          phone: phoneToSearch,
          full_name: cache[phoneToSearch].name
        }
      }
      
      const response = await api.get(`/buscar/telefono/${phoneToSearch}`)
      
      if (response.data && response.data.full_name) {
        const decodedName = normalizeDriverName(response.data.full_name)
        setDriverCache(phoneToSearch, decodedName)
        
        return {
          phone: response.data.phone || phoneToSearch,
          full_name: decodedName
        }
      }
      
      return null
    } catch (error: any) {
      if (error?.response?.status === 404 || error?.response?.status === 400 || error?.response?.status === 403) {
        return null
      }
      console.error('[validationService] Error consultando API:', error)
      return null
    }
  }
}
