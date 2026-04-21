import axios from 'axios'
import { API_BASE_URL } from '../utils/constants'
import { createSingleKeyListCache } from '../utils/listMemoryCache'

export interface Sede {
  id: number
  name: string
  description?: string
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('auth-storage')
    if (raw) {
      const parsed = JSON.parse(raw)
      const token = parsed?.state?.token
      if (token) config.headers.Authorization = `Bearer ${token}`
    }
  } catch {
    // ignorar
  }
  return config
})

const listCache = createSingleKeyListCache<Sede[]>()

export const sedesService = {
  async listar(): Promise<Sede[]> {
    return listCache.getOrFetch(() => api.get<Sede[]>('/sedes').then((r) => r.data))
  },

  invalidateCache() {
    listCache.invalidate()
  },
}
