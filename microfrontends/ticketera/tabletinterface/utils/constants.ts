// Configuración específica para TabletInterface (microfrontend)
// Las constantes base se importan desde shared
import { PHONE_VALIDATION } from '../../shared'

// 🌐 CONFIGURACIÓN DE API PARA TABLETINTERFACE - BACKEND JAVA
export const API_BASE_URL = 'http://localhost:3030/api/ticketera'

// 📱 CONFIGURACIÓN ESPECÍFICA PARA TABLET INTERFACE
export const TABLET_INTERFACE_CONFIG = {
  ENABLE_TICKET_CREATION: true,
  ENABLE_PHONE_VALIDATION: true,
  AUTO_FOCUS_PHONE_INPUT: true,
  PHONE_VALIDATION,
  UI: {
    LARGE_BUTTONS: true,
    TOUCH_FRIENDLY: true,
    SHOW_VIRTUAL_KEYBOARD: true,
    HIGH_CONTRAST: false,
    AUTO_ADVANCE: true,
    SHOW_HELP_ICONS: true,
  },
  TICKET_CREATION: {
    MAX_RETRIES: 3,
    TIMEOUT_MS: 10000,
    AUTO_RESET_SECONDS: 60,
  }
} as const

export const TABLET_REFRESH_INTERVALS = {
  OPTIONS: 30000,     // Opciones cada 30 segundos
  STATUS: 5000,       // Estado cada 5 segundos
  DRIVERS: 60000,     // Conductores cada minuto
} as const
