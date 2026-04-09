/** Types for tablet ticket creation and API responses (used by services, not re-exported from barrel). */

export interface CreateTicketData {
  optionId: number
  licenseNumber: string
  userId?: number
}

export interface Ticket {
  id: number
  ticketNumber: string
  status: string
  createdAt: string
  priority: number
  moduleId?: number
  agent_id?: number | null
  phone?: string
  preAssigned?: boolean
  createdBy?: string
  moduleName?: string
  categoryName?: string
  subcategoryName?: string
  categoryDescription?: string
  subcategoryDescription?: string
  driverName?: string
  userId?: number | null
  optionId?: number
  licenseNumber?: string
  calledAt?: string | null
  completedAt?: string | null
  agentId?: number
  agentName?: string
  optionName?: string
  optionDescription?: string
  optionPriority?: number
  parentOptionId?: number
  parentOptionName?: string
  isActive?: boolean
  optionCreatedAt?: string
}
