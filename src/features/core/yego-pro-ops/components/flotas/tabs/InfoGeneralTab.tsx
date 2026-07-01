import type { VehicleDetail } from '../types'
import { IdCard, Cog, Tag } from 'lucide-react'

interface Props { vehicle: VehicleDetail }

const TRADUCCIONES: Record<string, string> = {
  comfort: 'Confort',
  comfort_plus: 'Confort Plus',
  econom: 'Económico',
  economy: 'Económico',
  summit_b2b: 'Corporativo',
  business: 'Ejecutivo',
  vip: 'VIP',
  sticker: 'Sticker',
  child_seat: 'Silla para niños',
  wifi: 'WiFi',
  conditioner: 'Aire acondicionado',
  air_conditioner: 'Aire acondicionado',
}

function traducir(valor: string) {
  return TRADUCCIONES[valor?.toLowerCase()] ?? valor
}

function Campo({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</label>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">{value || '—'}</p>
    </div>
  )
}

function Badges({ items, color }: { items?: string[]; color: 'rojo' | 'azul' }) {
  if (!items || items.length === 0) return <p className="text-sm text-gray-400 mt-0.5">—</p>
  const cls = color === 'rojo'
    ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
    : 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400'
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {items.map(it => (
        <span key={it} className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>{traducir(it)}</span>
      ))}
    </div>
  )
}

function Seccion({ icon, titulo, children }: { icon: React.ReactNode; titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-600">{icon}</div>
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">{titulo}</h3>
      </div>
      {children}
    </div>
  )
}

export default function InfoGeneralTab({ vehicle }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Seccion icon={<IdCard className="w-4 h-4" />} titulo="Identificación">
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Placa" value={vehicle.number} />
            <Campo label="Marca" value={vehicle.brand} />
            <Campo label="Modelo" value={vehicle.model} />
            <Campo label="Año" value={vehicle.year?.toString()} />
            <Campo label="VIN" value={vehicle.vin} />
            <Campo label="Flota" value={vehicle.park_nombre} />
          </div>
        </Seccion>

        <Seccion icon={<Cog className="w-4 h-4" />} titulo="Técnico">
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Color" value={vehicle.color_name || vehicle.color} />
            <Campo label="Estado" value={vehicle.status?.name} />
            <Campo label="Transmisión" value={(vehicle as any).transmission} />
            <Campo label="Kilometraje" value={vehicle.mileage ? new Intl.NumberFormat('es-PE').format(vehicle.mileage) + ' km' : '—'} />
            <Campo label="Fecha creación" value={vehicle.created_date?.split('T')[0]} />
            <Campo label="Última modificación" value={vehicle.modified_date?.split('T')[0]} />
          </div>
        </Seccion>
      </div>

      <Seccion icon={<Tag className="w-4 h-4" />} titulo="Comercial">
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Categorías</label>
            <Badges items={vehicle.categories} color="rojo" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Comodidades</label>
            <Badges items={vehicle.amenities} color="azul" />
          </div>
          <Campo label="Renta" value={vehicle.rental ? 'Sí' : 'No'} />
        </div>
      </Seccion>
    </div>
  )
}
