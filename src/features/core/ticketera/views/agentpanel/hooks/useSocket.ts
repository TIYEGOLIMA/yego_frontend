import { useCallback } from 'react'
import { useWebSocket } from '../../../realtime/useWebSocket'
import { ticketeraRealtime } from '../../../realtime/ticketeraRealtime'
import { getSedeActivaId } from '../../../shared/utils/sedeContext'
import { useAuthStore } from '@/store/auth-store'

interface UseSocketReturn {
  isConnected: boolean
  subscribe: <T = unknown>(topic: string, callback: (message: T) => void) => (() => void) | null
}

const TOPIC_MAP: Record<string, string> = {
  '/topic/tickets': 'ticket_updated',
  '/topic/ticket-updates': 'ticket_updated',
  '/topic/new-ticket': 'ticket_created',
  '/topic/ticket-created': 'ticket_created',
  '/topic/ticket-called': 'ticket_called',
  '/topic/ticket-started': 'ticket_started',
  '/topic/ticket-completed': 'ticket_completed',
  '/topic/queue-changes': 'queue_changed',
  '/topic/module-assigned': 'module_assigned',
  '/topic/module-released': 'module_released',
  '/topic/modulos-atencion': 'MODULOS_ACTUALIZADOS',
}

export const useSocket = (): UseSocketReturn => {
  const { isConnected } = useWebSocket()

  const subscribe = useCallback(
    <T,>(topic: string, callback: (message: T) => void): (() => void) | null => {
      const expectedType = TOPIC_MAP[topic]
      const sedeId = getSedeActivaId() ?? useAuthStore.getState().user?.sedeId
      if (sedeId != null && expectedType?.startsWith('ticket_')) {
        return ticketeraRealtime.subscribeTickets({ sedeId }, (event) => {
          const canonicalType = expectedType.toUpperCase()
          if (topic === '/topic/tickets' || event.type === canonicalType) {
            const data = event.type === 'MODULES_UPDATED'
              ? event.data
              : { ...event.data, ticketId: event.data.id }
            callback(data as T)
          }
        })
      }
      return null
    },
    [],
  )

  return { isConnected, subscribe }
}
