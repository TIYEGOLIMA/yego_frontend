import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../../components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table'
import { Input } from '../../../../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select'
import { Label } from '../../../../components/ui/label'
import { Button } from '../../../../components/ui/button'
import { Badge } from '../../../../components/ui/badge'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Filter,
  Loader2,
  RefreshCcw,
  Award,
} from 'lucide-react'
import { yegoPremiumService, type DriverMonthlyStat, type FlotaPartnerOption } from '../../../../services'
import { getDefaultTripsYear, getTripsYearSelectOptions } from '../trips-year-options'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog'

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

const MONTH_LABEL_BY_NUM = new Map(
  MONTH_OPTIONS.filter((o) => o.value !== 'all').map((o) => [Number(o.value), o.label])
)

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

const formatProcessingTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
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

const getValue = <T,>(stat: DriverMonthlyStat, ...keys: (keyof DriverMonthlyStat)[]): T | null => {
  for (const key of keys) {
    const value = stat[key]
    if (value !== undefined && value !== null) {
      return value as T
    }
  }
  return null
}

const formatName = (name: string | null | undefined) => {
  if (!name) return null
  return name
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const getDriverIdentifier = (stat: DriverMonthlyStat) =>
  getValue<string | number>(stat, 'driver_id', 'driverId')

const getDriverName = (stat: DriverMonthlyStat) =>
  formatName(getValue<string>(stat, 'driver_name', 'fullName'))

const getDriverPhone = (stat: DriverMonthlyStat) =>
  getValue<string>(stat, 'driver_phone', 'phone')

const getDriverLicense = (stat: DriverMonthlyStat) =>
  getValue<string>(stat, 'driver_license', 'driverLicense', 'licenseNumber')

const getParkName = (stat: DriverMonthlyStat) =>
  normalizeParkName(getValue<string>(stat, 'parkName', 'park_name'))

const getParkId = (stat: DriverMonthlyStat) =>
  getValue<string>(stat, 'parkId', 'park_id')

const getCategoryDetail = (stat: DriverMonthlyStat) =>
  getValue<string>(stat, 'categoryDetail')

const getHireDate = (stat: DriverMonthlyStat) =>
  getValue<string>(stat, 'hireDate')

const formatMonthLabel = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—'
  return MONTH_LABEL_BY_NUM.get(value) ?? String(value)
}

const MetricCard: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="rounded-lg border border-neutral-200 bg-white/60 p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
    <p className="text-[11px] uppercase text-neutral-500 dark:text-neutral-400">{label}</p>
    <p className="mt-1 text-base font-semibold text-neutral-900 dark:text-neutral-100">{value}</p>
  </div>
)

interface ViajesMesTabProps {
  showProcessing?: boolean
  driverFilter?: string
}

const ViajesMesTab: React.FC<ViajesMesTabProps> = ({ showProcessing = false, driverFilter }) => {
  const currentMonth = new Date().getMonth() + 1
  const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const yearOptions = useMemo(
    () => [{ value: 'all', label: 'Todos los años' }, ...getTripsYearSelectOptions()],
    []
  )

  const [stats, setStats] = useState<DriverMonthlyStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [driverQuery, setDriverQuery] = useState(driverFilter ?? '')
  const [selectedMonth, setSelectedMonth] = useState(driverFilter ? 'all' : String(previousMonth))
  const [selectedYear, setSelectedYear] = useState(() => getDefaultTripsYear())
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(parseInt(LIMIT_OPTIONS[0], 10))
  const [selectedStat, setSelectedStat] = useState<DriverMonthlyStat | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [selectedFleet, setSelectedFleet] = useState<string>('all')
  const [fleetOptions, setFleetOptions] = useState<FlotaPartnerOption[]>([])
  const [fleetOptionsError, setFleetOptionsError] = useState<string | null>(null)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [processingTime, setProcessingTime] = useState(0)
  const [showMonthModal, setShowMonthModal] = useState(false)
  const [selectedProcessMonth, setSelectedProcessMonth] = useState<string>(String(previousMonth))
  const [selectedProcessYear, setSelectedProcessYear] = useState<string>(() => getDefaultTripsYear())

  const loadStats = useCallback(
    async ({ signal, showLoader = true }: { signal?: AbortSignal; showLoader?: boolean } = {}) => {
      try {
        if (showLoader) {
          setLoading(true)
        }
        setError(null)

        const response = await yegoPremiumService.fetchDriverMonthlyStats({ signal })

        if (!signal || !signal.aborted) {
          setStats(response.data)
        }
      } catch (err: any) {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || err?.message === 'canceled') {
          return
        }
        console.error('[YegoPremium] Error al cargar estadísticas:', err)
        if (!signal || !signal.aborted) {
          setError('No se pudieron cargar los registros. Intenta de nuevo.')
          setStats([])
        }
      } finally {
        // No apagar loading si el AbortController canceló la petición (p. ej. Strict Mode o salida de ruta):
        // si no, queda un frame con loading=false y stats=[] y se ve "sin resultados" al entrar.
        if (showLoader && !signal?.aborted) {
          setLoading(false)
        }
      }
    },
    [],
  )

  useEffect(() => {
    const controller = new AbortController()
    loadStats({ signal: controller.signal })

    return () => {
      controller.abort()
    }
  }, [loadStats])

  useEffect(() => {
    const controller = new AbortController()
    setFleetOptionsError(null)
    yegoPremiumService
      .fetchFlotaPartners({ signal: controller.signal })
      .then((list) => {
        const sorted = [...list].sort((a, b) =>
          (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' })
        )
        setFleetOptions(sorted)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        console.error('[YegoPremium] Error al cargar lista de flotas:', err)
        setFleetOptionsError('No se pudo cargar el listado de flotas')
        setFleetOptions([])
      })
    return () => controller.abort()
  }, [])

  const filteredStats = useMemo(() => {
    const search = driverQuery.trim().toLowerCase()
    const monthFilter = selectedMonth !== 'all' ? Number(selectedMonth) : null
    const yearFilter = selectedYear !== 'all' ? Number(selectedYear) : null
    const fleetFilter = selectedFleet === 'all' ? null : selectedFleet

    return stats.filter((stat) => {
      const identifier = getDriverIdentifier(stat)
      const name = getDriverName(stat)
      const license = getDriverLicense(stat)
      const park = getParkName(stat)
      const parkId = getParkId(stat)

      const matchesQuery =
        search.length === 0 ||
        [identifier, name, license, park]
          .map((value) => String(value ?? '').toLowerCase())
          .some((value) => value.includes(search))

      const matchesMonth = monthFilter !== null ? stat.month === monthFilter : true
      const matchesYear = yearFilter !== null ? stat.year === yearFilter : true
      const matchesFleet =
        fleetFilter === null
          ? true
          : parkId
            ? parkId === fleetFilter
            : false

      return matchesQuery && matchesMonth && matchesYear && matchesFleet
    })
  }, [stats, driverQuery, selectedMonth, selectedYear, selectedFleet])

  const { countOro, countPlata } = useMemo(() => {
    let oro = 0
    let plata = 0
    for (const stat of filteredStats) {
      const category = (stat.category || '').toLowerCase()
      if (category.includes('oro')) oro += 1
      if (category.includes('plata')) plata += 1
    }
    return { countOro: oro, countPlata: plata }
  }, [filteredStats])

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
    setSelectedMonth(String(previousMonth))
    setSelectedYear(getDefaultTripsYear())
    setSelectedFleet('all')
    setLimit(parseInt(LIMIT_OPTIONS[0], 10))
    setPage(1)
  }

  const handleProcessByMonth = async () => {
    if (selectedProcessMonth === 'all' || selectedProcessYear === 'all') {
      setError('Por favor selecciona un mes y año específicos')
      return
    }

    try {
      setProcessing(true)
      setError(null)
      setLoading(true)
      setShowMonthModal(false)
      setShowProgressModal(true)
      setProcessingTime(0)

      const month = Number(selectedProcessMonth)
      const year = Number(selectedProcessYear)

      const startTime = Date.now()
      const timeInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        setProcessingTime(elapsed)
      }, 1000)

      try {
        const processed = await yegoPremiumService.processDriverActiveStatsByMonth(month, year)
        clearInterval(timeInterval)
        
        setStats(processed)
        setPage(1)
      } catch (processError) {
        clearInterval(timeInterval)
        throw processError
      } finally {
        setShowProgressModal(false)
        setProcessingTime(0)
      }
    } catch (err: any) {
      console.error('[YegoPremium] Error al procesar por mes:', err)
      setError('No se pudo procesar la información del mes seleccionado. Intenta nuevamente.')
      setShowProgressModal(false)
      setProcessingTime(0)
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
              <span>Cargando registros de Yego Premium...</span>
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

    return paginatedStats.map((stat) => {
      const categoryTheme = getCategoryTheme(stat.category)
      const identifier = getDriverIdentifier(stat)
      const displayName =
        getDriverName(stat)?.trim() ||
        (identifier ? `Conductor #${identifier}` : 'Conductor sin identificación')

      return (
      <TableRow key={stat.id}>
        <TableCell>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {displayName}
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
          <Badge variant="outline" className={`uppercase ${categoryTheme.badge}`}>
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
      )
    })
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
      countMetrics,
      financialMetrics,
      timelineMetrics,
    }
  }, [selectedStat])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3">
        <Card className="border-0 bg-amber-50 dark:bg-amber-950/20 w-fit min-w-[200px]">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Premium Oro</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                  {countOro}
                </p>
              </div>
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-slate-50 dark:bg-slate-950/20 w-fit min-w-[200px]">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Premium Plata</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {countPlata}
                </p>
              </div>
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900/30 rounded-full flex items-center justify-center">
                <Award className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        </div>

        {showProcessing && (
          <Button
            onClick={() => setShowMonthModal(true)}
            loading={processing}
            disabled={processing || loading}
            variant="outline"
            className="h-10 w-full shrink-0 self-end sm:w-auto sm:self-auto"
            leftIcon={<RefreshCcw className="h-4 w-4 shrink-0" aria-hidden />}
          >
            Procesar por mes
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex min-h-10 items-center gap-2 text-base">
            <Filter className="h-5 w-5 shrink-0" aria-hidden />
            Filtros de Búsqueda
          </CardTitle>
          <Button
            variant="outline"
            onClick={handleResetFilters}
            className="h-10 shrink-0"
            leftIcon={<RefreshCcw className="h-4 w-4 shrink-0" aria-hidden />}
          >
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
                <SelectContent className="max-h-[min(24rem,70vh)]">
                  <SelectItem value="all">Todas las flotas</SelectItem>
                  {fleetOptions.map((flota) => (
                    <SelectItem key={flota.id} value={flota.id}>
                      {flota.city ? `${flota.name} — ${flota.city}` : flota.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fleetOptionsError ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">{fleetOptionsError}</p>
              ) : null}
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
          <div className="flex min-h-[1.25rem] items-center text-sm text-neutral-600 dark:text-neutral-400">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary-600" aria-hidden />
                Cargando registros…
              </span>
            ) : (
              <>
                Total general: <span className="font-semibold">{total}</span> registros
              </>
            )}
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
                {loading ? (
                  <span className="inline-flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Cargando registros mensuales…
                  </span>
                ) : total === 0 ? (
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
        open={showProgressModal}
        onOpenChange={(open) => {
          if (!open && processing) return
          setShowProgressModal(open)
        }}
      >
        <DialogContent
          className="sm:max-w-md [&>button]:hidden"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Procesando conductores activos</DialogTitle>
            <DialogDescription>
              Por favor espera mientras se procesa la información. Este proceso puede tardar varios minutos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
            </div>
            <div className="space-y-2 text-center">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Tiempo transcurrido: {formatProcessingTime(processingTime)}
              </p>
              <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-primary-600 animate-pulse" style={{ width: '100%' }} />
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Por favor no cierres esta ventana. El proceso continuará hasta completarse.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDetailOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseDetails()
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

      {showProcessing && (
        <Dialog open={showMonthModal} onOpenChange={setShowMonthModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Procesar por mes</DialogTitle>
              <DialogDescription>
                Selecciona el mes y año que deseas procesar. Este proceso puede tardar varios minutos.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="processMonth" className="text-sm font-medium">
                  Mes
                </Label>
                <Select
                  value={selectedProcessMonth}
                  onValueChange={setSelectedProcessMonth}
                >
                  <SelectTrigger id="processMonth">
                    <SelectValue placeholder="Selecciona un mes" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_OPTIONS.filter(option => option.value !== 'all').map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="processYear" className="text-sm font-medium">
                  Año
                </Label>
                <Select
                  value={selectedProcessYear}
                  onValueChange={setSelectedProcessYear}
                >
                  <SelectTrigger id="processYear">
                    <SelectValue placeholder="Selecciona un año" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.filter(option => option.value !== 'all').map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowMonthModal(false)}
                  disabled={processing}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleProcessByMonth}
                  loading={processing}
                  disabled={processing || selectedProcessMonth === 'all' || selectedProcessYear === 'all'}
                >
                  Procesar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default ViajesMesTab
