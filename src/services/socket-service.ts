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
  private reconnectDelay = 5000; // 5 segundos (aumentado para reducir carga)
  private isConnecting = false; // Flag para evitar múltiples conexiones simultáneas
  private maxReconnectAttemptsReached = false; // Flag para indicar que se excedieron los intentos
  private reconnectExceededListeners: (() => void)[] = []; // Listeners para cuando se exceden los intentos

  private constructor() {}

  private updateStatus(status: 'connected' | 'disconnected' | 'connecting' | 'error') {
    this.connectionStatus = status;
    this.statusListeners.forEach(listener => listener(status));
    
    // Si se conecta exitosamente, resetear intentos de reconexión
    if (status === 'connected') {
      this.reconnectAttempts = 0;
      this.maxReconnectAttemptsReached = false;
      this.stopReconnect();
    }
  }

  private startReconnect() {
    // ✅ CRÍTICO: Detener cualquier intervalo existente primero
    this.stopReconnect();
    
    // Si ya se excedieron los intentos, no intentar más
    if (this.maxReconnectAttemptsReached) {
      return;
    }

    // ✅ CRÍTICO: Verificar si ya está conectado antes de iniciar reconexión
    if (this.connectionStatus === 'connected') {
      return;
    }

    // ✅ CRÍTICO: Verificar si ya está intentando conectar
    if (this.isConnecting) {
      return;
    }

    console.log('🔄 [SocketService] Iniciando proceso de reconexión automática...');
    
    this.reconnectInterval = setInterval(() => {
      // ✅ Verificar estado antes de cada intento
      if (this.connectionStatus === 'connected') {
        console.log('✅ [SocketService] Conectado exitosamente, deteniendo reconexión');
        this.stopReconnect();
        return;
      }

      // ✅ Verificar si ya está intentando conectar
      if (this.isConnecting) {
        console.log('⏳ [SocketService] Ya hay un intento de conexión en progreso, esperando...');
        return;
      }

      // Verificar si se excedieron los intentos
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.maxReconnectAttemptsReached = true;
        this.stopReconnect();
        this.updateStatus('error');
        
        console.warn(`⚠️ [SocketService] Se excedieron los ${this.maxReconnectAttempts} intentos de reconexión. El servidor puede haber sido actualizado.`);
        
        // Notificar a los listeners que se excedieron los intentos (solo log)
        this.reconnectExceededListeners.forEach(listener => listener());
        
        // Intentar refrescar el token y reconectar una vez más después de un delay
        console.log('🔄 [SocketService] Intentando refrescar token y reconectar en 10 segundos...');
        setTimeout(() => {
          this.attemptTokenRefreshAndReconnect();
        }, 10000); // Esperar 10 segundos antes de intentar con token refrescado
        
        return;
      }

      this.reconnectAttempts++;
      console.log(`🔄 [SocketService] Intento de reconexión ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      this.connect(`reconnect-${this.reconnectAttempts}`);
    }, this.reconnectDelay);
  }
  
  /**
   * Intentar refrescar el token y reconectar después de exceder intentos
   */
  private async attemptTokenRefreshAndReconnect() {
    try {
      // Leer token actual
      let token: string | null = null;
      try {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const parsed = JSON.parse(authStorage);
          token = parsed?.state?.token || null;
        }
      } catch (err) {
        token = localStorage.getItem('token');
      }
      
      if (!token) {
        return;
      }
      
      // Intentar refrescar el token
      const { default: api } = await import('./core/api');
      const refreshUrl = window.location.pathname.includes('/ticketera') 
        ? '/ticketera/auth/refresh' 
        : '/auth/refresh';
      
      try {
        const refreshResponse = await api.post(refreshUrl, {}, {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 5000
        });
        
        const newToken = refreshResponse.data.accessToken;
        
        // Actualizar token en store
        try {
          const { useAuthStore } = await import('../store/auth-store');
          useAuthStore.setState({ token: newToken });
        } catch (err) {
          // Fallback: actualizar localStorage directamente
          const authStorage = localStorage.getItem('auth-storage');
          if (authStorage) {
            const parsed = JSON.parse(authStorage);
            parsed.state.token = newToken;
            localStorage.setItem('auth-storage', JSON.stringify(parsed));
          }
        }
        
        // Resetear intentos y reconectar
        console.log('✅ [SocketService] Token refrescado exitosamente. Intentando reconectar...');
        this.reconnectAttempts = 0;
        this.maxReconnectAttemptsReached = false;
        this.connect('refresh-reconnect');
      } catch (refreshError) {
        // Si falla el refresh, no hacer nada más
        console.warn('⚠️ [SocketService] No se pudo refrescar token después de exceder intentos. El usuario debe refrescar la página manualmente.');
      }
    } catch (error) {
      console.error('❌ [SocketService] Error en attemptTokenRefreshAndReconnect:', error);
    }
  }

  private stopReconnect() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
      console.log('🛑 [SocketService] Intervalo de reconexión detenido');
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
   * Suscribirse a eventos cuando se exceden los intentos de reconexión
   */
  public onReconnectExceeded(callback: () => void) {
    this.reconnectExceededListeners.push(callback);
  }

  /**
   * Desuscribirse de eventos de exceso de intentos
   */
  public offReconnectExceeded(callback: () => void) {
    this.reconnectExceededListeners = this.reconnectExceededListeners.filter(listener => listener !== callback);
  }

  /**
   * Forzar reconexión manual (útil después de refrescar token o actualizar página)
   */
  public forceReconnect() {
    this.reconnectAttempts = 0;
    this.maxReconnectAttemptsReached = false;
    this.stopReconnect();
    
    // Leer token actualizado
    let token: string | null = null;
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        token = parsed?.state?.token || null;
      }
    } catch (err) {
      token = localStorage.getItem('token');
    }
    
    if (token) {
      this.connect('force-reconnect');
    }
  }

  /**
   * Conecta al servidor de WebSockets usando STOMP/SockJS
   * @param sessionId ID de sesión para identificar al cliente
   */
  public async connect(_sessionId: string) {
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
      this.updateStatus('disconnected');
      return;
    }

    // ✅ CRÍTICO: Verificar si ya está conectado ANTES de intentar conectar
    if (this.stompClient && this.stompClient.connected) {
      console.log('✅ [SocketService] Ya está conectado, ignorando llamada a connect()');
      return;
    }

    // ✅ CRÍTICO: Evitar múltiples intentos de conexión simultáneos
    if (this.isConnecting) {
      console.log('⚠️ [SocketService] Ya hay una conexión en progreso, ignorando llamada duplicada');
      return;
    }

    // ✅ CRÍTICO: Si hay un cliente existente pero desconectado, cerrarlo primero
    if (this.stompClient && !this.stompClient.connected) {
      console.log('🧹 [SocketService] Cerrando conexión anterior antes de crear nueva');
      try {
        // Detener reconexión automática antes de cerrar
        this.stopReconnect();
        // Cerrar el cliente STOMP
        this.stompClient.deactivate();
      } catch (err) {
        // Ignorar errores al cerrar
        console.warn('⚠️ [SocketService] Error al cerrar conexión anterior:', err);
      }
      // Limpiar referencia inmediatamente
      this.stompClient = null;
      // Esperar un momento para que el servidor cierre la conexión (evita "Too many open files")
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    this.isConnecting = true;
    
    if (!this.stompClient) {
      // En producción: usar WebSocket nativo (sin SockJS)
      // En desarrollo: usar SockJS con fallback a polling
      const clientConfig: any = {
      };
      
      // Usar SockJS tanto en producción como desarrollo
      // ✅ OPTIMIZADO: Usar solo 'websocket' para evitar múltiples conexiones de fallback
      // Enviar token como query parameter para que el backend lo lea en la conexión inicial
      // También se envía en connectHeaders para el handshake STOMP
      const sockJsUrl = `${SOCKET_URL}/ws?token=${encodeURIComponent(token)}`;
      clientConfig.webSocketFactory = () => {
        // ✅ CRÍTICO: Usar solo 'websocket' para evitar múltiples conexiones simultáneas
        // Si falla WebSocket, SockJS intentará automáticamente otros transportes
        // pero solo si WebSocket falla completamente
        const socket = new SockJS(sockJsUrl, undefined, {
          transports: ['websocket'] // Solo WebSocket para evitar múltiples conexiones
        });
        return socket;
      };
      
      // Configuración común
      Object.assign(clientConfig, {
        connectHeaders: {
          'Authorization': `Bearer ${token}`
        },
        // Deshabilitar reconexión automática de STOMP - usamos nuestro propio sistema
        reconnectDelay: 0, // 0 = deshabilitado
        heartbeatIncoming: 0, // Deshabilitar heartbeat entrante
        heartbeatOutgoing: 0, // Deshabilitar heartbeat saliente
        onConnect: () => {
          this.isConnecting = false;
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
          
          // Suscribirse a topics premium para SystemNotificationsService
          this.subscribeToPremiumTopics();
        },
        onStompError: () => {
          this.isConnecting = false;
          this.updateStatus('error');
          // ✅ Solo reconectar si no hemos excedido el máximo Y no hay un intervalo activo
          if (this.reconnectAttempts < this.maxReconnectAttempts && !this.reconnectInterval) {
            this.startReconnect();
          }
        },
        onWebSocketError: () => {
          this.isConnecting = false;
          this.updateStatus('error');
          // ✅ Solo reconectar si no hemos excedido el máximo Y no hay un intervalo activo
          if (this.reconnectAttempts < this.maxReconnectAttempts && !this.reconnectInterval) {
            this.startReconnect();
          }
        },
        onDisconnect: () => {
          this.isConnecting = false;
          this.updateStatus('disconnected');
          // ✅ Solo reconectar si no hemos excedido el máximo Y no hay un intervalo activo
          if (this.reconnectAttempts < this.maxReconnectAttempts && !this.reconnectInterval) {
            this.startReconnect();
          }
        }
      });
      
      this.stompClient = new Client(clientConfig);
      
      // Activar el cliente STOMP
      console.log('🔄 [SocketService] Activando cliente STOMP...');
      this.stompClient.activate();
    } else {
      // Si ya existe el cliente pero no está conectado, reactivarlo
      if (!this.stompClient.connected) {
        // ✅ Verificar que no esté ya intentando conectar
        if (!this.isConnecting) {
          console.log('🔄 [SocketService] Reactivando cliente STOMP existente');
          this.stompClient.activate();
        } else {
          console.log('⏳ [SocketService] Ya hay una conexión en progreso, ignorando reactivación');
          this.isConnecting = false;
        }
      } else {
        console.log('✅ [SocketService] Cliente STOMP ya está conectado');
        this.isConnecting = false;
      }
    }
  }

  /**
   * Suscribirse a eventos de Ticketera
   */
  private subscribeToTicketeraEvents() {
    if (!this.stompClient || !this.stompClient.connected) {
      return;
    }

    // 🎯 SUSCRIBIRSE AL TOPIC PRINCIPAL: /topic/tickets
    this.stompClient.subscribe('/topic/tickets', (message: IMessage) => {
      try {
        const ticket = JSON.parse(message.body);
        const event = {
          type: 'ticket_updated',
          data: ticket,
          timestamp: Date.now()
        };
        this.emit('ticketera', event);
      } catch (error) {
        // Error silencioso
      }
    });

    // 🎯 Topic para nuevos tickets
    this.stompClient.subscribe('/topic/new-ticket', (message: IMessage) => {
      try {
        const ticket = JSON.parse(message.body);
        const event = { type: 'ticket_created', data: ticket, timestamp: Date.now() };
        this.emit('ticketera', event);
      } catch (error) {
        // Error silencioso
      }
    });

    // 🎯 Topic para tickets llamados
    this.stompClient.subscribe('/topic/ticket-called', (message: IMessage) => {
      try {
        const ticket = JSON.parse(message.body);
        const event = { type: 'ticket_called', data: ticket, timestamp: Date.now() };
        this.emit('ticketera', event);
      } catch (error) {
        // Error silencioso
      }
    });

    // 🎯 Topic para tickets iniciados
    this.stompClient.subscribe('/topic/ticket-started', (message: IMessage) => {
      try {
        const ticket = JSON.parse(message.body);
        const event = { type: 'ticket_started', data: ticket, timestamp: Date.now() };
        this.emit('ticketera', event);
      } catch (error) {
        // Error silencioso
      }
    });

    // 🎯 Topic para tickets completados
    this.stompClient.subscribe('/topic/ticket-completed', (message: IMessage) => {
      try {
        const ticket = JSON.parse(message.body);
        const event = { type: 'ticket_completed', data: ticket, timestamp: Date.now() };
        this.emit('ticketera', event);
      } catch (error) {
        // Error silencioso
      }
    });

    // 🎯 Topic para tickets cancelados
    this.stompClient.subscribe('/topic/ticket-cancelled', (message: IMessage) => {
      try {
        const ticket = JSON.parse(message.body);
        const event = { type: 'ticket_cancelled', data: ticket, timestamp: Date.now() };
        this.emit('ticketera', event);
      } catch (error) {
        // Error silencioso
      }
    });

    // Suscribirse a pong del servidor
    this.stompClient.subscribe('/topic/pong', (message: IMessage) => {
      try {
        JSON.parse(message.body);
      } catch (error) {
        // Error silencioso
      }
    });

    // 🎯 Topic para actualizaciones de módulos de atención
    this.stompClient.subscribe('/topic/modulos-atencion', (message: IMessage) => {
      try {
        const modulosData = JSON.parse(message.body);
        this.emitModulosActualizados(modulosData);
      } catch (error) {
        // Error silencioso
      }
    });
  }

  /**
   * Suscribirse a eventos de Sistemas Externos
   */
  private subscribeToSistemasExternosEvents() {
    if (!this.stompClient || !this.stompClient.connected) {
      return;
    }

    // 🎯 SUSCRIBIRSE AL TOPIC PRINCIPAL: /topic/sistemas-externos
    this.stompClient.subscribe('/topic/sistemas-externos', (message: IMessage) => {
      try {
        const event = JSON.parse(message.body);
        this.emit('sistemas-externos', event);
      } catch (error) {
        // Error silencioso
      }
    });

    // 🎯 Topic para cambios de estado
    this.stompClient.subscribe('/topic/sistema-estado-cambiado', (message: IMessage) => {
      try {
        const event = JSON.parse(message.body);
        this.emit('sistema-estado-cambiado', event);
      } catch (error) {
        // Error silencioso
      }
    });

    // 🎯 Topic para verificaciones
    this.stompClient.subscribe('/topic/sistema-verificado', (message: IMessage) => {
      try {
        const event = JSON.parse(message.body);
        this.emit('sistema-verificado', event);
      } catch (error) {
        // Error silencioso
      }
    });
  }

  /**
   * Suscribirse a eventos específicos del usuario actual
   */
  private subscribeToUserEvents() {
    if (!this.stompClient || !this.stompClient.connected) {
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
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId || payload.id;
      
      if (!userId) {
        return;
      }

      // Suscribirse al topic específico del usuario
      this.stompClient.subscribe(`/topic/user/${userId}`, (message: IMessage) => {
        try {
          const event = JSON.parse(message.body);
          
          // Emitir todos los eventos del usuario (incluyendo los que SystemNotificationsService necesita)
          this.emit('user-event', event);
          
          // También emitir eventos específicos para compatibilidad
          if (event.type === 'ACCOUNT_BLOCKED' || event.type === 'FORCED_LOGOUT' || event.type === 'ROLE_DEACTIVATED') {
            this.emit('system', event);
          }
        } catch (error) {
          // Error silencioso
        }
      });
    } catch (error) {
      // Error silencioso
    }
  }

  /**
   * Suscribirse al topic general /topic/system
   * Filtra eventos por tipo: GARANTIZADO_*, PRO_OPS_*, MODULOS_ACTUALIZADOS, etc.
   */
  private subscribeToSystemTopic() {
    if (!this.stompClient || !this.stompClient.connected) {
      return;
    }

    this.stompClient.subscribe('/topic/system', (message: IMessage) => {
      try {
        const event = JSON.parse(message.body);
        
        // Emitir todos los eventos del sistema (SystemNotificationsService los procesará)
        // Los eventos ACCOUNT_BLOCKED y FORCED_LOGOUT también pueden llegar por /topic/system
        this.emit('system', event);
        
        // Si son eventos que también deben procesarse por SystemNotificationsService, no retornar
        if (event.type === 'ACCOUNT_BLOCKED' || event.type === 'FORCED_LOGOUT' || 
            event.type === 'USER_TABLE_UPDATE' || event.type === 'PREMIUN_PROCESS_AVAILABLE' || 
            event.type === 'ROLE_DEACTIVATED') {
          // Ya se emitió arriba, continuar para que también se procese por otros listeners si es necesario
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
        // Error silencioso
      }
    });
  }

  /**
   * Suscribirse a eventos de Garantizado
   * Topics específicos: /topic/garantizado/*
   */
  private subscribeToGarantizadoEvents() {
    if (!this.stompClient || !this.stompClient.connected) {
      return;
      }

    // 🎯 Topic específico: /topic/garantizado
    this.stompClient.subscribe('/topic/garantizado', (message: IMessage) => {
      try {
        const event = JSON.parse(message.body);
        this.emit('garantizado', event);
      } catch (error) {
        // Error silencioso
      }
    });
  }

  /**
   * Suscribirse a eventos de Pro-Ops (KPIs)
   * Topics específicos: /topic/pro-ops/*
   * Topic general: /topic/system (filtrado por tipo si es necesario)
   */
  private subscribeToProOpsEvents() {
    if (!this.stompClient || !this.stompClient.connected) {
      return;
    }

    // 🎯 Topic específico: /topic/pro-ops/conductores-en-orden
    this.stompClient.subscribe('/topic/pro-ops/conductores-en-orden', (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        this.emit('pro-ops-conductores-en-orden', data);
      } catch (error) {
        // Error silencioso
      }
    });

    // 🎯 Topic específico: /topic/pro-ops/viajes-simplificados-en-curso
    this.stompClient.subscribe('/topic/pro-ops/viajes-simplificados-en-curso', (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        this.emit('pro-ops-viajes-simplificados-en-curso', data);
      } catch (error) {
        // Error silencioso
      }
    });
  }

  /**
   * Suscribirse a topics premium para SystemNotificationsService
   */
  private subscribeToPremiumTopics() {
    if (!this.stompClient || !this.stompClient.connected) {
      return;
    }

    const handlePremiumEvent = (message: IMessage) => {
      try {
        const event = JSON.parse(message.body);
        // Emitir como evento del sistema para que SystemNotificationsService lo procese
        this.emit('system', event);
      } catch (error) {
        // Error silencioso
      }
    };

    // Suscribirse a topics premium
    this.stompClient.subscribe('/topic/yego-premiun', handlePremiumEvent);
    this.stompClient.subscribe('/topic/premium-driver', handlePremiumEvent);
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
    this.isConnecting = false;
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
      this.listeners[event].forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[SocketService] Error ejecutando listener para '${event}':`, error);
        }
      });
    }
  }
}

// Exportar instancia singleton
const socketService = SocketService.getInstance();
export default socketService;