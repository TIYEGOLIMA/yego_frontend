// 🎫 SISTEMA TICKETERA - Entry Point
// Sistema completo de gestión de tickets y colas

// 🎯 MÓDULOS DEL SISTEMA TICKETERA
export { default as AgentPanel } from './agentpanel/AgentPanel'
export { default as TVDisplay } from './tvdisplay/TVDisplay' 
export { default as RatingTablet } from './ratingtablet/RatingTablet'
export { default as TabletInterface } from './tabletinterface/TabletInterface'
export { default as Reports } from './reports/Reports'

// 🔧 HOOKS ESPECÍFICOS DE TICKETERA
export { useAgentPanel } from './agentpanel/hooks/useAgentPanel'
export { useTVDisplay } from './tvdisplay/hooks/useTVDisplay'
export { useRatingTablet } from './ratingtablet/hooks/useRatingTablet'
export { useTabletInterfaceWebSocket } from './tabletinterface/hooks/useWebSocket'


export const TICKETERA_CONFIG = {
  SYSTEM_NAME: 'Ticketera',
  VERSION: '1.0.0',
  MODULES: {
    AGENT_PANEL: {
      name: 'Panel de Agentes',
      path: '/agent-panel',
      requiresAuth: true,
      roles: ['OPERADOR', 'SAC', 'SUPERADMIN', 'TV', 'PRINCIPAL', 'TABLET1', 'TABLET2'],
      description: 'Sistema de gestión de tickets para operadores'
    },
    TV_DISPLAY: {
      name: 'Pantalla TV',
      path: '/tv',
      requiresAuth: false,
      roles: [],
      description: 'Pantalla de visualización para clientes'
    },
    RATING_TABLET: {
      name: 'Tablet de Calificación',
      path: '/rating',
      requiresAuth: false,
      roles: [],
      description: 'Sistema de calificación de servicios'
    },
    TABLET_INTERFACE: {
      name: 'Interfaz Tablet',
      path: '/tablet',
      requiresAuth: false,
      roles: [],
      description: 'Interfaz táctil para creación de tickets'
    },
    REPORTS: {
      name: 'Reportes',
      path: '/reports',
      requiresAuth: true,
      roles: ['OPERADOR'],
      description: 'Sistema de reportes y estadísticas'
    }
  }
} as const

export type TicketeraModuleKey = keyof typeof TICKETERA_CONFIG.MODULES

// 🔧 Helper para obtener configuración de módulo
export const getTicketeraModuleConfig = (key: TicketeraModuleKey) => {
  return TICKETERA_CONFIG.MODULES[key]
}

// 🔧 Helper para validar acceso a módulo
export const canAccessTicketeraModule = (key: TicketeraModuleKey, userRole?: string) => {
  const moduleConfig = TICKETERA_CONFIG.MODULES[key]
  if (!moduleConfig.requiresAuth) return true
  if (!userRole) return false
  return moduleConfig.roles.includes(userRole as any)
}
