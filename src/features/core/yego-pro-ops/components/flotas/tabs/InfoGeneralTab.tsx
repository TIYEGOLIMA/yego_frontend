import type { VehicleDetail } from '../types'

interface Props { vehicle: VehicleDetail }

export default function InfoGeneralTab({ vehicle }: Props) {
  const fields = [
    { label: 'Placa', value: vehicle.number },
    { label: 'Marca', value: vehicle.brand },
    { label: 'Modelo', value: vehicle.model },
    { label: 'Año', value: vehicle.year?.toString() },
    { label: 'Color', value: vehicle.color_name || vehicle.color },
    { label: 'VIN', value: vehicle.vin },
    { label: 'Estado', value: vehicle.status?.name },
    { label: 'Transmisión', value: (vehicle as any).transmission },
    { label: 'Categorías', value: vehicle.categories?.join(', ') },
    { label: 'Amenities', value: vehicle.amenities?.join(', ') },
    { label: 'Renta', value: vehicle.rental ? 'Sí' : 'No' },
    { label: 'Kilometraje', value: vehicle.mileage ? new Intl.NumberFormat('es-PE').format(vehicle.mileage) + ' km' : '—' },
    { label: 'Fecha creación', value: vehicle.created_date?.split('T')[0] },
    { label: 'Última modificación', value: vehicle.modified_date?.split('T')[0] },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-6">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">Información del vehículo</h3>
        <div className="grid grid-cols-3 gap-4">
          {fields.map((f, i) => (
            <div key={i}>
              <label className="text-[10px] font-semibold text-gray-400 uppercase">{f.label}</label>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">{f.value || '—'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
