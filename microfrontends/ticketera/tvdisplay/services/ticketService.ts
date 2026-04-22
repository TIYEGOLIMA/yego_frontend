import type { Ticket } from '../types'
import { createDeviceApiClient } from '../../../../src/services/core/device-auth-service'

const api = createDeviceApiClient()

export const ticketService = {
  async getAllTickets(sedeId?: number | null): Promise<Ticket[]> {
    const params = sedeId != null ? { sedeId } : undefined
    try {
      const response = await api.get('/tickets/all', { params })
      return response.data
    } catch (error: any) {
      if (error?.response?.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        const retryResponse = await api.get('/tickets/all', { params })
        return retryResponse.data
      }
      console.error('[ticketService] Error obteniendo todos los tickets:', error)
      throw error
    }
  },
}
