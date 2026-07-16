import { api } from '@/services/core/api'

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

export const dispositivosService = {
  async listar(): Promise<Dispositivo[]> {
    return api.get<Dispositivo[]>('/ticketera/dispositivos').then((response) => response.data)
  },

  async crear(payload: CrearDispositivoRequest): Promise<Dispositivo> {
    const data = await api.post<Dispositivo>('/ticketera/dispositivos', payload).then((r) => r.data)
    return data
  },

  async actualizar(id: number, payload: CrearDispositivoRequest): Promise<Dispositivo> {
    const data = await api.put<Dispositivo>(`/ticketera/dispositivos/${id}`, payload).then((r) => r.data)
    return data
  },

  async desactivar(id: number): Promise<void> {
    await api.delete(`/ticketera/dispositivos/${id}`)
  },

  async regenerarToken(id: number): Promise<Dispositivo> {
    const data = await api.post<Dispositivo>(`/ticketera/dispositivos/${id}/regenerar-token`).then((r) => r.data)
    return data
  },

  async asignarModulo(id: number, moduleId: number | null): Promise<Dispositivo> {
    const data = await api
      .patch<Dispositivo>(`/ticketera/dispositivos/${id}/modulo`, { moduleId })
      .then((r) => r.data)
    return data
  },
}
