import type { Ticket } from '../../../domain'
import { ticketeraApi } from '../../../api'

export interface CreateTicketData {
  optionId: number
  licenseNumber: string
  userId?: number
  sedeId?: number
}

export const ticketService = {
  async createTicketPublic(data: CreateTicketData): Promise<Ticket> {
    if (data.sedeId == null) throw new Error('La sede del dispositivo es requerida')
    return ticketeraApi.createTicket({ ...data, sedeId: data.sedeId })
  },
}
