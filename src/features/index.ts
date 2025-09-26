// 🏢 FEATURES PRINCIPALES - ENTRY POINT UNIFICADO
// Punto de entrada para todas las features del sistema empresarial

// 🏢 FEATURES DEL SISTEMA PRINCIPAL (CORE)
export {
  AuditModule,
  ConfigurationModule,
  UsersModule,
  PermissionsModule,
  RolesModule,
  SessionsModule,
  ImportsModule,
  ReportsModule,
  ModulesModule,
  CORE_FEATURES_CONFIG
} from './core';

// 🎫 FEATURES DEL SISTEMA TICKETERA
export {
  TicketsModule,
  AgentPanelAdapted,
  TicketeraWrapper,
  TICKETERA_FEATURES_CONFIG
} from './ticketera';

// 🎯 FEATURES DE OKR (PREPARADO PARA FUTURO)
// export * from './okr';

// 🏪 FEATURES DE CRM (PREPARADO PARA FUTURO)  
// export * from './crm';

// 🎯 CONFIGURACIÓN GENERAL DE FEATURES
export const FEATURES_REGISTRY = {
  core: {
    name: 'Sistema Principal',
    path: '/features/core',
    features: ['audit', 'configuration', 'users', 'permissions', 'roles', 'sessions', 'imports', 'reports', 'modules']
  },
  ticketera: {
    name: 'Ticketera',
    path: '/features/ticketera',
    features: ['tickets']
  }
  
  // 🎯 FUTURO:
  // okr: {
  //   name: 'OKR System',
  //   path: '/features/okr', 
  //   features: ['goals', 'metrics', 'reports']
  // },
  // crm: {
  //   name: 'CRM System',
  //   path: '/features/crm',
  //   features: ['customers', 'sales', 'contacts']
  // }
} as const;

// 🎯 FUNCIONES HELPER PARA FEATURES
export const getFeaturesBySystem = (systemName: string) => {
  return FEATURES_REGISTRY[systemName as keyof typeof FEATURES_REGISTRY]?.features || [];
};

export const getAllSystemFeatures = () => {
  return Object.entries(FEATURES_REGISTRY).map(([system, config]) => ({
    system,
    name: config.name,
    features: config.features
  }));
};
