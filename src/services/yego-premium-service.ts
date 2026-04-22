import { api } from './core'

/** Flota desde GET /api/flota/partners (mismo origen que el mapa de nombres en backend). */
export interface FlotaPartnerOption {
  id: string
  name: string
  city?: string | null
}

export interface DriverMonthlyStat {
  id: number
  driver_id?: number
  driverId?: string | null
  driver_license?: string | null
  driverLicense?: string | null
  licenseNumber?: string | null
  park_id?: string | null
  parkId?: string | null
  park_name?: string | null
  parkName?: string | null
  driver_name?: string | null
  fullName?: string | null
  driver_phone?: string | null
  phone?: string | null
  trips: number | null
  month: number
  year: number
  category: string | null
  count_orders_completed?: number | null
  countOrdersCompleted?: number | null
  count_orders_all?: number | null
  countOrdersAll?: number | null
  count_orders_accepted?: number | null
  countOrdersAccepted?: number | null
  count_orders_cancelled_by_client?: number | null
  countOrdersCancelledByClient?: number | null
  count_orders_cancelled_by_driver?: number | null
  countOrdersCancelledByDriver?: number | null
  count_orders_platform?: number | null
  countOrdersPlatform?: number | null
  sum_price_cash?: number | null
  sumPriceCash?: number | null
  sum_price_cashless?: number | null
  sumPriceCashless?: number | null
  sum_price_other_gas?: number | null
  sumPriceOtherGas?: number | null
  sum_price_park_commission?: number | null
  sumPriceParkCommission?: number | null
  sum_price_platform_commission?: number | null
  sumPricePlatformCommission?: number | null
  sum_work_time_seconds?: number | null
  sumWorkTimeSeconds?: number | null
  created_at: string
  createdAt?: string
  categorySynced?: boolean
  categorySyncedAt?: string
  categoryDetail?: string | null
  hireDate?: string | null
}

export interface DriverMonthlyStatsResponse {
  data: DriverMonthlyStat[]
  total: number
}

const fetchDriverMonthlyStats = async (
  params: { signal?: AbortSignal } = {}
): Promise<DriverMonthlyStatsResponse> => {
  const { signal } = params
  const response = await api.get('/yego-premium/driver-active/list', {
    signal,
  })

  const responseData = response.data

  if (Array.isArray(responseData)) {
    return {
      data: responseData as DriverMonthlyStat[],
      total: responseData.length,
    }
  }

  const data = Array.isArray(responseData?.data)
    ? (responseData.data as DriverMonthlyStat[])
    : []

  const total =
    typeof responseData?.total === 'number'
      ? responseData.total
      : data.length

  return {
    data,
    total,
  }
}

const fetchFlotaPartners = async (params: { signal?: AbortSignal } = {}): Promise<FlotaPartnerOption[]> => {
  const { signal } = params
  const response = await api.get<FlotaPartnerOption[]>('/flota/partners', { signal })
  const data = response.data
  return Array.isArray(data) ? data : []
}

const processDriverActiveStats = async () => {
  // Usar timeout extendido (10 minutos) para esta operación que puede tardar mucho tiempo
  const response = await api.post('/yego-premium/driver-active/process', {}, {
    timeout: 600000, // 10 minutos (600000ms)
  })
  const responseData = response.data

  if (Array.isArray(responseData)) {
    return responseData as DriverMonthlyStat[]
  }

  return Array.isArray(responseData?.data)
    ? (responseData.data as DriverMonthlyStat[])
    : []
}

const processDriverActiveStatsByMonth = async (month: number, year: number) => {
  // Usar timeout extendido (10 minutos) para esta operación que puede tardar mucho tiempo
  const response = await api.post(
    '/yego-premium/driver-active/process',
    { month, year },
    {
      timeout: 600000, // 10 minutos (600000ms)
    }
  )
  const responseData = response.data

  if (Array.isArray(responseData)) {
    return responseData as DriverMonthlyStat[]
  }

  return Array.isArray(responseData?.data)
    ? (responseData.data as DriverMonthlyStat[])
    : []
}

export interface DriverSummaryIncome {
  count_completed?: number | null
  /** Total neto (balances.total) desde API Yango. */
  total?: number | null
  cash_collected?: number | null
  non_cash_payment?: number | null
  corporate?: number | null
  promotion_compensation?: number | null
}

export interface DriverSummaryPeriod {
  date_from?: string | null
  date_to?: string | null
}

export interface DriverSummaryBlock {
  period: DriverSummaryPeriod
  income_summary: DriverSummaryIncome
}

export interface DriverSummaryGoalStep {
  nrides?: number | null
  amount?: number | null
  max_bonus?: number | null
}

export interface DriverSummaryGoal {
  total_rides?: number | null
  steps?: DriverSummaryGoalStep[]
  window?: { start?: string | null; end?: string | null }
  /** Suma de ingresos de viajes que cuentan para la meta (Yango: multiplier_accounted_income). */
  multiplier_accounted_income?: string | number | null
  is_multiplier_goal?: boolean | null
}

export interface DriverSnapshot {
  driver_id?: string | null
  first_name?: string | null
  last_name?: string | null
  full_name?: string | null
  phone?: string | null
  license_number?: string | null
  balance?: number | null
  balance_limit?: number | null
  currency?: string | null
  average_rating?: number | null
}

export interface DriverSummaryResponse {
  resolved_contractor_id?: string | null
  driver?: DriverSnapshot | null
  weekly?: DriverSummaryBlock | null
  monthly?: DriverSummaryBlock | null
  active_goals?: DriverSummaryGoal[]
  previous_goals?: DriverSummaryGoal[]
}

const fetchDriverSummary = async (
  text: string,
  parkId: string,
  signal?: AbortSignal
): Promise<DriverSummaryResponse> => {
  const response = await api.post(
    '/yango-external/summary',
    { text, park_id: parkId },
    { signal }
  )
  return response.data as DriverSummaryResponse
}

export interface TripCompletedItem {
  fechaInicioViaje?: string | null
  fechaFinalizacion?: string | null
  condicion?: string | null
  parkId?: string | null
}

export interface DailyTripsPoint {
  date?: string | null
  tripsCount?: number | null
  precioYangoProSoles?: number | string | null
}

export interface DriverTripsMonthResponse {
  driverId: string
  month: number
  year: number
  completedTripsCount: number
  /** Suma del mes en soles (columna precio_yango_pro en BD; backend aplica divisor si aplica) */
  totalPrecioYangoProSoles?: number | string | null
  /** Un punto por día del mes */
  dailySeries?: DailyTripsPoint[]
  trips: TripCompletedItem[]
}

const fetchDriverTripsMonth = async (
  params: { driverId: string; month: number; year: number; signal?: AbortSignal }
): Promise<DriverTripsMonthResponse> => {
  const { driverId, month, year, signal } = params
  const response = await api.get<DriverTripsMonthResponse>('/yego-premium/driver-trips/month', {
    params: { driverId, month, year },
    signal,
  })
  return response.data
}

export interface MonthlyTripsAggregate {
  month?: number | null
  tripsCount?: number | null
  precioYangoProSoles?: number | string | null
}

export interface DriverTripsYearResponse {
  driverId: string
  year: number
  totalCompletedTrips?: number | null
  totalPrecioYangoProSoles?: number | string | null
  monthlySeries?: MonthlyTripsAggregate[]
}

const fetchDriverTripsYear = async (
  params: { driverId: string; year: number; signal?: AbortSignal }
): Promise<DriverTripsYearResponse> => {
  const { driverId, year, signal } = params
  const response = await api.get<DriverTripsYearResponse>('/yego-premium/driver-trips/year', {
    params: { driverId, year },
    signal,
  })
  return response.data
}

export const yegoPremiumService = {
  fetchDriverMonthlyStats,
  fetchFlotaPartners,
  processDriverActiveStats,
  processDriverActiveStatsByMonth,
  fetchDriverSummary,
  fetchDriverTripsMonth,
  fetchDriverTripsYear,
}

export default yegoPremiumService
