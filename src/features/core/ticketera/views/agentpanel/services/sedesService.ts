import { api } from '@/services/core/api'

export interface Sede {
  id: number
  name: string
  description?: string
}

export const sedesService = {
  async listar(): Promise<Sede[]> {
    return api.get<Sede[]>('/ticketera/sedes').then((response) => response.data)
  },
}
