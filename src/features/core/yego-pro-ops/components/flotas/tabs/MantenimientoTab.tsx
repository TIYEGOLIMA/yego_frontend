import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaService } from '../service'
import type { VehicleMaintenance } from '../types'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import { Plus, Trash2, Shield, AlertCircle, Upload, Eye, X } from 'lucide-react'

const CATEGORIAS_PREVENTIVO = ['Cambio de aceite', 'Cambio de filtros', 'Cambio de llantas', 'Rotación de llantas', 'Alineamiento', 'Balanceo', 'Mantenimiento general']
const CATEGORIAS_CORRECTIVO = ['Pastillas de freno', 'Embrague', 'Reparación de motor', 'Reparación eléctrica', 'Reparación mecánica', 'Reparación de suspensión', 'Otro']

const INIT: Partial<VehicleMaintenance> = { tipo: 'preventivo', categoria: '', fecha: new Date().toISOString().split('T')[0], descripcion: '', taller: '', responsable: '', costo: 0, estado: 'completado' }

interface Props { vehicleId: string; maintenance: VehicleMaintenance[] }

export default function MantenimientoTab({ vehicleId, maintenance }: Props) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'preventivo' | 'correctivo'>('todos')
  const [form, setForm] = useState<Partial<VehicleMaintenance>>(INIT)
  const [file, setFile] = useState<File | null>(null)
  const [verUrl, setVerUrl] = useState<string | null>(null)

  const reset = () => { setShowForm(false); setForm(INIT); setFile(null) }

  const crearMutation = useMutation({
    mutationFn: async () => {
      let archivoUrl = form.archivoUrl ?? null
      if (file) {
        const { url } = await flotaService.subirArchivoMantenimiento(vehicleId, file)
        archivoUrl = url
      }
      return flotaService.agregarMantenimiento(vehicleId, { ...form, archivoUrl })
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vehicle-detail', vehicleId] }); reset() },
  })

  const eliminarMutation = useMutation({
    mutationFn: (mantId: number) => flotaService.eliminarMantenimiento(mantId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicle-detail', vehicleId] }),
  })

  const filtered = tipoFiltro === 'todos' ? maintenance : maintenance.filter(m => m.tipo === tipoFiltro)
  const totalCosto = filtered.reduce((s, m) => s + (m.costo || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Mantenimiento</h3>
          <div className="flex gap-1 bg-gray-100 dark:bg-neutral-800 rounded-lg p-0.5">
            {(['todos', 'preventivo', 'correctivo'] as const).map(t => (
              <button key={t} onClick={() => setTipoFiltro(t)} className={cn('text-xs px-3 py-1 rounded-md font-medium transition-colors', tipoFiltro === t ? 'bg-white dark:bg-neutral-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500')}>{t === 'todos' ? 'Todos' : t === 'preventivo' ? 'Preventivo' : 'Correctivo'}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Total: <span className="font-bold text-gray-700 dark:text-gray-200">S/ {new Intl.NumberFormat('es-PE').format(totalCosto)}</span></span>
          <Button onClick={() => setShowForm(!showForm)} size="sm" className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"><Plus className="w-3 h-3 mr-1" /> Nuevo</Button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-5">
          <div className="grid grid-cols-4 gap-3">
            <div><label className="text-[10px] font-medium text-gray-500 uppercase">Tipo</label><select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as any, categoria: '' }))} className="w-full text-sm border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 mt-1 bg-white dark:bg-neutral-800"><option value="preventivo">Preventivo</option><option value="correctivo">Correctivo</option></select></div>
            <div><label className="text-[10px] font-medium text-gray-500 uppercase">Categoría</label><select value={form.categoria ?? ''} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className="w-full text-sm border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 mt-1 bg-white dark:bg-neutral-800"><option value="">Seleccionar</option>{(form.tipo === 'correctivo' ? CATEGORIAS_CORRECTIVO : CATEGORIAS_PREVENTIVO).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="text-[10px] font-medium text-gray-500 uppercase">Fecha</label><input type="date" value={form.fecha ?? ''} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} className="w-full text-sm border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 mt-1 bg-white dark:bg-neutral-800" /></div>
            <div><label className="text-[10px] font-medium text-gray-500 uppercase">Costo (S/)</label><input type="number" value={form.costo ?? 0} onChange={e => setForm(f => ({ ...f, costo: parseFloat(e.target.value) || 0 }))} className="w-full text-sm border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 mt-1 bg-white dark:bg-neutral-800" /></div>
            <div><label className="text-[10px] font-medium text-gray-500 uppercase">Taller</label><input value={form.taller ?? ''} onChange={e => setForm(f => ({ ...f, taller: e.target.value }))} className="w-full text-sm border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 mt-1 bg-white dark:bg-neutral-800" /></div>
            <div><label className="text-[10px] font-medium text-gray-500 uppercase">Responsable</label><input value={form.responsable ?? ''} onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))} className="w-full text-sm border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 mt-1 bg-white dark:bg-neutral-800" /></div>
            <div className="col-span-2"><label className="text-[10px] font-medium text-gray-500 uppercase">Descripción</label><textarea value={form.descripcion ?? ''} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} rows={2} className="w-full text-sm border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 mt-1 bg-white dark:bg-neutral-800" /></div>
            <div className="col-span-2"><label className="text-[10px] font-medium text-gray-500 uppercase">Documento (boleta/factura, opcional)</label>
              <label className="mt-1 flex items-center gap-2 border border-dashed border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 cursor-pointer hover:border-red-400 text-sm text-gray-500">
                <Upload className="w-4 h-4" />{file ? file.name : 'Seleccionar archivo...'}
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-3">
            <Button variant="outline" onClick={reset} className="rounded-xl text-xs">Cancelar</Button>
            <Button onClick={() => crearMutation.mutate()} disabled={crearMutation.isPending} className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs">{crearMutation.isPending ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(m => (
          <div key={m.id} className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-4 flex items-start gap-4">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', m.tipo === 'preventivo' ? 'bg-emerald-100 dark:bg-emerald-950/30' : 'bg-amber-100 dark:bg-amber-950/30')}>
              {m.tipo === 'preventivo' ? <Shield className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-amber-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{m.categoria || m.tipo}</p>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-bold', m.tipo === 'preventivo' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600')}>{m.tipo}</span>
              </div>
              <p className="text-xs text-gray-400">{m.fecha} · {m.taller || '—'} · {m.responsable || '—'}</p>
              {m.descripcion && <p className="text-xs text-gray-500 mt-1">{m.descripcion}</p>}
              {m.archivoUrl && <button onClick={() => setVerUrl(m.archivoUrl!)} className="text-xs text-red-600 hover:underline inline-flex items-center gap-1 mt-1"><Eye className="w-3 h-3" /> Ver documento</button>}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">S/ {new Intl.NumberFormat('es-PE').format(m.costo || 0)}</p>
              <Button variant="ghost" size="sm" onClick={() => eliminarMutation.mutate(m.id!)} className="text-red-400 hover:text-red-600 mt-1"><Trash2 className="w-3 h-3" /></Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-gray-400 text-sm py-8">Sin registros de mantenimiento</p>}
      </div>

      {verUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setVerUrl(null)}>
          <div className="relative bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden w-full max-w-3xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-neutral-800">
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Documento</p>
              <button onClick={() => setVerUrl(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center">
              {/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(verUrl)
                ? <img src={verUrl} alt="Documento" className="max-h-[80vh] w-auto object-contain" />
                : <iframe src={verUrl} title="Documento" className="w-full h-[80vh]" />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
