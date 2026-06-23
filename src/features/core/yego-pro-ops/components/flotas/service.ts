import { api } from '@/services/core/api'
import type { YangoVehicle, VehicleDetail, VehicleDocument, VehicleMaintenance, VehicleMileage, VehicleIncident, QcHistoryItem } from './types'

const ENDPOINTS = {
  yangoFleet: '/vehicles/yango-fleet',
  yangoFleetAll: '/vehicles/yango-fleet/all',
  vehicleDetails: (id: string) => `/vehicles/${id}/details`,
  qcHistory: (id: string) => `/vehicles/${id}/qc-history`,
  documents: (id: string) => `/vehicles/${id}/documents`,
  document: (id: string, docId: number) => `/vehicles/${id}/documents/${docId}`,
  maintenance: (id: string) => `/vehicles/${id}/maintenance`,
  maintenanceItem: (id: string, mantId: number) => `/vehicles/${id}/maintenance/${mantId}`,
  mileage: (id: string) => `/vehicles/${id}/mileage`,
  incidents: (id: string) => `/vehicles/${id}/incidents`,
  incidentItem: (id: string, incId: number) => `/vehicles/${id}/incidents/${incId}`,
}

export const flotaService = {
  listarVehiculos: async (parkId?: string): Promise<{ total: number; cars: any[] }> => {
    const { data } = await api.get(ENDPOINTS.yangoFleetAll, { params: parkId ? { parkId } : {} })
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
