import { api } from '@/services/core/api'
import type { YangoVehicle, VehicleDetail, VehicleDocument, VehicleMaintenance, VehicleMileage, VehicleIncident, QcHistoryItem, Flota, FlotaPartner, VehicleTraceEvent } from './types'

const ENDPOINTS = {
  fleet: '/vehicles/fleet',
  fleetSync: '/vehicles/fleet/sync',
  segments: '/vehicles/segments',
  segment: (id: string) => `/vehicles/segments/${id}`,
  partners: '/flota/partners',
  byPlaca: (placa: string) => `/vehicles/by-placa/${encodeURIComponent(placa)}`,
  vehicleDetails: (id: string) => `/vehicles/${id}/details`,
  history: (id: string) => `/vehicles/${id}/history`,
  qcHistory: (id: string) => `/vehicles/${id}/qc-history`,
  documents: (id: string) => `/vehicles/${id}/documents`,
  documentsUpload: (id: string) => `/vehicles/${id}/documents/upload`,
  document: (id: string, docId: number) => `/vehicles/${id}/documents/${docId}`,
  maintenance: (id: string) => `/vehicles/${id}/maintenance`,
  maintenanceUpload: (id: string) => `/vehicles/${id}/maintenance/upload`,
  maintenanceItem: (id: string, mantId: number) => `/vehicles/${id}/maintenance/${mantId}`,
  mileage: (id: string) => `/vehicles/${id}/mileage`,
  incidents: (id: string) => `/vehicles/${id}/incidents`,
  incidentItem: (id: string, incId: number) => `/vehicles/${id}/incidents/${incId}`,
}

export const flotaService = {
  listarVehiculos: async (segmentId?: string): Promise<{ total: number; cars: YangoVehicle[] }> => {
    const { data } = await api.get(ENDPOINTS.fleet, { params: segmentId != null ? { segmentId } : {} })
    return data
  },

  // ── Flotas (segmentos) ──
  listarFlotas: async (): Promise<Flota[]> => {
    const { data } = await api.get<Flota[]>(ENDPOINTS.segments)
    return data
  },

  listarPartners: async (): Promise<FlotaPartner[]> => {
    const { data } = await api.get<FlotaPartner[]>(ENDPOINTS.partners)
    return data
  },

  agregarFlota: async (parkId: string): Promise<Flota> => {
    const { data } = await api.post<Flota>(ENDPOINTS.segments, { parkId })
    return data
  },

  eliminarFlota: async (id: string): Promise<void> => {
    await api.delete(ENDPOINTS.segment(id))
  },

  sincronizar: async (segmentId?: string): Promise<{ procesados: number }> => {
    const { data } = await api.post(ENDPOINTS.fleetSync, null, { params: segmentId != null ? { segmentId } : {} })
    return data
  },

  historial: async (carId: string): Promise<VehicleTraceEvent[]> => {
    const { data } = await api.get<VehicleTraceEvent[]>(ENDPOINTS.history(carId))
    return data
  },

  buscarPorPlaca: async (placa: string): Promise<VehicleDetail> => {
    const { data } = await api.get<VehicleDetail>(ENDPOINTS.byPlaca(placa))
    return data
  },

  obtenerDetalle: async (carId: string, parkId?: string): Promise<VehicleDetail> => {
    const { data } = await api.get(ENDPOINTS.vehicleDetails(carId), { params: parkId ? { parkId } : {} })
    return data
  },

  obtenerHistorialQc: async (carId: string, parkId?: string): Promise<{ items: QcHistoryItem[] }> => {
    const { data } = await api.get(ENDPOINTS.qcHistory(carId), { params: parkId ? { parkId } : {} })
    return data
  },

  documentos: async (carId: string): Promise<VehicleDocument[]> => {
    const { data } = await api.get<VehicleDocument[]>(ENDPOINTS.documents(carId))
    return data
  },

  agregarDocumento: async (carId: string, doc: Partial<VehicleDocument>): Promise<VehicleDocument> => {
    const { data } = await api.post<VehicleDocument>(ENDPOINTS.documents(carId), doc)
    return data
  },

  subirDocumento: async (carId: string, payload: { tipo: string; nombre?: string; fechaVigente?: string; file: File }): Promise<VehicleDocument> => {
    const fd = new FormData()
    fd.append('tipo', payload.tipo)
    if (payload.nombre) fd.append('nombre', payload.nombre)
    if (payload.fechaVigente) fd.append('fechaVigente', payload.fechaVigente)
    fd.append('file', payload.file)
    const { data } = await api.post<VehicleDocument>(ENDPOINTS.documentsUpload(carId), fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    return data
  },

  eliminarDocumento: async (docId: number): Promise<void> => {
    await api.delete(`/vehicles/documents/${docId}`)
  },

  mantenimientos: async (carId: string): Promise<VehicleMaintenance[]> => {
    const { data } = await api.get<VehicleMaintenance[]>(ENDPOINTS.maintenance(carId))
    return data
  },

  agregarMantenimiento: async (carId: string, mant: Partial<VehicleMaintenance>): Promise<VehicleMaintenance> => {
    const { data } = await api.post<VehicleMaintenance>(ENDPOINTS.maintenance(carId), mant)
    return data
  },

  subirArchivoMantenimiento: async (carId: string, file: File): Promise<{ url: string }> => {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await api.post<{ url: string }>(ENDPOINTS.maintenanceUpload(carId), fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    return data
  },

  eliminarMantenimiento: async (mantId: number): Promise<void> => {
    await api.delete(`/vehicles/maintenance/${mantId}`)
  },

  kilometraje: async (carId: string): Promise<VehicleMileage[]> => {
    const { data } = await api.get<VehicleMileage[]>(ENDPOINTS.mileage(carId))
    return data
  },

  agregarKilometraje: async (carId: string, km: Partial<VehicleMileage>): Promise<VehicleMileage> => {
    const { data } = await api.post<VehicleMileage>(ENDPOINTS.mileage(carId), km)
    return data
  },

  siniestros: async (carId: string): Promise<VehicleIncident[]> => {
    const { data } = await api.get<VehicleIncident[]>(ENDPOINTS.incidents(carId))
    return data
  },

  agregarSiniestro: async (carId: string, inc: Partial<VehicleIncident>): Promise<VehicleIncident> => {
    const { data } = await api.post<VehicleIncident>(ENDPOINTS.incidents(carId), inc)
    return data
  },

  eliminarSiniestro: async (incId: number): Promise<void> => {
    await api.delete(`/vehicles/incidents/${incId}`)
  },
}
