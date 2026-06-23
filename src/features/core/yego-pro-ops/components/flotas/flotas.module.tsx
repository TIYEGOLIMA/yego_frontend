import { useState } from 'react'
import FlotaListView from './FlotaListView'
import VehicleProfile from './VehicleProfile'

export default function FlotaModule() {
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null)

  if (selectedVehicleId !== null) {
    return <VehicleProfile vehicleId={selectedVehicleId} onBack={() => setSelectedVehicleId(null)} />
  }

  return <FlotaListView onSelectVehicle={(id) => setSelectedVehicleId(id)} />
}
