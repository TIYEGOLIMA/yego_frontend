import { api } from './core/api'
import type {
  BillingConfigResponse,
  CalcularTurnosResponse,
  ConductorEnOrden,
  ConductoresEnOrdenResponse,
  FacturacionSemanal,
  FechasTurnosResponse,
  ListaConductoresResponse,
  RegistroCierre,
  ResumenPagosResponse,
  ResumenSemanalResponse,
  TurnosPagadosResponse,
  ViajeCompleto,
  ViajesCompletosResponse,
  ViajesPorFechaResponse,
} from './yego-pro-ops.types'

export type {
  TipoTurno,
  DriverItem,
  ConductorEnOrden,
  SummaryDistance,
  ConductoresEnOrdenResponse,
  ViajePorFecha,
  ViajesPorFechaResponse,
  TipoTurnoFecha,
  FechaTurno,
  FechasTurnosResponse,
  ViajeCompleto,
  TurnoResumen,
  ConductorResumenPagos,
  ResumenPagosResponse,
  ConductorTurnosPagados,
  TurnosPagadosResponse,
  ConductorSimple,
  ListaConductoresResponse,
  RegistroCierre,
  ViajesCompletosResponse,
  CalcularTurnosResponse,
  ResumenSemanalResponse,
  FacturacionSemanal,
  BillingConfigResponse,
} from './yego-pro-ops.types'

const ENDPOINTS = {
  driversInOrder: '/pro-ops/drivers/in-order',
  viajesSimplificadosPorFecha: '/pro-ops/driver/viajes-simplificados-por-fecha',
  fechasTurnos: (driverId: string) => `/pro-ops/driver/fechas-turnos/${driverId}`,
  viajesCompletos: '/pro-ops/driver/viajes-completos',
  cierre: '/pro-ops/driver/cierre',
  registrarCierre: '/pro-ops/driver/registrar-cierre',
  resumenPagos: '/pro-ops/drivers/resumen-pagos',
  turnosPagados: '/pro-ops/drivers/turnos-pagados',
  listaConductores: '/pro-ops/drivers',
  calcularTurnos: '/pro-ops/driver/calcular-turnos',
  resumenSemanal: '/pro-ops/drivers/resumen-semanal',
  facturacionSemanal: '/pro-ops/drivers/facturacion-semanal',
  historialFacturacion: '/pro-ops/drivers/facturacion-semanal/historial',
  configBilling: '/pro-ops/config/billing',
} as const

export interface CierrePayload {
  driverId: string
  userId: number
  fecha: string
  turnoIds?: number[]
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

function ymdToLocalIso(ymd: string, endOfDay: boolean): string {
  const d = new Date(ymd)
  const offMin = -d.getTimezoneOffset()
  const sign = offMin >= 0 ? '+' : '-'
  const h = Math.floor(Math.abs(offMin) / 60)
  const m = Math.abs(offMin) % 60
  const z = `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  return endOfDay ? `${ymd}T23:59:59${z}` : `${ymd}T00:00:00${z}`
}

function buildCierreBody(data: CierrePayload | ActualizarCierrePayload) {
  return {
    ...data,
    turnoIds: data.turnoIds ?? [],
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

  obtenerFechasTurnos: async (driverId: string): Promise<FechasTurnosResponse> => {
    const { data } = await api.get<FechasTurnosResponse>(ENDPOINTS.fechasTurnos(driverId))
    return data
  },

  obtenerViajesCompletos: async (
    driverId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<ViajesCompletosResponse> => {
    try {
      const params: { driverId: string; dateFrom?: string; dateTo?: string } = { driverId }
      if (dateFrom) params.dateFrom = ymdToLocalIso(dateFrom, false)
      if (dateTo) params.dateTo = ymdToLocalIso(dateTo, true)

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

  obtenerResumenPagos: async (fecha?: string | null): Promise<ResumenPagosResponse> => {
    const { data } = await api.get<ResumenPagosResponse>(ENDPOINTS.resumenPagos, {
      params: fecha ? { fecha } : {},
    })
    return data
  },

  obtenerTurnosPagados: async (fecha?: string): Promise<TurnosPagadosResponse> => {
    const { data } = await api.get<TurnosPagadosResponse>(ENDPOINTS.turnosPagados, {
      params: fecha ? { fecha } : {},
    })
    return data
  },

  obtenerListaConductores: async (): Promise<ListaConductoresResponse> => {
    const { data } = await api.get<ListaConductoresResponse>(ENDPOINTS.listaConductores)
    return data
  },

  calcularTurnos: async (driverId: string, fecha: string): Promise<CalcularTurnosResponse> => {
    const { data } = await api.get<CalcularTurnosResponse>(ENDPOINTS.calcularTurnos, {
      params: { driverId, fecha },
    })
    return data
  },

  obtenerResumenSemanal: async (fechaInicio: string, fechaFin: string): Promise<ResumenSemanalResponse> => {
    const { data } = await api.get<ResumenSemanalResponse>(ENDPOINTS.resumenSemanal, {
      params: { fechaInicio, fechaFin },
    })
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
}
