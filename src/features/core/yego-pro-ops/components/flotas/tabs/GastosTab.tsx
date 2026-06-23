import type { VehicleMaintenance, VehicleIncident } from '../types'
import { DollarSign, TrendingUp } from 'lucide-react'

interface Props { maintenance: VehicleMaintenance[]; incidents: VehicleIncident[] }

export default function GastosTab({ maintenance, incidents }: Props) {
  const gastoPreventivo = maintenance.filter(m => m.tipo === 'preventivo').reduce((s, m) => s + (m.costo || 0), 0)
  const gastoCorrectivo = maintenance.filter(m => m.tipo === 'correctivo').reduce((s, m) => s + (m.costo || 0), 0)
  const gastoSiniestros = incidents.reduce((s, i) => s + (i.montoDano || 0), 0)
  const gastoTotal = gastoPreventivo + gastoCorrectivo + gastoSiniestros

  const porPreventivo = gastoTotal > 0 ? (gastoPreventivo / gastoTotal) * 100 : 0
  const porCorrectivo = gastoTotal > 0 ? (gastoCorrectivo / gastoTotal) * 100 : 0
  const porSiniestros = gastoTotal > 0 ? (gastoSiniestros / gastoTotal) * 100 : 0

  const gastosPorMes: Record<string, number> = {}
  maintenance.forEach(m => {
    const mes = m.fecha?.substring(0, 7)
    if (mes) gastosPorMes[mes] = (gastosPorMes[mes] || 0) + (m.costo || 0)
  })
  const meses = Object.keys(gastosPorMes).sort().slice(-6)

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Dashboard de gastos</h3>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-4 text-center">
          <p className="text-xs text-gray-400 uppercase mb-1">Total acumulado</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">S/ {new Intl.NumberFormat('es-PE').format(gastoTotal)}</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-4 text-center">
          <p className="text-xs text-emerald-600 uppercase mb-1">Preventivo</p>
          <p className="text-2xl font-bold text-emerald-700">S/ {new Intl.NumberFormat('es-PE').format(gastoPreventivo)}</p>
          <p className="text-[10px] text-emerald-500 mt-1">{porPreventivo.toFixed(0)}%</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-4 text-center">
          <p className="text-xs text-amber-600 uppercase mb-1">Correctivo</p>
          <p className="text-2xl font-bold text-amber-700">S/ {new Intl.NumberFormat('es-PE').format(gastoCorrectivo)}</p>
          <p className="text-[10px] text-amber-500 mt-1">{porCorrectivo.toFixed(0)}%</p>
        </div>
        <div className="bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-800 p-4 text-center">
          <p className="text-xs text-red-600 uppercase mb-1">Siniestros</p>
          <p className="text-2xl font-bold text-red-700">S/ {new Intl.NumberFormat('es-PE').format(gastoSiniestros)}</p>
          <p className="text-[10px] text-red-500 mt-1">{porSiniestros.toFixed(0)}%</p>
        </div>
      </div>

      {/* Barra de proporción */}
      {gastoTotal > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-5">
          <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Distribución de gastos</h4>
          <div className="flex rounded-full overflow-hidden h-6">
            {porPreventivo > 0 && <div className="bg-emerald-500 transition-all" style={{ width: `${porPreventivo}%` }} />}
            {porCorrectivo > 0 && <div className="bg-amber-500 transition-all" style={{ width: `${porCorrectivo}%` }} />}
            {porSiniestros > 0 && <div className="bg-red-500 transition-all" style={{ width: `${porSiniestros}%` }} />}
          </div>
          <div className="flex gap-4 mt-2">
            <span className="text-[10px] text-gray-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Preventivo</span>
            <span className="text-[10px] text-gray-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Correctivo</span>
            <span className="text-[10px] text-gray-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Siniestros</span>
          </div>
        </div>
      )}

      {/* Tendencia mensual */}
      {meses.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-5">
          <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Tendencia mensual</h4>
          <div className="flex items-end gap-2 h-32">
            {meses.map(mes => {
              const maxVal = Math.max(...meses.map(m => gastosPorMes[m]))
              const height = maxVal > 0 ? (gastosPorMes[mes] / maxVal) * 100 : 0
              return (
                <div key={mes} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[8px] text-gray-400">S/ {gastosPorMes[mes].toFixed(0)}</span>
                  <div className="w-full bg-red-500 rounded-t" style={{ height: `${height}%` }} />
                  <span className="text-[8px] text-gray-400">{mes.substring(5)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {gastoTotal === 0 && <p className="text-center text-gray-400 text-sm py-8">Sin gastos registrados</p>}
    </div>
  )
}
