import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaService } from '../service'
import type { VehicleDocument } from '../types'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import { FileText, Plus, Trash2, Upload, Eye, Image as ImageIcon, AlertTriangle, X } from 'lucide-react'

const DOC_TYPES = ['SOAT', 'Permiso ATU', 'Revisión Técnica', 'Tarjeta de Propiedad', 'Otro']

function estadoVigencia(fechaVigente?: string | null) {
  if (!fechaVigente) return { label: 'Sin fecha', cls: 'bg-gray-100 text-gray-500' }
  const dias = Math.ceil((new Date(fechaVigente).getTime() - Date.now()) / 86400000)
  if (dias < 0) return { label: 'Vencido', cls: 'bg-red-100 text-red-600' }
  if (dias <= 30) return { label: `Vence en ${dias}d`, cls: 'bg-amber-100 text-amber-600' }
  return { label: 'Vigente', cls: 'bg-emerald-100 text-emerald-600' }
}

function esImagen(url?: string | null) {
  return !!url && /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url)
}
function esPdf(url?: string | null) {
  return !!url && /\.pdf(\?|$)/i.test(url)
}

interface Props { vehicleId: string; documents: VehicleDocument[] }

export default function DocumentacionTab({ vehicleId, documents }: Props) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [tipo, setTipo] = useState('SOAT')
  const [nombre, setNombre] = useState('')
  const [fechaVigente, setFechaVigente] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [docAEliminar, setDocAEliminar] = useState<VehicleDocument | null>(null)
  const [docVer, setDocVer] = useState<VehicleDocument | null>(null)

  const reset = () => { setShowForm(false); setTipo('SOAT'); setNombre(''); setFechaVigente(''); setFile(null) }

  const crearMutation = useMutation({
    mutationFn: () => flotaService.subirDocumento(vehicleId, { tipo, nombre, fechaVigente: fechaVigente || undefined, file: file! }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vehicle-detail', vehicleId] }); queryClient.invalidateQueries({ queryKey: ['vehicle-trace', vehicleId] }); reset() },
  })

  const eliminarMutation = useMutation({
    mutationFn: (docId: number) => flotaService.eliminarDocumento(docId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vehicle-detail', vehicleId] }); queryClient.invalidateQueries({ queryKey: ['vehicle-trace', vehicleId] }); setDocAEliminar(null) },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Documentación del vehículo</h3>
        <Button onClick={() => setShowForm(!showForm)} size="sm" className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"><Plus className="w-3 h-3 mr-1" /> Agregar documento</Button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-5">
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-[10px] font-medium text-gray-500 uppercase">Tipo</label><select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full text-sm border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 mt-1 bg-white dark:bg-neutral-800">{DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="text-[10px] font-medium text-gray-500 uppercase">Nombre</label><input value={nombre} onChange={e => setNombre(e.target.value)} className="w-full text-sm border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 mt-1 bg-white dark:bg-neutral-800" /></div>
            <div><label className="text-[10px] font-medium text-gray-500 uppercase">Vigente hasta</label><input type="date" value={fechaVigente} onChange={e => setFechaVigente(e.target.value)} className="w-full text-sm border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 mt-1 bg-white dark:bg-neutral-800" /></div>
          </div>
          <div className="mt-3">
            <label className="text-[10px] font-medium text-gray-500 uppercase">Archivo (imagen o PDF)</label>
            <label className="mt-1 flex items-center gap-2 border border-dashed border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-3 cursor-pointer hover:border-red-400 text-sm text-gray-500">
              <Upload className="w-4 h-4" />
              {file ? file.name : 'Seleccionar archivo...'}
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          {crearMutation.isError && <p className="text-xs text-red-500 mt-2">No se pudo subir el documento.</p>}
          <div className="flex gap-3 justify-end mt-3">
            <Button variant="outline" onClick={reset} className="rounded-xl text-xs">Cancelar</Button>
            <Button onClick={() => crearMutation.mutate()} disabled={!file || crearMutation.isPending} className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs">{crearMutation.isPending ? 'Subiendo...' : 'Guardar'}</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {documents.map(doc => {
          const est = estadoVigencia(doc.fechaVigente)
          return (
            <div key={doc.id} className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 overflow-hidden">
              <button type="button" onClick={() => doc.archivoUrl && setDocVer(doc)} className="h-24 w-full bg-gray-50 dark:bg-neutral-800 flex items-center justify-center overflow-hidden hover:opacity-90">
                {esImagen(doc.archivoUrl)
                  ? <img src={doc.archivoUrl!} alt={doc.tipo} className="w-full h-full object-cover" />
                  : esPdf(doc.archivoUrl)
                    ? <FileText className="w-9 h-9 text-red-400" />
                    : <ImageIcon className="w-9 h-9 text-gray-300" />}
              </button>
              <div className="p-2.5">
                <div className="flex items-start justify-between gap-1 mb-0.5">
                  <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{doc.tipo}</p>
                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap', est.cls)}>{est.label}</span>
                </div>
                {doc.fechaVigente && <p className="text-[10px] text-gray-400">Hasta: {doc.fechaVigente}</p>}
                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-100 dark:border-neutral-800">
                  {doc.archivoUrl
                    ? <button onClick={() => setDocVer(doc)} className="text-[11px] text-red-600 hover:underline inline-flex items-center gap-1"><Eye className="w-3 h-3" /> Ver</button>
                    : <span className="text-[11px] text-gray-300">Sin archivo</span>}
                  <button onClick={() => setDocAEliminar(doc)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          )
        })}
        {documents.length === 0 && <p className="col-span-full text-center text-gray-400 text-sm py-8">Sin documentos registrados</p>}
      </div>

      {docAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDocAEliminar(null)}>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Eliminar documento</h2>
            </div>
            <p className="text-sm text-gray-500 mb-5">¿Seguro que deseas eliminar <span className="font-semibold text-gray-700 dark:text-gray-200">{docAEliminar.tipo}</span>{docAEliminar.nombre ? ` (${docAEliminar.nombre})` : ''}?</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDocAEliminar(null)} className="rounded-xl text-xs">Cancelar</Button>
              <Button onClick={() => eliminarMutation.mutate(docAEliminar.id!)} disabled={eliminarMutation.isPending} className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs">{eliminarMutation.isPending ? 'Eliminando...' : 'Eliminar'}</Button>
            </div>
          </div>
        </div>
      )}

      {docVer && docVer.archivoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setDocVer(null)}>
          <div className="relative bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden w-full max-w-3xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-neutral-800">
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{docVer.tipo}{docVer.nombre ? ` · ${docVer.nombre}` : ''}</p>
              <button onClick={() => setDocVer(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center">
              {esImagen(docVer.archivoUrl)
                ? <img src={docVer.archivoUrl} alt={docVer.tipo} className="max-h-[80vh] w-auto object-contain" />
                : <iframe src={docVer.archivoUrl} title={docVer.tipo} className="w-full h-[80vh]" />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
