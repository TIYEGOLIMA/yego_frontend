import { useWebSocket } from '../../../realtime/useWebSocket'
import type { Ticket } from '../../../domain'
import { ticketeraRealtime } from '../../../realtime/ticketeraRealtime'
import { getDispositivoSession } from '@/services/core/device-auth-service'

interface UseTVDisplayWebSocketReturn {
  isConnected: boolean
  connectionStatus: string
  onTicketCreated: (callback: (ticket: Ticket) => void) => () => void
  onTicketUpdated: (callback: (ticket: Ticket) => void) => () => void
  onTicketCalled: (callback: (ticket: Ticket) => void) => () => void
  onTicketCompleted: (callback: (ticket: Ticket) => void) => () => void
  onTicketCancelled: (callback: (ticket: Ticket) => void) => () => void
}

export const useTVDisplayWebSocket = (): UseTVDisplayWebSocketReturn => {
  const { isConnected, connectionStatus } = useWebSocket()

  const subscribeTicketType = (
    type: 'TICKET_CREATED' | 'TICKET_UPDATED' | 'TICKET_CALLED' | 'TICKET_COMPLETED' | 'TICKET_CANCELLED',
    callback: (ticket: Ticket) => void,
  ) => {
    const session = getDispositivoSession()
    if (!session) return () => {}
    return ticketeraRealtime.subscribeTickets({ sedeId: session.sedeId }, (event) => {
      if (event.type === type) callback(event.data)
    })
  }

  const onTicketCreated = (callback: (ticket: Ticket) => void) =>
    subscribeTicketType('TICKET_CREATED', callback)

  const onTicketUpdated = (callback: (ticket: Ticket) => void) =>
    subscribeTicketType('TICKET_UPDATED', callback)

  const onTicketCalled = (callback: (ticket: Ticket) => void) =>
    subscribeTicketType('TICKET_CALLED', callback)

  const onTicketCompleted = (callback: (ticket: Ticket) => void) =>
    subscribeTicketType('TICKET_COMPLETED', callback)

  const onTicketCancelled = (callback: (ticket: Ticket) => void) =>
    subscribeTicketType('TICKET_CANCELLED', callback)

  return {
    isConnected,
    connectionStatus,
    onTicketCreated,
    onTicketUpdated,
    onTicketCalled,
    onTicketCompleted,
    onTicketCancelled,
  }
}

export default useTVDisplayWebSocket
