import { SystemEvent, ForcedLogoutEvent, AccountBlockedEvent, UserTableUpdateEvent, PremiumProcessAvailableEvent, RoleDeactivatedEvent, YangoApiLogUpdatedEvent } from '../types/system-notifications'
import socketService from './socket-service'

/**
 * Servicio para manejar notificaciones del sistema
 * AHORA USA SocketService centralizado en lugar de crear su propia conexión WebSocket
 * Esto elimina la conexión duplicada y reduce las conexiones a la mitad
 */
class SystemNotificationsService {
  private processedEvents = new Set<string>() // Para evitar procesar eventos duplicados
  private unsubscribeSystem: (() => void) | null = null
  private unsubscribeUser: (() => void) | null = null
  private onForcedLogout: ((event: ForcedLogoutEvent) => void) | null = null
  private onAccountBlocked: ((event: AccountBlockedEvent) => void) | null = null
  private onUserTableUpdate: ((event: UserTableUpdateEvent) => void) | null = null
  private onPremiumProcessAvailable: ((event: PremiumProcessAvailableEvent) => void) | null = null
  private onRoleDeactivated: ((event: RoleDeactivatedEvent) => void) | null = null
  private onYangoApiLogUpdated: ((event: YangoApiLogUpdatedEvent) => void) | null = null

  constructor() {
    this.setupSubscriptions()
  }

  /**
   * Configurar suscripciones a eventos del SocketService centralizado
   */
  private setupSubscriptions() {
    // Limpiar suscripciones anteriores si existen
    this.disconnect()

    // Obtener el usuario actual del token
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

    // Suscribirse a eventos del sistema desde SocketService
    const systemHandler = (event: SystemEvent) => {
      this.handleSystemEvent(event, currentUserId)
    }
    socketService.on('system', systemHandler)
    this.unsubscribeSystem = () => {
      socketService.off('system', systemHandler)
    }

    // Suscribirse a eventos del usuario desde SocketService
    if (currentUserId) {
      const userHandler = (event: SystemEvent) => {
        this.handleUserEvent(event)
      }
      socketService.on('user-event', userHandler)
      this.unsubscribeUser = () => {
        socketService.off('user-event', userHandler)
      }
    }
  }

  /**
   * Procesar eventos del sistema
   */
  private handleSystemEvent(event: SystemEvent, currentUserId: number | null) {
    try {
          const eventKey =
            event.type === 'YANGO_API_LOG_UPDATED'
              ? `${event.type}-${(event as YangoApiLogUpdatedEvent).logId}`
              : `${event.type}-${(event as any).userId || (event as any).timestamp || Date.now()}`

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
            case 'PREMIUM_PROCESS_AVAILABLE':
              this.onPremiumProcessAvailable?.(event as PremiumProcessAvailableEvent)
              break
            case 'ROLE_DEACTIVATED':
              this.onRoleDeactivated?.(event as RoleDeactivatedEvent)
              break
            case 'YANGO_API_LOG_UPDATED':
              this.onYangoApiLogUpdated?.(event as YangoApiLogUpdatedEvent)
              break
          }
        } catch (error) {
      console.error('❌ [SystemNotifications] Error procesando evento del sistema:', error)
        }
  }

  /**
   * Procesar eventos del usuario
   */
  private handleUserEvent(event: SystemEvent) {
    try {
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
      console.error('❌ [SystemNotifications] Error procesando evento del usuario:', error)
    }
  }

  public get connectionStatus() {
    // Usar el estado de conexión del SocketService centralizado
    return socketService.getConnectionStatus() === 'connected'
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

  public setOnYangoApiLogUpdated(callback: ((event: YangoApiLogUpdatedEvent) => void) | null) {
    this.onYangoApiLogUpdated = callback
  }

  /**
   * Reconectar - ahora solo reconfigura las suscripciones ya que usa SocketService
   */
  public reconnect() {
    this.disconnect()
    this.setupSubscriptions()
  }

  /**
   * Forzar reconexión - ahora solo reconfigura las suscripciones
   */
  public forceReconnect() {
    this.disconnect()
    setTimeout(() => {
      this.setupSubscriptions()
    }, 1000)
  }

  /**
   * Desconectar - ahora solo limpia las suscripciones
   */
  public disconnect() {
    if (this.unsubscribeSystem) {
      this.unsubscribeSystem()
      this.unsubscribeSystem = null
    }
    if (this.unsubscribeUser) {
      this.unsubscribeUser()
      this.unsubscribeUser = null
    }
    this.processedEvents.clear()
  }

  /**
   * Obtener estado de conexión - ahora usa SocketService
   */
  public getConnectionStatus() {
    return socketService.getConnectionStatus() === 'connected'
  }
}

export default new SystemNotificationsService()
