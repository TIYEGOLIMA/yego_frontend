import axios from 'axios'
import { API_BASE_URL } from '../utils/constants'

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
      const token = parsedData?.state?.token
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
  } catch (error) {
    console.error('Error obteniendo token:', error)
  }
  return config
})

export interface ModuloAtencion {
  id: number
  name: string
  description?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
  sedeId?: number
  sedeNombre?: string
}

export interface ModuloUsuarioResponse {
  tieneModuloAsignado: boolean
  moduloAsignado?: {
    moduleId: number
    status: string
    isActive: boolean
    createdAt: string
  }
  modulosDisponibles?: ModuloAtencion[]
  modulosOcupados?: ModuloOcupado[]
}

export interface ModuloOcupado {
  moduleId: number
  moduleName?: string
  userId: number
  userName: string
  status: string
  horaAsignacion: string
  createdAt: string
  updatedAt: string | null
}

const inflightVerificar = new Map<string, Promise<ModuloAtencion[] | ModuloUsuarioResponse>>()

export const moduloAtencionService = {
  async verificarModuloOListarDisponibles(
    userId: number,
    sedeId?: number
  ): Promise<ModuloAtencion[] | ModuloUsuarioResponse> {
    const key = `${userId}|${sedeId ?? ''}`
    const existing = inflightVerificar.get(key)
    if (existing) return existing

    const promise = api
      .get(`/modulo-atencion/usuario/${userId}`, {
        params: sedeId ? { sedeId } : undefined,
      })
      .then((r) => r.data)
      .finally(() => {
        inflightVerificar.delete(key)
      })

    inflightVerificar.set(key, promise)
    return promise
  },
}