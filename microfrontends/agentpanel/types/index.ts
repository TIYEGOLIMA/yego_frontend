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
  driverName?: string // Nombre del conductor enviado por WebSocket
  // Campos opcionales para compatibilidad
  userId?: number | null
  optionId?: number
  licenseNumber?: string
  calledAt?: string | null
  completedAt?: string | null
  agent_id?: number | null
  moduleId?: number // ID del módulo para filtrar por tablet
  user?: User
  option?: Option
  
  // Nuevos campos del endpoint /complete
  agentId?: number
  agentName?: string
  optionName?: string
  optionDescription?: string
  optionPriority?: number
  parentOptionId?: number
  parentOptionName?: string
  isActive?: boolean
  optionCreatedAt?: string
  
  // Flag para pre-asignación automática
  preAssigned?: boolean
}

// Interfaz específica para la respuesta del nuevo endpoint
export interface TicketModuleResponse {
  id: number
  ticketNumber: string
  status: 'WAITING' | 'CALLED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'FALLING'
  createdAt: string
  priority: number
  createdBy: string
  phone: string
  moduleName: string
  categoryName: string
  subcategoryName: string
  categoryDescription?: string
  subcategoryDescription?: string
  // Campos adicionales específicos del módulo
  calledAt?: string | null
  completedAt?: string | null
  agent_id?: number | null
}

// Nueva interfaz para tickets por módulo agrupados por estado
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

// Interfaz que coincide con la respuesta real del backend
export interface TicketModuloCompletoResponse {
  modulo: number
  enEspera: number
  llamados: number
  atendidos: number
  completados: number
  mensaje: string
}

// Interfaz para QueueAgent
export interface QueueAgent {
  id: number
  userId: number
  moduleId: number
  status: 'disponible' | 'ocupado' 
  createdAt: string
  updatedAt: string
}

// Interfaz para la respuesta del endpoint de verificación de módulo del usuario
export interface UserModuleStatusResponse {
  userId: number
  moduleId: number | null
  moduleName?: string
  status: string
  isActive: boolean
  message: string
  hasModule: boolean
}

// 🆕 Interfaz para la respuesta real del backend que retorna tickets organizados
export interface TicketsModuloOrganizadosResponse {
  moduleId: number
  moduleName: string
  ticketsEnEspera: Ticket[]
  ticketsLlamados: Ticket[]
  ticketsEnAtencion?: Ticket[]
  ticketsCayendo?: Ticket[]
  ticketsCompletados?: Ticket[]
  estadisticas?: any
}

export interface User {
  id: number
  username: string
  name: string
  email: string
  role: 'tablet1' | 'superadmin' | 'principal' | 'tv' | 'tablet2' | 'operador'
  active: boolean
  lastLogin?: string
  modulo_id?: number  // snake_case (legacy)
  moduleId?: number   // camelCase (nuevo formato del backend)
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

export interface CreateTicketData {
  optionId: number
  licenseNumber: string
  userId?: number // ✅ Opcional - se asigna automáticamente cuando un agente toma el ticket
}

export interface TicketWithOptions {
  ticket: Ticket
  mainOption?: Option
  subOption?: Option
  optionSelected?: Option  // Para compatibilidad con tu backend actual
}

export interface LoginData {
  username: string
  password: string
}

export interface Agent {
  id: number
  name: string
  status: 'disponible' | 'ocupado' | 'desconectado'
  current_ticket_id?: number
}

export interface Rating {
  id: number
  ticket_id: number
  rating: number
  comment?: string
  created_at: string
}

export interface CreateRatingData {
  ticket_id: number
  rating: number
  comment?: string
}