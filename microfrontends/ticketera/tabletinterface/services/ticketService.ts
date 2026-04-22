import type { CreateTicketData, Ticket } from '../types'
import { createDeviceApiClient } from '../../../../src/services/core/device-auth-service'

const api = createDeviceApiClient()

export const ticketService = {
  async createTicketPublic(data: CreateTicketData): Promise<Ticket> {
    const response = await api.post('/tickets/create', data)
    return response.data
  },
}
