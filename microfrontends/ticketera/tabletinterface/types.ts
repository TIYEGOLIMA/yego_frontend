export interface CreateTicketData {
  optionId: number
  licenseNumber: string
  userId?: number
  sedeId?: number
}

export interface Ticket {
  id: number
  ticketNumber: string
  status: string
  createdAt: string
}
