// 📱 RATINGTABLET MICROFRONTEND - Entry Point
export { default as RatingTablet } from './RatingTablet'
export { useRatingTablet } from './hooks/useRatingTablet'
export { useRatingWebSocket } from './hooks/useWebSocket'
export * from './types'
export * from './services'

// 📱 CONSTANTES ESPECÍFICAS PARA RATING TABLET (inline para evitar errores de import)
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
