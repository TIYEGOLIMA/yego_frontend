import axios from 'axios'

// 🌐 API Instance inline para evitar problemas de import
const api = axios.create({
  baseURL: 'http://localhost:3030/api/ticketera',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export interface Module {
  id: number
  name: string
  description: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

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
  async getAllModules(): Promise<Module[]> {
    try {
      const response = await api.get('/modulos/frontend')
      return response.data
    } catch (error) {
      console.error('❌ [moduleService] Error obteniendo módulos:', error)
      throw error
    }
  },

  async getAvailableModules(): Promise<Module[]> {
    try {
      const allModules = await this.getAllModules()
      return allModules.filter(module => module.isActive)
    } catch (error) {
      console.error('❌ [moduleService] Error obteniendo módulos disponibles:', error)
      throw error
    }
  },

  async getAllOptions(): Promise<ModuleOption[]> {
    try {
      const response = await api.get('/modulo-opciones/options')
      return response.data
    } catch (error) {
      console.error('❌ [moduleService] Error obteniendo opciones:', error)
      throw error
    }
  },

  async getSubOptions(parentId: number): Promise<ModuleOption[]> {
    try {
      const response = await api.get(`/modulo-opciones/${parentId}/suboptions`)
      return response.data
    } catch (error) {
      console.error('❌ [moduleService] Error obteniendo subopciones:', error)
      throw error
    }
  },

  async getModuleOptions(moduleId: number): Promise<ModuleOption[]> {
    try {
      const response = await api.get(`/modules/modulo-atencion/${moduleId}/opciones`)
      return response.data
    } catch (error) {
      console.error('❌ [moduleService] Error obteniendo opciones del módulo:', error)
      throw error
    }
  },

  async getMainModuleOptions(moduleId: number): Promise<ModuleOption[]> {
    try {
      const response = await api.get(`/modules/modulo-atencion/${moduleId}/opciones-principales`)
      return response.data
    } catch (error) {
      console.error('❌ [moduleService] Error obteniendo opciones principales del módulo:', error)
      throw error
    }
  },

  async getSubModuleOptions(moduleId: number, parentId: number): Promise<ModuleOption[]> {
    try {
      const response = await api.get(`/modules/modulo-atencion/${moduleId}/opciones/${parentId}/subopciones`)
      return response.data
    } catch (error) {
      console.error('❌ [moduleService] Error obteniendo subopciones del módulo:', error)
      throw error
    }
  }
}