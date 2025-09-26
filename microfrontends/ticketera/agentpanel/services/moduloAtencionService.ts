import axios from 'axios'
import { API_BASE_URL } from '../utils/constants'

// 🔧 Instancia axios específica para módulos de atención
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 🔐 Interceptor para agregar token automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface ModuloAtencion {
  id: number
  name: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ModuloAtencionFrontend {
  id: number
  name: string
  description?: string
  isActive: boolean
  displayName?: string
  order?: number
}

export const moduloAtencionService = {
  async getAllModules(): Promise<ModuloAtencion[]> {
    try {
      const response = await api.get('/modulo-atencion')
      return response.data
    } catch (error) {
      console.error('❌ [moduloAtencionService] Error obteniendo módulos de atención:', error)
      throw error
    }
  },

  async getActiveModules(): Promise<ModuloAtencion[]> {
    try {
      const response = await api.get('/modulo-atencion/activos')
      return response.data
    } catch (error) {
      console.error('❌ [moduloAtencionService] Error obteniendo módulos activos:', error)
      throw error
    }
  },

  async getFrontendModules(): Promise<ModuloAtencionFrontend[]> {
    try {
      const response = await api.get('/modulo-atencion/frontend')
      return response.data
    } catch (error) {
      console.error('❌ [moduloAtencionService] Error obteniendo módulos para frontend:', error)
      throw error
    }
  },

  async getModuleById(moduleId: number): Promise<ModuloAtencion | null> {
    try {
      const modules = await this.getAllModules()
      return modules.find(module => module.id === moduleId) || null
    } catch (error) {
      console.error('❌ [moduloAtencionService] Error obteniendo módulo por ID:', error)
      return null
    }
  },

  async getActiveModuleById(moduleId: number): Promise<ModuloAtencion | null> {
    try {
      const modules = await this.getActiveModules()
      return modules.find(module => module.id === moduleId) || null
    } catch (error) {
      console.error('❌ [moduloAtencionService] Error obteniendo módulo activo por ID:', error)
      return null
    }
  }
}