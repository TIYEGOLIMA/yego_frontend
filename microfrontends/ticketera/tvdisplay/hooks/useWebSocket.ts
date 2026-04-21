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
}

export const useTVDisplayWebSocket = (): UseTVDisplayWebSocketReturn => {
  const { isConnected, connectionStatus, onTicketeraEvent } = useWebSocket()

  const onTicketCreated = (callback: (ticket: any) => void) =>
    onTicketeraEvent((event: any) => {
      if (event.type === 'ticket_created') callback(event.data || event)
    })

  const onTicketUpdated = (callback: (ticket: any) => void) =>
    onTicketeraEvent((event: any) => {
      if (event.type === 'ticket_updated') callback(event.data || event)
    })

  const onTicketCalled = (callback: (ticket: any) => void) =>
    onTicketeraEvent((event: any) => {
      if (event.type === 'ticket_called') callback(event.data || event)
    })

  const onTicketCompleted = (callback: (ticket: any) => void) =>
    onTicketeraEvent((event: any) => {
      if (event.type === 'ticket_completed') callback(event.data || event)
    })

  const onTicketCancelled = (callback: (ticket: any) => void) =>
    onTicketeraEvent((event: any) => {
      if (event.type === 'ticket_cancelled') callback(event.data || event)
    })

  const onDisplayUpdated = (callback: (displayData: any) => void) =>
    onTicketeraEvent((event: any) => {
      if (event.type === 'display_updated') callback(event.data || event)
    })

  return {
    isConnected,
    connectionStatus,
    onTicketCreated,
    onTicketUpdated,
    onTicketCalled,
    onTicketCompleted,
    onTicketCancelled,
    onDisplayUpdated,
  }
}

export default useTVDisplayWebSocket
