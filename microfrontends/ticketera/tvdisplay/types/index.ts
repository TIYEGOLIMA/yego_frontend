export interface Ticket {
  id: number
  ticketNumber: string
  status: string
  createdAt: string
  priority: number
  driverName?: string
  moduleName?: string
  categoryName?: string
  subcategoryName?: string
  licenseNumber?: string
  phone?: string
  userId?: number | null
  moduleId?: number
  sedeId?: number | null
  agent_id?: number | null
  calledAt?: string | null
  completedAt?: string | null
  agentId?: number
}
