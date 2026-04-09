import React, { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../../components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select'
import { Label } from '../../../../components/ui/label'
import { Button } from '../../../../components/ui/button'
import { Loader2, RefreshCw, Route, TrendingUp, Wallet } from 'lucide-react'
import { yegoPremiunService, type DriverTripsYearResponse } from '../../../../services'
import { getDefaultTripsYear, getTripsYearSelectOptions } from '../trips-year-options'

const MONTH_SHORT = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
]

/** Barras y ejes: primary (viajes) y sky (Yango), alineado con las tarjetas. */
const COLORS = {
  viajes: '#D40000',
  yango: '#0284c7',
  yangoBar: '#38bdf9',
  grid: '#e5e5e5',
  tick: '#525252',
} as const

function toNumber(v: unknown): number {
  if (v == null) return 0
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  const n = parseFloat(String(v))
  return Number.isNaN(n) ? 0 : n
}

/** ¿Este mes del año puede tener datos (no es futuro en el año en curso)? */
function monthCanHaveData(year: number, month: number): boolean {
  const now = new Date()
  const cy = now.getFullYear()
  if (year < cy) return true
  if (year > cy) return false
  return month <= now.getMonth() + 1
}

interface ViajesMesVisitanteTabProps {
  driverId: string
}

const ViajesMesVisitanteTab: React.FC<ViajesMesVisitanteTabProps> = ({ driverId }) => {
  const yearOptions = useMemo(() => getTripsYearSelectOptions(), [])
  const [year, setYear] = useState(() => getDefaultTripsYear())
  const [payload, setPayload] = useState<DriverTripsYearResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)

  useEffect(() => {
    if (!driverId.trim()) return

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    yegoPremiunService
      .fetchDriverTripsYear({
        driverId: driverId.trim(),
        year: Number(year),
        signal: controller.signal,
      })
      .then((data) => {
        setPayload(data)
        if (!controller.signal.aborted) {
          setLastUpdatedAt(new Date())
        }
      })
      .catch((err: any) => {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return
        setError('No se pudo cargar los viajes del año.')
        setPayload(null)
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [driverId, year, refreshToken])

  const yearNum = Number(year)

  const chartData = useMemo(() => {
    const byMonth = new Map<number, { viajes: number; yangoPro: number }>()
    for (const p of payload?.monthlySeries ?? []) {
      if (p.month == null || p.month < 1 || p.month > 12) continue
      if (!monthCanHaveData(yearNum, p.month)) continue
      byMonth.set(p.month, {
        viajes: toNumber(p.tripsCount),
        yangoPro: toNumber(p.precioYangoProSoles),
      })
    }

    const rows: { label: string; viajes: number; yangoPro: number }[] = []
    for (let m = 1; m <= 12; m++) {
      const ok = monthCanHaveData(yearNum, m)
      const row = ok ? byMonth.get(m) : undefined
      rows.push({
        label: MONTH_SHORT[m - 1] ?? String(m),
        viajes: ok ? (row?.viajes ?? 0) : 0,
        yangoPro: ok ? (row?.yangoPro ?? 0) : 0,
      })
    }
    return rows
  }, [payload, yearNum])

  const totalViajesDisplay = useMemo(() => {
    if (payload?.totalCompletedTrips != null) return toNumber(payload.totalCompletedTrips)
    return chartData.reduce((a, r) => a + r.viajes, 0)
  }, [payload, chartData])

  const totalYangoDisplay = useMemo(() => {
    if (payload?.totalPrecioYangoProSoles != null) return toNumber(payload.totalPrecioYangoProSoles)
    return chartData.reduce((a, r) => a + r.yangoPro, 0)
  }, [payload, chartData])

  /** Meses “activos”: con al menos un viaje (solo en ventana válida del año). */
  const monthsWithTrips = useMemo(() => {
    let n = 0
    for (let m = 1; m <= 12; m++) {
      if (!monthCanHaveData(yearNum, m)) continue
      const v = chartData[m - 1]?.viajes ?? 0
      if (v > 0) n += 1
    }
    return n
  }, [chartData, yearNum])

  const promedioViajesMensual = useMemo(() => {
    if (monthsWithTrips <= 0) return 0
    return Math.round(totalViajesDisplay / monthsWithTrips)
  }, [totalViajesDisplay, monthsWithTrips])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5" />
            Viajes del año
          </CardTitle>
          <CardDescription>
            Resumen por mes (viajes y Yango Pro). El total Yango usa el valor del servidor cuando viene en la respuesta.
            Pulsa Recalcular para datos al día.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="viajes-anio-select">Año</Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="min-w-0 flex-1 sm:max-w-sm">
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger id="viajes-anio-select" className="w-full min-w-[10rem]">
                    <SelectValue placeholder="Año" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full shrink-0 sm:w-auto"
                onClick={() => setRefreshToken((n) => n + 1)}
                disabled={loading || !driverId.trim()}
                leftIcon={
                  <RefreshCw className={`h-4 w-4 shrink-0 ${loading ? 'animate-spin' : ''}`} aria-hidden />
                }
              >
                Recalcular
              </Button>
            </div>
          </div>
          {lastUpdatedAt && !loading && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Última actualización:{' '}
              {lastUpdatedAt.toLocaleString('es-PE', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="w-full min-w-0">
        {loading ? (
          <div className="flex min-h-[120px] items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 py-8 dark:border-neutral-800 dark:bg-neutral-900/30">
            <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
            <span className="text-sm text-neutral-600 dark:text-neutral-400">Cargando…</span>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-error-200 bg-error-50/80 px-4 py-6 text-center dark:border-error-900/50 dark:bg-error-950/30">
            <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Card className="border border-neutral-200/90 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900/90">
                <CardContent className="flex items-start gap-3 p-4">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800/80"
                    aria-hidden
                  >
                    <Route className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      Viajes completados
                    </p>
                    <p className="mt-1 text-2xl font-bold tabular-nums leading-tight tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-[1.65rem]">
                      {payload
                        ? new Intl.NumberFormat('es-PE').format(Math.round(totalViajesDisplay))
                        : '—'}
                    </p>
                    <p className="mt-1.5 text-[10px] leading-tight text-neutral-500 dark:text-neutral-500">
                      Periodo visible · {year}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-sky-200/70 bg-gradient-to-br from-sky-50/90 to-white shadow-sm transition-shadow hover:shadow-md dark:border-sky-900/40 dark:from-sky-950/30 dark:to-neutral-900/90">
                <CardContent className="flex items-start gap-3 p-4">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-950/60"
                    aria-hidden
                  >
                    <Wallet className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700/90 dark:text-sky-400/90">
                      Total Yango Pro
                    </p>
                    <p className="mt-1 text-xl font-bold tabular-nums leading-tight tracking-tight text-sky-800 dark:text-sky-200 sm:text-2xl">
                      {payload
                        ? new Intl.NumberFormat('es-PE', {
                            style: 'currency',
                            currency: 'PEN',
                            minimumFractionDigits: 2,
                          }).format(totalYangoDisplay)
                        : '—'}
                    </p>
                    <p className="mt-1.5 text-[10px] leading-tight text-sky-700/70 dark:text-sky-500/90">
                      Suma de cada mes (como viajes)
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-neutral-200/90 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900/90">
                <CardContent className="flex items-start gap-3 p-4">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800/80"
                    aria-hidden
                  >
                    <Route className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      Promedio mensual
                    </p>
                    <p className="mt-1 text-2xl font-bold tabular-nums leading-tight tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-[1.65rem]">
                      {payload && monthsWithTrips > 0 ? new Intl.NumberFormat('es-PE').format(promedioViajesMensual) : '—'}
                    </p>
                    <p className="mt-1.5 text-[10px] leading-tight text-neutral-500 dark:text-neutral-500">
                      Viajes por mes activo
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {payload && chartData.length > 0 && (
              <Card className="mt-6 border border-neutral-200/90 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900/90">
                <CardHeader>
                  <CardTitle className="text-base">Evolución mensual</CardTitle>
                  <CardDescription>
                    Barras rojas = viajes completados · Barras azules = Yango Pro (S/). La línea punteada es el promedio
                    de viajes en los meses con actividad.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pl-0 sm:pl-2">
                  <div className="h-[min(28rem,55vh)] min-h-[380px] w-full min-w-0 sm:h-[440px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 16, right: 24, left: 8, bottom: 12 }}
                        barGap={2}
                        barCategoryGap="18%"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: COLORS.tick }}
                          axisLine={{ stroke: COLORS.grid }}
                          tickLine={false}
                        />
                        <YAxis
                          yAxisId="viajes"
                          orientation="left"
                          allowDecimals={false}
                          tick={{ fontSize: 11, fill: COLORS.tick }}
                          label={{
                            value: 'Viajes',
                            angle: -90,
                            position: 'insideLeft',
                            style: { fill: COLORS.viajes, fontSize: 11 },
                          }}
                          stroke={COLORS.viajes}
                        />
                        <YAxis
                          yAxisId="yango"
                          orientation="right"
                          tick={{ fontSize: 10, fill: COLORS.tick }}
                          label={{
                            value: 'S/ Yango Pro',
                            angle: 90,
                            position: 'insideRight',
                            style: { fill: COLORS.yango, fontSize: 11 },
                          }}
                          stroke={COLORS.yango}
                        />
                        <Tooltip
                          formatter={(value: unknown, name: unknown) => {
                            const n = toNumber(value)
                            const key = String(name)
                            if (key.includes('Yango') || key.includes('yango')) {
                              return [
                                new Intl.NumberFormat('es-PE', {
                                  style: 'currency',
                                  currency: 'PEN',
                                  minimumFractionDigits: 2,
                                }).format(n),
                                'Yango Pro',
                              ]
                            }
                            return [n, 'Viajes']
                          }}
                          contentStyle={{
                            borderRadius: '8px',
                            border: `1px solid ${COLORS.grid}`,
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          wrapperStyle={{ paddingTop: 16 }}
                          formatter={(value) => <span style={{ color: COLORS.tick, fontSize: 12 }}>{value}</span>}
                        />
                        {monthsWithTrips > 0 && promedioViajesMensual > 0 && (
                          <ReferenceLine
                            yAxisId="viajes"
                            y={promedioViajesMensual}
                            stroke={COLORS.viajes}
                            strokeDasharray="5 5"
                            strokeOpacity={0.85}
                            label={{
                              value: `Prom: ${promedioViajesMensual}`,
                              position: 'insideTopRight',
                              fill: COLORS.viajes,
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          />
                        )}
                        <Bar
                          yAxisId="viajes"
                          dataKey="viajes"
                          name="Viajes"
                          fill={COLORS.viajes}
                          radius={[4, 4, 0, 0]}
                          maxBarSize={36}
                        />
                        <Bar
                          yAxisId="yango"
                          dataKey="yangoPro"
                          name="Yango Pro (S/)"
                          fill={COLORS.yangoBar}
                          radius={[4, 4, 0, 0]}
                          maxBarSize={36}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default ViajesMesVisitanteTab
