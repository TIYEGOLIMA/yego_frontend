import { useEffect } from 'react'
import { useWebSocket } from '../../../shared/hooks/useWebSocket'

interface UseTVDisplayWebSocketReturn {
  isConnected: boolean
  connectionStatus: string
  onTicketCreated: (callback: (ticket: any) => void) => () => void
  onTicketUpdated: (callback: (ticket: any) => void) => () => void
  onTicketCalled: (callback: (ticket: any) => void) => () => void
  onTicketCompleted: (callback: (ticket: any) => void) => () => void
  onDisplayUpdated: (callback: (displayData: any) => void) => () => void
  emitDisplayUpdate: (displayData: any) => boolean
  subscribe: (topic: string, callback: (message: any) => void) => () => void
}

/**
 * Hook WebSocket específico para TVDisplay
 * Maneja eventos de tickets para mostrar en pantallas
 */
export const useTVDisplayWebSocket = (): UseTVDisplayWebSocketReturn => {
  const {
    isConnected,
    connectionStatus,
    onTicketCreated,
    onTicketUpdated,
    onTicketCalled,
    onTicketCompleted,
    onDisplayUpdated,
    subscribe: baseSubscribe,
    emit
  } = useWebSocket({
    debug: true,
    autoReconnect: true
  })

  console.log('📺 [TVDisplay] Estado WebSocket:', {
    isConnected,
    connectionStatus
  })

  // Método para emitir actualizaciones de pantalla
  const emitDisplayUpdate = (displayData: any): boolean => {
    console.log('📤 [TVDisplay] Enviando actualización de pantalla:', displayData)
    return emit('display-updated', displayData)
  }

  // Método de suscripción compatible con la interfaz anterior del TVDisplay
  const subscribe = (topic: string, callback: (message: any) => void): () => void => {
    console.log('🔔 [TVDisplay] Suscribiendo a:', topic)
    
    // Mapear topics del SocketContext anterior a eventos del WebSocket centralizado
    const topicMap: { [key: string]: () => () => void } = {
      '/topic/new-ticket': () => onTicketCreated(callback),
      '/topic/ticket-created': () => onTicketCreated(callback),
      '/topic/ticket-updated': () => onTicketUpdated(callback),
      '/topic/ticket-called': () => onTicketCalled(callback),
      '/topic/ticket-completed': () => onTicketCompleted(callback),
      '/topic/display-updated': () => onDisplayUpdated(callback),
    }
    
    // Si el topic está mapeado, usar el método específico
    if (topicMap[topic]) {
      return topicMap[topic]()
    }
    
    // Para topics genéricos, usar suscripción base
    const eventName = topic.replace('/topic/', '').replace('/', '-')
    console.log('🔔 [TVDisplay] Suscripción genérica a evento:', eventName)
    
    return baseSubscribe([
      [eventName, callback]
    ])
  }

  return {
    isConnected,
    connectionStatus,
    onTicketCreated,
    onTicketUpdated,
    onTicketCalled,
    onTicketCompleted,
    onDisplayUpdated,
    emitDisplayUpdate,
    subscribe
  }
}

export default useTVDisplayWebSocket
