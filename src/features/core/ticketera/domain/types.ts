export type TicketStatus = 'WAITING' | 'CALLED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export type TipoDispositivo = 'TABLET_PRINCIPAL' | 'TABLET' | 'TV'

export interface Ticket {
  id: number
  ticketNumber: string
  status: TicketStatus
  createdAt: string
  priority: number
  sedeId: number | null
  moduleId: number | null
  userId: number | null
  agentId: number | null
  optionId: number | null
  licenseNumber: string | null
  calledAt: string | null
  completedAt: string | null
  driverName?: string
  phone?: string
  moduleName?: string
  categoryName?: string
  categoryDescription?: string
  subcategoryName?: string
  subcategoryDescription?: string
  optionName?: string
  optionDescription?: string
  optionPriority?: number
  parentOptionId?: number
  parentOptionName?: string
  preAssigned?: boolean
}

export interface Sede {
  id: number
  name: string
  description?: string | null
  active?: boolean
}

export interface ModuloAtencion {
  id: number
  name: string
  description?: string | null
  isActive: boolean
  sedeId: number | null
  sedeNombre?: string | null
}

export interface Dispositivo {
  id: number
  name: string
  type: TipoDispositivo
  sedeId: number
  sedeNombre?: string | null
  moduleId?: number | null
  moduleNombre?: string | null
  description?: string | null
  active: boolean
  createdAt?: string
  updatedAt?: string | null
  accessTokenPlain?: string
}

export interface Rating {
  id: number
  ticketId: number
  score: number
  comment?: string
  createdAt: string
}
