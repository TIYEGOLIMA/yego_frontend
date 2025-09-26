// 🔗 SERVICIO DE INTEGRACIÓN PRINCIPAL
// Coordina la comunicación entre el sistema principal y todos los subsistemas

import { systemRegistry, SystemInfo } from './system-registry';
import { microfrontendService } from './microfrontend-service';
import SocketService from '../socket-service';

export interface UserContext {
  id: number;
  username: string;
  role: string;
  email: string;
  name: string;
  assignedSystem?: string;
  assignedModule?: string;
  permissions?: string[];
}

export interface SystemNavigation {
  currentSystem: string;
  currentModule: string;
  currentPath: string;
  availableSystems: SystemInfo[];
  canSwitchSystems: boolean;
}

export interface IntegrationState {
  isInitialized: boolean;
  currentUser: UserContext | null;
  navigation: SystemNavigation;
  systemConnections: Record<string, boolean>;
}

/**
 * 🎯 SERVICIO PRINCIPAL DE INTEGRACIÓN
 * Coordina todo entre el sistema principal y los subsistemas
 */
export class SystemIntegrationService {
  private static instance: SystemIntegrationService;
  private state: IntegrationState;
  private listeners: Map<string, Function[]> = new Map();

  private constructor() {
    this.state = {
      isInitialized: false,
      currentUser: null,
      navigation: {
        currentSystem: '',
        currentModule: '',
        currentPath: '/',
        availableSystems: [],
        canSwitchSystems: false
      },
      systemConnections: {}
    };
    this.initializeIntegration();
  }

  public static getInstance(): SystemIntegrationService {
    if (!SystemIntegrationService.instance) {
      SystemIntegrationService.instance = new SystemIntegrationService();
    }
    return SystemIntegrationService.instance;
  }

  /**
   * 🚀 INICIALIZACIÓN PRINCIPAL
   */
  private async initializeIntegration() {
    console.log('🔗 Inicializando integración de sistemas...');

    try {
      // 1. Configurar servicios compartidos en el registry
      systemRegistry.setSharedServices({
        socket: SocketService.getInstance(),
        auth: null, // Se configurará cuando se cargue
        api: null   // Se configurará cuando se cargue
      });

      // 2. Inicializar WebSocket global
      const socketService = SocketService.getInstance();
      await this.initializeGlobalSocket(socketService);

      // 3. Configurar listeners de eventos
      this.setupEventListeners();

      this.state.isInitialized = true;
      console.log('✅ Integración de sistemas inicializada');

    } catch (error) {
      console.error('❌ Error inicializando integración:', error);
    }
  }

  /**
   * 🌐 INICIALIZAR WEBSOCKET GLOBAL
   */
  private async initializeGlobalSocket(socketService: SocketService) {
    console.log('🔌 Configurando WebSocket global...');
    
    // El WebSocket ya está configurado en socket-service.ts
    // Aquí podemos agregar listeners específicos para la integración
    
    socketService.on('system-notification', (data) => {
      console.log('📢 Notificación del sistema:', data);
      this.emit('system-notification', data);
    });

    socketService.on('user-session-update', (data) => {
      console.log('👤 Actualización de sesión:', data);
      this.updateUserContext(data);
    });

    console.log('✅ WebSocket global configurado');
  }

  /**
   * 👤 INICIALIZAR USUARIO EN EL SISTEMA
   */
  public async initializeUser(user: UserContext): Promise<{
    success: boolean;
    systemAssigned?: string;
    moduleAssigned?: string;
    redirectPath?: string;
    availableSystems?: SystemInfo[];
  }> {
    console.log(`👤 Inicializando usuario: ${user.username} (${user.role})`);

    try {
      // 1. Actualizar contexto del usuario
      this.state.currentUser = user;

      // 2. Obtener sistemas disponibles para el usuario
      const userSystems = systemRegistry.getSystemsForUser(user.role);
      
      if (userSystems.length === 0) {
        throw new Error(`No hay sistemas disponibles para el rol: ${user.role}`);
      }

      // 3. Determinar sistema principal del usuario
      const primarySystem = userSystems[0]; // Por ahora, el primer sistema disponible
      
      // 4. Activar sistema en el registry
      systemRegistry.activateSystem(primarySystem.id, user);

      // 5. Inicializar microfrontend específico
      const microfrontendResult = await microfrontendService.autoInitializeUser(user.role);

      // 6. Actualizar navegación
      this.state.navigation = {
        currentSystem: primarySystem.id,
        currentModule: microfrontendResult.moduleName || '',
        currentPath: microfrontendResult.redirectPath || `/${primarySystem.id}`,
        availableSystems: userSystems,
        canSwitchSystems: userSystems.length > 1
      };

      // 7. El WebSocket ya está conectado globalmente
      console.log(`🌐 WebSocket conectado para usuario: ${user.username}`);

      console.log(`✅ Usuario inicializado en sistema: ${primarySystem.name}`);

      return {
        success: true,
        systemAssigned: primarySystem.id,
        moduleAssigned: microfrontendResult.moduleName,
        redirectPath: microfrontendResult.redirectPath,
        availableSystems: userSystems
      };

    } catch (error) {
      console.error(`❌ Error inicializando usuario:`, error);
      return { success: false };
    }
  }

  /**
   * 🔄 CAMBIAR SISTEMA ACTIVO
   */
  public async switchSystem(systemId: string): Promise<boolean> {
    if (!this.state.currentUser) {
      console.error('❌ No hay usuario activo para cambiar sistema');
      return false;
    }

    // Verificar si el usuario puede acceder al sistema
    if (!systemRegistry.canUserAccessSystem(this.state.currentUser.role, systemId)) {
      console.error(`❌ Usuario no tiene acceso al sistema: ${systemId}`);
      return false;
    }

    console.log(`🔄 Cambiando a sistema: ${systemId}`);

    // Activar nuevo sistema
    const success = systemRegistry.activateSystem(systemId, this.state.currentUser);
    
    if (success) {
      const system = systemRegistry.getSystem(systemId);
      this.state.navigation.currentSystem = systemId;
      this.state.navigation.currentPath = `/${systemId}`;
      
      // Notificar cambio
      this.emit('system-changed', {
        newSystem: system,
        user: this.state.currentUser
      });
    }

    return success;
  }

  /**
   * 📊 OBTENER ESTADO ACTUAL
   */
  public getCurrentState(): IntegrationState {
    return { ...this.state };
  }

  /**
   * 🎯 OBTENER INFORMACIÓN DE NAVEGACIÓN
   */
  public getNavigationInfo(): SystemNavigation {
    return { ...this.state.navigation };
  }

  /**
   * 👤 ACTUALIZAR CONTEXTO DE USUARIO
   */
  private updateUserContext(userData: Partial<UserContext>) {
    if (this.state.currentUser) {
      this.state.currentUser = {
        ...this.state.currentUser,
        ...userData
      };
      this.emit('user-context-updated', this.state.currentUser);
    }
  }

  /**
   * 🔧 CONFIGURAR LISTENERS DE EVENTOS
   */
  private setupEventListeners() {
    // Escuchar eventos del microfrontend service
    // Escuchar eventos del socket service
    // Escuchar eventos del sistema registry
    console.log('📡 Event listeners configurados');
  }

  /**
   * 📢 EMITIR EVENTO
   */
  public emit(eventName: string, data?: any) {
    const listeners = this.listeners.get(eventName) || [];
    listeners.forEach(listener => listener(data));
  }

  /**
   * 👂 ESCUCHAR EVENTO
   */
  public on(eventName: string, callback: Function) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName)?.push(callback);
  }

  /**
   * 🧹 CLEANUP AL LOGOUT
   */
  public cleanup() {
    console.log('🧹 Limpiando integración...');
    
    // Resetear registry
    systemRegistry.reset();
    
    // Resetear estado
    this.state = {
      isInitialized: this.state.isInitialized,
      currentUser: null,
      navigation: {
        currentSystem: '',
        currentModule: '',
        currentPath: '/',
        availableSystems: [],
        canSwitchSystems: false
      },
      systemConnections: {}
    };

    console.log('✅ Integración limpiada');
  }

  /**
   * 📈 OBTENER MÉTRICAS DEL SISTEMA
   */
  public getSystemMetrics() {
    const registryStats = systemRegistry.getSystemStats();
    return {
      ...registryStats,
      integration: {
        isInitialized: this.state.isInitialized,
        hasActiveUser: !!this.state.currentUser,
        currentSystem: this.state.navigation.currentSystem,
        socketConnected: SocketService.getInstance().isConnected()
      }
    };
  }
}

// 🌟 INSTANCIA SINGLETON
export const systemIntegration = SystemIntegrationService.getInstance();

// 🎯 FUNCIONES DE CONVENIENCIA PARA EL SISTEMA PRINCIPAL
export const initializeUserSystem = (user: UserContext) => systemIntegration.initializeUser(user);
export const switchActiveSystem = (systemId: string) => systemIntegration.switchSystem(systemId);
export const getCurrentSystemState = () => systemIntegration.getCurrentState();
export const getSystemNavigation = () => systemIntegration.getNavigationInfo();
export const onSystemEvent = (eventName: string, callback: Function) => systemIntegration.on(eventName, callback);
