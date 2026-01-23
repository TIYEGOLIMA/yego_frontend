import SockJS from 'sockjs-client'
import { Client, IMessage } from '@stomp/stompjs'

const isProduction = window.location.hostname !== 'localhost' && 
                     !window.location.hostname.includes('127.0.0.1') &&
                     (import.meta.env.VITE_DEV_MODE === 'false' || 
                      import.meta.env.MODE === 'production' ||
                      window.location.hostname.includes('yego.pro'));

const WS_URL = import.meta.env.VITE_WS_URL;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3030';

const getWebSocketUrl = (token: string): string => {
  if (isProduction) {
    const prodUrl = WS_URL || 'wss://api-int.yego.pro/ws';
    // CRÍTICO: Con WebSocket nativo, el token DEBE ir en la URL query parameter
    // porque NO se pueden enviar headers HTTP personalizados durante el handshake.
    // El backend JwtRequestFilter DEBE leer el token de la URL durante el handshake HTTP.
    // Formato requerido: wss://api-int.yego.pro/ws?token={token_encoded}
    const url = `${prodUrl}?token=${encodeURIComponent(token)}`;
    return url;
  } else {
    const devUrl = SOCKET_URL || 'http://localhost:3030';
    // Desarrollo: SockJS permite headers HTTP, pero también enviamos token en URL para consistencia
    return `${devUrl}/ws?token=${encodeURIComponent(token)}`;
  }
};

class SocketService {
  private static instance: SocketService;
  public stompClient: Client | null = null;
  private listeners: { [event: string]: Function[] } = {};
  private connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error' = 'disconnected';
  private statusListeners: ((status: string) => void)[] = [];
  private reconnectInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private baseReconnectDelay = 2000;
  private currentReconnectDelay = 2000;
  private isConnecting = false;
  private maxReconnectAttemptsReached = false;
  private reconnectExceededListeners: (() => void)[] = [];
  private connectionLimitReached = false;
  private connectionLimitDelay = 30000;

  private constructor() {}

  private updateStatus(status: 'connected' | 'disconnected' | 'connecting' | 'error') {
    this.connectionStatus = status;
    this.statusListeners.forEach(listener => listener(status));
    
    if (status === 'connected') {
      this.reconnectAttempts = 0;
      this.maxReconnectAttemptsReached = false;
      this.currentReconnectDelay = this.baseReconnectDelay;
      this.connectionLimitReached = false;
      this.stopReconnect();
    }
  }

  private calculateReconnectDelay(): number {
    const exponentialDelay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts);
    const maxDelay = 60000;
    const delay = Math.min(exponentialDelay, maxDelay);
    
    if (this.connectionLimitReached) {
      return delay + this.connectionLimitDelay;
    }
    
    return delay;
  }

  private detectConnectionLimit(errorMessage: string): boolean {
    const lowerMessage = errorMessage.toLowerCase();
    return lowerMessage.includes('límite de conexiones') ||
           lowerMessage.includes('limite de conexiones') ||
           lowerMessage.includes('connection limit') ||
           lowerMessage.includes('too many connections') ||
           lowerMessage.includes('too many open files');
  }

  private detectUserNotFound(errorMessage: string): boolean {
    const lowerMessage = errorMessage.toLowerCase();
    return lowerMessage.includes('usuario no encontrado') ||
           lowerMessage.includes('usuario no existe') ||
           lowerMessage.includes('user not found') ||
           lowerMessage.includes('usuario inactivo') ||
           lowerMessage.includes('user inactive');
  }

  private handleConnectionError(errorMessage: string = '') {
    this.isConnecting = false;
    
    // CRÍTICO: Si el usuario no existe, DETENER reconexiones definitivamente
    if (errorMessage && this.detectUserNotFound(errorMessage)) {
      this.updateStatus('disconnected');
      this.stopReconnect();
      this.maxReconnectAttemptsReached = true; // Bloquear reconexiones
      return; // NO intentar reconectar
    }
    
    // Verificar token ANTES de intentar reconectar
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
      this.updateStatus('disconnected');
      this.stopReconnect();
      return;
    }
    
    if (errorMessage && this.detectConnectionLimit(errorMessage)) {
      this.connectionLimitReached = true;
      this.reconnectAttempts = Math.max(0, this.reconnectAttempts - 1);
    }
    
    this.updateStatus('error');
    
    if (this.reconnectAttempts < this.maxReconnectAttempts && !this.reconnectInterval) {
      this.startReconnect();
    }
  }

  private startReconnect() {
    // PROTECCIÓN CRÍTICA: Detener cualquier reconexión anterior
    this.stopReconnect();
    
    // PROTECCIÓN CRÍTICA: Verificar token ANTES de intentar reconectar
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
      this.updateStatus('disconnected');
      return;
    }
    
    // PROTECCIÓN CRÍTICA: Verificar múltiples condiciones
    if (this.maxReconnectAttemptsReached) {
      return;
    }

    if (this.connectionStatus === 'connected') {
      return;
    }

    if (this.isConnecting) {
      return;
    }

    // PROTECCIÓN CRÍTICA: Verificar que no haya cliente conectado
    if (this.stompClient && this.stompClient.connected) {
      return;
    }

    this.currentReconnectDelay = this.calculateReconnectDelay();
    
    const attemptReconnect = () => {
      // PROTECCIÓN: Verificar token en cada intento
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
        this.stopReconnect();
        this.updateStatus('disconnected');
        return;
      }
      
      // PROTECCIÓN: Verificar estado antes de cada intento
      if (this.connectionStatus === 'connected') {
        this.stopReconnect();
        return;
      }

      if (this.isConnecting) {
        this.reconnectInterval = setTimeout(attemptReconnect, this.currentReconnectDelay);
        return;
      }

      // PROTECCIÓN: Verificar que no haya cliente conectado
      if (this.stompClient && this.stompClient.connected) {
        this.stopReconnect();
        return;
      }

      // Verificar si se excedieron los intentos
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.maxReconnectAttemptsReached = true;
        this.stopReconnect();
        this.updateStatus('error');
        this.reconnectExceededListeners.forEach(listener => listener());
        setTimeout(() => {
          this.attemptTokenRefreshAndReconnect();
        }, 10000);
        return;
      }

      this.reconnectAttempts++;
      const nextDelay = this.calculateReconnectDelay();
      
      this.connect(`reconnect-${this.reconnectAttempts}`);
      this.currentReconnectDelay = nextDelay;
      this.reconnectInterval = setTimeout(attemptReconnect, this.currentReconnectDelay);
    };
    
    // Iniciar primer intento después del delay calculado
    this.reconnectInterval = setTimeout(attemptReconnect, this.currentReconnectDelay);
  }
  
  /**
   * Intentar refrescar el token y reconectar después de exceder intentos
   */
  private async attemptTokenRefreshAndReconnect() {
    try {
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
      clearTimeout(this.reconnectInterval);
      clearInterval(this.reconnectInterval as any);
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
    this.currentReconnectDelay = this.baseReconnectDelay;
    this.connectionLimitReached = false;
    this.stopReconnect();
    
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
    // PROTECCIÓN CRÍTICA #1: Evitar múltiples conexiones simultáneas
    if (this.isConnecting) {
      return;
    }

    // PROTECCIÓN CRÍTICA #2: Si ya está conectado, no hacer nada
    if (this.stompClient && this.stompClient.connected) {
      return;
    }

    // Leer token ANTES de intentar conectar
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
    
    // PROTECCIÓN CRÍTICA #3: NO intentar conectar sin token
    if (!token) {
      this.updateStatus('disconnected');
      this.stopReconnect(); // Detener reconexiones si no hay token
      return;
    }

    // PROTECCIÓN CRÍTICA #3: Cerrar conexión anterior ANTES de crear nueva
    if (this.stompClient) {
      try {
        this.stopReconnect();
        if (this.stompClient.connected) {
          this.stompClient.deactivate();
        }
        // Esperar a que se cierre completamente (evita "Too many open files")
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        // Silencioso
      }
      this.stompClient = null;
    }

    // PROTECCIÓN CRÍTICA #4: Marcar como conectando ANTES de crear cliente
    this.isConnecting = true;
    
    if (!this.stompClient) {
      const clientConfig: any = {};
      const wsUrl = getWebSocketUrl(token);
      
      // Log para verificar que el token se está enviando (solo en desarrollo)
      if (!isProduction) {
        console.log('🔌 [SocketService] URL WebSocket:', wsUrl.substring(0, 50) + '...');
        console.log('🔌 [SocketService] Token presente:', !!token, 'Longitud:', token?.length);
      }
      
      if (isProduction) {
        // WebSocket nativo en producción: el token DEBE ir en la URL query parameter
        // IMPORTANTE: Con WebSocket nativo, NO se pueden enviar headers HTTP personalizados
        // durante el handshake inicial. El backend DEBE leer el token de la URL.
        // 
        // El backend JwtRequestFilter debe buscar el token en:
        // 1. Query parameter: ?token={token} (PRIMARIO para WebSocket nativo)
        // 2. Header HTTP: Authorization: Bearer {token} (si está disponible, pero no funciona con WebSocket nativo)
        //
        // Los connectHeaders se envían en el frame STOMP CONNECT (después del handshake),
        // pero el backend valida el token durante el handshake HTTP inicial.
        
        // VERIFICACIÓN: Asegurar que la URL incluye el token
        if (!wsUrl.includes('token=')) {
          console.error('❌ [SocketService] ERROR CRÍTICO: La URL WebSocket NO incluye el token!', wsUrl.substring(0, 100));
        } else {
          console.log('✅ [SocketService] URL WebSocket incluye token:', wsUrl.substring(0, 80) + '...');
        }
        
        clientConfig.brokerURL = wsUrl; // URL ya incluye ?token={token}
        // Los connectHeaders se envían después del handshake, pero el backend ya validó el token de la URL
        clientConfig.connectHeaders = {
          'Authorization': `Bearer ${token}`
        };
      } else {
        // Desarrollo: SockJS
        clientConfig.webSocketFactory = () => {
          return new SockJS(wsUrl, undefined, {
            transports: ['websocket', 'xhr-streaming', 'xhr-polling']
          });
        };
        clientConfig.connectHeaders = {
          'Authorization': `Bearer ${token}`
        };
      }
      
      Object.assign(clientConfig, {
        reconnectDelay: 0,
        heartbeatIncoming: 0,
        heartbeatOutgoing: 0,
        onConnect: () => {
          // PROTECCIÓN: Solo procesar si realmente se conectó
          if (!this.stompClient || !this.stompClient.connected) {
            return;
          }
          this.isConnecting = false;
          this.updateStatus('connected');
          
          this.subscribeToTicketeraEvents();
          this.subscribeToSistemasExternosEvents();
          this.subscribeToSystemTopic();
          this.subscribeToGarantizadoEvents();
          this.subscribeToProOpsEvents();
          this.subscribeToUserEvents();
          this.subscribeToPremiumTopics();
        },
        onStompError: (frame: any) => {
          this.isConnecting = false;
          const errorMessage = frame?.headers?.['message'] || frame?.body || '';
          this.handleConnectionError(errorMessage);
        },
        onWebSocketError: (event: any) => {
          this.isConnecting = false;
          const errorMessage = event?.message || event?.type || '';
          this.handleConnectionError(errorMessage);
        },
        onDisconnect: () => {
          this.isConnecting = false;
          
          // Verificar token ANTES de intentar reconectar
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
            this.updateStatus('disconnected');
            this.stopReconnect();
            return;
          }
          
          this.updateStatus('disconnected');
          // PROTECCIÓN: Solo reconectar si no hay una conexión activa
          if (this.reconnectAttempts < this.maxReconnectAttempts && !this.reconnectInterval && !this.isConnecting) {
            this.startReconnect();
          }
        }
      });
      
      this.stompClient = new Client(clientConfig);
      this.stompClient.activate();
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
      }
    });

    this.stompClient.subscribe('/topic/new-ticket', (message: IMessage) => {
      try {
        const ticket = JSON.parse(message.body);
        const event = { type: 'ticket_created', data: ticket, timestamp: Date.now() };
        this.emit('ticketera', event);
      } catch (error) {
      }
    });

    this.stompClient.subscribe('/topic/ticket-called', (message: IMessage) => {
      try {
        const ticket = JSON.parse(message.body);
        const event = { type: 'ticket_called', data: ticket, timestamp: Date.now() };
        this.emit('ticketera', event);
      } catch (error) {
      }
    });

    this.stompClient.subscribe('/topic/ticket-started', (message: IMessage) => {
      try {
        const ticket = JSON.parse(message.body);
        const event = { type: 'ticket_started', data: ticket, timestamp: Date.now() };
        this.emit('ticketera', event);
      } catch (error) {
      }
    });

    this.stompClient.subscribe('/topic/ticket-completed', (message: IMessage) => {
      try {
        const ticket = JSON.parse(message.body);
        const event = { type: 'ticket_completed', data: ticket, timestamp: Date.now() };
        this.emit('ticketera', event);
      } catch (error) {
      }
    });

    this.stompClient.subscribe('/topic/ticket-cancelled', (message: IMessage) => {
      try {
        const ticket = JSON.parse(message.body);
        const event = { type: 'ticket_cancelled', data: ticket, timestamp: Date.now() };
        this.emit('ticketera', event);
      } catch (error) {
      }
    });

    this.stompClient.subscribe('/topic/pong', (message: IMessage) => {
      try {
        JSON.parse(message.body);
      } catch (error) {
      }
    });

    this.stompClient.subscribe('/topic/modulos-atencion', (message: IMessage) => {
      try {
        const modulosData = JSON.parse(message.body);
        this.emitModulosActualizados(modulosData);
      } catch (error) {
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
      }
    });

    this.stompClient.subscribe('/topic/sistema-estado-cambiado', (message: IMessage) => {
      try {
        const event = JSON.parse(message.body);
        this.emit('sistema-estado-cambiado', event);
      } catch (error) {
      }
    });

    this.stompClient.subscribe('/topic/sistema-verificado', (message: IMessage) => {
      try {
        const event = JSON.parse(message.body);
        this.emit('sistema-verificado', event);
      } catch (error) {
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
        }
        
        // 🎯 Si es un evento MODULOS_ACTUALIZADOS desde /topic/system, solo emitir como 'system'
        // (el evento ya se procesó desde /topic/modulos-atencion)
        if (event.type === 'MODULOS_ACTUALIZADOS') {
          this.emit('system', event);
          return;
        }
        
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
          this.emit('pro-ops-kpis', event);
          this.emit('system', event);
        } else {
          this.emit('system', event);
        }
      } catch (error) {
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
      }
    });

    // 🎯 Topic específico: /topic/pro-ops/viajes-simplificados-en-curso
    this.stompClient.subscribe('/topic/pro-ops/viajes-simplificados-en-curso', (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        this.emit('pro-ops-viajes-simplificados-en-curso', data);
      } catch (error) {
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
        this.emit('system', event);
      } catch (error) {
      }
    };

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