import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { SystemEvent, ForcedLogoutEvent, AccountBlockedEvent, UserTableUpdateEvent } from '../types/system-notifications'

class SystemNotificationsService {
  private client: Client | null = null
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private onForcedLogout: ((event: ForcedLogoutEvent) => void) | null = null
  private onAccountBlocked: ((event: AccountBlockedEvent) => void) | null = null
  private onUserTableUpdate: ((event: UserTableUpdateEvent) => void) | null = null

  constructor() {
    this.connect()
  }

  private connect() {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

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
          this.subscribe()
        },
        onStompError: (frame) => {
          console.error('❌ [SystemNotifications] Error STOMP:', frame)
          this.handleReconnect()
        },
        onWebSocketError: (error) => {
          console.error('❌ [SystemNotifications] Error WebSocket:', error)
          this.handleReconnect()
        },
        onDisconnect: () => {
          console.log('🔌 [SystemNotifications] Desconectado del WebSocket del sistema')
          this.isConnected = false
        }
      })

      this.client.activate()
    } catch (error) {
      console.error('❌ [SystemNotifications] Error al conectar:', error)
      this.handleReconnect()
    }
  }

  private subscribe() {
    if (!this.client || !this.isConnected) return

    try {
      // Obtener el usuario actual del token
      const token = localStorage.getItem('token')
      let currentUserId: number | null = null
      
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          currentUserId = payload.userId || payload.id
        } catch (error) {
          console.warn('⚠️ [SystemNotifications] No se pudo obtener userId del token:', error)
        }
      }

      this.client.subscribe('/topic/system', (message) => {
        try {
          const event: SystemEvent = JSON.parse(message.body)
          console.log('🔔 [SystemNotifications] Evento del sistema recibido:', event)

          // Filtrar eventos por usuario - solo procesar si el evento es para el usuario actual
          if (event.userId && currentUserId && event.userId !== currentUserId) {
            console.log(`🚫 [SystemNotifications] Evento ignorado - destinado para userId ${event.userId}, usuario actual ${currentUserId}`)
            return
          }

          switch (event.type) {
            case 'FORCED_LOGOUT':
              console.log('🚪 [SystemNotifications] Procesando FORCED_LOGOUT para usuario actual')
              this.onForcedLogout?.(event)
              break
            case 'ACCOUNT_BLOCKED':
              console.log('🚫 [SystemNotifications] Procesando ACCOUNT_BLOCKED para usuario actual')
              this.onAccountBlocked?.(event)
              break
            case 'USER_TABLE_UPDATE':
              console.log('👥 [SystemNotifications] Procesando USER_TABLE_UPDATE')
              this.onUserTableUpdate?.(event)
              break
          }
        } catch (error) {
          console.error('❌ [SystemNotifications] Error al procesar mensaje del sistema:', error)
        }
      })
    } catch (error) {
      console.error('❌ [SystemNotifications] Error al suscribirse:', error)
    }
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

  public reconnect() {
    this.disconnect()
    this.reconnectAttempts = 0
    this.connect()
  }

  public disconnect() {
    if (this.client) {
      this.client.deactivate()
      this.client = null
    }
    this.isConnected = false
  }

  public getConnectionStatus() {
    return this.isConnected
  }
}

export default new SystemNotificationsService()
