/**
 * Servicio para gestionar la conexión WebSocket con el backend usando STOMP/SockJS
 * Permite suscribirse a eventos y enviar mensajes con autenticación JWT
 */
import SockJS from 'sockjs-client'
import { Client, IMessage } from '@stomp/stompjs'

// URL del servidor de WebSockets desde variables de entorno
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3030';

class SocketService {
  private static instance: SocketService;
  public stompClient: Client | null = null;
  private listeners: { [event: string]: Function[] } = {};
  private connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error' = 'disconnected';
  private statusListeners: ((status: string) => void)[] = [];
  private reconnectInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 2000; // 2 segundos
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatDelay = 3000; // 3 segundos

  private constructor() {}

  private updateStatus(status: 'connected' | 'disconnected' | 'connecting' | 'error') {
    this.connectionStatus = status;
    this.statusListeners.forEach(listener => listener(status));
    
    // Si se conecta exitosamente, resetear intentos de reconexión
    if (status === 'connected') {
      this.reconnectAttempts = 0;
      this.stopReconnect();
    }
  }

  private startReconnect() {
    if (this.reconnectInterval) {
      return; // Ya hay un intervalo de reconexión activo
    }

    console.log('🔄 [SocketService] Iniciando reconexión automática...');
    
    this.reconnectInterval = setInterval(() => {
      if (this.connectionStatus === 'connected') {
        this.stopReconnect();
        return;
      }

      this.reconnectAttempts++;
      console.log(`🔄 [SocketService] Intento de reconexión ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      this.connect(`reconnect-${this.reconnectAttempts}`);
    }, this.reconnectDelay);
  }

  private stopReconnect() {
    if (this.reconnectInterval) {
      console.log('🛑 [SocketService] Deteniendo reconexión automática...');
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      return; // Ya hay un heartbeat activo
    }

    console.log('💓 [SocketService] Iniciando heartbeat...');
    
    this.heartbeatInterval = setInterval(() => {
      if (!this.stompClient) {
        this.stopHeartbeat();
        return;
      }

      // Verificar si realmente está conectado
      const isReallyConnected = this.stompClient.connected;
      console.log('💓 [SocketService] Verificando conexión real:', isReallyConnected);
      
      if (!isReallyConnected) {
        console.log('❌ [SocketService] Cliente STOMP no está realmente conectado');
        this.updateStatus('disconnected');
        this.startReconnect();
        this.stopHeartbeat();
        return;
      }

      // Intentar enviar un mensaje simple para verificar la conexión
      try {
        this.stompClient.publish({
          destination: '/topic/heartbeat',
          body: JSON.stringify({ timestamp: Date.now(), type: 'ping' })
        });
        console.log('💓 [SocketService] Ping enviado exitosamente');
      } catch (error) {
        console.log('❌ [SocketService] Error enviando ping:', error);
        this.updateStatus('disconnected');
        this.startReconnect();
        this.stopHeartbeat();
      }

    }, this.heartbeatDelay);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      console.log('🛑 [SocketService] Deteniendo heartbeat...');
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
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
   * Conecta al servidor de WebSockets usando STOMP/SockJS
   * @param sessionId ID de sesión para identificar al cliente
   */
  public connect(_sessionId: string) {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.log('❌ [SocketService] No hay token - no se puede conectar');
      this.updateStatus('disconnected');
      return;
    }

    // Verificar si ya está conectado
    if (this.stompClient && this.stompClient.connected) {
      console.log('✅ [SocketService] Ya está conectado, no es necesario reconectar');
      return;
    }
    
    if (!this.stompClient) {
      console.log('🚀 [SocketService] Iniciando conexión STOMP/SockJS...');
      console.log('🌐 [SocketService] URL del servidor:', SOCKET_URL);
      
      // Crear cliente STOMP con SockJS
      const socket = new SockJS(`${SOCKET_URL}/ws`);
      this.stompClient = new Client({
        webSocketFactory: () => socket,
        connectHeaders: {
          'Authorization': `Bearer ${token}`
        },
        debug: (str) => {
          console.log('🔌 [STOMP]', str);
        },
        onConnect: (frame) => {
          console.log('✅ [SocketService] Conectado exitosamente:', frame);
          this.updateStatus('connected');
          
          // Suscribirse a eventos de Ticketera
          this.subscribeToTicketeraEvents();
          
          // Suscribirse a eventos de Sistemas Externos
          this.subscribeToSistemasExternosEvents();
          
          // Iniciar heartbeat para detectar desconexiones
          this.startHeartbeat();
        },
        onStompError: (frame) => {
          console.error('❌ [SocketService] Error STOMP:', frame);
          this.updateStatus('error');
          this.startReconnect();
        },
        onWebSocketError: (error) => {
          console.error('❌ [SocketService] Error WebSocket:', error);
          this.updateStatus('error');
          this.startReconnect();
        },
        onDisconnect: () => {
          console.log('🔌 [SocketService] Desconectado');
          this.stopHeartbeat();
          this.updateStatus('disconnected');
          this.startReconnect();
        }
      });
      
      console.log('🔑 [SocketService] Token encontrado:', token.substring(0, 20) + '...');
      console.log('🔑 [SocketService] Conectando con autenticación JWT...');
      
      // Activar el cliente STOMP
      this.stompClient.activate();
    } else {
      console.log('🔄 [SocketService] Cliente STOMP ya existe, reconectando...');
      this.stompClient.activate();
    }
  }

  /**
   * Suscribirse a eventos de Ticketera
   */
  private subscribeToTicketeraEvents() {
    if (!this.stompClient || !this.stompClient.connected) {
      console.log('⚠️ [SocketService] Cliente STOMP no conectado, no se pueden suscribir eventos');
      return;
    }

    // 🎯 SUSCRIBIRSE AL TOPIC PRINCIPAL: /topic/tickets
    this.stompClient.subscribe('/topic/tickets', (message: IMessage) => {
      try {
        const ticket = JSON.parse(message.body);
        console.log('🎫 [SocketService] Ticket recibido de /topic/tickets:', ticket);
        
        // Emitir evento genérico de ticketera con el ticket
        const event = {
          type: 'ticket_updated',
          data: ticket,
          timestamp: Date.now()
        };
        this.emit('ticketera', event);
      } catch (error) {
        console.error('❌ [SocketService] Error procesando evento de /topic/tickets:', error);
      }
    });

    // 🎯 Topic para nuevos tickets
    this.stompClient.subscribe('/topic/new-ticket', (message: IMessage) => {
      try {
        const ticket = JSON.parse(message.body);
        console.log('🆕 [SocketService] Nuevo ticket recibido:', ticket);
        const event = { type: 'ticket_created', data: ticket, timestamp: Date.now() };
        this.emit('ticketera', event);
      } catch (error) {
        console.error('❌ [SocketService] Error procesando /topic/new-ticket:', error);
      }
    });

    // 🎯 Topic para tickets llamados
    this.stompClient.subscribe('/topic/ticket-called', (message: IMessage) => {
      try {
        const ticket = JSON.parse(message.body);
        console.log('📞 [SocketService] Ticket llamado recibido:', ticket);
        const event = { type: 'ticket_called', data: ticket, timestamp: Date.now() };
        this.emit('ticketera', event);
      } catch (error) {
        console.error('❌ [SocketService] Error procesando /topic/ticket-called:', error);
      }
    });

    // 🎯 Topic para tickets iniciados
    this.stompClient.subscribe('/topic/ticket-started', (message: IMessage) => {
      try {
        const ticket = JSON.parse(message.body);
        console.log('🚀 [SocketService] Ticket iniciado recibido:', ticket);
        const event = { type: 'ticket_started', data: ticket, timestamp: Date.now() };
        this.emit('ticketera', event);
      } catch (error) {
        console.error('❌ [SocketService] Error procesando /topic/ticket-started:', error);
      }
    });

    // 🎯 Topic para tickets completados
    this.stompClient.subscribe('/topic/ticket-completed', (message: IMessage) => {
      try {
        const ticket = JSON.parse(message.body);
        console.log('✅ [SocketService] Ticket completado recibido:', ticket);
        const event = { type: 'ticket_completed', data: ticket, timestamp: Date.now() };
        this.emit('ticketera', event);
      } catch (error) {
        console.error('❌ [SocketService] Error procesando /topic/ticket-completed:', error);
      }
    });

    // 🎯 Topic para tickets cancelados
    this.stompClient.subscribe('/topic/ticket-cancelled', (message: IMessage) => {
      try {
        const ticket = JSON.parse(message.body);
        console.log('❌ [SocketService] Ticket cancelado recibido:', ticket);
        const event = { type: 'ticket_cancelled', data: ticket, timestamp: Date.now() };
        this.emit('ticketera', event);
      } catch (error) {
        console.error('❌ [SocketService] Error procesando /topic/ticket-cancelled:', error);
      }
    });

    // Suscribirse a pong del servidor
    this.stompClient.subscribe('/topic/pong', (message: IMessage) => {
      try {
        const pong = JSON.parse(message.body);
        console.log('💓 [SocketService] Pong recibido:', pong);
        
        // Pong recibido exitosamente
      } catch (error) {
        console.error('❌ [SocketService] Error procesando pong:', error);
      }
    });

    console.log('✅ [SocketService] Suscrito a todos los topics de tickets');
  }

  /**
   * Suscribirse a eventos de Sistemas Externos
   */
  private subscribeToSistemasExternosEvents() {
    if (!this.stompClient || !this.stompClient.connected) {
      console.log('⚠️ [SocketService] Cliente STOMP no conectado, no se pueden suscribir eventos de sistemas externos');
      return;
    }

    // 🎯 SUSCRIBIRSE AL TOPIC PRINCIPAL: /topic/sistemas-externos
    this.stompClient.subscribe('/topic/sistemas-externos', (message: IMessage) => {
      try {
        const event = JSON.parse(message.body);
        console.log('🌐 [SocketService] Evento de sistemas externos recibido:', event);
        
        // Emitir evento genérico de sistemas externos
        this.emit('sistemas-externos', event);
      } catch (error) {
        console.error('❌ [SocketService] Error procesando evento de sistemas externos:', error);
      }
    });

    // 🎯 Topic para cambios de estado
    this.stompClient.subscribe('/topic/sistema-estado-cambiado', (message: IMessage) => {
      try {
        const event = JSON.parse(message.body);
        console.log('🔄 [SocketService] Estado de sistema cambiado:', event);
        this.emit('sistema-estado-cambiado', event);
      } catch (error) {
        console.error('❌ [SocketService] Error procesando cambio de estado:', error);
      }
    });

    // 🎯 Topic para verificaciones
    this.stompClient.subscribe('/topic/sistema-verificado', (message: IMessage) => {
      try {
        const event = JSON.parse(message.body);
        console.log('✅ [SocketService] Sistema verificado:', event);
        this.emit('sistema-verificado', event);
      } catch (error) {
        console.error('❌ [SocketService] Error procesando verificación:', error);
      }
    });

    console.log('✅ [SocketService] Suscrito a todos los topics de sistemas externos');
  }

  /**
   * Desconecta del servidor de WebSockets
   */
  public disconnect() {
    this.stopReconnect();
    this.stopHeartbeat();
    if (this.stompClient) {
      console.log('🔌 [SocketService] Desconectando STOMP...');
      this.stompClient.deactivate();
      this.stompClient = null;
    }
    this.updateStatus('disconnected');
  }

  /**
   * Detiene la reconexión automática
   */
  public stopAutoReconnect() {
    this.stopReconnect();
  }

  /**
   * Envía un evento a Ticketera
   */
  public sendTicketeraEvent(event: any) {
    if (!this.stompClient || !this.stompClient.connected) {
      console.log('⚠️ [SocketService] Cliente STOMP no conectado, no se puede enviar evento');
      return;
    }

    this.stompClient.publish({
      destination: '/app/ticketera',
      body: JSON.stringify(event)
    });
  }

  /**
   * Suscribirse a un evento específico
   */
  public on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Desuscribirse de un evento
   */
  public off(event: string, callback: Function) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  /**
   * Emitir un evento a los listeners
   */
  private emit(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }
}

// Exportar instancia singleton
const socketService = SocketService.getInstance();
export default socketService;