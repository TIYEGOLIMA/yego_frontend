import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table'
import { Input } from '../../../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'
import { Label } from '../../../components/ui/label'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Filter,
  Loader2,
  RefreshCcw,
} from 'lucide-react'
import { yegoPremiunService, type DriverMonthlyStat } from '../../../services'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import systemNotificationsService from '../../../services/system-notifications-service'
import { PremiumProcessAvailableEvent } from '../../../types/system-notifications'

const MONTH_OPTIONS = [
  { value: 'all', label: 'Todos los meses' },
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
]

const LIMIT_OPTIONS = ['10', '25', '50']

const formatNumber = (value: number | null | undefined, decimals = 2) => {
  if (value === null || value === undefined) return '—'
  const numericValue = Number(value)
  if (Number.isNaN(numericValue)) return '—'
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numericValue)
}

const formatInteger = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—'
  const numericValue = Number(value)
  if (Number.isNaN(numericValue)) return '—'
  return new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 }).format(numericValue)
}

const formatPercentage = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—'
  const numericValue = Number(value)
  if (Number.isNaN(numericValue)) return '—'
  return `${(numericValue * 100).toFixed(2)}%`
}

const formatDuration = (seconds: number | null | undefined) => {
  if (seconds === null || seconds === undefined) return '—'
  const totalSeconds = Number(seconds)
  if (Number.isNaN(totalSeconds)) return '—'

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const remainingSeconds = Math.floor(totalSeconds % 60)

  const parts = [
    hours > 0 ? `${hours}h` : null,
    minutes > 0 ? `${minutes}m` : null,
    `${remainingSeconds}s`,
  ].filter(Boolean)

  return parts.join(' ')
}

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('es-PE')
}

const formatShortDate = (value: string | null | undefined) => {
  if (!value) return 'No disponible'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No disponible'
  return date.toLocaleDateString('es-PE')
}

const normalizeParkName = (value: string | null | undefined) => {
  if (!value) return null
  return value.replace(/,+$/, '').trim() || null
}

const getLatestPeriodStat = (data: DriverMonthlyStat[]) => {
  return data.reduce<DriverMonthlyStat | null>((latest, stat) => {
    if (!stat.year || !stat.month) return latest
    if (!latest || !latest.year || !latest.month) return stat
    if (stat.year > latest.year) return stat
    if (stat.year === latest.year && stat.month > latest.month) return stat
    return latest
  }, null)
}

const getCategoryTheme = (category: string | null | undefined) => {
  const normalized = (category || '').toLowerCase()

  if (normalized.includes('oro')) {
    return {
      badge:
        'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800',
      cardBorder: 'border-amber-200 dark:border-amber-900/50',
      cardBackground:
        'from-amber-50/80 to-amber-100/50 dark:from-amber-900/30 dark:to-transparent',
      accentText: 'text-amber-600 dark:text-amber-300',
    }
  }

  if (normalized.includes('plata')) {
    return {
      badge:
        'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900/30 dark:text-slate-200 dark:border-slate-800',
      cardBorder: 'border-slate-200 dark:border-slate-800',
      cardBackground:
        'from-slate-50/80 to-slate-100/50 dark:from-slate-900/20 dark:to-transparent',
      accentText: 'text-slate-600 dark:text-slate-300',
    }
  }

  return {
    badge:
      'bg-primary-100 text-primary-700 border-primary-300 dark:bg-primary-900/30 dark:text-primary-200 dark:border-primary-800',
    cardBorder: 'border-primary-200 dark:border-primary-900/50',
    cardBackground:
      'from-primary-50/80 to-primary-100/50 dark:from-primary-900/30 dark:to-transparent',
    accentText: 'text-primary-600 dark:text-primary-300',
  }
}

const getProgressStyle = (percentage: number | null | undefined) => {
  if (percentage === null || percentage === undefined) return { width: '0%' }
  return { width: `${percentage}%` }
}

const YegoPremiunModule: React.FC = () => {
  const currentYear = new Date().getFullYear()
  const yearOptions = useMemo(
    () => [
      { value: 'all', label: 'Todos los años' },
      ...Array.from({ length: 5 }, (_, index) => {
        const value = `${currentYear - index}`
        return { value, label: value }
      }),
    ],
    [currentYear]
  )

  const [stats, setStats] = useState<DriverMonthlyStat[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [driverQuery, setDriverQuery] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(MONTH_OPTIONS[0].value)
  const [selectedYear, setSelectedYear] = useState(yearOptions[0].value)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(parseInt(LIMIT_OPTIONS[0], 10))
  const [selectedStat, setSelectedStat] = useState<DriverMonthlyStat | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processAvailable, setProcessAvailable] = useState(false)
  const [selectedFleet, setSelectedFleet] = useState<string>('all')
  const [currentPeriodKey, setCurrentPeriodKey] = useState<string | null>(null)

  const getValue = <T,>(stat: DriverMonthlyStat, ...keys: (keyof DriverMonthlyStat)[]): T | null => {
    for (const key of keys) {
      const value = stat[key]
      if (value !== undefined && value !== null) {
        return value as T
      }
    }
    return null
  }

  const getDriverIdentifier = (stat: DriverMonthlyStat) =>
    getValue<string | number>(stat, 'driver_id', 'driverId')

  const formatName = (name: string | null | undefined) => {
    if (!name) return null
    return name
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  const getDriverName = (stat: DriverMonthlyStat) =>
    formatName(getValue<string>(stat, 'driver_name', 'fullName'))

  const getDriverPhone = (stat: DriverMonthlyStat) =>
    getValue<string>(stat, 'driver_phone', 'phone')

  const getDriverLicense = (stat: DriverMonthlyStat) =>
    getValue<string>(stat, 'driver_license', 'driverLicense', 'licenseNumber')

  const getParkName = (stat: DriverMonthlyStat) =>
    normalizeParkName(getValue<string>(stat, 'parkName', 'park_name'))

  const getCategoryDetail = (stat: DriverMonthlyStat) =>
    getValue<string>(stat, 'categoryDetail')

  const getHireDate = (stat: DriverMonthlyStat) =>
    getValue<string>(stat, 'hireDate')

  const formatMonthLabel = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '—'
    const option = MONTH_OPTIONS.find((monthOption) => Number(monthOption.value) === value)
    return option?.label ?? value
  }

  const loadStats = useCallback(
    async ({ signal, showLoader = true }: { signal?: AbortSignal; showLoader?: boolean } = {}) => {
      try {
        if (showLoader) {
          setLoading(true)
        }
        setError(null)

        const response = await yegoPremiunService.fetchDriverMonthlyStats({ signal })

        if (!signal || !signal.aborted) {
          setStats(response.data)

          if (!response.data.length) {
            setCurrentPeriodKey(null)
            setProcessAvailable(true)
            return
          }

          const latest = getLatestPeriodStat(response.data)
          if (latest && latest.year && latest.month) {
            const key = `${latest.year}-${latest.month}`
            setCurrentPeriodKey(key)

            const storedKey = localStorage.getItem('yego-premiun-last-processed')
            if (!storedKey || storedKey !== key) {
              setProcessAvailable(true)
            } else if (!processAvailable) {
              setProcessAvailable(false)
            }
          }
        }
      } catch (err: any) {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || err?.message === 'canceled') {
          return
        }
        console.error('❌ [YegoPremiun] Error al cargar estadísticas:', err)
        if (!signal || !signal.aborted) {
          setError('No se pudieron cargar los registros. Intenta de nuevo.')
          setStats([])
        }
      } finally {
        if (showLoader) {
          setLoading(false)
        }
      }
    },
    [processAvailable],
  )

  useEffect(() => {
    const controller = new AbortController()
    loadStats({ signal: controller.signal })

    return () => {
      controller.abort()
    }
  }, [loadStats])

  useEffect(() => {
     const handlePremiumProcessAvailable = (event: PremiumProcessAvailableEvent) => {
       setProcessAvailable(true)
       if (event.year && event.month) {
         setCurrentPeriodKey(`${event.year}-${event.month}`)
       }
     }
 
    systemNotificationsService.setOnPremiumProcessAvailable(handlePremiumProcessAvailable)
 
    return () => {
      systemNotificationsService.setOnPremiumProcessAvailable(null)
    }
  }, [])

  const filteredStats = useMemo(() => {
    const search = driverQuery.trim().toLowerCase()
    const monthFilter = selectedMonth !== 'all' ? Number(selectedMonth) : null
    const yearFilter = selectedYear !== 'all' ? Number(selectedYear) : null
    const fleetFilter = selectedFleet === 'all' ? null : selectedFleet.toLowerCase()

    return stats.filter((stat) => {
      const identifier = getDriverIdentifier(stat)
      const name = getDriverName(stat)
      const license = getDriverLicense(stat)
      const park = getParkName(stat)

      const matchesQuery =
        search.length === 0 ||
        [identifier, name, license, park]
          .map((value) => String(value ?? '').toLowerCase())
          .some((value) => value.includes(search))

      const matchesMonth = monthFilter !== null ? stat.month === monthFilter : true
      const matchesYear = yearFilter !== null ? stat.year === yearFilter : true
      const matchesFleet =
        fleetFilter === null ? true : park ? park.toLowerCase() === fleetFilter : false

      return matchesQuery && matchesMonth && matchesYear && matchesFleet
    })
  }, [stats, driverQuery, selectedMonth, selectedYear, selectedFleet])

  const total = filteredStats.length
  const totalPages = Math.max(1, Math.ceil(total / limit))

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const paginatedStats = useMemo(() => {
    const startIndex = (page - 1) * limit
    return filteredStats.slice(startIndex, startIndex + limit)
  }, [filteredStats, page, limit])

  const startItem = total === 0 ? 0 : (page - 1) * limit + 1
  const endItem = total === 0 ? 0 : Math.min((page - 1) * limit + paginatedStats.length, total)

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1)
    }
    if (page <= 3) {
      return [1, 2, 3, 4, 5]
    }
    if (page >= totalPages - 2) {
      return Array.from({ length: 5 }, (_, index) => totalPages - 4 + index)
    }
    return [page - 2, page - 1, page, page + 1, page + 2]
  }, [page, totalPages])

  const handleResetFilters = () => {
    setDriverQuery('')
    setSelectedMonth(MONTH_OPTIONS[0].value)
    setSelectedYear(yearOptions[0].value)
    setSelectedFleet('all')
    setLimit(parseInt(LIMIT_OPTIONS[0], 10))
    setPage(1)
  }

  const handleProcessActives = async () => {
     try {
       setProcessing(true)
       setError(null)
       setLoading(true)
 
       const processed = await yegoPremiunService.processDriverActiveStats()
       setStats(processed)
       setPage(1)
       setProcessAvailable(false)

      const latest = getLatestPeriodStat(processed)
      if (latest && latest.year && latest.month) {
        const key = `${latest.year}-${latest.month}`
        setCurrentPeriodKey(key)
        localStorage.setItem('yego-premiun-last-processed', key)
      } else if (currentPeriodKey) {
        localStorage.setItem('yego-premiun-last-processed', currentPeriodKey)
      }
     } catch (err: any) {
       console.error('❌ [YegoPremiun] Error al procesar conductores activos:', err)
       setError('No se pudo procesar la información. Intenta nuevamente.')
     } finally {
       setProcessing(false)
       setLoading(false)
     }
   }

  const handlePrevPage = () => setPage((prev) => Math.max(1, prev - 1))
  const handleNextPage = () => setPage((prev) => Math.min(totalPages, prev + 1))
  const handleFirstPage = () => setPage(1)
  const handleLastPage = () => setPage(totalPages)
  const handlePageChange = (targetPage: number) => {
    if (targetPage >= 1 && targetPage <= totalPages) {
      setPage(targetPage)
    }
  }

  const handleOpenDetails = (stat: DriverMonthlyStat) => {
    setSelectedStat(stat)
    setIsDetailOpen(true)
  }

  const handleCloseDetails = () => {
    setIsDetailOpen(false)
    setTimeout(() => setSelectedStat(null), 200)
  }

  const renderTableBody = () => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-10 text-center text-neutral-500">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Cargando registros de Yego Premiun...</span>
            </div>
          </TableCell>
        </TableRow>
      )
    }

    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-10 text-center text-error-600">
            {error}
          </TableCell>
        </TableRow>
      )
    }

    if (!filteredStats.length) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-10 text-center text-neutral-500">
            No se encontraron registros para los filtros seleccionados.
          </TableCell>
        </TableRow>
      )
    }

    return paginatedStats.map((stat) => (
      <TableRow key={stat.id}>
        <TableCell>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {getDriverName(stat)?.trim() ||
                (() => {
                  const identifier = getDriverIdentifier(stat)
                  return identifier ? `Conductor #${identifier}` : 'Conductor sin identificación'
                })()}
            </span>
            <div className="flex flex-wrap gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">
                <span className="font-medium">Licencia:</span> {getDriverLicense(stat) || '—'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">
                <span className="font-medium">Flota:</span> {getParkName(stat) || '—'}
              </span>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            {getDriverPhone(stat)?.trim() || 'No disponible'}
          </span>
        </TableCell>
        <TableCell>
          <Badge
            variant="outline"
            className={`uppercase ${getCategoryTheme(stat.category).badge}`}
          >
            {stat.category || '—'}
          </Badge>
          {getCategoryDetail(stat) && (
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {getCategoryDetail(stat)}
            </p>
          )}
        </TableCell>
        <TableCell>
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            {formatMonthLabel(stat.month)}
          </span>
        </TableCell>
        <TableCell>
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            {stat.year || '—'}
          </span>
        </TableCell>
        <TableCell className="w-20">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenDetails(stat)}
            aria-label="Ver detalle del conductor"
          >
            <Eye className="h-5 w-5" />
          </Button>
        </TableCell>
      </TableRow>
    ))
  }

  const detailData = useMemo(() => {
    if (!selectedStat) return null

    const driverIdentifier = getDriverIdentifier(selectedStat)
    const driverName = getDriverName(selectedStat)
    const driverPhone = getDriverPhone(selectedStat)
    const driverLicense = getDriverLicense(selectedStat)
    const parkName = getParkName(selectedStat)
    const categoryDetail = getCategoryDetail(selectedStat) || 'Sin detalle disponible'
    const hireDate = formatShortDate(getHireDate(selectedStat))

    const acceptanceRate = getValue<number>(selectedStat, 'acceptance_rate', 'acceptanceRate')
    const completionRate = getValue<number>(selectedStat, 'completion_rate', 'completionRate')
    const acceptanceRatePercent =
      acceptanceRate !== null && acceptanceRate !== undefined ? acceptanceRate * 100 : null
    const completionRatePercent =
      completionRate !== null && completionRate !== undefined ? completionRate * 100 : null

    const countMetrics = [
      {
        label: 'Órdenes completadas',
        value: formatInteger(getValue<number>(selectedStat, 'count_orders_completed', 'countOrdersCompleted')),
      },
      {
        label: 'Órdenes totales',
        value: formatInteger(getValue<number>(selectedStat, 'count_orders_all', 'countOrdersAll')),
      },
      {
        label: 'Órdenes aceptadas',
        value: formatInteger(getValue<number>(selectedStat, 'count_orders_accepted', 'countOrdersAccepted')),
      },
      {
        label: 'Canceladas por cliente',
        value: formatInteger(
          getValue<number>(selectedStat, 'count_orders_cancelled_by_client', 'countOrdersCancelledByClient')
        ),
      },
      {
        label: 'Canceladas por conductor',
        value: formatInteger(
          getValue<number>(selectedStat, 'count_orders_cancelled_by_driver', 'countOrdersCancelledByDriver')
        ),
      },
      {
        label: 'Órdenes plataforma',
        value: formatInteger(getValue<number>(selectedStat, 'count_orders_platform', 'countOrdersPlatform')),
      },
    ]

    const driverMetrics = [
      {
        label: 'Conductores activos',
        value: formatInteger(getValue<number>(selectedStat, 'count_active_drivers', 'countActiveDrivers')),
      },
      {
        label: 'Conductores totales',
        value: formatInteger(getValue<number>(selectedStat, 'count_drivers', 'countDrivers')),
      },
    ]

    const financialMetrics = [
      {
        label: 'Monto efectivo',
        value: formatNumber(getValue<number>(selectedStat, 'sum_price_cash', 'sumPriceCash'), 2),
      },
      {
        label: 'Monto cashless',
        value: formatNumber(getValue<number>(selectedStat, 'sum_price_cashless', 'sumPriceCashless'), 2),
      },
      {
        label: 'Otros gastos',
        value: formatNumber(getValue<number>(selectedStat, 'sum_price_other_gas', 'sumPriceOtherGas'), 2),
      },
      {
        label: 'Comisión parqueo',
        value: formatNumber(
          getValue<number>(selectedStat, 'sum_price_park_commission', 'sumPriceParkCommission'),
          2
        ),
      },
      {
        label: 'Comisión plataforma',
        value: formatNumber(
          getValue<number>(selectedStat, 'sum_price_platform_commission', 'sumPricePlatformCommission'),
          2
        ),
      },
    ]

    const timelineMetrics = [
      {
        label: 'Distancia total (km)',
        value: formatNumber(getValue<number>(selectedStat, 'sum_distance', 'sumDistance'), 2),
      },
      {
        label: 'Órdenes (suma)',
        value: formatInteger(getValue<number>(selectedStat, 'sum_orders_completed', 'sumOrdersCompleted')),
      },
      {
        label: 'Tiempo trabajado',
        value: formatDuration(getValue<number>(selectedStat, 'sum_work_time_seconds', 'sumWorkTimeSeconds')),
      },
      {
        label: 'Creado el',
        value: formatDateTime(getValue<string>(selectedStat, 'created_at', 'createdAt')),
      },
    ]

    return {
      driverIdentifier,
      driverName,
      driverPhone,
      driverLicense,
      parkName,
      hireDate,
      categoryDetail,
      categoryName: formatName(selectedStat.category) || 'Sin categoría',
      categoryTheme: getCategoryTheme(selectedStat.category),
      monthLabel: formatMonthLabel(selectedStat.month),
      yearLabel: selectedStat.year || '—',
      acceptanceRate,
      acceptanceRatePercent,
      completionRate,
      completionRatePercent,
      countMetrics,
      driverMetrics,
      financialMetrics,
      timelineMetrics,
    }
  }, [selectedStat])

  const MetricCard: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="rounded-lg border border-neutral-200 bg-white/60 p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
      <p className="text-[11px] uppercase text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-1 text-base font-semibold text-neutral-900 dark:text-neutral-100">{value}</p>
    </div>
  )

  return (
    <div className="p-6 space-y-6 w-full max-w-none">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Módulo Yego Premiun</h1>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            Consulta los registros mensuales de conductores asociados a la categoría Yego Premiun.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
           <Button
             onClick={handleProcessActives}
             loading={processing}
             disabled={processing || loading || !processAvailable}
             className="gap-2"
           >
             <RefreshCcw className="h-4 w-4" />
             Procesar conductores activos
           </Button>
         </div>

      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
          <Button variant="outline" onClick={handleResetFilters} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Limpiar filtros
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="driverQuery" className="text-sm font-medium">
                Licencia, nombre, flota o ID
              </Label>
              <Input
                id="driverQuery"
                placeholder="Buscar por licencia, nombre, flota o ID"
                value={driverQuery}
                className="h-10"
                onChange={(event) => {
                  setDriverQuery(event.target.value)
                  setPage(1)
                }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Mes</Label>
              <Select
                value={selectedMonth}
                onValueChange={(value) => {
                  setSelectedMonth(value)
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un mes" />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_OPTIONS.map((option) => (
                    <SelectItem key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Año</Label>
              <Select
                value={selectedYear}
                onValueChange={(value) => {
                  setSelectedYear(value)
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un año" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((option) => (
                    <SelectItem key={option.value || 'all-years'} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Flota</Label>
              <Select
                value={selectedFleet}
                onValueChange={(value) => {
                  setSelectedFleet(value)
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una flota" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las flotas</SelectItem>
                  {[...new Set(stats.map((stat) => getParkName(stat)))]
                    .filter(Boolean)
                    .sort((a, b) => (a || '').localeCompare(b || ''))
                    .map((fleet) => (
                      <SelectItem key={fleet ?? 'unknown'} value={(fleet ?? '').toLowerCase()}>
                        {fleet}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Registros mensuales</CardTitle>
            <CardDescription>
              Resultados actualizados con la información más reciente disponible en la plataforma.
            </CardDescription>
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            Total general: <span className="font-semibold">{total}</span> registros
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conductor</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Mes</TableHead>
                  <TableHead>Año</TableHead>
                  <TableHead className="w-24 text-center">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{renderTableBody()}</TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2 text-sm text-neutral-600 dark:text-neutral-400 md:flex-row md:items-center md:gap-4">
              <div>
                {total === 0 ? (
                  'Sin resultados para los filtros seleccionados'
                ) : (
                  <>
                    Mostrando <span className="font-semibold">{startItem}</span> -{' '}
                    <span className="font-semibold">{endItem}</span> de{' '}
                    <span className="font-semibold">{total}</span> registros
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Por página
                </Label>
                <Select
                  value={String(limit)}
                  onValueChange={(value) => {
                    setLimit(parseInt(value, 10))
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="h-9 w-24">
                    <SelectValue placeholder="Tamaño" />
                  </SelectTrigger>
                  <SelectContent>
                    {LIMIT_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleFirstPage}
                disabled={page === 1 || loading}
                className="h-8 w-8"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevPage}
                disabled={page === 1 || loading}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {pageNumbers.map((pageNumber) => (
                <Button
                  key={pageNumber}
                  variant={page === pageNumber ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => handlePageChange(pageNumber)}
                  disabled={loading}
                  className="h-8 w-8 p-0"
                >
                  {pageNumber}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextPage}
                disabled={page >= totalPages || loading}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleLastPage}
                disabled={page >= totalPages || loading}
                className="h-8 w-8"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isDetailOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseDetails()
          } else {
            setIsDetailOpen(true)
          }
        }}
      >
        <DialogContent className="sm:max-w-[840px]">
          <DialogHeader>
            <DialogTitle>Detalle del conductor</DialogTitle>
            {detailData && (
              <DialogDescription>
                Información consolidada del conductor{' '}
                {detailData.driverName ||
                  (detailData.driverIdentifier ? `#${detailData.driverIdentifier}` : 'sin identificación')}
              </DialogDescription>
            )}
          </DialogHeader>
          {detailData && (
            <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-neutral-200 bg-white/60 p-4 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/60">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Información general
                  </p>
                  <div className="mt-3 space-y-2">
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Nombre</p>
                      <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                        {detailData.driverName ||
                          (detailData.driverIdentifier ? `Conductor #${detailData.driverIdentifier}` : 'Sin identificación')}
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase text-neutral-500 dark:text-neutral-400">Licencia</p>
                        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 break-all">
                          {detailData.driverLicense || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-neutral-500 dark:text-neutral-400">Teléfono</p>
                        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                          {detailData.driverPhone?.trim() || 'No disponible'}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase text-neutral-500 dark:text-neutral-400">Flota</p>
                        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                          {detailData.parkName || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-neutral-500 dark:text-neutral-400">ID</p>
                        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 break-all">
                          {detailData.driverIdentifier ?? '—'}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-neutral-500 dark:text-neutral-400">Fecha de vinculación</p>
                      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                        {detailData.hireDate}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`rounded-xl border bg-gradient-to-br p-4 shadow-sm ${detailData.categoryTheme.cardBorder} ${detailData.categoryTheme.cardBackground}`}
                >
                  <p className={`text-base font-semibold ${detailData.categoryTheme.accentText}`}>
                    {detailData.categoryName}
                  </p>
                  <div className="mt-3 space-y-3">
                    <p className="text-sm text-neutral-700 dark:text-neutral-200">{detailData.categoryDetail}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase text-neutral-500 dark:text-neutral-400">Mes</p>
                        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                          {detailData.monthLabel}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-neutral-500 dark:text-neutral-400">Año</p>
                        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                          {detailData.yearLabel}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-neutral-200 bg-white/60 p-4 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                        Tasa de aceptación
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Porcentaje de órdenes aceptadas
                      </p>
                    </div>
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">
                      {formatPercentage(detailData.acceptanceRate)}
                    </span>
                  </div>
                  <div className="mt-3 h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-800">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-red-500 to-orange-400 transition-all"
                      style={getProgressStyle(detailData.acceptanceRatePercent)}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-neutral-200 bg-white/60 p-4 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                        Tasa de finalización
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Órdenes completadas sobre aceptadas
                      </p>
                    </div>
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">
                      {formatPercentage(detailData.completionRate)}
                    </span>
                  </div>
                  <div className="mt-3 h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-800">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-red-500 to-orange-400 transition-all"
                      style={getProgressStyle(detailData.completionRatePercent)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                  Rendimiento operativo
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {detailData.countMetrics.map((metric) => (
                    <MetricCard key={metric.label} label={metric.label} value={metric.value} />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-100">Conductores</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {detailData.driverMetrics.map((metric) => (
                    <MetricCard key={metric.label} label={metric.label} value={metric.value} />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                  Indicadores financieros
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {detailData.financialMetrics.map((metric) => (
                    <MetricCard key={metric.label} label={metric.label} value={metric.value} />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                  Línea de tiempo
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {detailData.timelineMetrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-lg border border-neutral-200 bg-white/60 p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60"
                    >
                      <p className="text-xs uppercase text-neutral-500 dark:text-neutral-400">
                        {metric.label}
                      </p>
                      <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {metric.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default YegoPremiunModule
