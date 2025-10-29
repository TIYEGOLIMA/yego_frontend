import axios from 'axios'
import { API_BASE_URL } from '../utils/constants'
import { normalizeDriverName } from '../utils/utf8Decoder'

// 🔧 Instancia axios específica para validaciones
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 🔐 Interceptor para agregar token automáticamente
// 🎯 ACTUALIZADO: Leer desde auth-storage (Zustand persist) en lugar de clave directa
api.interceptors.request.use((config) => {
  try {
    // Leer desde auth-storage
    const authStorageData = localStorage.getItem('auth-storage')
    if (authStorageData) {
      const parsedData = JSON.parse(authStorageData)
      const token = parsedData?.state?.token || null
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
  } catch (error) {
    console.error('❌ [validationService] Error obteniendo token:', error)
  }
  return config
})

const DRIVER_CACHE_KEY = 'driver_names_cache'
const CACHE_EXPIRY_HOURS = 24

export interface DriverResponse {
  phone: string
  full_name: string
}

export interface DriverError {
  error: string
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
    console.error('❌ [validationService] Error leyendo cache de conductores:', error)
  }
  return {}
}

const setDriverCache = (phone: string, name: string) => {
  try {
    const cache = getDriverCache()
    cache[phone] = { name, timestamp: Date.now() }
    localStorage.setItem(DRIVER_CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.error('❌ [validationService] Error guardando cache de conductores:', error)
  }
}

export const validationService = {
  async validateDriver(phoneDigits: string): Promise<DriverResponse | null> {
    try {
      let phoneToSearch = phoneDigits.trim()
      
      if (!phoneToSearch.startsWith('+51') && phoneToSearch.length === 9) {
        phoneToSearch = `+51${phoneToSearch}`
      }
      
      const response = await api.get(`/buscar/telefono/${phoneToSearch}`)
      
      // Tu backend devuelve Optional<Map<String, Object>>, pero Spring lo convierte a JSON
      // Si no encuentra el conductor, devuelve 404, si lo encuentra devuelve el Map
      if (response.data && response.data.full_name) {
        return {
          phone: response.data.phone || phoneToSearch,
          full_name: response.data.full_name
        }
      }
      
      return null
    } catch (error: any) {
      if (error?.response?.status === 404 || error?.response?.status === 400) {
        return null
      }
      console.error('❌ [validationService] Error consultando API de drivers:', error)
      return null
    }
  },

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
      
      // Tu backend devuelve Optional<Map<String, Object>> con full_name y phone
      if (response.data && response.data.full_name) {
        const decodedName = normalizeDriverName(response.data.full_name)
        
        // Guardar en cache
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
      console.error('❌ [validationService] Error consultando API:', error)
      return null
    }
  },

  async preloadDrivers(phoneNumbers: string[]): Promise<void> {
    const uniquePhones = [...new Set(phoneNumbers)].filter(phone => phone && phone.trim())
    const cache = getDriverCache()
    
    const phonesToLoad = uniquePhones.filter(phone => !cache[phone])
    
    if (phonesToLoad.length === 0) {
      return
    }
    
    const batchSize = 5
    for (let i = 0; i < phonesToLoad.length; i += batchSize) {
      const batch = phonesToLoad.slice(i, i + batchSize)
      await Promise.allSettled(
        batch.map(phone => validationService.getDriverByPhonePublic(phone))
      )
      
      if (i + batchSize < phonesToLoad.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }
}