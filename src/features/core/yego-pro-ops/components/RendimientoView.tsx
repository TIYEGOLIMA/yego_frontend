import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { yegoProOpsService, type RendimientoResponse } from '../../../../services/yego-pro-ops-service'
import { Button } from '../../../../components/ui/button'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../../../utils/cn'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, LabelList, Legend
} from 'recharts'
import { motion } from 'framer-motion'

function fmtCur(v: number): string {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(v).replace('PEN', 'S/')
}
function fmtNum(v: number): string {
  return new Intl.NumberFormat('es-PE').format(v)
}

const COLORS = ['#059669', '#0d9488', '#0284c7', '#7c3aed', '#db2777', '#ea580c', '#ca8a04', '#4f46e5']
const CHART_AXIS = '#9ca3af'
const CHART_GRID = '#e5e7eb'
const CHART_TOOLTIP_BG = '#ffffff'
const CHART_TOOLTIP_BORDER = '#e5e7eb'

function getWeekRange(offset: number) {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

function getCurrentMonth() {
  return { mes: new Date().getMonth() + 1, anio: new Date().getFullYear() }
}

function AnimatedNumber({ value, prefix = '' }: { value: number; prefix?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {prefix}{fmtNum(value)}
    </motion.span>
  )
}

function KpiCard({ label, value, subtitle, prefix = '', highlight, loading }: {
  label: string; value: number; subtitle?: string; prefix?: string; highlight?: boolean; loading?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={cn(
        'rounded-2xl p-5 border',
        highlight
          ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
          : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10'
      )}
    >
      <p className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase mb-2">{label}</p>
      <p className={cn('text-3xl font-bold tabular-nums', highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white', loading && 'animate-pulse')}>
        <AnimatedNumber value={value} prefix={prefix} />
      </p>
      {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>}
    </motion.div>
  )
}

function ChartCard({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5"
    >
      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4 uppercase tracking-wider">{title}</h3>
      {children}
    </motion.div>
  )
}

export function RendimientoView() {
  const [periodo, setPeriodo] = useState<'semanal' | 'mensual'>('semanal')
  const [weekOffset, setWeekOffset] = useState(0)
  const [mes, setMes] = useState(getCurrentMonth().mes)
  const [anio, setAnio] = useState(getCurrentMonth().anio)
  const [exporting, setExporting] = useState(false)

  const weekStart = useMemo(() => getWeekRange(weekOffset), [weekOffset])

  const weekLabel = useMemo(() => {
    const d = new Date(weekStart + 'T00:00:00')
    const monday = d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
    const sunday = new Date(d.getTime() + 6 * 86400000).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
    return { label: `${monday} → ${sunday}` }
  }, [weekStart])

  const mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  const { data, isLoading, isFetching } = useQuery<RendimientoResponse>({
    queryKey: ['pro-ops', 'rendimiento', periodo, weekStart, mes, anio],
    queryFn: () => yegoProOpsService.getRendimiento(periodo, periodo === 'semanal' ? weekStart : undefined, periodo === 'mensual' ? mes : undefined, periodo === 'mensual' ? anio : undefined),
    staleTime: 0,
    placeholderData: (prev) => prev,
  })

  const nombreCorto = (c: { nombre?: string; driverId: string }) => {
    const n = c.nombre || c.driverId
    return n.length > 18 ? n.substring(0, 18) + '...' : n
  }

  const topViajes = useMemo(() => {
    const minimo = data?.totales?.minimoViajes ?? 0
    return [...(data?.conductores ?? [])]
      .filter(c => c.totalViajes >= minimo)
      .sort((a, b) => b.totalViajes - a.totalViajes)
      .slice(0, 5)
      .map((c, i) => ({ ...c, rank: i + 1 }))
  }, [data])
  const topProducido = useMemo(() => [...(data?.conductores ?? [])].sort((a, b) => b.totalProducido - a.totalProducido).slice(0, 5).map((c, i) => ({ ...c, rank: i + 1 })), [data])
  const topEficiencia = useMemo(() => [...(data?.conductores ?? [])].sort((a, b) => b.viajesPorHora - a.viajesPorHora).slice(0, 5).map((c, i) => ({ ...c, rank: i + 1 })), [data])
  const topRentabilidad = useMemo(() => [...(data?.conductores ?? [])].sort((a, b) => (b.totalGnvSoles + b.totalGasolinaSoles + b.totalOtrosGastos + b.totalEfectivo + b.totalYape) - (a.totalGnvSoles + a.totalGasolinaSoles + a.totalOtrosGastos + a.totalEfectivo + a.totalYape)).slice(0, 5).map((c, i) => ({ ...c, rank: i + 1, gananciaNeta: c.totalGnvSoles + c.totalGasolinaSoles + c.totalOtrosGastos + c.totalEfectivo + c.totalYape })), [data])
  const bottomConsumo = useMemo(() => [...(data?.conductores ?? [])].filter(c => (c.totalGnvSoles + c.totalGasolinaSoles) > 0).sort((a, b) => (a.totalGnvSoles + a.totalGasolinaSoles) - (b.totalGnvSoles + b.totalGasolinaSoles)).slice(0, 5).map((c, i) => ({ ...c, rank: i + 1, consumoTotal: c.totalGnvSoles + c.totalGasolinaSoles })), [data])
  const bottomViajes = useMemo(() => {
    const minimo = data?.totales?.minimoViajes ?? 0
    return [...(data?.conductores ?? [])]
      .filter(c => c.totalViajes > 0 && c.totalViajes < minimo)
      .sort((a, b) => a.totalViajes - b.totalViajes)
      .slice(0, 5)
      .map((c, i) => ({ ...c, rank: i + 1 }))
  }, [data])

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      const el = document.getElementById('rendimiento-content')
      if (!el) return
      const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('landscape', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const imgProps = pdf.getImageProperties(imgData)
      const pdfHeight = (imgProps.height * pageWidth) / imgProps.width
      let heightLeft = pdfHeight
      let position = 0
      pdf.addImage(imgData, 'PNG', 0, position, pageWidth, pdfHeight)
      heightLeft -= pdf.internal.pageSize.getHeight()
      while (heightLeft > 0) {
        position = position - pdf.internal.pageSize.getHeight()
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, pageWidth, pdfHeight)
        heightLeft -= pdf.internal.pageSize.getHeight()
      }
      pdf.save(`rendimiento-${periodo}-${data?.desde ?? ''}.pdf`)
    } catch (e) {
      console.error('Error exportando PDF:', e)
    }
    setExporting(false)
  }

  const tooltipStyle = { background: CHART_TOOLTIP_BG, border: `1px solid ${CHART_TOOLTIP_BORDER}`, borderRadius: '8px', color: '#111827' }

  if (isLoading && !data) {
    return (
      <div className="h-[calc(100vh-180px)] flex items-center justify-center">
        <div className="w-10 h-10 border-[3px] border-gray-200 dark:border-white/20 border-t-emerald-600 dark:border-t-emerald-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) return null

  console.log('[Rendimiento] data:', JSON.stringify({ nConductores: data.conductores?.length, viajesTotales: data.totales?.viajes, producido: data.totales?.montoTotalProducido }))

  return (
    <div className="h-[calc(100vh-180px)] overflow-y-auto">
      <div id="rendimiento-content" className={cn('p-6 transition-opacity duration-500', isFetching && 'opacity-60')}>
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Rendimiento</h1>
            {periodo === 'semanal' ? (
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setWeekOffset(w => w - 1)} className="h-7 w-7 p-0 rounded-lg">
                  <ChevronDown className="w-4 h-4 rotate-90" />
                </Button>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{weekLabel.label}{isFetching && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse align-middle" />}</span>
                <Button size="sm" variant="ghost" onClick={() => setWeekOffset(w => w + 1)} className="h-7 w-7 p-0 rounded-lg">
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setWeekOffset(0)} className="h-7 text-xs text-gray-400 rounded-lg">Hoy</Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{mesesNombres[mes - 1]} {anio}{isFetching && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse align-middle" />}</span>
                <select value={mes} onChange={e => setMes(Number(e.target.value))} className="text-xs border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1.5 bg-white dark:bg-white/10 text-gray-900 dark:text-white">
                  {mesesNombres.map((m, i) => (<option key={i} value={i + 1}>{m}</option>))}
                </select>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 p-0.5">
              <button onClick={() => setPeriodo('semanal')} className={cn('px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors', periodo === 'semanal' ? 'bg-red-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white')}>Semanal</button>
              <button onClick={() => setPeriodo('mensual')} className={cn('px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors', periodo === 'mensual' ? 'bg-red-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white')}>Mensual</button>
            </div>
            <Button onClick={handleExportPDF} disabled={exporting} className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-4 py-2">
              {exporting ? 'Exportando...' : 'Descargar PDF'}
            </Button>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <KpiCard label="Conductores" value={data?.totales?.conductores ?? 0} loading={isFetching} />
          <KpiCard label="Viajes" value={data?.totales?.viajes ?? 0} loading={isFetching} />
          <KpiCard label="Producido Bruto" value={data?.totales?.montoTotalProducido ?? 0} prefix="S/ " highlight loading={isFetching} />
          <KpiCard label="Viajes/Hora" value={data?.totales?.viajesPorHora ?? 0} subtitle="Eficiencia global" loading={isFetching} />
          <KpiCard label="KM Totales" value={data?.totales?.km ?? 0} loading={isFetching} />
        </div>

        {(!data?.conductores || data.conductores.length === 0) && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-16 text-sm">Sin datos de conductores para este periodo</p>
        )}

        {data?.conductores && data.conductores.length > 0 && (<>

        {/* TOP 5 + BOTTOM 5 */}
        <div className="grid grid-cols-3 gap-5 mb-5">
          <ChartCard title={`Mejores en Viajes (+${data?.totales?.minimoViajes ?? '?'})`} delay={0.1}>
            {topViajes.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-16 text-sm">Ningun conductor alcanza el minimo</p>
            ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topViajes} layout="vertical" margin={{ left: 10, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis type="number" stroke={CHART_AXIS} tick={{ fontSize: 10 }} />
                <YAxis dataKey="nombre" type="category" stroke={CHART_AXIS} tick={{ fontSize: 10 }} width={85} tickFormatter={(_, i) => `#${topViajes[i]?.rank} ${nombreCorto(topViajes[i])}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [fmtNum(value), 'Viajes']} />
                <Bar dataKey="totalViajes" radius={[0, 4, 4, 0]} animationDuration={1200}>
                  {topViajes.map((_, i) => (<Cell key={i} fill={COLORS[i]} />))}
                  <LabelList dataKey="totalViajes" position="right" formatter={(v: number) => `${v} viajes`} style={{ fill: CHART_AXIS, fontSize: 10 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Mayor Facturacion" delay={0.15}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topProducido} layout="vertical" margin={{ left: 10, right: 55 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis type="number" stroke={CHART_AXIS} tick={{ fontSize: 10 }} />
                <YAxis dataKey="nombre" type="category" stroke={CHART_AXIS} tick={{ fontSize: 10 }} width={85} tickFormatter={(_, i) => `#${topProducido[i]?.rank} ${nombreCorto(topProducido[i])}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => fmtCur(value)} />                <Bar dataKey="totalProducido" radius={[0, 4, 4, 0]} animationDuration={1200}>
                  {topProducido.map((_, i) => (<Cell key={i} fill={COLORS[i]} />))}
                  <LabelList dataKey="totalProducido" position="right" formatter={(v: number) => fmtCur(v)} style={{ fill: CHART_AXIS, fontSize: 10 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Mas Eficientes (viajes/hora)" delay={0.2}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topEficiencia} layout="vertical" margin={{ left: 10, right: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis type="number" stroke={CHART_AXIS} tick={{ fontSize: 10 }} />
                <YAxis dataKey="nombre" type="category" stroke={CHART_AXIS} tick={{ fontSize: 10 }} width={85} tickFormatter={(_, i) => `#${topEficiencia[i]?.rank} ${nombreCorto(topEficiencia[i])}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [value.toFixed(1), 'v/h']} />
                <Bar dataKey="viajesPorHora" radius={[0, 4, 4, 0]} animationDuration={1200}>
                  {topEficiencia.map((_, i) => (<Cell key={i} fill={COLORS[i]} />))}
                  <LabelList dataKey="viajesPorHora" position="right" formatter={(v: number) => v.toFixed(1) + ' v/h'} style={{ fill: CHART_AXIS, fontSize: 10 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="grid grid-cols-3 gap-5 mb-5">
          <ChartCard title="Mayor Gasto Total" delay={0.1}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topRentabilidad} layout="vertical" margin={{ left: 10, right: 55 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis type="number" stroke={CHART_AXIS} tick={{ fontSize: 10 }} />
                <YAxis dataKey="nombre" type="category" stroke={CHART_AXIS} tick={{ fontSize: 10 }} width={85} tickFormatter={(_, i) => `#${topRentabilidad[i]?.rank} ${nombreCorto(topRentabilidad[i])}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => fmtCur(value)} />
                <Bar dataKey="gananciaNeta" radius={[0, 4, 4, 0]} animationDuration={1200}>
                  {topRentabilidad.map((_, i) => {
                    const v = topRentabilidad[i]?.gananciaNeta ?? 0
                    return <Cell key={i} fill={v >= 0 ? '#059669' : '#dc2626'} />
                  })}
                  <LabelList dataKey="gananciaNeta" position="right" formatter={(v: number) => fmtCur(v)} style={{ fill: CHART_AXIS, fontSize: 10 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Menor Consumo Combustible" delay={0.15}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={bottomConsumo} layout="vertical" margin={{ left: 10, right: 55 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis type="number" stroke={CHART_AXIS} tick={{ fontSize: 10 }} />
                <YAxis dataKey="nombre" type="category" stroke={CHART_AXIS} tick={{ fontSize: 10 }} width={85} tickFormatter={(_, i) => `#${bottomConsumo[i]?.rank} ${nombreCorto(bottomConsumo[i])}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => fmtCur(value)} />
                <Bar dataKey="totalGnvSoles" fill="#ea580c" radius={[4, 4, 0, 0]} animationDuration={1000} />
                <Bar dataKey="totalGasolinaSoles" fill="#3b82f6" radius={[4, 4, 0, 0]} animationDuration={1000} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={`No Cumplen Viajes Minimos (min: ${data?.totales?.minimoViajes ?? '?'})`} delay={0.2}>
            {bottomViajes.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-16 text-sm">Todos cumplen el minimo requerido</p>
            ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={bottomViajes} layout="vertical" margin={{ left: 10, right: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis type="number" stroke={CHART_AXIS} tick={{ fontSize: 10 }} />
                <YAxis dataKey="nombre" type="category" stroke={CHART_AXIS} tick={{ fontSize: 10 }} width={85} tickFormatter={(_, i) => `#${bottomViajes[i]?.rank} ${nombreCorto(bottomViajes[i])}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [fmtNum(value), 'Viajes']} />
                <Bar dataKey="totalViajes" radius={[0, 4, 4, 0]} animationDuration={1200}>
                  {bottomViajes.map((_, i) => (<Cell key={i} fill="#dc2626" />))}
                  <LabelList dataKey="totalViajes" position="right" formatter={(v: number) => `${v} viajes`} style={{ fill: CHART_AXIS, fontSize: 10 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
        </> )}
      </div>
    </div>
  )
}
