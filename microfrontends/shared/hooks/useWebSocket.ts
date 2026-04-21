import { useEffect, useCallback, useState } from 'react'
import SocketService from '../../../src/services/socket-service'

function getHasAuthToken(): boolean {
  let token = ''
  try {
    const authStorageData = localStorage.getItem('auth-storage')
    if (authStorageData) {
      const parsedData = JSON.parse(authStorageData)
      token = parsedData?.state?.token || ''
    }
  } catch {
    token = localStorage.getItem('token') || ''
  }

  if (!token) {
    try {
      const raw = localStorage.getItem('dispositivo-session')
      if (raw) {
        const parsed = JSON.parse(raw)
        token = parsed?.accessToken || ''
      }
    } catch {
      // ignore
    }
  }

  return !!token
}

export interface UseWebSocketOptions {
  debug?: boolean
}

export interface UseWebSocketReturn {
  isConnected: boolean
  connectionStatus: string
  connectionInfo: {
    status: string
    connected: boolean
    url: string
    hasToken: boolean
  }

  onTicketeraEvent: (callback: (event: any) => void) => () => void
  sendTicketeraEvent: (event: any) => void
}

/**
 * Hook para usar WebSocket con STOMP/SockJS
 * Proporciona estado de conexión y métodos para suscribirse a eventos
 */
export function useWebSocket(_options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const socketService = SocketService

  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')

  const connectionInfo = {
    status: connectionStatus,
    connected: isConnected,
    url: import.meta.env.VITE_SOCKET_URL || 'https://api-int.yego.pro',
    hasToken: getHasAuthToken()
  }

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

  const onTicketeraEvent = useCallback((callback: (event: any) => void) => {
    const wrappedCallback = (event: any) => {
      try {
        callback(event)
      } catch (error) {
        console.error('[useWebSocket] Error ejecutando callback:', error)
      }
    }

    socketService.on('ticketera', wrappedCallback)

    return () => {
      socketService.off('ticketera', wrappedCallback)
    }
  }, [socketService])

  const sendTicketeraEvent = useCallback((event: any) => {
    socketService.sendTicketeraEvent(event)
  }, [socketService])

  return {
    isConnected,
    connectionStatus,
    connectionInfo,
    onTicketeraEvent,
    sendTicketeraEvent
  }
}
