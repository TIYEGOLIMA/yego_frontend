import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { SystemEvent, ForcedLogoutEvent, AccountBlockedEvent, UserTableUpdateEvent, PremiumProcessAvailableEvent } from '../types/system-notifications'

class SystemNotificationsService {
  private client: Client | null = null
  private isConnected = false

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
          console.log('✅ [SystemNotifications] Conectado al WebSocket del sistema')
          this.isConnected = true
          this.reconnectAttempts = 0
          this.subscribe()
          this.subscribePremiumTopics()
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
    if (!this.client || !this.isConnected) {
      console.log('⚠️ [SystemNotifications] No se puede suscribir - cliente no conectado')
      return
    }

    console.log('🔔 [SystemNotifications] Suscribiéndose a topics del sistema')
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

      // Suscribirse al topic global para eventos generales (USER_TABLE_UPDATE)
      this.client.subscribe('/topic/system', (message) => {
        try {
          const event: SystemEvent = JSON.parse(message.body)
          console.log('🔔 [SystemNotifications] Evento del sistema recibido:', event)

          // Filtrar eventos por usuario - solo procesar si el evento es para el usuario actual
          if ('userId' in event && event.userId && currentUserId && event.userId !== currentUserId) {
            console.log(`🚫 [SystemNotifications] Evento ignorado - destinado para userId ${event.userId}, usuario actual ${currentUserId}`)
            return
          }

          switch (event.type) {
            case 'FORCED_LOGOUT':
              console.log('🚪 [SystemNotifications] Procesando FORCED_LOGOUT para usuario actual')
              console.log('🚪 [SystemNotifications] Callback disponible:', !!this.onForcedLogout)
              if (this.onForcedLogout) {
                this.onForcedLogout(event)
              } else {
                console.warn('⚠️ [SystemNotifications] Callback de FORCED_LOGOUT no configurado')
              }
              break
            case 'ACCOUNT_BLOCKED':
              console.log('🚫 [SystemNotifications] Procesando ACCOUNT_BLOCKED para usuario actual')
              console.log('🚫 [SystemNotifications] Callback disponible:', !!this.onAccountBlocked)
              if (this.onAccountBlocked) {
                this.onAccountBlocked(event)
              } else {
                console.warn('⚠️ [SystemNotifications] Callback de ACCOUNT_BLOCKED no configurado')
              }
              break
            case 'USER_TABLE_UPDATE':
              console.log('👥 [SystemNotifications] Procesando USER_TABLE_UPDATE')
              this.onUserTableUpdate?.(event)
              break
            case 'PREMIUN_PROCESS_AVAILABLE':
              console.log('🚦 [SystemNotifications] Procesando PREMIIUN_PROCESS_AVAILABLE (topic system)')
              this.onPremiumProcessAvailable?.(event)
              break
          }
        } catch (error) {
          console.error('❌ [SystemNotifications] Error al procesar mensaje del sistema:', error)
        }
      })

      // Suscribirse al topic específico del usuario para eventos personales
      if (currentUserId) {
        console.log(`🔔 [SystemNotifications] Suscribiéndose a /topic/user/${currentUserId}`)
        console.log(`🔔 [SystemNotifications] Cliente disponible:`, !!this.client)
        console.log(`🔔 [SystemNotifications] Estado de conexión:`, this.connectionStatus)
        
        this.client.subscribe(`/topic/user/${currentUserId}`, (message) => {
          console.log(`🔔 [SystemNotifications] MENSAJE RECIBIDO en /topic/user/${currentUserId}:`, message.body)
          try {
            const event: SystemEvent = JSON.parse(message.body)
            console.log('🔔 [SystemNotifications] Evento personal recibido:', event)

            switch (event.type) {
              case 'FORCED_LOGOUT':
                console.log('🚪 [SystemNotifications] Procesando FORCED_LOGOUT personal')
                console.log('🚪 [SystemNotifications] Callback disponible:', !!this.onForcedLogout)
                if (this.onForcedLogout) {
                  this.onForcedLogout(event)
                } else {
                  console.warn('⚠️ [SystemNotifications] Callback de FORCED_LOGOUT no configurado')
                }
                break
              case 'ACCOUNT_BLOCKED':
                console.log('🚫 [SystemNotifications] Procesando ACCOUNT_BLOCKED personal')
                console.log('🚫 [SystemNotifications] Callback disponible:', !!this.onAccountBlocked)
                if (this.onAccountBlocked) {
                  this.onAccountBlocked(event)
                } else {
                  console.warn('⚠️ [SystemNotifications] Callback de ACCOUNT_BLOCKED no configurado')
                }
                break
              default:
                console.log('🔔 [SystemNotifications] Evento personal no reconocido:', event.type)
            }
          } catch (error) {
            console.error('❌ [SystemNotifications] Error al procesar mensaje personal:', error)
          }
        })
      } else {
        console.warn('⚠️ [SystemNotifications] No se pudo obtener userId para suscripción personal')
      }
    } catch (error) {
      console.error('❌ [SystemNotifications] Error al suscribirse:', error)
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
    console.log('🔧 [SystemNotifications] Configurando callback de forced logout:', !!callback)
    this.onForcedLogout = callback
  }

  public setOnAccountBlocked(callback: ((event: AccountBlockedEvent) => void) | null) {
    console.log('🔧 [SystemNotifications] Configurando callback de account blocked:', !!callback)
    this.onAccountBlocked = callback
  }

  public setOnUserTableUpdate(callback: ((event: UserTableUpdateEvent) => void) | null) {
    this.onUserTableUpdate = callback
  }

  public setOnPremiumProcessAvailable(callback: ((event: PremiumProcessAvailableEvent) => void) | null) {
    this.onPremiumProcessAvailable = callback
  }

  public reconnect() {
    console.log('🔄 [SystemNotifications] Reconectando servicio...')
    this.disconnect()
    this.reconnectAttempts = 0
    this.connect()
  }

  public forceReconnect() {
    console.log('🔄 [SystemNotifications] Forzando reconexión del servicio...')
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
  }

  public getConnectionStatus() {
    return this.isConnected
  }
}

export default new SystemNotificationsService()

