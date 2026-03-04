import { api } from './core/api'

// Tipos e interfaces
export type TipoTurno = 'diurno' | 'nocturno'

export interface DriverItem {
  driver_id: string
  full_name: string
  coordinates?: {
    lon: number
    lat: number
}
  status: 'free' | 'busy' | 'offline' | 'in_order' | 'online'
  balance: number
  status_duration?: number
  photo_url?: string
  avatar_url?: string
  code?: string
  car_number?: string
  phone?: string
  hiring_segment?: string
  groups?: string[]
}


export interface ConductorEnOrden {
  id: string
  avatar_url: string
  balance: string
  first_name: string
  last_name: string
  status: string
  vehicle_number: string | null
  viajes?: ViajePorFecha[] // Viajes del día de HOY
  summary_distance?: SummaryDistance
  total_activity_time?: number
  completed_trips_count?: number
  completed_trips_total_price?: number
}

export interface SummaryDistance {
  common: number
  active: number
  not_active: number
  offline: number
  busy: number
  free: number
  in_order: number
  vehicle_number?: string
}

export interface ConductoresEnOrdenResponse {
  type: string
  total: number
  timestamp: string
  conductores: ConductorEnOrden[]
  summary_distance?: SummaryDistance
  completed_trips_count?: number
  completed_trips_total_price?: number
}


export interface DriverTimelineOrder {
  status: string
  short_id: number
  id: string
  driver_id: string
  driver_full_name: string
  ended_at: string
  booked_at: string
  car_brand_model: string
}

export interface DriverTimelineResponse {
  date_from: string
  date_to: string
  orders: DriverTimelineOrder[]
}

export interface TripSimplificado {
  status: string
  id: string
  ended_at: string | null
  booked_at: string
}

export interface DriverViajesData {
  driver_id: string
  driver_full_name: string
  car_brand_model: string
  trips: TripSimplificado[]
}

export interface ViajesSimplificadosResponse {
  date_from: string
  date_to: string
  drivers: DriverViajesData[]
}

export interface ViajePorFecha {
  status: string
  short_id: number
  id: string
  ended_at: string | null
  booked_at: string
  // driver_id, driver_full_name y car_brand_model ya no vienen aquí
  // porque son repetitivos (ya están a nivel de conductor)
}

export interface ViajesPorFechaResponse {
  date_from: string
  date_to: string
  trips: ViajePorFecha[]
}

export interface TipoTurnoFecha {
  id: number
  tipoTurno: 'diurno' | 'nocturno'
}

export interface FechaTurno {
  fecha: string
  tiposTurno: TipoTurnoFecha[]
}

export interface FechasTurnosResponse {
  driverId: string
  fechas: FechaTurno[]
}

export interface KpiFilterParams {
  park_id?: string
  statuses?: string[]
  only_no_gps?: boolean
  car?: Record<string, any>
  sort?: {
    field: string
    direction: 'asc' | 'desc'
  }
}

export interface ViajeCompleto {
  status: string
  short_id: number
  id: string
  driver_id: string
  driver_full_name: string
  ended_at: string
  booked_at: string
  car_brand_model: string
  distance: number | null
  cash: number | null
  card: number | null
  price: number | null
  price_bonus: number | null
  price_commission_park: number | null
  price_commission_service: number | null
  price_corporate: number | null
  price_other: number | null
  price_partner_rides: number | null
  price_promotion: number | null
  price_tip: number | null
  address_from?: string | null
  address_to?: string | null
}

/**
 * Turno de un conductor
 */
export interface TurnoResumen {
  id: number
  fecha: string
  hora_inicio: string
  hora_fin: string
  tipo_turno: 'diurno' | 'nocturno'
  duracion_minutos: number
  monto_total: number
  pagado: boolean
}

/**
 * Conductor con resumen de pagos
 */
export interface ConductorResumenPagos {
  driver_id: string
  avatar_url?: string
  nombre?: string
  telefono?: string
  placa?: string | null  // Placa del vehículo (de la liquidación)
  monto_total_pagar: number  // Campo que viene del backend
  monto_total_pagado?: number  // Mantener por compatibilidad
  produccion_total?: number   // Suma de producción total (todos los turnos)
  comisiones_servicio?: number // Suma de comisiones del servicio (todos los turnos)
  cantidad_turnos: number
  viajes_por_hora?: number
  cantidad_viajes?: number
  turnos: TurnoResumen[]
}

/**
 * Respuesta del resumen de pagos
 */
export interface ResumenPagosResponse {
  total_conductores: number
  conductores: ConductorResumenPagos[]
}

/**
 * Turno pagado
 */
export interface TurnoPagado {
  id: number
  driver_id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  tipo_turno: 'diurno' | 'nocturno'
  duracion_minutos: number
  monto_total: number
  pagado: boolean
}

/**
 * Respuesta de turnos pagados
 */
export interface TurnosPagadosResponse {
  total_turnos: number
  turnos_pagados: TurnoPagado[]
}

/**
 * Conductor simple (para lista de conductores)
 */
export interface ConductorSimple {
  driverId: string
  nombre: string
  telefono: string
  avatarUrl: string
}

/**
 * Respuesta de lista de conductores
 */
export interface ListaConductoresResponse {
  conductores: ConductorSimple[]
  mensaje?: string
}

/**
 * Registro de cierre de día
 */
export interface RegistroCierre {
  id: number
  createdAt: string
  updatedAt: string
  driverId: string
  fecha: string
  userId: number
  userName: string
  userIdModificado?: number
  userNameModificado?: string
  gnvM3: string | null
  gnvSoles: number
  gasolinaGalones: string | null
  gasolinaSoles: number
  liquidaEfectivo: number
  liquidaYape: number
  otrosGastos: number
  otrosGastosDescripcion: string | null
  totalIngresos: number
  totalGastos: number
  resta: number
  calculatedShiftIds?: string // Mantener por compatibilidad (legacy)
  tiposTurno?: ('diurno' | 'nocturno')[] // Nuevo campo: Array de tipos de turno
  placa?: string | null
  odometroInicial?: number | null
  odometroFinal?: number | null
  diferenciaOdometro?: number | null
}

/**
 * Respuesta de viajes completos
 */
export type ViajesCompletosResponse = {
  tipo: 'viajes'
  viajes: ViajeCompleto[]
  cierre_registrado?: boolean
}

export const yegoProOpsService = {
  /**
   * Obtener conductores en orden desde la API
   */
  obtenerConductoresEnOrden: async (page: number = 0, limit: number = 4): Promise<ConductoresEnOrdenResponse> => {
    const response = await api.get<{ 
      total: number
      conductores: ConductorEnOrden[]
      summary_distance?: SummaryDistance
      timestamp?: string
      completed_trips_count?: number
      completed_trips_total_price?: number
    }>('/pro-ops/drivers/in-order', {
      params: {
        page,
        limit
      }
    })
    return {
      type: 'DRIVERS_IN_ORDER_UPDATE',
      total: response.data.total,
      timestamp: response.data.timestamp || new Date().toISOString(),
      conductores: response.data.conductores,
      summary_distance: response.data.summary_distance,
      completed_trips_count: response.data.completed_trips_count,
      completed_trips_total_price: response.data.completed_trips_total_price
    }
  },

  /**
   * Obtener viajes simplificados de un conductor por fecha específica
   * @param driverId ID del conductor
   * @param fecha Fecha en formato YYYY-MM-DD
   * @returns Respuesta con viajes del conductor para esa fecha
   */
  obtenerViajesPorFecha: async (driverId: string, fecha: string): Promise<ViajesPorFechaResponse> => {
    const response = await api.get<ViajesPorFechaResponse>('/pro-ops/driver/viajes-simplificados-por-fecha', {
      params: {
        driverId,
        fecha
      }
    })
    return response.data
  },

  /**
   * Obtener fechas de turnos para un conductor
   * @param driverId ID del conductor
   * @returns Lista de fechas con sus tipos de turno
   */
  obtenerFechasTurnos: async (driverId: string): Promise<FechasTurnosResponse> => {
    const response = await api.get<FechasTurnosResponse>(`/pro-ops/driver/fechas-turnos/${driverId}`)
    return response.data
  },


  /**
   * Obtener viajes completos de conductores
   * Puede devolver la lista de viajes o un registro de cierre si ya se registró para esa fecha
   * @param driverId ID del conductor (obligatorio)
   * @param dateFrom Fecha inicial en formato YYYY-MM-DD (se convertirá a ISO 8601 con zona horaria)
   * @param dateTo Fecha final en formato YYYY-MM-DD (se convertirá a ISO 8601 con zona horaria)
   * @returns Respuesta que puede ser lista de viajes o registro de cierre
   */
  obtenerViajesCompletos: async (driverId: string, dateFrom?: string, dateTo?: string): Promise<ViajesCompletosResponse> => {
    try {
      // Función helper para convertir fecha YYYY-MM-DD a ISO 8601 con zona horaria
      const convertirFechaISO = (fecha: string, esInicio: boolean): string => {
        const fechaObj = new Date(fecha)
        const offset = -fechaObj.getTimezoneOffset() // Obtener offset en minutos
        const offsetHoras = Math.floor(Math.abs(offset) / 60)
        const offsetMinutos = Math.abs(offset) % 60
        const signo = offset >= 0 ? '+' : '-'
        const offsetStr = `${signo}${offsetHoras.toString().padStart(2, '0')}:${offsetMinutos.toString().padStart(2, '0')}`
        
        if (esInicio) {
          // Para dateFrom: 00:00:00
          return `${fecha}T00:00:00${offsetStr}`
        } else {
          // Para dateTo: 23:59:59
          return `${fecha}T23:59:59${offsetStr}`
        }
      }

      const params: { driverId: string; dateFrom?: string; dateTo?: string } = {
        driverId
      }
      
      if (dateFrom) {
        params.dateFrom = convertirFechaISO(dateFrom, true)
      }
      
      if (dateTo) {
        params.dateTo = convertirFechaISO(dateTo, false)
      }
      
      const response = await api.get<any>('/pro-ops/driver/viajes-completos', {
        params
      })
      
      // Extraer viajes y flag de cierre registrado
      let viajes: ViajeCompleto[] = []
      let cierreRegistrado = false
      
      if (Array.isArray(response.data)) {
        viajes = response.data
      } else if (response.data && typeof response.data === 'object' && 'orders' in response.data) {
        viajes = (response.data as { orders: ViajeCompleto[]; cierre_registrado?: boolean }).orders || []
        cierreRegistrado = (response.data as { cierre_registrado?: boolean }).cierre_registrado ?? false
      }
      
      return {
        tipo: 'viajes',
        viajes,
        cierre_registrado: cierreRegistrado
      }
    } catch (error) {
      console.error('❌ [yegoProOpsService] Error obteniendo viajes completos:', error)
      throw error
    }
  },

  /**
   * Obtener cierre de día existente por driverId y fecha
   * @param driverId ID del conductor
   * @param fecha Fecha del cierre en formato YYYY-MM-DD
   * @returns Registro de cierre o null si no existe
   */
  obtenerCierre: async (driverId: string, fecha: string): Promise<RegistroCierre | null> => {
    try {
      const response = await api.get<RegistroCierre>('/pro-ops/driver/cierre', {
        params: {
          driverId,
          fecha
        }
      })
      return response.data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      console.error('❌ [yegoProOpsService] Error obteniendo cierre:', error)
      throw error
    }
  },

  /**
   * Actualizar cierre de día existente
   * @param data Datos completos del cierre a actualizar (incluyendo id del cierre, driverId, fecha y userId del usuario que actualiza)
   */
  actualizarCierre: async (data: {
    id: number // ID del cierre en la BD
    driverId: string
    userId: number // ID del usuario que está actualizando
    fecha: string
    turnoIds?: number[] // IDs de los turnos asociados a este cierre
    gnvM3: string | null
    gnvSoles: number
    gasolinaGalones: string | null
    gasolinaSoles: number
    liquidaEfectivo: number
    liquidaYape: number
    otrosGastos: number
    otrosGastosDescripcion: string | null
    totalIngresos: number
    totalGastos: number
    resta: number
    placa?: string | null
    odometroInicial?: number | null
    odometroFinal?: number | null
    diferenciaOdometro?: number | null
  }): Promise<RegistroCierre> => {
    try {
      const response = await api.put<RegistroCierre>('/pro-ops/driver/cierre', {
        ...data,
        placa: data.placa ?? null,
        odometroInicial: data.odometroInicial ?? null,
        odometroFinal: data.odometroFinal ?? null,
        diferenciaOdometro: data.diferenciaOdometro ?? null,
      })
      return response.data
    } catch (error) {
      console.error('❌ [yegoProOpsService] Error actualizando cierre:', error)
      throw error
    }
  },

  /**
   * Registrar cierre de día para un conductor
   * Los cierres siempre son por un día único, no por rango de fechas
   * Permite identificar que ese día específico con ese conductor ya se registraron los gastos
   */
  registrarCierre: async (data: {
    driverId: string
    userId: number // ID del usuario en sesión que registra el cierre
    fecha: string // Fecha del día único en formato YYYY-MM-DD (siempre un solo día)
    turnoIds?: number[] // IDs de los turnos asociados a este cierre
    gnvM3: string | null
    gnvSoles: number
    gasolinaGalones: string | null
    gasolinaSoles: number
    liquidaEfectivo: number
    liquidaYape: number
    otrosGastos: number
    otrosGastosDescripcion: string | null
    totalIngresos: number
    totalGastos: number
    resta: number
    placa?: string | null
    odometroInicial?: number | null
    odometroFinal?: number | null
    diferenciaOdometro?: number | null
  }): Promise<void> => {
    try {
      await api.post('/pro-ops/driver/registrar-cierre', {
        driverId: data.driverId,
        userId: data.userId, // ID del usuario en sesión
        fecha: data.fecha, // Fecha del día único (YYYY-MM-DD) - para identificar y buscar por fecha
        turnoIds: data.turnoIds || [], // IDs de los turnos asociados a este cierre
        gnvM3: data.gnvM3,
        gnvSoles: data.gnvSoles,
        gasolinaGalones: data.gasolinaGalones,
        gasolinaSoles: data.gasolinaSoles,
        liquidaEfectivo: data.liquidaEfectivo,
        liquidaYape: data.liquidaYape,
        otrosGastos: data.otrosGastos,
        otrosGastosDescripcion: data.otrosGastosDescripcion,
        totalIngresos: data.totalIngresos,
        totalGastos: data.totalGastos,
        resta: data.resta,
        placa: data.placa ?? null,
        odometroInicial: data.odometroInicial ?? null,
        odometroFinal: data.odometroFinal ?? null,
        diferenciaOdometro: data.diferenciaOdometro ?? null,
      })
    } catch (error) {
      console.error('❌ [yegoProOpsService] Error registrando cierre:', error)
      throw error
    }
  },

  /**
   * Obtener resumen de pagos de conductores
   * @param fecha Fecha en formato YYYY-MM-DD (requerido)
   * @returns Resumen de conductores con sus turnos y montos a pagar
   */
  obtenerResumenPagos: async (fecha?: string | null): Promise<ResumenPagosResponse> => {
    const params: { fecha?: string } = {}
    if (fecha) {
      params.fecha = fecha
    }
    const response = await api.get<ResumenPagosResponse>('/pro-ops/drivers/resumen-pagos', { 
      params 
    })
    return response.data
  },

  /**
   * Obtener lista de turnos pagados
   * @param fecha Fecha en formato YYYY-MM-DD (opcional). Si no se proporciona, devuelve todos los turnos pagados
   * @returns Lista de turnos pagados
   */
  obtenerTurnosPagados: async (fecha?: string): Promise<TurnosPagadosResponse> => {
    const params = fecha ? { fecha } : {}
    const response = await api.get<TurnosPagadosResponse>('/pro-ops/drivers/turnos-pagados', { 
      params 
    })
    return response.data
  },

  /**
   * Obtener lista simple de conductores
   * @param fecha Fecha en formato YYYY-MM-DD (opcional)
   * @returns Lista de conductores con información básica
   */
  obtenerListaConductores: async (fecha?: string): Promise<ListaConductoresResponse> => {
    const params: { fecha?: string } = {}
    if (fecha) {
      params.fecha = fecha
    }
    const response = await api.get<ListaConductoresResponse>('/pro-ops/drivers', { params })
    return response.data
  },

  /**
   * Calcular turnos para un conductor en una fecha específica
   * @param driverId ID del conductor
   * @param fecha Fecha en formato YYYY-MM-DD
   * @returns Respuesta con información de los turnos calculados
   */
  calcularTurnos: async (driverId: string, fecha: string): Promise<{
    message: string
    driverId: string
    fecha: string
    cantidadTurnos?: number
  }> => {
    const response = await api.get<{
      message: string
      driverId: string
      fecha: string
      cantidadTurnos?: number
    }>('/pro-ops/driver/calcular-turnos', {
      params: {
        driverId,
        fecha
      }
    })
    return response.data
  },

}

