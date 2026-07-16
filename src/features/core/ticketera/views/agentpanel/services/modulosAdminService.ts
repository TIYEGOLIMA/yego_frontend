import { api } from '@/services/core/api'

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

export const modulosAdminService = {
  async listar(sedeId?: number | null): Promise<ModuloAtencion[]> {
    return api
      .get<ModuloAtencion[]>('/ticketera/modulo-atencion', {
        params: sedeId ? { sedeId } : undefined,
      })
      .then((response) => response.data)
  },

  async crear(payload: CrearModuloAtencionRequest): Promise<ModuloAtencion> {
    const data = await api.post<ModuloAtencion>('/ticketera/modulo-atencion', payload).then((r) => r.data)
    return data
  },

  async actualizar(id: number, payload: CrearModuloAtencionRequest): Promise<ModuloAtencion> {
    const data = await api.put<ModuloAtencion>(`/ticketera/modulo-atencion/${id}`, payload).then((r) => r.data)
    return data
  },

  async cambiarEstado(id: number, activo: boolean): Promise<void> {
    await api.patch(`/ticketera/modulo-atencion/${id}/estado`, null, { params: { activo } })
  },

  async eliminar(id: number): Promise<void> {
    await api.delete(`/ticketera/modulo-atencion/${id}`)
  },
}
