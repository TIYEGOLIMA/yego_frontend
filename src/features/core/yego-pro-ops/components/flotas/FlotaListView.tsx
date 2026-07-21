import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { flotaService } from './service'
import type { YangoVehicle } from './types'
import { Search, Truck, ChevronRight, RefreshCw, Plus, X } from 'lucide-react'
import { cn } from '@/utils/cn'

function StatusBadge({ status }: { status?: { id: string; name: string } }) {
  const styles: Record<string, string> = {
    working: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    inactive: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
    maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  }
  return <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', styles[status?.id ?? ''] ?? 'bg-gray-100 text-gray-600')}>{status?.name ?? '—'}</span>
}

function CategoryBadge({ cat }: { cat: string }) {
  return <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 text-gray-500 font-medium">{cat}</span>
}

interface Props { onSelectVehicle: (id: string, parkId?: string) => void }

export default function FlotaListView({ onSelectVehicle }: Props) {
  const queryClient = useQueryClient()
  const [busqueda, setBusqueda] = useState('')
  const [segmentoActivo, setSegmentoActivo] = useState<string | null>(null)
  const [showAgregar, setShowAgregar] = useState(false)
  const [nuevoParkId, setNuevoParkId] = useState('')

  const { data: flotas } = useQuery({
    queryKey: ['fleet-segments'],
    queryFn: () => flotaService.listarFlotas(),
  })

  const { data: partners } = useQuery({
    queryKey: ['fleet-partners'],
    queryFn: () => flotaService.listarPartners(),
    enabled: showAgregar,
  })

  const partnersDisponibles = useMemo(() => {
    const yaAgregados = new Set((flotas ?? []).map(f => f.parkId))
    return (partners ?? []).filter(p => !yaAgregados.has(p.id))
  }, [partners, flotas])

  const flotaActiva = useMemo(
    () => (flotas ?? []).find(f => f.id === segmentoActivo) ?? null,
    [flotas, segmentoActivo]
  )

  const { data, isLoading } = useQuery({
    queryKey: ['fleet-vehicles', segmentoActivo ?? 'all'],
    queryFn: () => flotaService.listarVehiculos(segmentoActivo ?? undefined),
  })

  const actualizarDatos = useMutation({
    mutationFn: (segmentId?: string) => flotaService.actualizarDatos(segmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['fleet-segments'] })
    },
  })

  const agregarFlota = useMutation({
    mutationFn: (parkId: string) => flotaService.agregarFlota(parkId),
    onSuccess: () => {
      setShowAgregar(false)
      setNuevoParkId('')
      queryClient.invalidateQueries({ queryKey: ['fleet-segments'] })
    },
  })

  const vehicles = useMemo(() => {
    const searchTerm = busqueda.trim().toLowerCase()
    const cars: YangoVehicle[] = data?.cars ?? []

    if (!searchTerm) return cars

    return cars.filter(vehicle =>
      vehicle.number?.toLowerCase().includes(searchTerm) ||
      vehicle.callsign?.toLowerCase().includes(searchTerm) ||
      vehicle.brand?.toLowerCase().includes(searchTerm) ||
      vehicle.model?.toLowerCase().includes(searchTerm) ||
      vehicle.vin?.toLowerCase().includes(searchTerm)
    )
  }, [data, busqueda])

  const total = data?.cars?.length ?? 0
  const totalGeneral = (flotas ?? []).reduce((sum, flota) => sum + flota.totalVehiculos, 0)
  const alcanceActualizacion = flotaActiva?.id

  const seleccionarFlota = (segmentId: string | null) => {
    actualizarDatos.reset()
    setSegmentoActivo(segmentId)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"><Truck className="w-7 h-7" /> Flotas</h1>
          <p className="text-sm text-gray-400 mt-1">
            {flotaActiva ? `${total} vehículos en ${flotaActiva.nombre}` : `${total} vehículos en ${flotas?.length ?? 0} flotas`}
          </p>
        </div>
        <button onClick={() => setShowAgregar(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl bg-red-600 text-white hover:bg-red-700">
          <Plus className="w-4 h-4" /> Agregar flota
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => seleccionarFlota(null)} className={cn('text-xs font-semibold px-3 py-1.5 rounded-full transition-colors', segmentoActivo == null ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200')}>
          Todos {segmentoActivo == null ? total : totalGeneral}
        </button>
        {flotas?.map(f => (
          <button key={f.id} onClick={() => seleccionarFlota(f.id)} className={cn('text-xs font-semibold px-3 py-1.5 rounded-full transition-colors', segmentoActivo === f.id ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200')}>
            {f.nombre} {f.totalVehiculos}
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-col gap-3 border-y border-gray-200 bg-gray-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/60 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{flotaActiva?.nombre ?? 'Todas las flotas'}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {flotaActiva
              ? 'Actualiza estados, asignaciones y datos de esta flota directamente desde Yango.'
              : 'Actualiza estados, asignaciones y datos de todas las flotas directamente desde Yango.'}
          </p>
          {actualizarDatos.isSuccess && actualizarDatos.variables === alcanceActualizacion && (
            <p className="mt-1 text-xs font-medium text-emerald-600">
              Datos de {actualizarDatos.data.procesados} vehículos actualizados.
            </p>
          )}
          {actualizarDatos.isError && actualizarDatos.variables === alcanceActualizacion && (
            <p className="mt-1 text-xs font-medium text-red-600">No se pudieron actualizar los datos.</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => actualizarDatos.mutate(alcanceActualizacion)}
          disabled={actualizarDatos.isPending}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-gray-200 dark:hover:bg-neutral-800"
        >
          <RefreshCw className={cn('h-4 w-4', actualizarDatos.isPending && 'animate-spin')} />
          {actualizarDatos.isPending ? 'Actualizando...' : 'Actualizar datos'}
        </button>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por placa, marca, modelo o VIN..." className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-red-500" /></div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" /></div>
      ) : vehicles.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><Truck className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="text-sm">{busqueda || segmentoActivo != null ? 'Sin resultados' : 'No hay vehículos. Agrega una flota y sincroniza.'}</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {vehicles.map(v => (
            <div key={v.id} onClick={() => onSelectVehicle(v.id, v.park_id)} className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-4 hover:shadow-lg hover:border-red-200 dark:hover:border-red-900 transition-all cursor-pointer group">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-16 h-12 rounded-xl bg-gray-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {v.foto_url
                    ? <img src={v.foto_url} alt={v.number} className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                    : <Truck className="w-6 h-6 text-gray-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-red-600 transition-colors">{v.number}</p>
                      <p className="text-sm text-gray-500">{v.brand} {v.model} · {v.year}</p>
                    </div>
                    <StatusBadge status={v.status} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {v.park_nombre && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 font-bold">{v.park_nombre}</span>}
                <span className="text-xs text-gray-400">{v.color_name || v.color}</span>
                {v.rental && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 font-bold">Renta</span>}
              </div>
              {v.categories && v.categories.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {v.categories.slice(0, 3).map(c => <CategoryBadge key={c} cat={c} />)}
                  {v.categories.length > 3 && <span className="text-[9px] text-gray-400">+{v.categories.length - 3}</span>}
                </div>
              )}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-neutral-800">
                <span className="text-[10px] text-gray-400 font-mono">{v.vin}</span>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-red-500 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      {showAgregar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowAgregar(false)}>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Agregar flota</h2>
              <button onClick={() => setShowAgregar(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Selecciona una flota de Yango</label>
            <select value={nuevoParkId} onChange={e => setNuevoParkId(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-red-500 mb-1">
              <option value="">— Selecciona una flota —</option>
              {partnersDisponibles.map(p => (
                <option key={p.id} value={p.id}>{p.name}{p.city ? ` · ${p.city}` : ''}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mb-4">Se consultará esa flota en Yango para traer sus vehículos propios.</p>
            {agregarFlota.isError && <p className="text-xs text-red-500 mb-3">No se pudo agregar la flota.</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAgregar(false)} className="px-3 py-2 text-sm font-medium rounded-xl border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-800">Cancelar</button>
              <button onClick={() => nuevoParkId.trim() && agregarFlota.mutate(nuevoParkId.trim())} disabled={!nuevoParkId.trim() || agregarFlota.isPending} className="px-3 py-2 text-sm font-medium rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">{agregarFlota.isPending ? 'Agregando...' : 'Agregar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
