// 🏢 ARQUITECTURA EMPRESARIAL DE MICROFRONTENDS
// Entry point principal para todos los sistemas empresariales

// 🌐 SHARED GLOBAL - Disponible para todos los sistemas
export {
  GLOBAL_CONFIG,
  GLOBAL_THEME,
  AUTH_CONFIG,
  DEVICE_CONFIG,
  I18N_CONFIG,
  BaseButton,
  BaseLoader
} from './shared'

export type {
  BaseUser,
  AuthContext,
  DeviceInfo,
  ButtonVariant,
  ButtonSize,
  AlertType,
  LoadingState,
  OperationState,
  ApiResponse,
  PaginatedResponse,
  FilterOptions,
  FormField,
  SystemConfig
} from './shared'

// 🎫 SISTEMA TICKETERA - Gestión de tickets y colas
export {
  AgentPanel,
  TVDisplay,
  RatingTablet,
  TabletInterface,
  useAgentPanel,
  useTVDisplay,
  useRatingTablet,
  useTabletInterfaceWebSocket,
  TICKETERA_CONFIG,
  getTicketeraModuleConfig,
  canAccessTicketeraModule
} from './ticketera'

export type { TicketeraModuleKey } from './ticketera'

// 🎯 SISTEMA OKR - Objetivos y Resultados Clave (preparado para futuro)
// export {
//   OKRDashboard,
//   GoalsManager,
//   ReportsViewer,
//   TeamMetrics,
//   useOKRDashboard,
//   useGoalsManager,
//   OKR_CONFIG,
//   getOKRModuleConfig,
//   canAccessOKRModule
// } from './okr'

// export type { OKRModuleKey } from './okr'

// 🏪 SISTEMA CRM - Gestión de Clientes (preparado para futuro)
// export {
//   CustomerDashboard,
//   SalesPanel,
//   ContactManager,
//   useCRMDashboard,
//   CRM_CONFIG
// } from './crm'

// 🏢 CONFIGURACIÓN EMPRESARIAL GENERAL
export const ENTERPRISE_CONFIG = {
  SYSTEMS: {
    TICKETERA: {
      name: 'Sistema de Tickets',
      path: '/ticketera',
      version: '1.0.0',
      status: 'active',
      description: 'Sistema completo de gestión de tickets y colas de atención',
      modules: ['agentpanel', 'tvdisplay', 'ratingtablet', 'tabletinterface']
    },
    OKR: {
      name: 'Sistema de OKRs',
      path: '/okr',
      version: '0.1.0',
      status: 'planned',
      description: 'Sistema de objetivos y resultados clave',
      modules: ['dashboard', 'goals', 'metrics', 'reports']
    },
    HR: {
      name: 'Sistema de RRHH',
      path: '/hr',
      version: '0.1.0', 
      status: 'planned',
      description: 'Sistema de gestión de recursos humanos',
      modules: ['employees', 'payroll', 'attendance', 'benefits']
    },
    CRM: {
      name: 'Sistema CRM',
      path: '/crm',
      version: '0.1.0',
      status: 'planned',
      description: 'Sistema de gestión de relaciones con clientes',
      modules: ['contacts', 'leads', 'sales', 'support']
    }
  },
  METADATA: {
    company: 'Yego',
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    architecture: 'microfrontends',
    framework: 'react-typescript'
  }
} as const

export type SystemKey = keyof typeof ENTERPRISE_CONFIG.SYSTEMS

// 🔧 Helpers para gestión empresarial
export const getSystemConfig = (systemKey: SystemKey) => {
  return ENTERPRISE_CONFIG.SYSTEMS[systemKey]
}

export const getActiveSystems = () => {
  return Object.entries(ENTERPRISE_CONFIG.SYSTEMS)
    .filter(([_, config]) => config.status === 'active')
    .map(([key, config]) => ({ key: key as SystemKey, ...config }))
}

export const getPlannedSystems = () => {
  return Object.entries(ENTERPRISE_CONFIG.SYSTEMS)
    .filter(([_, config]) => config.status === 'planned')
    .map(([key, config]) => ({ key: key as SystemKey, ...config }))
}