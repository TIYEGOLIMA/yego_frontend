import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { flotaService } from './service'
import type { VehicleDetail } from './types'
import { ArrowLeft, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import InfoGeneralTab from './tabs/InfoGeneralTab'
import DocumentacionTab from './tabs/DocumentacionTab'
import MantenimientoTab from './tabs/MantenimientoTab'
import KilometrajeTab from './tabs/KilometrajeTab'
import SiniestrosTab from './tabs/SiniestrosTab'
import GastosTab from './tabs/GastosTab'
import AlertasTab from './tabs/AlertasTab'
import TrazabilidadTab from './tabs/TrazabilidadTab'

function StatusBadge({ status }: { status?: { id: string; name: string } }) {
  const styles: Record<string, string> = { working: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400', inactive: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400', maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' }
  return <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', styles[status?.id ?? ''] ?? 'bg-gray-100 text-gray-600')}>{status?.name ?? '—'}</span>
}

interface Props { vehicleId: string; parkId?: string; onBack: () => void }

export default function VehicleProfile({ vehicleId, parkId, onBack }: Props) {
  const [activeTab, setActiveTab] = useState('info')

  const { data: vehicle, isLoading } = useQuery<VehicleDetail>({
    queryKey: ['vehicle-detail', vehicleId, parkId],
    queryFn: () => flotaService.obtenerDetalle(vehicleId, parkId),
  })

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" /></div>
  if (!vehicle) return <div className="text-center py-20 text-gray-400">Vehículo no encontrado</div>

  const docsVencidos = vehicle.documents?.filter(d => { if (!d.fechaVigente) return false; return new Date(d.fechaVigente).getTime() < Date.now() }).length ?? 0
  const docsPorVencer = vehicle.documents?.filter(d => { if (!d.fechaVigente) return false; const dias = Math.ceil((new Date(d.fechaVigente).getTime() - Date.now()) / 86400000); return dias > 0 && dias <= 30 }).length ?? 0
  const mantPendientes = vehicle.maintenance?.filter(m => m.estado === 'pendiente').length ?? 0
  const gastoTotal = (vehicle.maintenance ?? []).reduce((s, m) => s + (m.costo || 0), 0)

  const tabs = [
    { key: 'info', label: 'Información General' },
    { key: 'docs', label: 'Documentación' },
    { key: 'mant', label: 'Mantenimiento' },
    { key: 'km', label: 'Kilometraje' },
    { key: 'sin', label: 'Siniestros' },
    { key: 'gastos', label: 'Gastos' },
    { key: 'alertas', label: `Alertas ${docsVencidos + docsPorVencer > 0 ? `(${docsVencidos + docsPorVencer})` : ''}` },
    { key: 'traza', label: 'Trazabilidad' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <div className="bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="rounded-xl"><ArrowLeft className="w-4 h-4 mr-1" /> Volver</Button>
          </div>
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-2xl bg-gray-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden flex-shrink-0">
              {vehicle.fotoUrl
                ? <img src={vehicle.fotoUrl} alt={vehicle.number} className="w-full h-full object-cover" />
                : <Truck className="w-10 h-10 text-gray-300" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{vehicle.number}</h1>
                <StatusBadge status={vehicle.status} />
              </div>
              <p className="text-lg text-gray-500">{vehicle.brand} {vehicle.model} · {vehicle.year}</p>
              {vehicle.color_name && <p className="text-sm text-gray-400 mt-1">Color: {vehicle.color_name}</p>}
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3 mt-6">
            <div className="rounded-xl bg-gray-50 dark:bg-neutral-800/50 p-3 text-center"><p className="text-[10px] text-gray-400 uppercase font-semibold">Kilometraje</p><p className="text-lg font-bold text-gray-900 dark:text-gray-100">{new Intl.NumberFormat('es-PE').format(vehicle.mileage ?? 0)} km</p></div>
            <div className="rounded-xl bg-gray-50 dark:bg-neutral-800/50 p-3 text-center"><p className="text-[10px] text-gray-400 uppercase font-semibold">Docs vigentes</p><p className="text-lg font-bold text-emerald-600">{(vehicle.documents?.length ?? 0) - docsVencidos - docsPorVencer}</p></div>
            <div className="rounded-xl bg-gray-50 dark:bg-neutral-800/50 p-3 text-center"><p className="text-[10px] text-gray-400 uppercase font-semibold">Docs por vencer</p><p className={cn('text-lg font-bold', docsPorVencer > 0 ? 'text-amber-600' : 'text-gray-900 dark:text-gray-100')}>{docsPorVencer}</p></div>
            <div className="rounded-xl bg-gray-50 dark:bg-neutral-800/50 p-3 text-center"><p className="text-[10px] text-gray-400 uppercase font-semibold">Alertas</p><p className={cn('text-lg font-bold', (docsVencidos + mantPendientes) > 0 ? 'text-red-600' : 'text-gray-900 dark:text-gray-100')}>{docsVencidos + mantPendientes}</p></div>
            <div className="rounded-xl bg-gray-50 dark:bg-neutral-800/50 p-3 text-center"><p className="text-[10px] text-gray-400 uppercase font-semibold">Gasto total</p><p className="text-lg font-bold text-gray-900 dark:text-gray-100">S/ {new Intl.NumberFormat('es-PE').format(gastoTotal)}</p></div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} className={cn('px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap', activeTab === t.key ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600')}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'info' && <InfoGeneralTab vehicle={vehicle} />}
        {activeTab === 'docs' && <DocumentacionTab vehicleId={vehicleId} documents={vehicle.documents ?? []} />}
        {activeTab === 'mant' && <MantenimientoTab vehicleId={vehicleId} maintenance={vehicle.maintenance ?? []} />}
        {activeTab === 'km' && <KilometrajeTab vehicleId={vehicleId} mileage={vehicle.mileageHistory ?? []} kmActual={vehicle.mileage ?? 0} />}
        {activeTab === 'sin' && <SiniestrosTab vehicleId={vehicleId} incidents={vehicle.incidents ?? []} />}
        {activeTab === 'gastos' && <GastosTab maintenance={vehicle.maintenance ?? []} incidents={vehicle.incidents ?? []} />}
        {activeTab === 'alertas' && <AlertasTab vehicle={vehicle} />}
        {activeTab === 'traza' && <TrazabilidadTab vehicleId={vehicleId} />}
      </div>
    </div>
  )
}
