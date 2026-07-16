import { Client, IMessage, type IFrame, type StompSubscription } from '@stomp/stompjs'
import { api } from './core/api'
import {
  esSoloSesionDispositivo,
  getDispositivoToken,
  getHumanJwtFromStorage,
  handleDispositivoSesionRevocada,
} from './core/device-auth-service'

const isProduction =
  window.location.hostname !== 'localhost' &&
  !window.location.hostname.includes('127.0.0.1') &&
  (import.meta.env.VITE_DEV_MODE === 'false' ||
    import.meta.env.MODE === 'production' ||
    window.location.hostname.includes('yego.pro'))

const WS_URL = import.meta.env.VITE_WS_URL
const HEARTBEAT_INTERVAL = 10000

const getAuthToken = (): string | null => getHumanJwtFromStorage() || getDispositivoToken()

interface WebSocketTicketResponse {
  ticket: string
  expiresAt: string
}

interface WebSocketCredentials {
  url: string
  connectHeaders: Record<string, string>
}

const getWebSocketBaseUrl = (): string => {
  if (isProduction) return WS_URL || 'wss://api-int.yego.pro/ws'
  return WS_URL || 'ws://localhost:8080/ws'
}

async function getWebSocketCredentials(): Promise<WebSocketCredentials> {
  const { data } = await api.post<WebSocketTicketResponse>('/ws/ticket')
  const url = `${getWebSocketBaseUrl()}?ticket=${encodeURIComponent(data.ticket)}`
  return { url, connectHeaders: { 'X-WS-Ticket': data.ticket } }
}

const getUserIdFromToken = (token: string): number | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId || payload.id || null;
  } catch {
    return null;
  }
};

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error'
type EventCallback = (data: unknown) => void
type SocketPayload = Record<string, unknown> & {
  type?: string
  event?: string
  data?: Record<string, unknown>
  timestamp?: string | number
}

interface DynamicSubscription {
  callbacks: Set<EventCallback>
  brokerSubscription: StompSubscription | null
}

class SocketService {
  private static instance: SocketService;
  public stompClient: Client | null = null;
  private listeners: Record<string, EventCallback[]> = {};
  private dynamicSubscriptions = new Map<string, DynamicSubscription>();
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

  private constructor() {
    window.addEventListener('online', () => {
      if (getAuthToken() && this.connectionStatus !== 'connected') this.forceReconnect()
    })
  }

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

  private calculateReconnectDelay(): number {
    const exponentialDelay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts);
    const maxDelay = 60000;
    const delay = Math.min(exponentialDelay, maxDelay);
    const jitter = Math.round(delay * (Math.random() * 0.4 - 0.2));
    return (this.connectionLimitReached ? delay + this.connectionLimitDelay : delay) + jitter;
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

  private detectDispositivoTokenRevocado(errorMessage: string): boolean {
    if (!errorMessage || typeof errorMessage !== 'string') return false
    const m = errorMessage.toLowerCase()
    return (
      m.includes('token revocado') ||
      m.includes('dispositivo inactivo') ||
      m.includes('device_token_revoked') ||
      m.includes('device_revoked') ||
      errorMessage.includes('DEVICE_TOKEN_REVOKED') ||
      errorMessage.includes('DEVICE_REVOKED')
    )
  }

  private handleConnectionError(errorMessage: string = '') {
    this.isConnecting = false;

    if (esSoloSesionDispositivo() && this.detectDispositivoTokenRevocado(errorMessage)) {
      this.stopReconnect()
      this.maxReconnectAttemptsReached = true
      this.updateStatus('disconnected')
      handleDispositivoSesionRevocada()
      return
    }
    
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
        if (esSoloSesionDispositivo()) {
          this.reconnectAttempts = 0
          this.maxReconnectAttemptsReached = false
          this.reconnectInterval = setTimeout(() => this.forceReconnect(), 60000)
          return
        }
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
      
      const { default: api, invalidarSesionHumana } = await import('./core/api');
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
      } catch (error: unknown) {
        if (esSoloSesionDispositivo()) {
          handleDispositivoSesionRevocada()
          return
        }
        const status = (error as { response?: { status?: number } })?.response?.status
        if (status === 401) {
          this.stopReconnect()
          invalidarSesionHumana()
          return
        }
        console.warn('[SocketService] No se pudo refrescar el token tras agotar reintentos.')
      }
    } catch (error) {
      console.error('❌ [SocketService] Error en attemptTokenRefreshAndReconnect:', error);
    }
  }

  private stopReconnect() {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }

  public async connect(sessionId: string) {
    void sessionId
    if (this.isConnecting || (this.stompClient && this.stompClient.connected)) {
      return;
    }

    const token = getAuthToken();
    if (!token) {
      this.updateStatus('disconnected');
      this.stopReconnect();
      return;
    }

    if (this.stompClient) {
      try {
        this.stopReconnect();
        if (this.stompClient.connected) {
          this.stompClient.deactivate();
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch {
        /* noop */
      }
      this.stompClient = null;
    }

    this.isConnecting = true;
    
    const clientConfig: ConstructorParameters<typeof Client>[0] = {};
    let credentials: WebSocketCredentials
    try {
      credentials = await getWebSocketCredentials()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo obtener credencial WebSocket'
      this.handleConnectionError(message)
      return
    }
    
    clientConfig.brokerURL = credentials.url;
    clientConfig.connectHeaders = credentials.connectHeaders;
    
    Object.assign(clientConfig, {
      reconnectDelay: 0,
      heartbeatIncoming: HEARTBEAT_INTERVAL,
      heartbeatOutgoing: HEARTBEAT_INTERVAL,
      onConnect: () => {
        if (!this.stompClient || !this.stompClient.connected) return;
        
        this.isConnecting = false;
        this.updateStatus('connected');
        this.subscribeToAllTopics();
        this.resubscribeDynamicTopics();
      },
      onStompError: (frame: IFrame) => {
        this.isConnecting = false;
        const errorMessage = frame?.headers?.['message'] || frame?.body || '';
        this.handleConnectionError(errorMessage);
      },
      onWebSocketError: (event: Event & { message?: string }) => {
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

  private subscribeToAllTopics() {
    // Los dispositivos solo consumen sus topics canónicos con alcance; no deben
    // quedar suscritos a los canales globales legacy de otros módulos o sedes.
    if (esSoloSesionDispositivo()) return
    this.subscribeToSistemasExternosEvents();
    this.subscribeToSystemTopic();
    this.subscribeToGarantizadoEvents();
    this.subscribeToProOpsEvents();
    this.subscribeToUserEvents();
    this.subscribeToPremiumTopics();
  }

  private subscribe(topic: string, handler: (data: SocketPayload) => void) {
    if (!this.stompClient || !this.stompClient.connected) return;
    
    this.stompClient.subscribe(topic, (message: IMessage) => {
      try {
        const data = JSON.parse(message.body) as SocketPayload;
        handler(data);
      } catch {
        /* noop */
      }
    });
  }

  private resubscribeDynamicTopics() {
    if (!this.stompClient?.connected) return

    this.dynamicSubscriptions.forEach((entry, topic) => {
      entry.brokerSubscription?.unsubscribe()
      entry.brokerSubscription = this.stompClient!.subscribe(topic, (message: IMessage) => {
        let payload: unknown
        try {
          payload = JSON.parse(message.body) as unknown
        } catch {
          return
        }
        entry.callbacks.forEach((callback) => callback(payload))
      })
    })
  }

  public subscribeTopic(topic: string, callback: EventCallback): () => void {
    const existing = this.dynamicSubscriptions.get(topic)
    const entry: DynamicSubscription = existing ?? {
      callbacks: new Set<EventCallback>(),
      brokerSubscription: null,
    }
    entry.callbacks.add(callback)
    this.dynamicSubscriptions.set(topic, entry)

    if (!existing && this.stompClient?.connected) {
      this.resubscribeDynamicTopics()
    }

    return () => {
      const current = this.dynamicSubscriptions.get(topic)
      if (!current) return
      current.callbacks.delete(callback)
      if (current.callbacks.size === 0) {
        current.brokerSubscription?.unsubscribe()
        this.dynamicSubscriptions.delete(topic)
      }
    }
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
      
      if (event.type && ['ACCOUNT_BLOCKED', 'FORCED_LOGOUT', 'ROLE_DEACTIVATED'].includes(event.type)) {
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
    const handlePremiumEvent = (event: SocketPayload) => {
      this.emit('system', event);
    };

    this.subscribe('/topic/yego-premium', handlePremiumEvent);
    this.subscribe('/topic/premium-driver', handlePremiumEvent);
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
    if (!token) return

    const previous = this.stompClient
    this.stompClient = null
    this.isConnecting = false
    if (previous) {
      void previous.deactivate().finally(() => this.connect('force-reconnect'))
      return
    }
    void this.connect('force-reconnect')
  }

  public disconnect() {
    this.isConnecting = false;
    this.stopReconnect();
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
    }
    this.dynamicSubscriptions.forEach((entry) => {
      entry.brokerSubscription = null
    })
    this.updateStatus('disconnected');
  }

  public stopAutoReconnect() {
    this.stopReconnect();
  }

  public on<T = unknown>(event: string, callback: (data: T) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback as EventCallback);
  }

  public off<T = unknown>(event: string, callback: (data: T) => void) {
    if (this.listeners[event]) {
      const listener = callback as EventCallback
      this.listeners[event] = this.listeners[event].filter(cb => cb !== listener);
    }
  }

  private emit(event: string, data: unknown) {
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

const socketService = SocketService.getInstance()
export default socketService
