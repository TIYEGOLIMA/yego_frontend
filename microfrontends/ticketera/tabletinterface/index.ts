// 📱 TABLETINTERFACE MICROFRONTEND - ENTRY POINT

// Main component
export { default as TabletInterface } from './TabletInterface'

// WebSocket hook
export { useTabletInterfaceWebSocket } from './hooks/useWebSocket'

// 📝 INTERFACES Y TIPOS
export interface CreateTicketData {
  optionId: number
  licenseNumber: string
  userId?: number
}

export interface Option {
  id: number
  name: string
  description: string
  code: string
  module_id: number
  parent_id?: number
  is_active: boolean
  priority: number
  module?: Module
  sub_options?: Option[]
}

export interface Module {
  id: number
  name: string
  description: string
  is_active: boolean
  priority: number
}

// Tipos necesarios de otros microfrontends
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

export interface TicketModuleResponse {
  id: number
  ticketNumber: string
  status: string
  createdAt: string
  priority: number
  createdBy: string
  phone: string
  moduleName: string
  categoryName: string
  subcategoryName: string
  calledAt: string | null
  completedAt: string | null
  agent_id: number | null
}

export interface TicketsPorModuloResponse {
  moduleId: number
  moduleName: string
  ticketsPorEstado: {
    WAITING: TicketModuleResponse[]
    CALLED: TicketModuleResponse[]
    IN_PROGRESS: TicketModuleResponse[]
    FALLING: TicketModuleResponse[]
    COMPLETED: TicketModuleResponse[]
  }
}

export interface TicketModuloCompletoResponse {
  modulo: number
}

export interface TicketWithOptions {
  ticket: Ticket
  options: Option[]
}

export interface QueueAgent {
  id: number
  userId: number
  moduleId: number
  status: string
  createdAt: string
  updatedAt: string
}

export type TabletInterfaceState = 'selecting' | 'creating' | 'validating' | 'success' | 'error'

export interface TabletInterfaceConfig {
  ENABLE_TICKET_CREATION: boolean
  ENABLE_PHONE_VALIDATION: boolean
  AUTO_FOCUS_PHONE_INPUT: boolean
}

// 🔧 SERVICIOS
export * from './services'

// 🎯 CONFIGURACIÓN ESPECÍFICA PARA TABLET INTERFACE  
export const TABLET_INTERFACE_CONFIG: TabletInterfaceConfig = {
  ENABLE_TICKET_CREATION: true,
  ENABLE_PHONE_VALIDATION: true,
  AUTO_FOCUS_PHONE_INPUT: true,
}