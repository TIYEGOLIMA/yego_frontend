// 🏗️ CONFIGURACIÓN SIMPLE DE MICROFRONTENDS

export interface MicrofrontendConfig {
  name: string;
  path: string;
  component: string;
  description: string;
}

export interface SystemConfig {
  name: string;
  description: string;
  modules: Record<string, MicrofrontendConfig>;
}

// 🏢 CONFIGURACIÓN DE SISTEMAS
export const ENTERPRISE_SYSTEMS: Record<string, SystemConfig> = {
  ticketera: {
    name: 'Ticketera',
    description: 'Sistema de gestión de tickets y colas de atención',
    modules: {
      agentpanel: {
        name: 'AgentPanel',
        path: '/ticketera/agentpanel',
        component: 'AgentPanelWrapper',
        description: 'Panel de gestión de tickets'
      },
      tvdisplay: {
        name: 'TVDisplay',
        path: '/ticketera/tvdisplay',
        component: 'TVDisplay',
        description: 'Pantalla de visualización'
      },
      ratingtablet: {
        name: 'RatingTablet',
        path: '/ticketera/ratingtablet',
        component: 'RatingTablet',
        description: 'Tablet de calificación'
      },
      tabletinterface: {
        name: 'TabletInterface',
        path: '/ticketera/tabletinterface',
        component: 'TabletInterface',
        description: 'Interfaz de creación de tickets'
      }
    }
  }
  
  // 🎯 FUTURO: Otros sistemas se agregan aquí
  // okr: { name: 'OKR', description: 'Objetivos y Resultados', modules: {...} }
};

// 🎯 MAPEO SIMPLE DE ROLES A MÓDULOS
export const ROLE_TO_MODULE: Record<string, { system: string; module: string }> = {
  'OPERADOR': { system: 'ticketera', module: 'agentpanel' },
  'PRINCIPAL': { system: 'ticketera', module: 'tabletinterface' },
  'TABLET1': { system: 'ticketera', module: 'ratingtablet' },
  'TABLET2': { system: 'ticketera', module: 'ratingtablet' },
  'TV': { system: 'ticketera', module: 'tvdisplay' }
  
  // 🎯 FUTURO: Cuando agreguemos OKR, CRM, etc.
  // 'OKR_CEO': { system: 'okr', module: 'dashboard' },
  // 'CRM_SALES': { system: 'crm', module: 'sales' }
};

// 🔄 COMPATIBILIDAD: Para código existente
export const microfrontends: Record<string, MicrofrontendConfig> = 
  ENTERPRISE_SYSTEMS.ticketera.modules;

// 🎯 FUNCIONES BÁSICAS

/**
 * Obtiene un microfrontend por nombre
 */
export const getMicrofrontend = (name: string): MicrofrontendConfig | null => {
  return microfrontends[name] || null;
};

/**
 * Obtiene todos los microfrontends disponibles
 */
export const getAllMicrofrontends = (): MicrofrontendConfig[] => {
  return Object.values(microfrontends);
};

/**
 * Obtiene sistema y módulo para un rol
 */
export const getSystemAndModule = (role: string): { system: string; module: string } | null => {
  return ROLE_TO_MODULE[role?.toUpperCase()] || null;
};

/**
 * Obtiene el sistema de un rol
 */
export const getSystemFromRole = (role: string): string | null => {
  const config = getSystemAndModule(role);
  return config?.system || null;
};

/**
 * Obtiene el módulo de un rol
 */
export const getModuleFromRole = (role: string): string | null => {
  const config = getSystemAndModule(role);
  return config?.module || null;
};

/**
 * Obtiene todos los sistemas disponibles
 */
export const getAllAvailableSystems = (): Array<{ id: string; name: string; description: string }> => {
  return Object.entries(ENTERPRISE_SYSTEMS).map(([id, config]) => ({
    id,
    name: config.name,
    description: config.description
  }));
};

/**
 * Obtiene el microfrontend específico para un rol
 */
export const getMicrofrontendByRole = (role: string): MicrofrontendConfig | null => {
  const config = getSystemAndModule(role);
  if (!config) return null;
  
  const system = ENTERPRISE_SYSTEMS[config.system];
  return system?.modules[config.module] || null;
};

/**
 * Verifica si un rol puede acceder a un sistema
 */
export const canRoleAccessSystem = (role: string, systemId: string): boolean => {
  const userSystem = getSystemFromRole(role);
  return userSystem === systemId;
};