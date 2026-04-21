export interface Ticket {
  id: number
  ticketNumber: string
  status: 'WAITING' | 'CALLED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'FALLING'
  createdAt: string
  priority: number
  createdBy?: string
  phone?: string
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
  agent_id?: number | null
  moduleId?: number

  agentId?: number
  agentName?: string
  optionName?: string
  optionDescription?: string
  optionPriority?: number
  parentOptionId?: number
  parentOptionName?: string
  isActive?: boolean
  optionCreatedAt?: string

  preAssigned?: boolean
}

export interface User {
  id: number
  username: string
  name: string
  email: string
  role: string
  active: boolean
  lastLogin?: string
  moduleId?: number
}
