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
      if (!token) {
        console.log('🔒 [SystemNotifications] No hay token, no se puede conectar')
        return
      }

      // Usar variable de entorno para la URL del WebSocket
      const wsUrl = import.meta.env.VITE_SYSTEM_WS_URL || 'http://localhost:3030/ws'
      const socket = new SockJS(wsUrl)
      this.client = new Client({
        webSocketFactory: () => socket,
        connectHeaders: {
          Authorization: `Bearer ${token}`
        },
        onConnect: () => {
          console.log('✅ [SystemNotifications] Conectado al WebSocket del sistema')
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
      this.client.subscribe('/topic/system', (message) => {
        try {
          const event: SystemEvent = JSON.parse(message.body)
          console.log('📨 [SystemNotifications] Evento recibido:', event)

          switch (event.type) {
            case 'FORCED_LOGOUT':
              this.onForcedLogout?.(event)
              break
            case 'ACCOUNT_BLOCKED':
              this.onAccountBlocked?.(event)
              break
            case 'USER_TABLE_UPDATE':
              this.onUserTableUpdate?.(event)
              break
            default:
              console.warn('⚠️ [SystemNotifications] Tipo de evento desconocido:', (event as any).type)
          }
        } catch (error) {
          console.error('❌ [SystemNotifications] Error al procesar mensaje:', error)
        }
      })
      console.log('📡 [SystemNotifications] Suscrito a /topic/system')
    } catch (error) {
      console.error('❌ [SystemNotifications] Error al suscribirse:', error)
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('🔄 [SystemNotifications] Máximo de intentos de reconexión alcanzado')
      return
    }

    this.reconnectAttempts++
    console.log(`🔄 [SystemNotifications] Intentando reconectar... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    setTimeout(() => {
      this.connect()
    }, this.reconnectDelay)
  }

  public setOnForcedLogout(callback: (event: ForcedLogoutEvent) => void) {
    this.onForcedLogout = callback
  }

  public setOnAccountBlocked(callback: (event: AccountBlockedEvent) => void) {
    this.onAccountBlocked = callback
  }

  public setOnUserTableUpdate(callback: ((event: UserTableUpdateEvent) => void) | null) {
    this.onUserTableUpdate = callback
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
