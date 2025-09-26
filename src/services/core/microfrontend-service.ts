import { 
  MicrofrontendConfig, 
  getMicrofrontend,
  getMicrofrontendByRole,
  getSystemFromRole,
  getModuleFromRole,
  canRoleAccessSystem,
  getAllMicrofrontends
} from '../../config/microfrontends';

export class MicrofrontendService {
  private static instance: MicrofrontendService;
  private loadedMicrofrontends: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): MicrofrontendService {
    if (!MicrofrontendService.instance) {
      MicrofrontendService.instance = new MicrofrontendService();
    }
    return MicrofrontendService.instance;
  }

  /**
   * Carga un microfrontend específico
   */
  public async loadMicrofrontend(name: string): Promise<boolean> {
    try {
      const config = getMicrofrontend(name);
      if (!config) {
        console.error(`Microfrontend '${name}' no encontrado`);
        return false;
      }

      if (this.loadedMicrofrontends.has(name)) {
        console.log(`Microfrontend '${name}' ya está cargado`);
        return true;
      }

      console.log(`Cargando microfrontend: ${config.name}`);
      
      // Aquí se podría implementar la lógica de carga dinámica
      // Por ahora, simplemente marcamos como cargado
      this.loadedMicrofrontends.add(name);
      
      console.log(`Microfrontend '${name}' cargado exitosamente`);
      return true;
    } catch (error) {
      console.error(`Error cargando microfrontend '${name}':`, error);
      return false;
    }
  }

  /**
   * Verifica si un microfrontend está cargado
   */
  public isLoaded(name: string): boolean {
    return this.loadedMicrofrontends.has(name);
  }

  /**
   * Descarga un microfrontend
   */
  public unloadMicrofrontend(name: string): boolean {
    if (this.loadedMicrofrontends.has(name)) {
      this.loadedMicrofrontends.delete(name);
      console.log(`Microfrontend '${name}' descargado`);
      return true;
    }
    return false;
  }

  /**
   * Obtiene la lista de microfrontends cargados
   */
  public getLoadedMicrofrontends(): string[] {
    return Array.from(this.loadedMicrofrontends);
  }

  /**
   * Obtiene todos los microfrontends disponibles
   */
  public getAvailableMicrofrontends(): MicrofrontendConfig[] {
    return getAllMicrofrontends();
  }

  /**
   * Verifica si un microfrontend existe en la configuración
   */
  public exists(name: string): boolean {
    const config = getMicrofrontend(name);
    return config !== null;
  }

  /**
   * Obtiene información de un microfrontend específico
   */
  public getMicrofrontendInfo(name: string): MicrofrontendConfig | null {
    return getMicrofrontend(name);
  }

  /**
   * Carga múltiples microfrontends de forma paralela
   */
  public async loadMultipleMicrofrontends(names: string[]): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    const promises = names.map(async (name) => {
      const result = await this.loadMicrofrontend(name);
      results[name] = result;
      return { name, result };
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Descarga todos los microfrontends
   */
  public unloadAllMicrofrontends(): void {
    const loaded = Array.from(this.loadedMicrofrontends);
    loaded.forEach(name => this.unloadMicrofrontend(name));
    console.log(`🧹 Descargados ${loaded.length} microfrontends`);
  }

  // 🎯 MÉTODOS ESPECÍFICOS PARA MANEJO DE ROLES

  /**
   * Carga automáticamente el módulo por defecto para un rol específico
   */
  public async loadMicrofrontendByRole(role: string): Promise<boolean> {
    const moduleKey = getModuleFromRole(role);
    if (!moduleKey) {
      console.error(`❌ No hay módulo configurado para el rol '${role}'`);
      return false;
    }

    console.log(`🎭 Cargando módulo para rol '${role}': ${moduleKey}`);
    return await this.loadMicrofrontend(moduleKey);
  }

  /**
   * Verifica si un usuario con cierto rol puede acceder a un módulo
   */
  public canUserAccessModule(role: string, moduleName: string): boolean {
    const userModule = getModuleFromRole(role);
    const hasAccess = userModule === moduleName;
    console.log(`🔐 Acceso del rol '${role}' al módulo '${moduleName}': ${hasAccess ? '✅ PERMITIDO' : '❌ DENEGADO'}`);
    return hasAccess;
  }

  /**
   * Obtiene todos los módulos que un rol puede cargar
   */
  public getModulesForRole(role: string): MicrofrontendConfig[] {
    const userModule = getModuleFromRole(role);
    if (!userModule) {
      console.warn(`⚠️ Rol '${role}' no tiene módulo asignado`);
      return [];
    }

    const config = getMicrofrontend(userModule);
    const configs = config ? [config] : [];

    console.log(`📋 Módulos disponibles para rol '${role}':`, configs.map(c => c.name));
    return configs;
  }

  /**
   * Obtiene el módulo principal/por defecto para un rol
   */
  public getDefaultModuleForRole(role: string): MicrofrontendConfig | null {
    const config = getMicrofrontendByRole(role);
    if (config) {
      console.log(`🎯 Módulo por defecto para rol '${role}': ${config.name}`);
    }
    return config;
  }

  /**
   * Inicialización automática: carga el módulo correcto basado en el rol del usuario
   * 🎯 NUEVA VERSIÓN: Detecta automáticamente el sistema y filtra módulos
   */
  public async initializeForUser(role: string): Promise<{
    success: boolean;
    system?: string;
    loadedModule?: string;
    availableModules: string[];
    systemConfig?: any;
    roleConfig?: any;
  }> {
    console.log(`🚀 Inicializando sistema para rol: ${role}`);

    // 🏢 DETECCIÓN AUTOMÁTICA DE SISTEMA
    const systemName = getSystemFromRole(role);
    const moduleName = getModuleFromRole(role);
    
    if (!systemName || !moduleName) {
      console.error(`❌ Rol '${role}' no válido o sistema no detectado`);
      return {
        success: false,
        availableModules: [],
      };
    }

    console.log(`🎯 Detectado: Rol '${role}' → Sistema '${systemName}' → Módulo '${moduleName}'`);

    // 🔄 CARGAR MÓDULO ESPECÍFICO
    const loadSuccess = await this.loadMicrofrontend(moduleName);

    console.log(`${loadSuccess ? '✅' : '❌'} Inicialización ${loadSuccess ? 'exitosa' : 'fallida'}`);
    console.log(`📋 Sistema: ${systemName}, Módulo: ${moduleName}`);

    const moduleConfig = getMicrofrontend(moduleName);
    const availableModules = moduleConfig ? [moduleName] : [];

    return {
      success: loadSuccess,
      system: systemName,
      loadedModule: loadSuccess ? moduleName : undefined,
      availableModules: availableModules,
      systemConfig: {
        system: systemName,
        module: moduleName,
        role: role
      },
      roleConfig: {
        system: systemName,
        module: moduleName,
        role: role
      }
    };
  }

  /**
   * Cambia dinámicamente el módulo cargado para un rol específico (si tiene permisos)
   */
  public async switchModuleForRole(role: string, targetModule: string): Promise<boolean> {
    if (!this.canUserAccessModule(role, targetModule)) {
      console.error(`❌ El rol '${role}' no tiene permisos para acceder al módulo '${targetModule}'`);
      return false;
    }

    console.log(`🔄 Cambiando a módulo '${targetModule}' para rol '${role}'`);
    return await this.loadMicrofrontend(targetModule);
  }

  // 🏢 MÉTODOS ESPECÍFICOS PARA SISTEMAS MÚLTIPLES

  /**
   * Verifica si un rol puede acceder a un sistema específico
   */
  public canAccessSystem(role: string, systemName: string): boolean {
    const hasAccess = canRoleAccessSystem(role, systemName);
    console.log(`🏢 Acceso del rol '${role}' al sistema '${systemName}': ${hasAccess ? '✅ PERMITIDO' : '❌ DENEGADO'}`);
    return hasAccess;
  }

  /**
   * Obtiene todos los módulos disponibles para un rol (filtrados por su sistema)
   */
  public getModulesForUserRole(role: string): MicrofrontendConfig[] {
    const systemName = getSystemFromRole(role);
    const moduleName = getModuleFromRole(role);
    
    if (!moduleName) {
      console.log(`📋 No hay módulos para rol '${role}'`);
      return [];
    }

    const moduleConfig = getMicrofrontend(moduleName);
    const modules = moduleConfig ? [moduleConfig] : [];
    
    console.log(`📋 Módulos del sistema '${systemName}' para rol '${role}':`, modules.map(m => m.name));
    return modules;
  }

  /**
   * Obtiene la configuración completa de un usuario (sistema + módulo + permisos)
   */
  public getUserConfiguration(role: string) {
    const systemName = getSystemFromRole(role);
    const moduleName = getModuleFromRole(role);
    
    if (!systemName || !moduleName) {
      return null;
    }

    const moduleConfig = getMicrofrontend(moduleName);
    
    const config = {
      role: role,
      system: {
        name: systemName,
        displayName: systemName.charAt(0).toUpperCase() + systemName.slice(1)
      },
      module: {
        name: moduleName,
        displayName: moduleConfig?.name || moduleName,
        path: moduleConfig?.path || `/${systemName}/${moduleName}`
      }
    };
    
    console.log(`👤 Configuración para '${role}':`, {
      sistema: config.system.displayName,
      módulo: config.module.displayName,
      ruta: config.module.path
    });
    
    return config;
  }

  /**
   * Método de conveniencia: Inicializar automáticamente según rol
   * 🎯 EJEMPLO DE USO PRINCIPAL
   */
  public async autoInitializeUser(role: string): Promise<{
    success: boolean;
    redirectPath?: string;
    systemName?: string;
    moduleName?: string;
    userConfig?: any;
  }> {
    console.log(`🚀 Auto-inicializando para rol: ${role}`);

    // Ejemplo de mapeo automático:
    // 'OPERADOR' → sistema: 'ticketera', módulo: 'agentpanel', path: '/ticketera/agentpanel'
    // 'PRINCIPAL' → sistema: 'ticketera', módulo: 'tabletinterface', path: '/ticketera/tabletinterface'
    // 'OKR_CEO' → sistema: 'okr', módulo: 'dashboard', path: '/okr/dashboard'

    const initResult = await this.initializeForUser(role);
    
    if (!initResult.success) {
      return { success: false };
    }

    const userConfig = this.getUserConfiguration(role);
    const redirectPath = userConfig?.module.path;

    console.log(`✅ Usuario '${role}' inicializado → Redirigir a: ${redirectPath}`);

    return {
      success: true,
      redirectPath,
      systemName: initResult.system,
      moduleName: initResult.loadedModule,
      userConfig
    };
  }
}

export const microfrontendService = MicrofrontendService.getInstance();
