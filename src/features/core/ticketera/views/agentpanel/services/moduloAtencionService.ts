import { api } from '@/services/core/api'

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
      .get(`/ticketera/modulo-atencion/usuario/${userId}`, {
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
