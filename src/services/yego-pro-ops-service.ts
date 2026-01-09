import { api } from './core/api'

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
  driverId: string
  vehiculoId?: string
  fecha: string
  horaInicio: string
  horaFin: string
  tipoTurno: TipoTurno
  observaciones?: string
}

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

export interface ContractorDriver {
  id: string
  lead_id: string
  avatar_url: string
  balance: string
  balance_limit: string
  full_name: string
  groups: string[]
  hiring_segment: string
  last_order_date: string
  lifecycle_step: string
  name: {
    first: string
    last: string
    middle: string
  }
  orders_count: number
  phone: string
  status: 'online' | 'offline' | 'busy' | 'free' | 'in_order'
  violations: string[]
}

export interface DriversResponse {
  contractors: ContractorDriver[]
}

export interface WorkRule {
  id: string
  name: string
}

export interface WorkRulesResponse {
  work_rules: WorkRule[]
}

export interface DriverKpiResponse {
  viajeActivo: number
  noDisponibles: number
  disponibles: number
  sinGPS: number
  items: DriverItem[]
}

export interface RutaPunto {
  address: string
}

export interface ConductorEnOrden {
  id: string
  avatar_url: string
  balance: string
  first_name: string
  last_name: string
  status: string
  vehicle_number: string | null
  route: RutaPunto[]
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

export interface DriverViajesData {
  driver_id: string
  trips: DriverTimelineOrder[]
}

export interface ViajesSimplificadosResponse {
  date_from: string
  date_to: string
  drivers: DriverViajesData[]
}

export interface TurnoCalculado {
  id: string
  hora_inicio: string
  hora_fin: string | null
  tipo_turno: 'diurno' | 'nocturno'
  estado: 'activo' | 'finalizado'
  duracion_minutos: number | null
}

export interface ObtenerTurnosCalculadosResponse {
  driver_id: string
  fecha: string
  turnos: TurnoCalculado[]
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
  obtenerTurnos: async (fecha?: string): Promise<Turno[]> => {
    const params = fecha ? { fecha } : {}
    const response = await api.get<Turno[]>('/pro-ops/shifts', { params })
    return response.data
  },

  crearTurno: async (data: CrearTurnoDto): Promise<Turno> => {
    const response = await api.post<Turno>('/pro-ops/shifts/manual', data)
    return response.data
  },

  actualizarTurno: async (id: string, data: Partial<CrearTurnoDto>): Promise<Turno> => {
    const response = await api.put<Turno>(`/pro-ops/shifts/${id}`, data)
    return response.data
  },

  eliminarTurno: async (id: string): Promise<void> => {
    await api.delete(`/pro-ops/shifts/${id}`)
  },

  obtenerKpis: async (): Promise<DriverKpiResponse> => {
    const response = await api.get<DriverKpiResponse>('/pro-ops/kpis')
    return response.data
  },

  /**
   * Obtener lista de conductores desde el endpoint /pro-ops/drivers
   * @param workRuleIds ID(s) de regla(s) de trabajo para filtrar (opcional)
   */
  obtenerDrivers: async (workRuleIds?: string): Promise<DriversResponse> => {
    const params = workRuleIds ? { work_rule_ids: workRuleIds } : {}
    const response = await api.get<DriversResponse>('/pro-ops/drivers', { params })
    return response.data
  },

  /**
   * Obtener reglas de trabajo (work rules) desde la API
   */
  obtenerReglasTrabajo: async (): Promise<WorkRulesResponse> => {
    const response = await api.get<WorkRulesResponse>('/pro-ops/work-rules')
    return response.data
  },

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
   * Obtener viajes simplificados para múltiples conductores
   * @param driverIds Lista de IDs de conductores
   * @param dateFrom Fecha inicial en formato ISO 8601 (ej: "2026-01-08T00:00:00-05:00")
   * @param dateTo Fecha final en formato ISO 8601 (ej: "2026-01-09T23:59:59-05:00")
   * @returns Respuesta con viajes simplificados agrupados por conductor
   */
  obtenerViajesSimplificados: async (driverIds: string[], dateFrom?: string, dateTo?: string): Promise<ViajesSimplificadosResponse> => {
    const body: {
      driver_ids: string[]
      date_from?: string
      date_to?: string
    } = {
      driver_ids: driverIds
    }
    
    if (dateFrom) body.date_from = dateFrom
    if (dateTo) body.date_to = dateTo
    
    const response = await api.post<ViajesSimplificadosResponse>('/pro-ops/drivers/viajes-simplificados', body)
    return response.data
  },

  obtenerTurnosCalculados: async (driverId: string, fecha?: string): Promise<ObtenerTurnosCalculadosResponse> => {
    // Si no se proporciona fecha, usar la fecha de hoy
    const fechaHoy = fecha || new Date().toISOString().split('T')[0]
    
    const response = await api.get<ObtenerTurnosCalculadosResponse>('/pro-ops/shifts', {
      params: {
        driver_id: driverId,
        fecha: fechaHoy,
      },
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

      console.log('📊 [yegoProOpsService] Obteniendo viajes completos con parámetros:', params)
      
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
      
      console.log('✅ [yegoProOpsService] Viajes completos obtenidos:', viajes.length, 'Cierre registrado:', cierreRegistrado)
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
  }): Promise<RegistroCierre> => {
    try {
      const response = await api.put<RegistroCierre>('/pro-ops/driver/cierre', data)
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
  }): Promise<void> => {
    try {
      await api.post('/pro-ops/driver/registrar-cierre', {
        driverId: data.driverId,
        userId: data.userId, // ID del usuario en sesión
        fecha: data.fecha, // Fecha del día único (YYYY-MM-DD) - para identificar y buscar por fecha
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
      })
    } catch (error) {
      console.error('❌ [yegoProOpsService] Error registrando cierre:', error)
      throw error
    }
  },
}

