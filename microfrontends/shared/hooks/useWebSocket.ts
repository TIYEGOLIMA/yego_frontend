import { useEffect, useCallback, useState } from 'react'
import SocketService from '../../../src/services/socket-service'

export interface UseWebSocketOptions {
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
  onTicketeraEvent: (callback: (event: any) => void) => () => void
  sendTicketeraEvent: (event: any) => void
}

/**
 * Hook para usar WebSocket con STOMP/SockJS
 * Proporciona estado de conexión y métodos para suscribirse a eventos
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    debug = false
  } = options

  const socketService = SocketService

  // Log para debugging
  const log = useCallback((message: string, ...args: any[]) => {
    if (debug) {
      console.log(`🔌 [useWebSocket] ${message}`, ...args)
    }
  }, [debug])

  // Estado de conexión
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')

  // Información de conexión
  const connectionInfo = {
    status: connectionStatus,
    connected: isConnected,
    url: import.meta.env.VITE_SOCKET_URL || 'https://api-int.yego.pro',
    hasToken: !!localStorage.getItem('token')
  }

  // Suscribirse a cambios de estado de conexión
  useEffect(() => {
    const handleStatusChange = (status: string) => {
      log('Cambio de estado de conexión:', status)
      setConnectionStatus(status)
      setIsConnected(status === 'connected')
    }

    socketService.onStatusChange(handleStatusChange)

    // Estado inicial
    const initialStatus = socketService.getConnectionStatus()
    setConnectionStatus(initialStatus)
    setIsConnected(initialStatus === 'connected')

    return () => {
      socketService.offStatusChange(handleStatusChange)
    }
  }, [socketService, log])

  // Método para suscribirse a eventos de Ticketera
  const onTicketeraEvent = useCallback((callback: (event: any) => void) => {
    log('Suscribiéndose a eventos de Ticketera')
    
    const wrappedCallback = (event: any) => {
      log('Evento Ticketera recibido:', event)
      try {
        callback(event)
      } catch (error) {
        console.error('[useWebSocket] Error ejecutando callback:', error)
      }
    }

    socketService.on('ticketera', wrappedCallback)

    // Retornar función de cleanup
    return () => {
      log('Desuscribiéndose de eventos de Ticketera')
      socketService.off('ticketera', wrappedCallback)
    }
  }, [socketService, log])

  // Método para enviar eventos a Ticketera
  const sendTicketeraEvent = useCallback((event: any) => {
    log('Enviando evento a Ticketera:', event)
    socketService.sendTicketeraEvent(event)
  }, [socketService, log])

  return {
    isConnected,
    connectionStatus,
    connectionInfo,
    onTicketeraEvent,
    sendTicketeraEvent
  }
}