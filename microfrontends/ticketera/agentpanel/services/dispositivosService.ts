import axios from 'axios'
import { API_BASE_URL } from '../utils/constants'
import { createSingleKeyListCache } from '../utils/listMemoryCache'

export type TipoDispositivo = 'TABLET_PRINCIPAL' | 'TABLET' | 'TV'

export interface Dispositivo {
  id: number
  name: string
  type: TipoDispositivo
  sedeId: number
  sedeNombre?: string | null
  moduleId?: number | null
  moduleNombre?: string | null
  description?: string | null
  active: boolean
  createdAt?: string
  updatedAt?: string | null
  accessTokenPlain?: string
}

export interface CrearDispositivoRequest {
  name: string
  type: TipoDispositivo
  sedeId: number
  moduleId?: number | null
  description?: string | null
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

const listCache = createSingleKeyListCache<Dispositivo[]>()

export const dispositivosService = {
  async listar(): Promise<Dispositivo[]> {
    return listCache.getOrFetch(() => api.get<Dispositivo[]>('/dispositivos').then((r) => r.data))
  },

  async crear(payload: CrearDispositivoRequest): Promise<Dispositivo> {
    const data = await api.post<Dispositivo>('/dispositivos', payload).then((r) => r.data)
    listCache.invalidate()
    return data
  },

  async actualizar(id: number, payload: CrearDispositivoRequest): Promise<Dispositivo> {
    const data = await api.put<Dispositivo>(`/dispositivos/${id}`, payload).then((r) => r.data)
    listCache.invalidate()
    return data
  },

  async desactivar(id: number): Promise<void> {
    await api.delete(`/dispositivos/${id}`)
    listCache.invalidate()
  },

  async regenerarToken(id: number): Promise<Dispositivo> {
    const data = await api.post<Dispositivo>(`/dispositivos/${id}/regenerar-token`).then((r) => r.data)
    listCache.invalidate()
    return data
  },

  async asignarModulo(id: number, moduleId: number | null): Promise<Dispositivo> {
    const data = await api
      .patch<Dispositivo>(`/dispositivos/${id}/modulo`, { moduleId })
      .then((r) => r.data)
    listCache.invalidate()
    return data
  },

  invalidateListCache() {
    listCache.invalidate()
  },
}
