import { api } from '@/services/core/api'
import { getTicketeraErrorStatus } from '../../../domain'

export interface CreateDriverData {
  firstName: string
  lastName: string
  phone: string
}

export interface CreateDriverByDniData {
  dni: string
  phone: string
}

export interface DriverSearchResponse {
  phone: string
  full_name: string
}

export const driverService = {
  async searchDriverByPhone(phoneDigits: string): Promise<DriverSearchResponse | null> {
    try {
      let phoneToSearch = phoneDigits.trim()
      if (!phoneToSearch.startsWith('+51') && phoneToSearch.length === 9) {
        phoneToSearch = `+51${phoneToSearch}`
      }
      const response = await api.get<DriverSearchResponse>(`/ticketera/buscar/telefono/${phoneToSearch}`)
      return response.data
    } catch (error: unknown) {
      const status = getTicketeraErrorStatus(error)
      if (status === 404 || status === 400) {
        return null
      }
      console.error('[driverService] Error consultando conductor:', error)
      return null
    }
  },

  async createDriverManual(driverData: CreateDriverData): Promise<unknown> {
    const response = await api.post('/ticketera/drivers/registrar', driverData)
    return response.data
  },

  async createDriverByDni(dniData: CreateDriverByDniData): Promise<unknown> {
    const response = await api.post('/ticketera/drivers/registrar-dni', dniData)
    return response.data
  },
}
