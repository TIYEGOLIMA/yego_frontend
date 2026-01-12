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

  // Simular latencia (en una implementación real, esto vendría del servidor)
  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(() => {
        setLatency(Math.floor(Math.random() * 50) + 10) // 10-60ms
      }, 5000) // Cambiado de 1 segundo a 5 segundos para reducir re-renders
      
      return () => clearInterval(interval)
    } else {
      setLatency(0)
    }
  }, [isConnected])

  // Métodos de conexión (no necesarios con STOMP, pero mantenemos compatibilidad)
  const connect = useCallback(() => {
    // STOMP se conecta automáticamente
  }, [])

  const disconnect = useCallback(() => {
    // STOMP se desconecta automáticamente
  }, [])

  const reconnectWithAuth = useCallback(() => {
    // STOMP se reconecta automáticamente
  }, [])

  // Función de suscripción que mapea topics a eventos de Ticketera
  const subscribe = useCallback((topic: string, callback: (message: any) => void): (() => void) | null => {
    // Mapear topics específicos a eventos de Ticketera
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
    
    // Si el topic está mapeado, suscribirse a eventos de Ticketera
    if (topicMap[topic]) {
      const expectedType = topicMap[topic];
      // Suscribirse a eventos de Ticketera y filtrar por tipo
      const unsubscribe = onTicketeraEvent((event: any) => {
        // Solo procesar si el tipo del evento coincide con el tipo esperado del topic
        // NO incluir MODULOS_ACTUALIZADOS aquí, solo si el topic es específicamente /topic/modulos-atencion
        if (event.type === expectedType) {
          callback(event.data || event)
        }
      })
      
      return unsubscribe
    }
    
    // Para topics no mapeados, suscribirse directamente a eventos de Ticketera
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