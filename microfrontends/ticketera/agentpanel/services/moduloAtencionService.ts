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
  userId: number
  userName: string
  status: string
  horaAsignacion: string
  createdAt: string
  updatedAt: string | null
}

export interface ModuloAtencionResponse {
  id: number
  name: string
  description?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export const moduloAtencionService = {
  async verificarModuloOListarDisponibles(userId: number): Promise<ModuloAtencion[] | ModuloUsuarioResponse> {
    const response = await api.get(`/modulo-atencion/usuario/${userId}`)
    return response.data
  },

  async obtenerModulosActivos(): Promise<ModuloAtencionResponse[]> {
    const response = await api.get('/modulo-atencion/activos')
    return response.data
  }
}