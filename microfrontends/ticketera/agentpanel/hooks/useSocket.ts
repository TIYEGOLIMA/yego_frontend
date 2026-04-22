import { useCallback } from 'react'
import { useWebSocket } from '../../../shared/hooks/useWebSocket'

interface UseSocketReturn {
  isConnected: boolean
  subscribe: (topic: string, callback: (message: any) => void) => (() => void) | null
}

const TOPIC_MAP: Record<string, string> = {
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

export const useSocket = (): UseSocketReturn => {
  const { isConnected, onTicketeraEvent } = useWebSocket({ debug: false })

  const subscribe = useCallback(
    (topic: string, callback: (message: any) => void): (() => void) | null => {
      const expectedType = TOPIC_MAP[topic]
      if (expectedType) {
        return onTicketeraEvent((event: any) => {
          if (event.type === expectedType) {
            callback(event.data || event)
          }
        })
      }
      return onTicketeraEvent(callback)
    },
    [onTicketeraEvent],
  )

  return { isConnected, subscribe }
}