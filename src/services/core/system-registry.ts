// 🏢 REGISTRO PRINCIPAL DE SISTEMAS EMPRESARIALES
// Coordina la integración entre el sistema principal y todos los subsistemas

import { ENTERPRISE_SYSTEMS } from '../../config/microfrontends';

export interface SystemInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  isAvailable: boolean;
  isActive: boolean;
  modules: string[];
  entryPoint: string;
  routes: string[];
}

export interface SystemIntegrationConfig {
  // Configuración de cada sistema
  systems: Record<string, SystemInfo>;
  // Estado global compartido entre sistemas
  sharedState: {
    user: any;
    theme: string;
    language: string;
    notifications: any[];
  };
  // Servicios compartidos
  sharedServices: {
    socket: any;
    auth: any;
    api: any;
  };
}

/**
 * 🎯 REGISTRO CENTRAL DE SISTEMAS
 * Mantiene el estado y configuración de todos los sistemas disponibles
 */
export class SystemRegistry {
  private static instance: SystemRegistry;
  private systems: Map<string, SystemInfo> = new Map();
  private activeSystem: string | null = null;
  private integrationConfig: SystemIntegrationConfig;

  private constructor() {
    this.integrationConfig = {
      systems: {},
      sharedState: {
        user: null,
        theme: 'light',
        language: 'es',
        notifications: []
      },
      sharedServices: {
        socket: null,
        auth: null,
        api: null
      }
    };
    this.initializeSystems();
  }

  public static getInstance(): SystemRegistry {
    if (!SystemRegistry.instance) {
      SystemRegistry.instance = new SystemRegistry();
    }
    return SystemRegistry.instance;
  }

  /**
   * 🚀 INICIALIZAR SISTEMAS DESDE CONFIGURACIÓN
   */
  private initializeSystems() {
    console.log('🏗️ Inicializando registro de sistemas...');

    Object.entries(ENTERPRISE_SYSTEMS).forEach(([systemId, systemConfig]) => {
      const systemInfo: SystemInfo = {
        id: systemId,
        name: systemConfig.name,
        description: systemConfig.description,
        version: '1.0.0', // Versión por defecto
        isAvailable: true, // Todos están disponibles por defecto
        isActive: false,
        modules: Object.keys(systemConfig.modules),
        entryPoint: `/${systemId}`,
        routes: Object.values(systemConfig.modules).map(module => module.path)
      };

      this.systems.set(systemId, systemInfo);
      console.log(`✅ Sistema registrado: ${systemConfig.name} (${systemId})`);
    });

    console.log(`🎯 Total de sistemas registrados: ${this.systems.size}`);
  }

  /**
   * 📋 OBTENER TODOS LOS SISTEMAS DISPONIBLES
   */
  public getAvailableSystems(): SystemInfo[] {
    return Array.from(this.systems.values()).filter(system => system.isAvailable);
  }

  /**
   * 🎯 OBTENER SISTEMA ESPECÍFICO
   */
  public getSystem(systemId: string): SystemInfo | null {
    return this.systems.get(systemId) || null;
  }

  /**
   * 🔄 ACTIVAR SISTEMA
   */
  public activateSystem(systemId: string, user?: any): boolean {
    const system = this.systems.get(systemId);
    if (!system || !system.isAvailable) {
      console.error(`❌ Sistema '${systemId}' no disponible`);
      return false;
    }

    // Desactivar sistema anterior
    if (this.activeSystem) {
      const previousSystem = this.systems.get(this.activeSystem);
      if (previousSystem) {
        previousSystem.isActive = false;
      }
    }

    // Activar nuevo sistema
    system.isActive = true;
    this.activeSystem = systemId;
    
    // Actualizar estado compartido
    if (user) {
      this.integrationConfig.sharedState.user = user;
    }

    console.log(`🎯 Sistema activado: ${system.name} (${systemId})`);
    return true;
  }

  /**
   * 📊 OBTENER SISTEMA ACTIVO
   */
  public getActiveSystem(): SystemInfo | null {
    return this.activeSystem ? this.systems.get(this.activeSystem) || null : null;
  }

  /**
   * 🌐 CONFIGURAR SERVICIOS COMPARTIDOS
   */
  public setSharedServices(services: {
    socket?: any;
    auth?: any;
    api?: any;
  }) {
    this.integrationConfig.sharedServices = {
      ...this.integrationConfig.sharedServices,
      ...services
    };
    console.log('🔧 Servicios compartidos configurados');
  }

  /**
   * 🔄 OBTENER SERVICIOS COMPARTIDOS
   */
  public getSharedServices() {
    return this.integrationConfig.sharedServices;
  }

  /**
   * 👤 OBTENER SISTEMAS PARA UN USUARIO ESPECÍFICO
   */
  public getSystemsForUser(userRole: string): SystemInfo[] {
    // Determinar qué sistemas puede acceder según su rol
    const availableSystems = this.getAvailableSystems();
    
    // Por ahora, filtrar basado en el rol
    return availableSystems.filter(system => {
      // Si el rol contiene el nombre del sistema, puede acceder
      const roleUpper = userRole.toUpperCase();
      const systemUpper = system.id.toUpperCase();
      
      // Roles legacy de ticketera
      if (['OPERADOR', 'PRINCIPAL', 'TABLET1', 'TABLET2', 'TV'].includes(roleUpper)) {
        return system.id === 'ticketera';
      }
      
      // Roles con prefijo del sistema
      if (roleUpper.startsWith(systemUpper + '_')) {
        return true;
      }
      
      return false;
    });
  }

  /**
   * 📈 OBTENER ESTADÍSTICAS
   */
  public getSystemStats() {
    const systems = Array.from(this.systems.values());
    return {
      total: systems.length,
      available: systems.filter(s => s.isAvailable).length,
      active: systems.filter(s => s.isActive).length,
      totalModules: systems.reduce((acc, s) => acc + s.modules.length, 0),
      systems: systems.map(s => ({
        id: s.id,
        name: s.name,
        modules: s.modules.length,
        isActive: s.isActive
      }))
    };
  }

  /**
   * 🔍 VERIFICAR SI UN USUARIO PUEDE ACCEDER A UN SISTEMA
   */
  public canUserAccessSystem(userRole: string, systemId: string): boolean {
    const userSystems = this.getSystemsForUser(userRole);
    return userSystems.some(system => system.id === systemId);
  }

  /**
   * 🎯 OBTENER RUTAS DE UN SISTEMA
   */
  public getSystemRoutes(systemId: string): string[] {
    const system = this.systems.get(systemId);
    return system?.routes || [];
  }

  /**
   * 🧹 RESETEAR ESTADO
   */
  public reset() {
    this.systems.forEach(system => {
      system.isActive = false;
    });
    this.activeSystem = null;
    this.integrationConfig.sharedState.user = null;
    console.log('🧹 Registry reseteado');
  }
}

// 🌟 INSTANCIA SINGLETON
export const systemRegistry = SystemRegistry.getInstance();

// 🎯 FUNCIONES DE CONVENIENCIA
export const getAvailableSystems = () => systemRegistry.getAvailableSystems();
export const getActiveSystem = () => systemRegistry.getActiveSystem();
export const activateSystem = (systemId: string, user?: any) => systemRegistry.activateSystem(systemId, user);
export const getSystemsForUser = (userRole: string) => systemRegistry.getSystemsForUser(userRole);
export const canUserAccessSystem = (userRole: string, systemId: string) => 
  systemRegistry.canUserAccessSystem(userRole, systemId);
