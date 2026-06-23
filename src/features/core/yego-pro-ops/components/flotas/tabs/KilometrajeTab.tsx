import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaService } from '../service'
import type { VehicleMileage } from '../types'
import { Button } from '@/components/ui/button'
import { Gauge, Plus, TrendingUp } from 'lucide-react'

interface Props { vehicleId: string; mileage: VehicleMileage[]; kmActual: number }

export default function KilometrajeTab({ vehicleId, mileage, kmActual }: Props) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ fecha: new Date().toISOString().split('T')[0], kilometraje: kmActual })

  const crearMutation = useMutation({
    mutationFn: () => flotaService.agregarKilometraje(vehicleId, form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] }); setShowForm(false); setForm({ fecha: new Date().toISOString().split('T')[0], kilometraje: kmActual }) },
  })

  const totalKm = mileage.length > 0 ? mileage[mileage.length - 1].kilometraje - mileage[0].kilometraje : 0
  const promedio = mileage.length > 1 ? totalKm / (mileage.length - 1) : 0

  const chartData = mileage.slice(-12)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Kilometraje</h3>
        <Button onClick={() => setShowForm(!showForm)} size="sm" className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"><Plus className="w-3 h-3 mr-1" /> Registrar lectura</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-4 text-center">
          <Gauge className="w-5 h-5 text-gray-400 mx-auto mb-1" />
          <p className="text-xs text-gray-400 uppercase">Actual</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{new Intl.NumberFormat('es-PE').format(kmActual)} km</p>
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-4 text-center">
          <TrendingUp className="w-5 h-5 text-gray-400 mx-auto mb-1" />
          <p className="text-xs text-gray-400 uppercase">Recorrido</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{new Intl.NumberFormat('es-PE').format(totalKm)} km</p>
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-4 text-center">
          <p className="text-xs text-gray-400 uppercase">Promedio/registro</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{new Intl.NumberFormat('es-PE').format(Math.round(promedio))} km</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[10px] font-medium text-gray-500 uppercase">Fecha</label><input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} className="w-full text-sm border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 mt-1 bg-white dark:bg-neutral-800" /></div>
            <div><label className="text-[10px] font-medium text-gray-500 uppercase">Kilometraje</label><input type="number" value={form.kilometraje} onChange={e => setForm(f => ({ ...f, kilometraje: parseFloat(e.target.value) || 0 }))} className="w-full text-sm border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 mt-1 bg-white dark:bg-neutral-800" /></div>
          </div>
          <div className="flex gap-3 justify-end mt-3">
            <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl text-xs">Cancelar</Button>
            <Button onClick={() => crearMutation.mutate()} disabled={crearMutation.isPending} className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs">Guardar</Button>
          </div>
        </div>
      )}

      {/* Gráfico simple de barras */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-5">
          <h4 className="text-xs font-bold text-gray-400 uppercase mb-4">Tendencia de kilometraje</h4>
          <div className="flex items-end gap-1 h-40">
            {chartData.map((m, i) => {
              const maxKm = Math.max(...chartData.map(x => x.kilometraje))
              const minKm = Math.min(...chartData.map(x => x.kilometraje))
              const range = maxKm - minKm || 1
              const height = ((m.kilometraje - minKm) / range) * 100 + 10
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-red-500 rounded-t" style={{ height: `${height}%` }} />
                  <span className="text-[8px] text-gray-400">{m.fecha?.substring(5)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-5">
        <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Historial</h4>
        <div className="space-y-2">
          {mileage.slice().reverse().map(m => (
            <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-neutral-800 last:border-0">
              <span className="text-xs text-gray-400">{m.fecha}</span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{new Intl.NumberFormat('es-PE').format(m.kilometraje)} km</span>
            </div>
          ))}
          {mileage.length === 0 && <p className="text-center text-gray-400 text-sm py-4">Sin registros de kilometraje</p>}
        </div>
      </div>
    </div>
  )
}
