import { Client, IMessage } from '@stomp/stompjs'

// ============================================================================
// CONSTANTES DE CONFIGURACIÓN
// ============================================================================

const isProduction = window.location.hostname !== 'localhost' && 
                     !window.location.hostname.includes('127.0.0.1') &&
                     (import.meta.env.VITE_DEV_MODE === 'false' || 
                      import.meta.env.MODE === 'production' ||
                      window.location.hostname.includes('yego.pro'));

const WS_URL = import.meta.env.VITE_WS_URL;
const HEARTBEAT_INTERVAL = 10000; // 10 segundos

// ============================================================================
// HELPERS
// ============================================================================

const getAuthToken = (): string | null => {
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      return parsed?.state?.token || null;
    }
  } catch {
    return localStorage.getItem('token');
  }
  return null;
};

const getWebSocketUrl = (token: string): string => {
  if (isProduction) {
    // En producción el proxy (nginx, etc.) debe hacer upgrade WebSocket; si no, ver 403.
    const prodUrl = WS_URL || 'wss://api-int.yego.pro/ws';
    return `${prodUrl}?token=${encodeURIComponent(token)}`;
  }
  const devUrl = WS_URL || 'ws://localhost:8080/ws';
  return `${devUrl}?token=${encodeURIComponent(token)}`;
};

const getUserIdFromToken = (token: string): number | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId || payload.id || null;
  } catch {
    return null;
  }
};

// ============================================================================
// TIPOS
// ============================================================================

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// ============================================================================
// SOCKET SERVICE
// ============================================================================

class SocketService {
  private static instance: SocketService;
  public stompClient: Client | null = null;
  private listeners: { [event: string]: Function[] } = {};
  private connectionStatus: ConnectionStatus = 'disconnected';
  private statusListeners: ((status: string) => void)[] = [];
  private reconnectInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly baseReconnectDelay = 2000;
  private currentReconnectDelay = 2000;
  private isConnecting = false;
  private maxReconnectAttemptsReached = false;
  private reconnectExceededListeners: (() => void)[] = [];
  private connectionLimitReached = false;
  private readonly connectionLimitDelay = 30000;

  private constructor() {}

  // ==========================================================================
  // GESTIÓN DE ESTADO
  // ==========================================================================

  private updateStatus(status: ConnectionStatus) {
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

  // ==========================================================================
  // RECONEXIÓN
  // ==========================================================================

  private calculateReconnectDelay(): number {
    const exponentialDelay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts);
    const maxDelay = 60000;
    const delay = Math.min(exponentialDelay, maxDelay);
    return this.connectionLimitReached ? delay + this.connectionLimitDelay : delay;
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
    
    if (errorMessage && this.detectUserNotFound(errorMessage)) {
      this.updateStatus('disconnected');
      this.stopReconnect();
      this.maxReconnectAttemptsReached = true;
      return;
    }
    
    const token = getAuthToken();
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
    this.stopReconnect();
    
    const token = getAuthToken();
    if (!token) {
      this.updateStatus('disconnected');
      return;
    }
    
    if (this.maxReconnectAttemptsReached || 
        this.connectionStatus === 'connected' || 
        this.isConnecting ||
        (this.stompClient && this.stompClient.connected)) {
      return;
    }

    this.currentReconnectDelay = this.calculateReconnectDelay();
    
    const attemptReconnect = () => {
      const token = getAuthToken();
      if (!token) {
        this.stopReconnect();
        this.updateStatus('disconnected');
        return;
      }
      
      if (this.connectionStatus === 'connected' || 
          this.isConnecting ||
          (this.stompClient && this.stompClient.connected)) {
        this.stopReconnect();
        return;
      }

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.maxReconnectAttemptsReached = true;
        this.stopReconnect();
        this.updateStatus('error');
        this.reconnectExceededListeners.forEach(listener => listener());
        setTimeout(() => this.attemptTokenRefreshAndReconnect(), 10000);
        return;
      }

      this.reconnectAttempts++;
      this.currentReconnectDelay = this.calculateReconnectDelay();
      this.connect(`reconnect-${this.reconnectAttempts}`);
      this.reconnectInterval = setTimeout(attemptReconnect, this.currentReconnectDelay);
    };
    
    this.reconnectInterval = setTimeout(attemptReconnect, this.currentReconnectDelay);
  }
  
  private async attemptTokenRefreshAndReconnect() {
    try {
      const token = getAuthToken();
      if (!token) return;
      
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
        
        try {
          const { useAuthStore } = await import('../store/auth-store');
          useAuthStore.setState({ token: newToken });
        } catch {
          const authStorage = localStorage.getItem('auth-storage');
          if (authStorage) {
            const parsed = JSON.parse(authStorage);
            parsed.state.token = newToken;
            localStorage.setItem('auth-storage', JSON.stringify(parsed));
          }
        }
        
        this.reconnectAttempts = 0;
        this.maxReconnectAttemptsReached = false;
        this.connect('refresh-reconnect');
      } catch {
        console.warn('⚠️ [SocketService] No se pudo refrescar token después de exceder intentos.');
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

  // ==========================================================================
  // CONEXIÓN
  // ==========================================================================

  /**
   * Conecta al servidor de WebSockets usando STOMP/SockJS
   * El servidor envía un heartbeat cada 10 segundos y el cliente responde automáticamente
   */
  public async connect(_sessionId: string) {
    if (this.isConnecting || (this.stompClient && this.stompClient.connected)) {
      return;
    }

    const token = getAuthToken();
    if (!token) {
      this.updateStatus('disconnected');
      this.stopReconnect();
      return;
    }

    // Cerrar conexión anterior antes de crear nueva
    if (this.stompClient) {
      try {
        this.stopReconnect();
        if (this.stompClient.connected) {
          this.stompClient.deactivate();
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch {
        // Silencioso
      }
      this.stompClient = null;
    }

    this.isConnecting = true;
    
    const clientConfig: any = {};
    const wsUrl = getWebSocketUrl(token);
    
    // Usar WebSocket nativo tanto en desarrollo como en producción
    // Esto evita el problema del endpoint /ws/info que SockJS requiere
    clientConfig.brokerURL = wsUrl;
    clientConfig.connectHeaders = { 'Authorization': `Bearer ${token}` };
    
    Object.assign(clientConfig, {
      reconnectDelay: 0,
      heartbeatIncoming: HEARTBEAT_INTERVAL,
      heartbeatOutgoing: HEARTBEAT_INTERVAL,
      onConnect: () => {
        if (!this.stompClient || !this.stompClient.connected) return;
        
        this.isConnecting = false;
        this.updateStatus('connected');
        this.subscribeToAllTopics();
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
        
        const token = getAuthToken();
        if (!token) {
          this.updateStatus('disconnected');
          this.stopReconnect();
          return;
        }
        
        this.updateStatus('disconnected');
        if (this.reconnectAttempts < this.maxReconnectAttempts && !this.reconnectInterval && !this.isConnecting) {
          this.startReconnect();
        }
      }
    });
    
    this.stompClient = new Client(clientConfig);
    this.stompClient.activate();
  }

  // ==========================================================================
  // SUSCRIPCIONES
  // ==========================================================================

  private subscribeToAllTopics() {
    this.subscribeToTicketeraEvents();
    this.subscribeToSistemasExternosEvents();
    this.subscribeToSystemTopic();
    this.subscribeToGarantizadoEvents();
    this.subscribeToProOpsEvents();
    this.subscribeToUserEvents();
    this.subscribeToPremiumTopics();
  }

  private subscribe(topic: string, handler: (data: any) => void) {
    if (!this.stompClient || !this.stompClient.connected) return;
    
    this.stompClient.subscribe(topic, (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        handler(data);
      } catch {
        // Silencioso
      }
    });
  }

  private subscribeToTicketeraEvents() {
    if (!this.stompClient || !this.stompClient.connected) return;

    const topics = [
      { path: '/topic/tickets', type: 'ticket_updated' },
      { path: '/topic/new-ticket', type: 'ticket_created' },
      { path: '/topic/ticket-called', type: 'ticket_called' },
      { path: '/topic/ticket-started', type: 'ticket_started' },
      { path: '/topic/ticket-completed', type: 'ticket_completed' },
      { path: '/topic/ticket-cancelled', type: 'ticket_cancelled' }
    ];

    topics.forEach(({ path, type }) => {
      this.subscribe(path, (ticket) => {
        this.emit('ticketera', { type, data: ticket, timestamp: Date.now() });
      });
    });

    this.subscribe('/topic/pong', () => {
      // Heartbeat response - no action needed
    });

    this.subscribe('/topic/modulos-atencion', (modulosData) => {
      this.emitModulosActualizados(modulosData);
    });
  }

  private subscribeToSistemasExternosEvents() {
    this.subscribe('/topic/sistemas-externos', (event) => {
      this.emit('sistemas-externos', event);
    });

    this.subscribe('/topic/sistema-estado-cambiado', (event) => {
      this.emit('sistema-estado-cambiado', event);
    });

    this.subscribe('/topic/sistema-verificado', (event) => {
      this.emit('sistema-verificado', event);
    });
  }

  private subscribeToUserEvents() {
    const token = getAuthToken();
    if (!token) return;

    const userId = getUserIdFromToken(token);
    if (!userId) return;

    this.subscribe(`/topic/user/${userId}`, (event) => {
      this.emit('user-event', event);
      
      if (['ACCOUNT_BLOCKED', 'FORCED_LOGOUT', 'ROLE_DEACTIVATED'].includes(event.type)) {
        this.emit('system', event);
      }
    });
  }

  private subscribeToSystemTopic() {
    this.subscribe('/topic/system', (event) => {
      this.emit('system', event);
      
      if (event.type === 'MODULOS_ACTUALIZADOS') return;
      
      if (event.type === 'GARANTIZADO_TABLE_UPDATE' || event.event === 'GARANTIZADO_PROCESS_SUCCESS') {
        const normalizedEvent = event.event && event.data
          ? { type: event.event, ...event.data, timestamp: event.timestamp }
          : event;
        this.emit('garantizado', normalizedEvent);
        this.emit('system', normalizedEvent);
      } else if (event.type?.startsWith('GARANTIZADO_')) {
        this.emit('garantizado', event);
        this.emit('system', event);
      } else if (event.type?.startsWith('PRO_OPS_')) {
        this.emit('pro-ops-kpis', event);
        this.emit('system', event);
      }
    });
  }

  private subscribeToGarantizadoEvents() {
    this.subscribe('/topic/garantizado', (event) => {
      this.emit('garantizado', event);
    });
  }

  private subscribeToProOpsEvents() {
    this.subscribe('/topic/pro-ops/conductores-en-orden', (data) => {
      this.emit('pro-ops-conductores-en-orden', data);
    });

    this.subscribe('/topic/pro-ops/viajes-simplificados-en-curso', (data) => {
      this.emit('pro-ops-viajes-simplificados-en-curso', data);
    });
  }

  private subscribeToPremiumTopics() {
    const handlePremiumEvent = (event: any) => {
      this.emit('system', event);
    };

    this.subscribe('/topic/yego-premium', handlePremiumEvent);
    this.subscribe('/topic/premium-driver', handlePremiumEvent);
  }

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

  // ==========================================================================
  // API PÚBLICA
  // ==========================================================================

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

  public onReconnectExceeded(callback: () => void) {
    this.reconnectExceededListeners.push(callback);
  }

  public offReconnectExceeded(callback: () => void) {
    this.reconnectExceededListeners = this.reconnectExceededListeners.filter(listener => listener !== callback);
  }

  public forceReconnect() {
    this.reconnectAttempts = 0;
    this.maxReconnectAttemptsReached = false;
    this.currentReconnectDelay = this.baseReconnectDelay;
    this.connectionLimitReached = false;
    this.stopReconnect();
    
    const token = getAuthToken();
    if (token) {
      this.connect('force-reconnect');
    }
  }

  public disconnect() {
    this.isConnecting = false;
    this.stopReconnect();
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
    }
    this.updateStatus('disconnected');
  }

  public stopAutoReconnect() {
    this.stopReconnect();
  }

  public sendTicketeraEvent(event: any) {
    if (!this.stompClient || !this.stompClient.connected) return;

    this.stompClient.publish({
      destination: '/app/ticketera',
      body: JSON.stringify(event)
    });
  }

  public on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  public off(event: string, callback: Function) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

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

// ============================================================================
// EXPORT
// ============================================================================

const socketService = SocketService.getInstance();
export default socketService;
