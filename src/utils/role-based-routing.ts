// 🎭 SISTEMA DE RUTEO BASADO EN ROLES
// Sistema dinámico para redirección basada en roles y módulos disponibles

export interface Module {
  id: number;
  nombre: string;
  descripcion?: string;
  url: string;
  estado: string;
  ultimoCheck?: string;
  activo: boolean;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  icono?: string;
  grupo?: {
    id: number;
    nombre: string;
    icono?: string;
    activo?: boolean;
    fechaCreacion?: string;
  } | null;
}

/**
 * Normalizar URL para asegurar que comience con /
 */
const normalizeUrl = (url?: string): string => {
  if (!url) return '/';
  return url.startsWith('/') ? url : `/${url}`;
};

/**
 * Determinar ruta de redirección según rol y módulos disponibles
 * Prioridad: 1) Verificar si el rol tiene módulos disponibles, 2) Roles especiales con rutas fijas, 3) Vista de bienvenida
 */
export const getRedirectPathForRole = (role: string, modules?: Module[]): string => {
  const roleUpper = role?.toUpperCase();
  
  // Roles especiales con rutas fijas (TV, TABLET1, TABLET2, PRINCIPAL) - NO TOCAR
  switch (roleUpper) {
    case 'PRINCIPAL':
      return '/tablet-interface';
    case 'TABLET1':
    case 'TABLET2':
      return '/rating-tablet';
    case 'TV':
      return '/tv-display';
  }
  
  // Para todos los demás roles, usar el primer módulo activo disponible
  if (modules && modules.length > 0) {
    const activeModules = modules.filter(m => m.activo);
    
    if (activeModules.length > 0) {
      // Priorizar dashboard si existe
      const dashboardModule = activeModules.find(m => {
        const name = m.nombre?.toLowerCase() || '';
        const url = m.url?.toLowerCase() || '';
        return name.includes('dashboard') || url.includes('dashboard');
      });
      
      if (dashboardModule) {
        return normalizeUrl(dashboardModule.url);
      }
      
      // Usar el primer módulo activo
      return normalizeUrl(activeModules[0].url);
    }
  }
  
  // Fallback: vista de bienvenida
  return '/';
};

/**
 * Mapeo completo de roles para referencia
 */
export const COMPLETE_ROLE_MAPPING = {
  'PRINCIPAL': {
    description: 'Interfaz principal para creación de tickets',
    permissions: ['CREATE_TICKETS', 'VIEW_QUEUE'],
    fullscreen: true,
    component: 'TabletInterface'
  },
  'TABLET1': {
    description: 'Tablet de calificación #1',
    permissions: ['RATE_SERVICE'],
    fullscreen: true,
    component: 'RatingTablet'
  },
  'TABLET2': {
    description: 'Tablet de calificación #2', 
    permissions: ['RATE_SERVICE'],
    fullscreen: true,
    component: 'RatingTablet'
  },
  'TV': {
    description: 'Pantalla de TV para visualización',
    permissions: ['VIEW_DISPLAY'],
    fullscreen: true,
    component: 'TVDisplay'
  }
} as const;

/**
 * Determinar si un rol debe usar pantalla completa
 */
export const shouldUseFullscreen = (role: string): boolean => {
  const roleConfig = COMPLETE_ROLE_MAPPING[role as keyof typeof COMPLETE_ROLE_MAPPING];
  return roleConfig?.fullscreen || false;
};
