import { api } from './core/api'
import type {
  BillingConfigResponse,
  ConductorEnOrden,
  ConductoresEnOrdenResponse,
  FacturacionSemanal,
  LiquidacionSemanalResponse,
  ListaConductoresResponse,
  RegistroCierre,
  RegisterTripRequest,
  RegisterTripResponse,
  ShiftSessionResponse,
  ShiftSessionSummaryResponse,
  TripResponse,
  ViajeCompleto,
  ViajesCompletosResponse,
  ViajesPorFechaResponse,
} from './yego-pro-ops.types'

export type {
  DriverItem,
  ConductorEnOrden,
  SummaryDistance,
  ConductoresEnOrdenResponse,
  ViajePorFecha,
  ViajesPorFechaResponse,
  ViajeCompleto,
  ConductorSimple,
  ListaConductoresResponse,
  RegistroCierre,
  ViajesCompletosResponse,
  FacturacionSemanal,
  BillingConfigResponse,
  ShiftSessionResponse,
  ShiftSessionSummaryResponse,
  TripResponse,
  RegisterTripRequest,
  RegisterTripResponse,
  LiquidacionSemanalResponse,
  DiaLiquidacionInfo,
  SesionDiaInfo,
} from './yego-pro-ops.types'

const ENDPOINTS = {
  driversInOrder: '/pro-ops/drivers/in-order',
  viajesSimplificadosPorFecha: '/pro-ops/driver/viajes-simplificados-por-fecha',
  viajesCompletos: '/pro-ops/driver/viajes-completos',
  cierre: '/pro-ops/driver/cierre',
  registrarCierre: '/pro-ops/driver/registrar-cierre',
  listaConductores: '/pro-ops/drivers',
  facturacionSemanal: '/pro-ops/drivers/facturacion-semanal',
  historialFacturacion: '/pro-ops/drivers/facturacion-semanal/historial',
  configBilling: '/pro-ops/config/billing',
  registerTrip: '/pro-ops/shift-sessions/trips',
  activeSession: (driverId: string) => `/pro-ops/shift-sessions/active/${driverId}`,
  sessionSummary: (sessionId: string) => `/pro-ops/shift-sessions/${sessionId}`,
  sessionHistory: (driverId: string) => `/pro-ops/shift-sessions/driver/${driverId}`,
  sessionTrips: (sessionId: string) => `/pro-ops/shift-sessions/${sessionId}/trips`,
  closeSession: (sessionId: string) => `/pro-ops/shift-sessions/${sessionId}/close`,
  settleSession: (sessionId: string) => `/pro-ops/shift-sessions/${sessionId}/settle`,
  liquidacionSemanal: (driverId: string) => `/pro-ops/liquidacion/${driverId}/semanal`,
  liquidarSemana: (driverId: string) => `/pro-ops/liquidacion/${driverId}/liquidar`,
} as const

export interface CierrePayload {
  driverId: string
  userId: number
  fecha: string
  shiftSessionId?: string
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
}

export interface ActualizarCierrePayload extends CierrePayload {
  id: number
}

function buildCierreBody(data: CierrePayload | ActualizarCierrePayload) {
  return {
    ...data,
    placa: data.placa ?? null,
    odometroInicial: data.odometroInicial ?? null,
    odometroFinal: data.odometroFinal ?? null,
    diferenciaOdometro: data.diferenciaOdometro ?? null,
  }
}

export const yegoProOpsService = {
  obtenerConductoresEnOrden: async (
    page: number = 0,
    limit: number = 4,
  ): Promise<ConductoresEnOrdenResponse> => {
    const { data } = await api.get<{
      total: number
      conductores: ConductorEnOrden[]
      timestamp?: string
    }>(ENDPOINTS.driversInOrder, { params: { page, limit } })

    return {
      type: 'DRIVERS_IN_ORDER_UPDATE',
      total: data.total,
      timestamp: data.timestamp || new Date().toISOString(),
      conductores: data.conductores,
    }
  },

  obtenerViajesPorFecha: async (driverId: string, fecha: string): Promise<ViajesPorFechaResponse> => {
    const { data } = await api.get<ViajesPorFechaResponse>(ENDPOINTS.viajesSimplificadosPorFecha, {
      params: { driverId, fecha },
    })
    return data
  },

  obtenerViajesCompletos: async (
    driverId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<ViajesCompletosResponse> => {
    try {
      const params: { driverId: string; dateFrom?: string; dateTo?: string } = { driverId }
      if (dateFrom) params.dateFrom = dateFrom
      if (dateTo) params.dateTo = dateTo

      const { data } = await api.get<
        ViajeCompleto[] | { orders?: ViajeCompleto[]; cierre_registrado?: boolean }
      >(ENDPOINTS.viajesCompletos, { params })

      if (Array.isArray(data)) {
        return { tipo: 'viajes', viajes: data, cierre_registrado: false }
      }
      return {
        tipo: 'viajes',
        viajes: data?.orders ?? [],
        cierre_registrado: data?.cierre_registrado ?? false,
      }
    } catch (error) {
      console.error('[yegoProOpsService] obtenerViajesCompletos:', error)
      throw error
    }
  },

  obtenerCierre: async (driverId: string, fecha: string): Promise<RegistroCierre | null> => {
    try {
      const { data } = await api.get<RegistroCierre>(ENDPOINTS.cierre, {
        params: { driverId, fecha },
      })
      return data
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status
      if (status === 404) return null
      console.error('[yegoProOpsService] obtenerCierre:', error)
      throw error
    }
  },

  registrarCierre: async (data: CierrePayload): Promise<void> => {
    try {
      await api.post(ENDPOINTS.registrarCierre, buildCierreBody(data))
    } catch (error) {
      console.error('[yegoProOpsService] registrarCierre:', error)
      throw error
    }
  },

  actualizarCierre: async (data: ActualizarCierrePayload): Promise<RegistroCierre> => {
    try {
      const { data: response } = await api.put<RegistroCierre>(ENDPOINTS.cierre, buildCierreBody(data))
      return response
    } catch (error) {
      console.error('[yegoProOpsService] actualizarCierre:', error)
      throw error
    }
  },

  obtenerListaConductores: async (): Promise<ListaConductoresResponse> => {
    const { data } = await api.get<ListaConductoresResponse>(ENDPOINTS.listaConductores)
    return data
  },

  registrarFacturacionSemanal: async (facturacion: FacturacionSemanal): Promise<FacturacionSemanal> => {
    const { data } = await api.post<FacturacionSemanal>(ENDPOINTS.facturacionSemanal, facturacion)
    return data
  },

  obtenerHistorialFacturacion: async (fechaInicio?: string, fechaFin?: string): Promise<FacturacionSemanal[]> => {
    const { data } = await api.get<FacturacionSemanal[]>(ENDPOINTS.historialFacturacion, {
      params: { fechaInicio, fechaFin },
    })
    return data
  },

  obtenerConfigBilling: async (): Promise<BillingConfigResponse> => {
    const { data } = await api.get<BillingConfigResponse>(ENDPOINTS.configBilling)
    return data
  },

  guardarConfigBilling: async (config: BillingConfigResponse, userId: number): Promise<BillingConfigResponse> => {
    const { data } = await api.put<BillingConfigResponse>(ENDPOINTS.configBilling, config, {
      params: { userId },
    })
    return data
  },

  registerTrip: async (request: RegisterTripRequest): Promise<RegisterTripResponse> => {
    const { data } = await api.post<RegisterTripResponse>(ENDPOINTS.registerTrip, {
      driverId: request.driverId,
      externalTripId: request.externalTripId ?? null,
      completedAt: request.completedAt,
      amount: request.amount,
    })
    return data
  },

  getActiveSession: async (driverId: string): Promise<ShiftSessionResponse | null> => {
    try {
      const { data } = await api.get<ShiftSessionResponse>(ENDPOINTS.activeSession(driverId))
      return data
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status
      if (status === 404) return null
      throw error
    }
  },

  getSessionSummary: async (sessionId: string): Promise<ShiftSessionSummaryResponse> => {
    const { data } = await api.get<ShiftSessionSummaryResponse>(ENDPOINTS.sessionSummary(sessionId))
    return data
  },

  getSessionHistory: async (driverId: string): Promise<ShiftSessionResponse[]> => {
    const { data } = await api.get<ShiftSessionResponse[]>(ENDPOINTS.sessionHistory(driverId))
    return data
  },

  getSessionTrips: async (sessionId: string): Promise<TripResponse[]> => {
    const { data } = await api.get<TripResponse[]>(ENDPOINTS.sessionTrips(sessionId))
    return data
  },

  closeSession: async (sessionId: string, closedBy: number): Promise<ShiftSessionResponse> => {
    const { data } = await api.post<ShiftSessionResponse>(ENDPOINTS.closeSession(sessionId), { closedBy })
    return data
  },

  settleSession: async (sessionId: string, settledBy: number): Promise<ShiftSessionResponse> => {
    const { data } = await api.post<ShiftSessionResponse>(ENDPOINTS.settleSession(sessionId), { settledBy })
    return data
  },

  getLiquidacionSemanal: async (driverId: string, weekStart?: string): Promise<LiquidacionSemanalResponse> => {
    const params: Record<string, string> = {}
    if (weekStart) params.weekStart = weekStart
    const { data } = await api.get<LiquidacionSemanalResponse>(ENDPOINTS.liquidacionSemanal(driverId), { params })
    return data
  },

  liquidarSemana: async (driverId: string): Promise<{ liquidado: boolean; sesiones: number; total: number; mensaje?: string }> => {
    const { data } = await api.post<{ liquidado: boolean; sesiones: number; total: number; mensaje?: string }>(ENDPOINTS.liquidarSemana(driverId))
    return data
  },
}
