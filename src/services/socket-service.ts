/**
 * Servicio para gestionar la conexión WebSocket con el backend
 * Permite suscribirse a eventos y enviar mensajes
 */
import { io, Socket } from 'socket.io-client';

// URL del servidor de WebSockets desde variables de entorno
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3030';

class SocketService {
  private static instance: SocketService;
  public socket: Socket | null = null;
  private listeners: { [event: string]: Function[] } = {};
  private connectionStatus: 'connected' | 'disconnected' | 'connecting' = 'disconnected';
  private statusListeners: ((status: string) => void)[] = [];

  private constructor() {}

  private updateStatus(status: 'connected' | 'disconnected' | 'connecting') {
    this.connectionStatus = status;
    this.statusListeners.forEach(listener => listener(status));
  }

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public getConnectionStatus(): string {
    return this.connectionStatus;
  }

  public onStatusChange(callback: (status: string) => void) {
    this.statusListeners.push(callback);
  }

  public offStatusChange(callback: (status: string) => void) {
    this.statusListeners = this.statusListeners.filter(listener => listener !== callback);
  }

  /**
   * Conecta al servidor de WebSockets
   * @param sessionId ID de sesión para identificar al cliente
   */
  public connect(sessionId: string) {
    if (!this.socket) {
      console.log('🚀 [SocketService] Iniciando conexión Socket.IO...');
      console.log('🌐 [SocketService] URL del servidor:', SOCKET_URL);
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log('❌ [SocketService] No hay token - no se puede conectar');
        return; // No conectar si no hay token
      }
      
      console.log('🔑 [SocketService] Token encontrado, conectando...');
      
      this.socket = io(SOCKET_URL, {
        withCredentials: true,
        autoConnect: false, // No conectar automáticamente
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000, // Reducir delay de reconexión
        reconnectionDelayMax: 5000, // Máximo delay de 5 segundos
        timeout: 20000,
        auth: {
          token: token
        }
      });
      
      this.socket.on('connect', () => {
        console.log('✅ [SocketService] Socket.IO conectado exitosamente a:', SOCKET_URL);
        this.updateStatus('connected');
        this.socket?.emit('register-session', { sessionId });
        console.log('📝 [SocketService] Sesión registrada:', sessionId);
      });
      
      this.socket.on('disconnect', (reason) => {
        console.log('🔌 [SocketService] Socket desconectado:', reason);
        this.updateStatus('disconnected');
      });
      
      this.socket.on('connect_error', (error) => {
        console.log('❌ [SocketService] Error de conexión Socket.IO:', error);
        console.log('❌ [SocketService] Intentando conectar a:', SOCKET_URL);
        this.updateStatus('disconnected');
      });
      
      this.socket.on('reconnect_attempt', (attempt) => {
        console.log('🔌 Intento de reconexión:', attempt);
        this.updateStatus('connecting');
      });
      
      this.socket.on('reconnect', (attempt) => {
        console.log('🔌 Socket reconectado en intento:', attempt);
        this.updateStatus('connected');
        // Re-registrar la sesión después de reconectar
        this.socket?.emit('register-session', { sessionId });
      });
      
      this.socket.on('reconnect_error', (error) => {
        console.log('🔌 Error de reconexión:', error);
        this.updateStatus('disconnected');
      });
      
      this.socket.on('reconnect_failed', () => {
        console.log('🔌 Falló la reconexión');
        this.updateStatus('disconnected');
      });
      
      this.socket.on('session-closed', (...args) => {
        if (this.listeners['session-closed']) {
          this.listeners['session-closed'].forEach(fn => fn(...args));
        }
      });
      
      this.socket.on('force-logout', (...args) => {
        if (this.listeners['force-logout']) {
          this.listeners['force-logout'].forEach(fn => fn(...args));
        }
      });
      
      this.socket.on('permissions-updated', (...args) => {
        console.log('📡 Socket recibió evento permissions-updated:', args);
        if (this.listeners['permissions-updated']) {
          this.listeners['permissions-updated'].forEach(fn => fn(...args));
        }
      });

      // 🎯 EVENTOS ESPECÍFICOS PARA MICROFRONTENDS

      // TicketPanel - Eventos de tickets
      this.socket.on('ticket-created', (...args) => {
        console.log('📡 [SocketService] Evento ticket-created:', args);
        if (this.listeners['ticket-created']) {
          this.listeners['ticket-created'].forEach(fn => fn(...args));
        }
      });

      this.socket.on('ticket-updated', (...args) => {
        console.log('📡 [SocketService] Evento ticket-updated:', args);
        if (this.listeners['ticket-updated']) {
          this.listeners['ticket-updated'].forEach(fn => fn(...args));
        }
      });

      this.socket.on('ticket-called', (...args) => {
        console.log('📡 [SocketService] Evento ticket-called:', args);
        if (this.listeners['ticket-called']) {
          this.listeners['ticket-called'].forEach(fn => fn(...args));
        }
      });

      this.socket.on('ticket-completed', (...args) => {
        console.log('📡 [SocketService] Evento ticket-completed:', args);
        if (this.listeners['ticket-completed']) {
          this.listeners['ticket-completed'].forEach(fn => fn(...args));
        }
      });

      // AgentPanel - Eventos de cola y módulos
      this.socket.on('queue-changed', (...args) => {
        console.log('📡 [SocketService] Evento queue-changed:', args);
        if (this.listeners['queue-changed']) {
          this.listeners['queue-changed'].forEach(fn => fn(...args));
        }
      });

      this.socket.on('module-assigned', (...args) => {
        console.log('📡 [SocketService] Evento module-assigned:', args);
        if (this.listeners['module-assigned']) {
          this.listeners['module-assigned'].forEach(fn => fn(...args));
        }
      });

      this.socket.on('module-released', (...args) => {
        console.log('📡 [SocketService] Evento module-released:', args);
        if (this.listeners['module-released']) {
          this.listeners['module-released'].forEach(fn => fn(...args));
        }
      });

      // RatingTablet - Eventos de calificaciones
      this.socket.on('rating-submitted', (...args) => {
        console.log('📡 [SocketService] Evento rating-submitted:', args);
        if (this.listeners['rating-submitted']) {
          this.listeners['rating-submitted'].forEach(fn => fn(...args));
        }
      });

      // TVDisplay - Eventos para pantallas
      this.socket.on('display-updated', (...args) => {
        console.log('📡 [SocketService] Evento display-updated:', args);
        if (this.listeners['display-updated']) {
          this.listeners['display-updated'].forEach(fn => fn(...args));
        }
      });
      
      // Conectar manualmente con un pequeño delay
      this.updateStatus('connecting');
      setTimeout(() => {
        this.socket?.connect();
      }, 100);
    } else {
      // Si ya existe el socket, solo registrar la sesión
      this.socket.emit('register-session', { sessionId });
    }
  }

  /**
   * Registra un listener para un evento
   * @param event Nombre del evento
   * @param callback Función a ejecutar cuando se reciba el evento
   */
  public on(event: string, callback: (...args: any[]) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    this.socket?.on(event, callback);
  }

  /**
   * Elimina un listener para un evento
   * @param event Nombre del evento
   * @param callback Función a eliminar
   */
  public off(event: string, callback: (...args: any[]) => void) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(fn => fn !== callback);
      this.socket?.off(event, callback);
    }
  }

  /**
   * Registra un listener para el evento force-logout
   * @param callback Función a ejecutar cuando se reciba el evento
   */
  public onForceLogout(callback: () => void) {
    this.socket?.on('force-logout', callback);
  }

  /**
   * Desconecta del servidor de WebSockets
   */
  public disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.listeners = {};
  }

  /**
   * Emite un evento al servidor
   * @param event Nombre del evento
   * @param data Datos a enviar
   */
  public emit(event: string, data?: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
      return true;
    }
    return false;
  }

  // 🎯 MÉTODOS DE CONVENIENCIA PARA MICROFRONTENDS

  /**
   * Suscripción a eventos de tickets para AgentPanel
   * @param callback Función a ejecutar cuando se reciba el evento
   * @returns Función para desuscribirse
   */
  public onTicketUpdated(callback: (ticket: any) => void): () => void {
    this.on('ticket-updated', callback);
    return () => this.off('ticket-updated', callback);
  }

  public onTicketCreated(callback: (ticket: any) => void): () => void {
    this.on('ticket-created', callback);
    return () => this.off('ticket-created', callback);
  }

  public onTicketCalled(callback: (ticket: any) => void): () => void {
    this.on('ticket-called', callback);
    return () => this.off('ticket-called', callback);
  }

  public onTicketCompleted(callback: (ticket: any) => void): () => void {
    this.on('ticket-completed', callback);
    return () => this.off('ticket-completed', callback);
  }

  /**
   * Suscripción a eventos de cola y módulos para AgentPanel
   * @param callback Función a ejecutar cuando se reciba el evento
   * @returns Función para desuscribirse
   */
  public onQueueChanged(callback: (queueData: any) => void): () => void {
    this.on('queue-changed', callback);
    return () => this.off('queue-changed', callback);
  }

  public onModuleAssigned(callback: (moduleData: any) => void): () => void {
    this.on('module-assigned', callback);
    return () => this.off('module-assigned', callback);
  }

  public onModuleReleased(callback: (moduleData: any) => void): () => void {
    this.on('module-released', callback);
    return () => this.off('module-released', callback);
  }

  /**
   * Suscripción a eventos para RatingTablet
   * @param callback Función a ejecutar cuando se reciba el evento
   * @returns Función para desuscribirse
   */
  public onRatingSubmitted(callback: (ratingData: any) => void): () => void {
    this.on('rating-submitted', callback);
    return () => this.off('rating-submitted', callback);
  }

  /**
   * Suscripción a eventos para TVDisplay
   * @param callback Función a ejecutar cuando se reciba el evento
   * @returns Función para desuscribirse
   */
  public onDisplayUpdated(callback: (displayData: any) => void): () => void {
    this.on('display-updated', callback);
    return () => this.off('display-updated', callback);
  }

  /**
   * Método genérico para suscripción con auto-cleanup
   * Útil para hooks de React
   * @param subscriptions Array de [evento, callback] para suscribir
   * @returns Función para limpiar todas las suscripciones
   */
  public subscribe(subscriptions: Array<[string, (...args: any[]) => void]>): () => void {
    const unsubscribers: (() => void)[] = [];
    
    subscriptions.forEach(([event, callback]) => {
      this.on(event, callback);
      unsubscribers.push(() => this.off(event, callback));
    });
    
    // Retornar función que limpia todas las suscripciones
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }

  /**
   * Verifica si el WebSocket está conectado
   * @returns true si está conectado
   */
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Obtiene información del estado de la conexión
   * @returns Estado detallado de la conexión
   */
  public getConnectionInfo(): {
    status: string;
    connected: boolean;
    url: string;
    hasToken: boolean;
  } {
    return {
      status: this.connectionStatus,
      connected: this.isConnected(),
      url: SOCKET_URL,
      hasToken: !!localStorage.getItem('token')
    };
  }
}

export default SocketService;