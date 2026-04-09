import { useCallback } from 'react'
import { useWebSocket } from '../../../shared/hooks/useWebSocket'

interface UseTabletInterfaceWebSocketReturn {
  isConnected: boolean
  connectionStatus: string
  onTicketCreated: (callback: (ticket: any) => void) => () => void
  onQueueChanged: (callback: (queueData: any) => void) => () => void
  emitTicketCreated: (ticketData: any) => boolean
}

export const useTabletInterfaceWebSocket = (): UseTabletInterfaceWebSocketReturn => {
  const {
    isConnected,
    connectionStatus,
    onTicketeraEvent,
    sendTicketeraEvent
  } = useWebSocket({ debug: true })

  const onTicketCreated = useCallback(
    (callback: (ticket: any) => void) => {
      return onTicketeraEvent((event: any) => {
        if (event.type === 'ticket_created') {
          callback(event.data || event)
        }
      })
    },
    [onTicketeraEvent]
  )

  const onQueueChanged = useCallback(
    (callback: (queueData: any) => void) => {
      return onTicketeraEvent((event: any) => {
        if (event.type === 'queue_changed') {
          callback(event.data || event)
        }
      })
    },
    [onTicketeraEvent]
  )

  const emitTicketCreated = useCallback(
    (ticketData: any): boolean => {
      sendTicketeraEvent({ type: 'ticket_created', data: ticketData })
      return true
    },
    [sendTicketeraEvent]
  )

  return {
    isConnected,
    connectionStatus,
    onTicketCreated,
    onQueueChanged,
    emitTicketCreated
  }
}

export default useTabletInterfaceWebSocket
