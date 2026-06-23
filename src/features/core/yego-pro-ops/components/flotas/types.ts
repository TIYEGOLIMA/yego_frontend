export interface YangoVehicle {
  id: string
  park_id: string
  brand: string
  model: string
  year: number
  color: string
  color_name: string
  number: string
  callsign: string
  vin: string
  status: { id: string; name: string }
  categories: string[]
  amenities: string[]
  mileage: number
  rental: boolean
  created_date: string
  modified_date: string
}

export interface YangoVehicleDetail {
  car: YangoVehicle & { transmission?: string; booster_count?: number; vehicle_owner_type?: string; is_cargo_frauder?: boolean; is_owner_confirmed?: boolean; is_readonly?: boolean; sticker_confirmed?: boolean; lightbox_confirmed?: boolean; registration_cert_verified?: boolean }
  settings?: Record<string, unknown>
}

export interface VehicleDocument {
  id?: number
  tipo: string
  nombre?: string | null
  fechaInicio?: string | null
  fechaFin?: string | null
  archivoUrl?: string | null
  estado: string
}

export interface VehicleMaintenance {
  id?: number
  tipo: 'preventivo' | 'correctivo'
  categoria?: string | null
  fecha: string
  kilometraje?: number | null
  descripcion?: string | null
  problema?: string | null
  diagnostico?: string | null
  solucion?: string | null
  taller?: string | null
  responsable?: string | null
  costo: number
  archivoUrl?: string | null
  estado: string
  proximaFecha?: string | null
  proximoKm?: number | null
}

export interface VehicleMileage {
  id?: number
  fecha: string
  kilometraje: number
}

export interface VehicleIncident {
  id?: number
  fecha: string
  tipo: string
  descripcion?: string | null
  conductor?: string | null
  montoDano: number
  estado: 'reportado' | 'en_proceso' | 'resuelto'
  evidencias?: string | null
}

export interface QcHistoryItem {
  exam: string
  status: string
  modified: string
  media: QcMedia[]
}

export interface QcMedia {
  code: string
  name: string
  url: string
  status: string
}

export interface VehicleDetail extends YangoVehicle {
  documents: VehicleDocument[]
  maintenance: VehicleMaintenance[]
  mileageHistory: VehicleMileage[]
  incidents: VehicleIncident[]
  qcHistory: QcHistoryItem[]
}
