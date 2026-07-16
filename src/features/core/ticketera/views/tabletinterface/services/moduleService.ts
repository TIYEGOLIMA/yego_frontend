import { api } from '@/services/core/api'

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
  async getAllOptions(): Promise<ModuleOption[]> {
    const response = await api.get('/ticketera/modulo-opciones/options')
    return response.data
  },

  async getSubOptions(parentId: number): Promise<ModuleOption[]> {
    const response = await api.get(`/ticketera/modulo-opciones/${parentId}/suboptions`)
    return response.data
  },
}
