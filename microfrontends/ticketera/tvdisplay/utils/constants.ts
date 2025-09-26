// Configuración específica para TVDisplay (microfrontend)

// 📺 CONFIGURACIÓN ESPECÍFICA PARA TV DISPLAY
export const TV_DISPLAY_CONFIG = {
  MAX_TICKETS_PER_SECTION: 10,
  REFRESH_INTERVAL: 5000, // 5 segundos
  AUTO_SCROLL_INTERVAL: 30000, // 30 segundos
  SHOW_DRIVER_NAMES: true,
  SOUND_ENABLED_DEFAULT: true,
  COLORS: {
    PRIMARY: '#1e40af',
    SECONDARY: '#64748b',
    SUCCESS: '#059669',
    WARNING: '#d97706',
    ERROR: '#dc2626',
    BACKGROUND: '#f8fafc',
  },
  SOUNDS: {
    NEW_TICKET: '/sounds/new-ticket.mp3',
    TICKET_CALLED: '/sounds/ticket-called.mp3',
    TICKET_COMPLETED: '/sounds/ticket-completed.mp3',
    TICKET_CANCELLED: '/sounds/ticket-cancelled.mp3',
  },
  SOUND_ENABLED: true,
} as const

export const TV_REFRESH_INTERVALS = {
  TICKETS: 5000,      // Actualizar tickets cada 5 segundos
  STATS: 15000,       // Estadísticas cada 15 segundos
  SCROLL: 30000,      // Auto-scroll cada 30 segundos
  CONNECTION: 10000,  // Verificar conexión cada 10 segundos
} as const
