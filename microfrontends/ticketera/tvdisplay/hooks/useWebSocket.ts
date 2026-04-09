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

/** TVDisplay: ticketera WebSocket events for display screens. */
export const useTVDisplayWebSocket = (): UseTVDisplayWebSocketReturn => {
  const {
    isConnected,
    connectionStatus,
    onTicketeraEvent,
    sendTicketeraEvent
  } = useWebSocket()

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

  const emitDisplayUpdate = (displayData: any): boolean => {
    sendTicketeraEvent({ type: 'display_updated', data: displayData })
    return true
  }

  const subscribe = (topic: string, callback: (message: any) => void): () => void => {
    const topicMap: { [key: string]: () => () => void } = {
      '/topic/new-ticket': () => onTicketCreated(callback),
      '/topic/ticket-created': () => onTicketCreated(callback),
      '/topic/ticket-updated': () => onTicketUpdated(callback),
      '/topic/ticket-called': () => onTicketCalled(callback),
      '/topic/ticket-completed': () => onTicketCompleted(callback),
      '/topic/ticket-cancelled': () => onTicketCancelled(callback),
      '/topic/display-updated': () => onDisplayUpdated(callback),
    }
    
    if (topicMap[topic]) {
      return topicMap[topic]()
    }
    
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
