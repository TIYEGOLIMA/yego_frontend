// 🎭 SISTEMA DE RUTEO BASADO EN ROLES
// Sistema simplificado para redirección basada en roles

export interface UserSession {
  id: number;
  username: string;
  role: string;
  email: string;
  name: string;
}

/**
 * Determinar ruta de redirección según rol
 */
export const getRedirectPathForRole = (role: string): string => {
  switch (role?.toUpperCase()) {
    case 'SUPERADMIN':
    case 'ADMIN':
      return '/dashboard'; // Dashboard principal para administradores
    case 'PRINCIPAL':
      return '/tablet-interface'; // TabletInterface maximizado
    case 'OPERADOR': 
      return '/reports'; // Panel de reportes para operador
    case 'SAC': 
      return '/tickets'; // Panel de SAC
    case 'TABLET1':
      return '/rating-tablet'; // RatingTablet #1 maximizada
    case 'TABLET2':
      return '/rating-tablet'; // RatingTablet #2 maximizada
    case 'TV':
      return '/tv-display'; // TV Display maximizado por defecto
    default:
      console.warn(`⚠️ Rol '${role}' no tiene ruta configurada, redirigiendo al dashboard`);
      return '/dashboard';
  }
};

/**
 * Mapeo completo de roles para referencia
 */
export const COMPLETE_ROLE_MAPPING = {
  'SUPERADMIN': {
    description: 'Administrador del sistema con acceso completo',
    permissions: ['ALL_PERMISSIONS'],
    fullscreen: false,
    component: 'MainLayout'
  },
  'ADMIN': {
    description: 'Administrador con acceso completo',
    permissions: ['ALL_PERMISSIONS'],
    fullscreen: false,
    component: 'MainLayout'
  },
  'PRINCIPAL': {
    description: 'Interfaz principal para creación de tickets',
    permissions: ['CREATE_TICKETS', 'VIEW_QUEUE'],
    fullscreen: true,
    component: 'TabletInterface'
  },
  'OPERADOR': {
    description: 'Panel de operador para gestión de tickets',
    permissions: ['MANAGE_TICKETS', 'CALL_TICKETS', 'COMPLETE_TICKETS'],
    fullscreen: false,
    component: 'TicketeraWrapper'
  },
  'SAC': {
    description: 'Panel de SAC para gestión de tickets',
    permissions: ['MANAGE_TICKETS', 'CALL_TICKETS', 'COMPLETE_TICKETS'],
    fullscreen: false,
    component: 'TicketeraWrapper'
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

/**
 * Obtener el componente específico para un rol
 */
export const getComponentForRole = (role: string): string => {
  const roleConfig = COMPLETE_ROLE_MAPPING[role as keyof typeof COMPLETE_ROLE_MAPPING];
  return roleConfig?.component || 'TicketeraWrapper';
};

/**
 * Obtener configuración del usuario basada en su rol
 */
export const getUserModuleConfiguration = (role: string) => {
  const defaultPath = getRedirectPathForRole(role);
  const roleConfig = COMPLETE_ROLE_MAPPING[role as keyof typeof COMPLETE_ROLE_MAPPING];

  if (!roleConfig) {
    return null;
  }

  return {
    role,
    defaultPath,
    description: roleConfig.description,
    permissions: roleConfig.permissions,
    fullscreen: roleConfig.fullscreen,
    component: roleConfig.component
  };
};

/**
 * Función de login simplificada
 */
export const handleUserLogin = async (loginResponse: { user: UserSession }) => {
  try {
    const { user } = loginResponse;
    
    console.log(`🚪 Usuario logueado: ${user.username} con rol: ${user.role}`);
    
    // Determinar ruta de redirección
    const redirectPath = getRedirectPathForRole(user.role);
    
    console.log(`✅ Redirigiendo a: ${redirectPath}`);
    
    return {
      success: true,
      redirectTo: redirectPath,
      userConfig: getUserModuleConfiguration(user.role)
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('❌ Error en login:', error);
    return {
      success: false,
      error: errorMessage,
      redirectTo: '/dashboard' // Fallback
    };
  }
};

export default {
  getRedirectPathForRole,
  getUserModuleConfiguration,
  handleUserLogin,
  shouldUseFullscreen,
  getComponentForRole,
  COMPLETE_ROLE_MAPPING
};