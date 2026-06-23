import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaService } from '../service'
import type { VehicleIncident } from '../types'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import { AlertTriangle, Plus, Trash2 } from 'lucide-react'

const TIPOS_SINIESTRO = ['Accidente', 'Robo', 'Vandalismo', 'Daño propio', 'Inundación', 'Otro']
const ESTADOS = ['reportado', 'en_proceso', 'resuelto']
const ESTADO_STYLES: Record<string, string> = { reportado: 'bg-red-100 text-red-600', en_proceso: 'bg-amber-100 text-amber-600', resuelto: 'bg-emerald-100 text-emerald-600' }

interface Props { vehicleId: string; incidents: VehicleIncident[] }

export default function SiniestrosTab({ vehicleId, incidents }: Props) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Partial<VehicleIncident>>({ fecha: new Date().toISOString().split('T')[0], tipo: 'Accidente', descripcion: '', conductor: '', montoDano: 0, estado: 'reportado' })

  const crearMutation = useMutation({
    mutationFn: () => flotaService.agregarSiniestro(vehicleId, form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] }); setShowForm(false); setForm({ fecha: new Date().toISOString().split('T')[0], tipo: 'Accidente', descripcion: '', conductor: '', montoDano: 0, estado: 'reportado' }) },
  })

  const eliminarMutation = useMutation({
    mutationFn: (incId: number) => flotaService.eliminarSiniestro(vehicleId, incId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] }),
  })

  const totalDano = incidents.reduce((s, i) => s + (i.montoDano || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Siniestros</h3>
          <span className="text-xs text-gray-400">Daño total: <span className="font-bold text-red-600">S/ {new Intl.NumberFormat('es-PE').format(totalDano)}</span></span>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm" className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"><Plus className="w-3 h-3 mr-1" /> Nuevo siniestro</Button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-5">
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-[10px] font-medium text-gray-500 uppercase">Fecha</label><input type="date" value={form.fecha ?? ''} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} className="w-full text-sm border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 mt-1 bg-white dark:bg-neutral-800" /></div>
            <div><label className="text-[10px] font-medium text-gray-500 uppercase">Tipo</label><select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className="w-full text-sm border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 mt-1 bg-white dark:bg-neutral-800">{TIPOS_SINIESTRO.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="text-[10px] font-medium text-gray-500 uppercase">Conductor</label><input value={form.conductor ?? ''} onChange={e => setForm(f => ({ ...f, conductor: e.target.value }))} className="w-full text-sm border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 mt-1 bg-white dark:bg-neutral-800" /></div>
            <div><label className="text-[10px] font-medium text-gray-500 uppercase">Monto daño (S/)</label><input type="number" value={form.montoDano ?? 0} onChange={e => setForm(f => ({ ...f, montoDano: parseFloat(e.target.value) || 0 }))} className="w-full text-sm border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 mt-1 bg-white dark:bg-neutral-800" /></div>
            <div><label className="text-[10px] font-medium text-gray-500 uppercase">Estado</label><select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value as any }))} className="w-full text-sm border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 mt-1 bg-white dark:bg-neutral-800">{ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
            <div className="col-span-1"><label className="text-[10px] font-medium text-gray-500 uppercase">Descripción</label><textarea value={form.descripcion ?? ''} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} rows={2} className="w-full text-sm border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 mt-1 bg-white dark:bg-neutral-800" /></div>
          </div>
          <div className="flex gap-3 justify-end mt-3">
            <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl text-xs">Cancelar</Button>
            <Button onClick={() => crearMutation.mutate()} disabled={crearMutation.isPending} className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs">Guardar</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {incidents.map(inc => (
          <div key={inc.id} className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{inc.tipo}</p>
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold', ESTADO_STYLES[inc.estado])}>{inc.estado}</span>
              </div>
              <p className="text-sm font-bold text-red-600">S/ {new Intl.NumberFormat('es-PE').format(inc.montoDano || 0)}</p>
            </div>
            <p className="text-xs text-gray-400 mb-1">{inc.fecha}{inc.conductor ? ` · Conductor: ${inc.conductor}` : ''}</p>
            {inc.descripcion && <p className="text-xs text-gray-500">{inc.descripcion}</p>}
            <div className="flex justify-end mt-2">
              <Button variant="ghost" size="sm" onClick={() => eliminarMutation.mutate(inc.id!)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></Button>
            </div>
          </div>
        ))}
        {incidents.length === 0 && <p className="text-center text-gray-400 text-sm py-8">Sin siniestros registrados</p>}
      </div>
    </div>
  )
}
