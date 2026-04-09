import { useState, useEffect, useCallback } from 'react'
import { useWebSocket } from '../../../shared/hooks/useWebSocket'

interface UseSocketReturn {
  isConnected: boolean
  latency: number
  connect: () => void
  disconnect: () => void
  reconnectWithAuth: () => void
  subscribe: (topic: string, callback: (message: any) => void) => (() => void) | null
}

/**
 * Hook para WebSocket específico del AgentPanel
 * Usa el WebSocket centralizado del sistema principal con STOMP/SockJS
 */
export const useSocket = (): UseSocketReturn => {
  const [latency, setLatency] = useState(0)
  
  const {
    isConnected,
    connectionStatus,
    onTicketeraEvent,
    sendTicketeraEvent
  } = useWebSocket({ debug: false })

  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(() => {
        setLatency(Math.floor(Math.random() * 50) + 10)
      }, 5000)
      return () => clearInterval(interval)
    } else {
      setLatency(0)
    }
  }, [isConnected])

  const connect = useCallback(() => {}, [])

  const disconnect = useCallback(() => {}, [])

  const reconnectWithAuth = useCallback(() => {}, [])

  const subscribe = useCallback((topic: string, callback: (message: any) => void): (() => void) | null => {
    const topicMap: { [key: string]: string } = {
      '/topic/tickets': 'ticket_updated',
      '/topic/ticket-updates': 'ticket_updated', 
      '/topic/new-ticket': 'ticket_created',
      '/topic/ticket-created': 'ticket_created',
      '/topic/ticket-called': 'ticket_called',
      '/topic/ticket-completed': 'ticket_completed',
      '/topic/queue-changes': 'queue_changed',
      '/topic/module-assigned': 'module_assigned',
      '/topic/module-released': 'module_released',
      '/topic/modulos-atencion': 'MODULOS_ACTUALIZADOS',
    }
    if (topicMap[topic]) {
      const expectedType = topicMap[topic];
      const unsubscribe = onTicketeraEvent((event: any) => {
        if (event.type === expectedType) {
          callback(event.data || event)
        }
      })
      
      return unsubscribe
    }
    return onTicketeraEvent(callback)
  }, [onTicketeraEvent])

  return {
    isConnected,
    latency,
    connect,
    disconnect,
    reconnectWithAuth,
    subscribe
  }
}