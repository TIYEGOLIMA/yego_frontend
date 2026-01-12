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
    // Leer token desde auth-storage (Zustand persist)
    let token: string | null = null;
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        token = parsed?.state?.token || null;
      }
    } catch (err) {
      // Fallback: intentar leer desde token directo (compatibilidad temporal)
      token = localStorage.getItem('token');
    }
    
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
      // Crear cliente STOMP con SockJS
      // Deshabilitar transporte iframe para evitar errores con X-Frame-Options
      // SockJS intentará usar solo estos transportes en orden
      const socket = new SockJS(`${SOCKET_URL}/ws`, undefined, {
        transports: ['websocket', 'xhr-streaming', 'xhr-polling']
      });
      this.stompClient = new Client({
        webSocketFactory: () => socket,
        connectHeaders: {
          'Authorization': `Bearer ${token}`
        },
        // Deshabilitar reconexión automática de STOMP - usamos nuestro propio sistema
        reconnectDelay: 0, // 0 = deshabilitado
        heartbeatIncoming: 0, // Deshabilitar heartbeat entrante
        heartbeatOutgoing: 0, // Deshabilitar heartbeat saliente
        onConnect: (frame) => {
          console.log('✅ [SocketService] Conectado exitosamente:', frame);
          this.updateStatus('connected');
          
          // Suscribirse a eventos de Ticketera
          this.subscribeToTicketeraEvents();
          
          // Suscribirse a eventos de Sistemas Externos
          this.subscribeToSistemasExternosEvents();
          
          // Suscribirse al topic general /topic/system (debe ir antes de los específicos)
          this.subscribeToSystemTopic();
          
          // Suscribirse a eventos de Garantizado (topics específicos)
          this.subscribeToGarantizadoEvents();
          
          // Suscribirse a eventos de Pro-Ops (topics específicos)
          this.subscribeToProOpsEvents();
          
          // Suscribirse a eventos específicos del usuario
          this.subscribeToUserEvents();
        },
        onStompError: (frame) => {
          // Solo loggear errores críticos, ignorar errores de iframe
          if (frame.headers && frame.headers['message'] && !frame.headers['message'].includes('iframe')) {
          console.error('❌ [SocketService] Error STOMP:', frame);
          }
          this.updateStatus('error');
          // Solo reconectar si no hemos excedido el máximo de intentos
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.startReconnect();
          }
        },
        onWebSocketError: (error) => {
          // Ignorar errores de iframe silenciosamente
          const errorMessage = error?.message || error?.toString() || '';
          if (!errorMessage.includes('iframe') && !errorMessage.includes('X-Frame-Options')) {
          console.error('❌ [SocketService] Error WebSocket:', error);
          }
          this.updateStatus('error');
          // Solo reconectar si no hemos excedido el máximo de intentos
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.startReconnect();
          }
        },
        onDisconnect: () => {
          console.log('🔌 [SocketService] Desconectado');
          this.updateStatus('disconnected');
          // Solo reconectar si no hemos excedido el máximo de intentos
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.startReconnect();
          }
        }
      });
      
      // Activar el cliente STOMP
      this.stompClient.activate();
    } else {
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

    // 🎯 Topic para actualizaciones de módulos de atención
    this.stompClient.subscribe('/topic/modulos-atencion', (message: IMessage) => {
      try {
        const modulosData = JSON.parse(message.body);
        this.emitModulosActualizados(modulosData);
      } catch (error) {
        console.error('❌ [SocketService] Error procesando /topic/modulos-atencion:', error);
      }
    });
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
   * Suscribirse a eventos específicos del usuario actual
   */
  private subscribeToUserEvents() {
    if (!this.stompClient || !this.stompClient.connected) {
      console.log('⚠️ [SocketService] Cliente STOMP no conectado, no se pueden suscribir eventos de usuario');
      return;
    }

    // Obtener el ID del usuario actual del token
    // Leer token desde auth-storage (Zustand persist)
    let token: string | null = null;
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        token = parsed?.state?.token || null;
      }
    } catch (err) {
      // Fallback: intentar leer desde token directo (compatibilidad temporal)
      token = localStorage.getItem('token');
    }
    if (!token) {
      console.log('⚠️ [SocketService] No hay token, no se puede suscribir a eventos de usuario');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId || payload.id;
      
      if (!userId) {
        console.log('⚠️ [SocketService] No se pudo obtener userId del token');
        return;
      }

      // Suscribirse al topic específico del usuario
      this.stompClient.subscribe(`/topic/user/${userId}`, (message: IMessage) => {
        try {
          const event = JSON.parse(message.body);
          console.log('👤 [SocketService] Evento de usuario recibido:', event);
          
          // Los eventos ACCOUNT_BLOCKED, FORCED_LOGOUT y ROLE_DEACTIVATED son procesados por SystemNotificationsService
          if (event.type === 'ACCOUNT_BLOCKED' || event.type === 'FORCED_LOGOUT' || event.type === 'ROLE_DEACTIVATED') {
            console.log(`🚫 [SocketService] Evento ${event.type} ignorado - debe ser procesado por SystemNotificationsService`);
            return;
          }
          
          // Procesar otros eventos específicos del usuario si los hay
          console.log(`🔔 [SocketService] Evento de usuario procesado: ${event.type}`);
        } catch (error) {
          console.error('❌ [SocketService] Error procesando evento de usuario:', error);
        }
      });

      console.log(`✅ [SocketService] Suscrito a eventos del usuario ${userId}`);
    } catch (error) {
      console.error('❌ [SocketService] Error obteniendo userId del token:', error);
    }
  }

  /**
   * Suscribirse al topic general /topic/system
   * Filtra eventos por tipo: GARANTIZADO_*, PRO_OPS_*, MODULOS_ACTUALIZADOS, etc.
   */
  private subscribeToSystemTopic() {
    if (!this.stompClient || !this.stompClient.connected) {
      console.log('⚠️ [SocketService] Cliente STOMP no conectado, no se puede suscribir a /topic/system');
      return;
    }

    this.stompClient.subscribe('/topic/system', (message: IMessage) => {
      try {
        const event = JSON.parse(message.body);
        
        // Los eventos ACCOUNT_BLOCKED y FORCED_LOGOUT ahora llegan por /topic/user/{userId}
        if (event.type === 'ACCOUNT_BLOCKED' || event.type === 'FORCED_LOGOUT') {
          return;
        }
        
        // 🎯 Si es un evento MODULOS_ACTUALIZADOS desde /topic/system, solo emitir como 'system'
        // (el evento ya se procesó desde /topic/modulos-atencion)
        if (event.type === 'MODULOS_ACTUALIZADOS') {
          this.emit('system', event);
          return;
        }
        
        // Filtrar eventos de garantizado desde /topic/system
        if (event.type === 'GARANTIZADO_TABLE_UPDATE' || event.event === 'GARANTIZADO_PROCESS_SUCCESS') {
          if (event.event && event.data) {
            const normalizedEvent = {
              type: event.event,
              ...event.data,
              timestamp: event.timestamp
            };
            this.emit('garantizado', normalizedEvent);
            this.emit('system', normalizedEvent);
          } else {
            this.emit('garantizado', event);
            this.emit('system', event);
          }
        } else if (event.type && event.type.startsWith('GARANTIZADO_')) {
          this.emit('garantizado', event);
          this.emit('system', event);
        } else if (event.type && event.type.startsWith('PRO_OPS_')) {
          // Filtrar eventos de pro-ops desde /topic/system
          this.emit('pro-ops-kpis', event);
          this.emit('system', event);
        } else {
          // Otros eventos del sistema
          this.emit('system', event);
        }
      } catch (error) {
        console.error('❌ [SocketService] Error procesando evento del sistema:', error);
      }
    });

    console.log('✅ [SocketService] Suscrito al topic general /topic/system');
  }

  /**
   * Suscribirse a eventos de Garantizado
   * Topics específicos: /topic/garantizado/*
   */
  private subscribeToGarantizadoEvents() {
    if (!this.stompClient || !this.stompClient.connected) {
      console.log('⚠️ [SocketService] Cliente STOMP no conectado, no se pueden suscribir eventos de garantizado');
      return;
    }

    // 🎯 Topic específico: /topic/garantizado
    this.stompClient.subscribe('/topic/garantizado', (message: IMessage) => {
      try {
        const event = JSON.parse(message.body);
        this.emit('garantizado', event);
      } catch (error) {
        console.error('❌ [SocketService] Error procesando evento de garantizado:', error);
      }
    });

    console.log('✅ [SocketService] Suscrito a todos los topics de garantizado');
  }

  /**
   * Suscribirse a eventos de Pro-Ops (KPIs)
   * Topics específicos: /topic/pro-ops/*
   * Topic general: /topic/system (filtrado por tipo si es necesario)
   */
  private subscribeToProOpsEvents() {
    if (!this.stompClient || !this.stompClient.connected) {
      console.log('⚠️ [SocketService] Cliente STOMP no conectado, no se pueden suscribir eventos de pro-ops');
      return;
    }

    // 🎯 Topic específico: /topic/pro-ops/kpis
    this.stompClient.subscribe('/topic/pro-ops/kpis', (message: IMessage) => {
      try {
        const kpis = JSON.parse(message.body);
        this.emit('pro-ops-kpis', kpis);
      } catch (error) {
        console.error('❌ [SocketService] Error procesando KPIs de Pro-Ops:', error);
      }
    });

    // 🎯 Topic específico: /topic/pro-ops/conductores-en-orden
    this.stompClient.subscribe('/topic/pro-ops/conductores-en-orden', (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        this.emit('pro-ops-conductores-en-orden', data);
      } catch (error) {
        console.error('❌ [SocketService] Error procesando conductores en orden:', error);
      }
    });

    console.log('✅ [SocketService] Suscrito a todos los topics de Pro-Ops');
  }

  /**
   * Helper para emitir eventos de módulos actualizados (evita código duplicado)
   */
  private emitModulosActualizados(modulosData: any) {
    const event = {
      type: modulosData.type || 'MODULOS_ACTUALIZADOS',
      data: {
        type: modulosData.type || 'MODULOS_ACTUALIZADOS',
        modulosDisponibles: modulosData.modulosDisponibles || [],
        modulosOcupados: modulosData.modulosOcupados || [],
        timestamp: modulosData.timestamp || Date.now()
      },
      timestamp: modulosData.timestamp || Date.now()
    };
    
    this.emit('ticketera', event);
    this.emit('modulos-actualizados', {
      modulosDisponibles: modulosData.modulosDisponibles || [],
      modulosOcupados: modulosData.modulosOcupados || [],
      timestamp: modulosData.timestamp || Date.now()
    });
  }

  /**
   * Desconecta del servidor de WebSockets
   */
  public disconnect() {
    this.stopReconnect();
    if (this.stompClient) {
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
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ [SocketService] Error ejecutando listener para '${event}':`, error);
        }
      });
    }
  }
}

// Exportar instancia singleton
const socketService = SocketService.getInstance();
export default socketService;