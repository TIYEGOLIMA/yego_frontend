// 🎭 SISTEMA DE RUTEO BASADO EN ROLES
// Ejemplo de implementación para cargar módulos automáticamente según el rol del usuario

import { microfrontendService } from '../services';
import { 
  getSystemFromRole,
  getModuleFromRole
} from '../config/microfrontends';

export interface UserSession {
  id: number;
  username: string;
  role: string;
  email: string;
  name: string;
}

/**
 * 🎯 EJEMPLOS DE USO DEL SISTEMA DE ROLES
 */

// 🎯 EJEMPLO 1: Inicialización automática inteligente (NUEVA VERSIÓN)
export const initializeUserSession = async (user: UserSession) => {
  console.log(`🚀 Inicializando sesión para usuario: ${user.username} (Rol: ${user.role})`);

  // 🎯 AUTO-DETECCIÓN: El sistema automáticamente detecta:
  // 'OPERADOR' → Sistema: ticketera, Módulo: agentpanel
  // 'PRINCIPAL' → Sistema: ticketera, Módulo: tabletinterface  
  // 'TV' → Sistema: ticketera, Módulo: tvdisplay
  // 'OKR_CEO' → Sistema: okr, Módulo: dashboard (futuro)

  const initResult = await microfrontendService.autoInitializeUser(user.role);

  if (!initResult.success) {
    throw new Error(`No se pudo inicializar el sistema para el rol '${user.role}'`);
  }

  console.log(`✅ Sistema inicializado automáticamente:`, {
    usuario: user.username,
    rol: user.role,
    sistemaDetectado: initResult.systemName,
    moduloCargado: initResult.moduleName,
    rutaRedireccion: initResult.redirectPath
  });

  return {
    ...initResult,
    user: {
      ...user,
      assignedSystem: initResult.systemName,
      assignedModule: initResult.moduleName
    }
  };
};

// Ejemplo 2: Determinar ruta de redirección según rol (LEGACY - usar autoInitializeUser)
export const getRedirectPathForRole = (role: string): string => {
  switch (role?.toUpperCase()) {
    case 'PRINCIPAL':
      return '/ticketera/tabletinterface';
    case 'OPERADOR': 
      return '/ticketera/agentpanel';
    case 'TABLET1':
    case 'TABLET2':
      return '/ticketera/ratingtablet';
    case 'TV':
      return '/ticketera/tvdisplay';
    default:
      console.warn(`⚠️ Rol '${role}' no tiene ruta configurada, redirigiendo al dashboard`);
      return '/dashboard';
  }
};

// Ejemplo 3: Middleware de verificación de acceso
export const checkModuleAccess = (userRole: string, requestedModule: string): boolean => {
  return microfrontendService.canUserAccessModule(userRole, requestedModule);
};

// Ejemplo 4: Obtener configuración completa del usuario
export const getUserModuleConfiguration = (role: string) => {
  const systemName = getSystemFromRole(role);
  const moduleName = getModuleFromRole(role);
  
  if (!systemName || !moduleName) {
    return null;
  }

  const defaultPath = getRedirectPathForRole(role);

  return {
    role,
    defaultModule: moduleName,
    allowedModules: [moduleName], // Simplificado: cada rol tiene un módulo específico
    defaultPath,
    canSwitchModules: false // Simplificado: sin cambio de módulos por ahora
  };
};

// 🎯 MAPEO COMPLETO DE ROLES PARA REFERENCIA
export const COMPLETE_ROLE_MAPPING = {
  'PRINCIPAL': {
    module: 'tabletinterface',
    path: '/ticketera/tabletinterface',
    description: 'Interfaz principal para creación de tickets',
    permissions: ['CREATE_TICKETS', 'VIEW_QUEUE']
  },
  'OPERADOR': {
    module: 'agentpanel', 
    path: '/ticketera/agentpanel',
    description: 'Panel de operador para gestión de tickets',
    permissions: ['MANAGE_TICKETS', 'CALL_TICKETS', 'COMPLETE_TICKETS']
  },
  'TABLET1': {
    module: 'ratingtablet',
    path: '/ticketera/ratingtablet', 
    description: 'Tablet de calificación #1',
    permissions: ['RATE_SERVICE']
  },
  'TABLET2': {
    module: 'ratingtablet',
    path: '/ticketera/ratingtablet',
    description: 'Tablet de calificación #2', 
    permissions: ['RATE_SERVICE']
  },
  'TV': {
    module: 'tvdisplay',
    path: '/ticketera/tvdisplay',
    description: 'Pantalla de TV para visualización',
    permissions: ['VIEW_DISPLAY']
  }
} as const;

// Ejemplo 5: Hook de React para manejo de roles (pseudo-código)
export const createRoleBasedHook = () => {
  return {
    // Función para usar en un hook de React
    useRoleBasedModule: (userRole: string) => {
      // Este sería el código dentro de un hook personalizado
      const moduleConfig = getUserModuleConfiguration(userRole);
      const canAccess = (module: string) => checkModuleAccess(userRole, module);
      const switchModule = async (targetModule: string) => {
        return microfrontendService.switchModuleForRole(userRole, targetModule);
      };

      return {
        moduleConfig,
        canAccess,
        switchModule,
        availableModules: moduleConfig?.allowedModules || []
      };
    }
  };
};

// 🎯 EJEMPLOS DE IMPLEMENTACIÓN EN COMPONENTES

/*
// Ejemplo en un componente de Dashboard:

import { getUserModuleConfiguration, initializeUserSession } from '../utils/role-based-routing';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
  useEffect(() => {
    if (user?.role) {
      // Inicializar sistema automáticamente
      initializeUserSession(user);
      
      // Obtener configuración del módulo
      const config = getUserModuleConfiguration(user.role);
      console.log('Configuración del usuario:', config);
    }
  }, [user]);

  // ... resto del componente
};

// Ejemplo en un guard de ruta:

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  
  // Extraer módulo de la URL (e.g., '/ticketera/agentpanel' → 'agentpanel')
  const requestedModule = location.pathname.split('/').pop();
  
  if (requestedModule && !checkModuleAccess(user.role, requestedModule)) {
    // Redirigir al módulo correcto para su rol
    const correctPath = getRedirectPathForRole(user.role);
    return <Navigate to={correctPath} replace />;
  }
  
  return <>{children}</>;
};

*/

// 🎯 EJEMPLO FINAL: Función de login completa
export const handleUserLogin = async (loginResponse: { user: UserSession }) => {
  try {
    const { user } = loginResponse;
    
    console.log(`🚪 Usuario logueado: ${user.username} con rol: ${user.role}`);
    
    // 🎯 DETECCIÓN AUTOMÁTICA (sin prefijos, solo rol)
    const systemDetected = getSystemFromRole(user.role);
    const moduleDetected = getModuleFromRole(user.role);
    
    console.log(`🎯 Auto-detectado: ${user.role} → Sistema: ${systemDetected}, Módulo: ${moduleDetected}`);
    
    // 🚀 INICIALIZACIÓN AUTOMÁTICA
    const initResult = await initializeUserSession(user);
    
    // ✅ RESULTADO: Redirigir automáticamente
    if (initResult.success && initResult.redirectPath) {
      console.log(`✅ Redirigiendo a: ${initResult.redirectPath}`);
      return {
        success: true,
        redirectTo: initResult.redirectPath,
        system: initResult.systemName,
        module: initResult.moduleName,
        userConfig: initResult.userConfig
      };
    }
    
    throw new Error('No se pudo determinar la ruta de redirección');
    
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

// 🎯 MAPEO VISUAL PARA REFERENCIA
export const ROLE_SYSTEM_EXAMPLES = {
  // 🎫 SISTEMA TICKETERA - Roles actuales
  'OPERADOR': 'ticketera/agentpanel → Panel de gestión de tickets',
  'PRINCIPAL': 'ticketera/tabletinterface → Creación de tickets', 
  'TABLET1': 'ticketera/ratingtablet → Calificación #1',
  'TABLET2': 'ticketera/ratingtablet → Calificación #2',
  'TV': 'ticketera/tvdisplay → Pantalla de visualización',
  
  // 🎯 SISTEMA OKR - Futuro
  'OKR_CEO': 'okr/dashboard → Dashboard ejecutivo',
  'OKR_MANAGER': 'okr/goals → Gestión de objetivos',
  'OKR_ANALYST': 'okr/reports → Análisis y reportes',
  
  // 🏪 SISTEMA CRM - Futuro  
  'CRM_SALES_MANAGER': 'crm/dashboard → Dashboard de ventas',
  'CRM_SALES_REP': 'crm/sales → Panel de vendedor',
  'CRM_SUPPORT': 'crm/contacts → Gestión de contactos'
} as const;

export default {
  initializeUserSession,
  getRedirectPathForRole,
  checkModuleAccess,
  getUserModuleConfiguration,
  createRoleBasedHook,
  handleUserLogin,
  COMPLETE_ROLE_MAPPING,
  ROLE_SYSTEM_EXAMPLES
};
