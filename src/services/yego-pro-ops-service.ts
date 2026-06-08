import { api } from './core/api'
import type {
  BillingConfigResponse,
  ConductorEnOrden,
  ConductoresEnOrdenResponse,
  FacturacionSemanal,
  LiquidacionPendienteResponse,
  LiquidacionSemanalResponse,
  LiquidarPendienteResult,
  ListaConductoresResponse,
  RegistroCierre,
  ShiftSessionResponse,
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
  LiquidacionSemanalResponse,
  LiquidacionPendienteResponse,
  LiquidarPendienteResult,
  DiaLiquidacionInfo,
  DiaPendienteInfo,
  SesionDiaInfo,
} from './yego-pro-ops.types'

const ENDPOINTS = {
  driversInOrder: '/pro-ops/drivers/in-order',
  viajesSimplificadosPorFecha: '/pro-ops/driver/viajes-simplificados-por-fecha',
  viajesCompletos: '/pro-ops/driver/viajes-completos',
  cierre: '/pro-ops/driver/cierre',
  cierrePorSession: (sessionId: string) => `/pro-ops/driver/cierre/session/${sessionId}`,
  registrarCierre: '/pro-ops/driver/registrar-cierre',
  listaConductores: '/pro-ops/drivers',
  facturacionSemanal: '/pro-ops/drivers/facturacion-semanal',
  historialFacturacion: '/pro-ops/drivers/facturacion-semanal/historial',
  configBilling: '/pro-ops/config/billing',
  activeSession: (driverId: string) => `/pro-ops/shift-sessions/active/${driverId}`,
  sessionHistory: (driverId: string) => `/pro-ops/shift-sessions/driver/${driverId}`,
  closeSession: (sessionId: string) => `/pro-ops/shift-sessions/${sessionId}/close`,
  settleSession: (sessionId: string) => `/pro-ops/shift-sessions/${sessionId}/settle`,
  deleteSession: (sessionId: string) => `/pro-ops/shift-sessions/${sessionId}`,
  liquidacionSemanal: (driverId: string) => `/pro-ops/liquidacion/${driverId}/semanal`,
  liquidacionPendiente: (driverId: string) => `/pro-ops/liquidacion/${driverId}/pendiente`,
  liquidarPendiente: (driverId: string, userId?: number) => {
    const params = userId ? `?userId=${userId}` : ''
    return `/pro-ops/liquidacion/${driverId}/liquidar${params}`
  },
  limpiarFacturacion: (driverId: string) => `/pro-ops/liquidacion/${driverId}/limpiar`,
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

  obtenerCierrePorSession: async (sessionId: string): Promise<RegistroCierre | null> => {
    try {
      const { data } = await api.get<RegistroCierre>(ENDPOINTS.cierrePorSession(sessionId))
      return data
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status
      if (status === 404) return null
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

  getSessionHistory: async (driverId: string): Promise<ShiftSessionResponse[]> => {
    const { data } = await api.get<ShiftSessionResponse[]>(ENDPOINTS.sessionHistory(driverId))
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

  deleteSession: async (sessionId: string, userId: number, reason: string): Promise<void> => {
    await api.delete(ENDPOINTS.deleteSession(sessionId), { params: { userId, reason } })
  },

  getLiquidacionSemanal: async (driverId: string, weekStart?: string): Promise<LiquidacionSemanalResponse> => {
    const params: Record<string, string> = {}
    if (weekStart) params.weekStart = weekStart
    const { data } = await api.get<LiquidacionSemanalResponse>(ENDPOINTS.liquidacionSemanal(driverId), { params })
    return data
  },

  getLiquidacionPendiente: async (driverId: string, desde?: string, hasta?: string): Promise<LiquidacionPendienteResponse> => {
    const params: Record<string, string> = {}
    if (desde) params.desde = desde.split('T')[1]?.split(':').length === 2 ? desde + ':00' : desde
    if (hasta) params.hasta = hasta.split('T')[1]?.split(':').length === 2 ? hasta + ':00' : hasta
    const { data } = await api.get<LiquidacionPendienteResponse>(ENDPOINTS.liquidacionPendiente(driverId), { params })
    return data
  },

  liquidarPendiente: async (body: Record<string, unknown>): Promise<LiquidarPendienteResult> => {
    const { data } = await api.post<LiquidarPendienteResult>(ENDPOINTS.liquidarPendiente(body.driverId as string, body.userId as number), body)
    return data
  },

  limpiarFacturacion: async (driverId: string, desde: string, hasta: string): Promise<void> => {
    await api.delete(ENDPOINTS.limpiarFacturacion(driverId), { params: { desde: desde.split('T')[0], hasta: hasta.split('T')[0] } })
  },
}
