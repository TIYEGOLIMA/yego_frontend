import React, { useEffect, useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Input } from '../../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { Label } from '../../../components/ui/label'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, Filter, Loader2, RefreshCcw } from 'lucide-react'
import { yegoPremiunService, type DriverMonthlyStat } from '../../../services'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'

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
  const [driverId, setDriverId] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(MONTH_OPTIONS[0].value)
  const [selectedYear, setSelectedYear] = useState(yearOptions[0].value)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(parseInt(LIMIT_OPTIONS[0], 10))
  const [selectedStat, setSelectedStat] = useState<DriverMonthlyStat | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

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

  const getDriverName = (stat: DriverMonthlyStat) =>
    getValue<string>(stat, 'driver_name', 'fullName')

  const getDriverPhone = (stat: DriverMonthlyStat) =>
    getValue<string>(stat, 'driver_phone', 'phone')

  const getDriverLicense = (stat: DriverMonthlyStat) =>
    getValue<string>(stat, 'driver_license', 'driverLicense', 'licenseNumber')

  const getParkName = (stat: DriverMonthlyStat) =>
    getValue<string>(stat, 'parkName', 'park_name', 'parkId', 'park_id')

  const normalizeParkName = (value: string | null | undefined) => {
    if (!value) return value
    return value.replace(/,\s*$/, '')
  }

  const formatMonthLabel = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '—'
    const option = MONTH_OPTIONS.find((monthOption) => Number(monthOption.value) === value)
    return option?.label ?? value
  }

  useEffect(() => {
    const controller = new AbortController()
    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await yegoPremiunService.fetchDriverMonthlyStats({ signal: controller.signal })

        setStats(response.data)
      } catch (err: any) {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
          return
        }
        console.error('❌ [YegoPremiun] Error al cargar estadísticas:', err)
        setError('No se pudieron cargar los registros. Intenta de nuevo.')
        setStats([])
      } finally {
        setLoading(false)
      }
    }

    fetchStats()

    return () => {
      controller.abort()
    }
  }, [])

  const filteredStats = useMemo(() => {
    const driverIdFilter = driverId.trim().toLowerCase()
    const monthFilter = selectedMonth !== 'all' ? Number(selectedMonth) : null
    const yearFilter = selectedYear !== 'all' ? Number(selectedYear) : null

    return stats.filter((stat) => {
      const identifier = getDriverIdentifier(stat)
      const name = getDriverName(stat)
      const license = getDriverLicense(stat)
      const park = normalizeParkName(getParkName(stat) || '')

      const matchesDriver =
        driverIdFilter.length === 0 ||
        [identifier, name, license, park]
          .map((value) => String(value ?? '').toLowerCase())
          .some((value) => value.includes(driverIdFilter))
      const matchesMonth = monthFilter !== null ? stat.month === monthFilter : true
      const matchesYear = yearFilter !== null ? stat.year === yearFilter : true
      return matchesDriver && matchesMonth && matchesYear
    })
  }, [stats, driverId, selectedMonth, selectedYear])

  const total = filteredStats.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
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

  const handleResetFilters = () => {
    setDriverId('')
    setSelectedMonth(MONTH_OPTIONS[0].value)
    setSelectedYear(yearOptions[0].value)
    setLimit(parseInt(LIMIT_OPTIONS[0], 10))
    setPage(1)
  }

  const handlePrevPage = () => {
    setPage((prev) => Math.max(1, prev - 1))
  }

  const handleNextPage = () => {
    setPage((prev) => Math.min(totalPages, prev + 1))
  }

  const handleFirstPage = () => {
    setPage(1)
  }

  const handleLastPage = () => {
    setPage(totalPages)
  }

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
    setTimeout(() => {
      setSelectedStat(null)
    }, 200)
  }

  const detailFields = useMemo(() => {
    if (!selectedStat) {
      return []
    }

    const driverIdentifier = getDriverIdentifier(selectedStat)
    const driverName = getDriverName(selectedStat)
    const driverPhone = getDriverPhone(selectedStat)

    const acceptanceRate = getValue<number>(selectedStat, 'acceptance_rate', 'acceptanceRate')
    const completionRate = getValue<number>(selectedStat, 'completion_rate', 'completionRate')
    const countOrdersCompleted = getValue<number>(
      selectedStat,
      'count_orders_completed',
      'countOrdersCompleted'
    )
    const countOrdersAll = getValue<number>(
      selectedStat,
      'count_orders_all',
      'countOrdersAll'
    )
    const countOrdersAccepted = getValue<number>(
      selectedStat,
      'count_orders_accepted',
      'countOrdersAccepted'
    )
    const countOrdersCancelledByClient = getValue<number>(
      selectedStat,
      'count_orders_cancelled_by_client',
      'countOrdersCancelledByClient'
    )
    const countOrdersCancelledByDriver = getValue<number>(
      selectedStat,
      'count_orders_cancelled_by_driver',
      'countOrdersCancelledByDriver'
    )
    const countOrdersPlatform = getValue<number>(
      selectedStat,
      'count_orders_platform',
      'countOrdersPlatform'
    )
    const countActiveDrivers = getValue<number>(
      selectedStat,
      'count_active_drivers',
      'countActiveDrivers'
    )
    const countDrivers = getValue<number>(selectedStat, 'count_drivers', 'countDrivers')
    const sumDistance = getValue<number>(selectedStat, 'sum_distance', 'sumDistance')
    const sumOrdersCompleted = getValue<number>(
      selectedStat,
      'sum_orders_completed',
      'sumOrdersCompleted'
    )
    const sumPriceCash = getValue<number>(selectedStat, 'sum_price_cash', 'sumPriceCash')
    const sumPriceCashless = getValue<number>(
      selectedStat,
      'sum_price_cashless',
      'sumPriceCashless'
    )
    const sumPriceOtherGas = getValue<number>(
      selectedStat,
      'sum_price_other_gas',
      'sumPriceOtherGas'
    )
    const sumPriceParkCommission = getValue<number>(
      selectedStat,
      'sum_price_park_commission',
      'sumPriceParkCommission'
    )
    const sumPricePlatformCommission = getValue<number>(
      selectedStat,
      'sum_price_platform_commission',
      'sumPricePlatformCommission'
    )
    const sumWorkTimeSeconds = getValue<number>(
      selectedStat,
      'sum_work_time_seconds',
      'sumWorkTimeSeconds'
    )
    const createdAt = getValue<string>(selectedStat, 'created_at', 'createdAt')

    return [
      { label: 'ID de conductor', value: driverIdentifier ?? '—' },
      { label: 'Licencia', value: getDriverLicense(selectedStat) || '—' },
      { label: 'Flota', value: normalizeParkName(getParkName(selectedStat) || '') || '—' },
      {
        label: 'Nombre',
        value:
          driverName?.trim() ||
          (driverIdentifier ? `Conductor #${driverIdentifier}` : 'Conductor sin identificación'),
      },
      { label: 'Teléfono', value: driverPhone?.trim() || 'No disponible' },
      { label: 'Categoría', value: selectedStat.category || '—' },
      { label: 'Mes', value: formatMonthLabel(selectedStat.month) },
      { label: 'Año', value: selectedStat.year || '—' },
      { label: 'Viajes', value: formatInteger(selectedStat.trips) },
      { label: 'Órdenes completadas', value: formatInteger(countOrdersCompleted) },
      { label: 'Órdenes totales', value: formatInteger(countOrdersAll) },
      { label: 'Órdenes aceptadas', value: formatInteger(countOrdersAccepted) },
      { label: 'Canceladas por cliente', value: formatInteger(countOrdersCancelledByClient) },
      { label: 'Canceladas por conductor', value: formatInteger(countOrdersCancelledByDriver) },
      { label: 'Órdenes plataforma', value: formatInteger(countOrdersPlatform) },
      { label: 'Conductores activos', value: formatInteger(countActiveDrivers) },
      { label: 'Conductores totales', value: formatInteger(countDrivers) },
      { label: 'Tasa de aceptación', value: formatPercentage(acceptanceRate) },
      { label: 'Tasa de finalización', value: formatPercentage(completionRate) },
      { label: 'Distancia total (km)', value: formatNumber(sumDistance, 2) },
      { label: 'Órdenes (suma)', value: formatInteger(sumOrdersCompleted) },
      { label: 'Monto efectivo', value: formatNumber(sumPriceCash, 2) },
      { label: 'Monto cashless', value: formatNumber(sumPriceCashless, 2) },
      { label: 'Otros gastos', value: formatNumber(sumPriceOtherGas, 2) },
      { label: 'Comisión parqueo', value: formatNumber(sumPriceParkCommission, 2) },
      { label: 'Comisión plataforma', value: formatNumber(sumPricePlatformCommission, 2) },
      { label: 'Tiempo trabajado', value: formatDuration(sumWorkTimeSeconds) },
      { label: 'Viajes por hora', value: formatNumber(selectedStat.trips_per_hour, 2) },
      { label: 'Creado el', value: formatDateTime(createdAt) },
    ]
  }, [selectedStat])

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
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {getDriverName(stat)?.trim()
                ? getDriverName(stat)
                : (() => {
                    const identifier = getDriverIdentifier(stat)
                    return identifier ? `Conductor #${identifier}` : 'Conductor sin identificación'
                  })()}
            </span>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">
                <span className="font-medium">Licencia:</span> {getDriverLicense(stat) || '—'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">
                <span className="font-medium">Flota:</span> {normalizeParkName(getParkName(stat) || '') || '—'}
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
          <Badge variant="outline" className="uppercase">
            {stat.category || '—'}
          </Badge>
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

  return (
    <div className="p-6 space-y-6 w-full max-w-none">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Módulo Yego Premiun</h1>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            Consulta los registros mensuales de conductores asociados a la categoría Yego Premiun.
          </p>
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
              <Label htmlFor="driverId" className="text-sm font-medium">
                Licencia, nombre o flota
              </Label>
              <Input
                id="driverId"
                placeholder="Buscar por licencia, nombre, flota o ID"
                value={driverId}
                className="h-10"
                onChange={(event) => {
                  setDriverId(event.target.value)
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
                <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Por página</Label>
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
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Detalle del conductor</DialogTitle>
            {selectedStat && (
              <DialogDescription>
                Información consolidada del conductor{' '}
                {selectedStat.driver_name?.trim()
                  ? selectedStat.driver_name
                  : `#${formatInteger(selectedStat.driver_id)}`}
              </DialogDescription>
            )}
          </DialogHeader>
          {selectedStat && (
            <div className="max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid gap-4 sm:grid-cols-2">
                {detailFields.map((field) => (
                  <div
                    key={field.label}
                    className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      {field.label}
                    </p>
                    <p className="mt-1 text-sm text-neutral-900 dark:text-neutral-100">{field.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default YegoPremiunModule
