// 🎯 SHARED UTILITIES - Entry Point
// Exportar todas las utilidades compartidas entre microfrontends

// Constants and Configuration
export {
  API_BASE_URL,
  SOCKET_URL,
  TICKET_STATUS,
  TICKET_STATUS_COLORS,
  TICKET_STATUS_LABELS,
  PHONE_VALIDATION,
  REFRESH_INTERVALS,
  SESSION_CONFIG,
  SOUND_CONFIG
} from './utils/constants'

// Types  
export type { TicketStatus, TouchUIConfig, SoundConfig } from './types/index'

// UI Components
export {
  Button,
  Card,
  CardContent, 
  CardHeader,
  CardTitle,
  LoadingSpinner,
  ErrorMessage
} from './components/index'