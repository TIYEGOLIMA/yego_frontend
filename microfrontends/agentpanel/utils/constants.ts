// Configuración específica para AgentPanel (microfrontend)
export const API_BASE_URL = import.meta.env.VITE_AGENT_API_URL || 'https://api-tick.yego.pro/api'
export const SOCKET_URL = import.meta.env.VITE_AGENT_SOCKET_URL || 'https://api-tick.yego.pro'


export const TICKET_STATUS = {
  WAITING: 'WAITING',
  CALLED: 'CALLED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  FALLING: 'FALLING',
} as const

export const TICKET_STATUS_LABELS = {
  [TICKET_STATUS.WAITING]: 'En Espera',
  [TICKET_STATUS.CALLED]: 'Llamado',
  [TICKET_STATUS.IN_PROGRESS]: 'En Atención',
  [TICKET_STATUS.COMPLETED]: 'Completado',
  [TICKET_STATUS.CANCELLED]: 'Cancelado',
  [TICKET_STATUS.FALLING]: 'Cayendo',
} as const

export const TICKET_STATUS_COLORS = {
  [TICKET_STATUS.WAITING]: 'warning',
  [TICKET_STATUS.CALLED]: 'success',
  [TICKET_STATUS.IN_PROGRESS]: 'primary',
  [TICKET_STATUS.COMPLETED]: 'secondary',
  [TICKET_STATUS.CANCELLED]: 'danger',
  [TICKET_STATUS.FALLING]: 'danger',
} as const

export const PHONE_VALIDATION = {
  MIN_LENGTH: 9,
  MAX_LENGTH: 9,
  START_WITH: '9',
} as const

export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const

export const REFRESH_INTERVALS = {
  TICKETS: 5000,
  TIME: 1000,
} as const

// 🕐 CONFIGURACIÓN DE INACTIVIDAD Y SESIÓN
export const SESSION_CONFIG = {
  INACTIVITY_TIMEOUT: 2 * 60 * 60 * 1000, // 2 horas en milisegundos
  WARNING_TIME: 5 * 60 * 1000, // 5 minutos antes del timeout para mostrar advertencia
  CHECK_INTERVAL: 60 * 1000, // Verificar cada minuto
} as const