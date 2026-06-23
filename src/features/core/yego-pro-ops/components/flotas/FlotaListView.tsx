import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { flotaService } from './service'
import type { YangoVehicle } from './types'
import { Search, Truck, ChevronRight } from 'lucide-react'
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

interface Props { onSelectVehicle: (id: string) => void }

export default function FlotaListView({ onSelectVehicle }: Props) {
  const [busqueda, setBusqueda] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['yango-vehicles'],
    queryFn: () => flotaService.listarVehiculos(),
  })

  const vehicles = useMemo(() => {
    const cars: YangoVehicle[] = data?.cars ?? []
    if (!busqueda) return cars
    const q = busqueda.toLowerCase()
    return cars.filter(v =>
      v.number?.toLowerCase().includes(q) ||
      v.callsign?.toLowerCase().includes(q) ||
      v.brand?.toLowerCase().includes(q) ||
      v.model?.toLowerCase().includes(q) ||
      v.vin?.toLowerCase().includes(q)
    )
  }, [data, busqueda])

  const total = data?.total ?? 0

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"><Truck className="w-7 h-7" /> Flotas</h1><p className="text-sm text-gray-400 mt-1">{total} vehículos en la flota</p></div>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por placa, marca, modelo o VIN..." className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-red-500" /></div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" /></div>
      ) : vehicles.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><Truck className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="text-sm">{busqueda ? 'Sin resultados para la búsqueda' : 'No hay vehículos en la flota'}</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {vehicles.map(v => (
            <div key={v.id} onClick={() => onSelectVehicle(v.id)} className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-4 hover:shadow-lg hover:border-red-200 dark:hover:border-red-900 transition-all cursor-pointer group">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-16 h-12 rounded-xl bg-gray-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                  <Truck className="w-6 h-6 text-gray-300" />
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
              <div className="flex items-center gap-2 mb-2">
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
    </div>
  )
}
