import { api } from './index'

// Tipos e interfaces
export type TipoTurno = 'diurno' | 'nocturno'

export interface Vehiculo {
  id: string
  placa: string
  marca: string
  modelo: string
  color: string
  año: number
  activo: boolean
  enUso: boolean
  fechaCreacion: string
}

export interface Conductor {
  id: string
  nombre: string
  apellido: string
  telefono: string
  tipoTurno: TipoTurno
  activo: boolean
  fechaCreacion: string
}

export interface Turno {
  id: string
  conductorId: string
  conductor?: Conductor
  vehiculoId?: string
  vehiculo?: Vehiculo
  fecha: string
  horaInicio: string
  horaFin: string
  tipoTurno: TipoTurno
  estado: 'programado' | 'en_curso' | 'completado' | 'cancelado'
  observaciones?: string
  activo: boolean
  fechaCreacion: string
}

export interface CrearTurnoDto {
  conductorId: string
  vehiculoId?: string
  fecha: string
  horaInicio: string
  horaFin: string
  tipoTurno: TipoTurno
  observaciones?: string
}

export interface CrearConductorDto {
  nombre: string
  apellido: string
  telefono: string
  tipoTurno: TipoTurno
}

export interface CrearVehiculoDto {
  placa: string
  marca: string
  modelo: string
  color: string
  año: number
}

export interface EstadisticasTurnos {
  totalTurnos?: number
  turnosDiurnos?: number
  turnosNocturnos?: number
  turnosEnCurso?: number
  conductoresActivos?: number
  vehiculosDisponibles?: number
  vehiculosEnUso?: number
  // KPIs para el dashboard
  viajeActivo: number
  noDisponibles: number
  disponibles: number
  sinGPS: number
}

export const yegoProOpsService = {
  obtenerTurnos: async (fecha?: string): Promise<Turno[]> => {
    const params = fecha ? { fecha } : {}
    const response = await api.get<Turno[]>('/yego-pro-ops/turnos', { params })
    return response.data
  },

  obtenerTurnoPorId: async (id: string): Promise<Turno> => {
    const response = await api.get<Turno>(`/yego-pro-ops/turnos/${id}`)
    return response.data
  },

  obtenerTurnosActivos: async (): Promise<Turno[]> => {
    const response = await api.get<Turno[]>('/yego-pro-ops/turnos/activos')
    return response.data
  },

  crearTurno: async (data: CrearTurnoDto): Promise<Turno> => {
    const response = await api.post<Turno>('/yego-pro-ops/turnos', data)
    return response.data
  },

  actualizarTurno: async (id: string, data: Partial<CrearTurnoDto>): Promise<Turno> => {
    const response = await api.put<Turno>(`/yego-pro-ops/turnos/${id}`, data)
    return response.data
  },

  actualizarEstadoTurno: async (id: string, estado: Turno['estado']): Promise<Turno> => {
    const response = await api.patch<Turno>(`/yego-pro-ops/turnos/${id}/estado`, { estado })
    return response.data
  },

  eliminarTurno: async (id: string): Promise<void> => {
    await api.delete(`/yego-pro-ops/turnos/${id}`)
  },

  obtenerConductores: async (tipoTurno?: string): Promise<Conductor[]> => {
    const params = tipoTurno ? { tipoTurno } : {}
    const response = await api.get<Conductor[]>('/yego-pro-ops/conductores', { params })
    return response.data
  },

  obtenerConductorPorId: async (id: string): Promise<Conductor> => {
    const response = await api.get<Conductor>(`/yego-pro-ops/conductores/${id}`)
    return response.data
  },

  crearConductor: async (data: CrearConductorDto): Promise<Conductor> => {
    const response = await api.post<Conductor>('/yego-pro-ops/conductores', data)
    return response.data
  },

  actualizarConductor: async (id: string, data: Partial<CrearConductorDto>): Promise<Conductor> => {
    const response = await api.put<Conductor>(`/yego-pro-ops/conductores/${id}`, data)
    return response.data
  },

  eliminarConductor: async (id: string): Promise<void> => {
    await api.delete(`/yego-pro-ops/conductores/${id}`)
  },

  obtenerVehiculos: async (disponibles?: boolean): Promise<Vehiculo[]> => {
    const params = disponibles !== undefined ? { disponibles } : {}
    const response = await api.get<Vehiculo[]>('/yego-pro-ops/vehiculos', { params })
    return response.data
  },

  obtenerVehiculoPorId: async (id: string): Promise<Vehiculo> => {
    const response = await api.get<Vehiculo>(`/yego-pro-ops/vehiculos/${id}`)
    return response.data
  },

  crearVehiculo: async (data: CrearVehiculoDto): Promise<Vehiculo> => {
    const response = await api.post<Vehiculo>('/yego-pro-ops/vehiculos', data)
    return response.data
  },

  actualizarVehiculo: async (id: string, data: Partial<CrearVehiculoDto>): Promise<Vehiculo> => {
    const response = await api.put<Vehiculo>(`/yego-pro-ops/vehiculos/${id}`, data)
    return response.data
  },

  eliminarVehiculo: async (id: string): Promise<void> => {
    await api.delete(`/yego-pro-ops/vehiculos/${id}`)
  },

  obtenerEstadisticas: async (): Promise<EstadisticasTurnos> => {
    const response = await api.get<EstadisticasTurnos>('/yego-pro-ops/turnos/estadisticas')
    return response.data
  },
}

