import axios from 'axios'
import { API_BASE_URL } from '../utils/constants'
import { createKeyedListCache } from '../utils/listMemoryCache'

export interface ModuloAtencion {
  id: number
  name: string
  description?: string | null
  isActive: boolean
  sedeId: number | null
  sedeNombre?: string | null
  createdAt?: string
  updatedAt?: string | null
}

export interface CrearModuloAtencionRequest {
  name: string
  description?: string | null
  sedeId: number
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

const listCache = createKeyedListCache<ModuloAtencion[]>()

function listKey(sedeId?: number | null): string {
  return sedeId != null ? String(sedeId) : 'all'
}

export const modulosAdminService = {
  async listar(sedeId?: number | null): Promise<ModuloAtencion[]> {
    const key = listKey(sedeId)
    return listCache.getOrFetch(key, () =>
      api
        .get<ModuloAtencion[]>('/modulo-atencion', {
          params: sedeId ? { sedeId } : undefined,
        })
        .then((r) => r.data),
    )
  },

  async crear(payload: CrearModuloAtencionRequest): Promise<ModuloAtencion> {
    const data = await api.post<ModuloAtencion>('/modulo-atencion', payload).then((r) => r.data)
    listCache.invalidateAll()
    return data
  },

  async actualizar(id: number, payload: CrearModuloAtencionRequest): Promise<ModuloAtencion> {
    const data = await api.put<ModuloAtencion>(`/modulo-atencion/${id}`, payload).then((r) => r.data)
    listCache.invalidateAll()
    return data
  },

  async cambiarEstado(id: number, activo: boolean): Promise<void> {
    await api.patch(`/modulo-atencion/${id}/estado`, null, { params: { activo } })
    listCache.invalidateAll()
  },

  async eliminar(id: number): Promise<void> {
    await api.delete(`/modulo-atencion/${id}`)
    listCache.invalidateAll()
  },

  invalidateListCache() {
    listCache.invalidateAll()
  },
}
