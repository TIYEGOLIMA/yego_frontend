export type TipoTurno = 'manana' | 'tarde'

export interface DriverItem {
  driver_id: string
  full_name: string
  status: 'free' | 'busy' | 'offline' | 'in_order' | 'online'
  balance: number
  photo_url?: string
  avatar_url?: string
  phone?: string
}

export interface ConductorEnOrden {
  id: string
  avatar_url: string
  balance: string
  first_name: string
  last_name: string
  status: string
  vehicle_number: string | null
  viajes?: ViajePorFecha[]
  summary_distance?: SummaryDistance
  total_activity_time?: number
  completed_trips_count?: number
  completed_trips_total_price?: number
}

export interface SummaryDistance {
  free: number
  not_active: number
  active: number
}

export interface ConductoresEnOrdenResponse {
  type: string
  total: number
  timestamp: string
  conductores: ConductorEnOrden[]
}

export interface ViajePorFecha {
  status: string
  short_id: number
  id: string
  ended_at: string | null
  booked_at: string
}

export interface ViajesPorFechaResponse {
  date_from: string
  date_to: string
  trips: ViajePorFecha[]
}

export interface TipoTurnoFecha {
  id: number
  tipoTurno: TipoTurno
}

export interface FechaTurno {
  fecha: string
  tiposTurno: TipoTurnoFecha[]
}

export interface FechasTurnosResponse {
  driverId: string
  fechas: FechaTurno[]
}

export interface ViajeCompleto {
  status: string
  short_id: number
  id: string
  ended_at: string
  booked_at: string
  car_brand_model: string
  distance: number | null
  cash: number | null
  card: number | null
  price: number | null
  price_bonus: number | null
  price_commission_park: number | null
  price_commission_service: number | null
  price_other: number | null
  price_promotion: number | null
  address_from?: string | null
  address_to?: string | null
}

export interface TurnoResumen {
  id: number
  fecha: string
  hora_inicio: string
  hora_fin: string
  tipo_turno: TipoTurno
  duracion_minutos: number
  monto_total: number
  pagado: boolean
}

export interface ConductorResumenPagos {
  driver_id: string
  avatar_url?: string
  nombre?: string
  telefono?: string
  placa?: string | null
  monto_total_pagar: number
  monto_total_pagado?: number
  produccion_total?: number
  comisiones_servicio?: number
  cantidad_turnos: number
  viajes_por_hora?: number
  cantidad_viajes?: number
  turnos: TurnoResumen[]
}

export interface ResumenPagosResponse {
  total_conductores: number
  conductores: ConductorResumenPagos[]
}

export interface ConductorTurnosPagados {
  driver_id: string
  avatar_url?: string
  nombre?: string
  telefono?: string
  cantidad_turnos: number
  cantidad_viajes?: number
  viajes_por_hora?: number
  monto_total_pagado: number
  produccion_total?: number
  comisiones_servicio?: number
  turnos: TurnoResumen[]
}

export interface TurnosPagadosResponse {
  total_conductores: number
  conductores: ConductorTurnosPagados[]
}

export interface ConductorSimple {
  driverId: string
  nombre: string
  telefono: string
  avatarUrl: string
}

export interface ListaConductoresResponse {
  conductores: ConductorSimple[]
}

export interface RegistroCierre {
  id: number
  createdAt: string
  updatedAt: string
  driverId: string
  fecha: string
  userId: number
  userName: string
  userIdModificado?: number
  userNameModificado?: string
  gnvM3: string | null
  gnvSoles: number
  gasolinaGalones: string | null
  gasolinaSoles: number
  liquidaEfectivo: number
  liquidaYape: number
  otrosGastos: number
  otrosGastosDescripcion: string | null
  totalIngresos: number
  totalGastos: number
  resta: number
  calculatedShiftIds?: string
  tiposTurno?: TipoTurno[]
  placa?: string | null
  odometroInicial?: number | null
  odometroFinal?: number | null
  diferenciaOdometro?: number | null
}

export type ViajesCompletosResponse = {
  tipo: 'viajes'
  viajes: ViajeCompleto[]
  cierre_registrado?: boolean
}

export interface CalcularTurnosResponse {
  message: string
  driverId: string
  fecha: string
  cantidadTurnos?: number
}
