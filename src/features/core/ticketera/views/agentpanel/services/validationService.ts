import { api } from '@/services/core/api'
import { normalizeDriverName } from '../utils/utf8Decoder'

export interface DriverResponse {
  phone: string
  full_name: string
}

export const validationService = {
  async getDriverByPhonePublic(phoneDigits: string): Promise<DriverResponse | null> {
    try {
      let phoneToSearch = phoneDigits.trim()
      
      if (!phoneToSearch.startsWith('+51') && phoneToSearch.length === 9) {
        phoneToSearch = `+51${phoneToSearch}`
      }
      
      const response = await api.get<DriverResponse>(`/ticketera/buscar/telefono/${phoneToSearch}`)
      
      if (response.data && response.data.full_name) {
        const decodedName = normalizeDriverName(response.data.full_name)
        return {
          phone: response.data.phone || phoneToSearch,
          full_name: decodedName
        }
      }
      
      return null
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status
      if (status === 404 || status === 400 || status === 403) {
        return null
      }
      console.error('[validationService] Error consultando API:', error)
      return null
    }
  }
}
