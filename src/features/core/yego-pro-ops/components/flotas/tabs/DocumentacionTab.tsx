import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaService } from '../service'
import type { VehicleDocument } from '../types'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import { FileText, Plus, Trash2, Check, AlertTriangle, X } from 'lucide-react'

const DOC_TYPES = ['SOAT', 'Permiso ATU', 'Revisión Técnica', 'Tarjeta de Propiedad', 'Otro']

function DocStatusBadge({ fechaFin }: { fechaFin?: string | null }) {
  if (!fechaFin) return <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Sin fecha</span>
  const hoy = new Date()
  const fin = new Date(fechaFin)
  const dias = Math.ceil((fin.getTime() - hoy.getTime()) / 86400000)
  if (dias < 0) return <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-bold">Vencido</span>
  if (dias <= 30) return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 font-bold">Vence en {dias}d</span>
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 font-bold">Vigente</span>
}

interface Props { vehicleId: string; documents: VehicleDocument[] }

export default function DocumentacionTab({ vehicleId, documents }: Props) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Partial<VehicleDocument>>({ tipo: 'SOAT', nombre: '', fechaInicio: '', fechaFin: '' })

  const crearMutation = useMutation({
    mutationFn: () => flotaService.agregarDocumento(vehicleId, form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] }); setShowForm(false); setForm({ tipo: 'SOAT', nombre: '', fechaInicio: '', fechaFin: '' }) },
  })

  const eliminarMutation = useMutation({
    mutationFn: (docId: number) => flotaService.eliminarDocumento(vehicleId, docId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] }),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Documentación del vehículo</h3>
        <Button onClick={() => setShowForm(!showForm)} size="sm" className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"><Plus className="w-3 h-3 mr-1" /> Agregar documento</Button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-5">
          <div className="grid grid-cols-4 gap-3">
            <div><label className="text-[10px] font-medium text-gray-500 uppercase">Tipo</label><select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className="w-full text-sm border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 mt-1 bg-white dark:bg-neutral-800">{DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="text-[10px] font-medium text-gray-500 uppercase">Nombre</label><input value={form.nombre ?? ''} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="w-full text-sm border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 mt-1 bg-white dark:bg-neutral-800" /></div>
            <div><label className="text-[10px] font-medium text-gray-500 uppercase">Fecha inicio</label><input type="date" value={form.fechaInicio ?? ''} onChange={e => setForm(f => ({ ...f, fechaInicio: e.target.value }))} className="w-full text-sm border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 mt-1 bg-white dark:bg-neutral-800" /></div>
            <div><label className="text-[10px] font-medium text-gray-500 uppercase">Fecha fin</label><input type="date" value={form.fechaFin ?? ''} onChange={e => setForm(f => ({ ...f, fechaFin: e.target.value }))} className="w-full text-sm border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 mt-1 bg-white dark:bg-neutral-800" /></div>
          </div>
          <div className="flex gap-3 justify-end mt-3">
            <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl text-xs">Cancelar</Button>
            <Button onClick={() => crearMutation.mutate()} disabled={crearMutation.isPending} className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs">{crearMutation.isPending ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {documents.map(doc => (
          <div key={doc.id} className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" /><p className="text-sm font-bold text-gray-900 dark:text-gray-100">{doc.tipo}</p></div>
              <DocStatusBadge fechaFin={doc.fechaFin} />
            </div>
            {doc.nombre && <p className="text-xs text-gray-500 mb-2">{doc.nombre}</p>}
            <div className="flex gap-4 text-xs text-gray-400">
              {doc.fechaInicio && <span>Inicio: {doc.fechaInicio}</span>}
              {doc.fechaFin && <span>Fin: {doc.fechaFin}</span>}
            </div>
            <div className="flex justify-end mt-3">
              <Button variant="ghost" size="sm" onClick={() => eliminarMutation.mutate(doc.id!)} className="text-red-400 hover:text-red-600 rounded-xl text-xs"><Trash2 className="w-3 h-3" /></Button>
            </div>
          </div>
        ))}
        {documents.length === 0 && <p className="col-span-2 text-center text-gray-400 text-sm py-8">Sin documentos registrados</p>}
      </div>
    </div>
  )
}
