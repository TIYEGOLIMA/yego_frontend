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
  } = useWebSocket({ debug: true })

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
    console.log('🔌 [useSocket] Connect llamado - STOMP se conecta automáticamente')
  }, [])

  const disconnect = useCallback(() => {
    console.log('🔌 [useSocket] Disconnect llamado - STOMP se desconecta automáticamente')
  }, [])

  const reconnectWithAuth = useCallback(() => {
    console.log('🔄 [useSocket] ReconnectWithAuth llamado - STOMP se reconecta automáticamente')
  }, [])

  // Función de suscripción que mapea topics a eventos de Ticketera
  const subscribe = useCallback((topic: string, callback: (message: any) => void): (() => void) | null => {
    console.log('🔔 [useSocket] Suscribiendo a:', topic)
    
    // Mapear topics específicos a eventos de Ticketera
    const topicMap: { [key: string]: string } = {
      '/topic/tickets': 'ticket_updated',
      '/topic/ticket-updates': 'ticket_updated', 
      '/topic/ticket-created': 'ticket_created',
      '/topic/ticket-called': 'ticket_called',
      '/topic/ticket-completed': 'ticket_completed',
      '/topic/queue-changes': 'queue_changed',
      '/topic/module-assigned': 'module_assigned',
      '/topic/module-released': 'module_released',
    }
    
    // Si el topic está mapeado, suscribirse a eventos de Ticketera
    if (topicMap[topic]) {
      console.log(`🔔 [useSocket] Mapeando ${topic} a evento Ticketera: ${topicMap[topic]}`)
      
      // Suscribirse a eventos de Ticketera y filtrar por tipo
      const unsubscribe = onTicketeraEvent((event: any) => {
        if (event.type === topicMap[topic]) {
          console.log(`🎫 [useSocket] Evento recibido para ${topic}:`, event)
          callback(event.data || event)
        }
      })
      
      return unsubscribe
    }
    
    // Para topics no mapeados, suscribirse directamente a eventos de Ticketera
    console.log(`🔔 [useSocket] Suscribiéndose directamente a eventos Ticketera para: ${topic}`)
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