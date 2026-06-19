export type TipoTurno = 'diurno' | 'nocturno'

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
  price_corporate: number | null
  price_other: number | null
  price_promotion: number | null
  price_tip: number | null
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
  produccion_total: number
  efectivo_total: number
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
  operacionYape: string | null
  otrosGastos: number
  otrosGastosDescripcion: string | null
  totalIngresos: number
  totalGastos: number
  resta: number
  calculadoShiftIds?: string
  shiftSessionId?: string
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

export interface DiaSemanalInfo {
  fecha: string
  dia_semana: string
  cantidad_viajes: number
  cantidad_turnos: number
  turnos_tipo: string
  produccion_total: number
  comisiones_servicio: number
  monto_total_pagar: number
  monto_total_pagado: number
  gasto_combustible: number
  liquida_efectivo: number
  liquida_yape: number
  otros_gastos: number
  odometro_inicial: number | null
  odometro_final: number | null
  km_recorrido: number
  liquidado: boolean
}

export interface ConductorSemanalInfo {
  driver_id: string
  avatar_url?: string
  nombre?: string
  telefono?: string
  placa?: string | null
  turno: string
  dias_trabajados: number
  dias_liquidados: number
  total_viajes: number
  viajes_validos: number
  horas_trabajo: number
  tph: number
  monto_total_producido: number
  comision_app: number
  monto_neto: number
  km_recorrido: number
  gasto_combustible: number
  bono_yango: number
  gasto_mantenimiento: number
  produccion_bonificable: number
  bono_adic_viajes: number
  bono: number
  porcentaje_pago: number
  pago: number
  pago_total: number
  total_pagado: number
  utilidad: number
  utilidad_por_viaje: number
  pago_por_viaje: number
  completamente_liquidado: boolean
  datos_por_dia: DiaSemanalInfo[]
}

export interface ResumenSemanalResponse {
  fecha_inicio: string
  fecha_fin: string
  total_conductores: number
  total_viajes: number
  total_produccion: number
  total_comision: number
  total_combustible: number
  total_pagar: number
  total_pagado: number
  total_pendiente: number
  total_bonos: number
  total_utilidad: number
  total_turnos: number
  conductores: ConductorSemanalInfo[]
}

export interface FacturacionSemanal {
  id?: number
  driverId: string
  fechaInicio: string
  fechaFin: string
  totalViajes: number
  viajesValidos: number
  horasTrabajo: number
  montoTotalProducido: number
  comisionApp: number
  montoNeto: number
  kmRecorrido: number
  gastoCombustible: number
  bonoYango?: number
  gastoMantenimiento: number
  produccionBonificable: number
  bonoAdicViajes: number
  bono: number
  porcentajePago: number
  pago: number
  descuento?: number
  general?: string
  pagoTotal: number
  bonificacionEmpresa?: number
  pagoTotalFinal?: number
  utilidad: number
  utilidadPorViaje: number
  pagoPorViaje: number
  diasTrabajados: number
  diasLiquidados: number
  turno: string
  estado?: string
  userId?: number
  createdAt?: string
  updatedAt?: string
}

export interface BonusThreshold {
  id?: number
  minTrips: number
  bonusAmount: number
  effectiveFrom: string
  updatedBy?: number
  createdAt?: string
  updatedAt?: string
}

export interface PaymentPercentage {
  id?: number
  minValidatedTrips: number
  percentage: number
  effectiveFrom: string
  updatedBy?: number
  createdAt?: string
  updatedAt?: string
}

export interface BillingConfigResponse {
  bonus_thresholds: BonusThreshold[]
  payment_percentages: PaymentPercentage[]
}

export interface ShiftSessionResponse {
  id: string
  driverId: string
  startedAt: string
  closedAt: string | null
  settledAt: string | null
  status: 'active' | 'closed' | 'settled'
  totalTrips: number
  totalAmount: number
  totalCash: number
  createdAt: string
  updatedAt: string
}

export interface SesionDiaInfo {
  sessionId: string
  inicio: string | null
  fin: string | null
  viajes: number
  ingresos: number
  km: number
  status: string
}

export interface DiaLiquidacionInfo {
  fecha: string
  diaSemana: string
  viajes: number
  ingresos: number
  ingresosPendientes: number
  ingresosLiquidados: number
  km: number
  sesiones: number
  estado: string
  sesionesDetalle: SesionDiaInfo[]
}

export interface LiquidacionSemanalResponse {
  driverId: string
  semanaInicio: string
  semanaFin: string
  totalSesiones: number
  totalViajes: number
  totalIngresos: number
  totalKm: number
  primerViaje: string | null
  ultimoViaje: string | null
  dias: DiaLiquidacionInfo[]
  sesionesPendientes: string[]
  tieneSesionesCerradas: boolean
  tieneSesionActiva: boolean
  montoTotalProducido: number
  bonoYango: number
  comisionApp: number
  montoNeto: number
  produccionBonificable: number
  bonoAdicViajes: number
  bono: number
  porcentajePago: number
  pago: number
  pagoTotal: number
  bonificacionEmpresa?: number | null
  pagoTotalFinal?: number | null
  utilidad: number
  utilidadPorViaje: number
  pagoPorViaje: number
  kmRecorrido: number
  gastoMantenimiento: number
  viajesPorHora: number
  sesionesDetalle: SesionDiaInfo[]
  semanaCerrada: boolean
}

export interface DiaPendienteInfo {
  fecha: string
  diaSemana: string
  sesiones: number
  viajes: number
  ingresos: number
  km: number
  estado: string
  sesionesDetalle: SesionDiaInfo[]
}

export interface LiquidacionPendienteResponse {
  driverId: string
  periodoDesde: string
  periodoHasta: string
  esPrimeraLiquidacion: boolean
  totalSesiones: number
  totalViajes: number
  viajesPorHora: number
  kmRecorrido: number
  montoTotalProducido: number
  placa: string
  carBrandModel: string
  semanaCerrada: boolean
  bonoYango: number
  comisionApp: number
  montoNeto: number
  produccionBonificable: number
  bono: number
  porcentajePago: number
  pago: number
  pagoTotal: number
  efectivo: number
  utilidad: number
  utilidadPorViaje: number
  pagoPorViaje: number
  diasTrabajados: number
  sesionesPendientes: string[]
  dias: DiaPendienteInfo[]
}

export interface LiquidarPendienteResult {
  liquidado: boolean
  mensaje?: string
  sesiones?: number
  viajes?: number
  total?: number
  montoNeto?: number
  comisionApp?: number
  bono?: number
  porcentajePago?: number
  pagoTotal?: number
  utilidad?: number
  facturacionId?: number
}

export interface RendimientoResponse {
  periodo: string
  desde: string
  hasta: string
  totales: TotalesRendimiento
  conductores: ConductorRendimiento[]
}

export interface TotalesRendimiento {
  conductores: number
  viajes: number
  efectivo: number
  yape: number
  montoTotalProducido: number
  km: number
  gnvSoles: number
  gasolinaSoles: number
  horas: number
  viajesPorHora: number
  minimoViajes: number
}

export interface ConductorRendimiento {
  driverId: string
  nombre: string
  totalViajes: number
  totalEfectivo: number
  totalYape: number
  totalProducido: number
  totalKm: number
  totalGnvSoles: number
  totalGasolinaSoles: number
  totalOtrosGastos: number
  totalHoras: number
  viajesPorHora: number
  rentabilidad: number
}
