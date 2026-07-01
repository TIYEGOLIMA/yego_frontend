import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { flotaService } from '../service'
import type { VehicleTraceEvent } from '../types'
import { LogIn, Repeat, FileUp, FileX, Clock, User } from 'lucide-react'
import { cn } from '@/utils/cn'

interface Props { vehicleId: string }

const META: Record<string, { label: string; icon: React.ReactNode; dot: string; badge: string }> = {
  INGRESO: { label: 'Ingreso', icon: <LogIn className="w-3.5 h-3.5" />, dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
  CAMBIO_FLOTA: { label: 'Cambio de flota', icon: <Repeat className="w-3.5 h-3.5" />, dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  DOC_CARGADO: { label: 'Documento cargado', icon: <FileUp className="w-3.5 h-3.5" />, dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' },
  DOC_ELIMINADO: { label: 'Documento eliminado', icon: <FileX className="w-3.5 h-3.5" />, dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400' },
}

const FILTROS = [
  { key: 'todos', label: 'Todos' },
  { key: 'flota', label: 'Flota' },
  { key: 'documentos', label: 'Documentos' },
] as const
type FiltroKey = typeof FILTROS[number]['key']

function etiquetaDia(fecha: string) {
  const d = new Date(fecha)
  const hoy = new Date()
  const ayer = new Date(); ayer.setDate(hoy.getDate() - 1)
  const mismoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (mismoDia(d, hoy)) return 'Hoy'
  if (mismoDia(d, ayer)) return 'Ayer'
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
}

function hora(fecha: string) {
  return new Date(fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

export default function TrazabilidadTab({ vehicleId }: Props) {
  const [filtro, setFiltro] = useState<FiltroKey>('todos')

  const { data, isLoading } = useQuery({
    queryKey: ['vehicle-trace', vehicleId],
    queryFn: () => flotaService.historial(vehicleId),
  })

  const grupos = useMemo(() => {
    let items: VehicleTraceEvent[] = data ?? []
    if (filtro === 'flota') items = items.filter(e => e.tipo === 'INGRESO' || e.tipo === 'CAMBIO_FLOTA')
    if (filtro === 'documentos') items = items.filter(e => e.tipo === 'DOC_CARGADO' || e.tipo === 'DOC_ELIMINADO')

    const map = new Map<string, { label: string; eventos: VehicleTraceEvent[] }>()
    for (const e of items) {
      const key = e.fecha ? new Date(e.fecha).toDateString() : 'sin-fecha'
      if (!map.has(key)) map.set(key, { label: e.fecha ? etiquetaDia(e.fecha) : 'Sin fecha', eventos: [] })
      map.get(key)!.eventos.push(e)
    }
    return Array.from(map.values())
  }, [data, filtro])

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-red-600" /></div>

  const totalItems = grupos.reduce((s, g) => s + g.eventos.length, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Trazabilidad del vehículo</h3>
        <div className="flex gap-1 bg-gray-100 dark:bg-neutral-800 rounded-lg p-0.5">
          {FILTROS.map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key)} className={cn('text-xs px-3 py-1 rounded-md font-medium transition-colors', filtro === f.key ? 'bg-white dark:bg-neutral-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500')}>{f.label}</button>
          ))}
        </div>
      </div>

      {totalItems === 0 ? (
        <div className="text-center py-12 text-gray-400"><Clock className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">Sin eventos de trazabilidad</p></div>
      ) : (
        <div className="space-y-6">
          {grupos.map((g, gi) => (
            <div key={gi}>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">{g.label}</p>
              <div className="relative pl-7">
                <div className="absolute left-[9px] top-1 bottom-1 w-px bg-gray-200 dark:bg-neutral-800" />
                {g.eventos.map((e, i) => {
                  const meta = META[e.tipo] ?? { label: e.tipo, icon: <Clock className="w-3.5 h-3.5" />, dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600' }
                  return (
                    <div key={i} className="relative mb-3 last:mb-0">
                      <span className={cn('absolute -left-[22px] top-2 w-[18px] h-[18px] rounded-full flex items-center justify-center text-white ring-4 ring-white dark:ring-neutral-950', meta.dot)}>
                        {meta.icon}
                      </span>
                      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', meta.badge)}>{meta.label}</span>
                          <span className="text-xs text-gray-400">{e.fecha ? hora(e.fecha) : '—'}</span>
                        </div>
                        <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{e.descripcion}</p>
                        {e.usuario && <p className="text-xs text-gray-500 mt-0.5 inline-flex items-center gap-1"><User className="w-3 h-3" /> {e.usuario}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
