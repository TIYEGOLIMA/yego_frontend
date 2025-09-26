// 🌐 CONSTANTES GLOBALES PARA TODOS LOS SISTEMAS
// Utilidades compartidas entre diferentes sistemas empresariales

// 🔧 CONFIGURACIÓN GLOBAL DE API
export const GLOBAL_CONFIG = {
  API_TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  POLLING_INTERVAL: 5000,
} as const

// 🎨 TEMA GLOBAL DE LA EMPRESA
export const GLOBAL_THEME = {
  COLORS: {
    PRIMARY: '#dc2626',      // Rojo empresa
    SECONDARY: '#64748b',    // Gris slate
    SUCCESS: '#059669',      // Verde
    WARNING: '#d97706',      // Amarillo/naranja
    ERROR: '#dc2626',        // Rojo error
    INFO: '#0284c7',         // Azul
    BACKGROUND: '#f8fafc',   // Fondo claro
    SURFACE: '#ffffff',      // Superficie
    TEXT_PRIMARY: '#1e293b', // Texto principal
    TEXT_SECONDARY: '#64748b', // Texto secundario
  },
  BREAKPOINTS: {
    SM: '640px',
    MD: '768px', 
    LG: '1024px',
    XL: '1280px',
    '2XL': '1536px',
  },
  SPACING: {
    XS: '0.25rem',
    SM: '0.5rem',
    MD: '1rem',
    LG: '1.5rem',
    XL: '2rem',
    '2XL': '3rem',
  }
} as const

// 🔒 CONFIGURACIÓN DE AUTENTICACIÓN GLOBAL
export const AUTH_CONFIG = {
  TOKEN_KEY: 'yego_auth_token',
  USER_KEY: 'yego_user_data',
  SESSION_TIMEOUT: 3600000, // 1 hora
  REFRESH_THRESHOLD: 300000, // 5 minutos antes de expirar
} as const

// 📱 CONFIGURACIÓN DE DISPOSITIVOS
export const DEVICE_CONFIG = {
  MOBILE_BREAKPOINT: 768,
  TABLET_BREAKPOINT: 1024,
  TOUCH_TARGET_SIZE: 44, // px mínimo para elementos táctiles
} as const

// 🌍 INTERNACIONALIZACIÓN
export const I18N_CONFIG = {
  DEFAULT_LOCALE: 'es-PE',
  SUPPORTED_LOCALES: ['es-PE', 'en-US'] as const,
  DATE_FORMAT: 'DD/MM/YYYY',
  TIME_FORMAT: 'HH:mm:ss',
} as const
