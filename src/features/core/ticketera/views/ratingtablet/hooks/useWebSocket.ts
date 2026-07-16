import { useCallback } from 'react'
import { useWebSocket } from '../../../realtime/useWebSocket'
import { getDispositivoSession } from '@/services/core/device-auth-service'
import { ticketeraRealtime } from '../../../realtime/ticketeraRealtime'
import type { Ticket } from '../../../domain'

interface UseRatingWebSocketReturn {
  isConnected: boolean
  connectionStatus: string
  onTicketCompleted: (callback: (ticket: Ticket) => void, moduleId?: string | null) => () => void
}

export const useRatingWebSocket = (): UseRatingWebSocketReturn => {
  const { isConnected, connectionStatus } = useWebSocket()

  const onTicketCompleted = useCallback((callback: (ticket: Ticket) => void, moduleId?: string | null): () => void => {
    const session = getDispositivoSession()
    const parsedModuleId = moduleId ? Number(moduleId) : session?.moduleId
    if (!session || !parsedModuleId) return () => {}
    return ticketeraRealtime.subscribeRating(
      { sedeId: session.sedeId, moduleId: parsedModuleId },
      (event) => {
        if (event.type === 'TICKET_COMPLETED') callback(event.data)
      },
    )
  }, [])

  return {
    isConnected,
    connectionStatus,
    onTicketCompleted
  }
}

export default useRatingWebSocket
