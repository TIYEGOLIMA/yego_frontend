/**
 * Hook global para manejar eventos de módulos (MODULE_DISABLED, MODULE_ENABLED)
 * Se registra una vez al inicio de la aplicación y mantiene el listener activo
 */
import { useEffect, useRef } from 'react';
import SocketService from '../services/socket-service';

interface ModuleEvent {
  type: 'MODULE_DISABLED' | 'MODULE_ENABLED';
  moduleId: number;
  module: string;
  message: string;
  timestamp: string;
}

type ModuleEventHandler = (event: ModuleEvent) => void;

class ModuleEventsService {
  private static instance: ModuleEventsService;
  private listeners: ModuleEventHandler[] = [];
  private isListenerRegistered = false;

  private constructor() {}

  public static getInstance(): ModuleEventsService {
    if (!ModuleEventsService.instance) {
      ModuleEventsService.instance = new ModuleEventsService();
    }
    return ModuleEventsService.instance;
  }

  /**
   * Registrar el listener global una sola vez
   */
  public registerGlobalListener() {
    if (this.isListenerRegistered) {
      console.log('📝 [ModuleEventsService] Listener ya registrado');
      return;
    }

    console.log('🔧 [ModuleEventsService] Registrando listener global para eventos de módulos...');
    
    const handleModuleEvent = (event: any) => {
      if (event.type === 'MODULE_DISABLED' || event.type === 'MODULE_ENABLED') {
        console.log('🔔 [ModuleEventsService] Evento de módulo recibido:', event);
        
        // Notificar a todos los listeners registrados
        this.listeners.forEach(listener => {
          try {
            listener(event as ModuleEvent);
          } catch (error) {
            console.error('❌ [ModuleEventsService] Error ejecutando listener:', error);
          }
        });
      }
    };

    SocketService.on('system', handleModuleEvent);
    this.isListenerRegistered = true;
    console.log('✅ [ModuleEventsService] Listener global registrado correctamente');
  }

  /**
   * Suscribirse a eventos de módulos
   */
  public onModuleEvent(handler: ModuleEventHandler) {
    this.listeners.push(handler);
    console.log(`📝 [ModuleEventsService] Nuevo listener registrado. Total: ${this.listeners.length}`);
    
    // Retornar función de cleanup
    return () => {
      this.listeners = this.listeners.filter(h => h !== handler);
      console.log(`🧹 [ModuleEventsService] Listener removido. Total: ${this.listeners.length}`);
    };
  }
}

const moduleEventsService = ModuleEventsService.getInstance();

/**
 * Hook para usar eventos de módulos en componentes
 */
export const useModuleEvents = (handler: ModuleEventHandler) => {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    // Registrar el listener global si no está registrado
    moduleEventsService.registerGlobalListener();

    // Suscribirse a eventos
    const unsubscribe = moduleEventsService.onModuleEvent((event) => {
      handlerRef.current(event);
    });

    return unsubscribe;
  }, []);
};

export default moduleEventsService;

