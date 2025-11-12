import { api } from './core'

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
  count_active_drivers?: number | null
  countActiveDrivers?: number | null
  count_drivers?: number | null
  countDrivers?: number | null
  acceptance_rate?: number | null
  acceptanceRate?: number | null
  completion_rate?: number | null
  completionRate?: number | null
  sum_distance?: number | null
  sumDistance?: number | null
  sum_orders_completed?: number | null
  sumOrdersCompleted?: number | null
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
  trips_per_hour: number | null
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
  const response = await api.get('/yego-premiun/driver-active/list', {
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

const processDriverActiveStats = async () => {
  // Usar timeout extendido (10 minutos) para esta operación que puede tardar mucho tiempo
  const response = await api.post('/yego-premiun/driver-active/process', {}, {
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

export const yegoPremiunService = {
  fetchDriverMonthlyStats,
  processDriverActiveStats,
}

export default yegoPremiunService
