import { useEffect, useCallback, useRef } from 'react'
import SocketService from '../../../src/services/socket-service'

export interface UseWebSocketOptions {
  // Suscripciones automáticas al conectar
  subscriptions?: Array<[string, (...args: any[]) => void]>
  // Reconectar automáticamente si se pierde la conexión
  autoReconnect?: boolean
  // Logs habilitados
  debug?: boolean
}

export interface UseWebSocketReturn {
  // Estado de la conexión
  isConnected: boolean
  connectionStatus: string
  connectionInfo: {
    status: string
    connected: boolean
    url: string
    hasToken: boolean
  }
  
  // Métodos de suscripción con auto-cleanup
  onTicketUpdated: (callback: (ticket: any) => void) => () => void
  onTicketCreated: (callback: (ticket: any) => void) => () => void
  onTicketCalled: (callback: (ticket: any) => void) => () => void
  onTicketCompleted: (callback: (ticket: any) => void) => () => void
  onQueueChanged: (callback: (queueData: any) => void) => () => void
  onModuleAssigned: (callback: (moduleData: any) => void) => () => void
  onModuleReleased: (callback: (moduleData: any) => void) => () => void
  onRatingSubmitted: (callback: (ratingData: any) => void) => () => void
  onDisplayUpdated: (callback: (displayData: any) => void) => () => void
  
  // Método genérico para suscripciones
  subscribe: (subscriptions: Array<[string, (...args: any[]) => void]>) => () => void
  
  // Método para enviar mensajes
  emit: (event: string, data?: any) => boolean
  
  // Control manual de conexión
  connect: () => void
  disconnect: () => void
}

/**
 * Hook para usar el WebSocket centralizado en microfrontends
 * 
 * @example
 * ```typescript
 * // Uso básico
 * const { isConnected, onTicketUpdated, emit } = useWebSocket()
 * 
 * useEffect(() => {
 *   const unsubscribe = onTicketUpdated((ticket) => {
 *     console.log('Ticket actualizado:', ticket)
 *   })
 *   return unsubscribe
 * }, [])
 * 
 * // Con suscripciones automáticas
 * const { isConnected } = useWebSocket({
 *   subscriptions: [
 *     ['ticket-updated', handleTicketUpdate],
 *     ['queue-changed', handleQueueChange]
 *   ]
 * })
 * ```
 */
export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  const {
    subscriptions = [],
    autoReconnect = true,
    debug = false
  } = options

  const socketService = SocketService.getInstance()
  const cleanupRef = useRef<(() => void) | null>(null)

  // Log para debugging
  const log = useCallback((message: string, ...args: any[]) => {
    if (debug) {
      console.log(`🔌 [useWebSocket] ${message}`, ...args)
    }
  }, [debug])

  // Setup de suscripciones automáticas
  useEffect(() => {
    if (subscriptions.length > 0) {
      log('Configurando suscripciones automáticas:', subscriptions.map(([event]) => event))
      
      // Suscribirse a todos los eventos
      const cleanup = socketService.subscribe(subscriptions)
      cleanupRef.current = cleanup
      
      return () => {
        log('Limpiando suscripciones automáticas')
        cleanup()
        cleanupRef.current = null
      }
    }
  }, [subscriptions, socketService, log])

  // Auto-reconexión si está habilitada
  useEffect(() => {
    if (autoReconnect) {
      const handleStatusChange = (status: string) => {
        log('Cambio de estado de conexión:', status)
        
        if (status === 'disconnected') {
          // Intentar reconectar después de un delay
          setTimeout(() => {
            const user = JSON.parse(localStorage.getItem('user') || '{}')
            const token = localStorage.getItem('token')
            
            if (token && user.id && user.username) {
              log('Intentando reconectar automáticamente...')
              const sessionId = `${user.id}-${user.username}`
              socketService.connect(sessionId)
            }
          }, 2000)
        }
      }
      
      socketService.onStatusChange(handleStatusChange)
      
      return () => {
        socketService.offStatusChange(handleStatusChange)
      }
    }
  }, [autoReconnect, socketService, log])

  // Conectar manualmente
  const connect = useCallback(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const token = localStorage.getItem('token')
    
    if (token && user.id && user.username) {
      const sessionId = `${user.id}-${user.username}`
      log('Conectando manualmente con sessionId:', sessionId)
      socketService.connect(sessionId)
    } else {
      log('No se puede conectar: falta token o datos de usuario')
    }
  }, [socketService, log])

  // Desconectar manualmente (solo si no hay otros componentes usando el socket)
  const disconnect = useCallback(() => {
    log('Desconectando manualmente')
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }
    // NO desconectar el socket completamente ya que otros componentes pueden estar usándolo
  }, [log])

  return {
    // Estado de la conexión
    isConnected: socketService.isConnected(),
    connectionStatus: socketService.getConnectionStatus(),
    connectionInfo: socketService.getConnectionInfo(),
    
    // Métodos de suscripción con auto-cleanup
    onTicketUpdated: useCallback((callback: (ticket: any) => void) => {
      log('Suscribiendo a ticket-updated')
      return socketService.onTicketUpdated(callback)
    }, [socketService, log]),
    
    onTicketCreated: useCallback((callback: (ticket: any) => void) => {
      log('Suscribiendo a ticket-created')
      return socketService.onTicketCreated(callback)
    }, [socketService, log]),
    
    onTicketCalled: useCallback((callback: (ticket: any) => void) => {
      log('Suscribiendo a ticket-called')
      return socketService.onTicketCalled(callback)
    }, [socketService, log]),
    
    onTicketCompleted: useCallback((callback: (ticket: any) => void) => {
      log('Suscribiendo a ticket-completed')
      return socketService.onTicketCompleted(callback)
    }, [socketService, log]),
    
    onQueueChanged: useCallback((callback: (queueData: any) => void) => {
      log('Suscribiendo a queue-changed')
      return socketService.onQueueChanged(callback)
    }, [socketService, log]),
    
    onModuleAssigned: useCallback((callback: (moduleData: any) => void) => {
      log('Suscribiendo a module-assigned')
      return socketService.onModuleAssigned(callback)
    }, [socketService, log]),
    
    onModuleReleased: useCallback((callback: (moduleData: any) => void) => {
      log('Suscribiendo a module-released')
      return socketService.onModuleReleased(callback)
    }, [socketService, log]),
    
    onRatingSubmitted: useCallback((callback: (ratingData: any) => void) => {
      log('Suscribiendo a rating-submitted')
      return socketService.onRatingSubmitted(callback)
    }, [socketService, log]),
    
    onDisplayUpdated: useCallback((callback: (displayData: any) => void) => {
      log('Suscribiendo a display-updated')
      return socketService.onDisplayUpdated(callback)
    }, [socketService, log]),
    
    // Método genérico para suscripciones
    subscribe: useCallback((subscriptions: Array<[string, (...args: any[]) => void]>) => {
      log('Suscribiendo a eventos:', subscriptions.map(([event]) => event))
      return socketService.subscribe(subscriptions)
    }, [socketService, log]),
    
    // Método para enviar mensajes
    emit: useCallback((event: string, data?: any) => {
      log('Emitiendo evento:', event, data)
      return socketService.emit(event, data)
    }, [socketService, log]),
    
    // Control manual de conexión
    connect,
    disconnect
  }
}

export default useWebSocket
