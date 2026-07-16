import type { Ticket } from '../../../domain'
import { ticketeraApi } from '../../../api'

export const ticketService = {
  async getAllTickets(sedeId?: number | null, signal?: AbortSignal): Promise<Ticket[]> {
    try {
      if (sedeId == null) return []
      return await ticketeraApi.listTickets(sedeId, { signal })
    } catch (error: unknown) {
      if ((error as { code?: string })?.code === 'RATE_LIMITED') {
        await new Promise(resolve => setTimeout(resolve, 2000))
        if (signal?.aborted) return []
        return sedeId != null ? ticketeraApi.listTickets(sedeId, { signal }) : []
      }
      console.error('[ticketService] Error obteniendo todos los tickets:', error)
      throw error
    }
  },
}
