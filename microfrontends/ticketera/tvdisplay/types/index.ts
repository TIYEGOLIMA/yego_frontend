// 📺 Interfaces específicas para TVDisplay
export interface TVDisplayStats {
  totalTickets: number
  waitingTickets: number
  calledTickets: number
  inProgressTickets: number
  completedToday: number
}

export interface TVDisplayConfig {
  MAX_TICKETS_PER_SECTION: number
  REFRESH_INTERVAL: number
  AUTO_SCROLL_INTERVAL: number
  SHOW_DRIVER_NAMES: boolean
  SOUND_ENABLED_DEFAULT: boolean
}

// 🎵 Estados de sonido
export type SoundState = 'enabled' | 'disabled' | 'muted'

// 📊 Estados de la pantalla
export type TVDisplayMode = 'normal' | 'fullscreen' | 'slideshow'

// Interface temporal para Ticket (debería venir de shared)
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
  agent_id?: number | null
  calledAt?: string | null
  completedAt?: string | null
  agentId?: number
}
