import { useState, useEffect } from 'react'
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
 * Usa el WebSocket centralizado del sistema principal
 */
export const useSocket = (): UseSocketReturn => {
  const [latency, setLatency] = useState(0)
  
  const {
    isConnected,
    connectionStatus,
    onTicketUpdated,
    onTicketCreated,
    onTicketCalled,
    onTicketCompleted,
    onQueueChanged,
    onModuleAssigned,
    onModuleReleased,
    subscribe: baseSubscribe,
    connect: baseConnect,
    disconnect: baseDisconnect,
    emit
  } = useWebSocket({
    debug: true,
    autoReconnect: true
  })

  // Simular medición de latencia
  useEffect(() => {
    if (isConnected) {
      const pingInterval = setInterval(() => {
        const startTime = Date.now()
        
        // Enviar ping y medir respuesta
        const success = emit('ping', { timestamp: startTime })
        
        if (success) {
          // Simular latencia (en producción, el backend debería responder con 'pong')
          setTimeout(() => {
            const endTime = Date.now()
            setLatency(endTime - startTime)
          }, 50) // Latencia simulada de 50ms
        }
      }, 30000) // Cada 30 segundos
      
      return () => clearInterval(pingInterval)
    } else {
      setLatency(0)
    }
  }, [isConnected, emit])

  // Implementar reconexión con autenticación
  const reconnectWithAuth = () => {
    console.log('🔄 [useSocket] Reconectando con autenticación...')
    
    const token = localStorage.getItem('token')
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    
    if (!token || !user.id) {
      console.log('❌ [useSocket] No hay token o usuario para reconectar')
      return
    }
    
    // Intentar reconectar
    baseConnect()
  }

  // Método de suscripción compatible con la interfaz anterior
  const subscribe = (topic: string, callback: (message: any) => void): (() => void) | null => {
    console.log('🔔 [useSocket] Suscribiendo a:', topic)
    
    // Mapear topics del SocketContext anterior a eventos del WebSocket centralizado
    const topicMap: { [key: string]: () => () => void } = {
      '/topic/tickets': () => onTicketUpdated(callback),
      '/topic/ticket-updates': () => onTicketUpdated(callback),
      '/topic/ticket-created': () => onTicketCreated(callback),
      '/topic/ticket-called': () => onTicketCalled(callback),
      '/topic/ticket-completed': () => onTicketCompleted(callback),
      '/topic/queue-changes': () => onQueueChanged(callback),
      '/topic/module-assigned': () => onModuleAssigned(callback),
      '/topic/module-released': () => onModuleReleased(callback),
    }
    
    // Si el topic está mapeado, usar el método específico
    if (topicMap[topic]) {
      return topicMap[topic]()
    }
    
    // Para topics genéricos, usar suscripción base
    const eventName = topic.replace('/topic/', '').replace('/', '-')
    console.log('🔔 [useSocket] Suscripción genérica a evento:', eventName)
    
    return baseSubscribe([
      [eventName, callback]
    ])
  }

  console.log('🔌 [useSocket] Estado:', {
    isConnected,
    connectionStatus,
    latency
  })

  return {
    isConnected,
    latency,
    connect: baseConnect,
    disconnect: baseDisconnect,
    reconnectWithAuth,
    subscribe
  }
}

export default useSocket
