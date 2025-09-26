// 🏢 SERVICIOS PRINCIPALES - ENTRY POINT UNIFICADO
// Punto de entrada para todos los servicios del sistema empresarial

// 🌐 SERVICIOS GLOBALES
export { default as SocketService } from './socket-service';

// Importaciones internas para usar en las funciones de este archivo
import {
  initializeUserSystem,
  systemIntegration
} from './core';

// 🏢 SERVICIOS PRINCIPALES (CORE)
export {
  // API y Auth principales
  api,
  authService,
  
  // Gestión de microfrontends
  microfrontendService,
  
  // Dashboard del sistema principal
  dashboardService,
  
  // Sistema de integración
  systemRegistry,
  systemIntegration,
  
  // Funciones de conveniencia para integración
  initializeUserSystem,
  switchActiveSystem,
  getCurrentSystemState,
  getSystemNavigation,
  onSystemEvent,
  
  // Funciones de conveniencia para registry
  getAvailableSystems,
  getActiveSystem,
  activateSystem,
  getSystemsForUser,
  canUserAccessSystem,
  
  // Tipos
  type UserContext,
  type SystemNavigation,
  type IntegrationState,
  type SystemInfo,
  type SystemIntegrationConfig,
  
  // Tipos de dashboard
  type DashboardMetrics,
  type RecentActivity,
  type SystemStatus,
  type WeeklyStats,
  type DashboardData
} from './core';

// 🎫 SERVICIOS DE TICKETERA
export {
  TICKETERA_SERVICE_CONFIG
} from './ticketera';

// 🎯 SERVICIOS DE OKR (PREPARADO PARA FUTURO)
// export * from './okr';

// 🏪 SERVICIOS DE CRM (PREPARADO PARA FUTURO)  
// export * from './crm';

// 🎯 FUNCIÓN PRINCIPAL DE INICIALIZACIÓN DEL SISTEMA
export const initializeEnterpriseSystems = async (user: {
  id: number;
  username: string;
  role: string;
  email: string;
  name: string;
}) => {
  console.log('🚀 Inicializando sistemas empresariales...');
  
  try {
    // 1. Inicializar usuario en el sistema de integración
    const result = await initializeUserSystem({
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
      name: user.name
    });

    if (!result.success) {
      throw new Error('No se pudo inicializar el usuario en los sistemas');
    }
    
    console.log('✅ Sistemas empresariales inicializados');
    console.log(`👤 Usuario: ${user.username}`);
    console.log(`🏢 Sistema asignado: ${result.systemAssigned}`);
    console.log(`🎯 Módulo asignado: ${result.moduleAssigned}`);
    console.log(`🌐 Ruta: ${result.redirectPath}`);

    return {
      success: true,
      system: result.systemAssigned,
      module: result.moduleAssigned,
      redirectTo: result.redirectPath,
      availableSystems: result.availableSystems?.map((s: any) => s.name) || []
    };

  } catch (error) {
    console.error('❌ Error inicializando sistemas:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      redirectTo: '/dashboard'
    };
  }
};

// 🧹 FUNCIÓN DE CLEANUP AL LOGOUT
export const cleanupEnterpriseSystems = () => {
  console.log('🧹 Limpiando sistemas empresariales...');
  systemIntegration.cleanup();
  console.log('✅ Sistemas empresariales limpiados');
};
