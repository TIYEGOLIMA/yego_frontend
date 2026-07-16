import type { Ticket } from '../../../domain'
import { ticketeraApi } from '../../../api'

export const ticketService = {
  async getAllTickets(sedeId?: number | null): Promise<Ticket[]> {
    try {
      if (sedeId == null) return []
      return await ticketeraApi.listTickets(sedeId)
    } catch (error: unknown) {
      if ((error as { code?: string })?.code === 'RATE_LIMITED') {
        await new Promise(resolve => setTimeout(resolve, 2000))
        return sedeId != null ? ticketeraApi.listTickets(sedeId) : []
      }
      console.error('[ticketService] Error obteniendo todos los tickets:', error)
      throw error
    }
  },
}
