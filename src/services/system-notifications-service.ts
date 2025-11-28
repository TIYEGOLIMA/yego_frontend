import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { SystemEvent, ForcedLogoutEvent, AccountBlockedEvent, UserTableUpdateEvent, PremiumProcessAvailableEvent, RoleDeactivatedEvent } from '../types/system-notifications'

class SystemNotificationsService {
  private client: Client | null = null
  private isConnected = false
  private processedEvents = new Set<string>() // Para evitar procesar eventos duplicados

  public get connectionStatus() {
    return this.isConnected
  }
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private onForcedLogout: ((event: ForcedLogoutEvent) => void) | null = null
  private onAccountBlocked: ((event: AccountBlockedEvent) => void) | null = null
  private onUserTableUpdate: ((event: UserTableUpdateEvent) => void) | null = null
  private onPremiumProcessAvailable: ((event: PremiumProcessAvailableEvent) => void) | null = null
  private onRoleDeactivated: ((event: RoleDeactivatedEvent) => void) | null = null

  constructor() {
    this.connect()
  }

  private connect() {
    try {
      // Leer token desde auth-storage (Zustand persist) igual que SocketService
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

      // Usar variable de entorno para la URL del WebSocket
      const wsUrl = import.meta.env.VITE_SYSTEM_WS_URL || import.meta.env.VITE_STOMP_URL || 'http://localhost:3030/ws'
      const socket = new SockJS(wsUrl)
      this.client = new Client({
        webSocketFactory: () => socket,
        connectHeaders: {
          Authorization: `Bearer ${token}`
        },
        onConnect: () => {
          this.isConnected = true
          this.reconnectAttempts = 0
          this.processedEvents.clear() // Limpiar eventos procesados al reconectar
          
          setTimeout(() => {
            if (this.client && this.client.connected) {
              this.subscribe()
              this.subscribePremiumTopics()
            }
          }, 100)
        },
        onStompError: () => {
          this.handleReconnect()
        },
        onWebSocketError: () => {
          this.handleReconnect()
        },
        onDisconnect: () => {
          this.isConnected = false
        }
      })

      this.client.activate()
    } catch (error) {
      this.handleReconnect()
    }
  }

  private subscribe() {
    if (!this.client || !this.client.connected) {
      return
    }
    try {
      // Obtener el usuario actual del token (leer desde auth-storage)
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
      
      let currentUserId: number | null = null
      
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          currentUserId = payload.userId || payload.id
        } catch (error) {
          // Silencioso - no es crítico
        }
      }

      // Suscribirse al topic global para eventos generales (USER_TABLE_UPDATE)
      this.client.subscribe('/topic/system', (message) => {
        try {
          const event: SystemEvent = JSON.parse(message.body)
          const eventKey = `${event.type}-${(event as any).userId || (event as any).timestamp || Date.now()}`

          // Evitar procesar el mismo evento múltiples veces
          if (this.processedEvents.has(eventKey)) {
            return
          }
          this.processedEvents.add(eventKey)

          // Limpiar eventos antiguos (mantener solo los últimos 100)
          if (this.processedEvents.size > 100) {
            const firstKey = this.processedEvents.values().next().value
            if (firstKey) {
              this.processedEvents.delete(firstKey)
            }
          }

          // Filtrar eventos por usuario
          if ('userId' in event && event.userId && currentUserId && event.userId !== currentUserId) {
            return
          }

          switch (event.type) {
            case 'FORCED_LOGOUT':
              this.onForcedLogout?.(event as ForcedLogoutEvent)
              break
            case 'ACCOUNT_BLOCKED':
              this.onAccountBlocked?.(event as AccountBlockedEvent)
              break
            case 'USER_TABLE_UPDATE':
              this.onUserTableUpdate?.(event as UserTableUpdateEvent)
              break
            case 'PREMIUN_PROCESS_AVAILABLE':
              this.onPremiumProcessAvailable?.(event as PremiumProcessAvailableEvent)
              break
            case 'ROLE_DEACTIVATED':
              this.onRoleDeactivated?.(event as RoleDeactivatedEvent)
              break
          }
        } catch (error) {
          console.error('❌ [SystemNotifications] Error procesando evento:', error)
        }
      })

      // Suscribirse al topic específico del usuario para eventos personales
      if (currentUserId && this.client && this.client.connected) {
        this.client.subscribe(`/topic/user/${currentUserId}`, (message) => {
          try {
            const event: SystemEvent = JSON.parse(message.body)
            const eventKey = `${event.type}-${(event as any).userId || (event as any).timestamp || Date.now()}`

            // Evitar procesar el mismo evento múltiples veces
            if (this.processedEvents.has(eventKey)) {
              return
            }
            this.processedEvents.add(eventKey)

            switch (event.type) {
              case 'FORCED_LOGOUT':
                this.onForcedLogout?.(event as ForcedLogoutEvent)
                break
              case 'ACCOUNT_BLOCKED':
                this.onAccountBlocked?.(event as AccountBlockedEvent)
                break
              case 'ROLE_DEACTIVATED':
                this.onRoleDeactivated?.(event as RoleDeactivatedEvent)
                break
            }
          } catch (error) {
            console.error('❌ [SystemNotifications] Error procesando evento:', error)
          }
        })
      }
    } catch (error) {
      console.error('❌ [SystemNotifications] Error suscribiéndose:', error)
    }
  }

  private subscribePremiumTopics() {
    if (!this.client || !this.isConnected) return

    const handleEvent = (message: { body: string }) => {
      try {
        const event: PremiumProcessAvailableEvent = JSON.parse(message.body)
        if (event.type === 'PREMIUN_PROCESS_AVAILABLE') {
          console.log('🚦 [SystemNotifications] Evento PREMIIUN_PROCESS_AVAILABLE recibido:', event)
          this.onPremiumProcessAvailable?.(event)
        }
      } catch (error) {
        console.error('❌ [SystemNotifications] Error al procesar evento PREMIIUN_PROCESS_AVAILABLE:', error)
      }
    }

    this.client.subscribe('/topic/yego-premiun', handleEvent)
    this.client.subscribe('/topic/premium-driver', handleEvent)
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return

    this.reconnectAttempts++
    setTimeout(() => {
      this.connect()
    }, this.reconnectDelay)
  }

  public setOnForcedLogout(callback: ((event: ForcedLogoutEvent) => void) | null) {
    this.onForcedLogout = callback
  }

  public setOnAccountBlocked(callback: ((event: AccountBlockedEvent) => void) | null) {
    this.onAccountBlocked = callback
  }

  public setOnUserTableUpdate(callback: ((event: UserTableUpdateEvent) => void) | null) {
    this.onUserTableUpdate = callback
  }

  public setOnPremiumProcessAvailable(callback: ((event: PremiumProcessAvailableEvent) => void) | null) {
    this.onPremiumProcessAvailable = callback
  }

  public setOnRoleDeactivated(callback: ((event: RoleDeactivatedEvent) => void) | null) {
    this.onRoleDeactivated = callback
  }

  public reconnect() {
    this.disconnect()
    this.reconnectAttempts = 0
    this.connect()
  }

  public forceReconnect() {
    this.disconnect()
    setTimeout(() => {
      this.reconnectAttempts = 0
      this.connect()
    }, 1000)
  }

  public disconnect() {
    if (this.client) {
      this.client.deactivate()
      this.client = null
    }
    this.isConnected = false
    this.processedEvents.clear()
  }

  public getConnectionStatus() {
    return this.isConnected
  }
}

export default new SystemNotificationsService()

