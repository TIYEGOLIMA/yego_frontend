// Configuración específica para RatingTablet (microfrontend)

// 🌐 CONFIGURACIÓN DE API PARA RATINGTABLET - BACKEND JAVA 
export const API_BASE_URL = import.meta.env.VITE_AGENT_API_URL || 'https://api-int.yego.pro/api/ticketera'

// 📱 CONFIGURACIÓN ESPECÍFICA PARA RATING TABLET
export const RATING_TABLET_CONFIG = {
  MIN_RATING: 1,
  MAX_RATING: 5,
  SHOW_COMMENTS: true,
  AUTO_SUBMIT_DELAY: 3000,
  RATING_COLORS: {
    1: '#ef4444', // Rojo
    2: '#f97316', // Naranja
    3: '#fbbf24', // Amarillo
    4: '#22c55e', // Verde claro
    5: '#10b981', // Verde
  },
  RATING_MESSAGES: {
    1: '😞 Muy insatisfecho',
    2: '😕 Insatisfecho',
    3: '😐 Regular',
    4: '😊 Satisfecho',
    5: '😍 Muy satisfecho',
  },
  UI: {
    LARGE_STARS: true,
    SHOW_EMOJIS: true,
    TOUCH_FRIENDLY: true,
  }
} as const

export const RATING_REFRESH_INTERVALS = {
  CHECK_TICKETS: 10000, // Verificar tickets cada 10 segundos
  AUTO_RESET: 30000,    // Reset automático después de 30 segundos
} as const
