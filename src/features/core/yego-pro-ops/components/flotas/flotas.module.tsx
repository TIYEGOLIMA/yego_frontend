import { useState } from 'react'
import FlotaListView from './FlotaListView'
import VehicleProfile from './VehicleProfile'

export default function FlotaModule() {
  const [selected, setSelected] = useState<{ id: string; parkId?: string; segmentId?: string } | null>(null)

  if (selected !== null) {
    return <VehicleProfile vehicleId={selected.id} parkId={selected.parkId} segmentId={selected.segmentId} onBack={() => setSelected(null)} />
  }

  return <FlotaListView onSelectVehicle={(id, parkId, segmentId) => setSelected({ id, parkId, segmentId })} />
}
