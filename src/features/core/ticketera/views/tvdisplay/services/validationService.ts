import { api } from '@/services/core/api'

export const validationService = {
  async getDriverByPhonePublic(phoneNumber: string): Promise<{ phone: string, full_name: string } | null> {
    try {
      let phoneToSearch = phoneNumber.trim()
      
      if (!phoneToSearch.startsWith('+51') && phoneToSearch.length === 9) {
        phoneToSearch = `+51${phoneToSearch}`
      }
      
      const response = await api.get<{ phone: string; full_name: string }>(
        `/ticketera/buscar/telefono/${phoneToSearch}`,
      )
      return response.data
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status
      if (status === 404 || status === 400) {
        return null
      }
      console.error('[validationService] Error obteniendo conductor:', error)
      return null
    }
  }
}
