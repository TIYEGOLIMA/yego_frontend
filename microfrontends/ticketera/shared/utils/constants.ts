// 🌐 CONFIGURACIÓN DE ENDPOINTS - BACKEND JAVA TICKETERA
export const API_BASE_URL = 'http://localhost:3030/api/ticketera'
export const SOCKET_URL = 'http://localhost:3030'

// 🏷️ ESTADOS DE TICKETS
export const TICKET_STATUS = {
  WAITING: 'WAITING',
  CALLED: 'CALLED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  FALLING: 'FALLING',
} as const

// 🎨 COLORES PARA ESTADOS DE TICKETS
export const TICKET_STATUS_COLORS = {
  [TICKET_STATUS.WAITING]: '#fbbf24',
  [TICKET_STATUS.CALLED]: '#3b82f6',
  [TICKET_STATUS.IN_PROGRESS]: '#10b981',
  [TICKET_STATUS.COMPLETED]: '#22c55e',
  [TICKET_STATUS.CANCELLED]: '#ef4444',
  [TICKET_STATUS.FALLING]: '#f97316',
} as const

// 🏷️ ETIQUETAS PARA ESTADOS DE TICKETS
export const TICKET_STATUS_LABELS = {
  [TICKET_STATUS.WAITING]: 'En Espera',
  [TICKET_STATUS.CALLED]: 'Llamado',
  [TICKET_STATUS.IN_PROGRESS]: 'En Atención',
  [TICKET_STATUS.COMPLETED]: 'Completado',
  [TICKET_STATUS.CANCELLED]: 'Cancelado',
  [TICKET_STATUS.FALLING]: 'Cayendo',
} as const

// 🔧 CONFIGURACIÓN DE VALIDACIONES  
export const PHONE_VALIDATION = /^\d{9}$/

// ⏰ INTERVALOS DE ACTUALIZACIÓN
export const REFRESH_INTERVALS = {
  TICKETS: 5000,
  STATS: 30000,
  CONNECTION_STATUS: 10000,
} as const

// 🔧 CONFIGURACIÓN DE SESIÓN
export const SESSION_CONFIG = {
  TIMEOUT_WARNING: 300000, // 5 minutos
  AUTO_LOGOUT: 600000, // 10 minutos
  REFRESH_TOKEN_TIME: 840000 // 14 minutos
} as const

// 🎵 CONFIGURACIÓN DE SONIDOS
export const SOUND_CONFIG = {
  ENABLED_BY_DEFAULT: true,
  SOUNDS: {
    NEW_TICKET: '/sounds/new-ticket.mp3',
    TICKET_CALLED: '/sounds/ticket-called.mp3',
    TICKET_COMPLETED: '/sounds/ticket-completed.mp3',
    TICKET_CANCELLED: '/sounds/ticket-cancelled.mp3',
  }
} as const
