import { useEffect, useState } from 'react'
import SocketService from '@/services/socket-service'

export interface UseWebSocketReturn {
  isConnected: boolean
  connectionStatus: string
}

/**
 * Hook para usar WebSocket con STOMP/SockJS
 * Proporciona estado de conexión y métodos para suscribirse a eventos
 */
export function useWebSocket(): UseWebSocketReturn {
  const socketService = SocketService

  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')

  useEffect(() => {
    const handleStatusChange = (status: string) => {
      setConnectionStatus(status)
      setIsConnected(status === 'connected')
    }

    socketService.onStatusChange(handleStatusChange)

    const initialStatus = socketService.getConnectionStatus()
    setConnectionStatus(initialStatus)
    setIsConnected(initialStatus === 'connected')

    return () => {
      socketService.offStatusChange(handleStatusChange)
    }
  }, [socketService])

  return {
    isConnected,
    connectionStatus
  }
}
