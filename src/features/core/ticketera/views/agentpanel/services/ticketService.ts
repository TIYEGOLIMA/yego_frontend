import { Ticket } from '../types'
import { ticketeraApi } from '../../../api'

export const ticketService = {
  async getAllTickets(sedeId?: number | null): Promise<Ticket[]> {
    try {
      if (sedeId == null) return []
      return await ticketeraApi.listTickets(sedeId)
    } catch (error: unknown) {
      if ((error as { code?: string })?.code === 'RATE_LIMITED') {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        return sedeId != null ? ticketeraApi.listTickets(sedeId) : []
      }
      throw error
    }
  },

  async callTicket(ticketId: number, userId: number, moduleId: number): Promise<Ticket> {
    if (!moduleId) throw new Error('moduleId es requerido para llamar un ticket')
    return ticketeraApi.callTicket(ticketId, userId, moduleId)
  },

  async completeTicket(ticketId: number, agentId: number, notes?: string): Promise<Ticket> {
    const validAgentId = Number(agentId)
    if (!validAgentId || validAgentId <= 0) {
      throw new Error(`ID de agente inválido: ${agentId}`)
    }
    return ticketeraApi.completeTicket({ ticketId, agentId: validAgentId, notes })
  },

  async cancelTicket(ticketId: number, agentId: number): Promise<Ticket> {
    return ticketeraApi.cancelTicket(ticketId, agentId)
  },

  async startTicket(ticketId: number, agentId: number): Promise<Ticket> {
    return ticketeraApi.startTicket(ticketId, agentId)
  },
}
