import { useWebSocket } from '../../../shared/hooks/useWebSocket'

interface UseTVDisplayWebSocketReturn {
  isConnected: boolean
  connectionStatus: string
  onTicketCreated: (callback: (ticket: any) => void) => () => void
  onTicketUpdated: (callback: (ticket: any) => void) => () => void
  onTicketCalled: (callback: (ticket: any) => void) => () => void
  onTicketCompleted: (callback: (ticket: any) => void) => () => void
  onTicketCancelled: (callback: (ticket: any) => void) => () => void
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
    onTicketeraEvent,
    sendTicketeraEvent
  } = useWebSocket({
    debug: true
  })

  console.log('📺 [TVDisplay] Estado WebSocket:', {
    isConnected,
    connectionStatus
  })

  // Implementar métodos específicos usando onTicketeraEvent
  const onTicketCreated = (callback: (ticket: any) => void) => {
    return onTicketeraEvent((event: any) => {
      if (event.type === 'ticket_created') {
        callback(event.data || event)
      }
    })
  }

  const onTicketUpdated = (callback: (ticket: any) => void) => {
    return onTicketeraEvent((event: any) => {
      if (event.type === 'ticket_updated') {
        callback(event.data || event)
      }
    })
  }

  const onTicketCalled = (callback: (ticket: any) => void) => {
    return onTicketeraEvent((event: any) => {
      if (event.type === 'ticket_called') {
        callback(event.data || event)
      }
    })
  }

  const onTicketCompleted = (callback: (ticket: any) => void) => {
    return onTicketeraEvent((event: any) => {
      if (event.type === 'ticket_completed') {
        callback(event.data || event)
      }
    })
  }

  const onTicketCancelled = (callback: (ticket: any) => void) => {
    return onTicketeraEvent((event: any) => {
      if (event.type === 'ticket_cancelled') {
        callback(event.data || event)
      }
    })
  }

  const onDisplayUpdated = (callback: (displayData: any) => void) => {
    return onTicketeraEvent((event: any) => {
      if (event.type === 'display_updated') {
        callback(event.data || event)
      }
    })
  }

  // Método para emitir actualizaciones de pantalla
  const emitDisplayUpdate = (displayData: any): boolean => {
    console.log('📤 [TVDisplay] Enviando actualización de pantalla:', displayData)
    sendTicketeraEvent({ type: 'display_updated', data: displayData })
    return true
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
      '/topic/ticket-cancelled': () => onTicketCancelled(callback),
      '/topic/display-updated': () => onDisplayUpdated(callback),
    }
    
    // Si el topic está mapeado, usar el método específico
    if (topicMap[topic]) {
      return topicMap[topic]()
    }
    
    // Para topics genéricos, usar onTicketeraEvent
    console.log('🔔 [TVDisplay] Suscripción genérica a evento Ticketera')
    return onTicketeraEvent(callback)
  }

  return {
    isConnected,
    connectionStatus,
    onTicketCreated,
    onTicketUpdated,
    onTicketCalled,
    onTicketCompleted,
    onTicketCancelled,
    onDisplayUpdated,
    emitDisplayUpdate,
    subscribe
  }
}

export default useTVDisplayWebSocket
