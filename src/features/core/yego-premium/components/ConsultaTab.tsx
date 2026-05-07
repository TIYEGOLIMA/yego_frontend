import React, { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../../components/ui/card'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs'
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  IdCard,
  Search,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Wallet,
} from 'lucide-react'
import {
  yegoPremiumService,
  type DriverSnapshot,
  type DriverSummaryResponse,
  type DriverSummaryBlock,
  type DriverSummaryGoal,
  type FlotaPartnerOption,
} from '../../../../services'
import ViajesMesTab from './ViajesMesTab'
import ViajesMesVisitanteTab from './ViajesMesVisitanteTab'

const NAME_LOOKUP_NOT_ALLOWED_MSG =
  'No se permite buscar por nombre. Usa DNI, licencia, teléfono o ID del conductor.'

function looksLikeNameOnlyQuery(text: string): boolean {
  const t = text.trim()
  if (t.length < 2) return false
  if (/\d/.test(t)) return false
  return /^[\p{L}\s'.-]+$/u.test(t)
}

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(value)
}

const chargeAmountClass = (value: number | null | undefined) => {
  if (value == null) return 'text-neutral-700 dark:text-neutral-300'
  return value < 0
    ? 'text-rose-600 dark:text-rose-400 font-semibold'
    : 'text-neutral-700 dark:text-neutral-300'
}

const formatGoalStepPercent = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—'
  const n = Number(value)
  if (Number.isNaN(n)) return '—'
  return `${new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)} %`
}

const parseMultiplierAccountedIncome = (goal: DriverSummaryGoal): number | null => {
  const raw = goal.multiplier_accounted_income
  if (raw == null) return null
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw))
  return Number.isNaN(n) ? null : n
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const formatBalanceAmount = (value: number | null | undefined, currency: string | null | undefined) => {
  if (value === null || value === undefined) return '—'
  const code =
    typeof currency === 'string' && currency.length === 3 ? currency.toUpperCase() : 'PEN'
  try {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    }).format(value)
  } catch {
    return String(value)
  }
}

const formatRating = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—'
  const n = Number(value)
  if (Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
}

function hasDriverFicha(d: DriverSnapshot | null | undefined): boolean {
  if (!d) return false
  return (
    d.full_name != null ||
    d.first_name != null ||
    d.last_name != null ||
    d.driver_id != null ||
    d.phone != null ||
    d.license_number != null ||
    d.balance != null ||
    d.balance_limit != null ||
    d.average_rating != null
  )
}

const DriverFichaCard: React.FC<{ driver: DriverSnapshot }> = ({ driver }) => {
  const displayName =
    driver.full_name?.trim() ||
    [driver.first_name, driver.last_name].filter(Boolean).join(' ').trim() ||
    null
  return (
    <Card className="w-full min-w-0 border-primary/20 bg-primary/[0.03] dark:bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <IdCard className="h-4 w-4 shrink-0 text-primary-500" />
          Conductor y saldo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {displayName && (
            <div className="rounded-lg border border-neutral-200 bg-white/50 p-3 dark:border-neutral-800 dark:bg-neutral-950/40 sm:col-span-2 lg:col-span-1">
              <p className="text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400">
                Nombre
              </p>
              <p className="mt-1 font-semibold text-neutral-900 dark:text-neutral-100">{displayName}</p>
            </div>
          )}
          <div className="rounded-lg border border-neutral-200 bg-white/50 p-3 dark:border-neutral-800 dark:bg-neutral-950/40">
            <p className="text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400">
              ID conductor
            </p>
            <p className="mt-1 break-all font-mono text-sm text-neutral-800 dark:text-neutral-200">
              {driver.driver_id ?? '—'}
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white/50 p-3 dark:border-neutral-800 dark:bg-neutral-950/40">
            <p className="text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400">
              Licencia
            </p>
            <p className="mt-1 font-mono text-sm text-neutral-800 dark:text-neutral-200">
              {driver.license_number ?? '—'}
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white/50 p-3 dark:border-neutral-800 dark:bg-neutral-950/40">
            <p className="text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400">
              Teléfono
            </p>
            <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">
              {driver.phone ?? '—'}
            </p>
          </div>
          <div className="rounded-lg border border-amber-200/80 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase text-amber-800 dark:text-amber-300">
              <Wallet className="h-3.5 w-3.5" />
              Saldo actual
            </p>
            <p className="mt-1 text-lg font-bold text-amber-900 dark:text-amber-100">
              {formatBalanceAmount(driver.balance, driver.currency)}
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white/50 p-3 dark:border-neutral-800 dark:bg-neutral-950/40">
            <p className="text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400">
              Límite de saldo
            </p>
            <p className="mt-1 text-lg font-semibold text-neutral-800 dark:text-neutral-200">
              {formatBalanceAmount(driver.balance_limit, driver.currency)}
            </p>
          </div>
          <div className="rounded-lg border border-violet-200/80 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-950/30">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase text-violet-700 dark:text-violet-300">
              <Star className="h-3.5 w-3.5" />
              Calificación
            </p>
            <p className="mt-1 text-lg font-bold text-violet-900 dark:text-violet-100">
              {formatRating(driver.average_rating)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const IncomeBlock: React.FC<{
  title: string
  icon: React.ReactNode
  block: DriverSummaryBlock | null | undefined
  visitorView?: boolean
}> = ({ title, icon, block, visitorView }) => {
  if (!block) return null

  const period = block.period
  const income = block.income_summary
  const trips = income?.count_completed
  const prodTotal = income?.total
  const ticketHistorico =
    visitorView &&
    prodTotal != null &&
    trips != null &&
    trips > 0 &&
    !Number.isNaN(Number(prodTotal))
      ? Number(prodTotal) / trips
      : null

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        {period && (
          <CardDescription>
            {formatDate(period.date_from)} — {formatDate(period.date_to)}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
            <p className="text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400">
              Viajes completados
            </p>
            <p className="mt-1 text-xl font-bold text-neutral-900 dark:text-neutral-100">
              {income?.count_completed ?? '—'}
            </p>
          </div>
          {visitorView && (
            <div className="rounded-lg border border-violet-200/80 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-950/30">
              <p className="text-[11px] font-medium uppercase text-violet-600 dark:text-violet-400">
                Ticket histórico
              </p>
              <p className="mt-1 text-lg font-semibold text-violet-800 dark:text-violet-200">
                {ticketHistorico != null ? formatCurrency(ticketHistorico) : '—'}
              </p>
              <p className="mt-1 text-[10px] leading-tight text-violet-600/80 dark:text-violet-500/90">
                Producción total ÷ viajes completados
              </p>
            </div>
          )}
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40 sm:col-span-2">
            <p className="text-[11px] font-medium uppercase text-slate-600 dark:text-slate-400">
              Total neto (Yango)
            </p>
            <p className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-200">
              {formatCurrency(income?.total)}
            </p>
            <p className="mt-1 text-[10px] leading-tight text-slate-500 dark:text-slate-500">
              Neto según balances de la API de ingresos de Yango.
            </p>
          </div>
          <div className="rounded-lg border border-sky-200/90 bg-sky-50/70 p-3 dark:border-sky-900/60 dark:bg-sky-950/35 sm:col-span-2">
            <p className="text-[11px] font-semibold uppercase text-sky-700 dark:text-sky-300">
              Price Yango Pro
            </p>
            <p className="mt-1 text-2xl font-bold text-sky-800 dark:text-sky-100">
              {formatCurrency(income?.price_yango_pro)}
            </p>
            <p className="mt-1 text-[10px] leading-tight text-sky-700/90 dark:text-sky-400/90">
              Efectivo + no efectivo + corporativo + propinas + compensación promoción + bonificación.
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
            <p className="text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400">
              Efectivo recaudado
            </p>
            <p className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(income?.cash_collected)}
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
            <p className="text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400">
              Pago no efectivo
            </p>
            <p className="mt-1 text-lg font-semibold text-blue-600 dark:text-blue-400">
              {formatCurrency(income?.non_cash_payment)}
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
            <p className="text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400">
              Corporativo
            </p>
            <p className="mt-1 text-lg font-semibold text-neutral-700 dark:text-neutral-300">
              {formatCurrency(income?.corporate)}
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
            <p className="text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400">
              Compensación promoción
            </p>
            <p className="mt-1 text-lg font-semibold text-amber-600 dark:text-amber-400">
              {formatCurrency(income?.promotion_compensation)}
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
            <p className="text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400">
              Bonificación (plataforma)
            </p>
            <p className="mt-1 text-lg font-semibold text-teal-600 dark:text-teal-400">
              {formatCurrency(income?.bonificacion)}
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
            <p className="text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400">
              Propinas
            </p>
            <p className="mt-1 text-lg font-semibold text-fuchsia-600 dark:text-fuchsia-400">
              {formatCurrency(income?.tips)}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2 border-t border-neutral-200 pt-4 dark:border-neutral-700">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            <TrendingDown className="h-3.5 w-3.5" aria-hidden />
            Cargos y comisiones (balances Yango)
          </p>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-500">
            Comisiones de servicio, impuestos y otros conceptos; suelen mostrarse como montos negativos.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-md border border-neutral-200/80 bg-white/40 p-2.5 dark:border-neutral-800 dark:bg-neutral-950/30">
              <p className="text-[10px] font-medium uppercase text-neutral-500">Comisión plataforma</p>
              <p className={`mt-0.5 text-sm ${chargeAmountClass(income?.platform_fees)}`}>
                {formatCurrency(income?.platform_fees)}
              </p>
            </div>
            <div className="rounded-md border border-neutral-200/80 bg-white/40 p-2.5 dark:border-neutral-800 dark:bg-neutral-950/30">
              <p className="text-[10px] font-medium uppercase text-neutral-500">Comisión empresa asociada</p>
              <p className={`mt-0.5 text-sm ${chargeAmountClass(income?.partner_fees)}`}>
                {formatCurrency(income?.partner_fees)}
              </p>
            </div>
            <div className="rounded-md border border-neutral-200/80 bg-white/40 p-2.5 dark:border-neutral-800 dark:bg-neutral-950/30">
              <p className="text-[10px] font-medium uppercase text-neutral-500">Combustible (plataforma)</p>
              <p className={`mt-0.5 text-sm ${chargeAmountClass(income?.platform_gas)}`}>
                {formatCurrency(income?.platform_gas)}
              </p>
            </div>
            <div className="rounded-md border border-neutral-200/80 bg-white/40 p-2.5 dark:border-neutral-800 dark:bg-neutral-950/30">
              <p className="text-[10px] font-medium uppercase text-neutral-500">Otros (plataforma)</p>
              <p className={`mt-0.5 text-sm ${chargeAmountClass(income?.platform_other)}`}>
                {formatCurrency(income?.platform_other)}
              </p>
            </div>
            <div className="rounded-md border border-neutral-200/80 bg-white/40 p-2.5 dark:border-neutral-800 dark:bg-neutral-950/30">
              <p className="text-[10px] font-medium uppercase text-neutral-500">Impuestos obligatorios</p>
              <p className={`mt-0.5 text-sm ${chargeAmountClass(income?.mandatory_taxes_fee)}`}>
                {formatCurrency(income?.mandatory_taxes_fee)}
              </p>
            </div>
            <div className="rounded-md border border-neutral-200/80 bg-white/40 p-2.5 dark:border-neutral-800 dark:bg-neutral-950/30">
              <p className="text-[10px] font-medium uppercase text-neutral-500">Marketing otros (plataforma)</p>
              <p className={`mt-0.5 text-sm ${chargeAmountClass(income?.platform_marketing_other)}`}>
                {formatCurrency(income?.platform_marketing_other)}
              </p>
            </div>
            <div className="rounded-md border border-neutral-200/80 bg-white/40 p-2.5 dark:border-neutral-800 dark:bg-neutral-950/30 sm:col-span-2">
              <p className="text-[10px] font-medium uppercase text-neutral-500">Otros (empresa asociada)</p>
              <p className={`mt-0.5 text-sm ${chargeAmountClass(income?.partner_contractor_other)}`}>
                {formatCurrency(income?.partner_contractor_other)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const GoalsSection: React.FC<{
  title: string
  goals: DriverSummaryGoal[] | null | undefined
  variant: 'active' | 'previous'
  visitorView?: boolean
}> = ({ title, goals, variant, visitorView }) => {
  if (!goals || goals.length === 0) return null

  const badgeClass =
    variant === 'active'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
      : 'bg-neutral-100 text-neutral-600 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700'

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4" />
          {title}
          <Badge variant="outline" className={badgeClass}>
            {goals.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-4">
          {goals.map((goal, goalIdx) => {
            const ingresoBonificacion = parseMultiplierAccountedIncome(goal)
            return (
              <div
                key={goalIdx}
                className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
              >
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  {goal.total_rides != null && (
                    <div className="flex items-center gap-1.5">
                      <Target className="h-4 w-4 text-primary-500" />
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Total viajes: <span className="font-bold">{goal.total_rides}</span>
                      </span>
                    </div>
                  )}
                  {ingresoBonificacion != null && (
                    <div className="flex min-w-0 max-w-full basis-full flex-col gap-0.5 sm:basis-auto sm:flex-row sm:items-center sm:gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          Ingresos en bonificación:{' '}
                          <span className="font-bold text-emerald-700 dark:text-emerald-300">
                            {formatCurrency(ingresoBonificacion)}
                          </span>
                        </span>
                      </div>
                      <span className="text-[11px] leading-snug text-neutral-500 dark:text-neutral-400 sm:pl-1">
                        Suma de ingresos de los viajes que cuentan para la meta.
                      </span>
                    </div>
                  )}
                  {goal.window?.start && goal.window?.end && (
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(goal.window.start)} — {formatDate(goal.window.end)}
                    </div>
                  )}
                </div>
                {goal.steps && goal.steps.length > 0 && (
                  <div className={visitorView ? 'w-full' : 'overflow-x-auto'}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-neutral-200 dark:border-neutral-700">
                          <th className="pb-2 pr-4 text-left font-medium text-neutral-500 dark:text-neutral-400">
                            Viajes
                          </th>
                          <th className="pb-2 pr-4 text-left font-medium text-neutral-500 dark:text-neutral-400">
                            Porcentaje
                          </th>
                          <th className="pb-2 text-left font-medium text-neutral-500 dark:text-neutral-400">
                            Bono máx.
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {goal.steps.map((step, stepIdx) => (
                          <tr
                            key={stepIdx}
                            className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                          >
                            <td className="py-2 pr-4 font-medium text-neutral-800 dark:text-neutral-200">
                              {step.nrides ?? '—'}
                            </td>
                            <td className="py-2 pr-4 text-neutral-700 dark:text-neutral-300">
                              {formatGoalStepPercent(step.amount)}
                            </td>
                            <td className="py-2 text-neutral-700 dark:text-neutral-300">
                              {formatCurrency(step.max_bonus)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

interface ConsultaTabProps {
  showProcessing?: boolean
  visitorView?: boolean
}

const ConsultaTab: React.FC<ConsultaTabProps> = ({ showProcessing = false, visitorView = false }) => {
  const [searchText, setSearchText] = useState('')
  const [selectedParkId, setSelectedParkId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DriverSummaryResponse | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [fleetOptions, setFleetOptions] = useState<FlotaPartnerOption[]>([])
  const [fleetLoading, setFleetLoading] = useState(true)
  const [lastSearchText, setLastSearchText] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setFleetLoading(true)
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
        console.error('[ConsultaTab] Error al cargar flotas:', err)
      })
      .finally(() => setFleetLoading(false))
    return () => controller.abort()
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmed = searchText.trim()
    if (!trimmed || !selectedParkId) return

    if (looksLikeNameOnlyQuery(trimmed)) {
      setError(NAME_LOOKUP_NOT_ALLOWED_MSG)
      return
    }

    try {
      setLoading(true)
      setError(null)
      setResult(null)

      const data = await yegoPremiumService.fetchDriverSummary({
        text: trimmed,
        park_id: selectedParkId,
      })
      setResult(data)
      setLastSearchText(trimmed)
      setHasSearched(true)
    } catch (err: any) {
      console.error('[ConsultaTab] Error en búsqueda:', err)
      const status = err?.response?.status
      if (status === 404) {
        setError('No se encontró información para el conductor indicado.')
      } else if (status === 400) {
        const msg = err?.response?.data?.message
        setError(
          typeof msg === 'string' && msg.trim()
            ? msg
            : 'Los datos ingresados no son válidos. Verifica e intenta de nuevo.',
        )
      } else {
        setError('Ocurrió un error al consultar. Intenta nuevamente.')
      }
      setHasSearched(true)
    } finally {
      setLoading(false)
    }
  }

  const handleNewSearch = () => {
    setResult(null)
    setHasSearched(false)
    setError(null)
    setSearchText('')
    setSelectedParkId('')
    setLastSearchText('')
  }

  if (hasSearched && !loading) {
    const driverFilter = result?.resolved_contractor_id || lastSearchText

    return (
      <div className={`w-full min-w-0 space-y-5 ${visitorView ? 'overflow-visible' : ''}`}>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-10"
            onClick={handleNewSearch}
            leftIcon={<ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />}
          >
            Nueva búsqueda
          </Button>
        </div>

        {error && (
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
            <CardContent className="flex items-center gap-3 p-4">
              <Search className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-amber-700 dark:text-amber-300">{error}</p>
            </CardContent>
          </Card>
        )}

        {result && (
          <Tabs defaultValue="resumen" className="w-full max-w-none overflow-visible">
            <TabsList className="flex h-11 w-full items-stretch gap-1 sm:h-10">
              <TabsTrigger value="resumen" className="min-w-0 flex-1 gap-2">
                <Search className="h-4 w-4 shrink-0" />
                Resumen
              </TabsTrigger>
              <TabsTrigger value="viajes" className="min-w-0 flex-1 gap-2">
                <TrendingUp className="h-4 w-4 shrink-0" />
                Viajes del año
              </TabsTrigger>
            </TabsList>

            <TabsContent value="resumen" className={`space-y-6 ${visitorView ? 'overflow-visible' : ''}`}>
              {result.driver && hasDriverFicha(result.driver) && (
                <DriverFichaCard driver={result.driver} />
              )}
              {/* Fila 1: resumen semanal + mensual */}
              <div className="grid w-full min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 items-stretch">
                <IncomeBlock
                  title="Resumen semanal"
                  icon={<TrendingUp className="h-4 w-4 text-blue-500" />}
                  block={result.weekly}
                  visitorView={visitorView}
                />
                <IncomeBlock
                  title="Resumen mensual"
                  icon={<DollarSign className="h-4 w-4 text-emerald-500" />}
                  block={result.monthly}
                  visitorView={visitorView}
                />
              </div>
              {/* Fila 2: metas activas + metas anteriores */}
              <div className="grid w-full min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 items-stretch">
                <GoalsSection
                  title="Metas activas"
                  goals={result.active_goals}
                  variant="active"
                  visitorView={visitorView}
                />
                <GoalsSection
                  title="Metas anteriores"
                  goals={result.previous_goals}
                  variant="previous"
                  visitorView={visitorView}
                />
              </div>

              {!result.weekly && !result.monthly && (!result.active_goals || result.active_goals.length === 0) && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
                    <Search className="h-10 w-10 text-neutral-300 dark:text-neutral-600" />
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      No se encontraron datos de resumen para este conductor.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="viajes" className={visitorView ? 'overflow-visible' : undefined}>
              {visitorView ? (
                <ViajesMesVisitanteTab driverId={driverFilter} />
              ) : (
                <ViajesMesTab
                  showProcessing={showProcessing}
                  driverFilter={driverFilter}
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    )
  }

  return (
    <div
      className={
        visitorView
          ? 'flex min-h-[calc(100dvh-12rem)] w-full flex-col items-center justify-center px-2 py-4 sm:px-4'
          : 'flex w-full items-start justify-center pt-8'
      }
    >
      <Card className="w-full max-w-2xl border border-neutral-200/90 shadow-sm dark:border-neutral-800">
        <CardHeader className="text-center">
          <CardTitle className="mx-auto flex items-center justify-center gap-2 text-base">
            <Search className="h-5 w-5 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
            Consultar conductor
          </CardTitle>
          <CardDescription>
            Busca por DNI, licencia, teléfono o ID del conductor. No se permite buscar por nombre.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="searchText" className="text-sm font-medium">
                Identificador del conductor
              </Label>
              <Input
                id="searchText"
                placeholder="DNI, licencia, teléfono o ID de conductor"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="h-10"
                autoFocus
              />
              {searchText.trim() && looksLikeNameOnlyQuery(searchText) ? (
                <p className="text-sm text-amber-600 dark:text-amber-400">{NAME_LOOKUP_NOT_ALLOWED_MSG}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="parkId" className="text-sm font-medium">
                Flota (Park ID)
              </Label>
              <Select value={selectedParkId} onValueChange={setSelectedParkId}>
                <SelectTrigger id="parkId">
                  <SelectValue placeholder={fleetLoading ? 'Cargando flotas...' : 'Selecciona una flota'} />
                </SelectTrigger>
                <SelectContent className="max-h-[min(24rem,70vh)]">
                  {fleetOptions.map((flota) => (
                    <SelectItem key={flota.id} value={flota.id}>
                      {flota.city ? `${flota.name} — ${flota.city}` : flota.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && !hasSearched && (
              <p className="text-sm text-error-600">{error}</p>
            )}

            <Button
              type="submit"
              className="h-10 w-full"
              loading={loading}
              disabled={
                loading ||
                !searchText.trim() ||
                !selectedParkId ||
                looksLikeNameOnlyQuery(searchText)
              }
              leftIcon={<Search className="h-4 w-4 shrink-0" aria-hidden />}
            >
              {loading ? 'Consultando...' : 'Buscar conductor'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default ConsultaTab
